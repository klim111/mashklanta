import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * בדיקות הפרדה בין משרדים, מול בסיס נתונים אמיתי.
 *
 * נפתחים שני משרדים (א' ו-ב') דרך תהליך ההצטרפות עצמו, ונבדק שיועץ ב' לא מגיע
 * לשום דבר של משרד א': רשימת הלקוחות, צירוף לקוח לפי מייל, תיק מתעניין, פניות,
 * הערות, שיחות, לוח הבית והנתיבים של מנהל הפלטפורמה. בנוסף: כניסה לכל יועץ,
 * השעיית משרד, ושיוך לקוח למשרד שדרכו נרשם גם בלי העוגייה.
 *
 * הבדיקות רצות רק כשמוגדר TEST_DATABASE_URL (בסיס נתונים ריק אחרי
 * `prisma migrate deploy`). בלעדיו הן מדולגות, כדי לא לגעת בבסיס אמיתי.
 */

const TEST_DB = process.env.TEST_DATABASE_URL;

const session: { current: { user: { id: string; role: string; email?: string } } | null } = { current: null };

vi.mock('@/lib/auth', () => ({
  getServerAuth: async () => session.current,
  authOptions: {},
}));

vi.mock('@/lib/email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email')>('@/lib/email');
  return { ...actual, sendEmail: vi.fn(async () => ({ success: true, messageId: 'test' })) };
});

const run = Math.random().toString(36).slice(2, 8);
const mail = (name: string) => `${name}-${run}@isolation.test`.toLowerCase();

type Ids = {
  advisorA: string;
  advisorB: string;
  officeA: { id: string; slug: string };
  officeB: { id: string; slug: string };
  clientUserA: string;
  clientRecordA: string;
  leadA: string;
};

