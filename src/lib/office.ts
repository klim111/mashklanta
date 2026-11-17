/**
 * המשרד הדיגיטלי של היועץ.
 *
 * לכל יועץ יש משרד אחד: דף ציבורי בכתובת `/o/<slug>` עם השם, הלוגו, הצבע
 * ופרטי הקשר שלו, והגדרה של הכלים שהלקוחות שלו רואים באזור האישי. מבנה
 * האזור האישי זהה בכל המשרדים — היועץ קובע רק את המיתוג ואת בחירת הכלים.
 *
 * הכלים בשלוש שכבות:
 *   1. ליבה קבועה, שתמיד מוצגת ללקוח: התהליך, תיק המסמכים, הודעות ופגישות,
 *      ומה שהיועץ שיתף איתו. היא לא מופיעה כאן כי אי אפשר לכבות אותה.
 *   2. כלים שהיועץ קובע לכל אחד מהם אם הוא פתוח לכל הלקוחות, נפתח רק ללקוחות
 *      שהיועץ בוחר, או מוסתר מכולם.
 *   3. ערכות מוכנות, כדי שלא צריך להחליט על כל כלי בנפרד.
 *
 * מעבר להגדרת המשרד, היועץ יכול לפתוח או לסגור כלי ללקוח מסוים (Client.toolAccessJson).
 *
 * הקובץ טהור בכוונה: נטען גם בשרת וגם בדפדפן, ונבדק בבדיקות יחידה.
 */

// ───────────────────────────────── הכלים ─────────────────────────────────

export const TOOL_MODULE_IDS = [
  'feasibility',
  'equity',
  'cash-flow',
  'consumer-loans',
  'refinance',
  'mix-planner',
  'learn',
] as const;

export type ToolModuleId = (typeof TOOL_MODULE_IDS)[number];

export interface ToolModule {
  id: ToolModuleId;
  label: string;
  /** שורה קצרה שמסבירה ליועץ מה הלקוח עושה בכלי */
  hint: string;
  /**
   * הכתובת הציבורית של הכלי — כלי שאפשר להציג בדף המשרד, לגולשים שעוד לא
   * נרשמו. בלי כתובת — הכלי עובד רק בתוך האזור האישי
   */
  publicHref?: string;
  /** הכלי נפתח ללקוח רק אחרי תשלום (הכלל הקיים של הפלטפורמה, לא משתנה כאן) */
  paid?: boolean;
}

export const TOOL_MODULES: ToolModule[] = [
  {
    id: 'feasibility',
    label: 'בדיקת היתכנות',
    hint: 'כמה נכס אפשר להרשות לעצמנו, לפי הכנסות והון עצמי',
    publicHref: '/mortgage-planning?flow=affordability',
  },
  {
    id: 'equity',
    label: 'תכנון הון עצמי',
    hint: 'מקדמה, מס רכישה והוצאות נלוות על ציר זמן',
    publicHref: '/equity-planning',
  },
  {
    id: 'cash-flow',
    label: 'מצב הון ותזרים',
    hint: 'המשכנתא וההלוואות מול ההכנסה הפנויה',
  },
  {
    id: 'consumer-loans',
    label: 'הלוואות צרכניות',
    hint: 'מיפוי הלוואות, איחוד ופירעון מוקדם',
    publicHref: '/consumer-loans',
  },
  {
    id: 'refinance',
    label: 'מיחזור משכנתא',
    hint: 'מה קורה להחזר ולריבית בשינוי תנאים',
    publicHref: '/mortgage-refinance',
  },
  {
    id: 'mix-planner',
    label: 'בונה תמהילים עצמי',
    hint: 'הלקוח בונה ומשווה תמהילים בעצמו',
    paid: true,
  },
  {
    id: 'learn',
    label: 'מרכז הלמידה',
    hint: 'הסברים קצרים על מסלולים, סלים ועמלות',
    publicHref: '/learn',
  },
];

export function toolModule(id: ToolModuleId): ToolModule {
  return TOOL_MODULES.find((tool) => tool.id === id) ?? TOOL_MODULES[0];
}

export function isToolModuleId(value: unknown): value is ToolModuleId {
  return typeof value === 'string' && (TOOL_MODULE_IDS as readonly string[]).includes(value);
}

/**
 * מצב כלי במשרד:
 *   all      — פתוח לכל הלקוחות (אפשר לסגור ללקוח מסוים)
 *   selected — נפתח רק ללקוחות שהיועץ פותח לו בדף הלקוח
 *   hidden   — מוסתר מכל הלקוחות
 */
export type ToolMode = 'all' | 'selected' | 'hidden';

