/**
 * דאשבורד הביקורים של היועץ: ניקוי הנתונים שמגיעים מהדפדפן, וסיכום הצפיות
 * לתמונת מצב — לפי עמוד, לפי יום, מקורות הגעה ומכשירים.
 *
 * הכול נשמר בבסיס הנתונים של הפלטפורמה ולא בשירות חיצוני, בלי עוגיות ובלי
 * פרטים מזהים: מזהה המבקר הוא מספר אקראי שהדפדפן מגריל.
 */

/** צפייה אחת לא נספרת מעבר לחצי שעה — לשונית שנשכחה פתוחה לא תנפח את הממוצע */
export const MAX_VIEW_MS = 30 * 60 * 1000;

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function isTrackingId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/** מקטע נתיב שהוא מזהה (cuid, uuid, מספר) — מאוחד, כדי שכל דפי התוכניות ייספרו יחד */
function looksLikeId(segment: string): boolean {
  if (/^\d{3,}$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  // cuid ודומיו: ארוך, ובו גם אותיות וגם ספרות
  return segment.length >= 16 && /\d/.test(segment) && /[a-z]/i.test(segment);
}

/** כתובות הכניסה הנסתרת של היועץ — לעולם לא נשמרות, שלא ייחשפו בדאשבורד */
const HIDDEN_PATHS = ['/auth/team-entry', '/auth/advisor-verify', '/advisor-dashboard'];

/**
 * הנתיב בלבד, בלי פרמטרים ובלי עוגן — שקישורי אימות ואיפוס סיסמה לא ישאירו
 * טוקן בבסיס הנתונים — ומזהים מוחלפים ב-[id].
 */
export function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return null;
  const path = raw.split(/[?#]/)[0].slice(0, 200);
  if (HIDDEN_PATHS.some((hidden) => path === hidden || path.startsWith(`${hidden}/`))) return null;
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((segment) => (looksLikeId(segment) ? '[id]' : segment));
  return `/${segments.join('/')}`;
}

/** רק הדומיין של דף ההפניה; הפניה מתוך האתר עצמו אינה מקור הגעה */
export function referrerHost(raw: unknown, ownHost: string | null): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
    if (!host) return null;
    if (ownHost && host === ownHost.replace(/^www\./, '').toLowerCase()) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

export type Device = 'phone' | 'tablet' | 'desktop';

export function deviceFromWidth(width: number): Device {
  if (width < 768) return 'phone';
  if (width < 1100) return 'tablet';
  return 'desktop';
}

export function normalizeDevice(raw: unknown): Device | null {
  return raw === 'phone' || raw === 'tablet' || raw === 'desktop' ? raw : null;
}

const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|monitor|curl|wget|python|node-fetch/i;

export function isBotAgent(userAgent: string | null): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/** שמות העמודים בעברית, לטבלה של היועץ */
const PAGE_LABELS: Record<string, string> = {
  '/': 'דף הבית',
  '/accessibility': 'הצהרת נגישות',
  '/auth/check-email': 'בדיקת מייל אחרי הרשמה',
  '/auth/forgot-password': 'שכחתי סיסמה',
  '/auth/login': 'התחברות',
  '/auth/register': 'הרשמה',
  '/auth/reset-password': 'איפוס סיסמה',
  '/auth/verify': 'אישור הרשמה',
  '/consumer-loans': 'הלוואות צרכניות',
  '/custom-mix-builder': 'בניית תמהיל',
  '/dashboard': 'האזור האישי',
  '/dashboard/checkout': 'תשלום',
  '/dashboard/mix-planner': 'מתכנן התמהיל',
  '/dashboard/plans/[id]': 'שלבי התהליך',
  '/dashboard/plans/[id]/authorization-letters': 'כתבי הסמכה',
  '/dashboard/tour': 'סיור בפלטפורמה',
  '/equity-planning': 'תכנון הון עצמי',
  '/existing-mortgage': 'משכנתא קיימת',
  '/financial-dynamics': 'דינמיקה פיננסית',
  '/how-it-works': 'איך זה עובד',
  '/interactive-mortgage-journey': 'מסע משכנתא אינטראקטיבי',
  '/learn': 'מדריכים',
  '/mortgage-advisor': 'יועץ משכנתא',
  '/mortgage-application': 'בקשת משכנתא',
  '/mortgage-dashboard': 'לוח משכנתא',
  '/mortgage-journey': 'מסע המשכנתא',
  '/mortgage-planning': 'תכנון משכנתא',
  '/mortgage-refinance': 'בדיקת מיחזור',
  '/pricing': 'מחירים',
  '/principal-approval': 'אישור עקרוני',
  '/privacy': 'מדיניות פרטיות',
  '/saved-mixes': 'תמהילים שמורים',
  '/simulations': 'סימולציות',
  '/terms': 'תנאי שימוש',
  '/uniform-mixes': 'תמהילים אחידים',
};

export function pageLabel(path: string): string {
  return PAGE_LABELS[path] ?? path;
}

export type VisitRow = {
  visitorId: string;
  sessionId: string;
  path: string;
  referrer: string | null;
  device: string | null;
  userId: string | null;
  durationMs: number;
  startedAt: Date;
};

export type PageStat = {
  path: string;
  label: string;
  views: number;
  visitors: number;
  /** ממוצע זמן שהייה בשניות, רק מצפיות שנמדד בהן זמן */
  avgSeconds: number;
  totalSeconds: number;
  /** כמה ביקורים נכנסו לאתר דרך העמוד הזה */
  entries: number;
  /** כמה ביקורים הסתיימו בעמוד הזה */
  exits: number;
};

export type DayStat = { day: string; views: number; visitors: number };
export type CountStat = { key: string; count: number };

export type VisitSummary = {
  views: number;
  visitors: number;
  sessions: number;
  signedInVisitors: number;
  avgViewSeconds: number;
  avgSessionSeconds: number;
  pagesPerSession: number;
  /** אחוז הביקורים שראו עמוד אחד בלבד */
  bounceRate: number;
  pages: PageStat[];
  days: DayStat[];
  referrers: CountStat[];
  devices: CountStat[];
};

/** יום בשעון ישראל, YYYY-MM-DD */
export function israelDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayRange(from: Date, to: Date): string[] {
  const days: string[] = [];
  const seen = new Set<string>();
  // צעדים של שש שעות — לא מפספסים יום גם במעבר לשעון קיץ
  for (let t = from.getTime(); t <= to.getTime(); t += 6 * 3600 * 1000) {
    const day = israelDay(new Date(t));
    if (!seen.has(day)) {
      seen.add(day);
      days.push(day);
    }
  }
  const last = israelDay(to);
  if (!seen.has(last)) days.push(last);
  return days;
}

const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function summarizeVisits(rows: VisitRow[], from: Date, to: Date): VisitSummary {
  const visitors = new Set<string>();
  const signedIn = new Set<string>();
  const sessions = new Map<string, VisitRow[]>();
  const pages = new Map<
    string,
    { views: number; visitors: Set<string>; timedViews: number; totalMs: number; entries: number; exits: number }
  >();
  const days = new Map<string, { views: number; visitors: Set<string> }>();
  const referrers = new Map<string, number>();
  const devices = new Map<string, number>();
  let timedViews = 0;
  let totalMs = 0;

  for (const row of rows) {
    const ms = Math.min(Math.max(row.durationMs, 0), MAX_VIEW_MS);
    visitors.add(row.visitorId);
    if (row.userId) signedIn.add(row.visitorId);

    const list = sessions.get(row.sessionId) ?? [];
    list.push(row);
    sessions.set(row.sessionId, list);

    const page = pages.get(row.path) ?? {
      views: 0,
      visitors: new Set<string>(),
      timedViews: 0,
      totalMs: 0,
      entries: 0,
      exits: 0,
    };
    page.views += 1;
    page.visitors.add(row.visitorId);
    if (ms > 0) {
      page.timedViews += 1;
      page.totalMs += ms;
      timedViews += 1;
      totalMs += ms;
    }
    pages.set(row.path, page);

    const dayKey = israelDay(row.startedAt);
    const day = days.get(dayKey) ?? { views: 0, visitors: new Set<string>() };
    day.views += 1;
    day.visitors.add(row.visitorId);
    days.set(dayKey, day);
  }

  let bounces = 0;
  let sessionMs = 0;
  for (const list of sessions.values()) {
    list.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    const first = list[0];
    const last = list[list.length - 1];
    pages.get(first.path)!.entries += 1;
    pages.get(last.path)!.exits += 1;
    if (list.length === 1) bounces += 1;
    sessionMs += list.reduce((sum, row) => sum + Math.min(Math.max(row.durationMs, 0), MAX_VIEW_MS), 0);

    // מקור ההגעה והמכשיר נספרים פעם אחת לכל ביקור
    const source = list.find((row) => row.referrer)?.referrer ?? 'כניסה ישירה';
    referrers.set(source, (referrers.get(source) ?? 0) + 1);
    const device = first.device ?? 'unknown';
    devices.set(device, (devices.get(device) ?? 0) + 1);
  }

  const sessionCount = sessions.size;
  const toCounts = (map: Map<string, number>) =>
    [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);

  return {
    views: rows.length,
    visitors: visitors.size,
    sessions: sessionCount,
    signedInVisitors: signedIn.size,
    avgViewSeconds: timedViews ? round(totalMs / timedViews / 1000) : 0,
    avgSessionSeconds: sessionCount ? round(sessionMs / sessionCount / 1000) : 0,
    pagesPerSession: sessionCount ? round(rows.length / sessionCount, 1) : 0,
    bounceRate: sessionCount ? round((bounces / sessionCount) * 100) : 0,
    pages: [...pages.entries()]
      .map(([path, page]) => ({
        path,
        label: pageLabel(path),
        views: page.views,
        visitors: page.visitors.size,
        avgSeconds: page.timedViews ? round(page.totalMs / page.timedViews / 1000) : 0,
        totalSeconds: round(page.totalMs / 1000),
        entries: page.entries,
        exits: page.exits,
      }))
      .sort((a, b) => b.views - a.views),
    days: dayRange(from, to).map((day) => ({
      day,
      views: days.get(day)?.views ?? 0,
      visitors: days.get(day)?.visitors.size ?? 0,
    })),
    referrers: toCounts(referrers).slice(0, 12),
    devices: toCounts(devices),
  };
}

/** ניקוי שדה טקסט מטופס ההרשמה: חתוך, בלי תווי בקרה, ריק הופך ל-null */
export function cleanDraftField(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const value = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  return value || null;
}

export const DRAFT_FIELDS = ['name', 'username', 'email'] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];

export const DRAFT_FIELD_LABELS: Record<DraftField, string> = {
  name: 'שם מלא',
  username: 'שם משתמש',
  email: 'מייל',
};

export type DraftRow = {
  id: string;
  visitorId: string | null;
  source: string;
  path: string | null;
  name: string | null;
  username: string | null;
  email: string | null;
  lastField: string | null;
  submitted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PendingRow = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  provider: string | null;
  expires: Date;
  sendCount: number;
  createdAt: Date;
  lastSentAt: Date;
};

/**
 * typing — הקליד ועזב לפני "הירשם"; awaiting-link — נשלח מייל אישור והקישור
 * עוד בתוקף; link-expired — הקישור פג בלי שאושר
 */
export type UnfinishedStatus = 'typing' | 'awaiting-link' | 'link-expired';

export type UnfinishedSignup = {
  /** מזהה הטיוטה, או `pending:<id>` להרשמה שנשמרה רק בשרת (למשל דרך גוגל) */
  id: string;
  status: UnfinishedStatus;
  source: string;
  name: string | null;
  username: string | null;
  email: string | null;
  /** האם המייל שהוקלד נראה שלם — מייל חלקי לא שווה פנייה */
  emailLooksValid: boolean;
  lastField: string | null;
  provider: string | null;
  sendCount: number;
  startedAt: string;
  lastActivityAt: string;
  /** כמה עמודים ראה המבקר באתר, וכמה ביקורים, כשהטיוטה קשורה לדפדפן שלו */
  pageViews: number;
  sessions: number;
  deletable: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * הרשימה של "הרשמות שלא הושלמו": טיוטות מהטופס, ועוד הרשמות שנשלחו ולא אושרו.
 * מי שכבר יש לו חשבון עם אותו מייל, או שכבר התחבר מאותו דפדפן — לא מופיע. כמה טיוטות לאותו מייל מאוחדות
 * לאחרונה מביניהן.
 */
export function buildUnfinishedSignups(
  drafts: DraftRow[],
  pendings: PendingRow[],
  registeredEmails: Set<string>,
  visits: Map<string, { pageViews: number; sessions: number }>,
  now: Date,
  /** דפדפנים שמישהו כבר התחבר מהם — ההרשמה שם הושלמה, גם אם במייל אחר */
  signedInVisitors: Set<string> = new Set()
): UnfinishedSignup[] {
  const pendingByEmail = new Map(pendings.map((pending) => [pending.email.toLowerCase(), pending]));
  const result: UnfinishedSignup[] = [];
  const seenEmails = new Set<string>();

  const sorted = [...drafts].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  for (const draft of sorted) {
    const email = draft.email?.toLowerCase() ?? null;
    if (email && registeredEmails.has(email)) continue;
    if (draft.visitorId && signedInVisitors.has(draft.visitorId)) continue;
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);

    const pending = email ? pendingByEmail.get(email) : undefined;
    const status: UnfinishedStatus = pending
      ? pending.expires > now
        ? 'awaiting-link'
        : 'link-expired'
      : draft.submitted
        ? 'link-expired'
        : 'typing';
    const lastActivity = pending && pending.lastSentAt > draft.updatedAt ? pending.lastSentAt : draft.updatedAt;
    const visit = draft.visitorId ? visits.get(draft.visitorId) : undefined;

    result.push({
      id: draft.id,
      status,
      source: draft.source,
      name: draft.name ?? pending?.name ?? null,
      username: draft.username ?? pending?.username ?? null,
      email: draft.email,
      emailLooksValid: Boolean(email && EMAIL_PATTERN.test(email)),
      lastField: draft.lastField,
      provider: pending?.provider ?? null,
      sendCount: pending?.sendCount ?? 0,
      startedAt: draft.createdAt.toISOString(),
      lastActivityAt: lastActivity.toISOString(),
      pageViews: visit?.pageViews ?? 0,
      sessions: visit?.sessions ?? 0,
      deletable: true,
    });
  }

  for (const pending of pendings) {
    const email = pending.email.toLowerCase();
    if (seenEmails.has(email) || registeredEmails.has(email)) continue;
    seenEmails.add(email);
    result.push({
      id: `pending:${pending.id}`,
      status: pending.expires > now ? 'awaiting-link' : 'link-expired',
      source: pending.provider === 'google' ? 'google' : 'register',
      name: pending.name,
      username: pending.username,
      email: pending.email,
      emailLooksValid: true,
      lastField: null,
      provider: pending.provider,
      sendCount: pending.sendCount,
      startedAt: pending.createdAt.toISOString(),
      lastActivityAt: pending.lastSentAt.toISOString(),
      pageViews: 0,
      sessions: 0,
      deletable: false,
    });
  }

  return result.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