describe.skipIf(!TEST_DB)('office isolation (database)', () => {
  let prisma: typeof import('@/lib/db').prisma;
  const ids = {} as Ids;

  const as = (id: string) => {
    session.current = { user: { id, role: 'ADVISOR' } };
  };
  const json = (body: unknown) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    ({ prisma } = await import('@/lib/db'));
    const { ensurePlatformAdvisor } = await import('@/lib/single-advisor');
    const { submitAdvisorApplication, approveAdvisorApplication } = await import('@/lib/advisor-applications');
    const { getOrCreateAdvisorOffice } = await import('@/lib/office-store');

    const platform = await ensurePlatformAdvisor();

    for (const key of ['A', 'B'] as const) {
      await submitAdvisorApplication({
        name: `יועץ ${key}`,
        email: mail(`advisor${key}`),
        phone: '050-0000000',
        officeName: `משרד ${key}`,
        licenseNumber: null,
        website: null,
        message: null,
      });
      const application = await prisma.advisorApplication.findFirstOrThrow({
        where: { email: mail(`advisor${key}`), status: 'PENDING' },
      });
      const approved = await approveAdvisorApplication(application.id, platform.id);
      expect(approved).toEqual({ ok: true });
      const advisor = await prisma.user.findUniqueOrThrow({ where: { email: mail(`advisor${key}`) } });
      const office = await getOrCreateAdvisorOffice(advisor.id);
      await prisma.office.update({ where: { id: office.id }, data: { published: true } });
      if (key === 'A') {
        ids.advisorA = advisor.id;
        ids.officeA = { id: office.id, slug: office.slug };
      } else {
        ids.advisorB = advisor.id;
        ids.officeB = { id: office.id, slug: office.slug };
      }
    }

    const clientUser = await prisma.user.create({
      data: { email: mail('client-a'), name: 'לקוח של א', role: 'CLIENT', emailVerified: new Date() },
    });
    ids.clientUserA = clientUser.id;
    const record = await prisma.client.create({
      data: { advisorId: ids.advisorA, userId: clientUser.id, name: 'לקוח של א', email: mail('client-a') },
    });
    ids.clientRecordA = record.id;
    const lead = await prisma.advisorLead.create({
      data: { advisorId: ids.advisorA, clientId: record.id, ownerId: clientUser.id, topic: 'GENERAL', name: 'לקוח של א', email: mail('client-a') },
    });
    ids.leadA = lead.id;
    await prisma.advisorNote.create({
      data: { advisorId: ids.advisorA, clientId: record.id, stage: 'ANALYSIS', body: 'הערה פרטית של א' },
    });
  });

  afterAll(async () => {
    session.current = null;
    await prisma?.$disconnect();
  });

  it('opens one office per approved advisor, each with the name from the application', async () => {
    const offices = await prisma.office.findMany({ where: { ownerId: { in: [ids.advisorA, ids.advisorB] } } });
    expect(offices).toHaveLength(2);
    expect(offices.map((office) => office.name).sort()).toEqual(['משרד A', 'משרד B']);
    const advisors = await prisma.user.findMany({ where: { id: { in: [ids.advisorA, ids.advisorB] } } });
    expect(advisors.every((advisor) => advisor.role === 'ADVISOR')).toBe(true);
  });

  it('keeps every advisor when one logs in (no more merging into a single advisor)', async () => {
    const { advisorForLogin } = await import('@/lib/advisor-access');
    expect((await advisorForLogin(mail('advisorA')))?.id).toBe(ids.advisorA);
    expect((await advisorForLogin('mashkalanta@gmail.com'))?.email).toBe('mashkalanta@gmail.com');
    expect(await prisma.user.count({ where: { id: { in: [ids.advisorA, ids.advisorB] } } })).toBe(2);
  });

  it('lets an advisor rename and rebrand only their own office, and keeps links unique', async () => {
    const { updateAdvisorOffice } = await import('@/lib/office-store');
    const renamed = await updateAdvisorOffice(ids.advisorB, {
      name: 'כהן משכנתאות',
      profile: { color: 'emerald', logoUrl: '/api/site-images/logo-b' },
    });
    expect('office' in renamed && renamed.office.name).toBe('כהן משכנתאות');
    expect('office' in renamed && renamed.office.profile.logoUrl).toBe('/api/site-images/logo-b');

    const taken = await updateAdvisorOffice(ids.advisorB, { slug: ids.officeA.slug });
    expect(taken).toMatchObject({ status: 409 });
    const officeA = await prisma.office.findUniqueOrThrow({ where: { id: ids.officeA.id } });
    expect(officeA.name).toBe('משרד A');
  });

  it("does not list or open another office's client", async () => {
    const { GET } = await import('@/app/api/clients/route');
    as(ids.advisorB);
    const list = await (await GET()).json();
    expect(JSON.stringify(list)).not.toContain(ids.clientRecordA);

    const { advisorOwnsClient } = await import('@/lib/advisor');
    expect(await advisorOwnsClient(ids.advisorB, ids.clientRecordA)).toBe(false);
    expect(await advisorOwnsClient(ids.advisorA, ids.clientRecordA)).toBe(true);
  });

  it("refuses to attach another office's client by email", async () => {
    const { NextRequest } = await import('next/server');
    const { POST } = await import('@/app/api/clients/route');
    as(ids.advisorB);
    const response = await POST(new NextRequest('http://localhost/api/clients', json({ email: mail('client-a') })));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('other-office');
    expect(await prisma.client.count({ where: { userId: ids.clientUserA, advisorId: ids.advisorB } })).toBe(0);
  });

  it("opens a separate prospect file instead of the other office's client account", async () => {
    const { openProspectClientFile } = await import('@/lib/prospect-client');
    const result = await openProspectClientFile({ advisorId: ids.advisorB, name: 'ניסיון', email: mail('client-a') });
    const file = await prisma.client.findUniqueOrThrow({ where: { id: result.clientId } });
    expect(file.userId).not.toBe(ids.clientUserA);
    expect(file.prospect).toBe(true);

    // ובכניסה הבאה של הלקוח, התיק המתעניין של ב' לא עובר לחשבון שלו
    const { claimProspectFile } = await import('@/lib/prospect-client');
    expect(await claimProspectFile(ids.clientUserA)).toBeNull();
    expect(await prisma.client.count({ where: { userId: ids.clientUserA } })).toBe(1);
  });

  it("hides another office's leads, notes and overview counts", async () => {
    const { NextRequest } = await import('next/server');
    as(ids.advisorB);
    const leads = await (await (await import('@/app/api/advisor/leads/route')).GET(new NextRequest('http://localhost/api/advisor/leads'))).json();
    expect(JSON.stringify(leads)).not.toContain(ids.leadA);

    const notes = await (await import('@/app/api/advisor/notes/route')).GET(
      new NextRequest(`http://localhost/api/advisor/notes?clientId=${ids.clientRecordA}`)
    );
    expect(notes.status).toBe(403);

    const { getAdvisorOverview } = await import('@/lib/advisor');
    const overview = await getAdvisorOverview(ids.advisorB);
    expect(JSON.stringify(overview)).not.toContain(ids.clientRecordA);
  });

  it("keeps conversations inside the office (and unassigned ones with the platform advisor only)", async () => {
    const { resolveConversationAccess, advisorInbox } = await import('@/lib/conversation-store');
    const { ensurePlatformAdvisor } = await import('@/lib/single-advisor');
    expect(await resolveConversationAccess({ id: ids.advisorB, role: 'ADVISOR' }, ids.clientUserA)).toBeNull();
    expect(await resolveConversationAccess({ id: ids.advisorA, role: 'ADVISOR' }, ids.clientUserA)).not.toBeNull();

    const loner = await prisma.user.create({ data: { email: mail('unassigned'), role: 'CLIENT', name: 'בלי יועץ' } });
    await prisma.conversationMessage.create({
      data: { clientUserId: loner.id, authorId: loner.id, authorRole: 'CLIENT', body: 'שלום' },
    });
    expect(await resolveConversationAccess({ id: ids.advisorB, role: 'ADVISOR' }, loner.id)).toBeNull();
    expect((await advisorInbox(ids.advisorB)).some((row) => row.clientUserId === loner.id)).toBe(false);
    const platform = await ensurePlatformAdvisor();
    expect((await advisorInbox(platform.id)).some((row) => row.clientUserId === loner.id)).toBe(true);
  });

  it('keeps platform-wide screens from regular advisors', async () => {
    as(ids.advisorB);
    // הרשמות שלא הושלמו: ליועץ רגיל הרשימה ריקה
    const drafts = await (await import('@/app/api/advisor/signup-drafts/route')).GET();
    expect((await drafts.json()).signups).toEqual([]);
    const analytics = await (await import('@/app/api/advisor/site-analytics/route')).GET(
      new (await import('next/server')).NextRequest('http://localhost/api/advisor/site-analytics')
    );
    expect(analytics.status).toBe(403);
    const advisors = await (await import('@/app/api/advisor/platform/advisors/route')).GET();
    expect(advisors.status).toBe(403);
  });

  it('attaches a client to the office they signed up through, even when the email is confirmed in another browser', async () => {
    const { startRegistration, confirmRegistration, hashToken } = await import('@/lib/registration');
    const { ensureClientLink } = await import('@/lib/advisor-link');
    const email = mail('new-client-of-b');
    const started = await startRegistration({ email, name: 'לקוחה חדשה', password: 'Str0ng-Passw0rd!', officeSlug: ids.officeB.slug });
    expect(started.status === 'sent' || started.status === 'email-failed').toBe(true);
    // הקישור שבמייל: מחליפים את הטוקן בטוקן ידוע, ומאשרים בלי עוגיית הדפדפן (כמו דפדפן אחר)
    await prisma.pendingRegistration.update({ where: { email }, data: { tokenHash: hashToken('known-token') } });
    const user = await confirmRegistration({ token: 'known-token', password: 'Str0ng-Passw0rd!' });
    expect(user.signupOfficeId).toBe(ids.officeB.id);
    const link = await ensureClientLink(user.id);
    expect(link?.advisorId).toBe(ids.advisorB);
  });

  it('sends a client who signed up on the main site to the platform advisor', async () => {
    const { ensureClientLink } = await import('@/lib/advisor-link');
    const { ensurePlatformAdvisor } = await import('@/lib/single-advisor');
    const user = await prisma.user.create({ data: { email: mail('main-site'), role: 'CLIENT', name: 'אתר ראשי' } });
    const link = await ensureClientLink(user.id);
    expect(link?.advisorId).toBe((await ensurePlatformAdvisor()).id);
  });

  it('routes new-request emails to the office that owns the request', async () => {
    const { advisorEmailFor } = await import('@/lib/advisor-notify');
    expect(await advisorEmailFor(ids.advisorB)).toBe(mail('advisorB'));
    expect(await advisorEmailFor(null)).toBe('mashkalanta@gmail.com');
  });

  it('closes a suspended office: no login, no public page, and open sessions stop', async () => {
    const { setOfficeSuspended } = await import('@/lib/advisor-applications');
    const { advisorForLogin, advisorStillAllowed } = await import('@/lib/advisor-access');
    const { getOfficePage, officeOwnerBySlug } = await import('@/lib/office-store');
    expect(await setOfficeSuspended(ids.officeA.id, true)).toEqual({ ok: true });
    expect(await advisorForLogin(mail('advisorA'))).toBeNull();
    expect(await advisorStillAllowed(ids.advisorA)).toBe(false);
    expect(await getOfficePage(ids.officeA.slug)).toBeNull();
    expect(await officeOwnerBySlug(ids.officeA.slug)).toBeNull();
    // והחזרה לפעילות
    expect(await setOfficeSuspended(ids.officeA.id, false)).toEqual({ ok: true });
    expect(await advisorStillAllowed(ids.advisorA)).toBe(true);
  });

  it('never lets an application in before approval', async () => {
    const { submitAdvisorApplication } = await import('@/lib/advisor-applications');
    const { advisorForLogin } = await import('@/lib/advisor-access');
    await submitAdvisorApplication({
      name: 'ממתין',
      email: mail('waiting'),
      phone: '050-1111111',
      officeName: 'משרד ממתין',
      licenseNumber: null,
      website: null,
      message: null,
    });
    expect(await prisma.user.findUnique({ where: { email: mail('waiting') } })).toBeNull();
    expect(await advisorForLogin(mail('waiting'))).toBeNull();
  });

  it("refuses to turn an existing client account into an advisor", async () => {
    const { submitAdvisorApplication, approveAdvisorApplication } = await import('@/lib/advisor-applications');
    await submitAdvisorApplication({
      name: 'לקוח שמבקש',
      email: mail('client-a'),
      phone: '050-2222222',
      officeName: 'ניסיון',
      licenseNumber: null,
      website: null,
      message: null,
    });
    const application = await prisma.advisorApplication.findFirstOrThrow({ where: { email: mail('client-a') } });
    const result = await approveAdvisorApplication(application.id, ids.advisorA);
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.clientUserA } })).role).toBe('CLIENT');
  });
});