export const TOOL_MODES: Array<{ id: ToolMode; label: string; hint: string }> = [
  { id: 'all', label: 'פתוח לכולם', hint: 'כל הלקוחות רואים את הכלי' },
  { id: 'selected', label: 'רק למי שאפתח', hint: 'נפתח ללקוח מדף הלקוח' },
  { id: 'hidden', label: 'מוסתר', hint: 'אף לקוח לא רואה את הכלי' },
];

function isToolMode(value: unknown): value is ToolMode {
  return value === 'all' || value === 'selected' || value === 'hidden';
}

export type ToolModes = Record<ToolModuleId, ToolMode>;

function modesOf(mode: (id: ToolModuleId) => ToolMode): ToolModes {
  return Object.fromEntries(TOOL_MODULE_IDS.map((id) => [id, mode(id)])) as ToolModes;
}

// ───────────────────────────────── ערכות מוכנות ─────────────────────────────────

export type ToolPresetId = 'full-service' | 'partner' | 'open';

export interface ToolPreset {
  id: ToolPresetId;
  label: string;
  description: string;
  modes: ToolModes;
}

export const TOOL_PRESETS: ToolPreset[] = [
  {
    id: 'full-service',
    label: 'ליווי מלא',
    description: 'הלקוח רואה רק את התהליך, המסמכים, ההודעות והפגישות. את החישובים אתם עושים ומשתפים איתו.',
    modes: modesOf(() => 'selected'),
  },
  {
    id: 'partner',
    label: 'לקוח שותף',
    description:
      'הלקוח מזין נתונים בעצמו: היתכנות, הון עצמי, תזרים ומרכז הלמידה פתוחים. בניית תמהילים, מיחזור והלוואות נפתחים למי שתבחרו.',
    modes: modesOf((id) =>
      id === 'feasibility' || id === 'equity' || id === 'cash-flow' || id === 'learn' ? 'all' : 'selected'
    ),
  },
  {
    id: 'open',
    label: 'הכול פתוח',
    description: 'כל הכלים פתוחים לכל הלקוחות. בונה התמהילים העצמי נשאר נעול עד תשלום, כמו היום.',
    modes: modesOf(() => 'all'),
  },
];

export function toolPreset(id: ToolPresetId): ToolPreset {
  return TOOL_PRESETS.find((preset) => preset.id === id) ?? TOOL_PRESETS[2];
}

/** הערכה שהמצבים תואמים לה בדיוק, או null כשהיועץ שינה כלי בודד */
export function presetMatching(modes: ToolModes): ToolPresetId | null {
  const match = TOOL_PRESETS.find((preset) => TOOL_MODULE_IDS.every((id) => preset.modes[id] === modes[id]));
  return match?.id ?? null;
}

// ───────────────────────────────── הגדרת הכלים של המשרד ─────────────────────────────────

/** כמה כלים חינמיים אפשר להציג בדף המשרד */
export const MAX_PUBLIC_TOOLS = 3;

export interface OfficeTools {
  modes: ToolModes;
  /** הכלים החינמיים שמוצגים לגולשים בדף המשרד, לפי הסדר */
  publicTools: ToolModuleId[];
}

/**
 * ברירת המחדל: בדיוק מה שהלקוחות רואים היום — הכול פתוח, ובונה התמהילים
 * נעול עד תשלום. משרד שלא שינה דבר לא משנה ללקוחות דבר.
 */
export const DEFAULT_OFFICE_TOOLS: OfficeTools = {
  modes: toolPreset('open').modes,
  publicTools: ['feasibility', 'refinance'],
};

export function normalizeOfficeTools(raw: unknown): OfficeTools {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawModes = (source.modes && typeof source.modes === 'object' ? source.modes : {}) as Record<string, unknown>;
  const modes = modesOf((id) => (isToolMode(rawModes[id]) ? (rawModes[id] as ToolMode) : DEFAULT_OFFICE_TOOLS.modes[id]));

  let publicTools: ToolModuleId[] = DEFAULT_OFFICE_TOOLS.publicTools;
  if (Array.isArray(source.publicTools)) {
    publicTools = source.publicTools
      .filter(isToolModuleId)
      .filter((id) => Boolean(toolModule(id).publicHref))
      .filter((id, index, all) => all.indexOf(id) === index)
      .slice(0, MAX_PUBLIC_TOOLS);
  }
  return { modes, publicTools };
}

// ───────────────────────────────── כלים ללקוח מסוים ─────────────────────────────────

export type ToolOverride = 'on' | 'off';
export type ToolOverrides = Partial<Record<ToolModuleId, ToolOverride>>;

