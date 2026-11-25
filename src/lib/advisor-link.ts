import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { syncStageDocuments } from './clients';
import { ADVISOR_EMAIL } from './single-advisor';
import { claimProspectFile } from './prospect-client';
import { OFFICE_COOKIE } from './office';
import { officeOwnerById, officeOwnerBySlug } from './office-store';

/**
 * שיוך לקוחות ליועץ.
 *
 * כרטיס הלקוח (`Client`) הוא מה שמחבר בין החשבון של הלקוח ליועץ: דרכו היועץ
 * רואה את התהליכים, המסמכים, התמהילים והבקשות של הלקוח. עד עכשיו כרטיס נפתח
 * רק כשיועץ הוסיף לקוח בעצמו, ולכן לקוח שנרשם לבד לא הופיע אצל אף יועץ.
 *
 * לקוח שנרשם דרך דף משרד (/o/<slug>) משויך ליועץ של אותו משרד. השיוך נשמר
 * במסד בהרשמה (User.signupOfficeId), ובנוסף נקרא מהעוגייה של דף המשרד. מי
 * שנרשם באתר הראשי, בלי דף משרד, משויך ליועץ הפלטפורמה.
 */

export interface PrimaryAdvisor {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * יועץ הפלטפורמה (src/lib/single-advisor.ts), ואם עדיין לא נוצר — חשבון
 * היועץ הראשון שנפתח. אליו מגיעים לקוחות ופניות מהאתר הראשי.
 */
export async function primaryAdvisor(): Promise<PrimaryAdvisor | null> {
  const select = { id: true, name: true, email: true } as const;
  const single = await prisma.user.findFirst({ where: { role: 'ADVISOR', email: ADVISOR_EMAIL }, select });
  if (single) return single;
  return prisma.user.findFirst({ where: { role: 'ADVISOR' }, orderBy: { createdAt: 'asc' }, select });
}

export interface ClientLink {
  clientId: string;
  advisorId: string;
}

/**
 * היועץ של המשרד שדרכו הגולש הגיע — דף המשרד (/o/<slug>) שומר את הקישור
 * בעוגייה, וכך מי שנרשם מהדף של יועץ משויך אליו ולא ליועץ של הפלטפורמה.
 * רק משרד פעיל. מחוץ לבקשה, או בלי עוגייה — null.
 */
async function advisorFromOfficeCookie(): Promise<PrimaryAdvisor | null> {
  try {
    const slug = (await cookies()).get(OFFICE_COOKIE)?.value;
    if (!slug) return null;
    return await officeOwnerBySlug(decodeURIComponent(slug));
  } catch {
    return null;
  }
}

/**
 * כרטיס הלקוח של המשתמש, ואם אין — פתיחת כרטיס אצל היועץ של הפלטפורמה.
 *
 * בפתיחת הכרטיס, מה שהלקוח כבר עשה לפני שהיה לו כרטיס (תהליכים, מסמכים,
 * תמהילים, בקשות ריבית, פניות ובקשות ליווי) מקבל אותו, כדי שיופיע אצל היועץ.
 * הפעולה בטוחה לקריאה חוזרת. מחזיר null למשתמש שאינו לקוח, או כשאין יועץ.
 */
export async function ensureClientLink(
  userId: string,
  options: { useOfficeCookie?: boolean } = {}
): Promise<ClientLink | null> {
  // תיק מתעניין שהיועץ פתח עם המייל הזה עובר עכשיו לחשבון (src/lib/prospect-client.ts)
  const claimed = await claimProspectFile(userId).catch((error) => {
    console.error('[advisor-link] claiming the prospect file failed:', error);
    return null;
  });
  if (claimed) return claimed;

  const existing = await prisma.client.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, advisorId: true },
  });
  if (existing) return { clientId: existing.id, advisorId: existing.advisorId };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true, email: true, signupOfficeId: true },
  });
  // מי שנרשם דרך דף משרד של יועץ — אליו (לפי מה שנשמר בהרשמה, ואחרת לפי
  // העוגייה); כל השאר — ליועץ של הפלטפורמה
  // העוגייה היא של הדפדפן ששלח את הבקשה: רק כשזה הלקוח עצמו
  const officeAdvisor =
    (await officeOwnerById(user?.signupOfficeId)) ??
    (options.useOfficeCookie === false ? null : await advisorFromOfficeCookie());
  const advisor = officeAdvisor ?? (await primaryAdvisor());
  if (!user || user.role !== 'CLIENT' || !user.email || !advisor || advisor.id === userId) return null;

  let clientId: string;
  try {
    const created = await prisma.client.create({
      // אוטומטי — לא ליווי: הכלים בתשלום נשארים סגורים עד שהלקוח משלם
      data: { advisorId: advisor.id, userId, name: user.name?.trim() || user.email, email: user.email, autoLinked: true },
      select: { id: true },
    });
    clientId = created.id;
    await syncStageDocuments(clientId, 'INTAKE');
  } catch (error) {
    // נפתח במקביל בבקשה אחרת
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    const row = await prisma.client.findFirst({ where: { userId }, select: { id: true, advisorId: true } });
    if (!row) return null;
    return { clientId: row.id, advisorId: row.advisorId };
  }

  await attachOrphans(userId, clientId, advisor.id);
  // פניות ששלח כאורח, לפני שנרשם, עם אותה כתובת מייל — עוברות לכרטיס שלו,
  // יחד עם הקבצים שצירף
  await prisma.advisorLead.updateMany({
    where: { ownerId: null, clientId: null, email: user.email.trim().toLowerCase() },
    data: { ownerId: userId, clientId, advisorId: advisor.id },
  });
  return { clientId, advisorId: advisor.id };
}

