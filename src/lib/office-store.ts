import { Prisma } from '@prisma/client';
import { prisma } from './db';
import {
  DEFAULT_OFFICE_PROFILE,
  DEFAULT_OFFICE_TOOLS,
  clientToolAccess,
  normalizeOfficeProfile,
  normalizeOfficeTools,
  normalizeSlug,
  normalizeToolOverrides,
  officePath,
  slugProblem,
  suggestedSlug,
  type ClientToolAccess,
  type OfficeProfile,
  type OfficeTools,
  type PublicOffice,
  type ToolModes,
  type ToolOverrides,
} from './office';

/**
 * קריאה ושמירה של המשרד הדיגיטלי של היועץ (src/lib/office.ts).
 *
 * כל פעולה של יועץ מקבלת את המזהה שלו מההתחברות ופועלת רק על המשרד שלו
 * (`ownerId`), ועל לקוח רק אחרי שנבדק שהוא באמת מלווה אצלו.
 */

export interface OfficeView {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  profile: OfficeProfile;
  tools: OfficeTools;
  path: string;
  updatedAt: string;
}

const officeSelect = {
  id: true,
  slug: true,
  name: true,
  published: true,
  profileJson: true,
  toolsJson: true,
  updatedAt: true,
} satisfies Prisma.OfficeSelect;

type OfficeRow = Prisma.OfficeGetPayload<{ select: typeof officeSelect }>;

function toView(row: OfficeRow): OfficeView {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    published: row.published,
    profile: normalizeOfficeProfile(row.profileJson),
    tools: normalizeOfficeTools(row.toolsJson),
    path: officePath(row.slug),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * המשרד של היועץ. בפעם הראשונה הוא נפתח עם ברירות מחדל — לא פעיל, כך שללקוחות
 * לא משתנה דבר עד שהיועץ מפעיל אותו.
 */
export async function getOrCreateAdvisorOffice(advisorId: string): Promise<OfficeView> {
  const existing = await prisma.office.findUnique({ where: { ownerId: advisorId }, select: officeSelect });
  if (existing) return toView(existing);

  const user = await prisma.user.findUnique({ where: { id: advisorId }, select: { name: true, email: true } });
  const base = suggestedSlug(user?.email, advisorId);
  const advisorName = user?.name?.trim() ?? '';
  const profile: OfficeProfile = { ...DEFAULT_OFFICE_PROFILE, advisorName };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      const created = await prisma.office.create({
        data: {
          ownerId: advisorId,
          slug,
          name: advisorName ? `${advisorName} · ייעוץ משכנתאות` : 'המשרד שלי',
          profileJson: profile as unknown as Prisma.InputJsonValue,
          toolsJson: DEFAULT_OFFICE_TOOLS as unknown as Prisma.InputJsonValue,
        },
        select: officeSelect,
      });
      return toView(created);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // נפתח במקביל בבקשה אחרת — זה המשרד שלו
      const raced = await prisma.office.findUnique({ where: { ownerId: advisorId }, select: officeSelect });
      if (raced) return toView(raced);
      // אחרת הקישור תפוס — מנסים את הבא
    }
  }
  throw new Error('Could not open an office: every suggested link is taken');
}

export interface OfficeUpdateInput {
  name?: unknown;
  slug?: unknown;
  published?: unknown;
  profile?: unknown;
  tools?: unknown;
}

export const OFFICE_NAME_MIN = 2;
export const OFFICE_NAME_MAX = 60;

export async function updateAdvisorOffice(
  advisorId: string,
  input: OfficeUpdateInput
): Promise<{ office: OfficeView } | { error: string; status: number }> {
  const current = await getOrCreateAdvisorOffice(advisorId);
  const data: Prisma.OfficeUpdateInput = {};

  if (input.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.replace(/\s+/g, ' ').trim() : '';
    if (name.length < OFFICE_NAME_MIN || name.length > OFFICE_NAME_MAX) {
      return { error: `שם המשרד צריך להיות בין ${OFFICE_NAME_MIN} ל-${OFFICE_NAME_MAX} תווים`, status: 400 };
    }
    data.name = name;
  }

  if (input.slug !== undefined) {
    const slug = normalizeSlug(input.slug);
    const problem = slugProblem(slug);
    if (problem) return { error: problem, status: 400 };
    if (slug !== current.slug) {
      const taken = await prisma.office.findUnique({ where: { slug }, select: { ownerId: true } });
      if (taken && taken.ownerId !== advisorId) return { error: 'הקישור הזה כבר תפוס. בחרו קישור אחר', status: 409 };
      data.slug = slug;
    }
  }

  if (input.published !== undefined) data.published = input.published === true;

  if (input.profile !== undefined) {
    data.profileJson = normalizeOfficeProfile(input.profile) as unknown as Prisma.InputJsonValue;
  }

  if (input.tools !== undefined) {
    data.toolsJson = normalizeOfficeTools(input.tools) as unknown as Prisma.InputJsonValue;
  }

  try {
    const updated = await prisma.office.update({ where: { ownerId: advisorId }, data, select: officeSelect });
    return { office: toView(updated) };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: 'הקישור הזה כבר תפוס. בחרו קישור אחר', status: 409 };
    throw error;
  }
}

function toPublic(view: OfficeView): PublicOffice {
  return { slug: view.slug, name: view.name, profile: view.profile, publicTools: view.tools.publicTools };
}