export function normalizeToolOverrides(raw: unknown): ToolOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const result: ToolOverrides = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isToolModuleId(key) && (value === 'on' || value === 'off')) result[key] = value;
  }
  return result;
}

/**
 * האם הלקוח רואה את הכלי: מה שהמשרד מגדיר, ועליו מה שהיועץ פתח או סגר ללקוח.
 * כלי מוסתר נשאר מוסתר — היועץ בחר שאף לקוח לא יראה אותו.
 */
export function toolOpenFor(mode: ToolMode, override: ToolOverride | undefined): boolean {
  if (mode === 'hidden') return false;
  if (mode === 'all') return override !== 'off';
  return override === 'on';
}

export type ClientToolAccess = Record<ToolModuleId, boolean>;

export function clientToolAccess(tools: OfficeTools, overrides: ToolOverrides | null | undefined): ClientToolAccess {
  return Object.fromEntries(
    TOOL_MODULE_IDS.map((id) => [id, toolOpenFor(tools.modes[id], overrides?.[id])])
  ) as ClientToolAccess;
}

/** הכול פתוח — ללקוח שאין לו משרד, ולמי שאינו לקוח (יועץ בתצוגה כלקוח) */
export const ALL_TOOLS_OPEN: ClientToolAccess = clientToolAccess(
  { modes: modesOf(() => 'all'), publicTools: [] },
  null
);

// ───────────────────────────────── פרטי המשרד והמיתוג ─────────────────────────────────

export interface OfficeColor {
  id: string;
  label: string;
  /** הצבע הראשי: כפתורים, כותרות קטנות ופס עליון */
  main: string;
  /** גוון כהה לריחוף ולטקסט על רקע בהיר */
  dark: string;
  /** רקע בהיר מאוד לאזורים מודגשים */
  soft: string;
}

/**
 * פלטה סגורה: כל צבע נבדק לניגודיות טקסט לבן על הצבע הראשי, כך שיועץ לא יכול
 * לבחור צבע שהופך את הכפתורים לבלתי קריאים
 */
export const OFFICE_COLORS: OfficeColor[] = [
  { id: 'blue', label: 'כחול', main: '#2563eb', dark: '#1d4ed8', soft: '#eff6ff' },
  { id: 'indigo', label: 'אינדיגו', main: '#4f46e5', dark: '#4338ca', soft: '#eef2ff' },
  { id: 'violet', label: 'סגול', main: '#7c3aed', dark: '#6d28d9', soft: '#f5f3ff' },
  { id: 'teal', label: 'טורקיז', main: '#0f766e', dark: '#115e59', soft: '#f0fdfa' },
  { id: 'emerald', label: 'ירוק', main: '#047857', dark: '#065f46', soft: '#ecfdf5' },
  { id: 'rose', label: 'בורדו', main: '#be123c', dark: '#9f1239', soft: '#fff1f2' },
  { id: 'amber', label: 'חום זהב', main: '#b45309', dark: '#92400e', soft: '#fffbeb' },
  { id: 'slate', label: 'אפור כהה', main: '#334155', dark: '#1e293b', soft: '#f8fafc' },
];

export function officeColor(id: string | null | undefined): OfficeColor {
  return OFFICE_COLORS.find((color) => color.id === id) ?? OFFICE_COLORS[0];
}

export const MAX_SERVICES = 6;

export interface OfficeProfile {
  /** השם שמוצג ליד התמונה — בדרך כלל שם היועץ */
  advisorName: string;
  /** תואר קצר: "יועץ משכנתאות", "יועצת משכנתאות ופיננסים" */
  advisorTitle: string;
  /** משפט הפתיחה בדף המשרד */
  headline: string;
  /** פסקה קצרה: מי אני ואיך אני עובד */
  about: string;
  /** השירותים שהמשרד מציע — שורה לכל שירות */
  services: string[];
  phone: string;
  whatsapp: string;
  email: string;
  /** כתובת תמונה שהועלתה (/api/site-images/<id>) */
  logoUrl: string | null;
  photoUrl: string | null;
  color: string;
}

export const DEFAULT_OFFICE_PROFILE: OfficeProfile = {
  advisorName: '',
  advisorTitle: 'יועץ משכנתאות',
  headline: 'ליווי משכנתא אישי, מהבדיקה הראשונה ועד החתימה בבנק',
  about: '',
  services: ['בניית תמהיל משכנתא מותאם', 'מכרז ריביות מול הבנקים', 'מיחזור משכנתא קיימת'],
  phone: '',
  whatsapp: '',
  email: '',
  logoUrl: null,
  photoUrl: null,
  color: 'blue',
};