/** כמו ensureClientLink, בלי להפיל את הפעולה שקראה לו אם השיוך נכשל */
export async function ensureClientLinkSafely(userId: string): Promise<ClientLink | null> {
  try {
    return await ensureClientLink(userId);
  } catch (error) {
    console.error('[advisor-link] linking the client failed:', error);
    return null;
  }
}

/** מה שהלקוח יצר בלי כרטיס — מקבל עכשיו את הכרטיס */
async function attachOrphans(userId: string, clientId: string, advisorId: string): Promise<void> {
  const orphan = { ownerId: userId, clientId: null };
  await Promise.all([
    prisma.mortgagePlan.updateMany({ where: orphan, data: { clientId } }),
    prisma.planDocument.updateMany({ where: orphan, data: { clientId } }),
    prisma.mortgageMix.updateMany({ where: orphan, data: { clientId } }),
    prisma.bankRateRequest.updateMany({ where: orphan, data: { clientId } }),
    prisma.advisorLead.updateMany({ where: orphan, data: { clientId, advisorId } }),
    prisma.advisorServiceOrder.updateMany({ where: orphan, data: { clientId, advisorId } }),
  ]);
}

/**
 * כשהיועץ של הפלטפורמה פותח את האזור שלו: כל לקוח שעדיין אין לו כרטיס
 * מקבל כרטיס אצלו, וכך מופיע ברשימת הלקוחות. יועץ אחר לא משייך לעצמו.
 */
export async function linkUnlinkedClients(advisorId: string): Promise<number> {
  try {
    const advisor = await primaryAdvisor();
    if (!advisor || advisor.id !== advisorId) return 0;
    const users = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        advisedAs: { none: {} },
        ...(advisor.email ? { NOT: { email: advisor.email } } : {}),
      },
      select: { id: true },
      take: 200,
    });
    let linked = 0;
    for (const user of users) {
      // הבקשה כאן היא של היועץ, ולכן העוגייה של הדפדפן שלו לא קובעת לאיזה משרד הלקוח שייך
      if (await ensureClientLink(user.id, { useOfficeCookie: false })) linked += 1;
    }
    // לקוח שהיה לו כרטיס כבר קודם, ופתח תהליך לפני שנפתח לו — גם התהליך מגיע
    const orphans = await prisma.mortgagePlan.findMany({
      where: { clientId: null, owner: { advisedAs: { some: { advisorId } } } },
      distinct: ['ownerId'],
      select: { ownerId: true },
      take: 200,
    });
    for (const { ownerId } of orphans) {
      const record = await prisma.client.findFirst({
        where: { userId: ownerId, advisorId },
        select: { id: true },
      });
      if (record) await attachOrphans(ownerId, record.id, advisorId);
    }
    return linked;
  } catch (error) {
    console.error('[advisor-link] linking unlinked clients failed:', error);
    return 0;
  }
}


export { OTHER_OFFICE_MESSAGE, linkedToAnotherAdvisor } from './office-scope';