/**
 * דף המשרד הציבורי: רק משרד פעיל. היועץ עצמו רואה גם את המשרד שלו שעדיין לא
 * פעיל — כדי לבדוק איך הדף נראה לפני שמפעילים אותו.
 */
export async function getOfficePage(
  rawSlug: string,
  viewerId?: string | null
): Promise<{ office: PublicOffice; published: boolean; ownerView: boolean } | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug || slug !== rawSlug.toLowerCase()) return null;
  const row = await prisma.office.findUnique({
    where: { slug },
    select: { ...officeSelect, ownerId: true, suspendedAt: true },
  });
  // משרד מושעה סגור לכולם, גם ליועץ עצמו
  if (!row || row.suspendedAt) return null;
  const ownerView = Boolean(viewerId) && viewerId === row.ownerId;
  if (!row.published && !ownerView) return null;
  return { office: toPublic(toView(row)), published: row.published, ownerView };
}

/** היועץ של משרד פעיל, לפי הקישור — לשיוך לקוח שנרשם דרך דף המשרד */
export async function officeOwnerBySlug(
  rawSlug: string | null | undefined
): Promise<{ id: string; name: string | null; email: string | null } | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug || slugProblem(slug)) return null;
  const row = await prisma.office.findUnique({
    where: { slug },
    select: {
      published: true,
      suspendedAt: true,
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!row?.published || row.suspendedAt || row.owner.role !== 'ADVISOR') return null;
  return { id: row.owner.id, name: row.owner.name, email: row.owner.email };
}

/** היועץ של משרד פעיל, לפי מזהה המשרד — לשיוך שנשמר בהרשמה (User.signupOfficeId) */
export async function officeOwnerById(
  officeId: string | null | undefined
): Promise<{ id: string; name: string | null; email: string | null } | null> {
  if (!officeId) return null;
  const row = await prisma.office.findUnique({
    where: { id: officeId },
    select: { suspendedAt: true, owner: { select: { id: true, name: true, email: true, role: true } } },
  });
  // משרד שהלקוח כבר נרשם דרכו — גם אם הדף הוסתר בינתיים, השיוך נשמר; רק השעיה מבטלת
  if (!row || row.suspendedAt || row.owner.role !== 'ADVISOR') return null;
  return { id: row.owner.id, name: row.owner.name, email: row.owner.email };
}

/** מזהה המשרד הפעיל לפי הקישור — נשמר בהרשמה הממתינה ועובר לחשבון */
export async function activeOfficeIdBySlug(rawSlug: string | null | undefined): Promise<string | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug || slugProblem(slug)) return null;
  const row = await prisma.office.findUnique({ where: { slug }, select: { id: true, published: true, suspendedAt: true } });
  return row?.published && !row.suspendedAt ? row.id : null;
}

export interface ClientOfficeView {
  /** המשרד שהלקוח משויך אליו — רק כשהוא פעיל */
  office: PublicOffice | null;
  /** אילו כלים הלקוח רואה */
  tools: ClientToolAccess;
}

/**
 * המשרד של הלקוח והכלים שפתוחים לו. לקוח בלי כרטיס, או שהיועץ שלו עוד לא פתח
 * משרד — רואה הכול כמו היום.
 */
export async function officeForClient(userId: string): Promise<ClientOfficeView> {
  const record = await prisma.client.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { advisorId: true, toolAccessJson: true },
  });
  if (!record) return { office: null, tools: clientToolAccess(DEFAULT_OFFICE_TOOLS, null) };

  const row = await prisma.office.findUnique({
    where: { ownerId: record.advisorId },
    select: { ...officeSelect, suspendedAt: true },
  });
  const view = row ? toView(row) : null;
  return {
    office: view?.published && !row?.suspendedAt ? toPublic(view) : null,
    tools: clientToolAccess(view?.tools ?? DEFAULT_OFFICE_TOOLS, normalizeToolOverrides(record.toolAccessJson)),
  };
}

export interface ClientToolSettings {
  /** הגדרת המשרד לכל כלי */
  modes: ToolModes;
  /** מה שהיועץ פתח או סגר ללקוח הזה */
  overrides: ToolOverrides;
  /** מה הלקוח רואה בפועל */
  access: ClientToolAccess;
}

async function ownedClient(advisorId: string, clientId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, advisorId },
    select: { id: true, toolAccessJson: true },
  });
}

export async function getClientToolSettings(advisorId: string, clientId: string): Promise<ClientToolSettings | null> {
  const record = await ownedClient(advisorId, clientId);
  if (!record) return null;
  const office = await getOrCreateAdvisorOffice(advisorId);
  const overrides = normalizeToolOverrides(record.toolAccessJson);
  return { modes: office.tools.modes, overrides, access: clientToolAccess(office.tools, overrides) };
}

export async function setClientToolOverrides(
  advisorId: string,
  clientId: string,
  raw: unknown
): Promise<ClientToolSettings | null> {
  const record = await ownedClient(advisorId, clientId);
  if (!record) return null;
  const overrides = normalizeToolOverrides(raw);
  await prisma.client.update({
    where: { id: record.id },
    data: {
      toolAccessJson: Object.keys(overrides).length
        ? (overrides as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
    },
  });
  const office = await getOrCreateAdvisorOffice(advisorId);
  return { modes: office.tools.modes, overrides, access: clientToolAccess(office.tools, overrides) };
}