const LIMITS = {
  advisorName: 60,
  advisorTitle: 60,
  headline: 140,
  about: 900,
  service: 80,
  phone: 20,
  email: 120,
};

function text(value: unknown, max: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** פסקה: שומרת על ירידות שורה, בלי רווחים כפולים */
function paragraph(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/** רק תמונה שהועלתה לפלטפורמה — לא כתובת חיצונית שמישהו הדביק */
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\/api\/site-images\/[\w-]{1,40}$/.test(value) ? value : null;
}

function phoneDigits(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^\d+\-\s]/g, '').trim().slice(0, LIMITS.phone);
}

function email(value: unknown): string {
  const candidate = text(value, LIMITS.email).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : '';
}

export function normalizeOfficeProfile(raw: unknown): OfficeProfile {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const services = Array.isArray(source.services)
    ? source.services.map((item) => text(item, LIMITS.service)).filter(Boolean).slice(0, MAX_SERVICES)
    : DEFAULT_OFFICE_PROFILE.services;
  return {
    advisorName: text(source.advisorName, LIMITS.advisorName),
    advisorTitle: text(source.advisorTitle, LIMITS.advisorTitle, DEFAULT_OFFICE_PROFILE.advisorTitle),
    headline: text(source.headline, LIMITS.headline, DEFAULT_OFFICE_PROFILE.headline),
    about: paragraph(source.about, LIMITS.about),
    services,
    phone: phoneDigits(source.phone),
    whatsapp: phoneDigits(source.whatsapp),
    email: email(source.email),
    logoUrl: safeImageUrl(source.logoUrl),
    photoUrl: safeImageUrl(source.photoUrl),
    color: officeColor(typeof source.color === 'string' ? source.color : null).id,
  };
}

// ───────────────────────────────── הקישור של המשרד ─────────────────────────────────

/** מילים שלא יכולות להיות קישור של משרד, כדי שלא יתבלבלו עם עמודי האתר */
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'pro',
  'www',
  'auth',
  'login',
  'dashboard',
  'office',
  'mashkalanta',
  'support',
  'help',
  'new',
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 30;

/** הקישור כפי שהיועץ הקליד אותו, בצורה המנורמלת: אותיות לועזיות קטנות, ספרות ומקפים */
export function normalizeSlug(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** הודעה בעברית כשהקישור לא תקין, או null כשאפשר להשתמש בו */
export function slugProblem(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `הקישור צריך להיות לפחות ${SLUG_MIN} תווים: אותיות באנגלית, ספרות ומקפים`;
  if (slug.length > SLUG_MAX) return `הקישור יכול להיות עד ${SLUG_MAX} תווים`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'בקישור אפשר להשתמש רק באותיות באנגלית, ספרות ומקפים';
  if (RESERVED_SLUGS.has(slug)) return 'הקישור הזה שמור לאתר. בחרו קישור אחר';
  return null;
}

/** קישור התחלתי למשרד חדש, מהמייל של היועץ — רק הצעה, היועץ משנה אותו כרצונו */
export function suggestedSlug(email: string | null | undefined, fallbackId: string): string {
  const local = normalizeSlug((email ?? '').split('@')[0]);
  const candidate = local.slice(0, SLUG_MAX);
  if (candidate && !slugProblem(candidate)) return candidate;
  return `office-${fallbackId.slice(-6).toLowerCase()}`;
}

export const OFFICE_PATH_PREFIX = '/o/';

export function officePath(slug: string): string {
  return `${OFFICE_PATH_PREFIX}${slug}`;
}

/** עוגיית הדפדפן שזוכרת דרך איזה משרד הגולש הגיע — וכך הוא משויך אליו בהרשמה */
export const OFFICE_COOKIE = 'mk_office';
export const OFFICE_COOKIE_DAYS = 30;

// ───────────────────────────────── מה שהלקוח רואה ─────────────────────────────────

/** פרטי המשרד שמותר להציג לכל גולש */
export interface PublicOffice {
  slug: string;
  name: string;
  profile: OfficeProfile;
  publicTools: ToolModuleId[];
}

/** קישור וואטסאפ מהמספר שהיועץ הזין (מספר ישראלי מקבל קידומת 972) */
export function whatsappHref(number: string): string | null {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 9) return null;
  const international = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

export function telHref(number: string): string | null {
  const digits = number.replace(/[^\d+]/g, '');
  return digits.length >= 9 ? `tel:${digits}` : null;
}

/** ראשי התיבות של שם — לעיגול כשאין תמונה */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}
