/**
 * תוכן האתר שהיועץ עורך בלשונית "תוכן האתר" בלוח הבקרה: החלפות טקסט ובאנרים.
 *
 * החלפת טקסט היא זוג "טקסט מקורי ← טקסט חדש" שחל על עמוד אחד, על קבוצת עמודים
 * (`/dashboard/plans/*`) או על כל האתר (`*`). היא מוחלת בדפדפן על כל טקסט
 * שמופיע בעמוד בדיוק כך (src/components/site-content/SiteContentRuntime.tsx),
 * ולכן עובדת בכל עמוד ומסך בלי שהעמוד צריך להכיר אותה.
 *
 * באנר פרסומת מוצג בראש העמוד, בתחתיתו או כחלונית צפה, בעמודים שנבחרו ובטווח
 * התאריכים שנקבע.
 *
 * בלי גישה לבסיס הנתונים, כדי שגם הדפדפן יוכל להשתמש בהגדרות.
 */

export interface SiteTextRule {
  id: string;
  /** העמוד: נתיב מדויק, קידומת שמסתיימת ב-`/*`, או `*` לכל האתר */
  page: string;
  from: string;
  to: string;
}

export type BannerPlacement = 'top' | 'bottom' | 'popup';
export type BannerTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'dark';

export interface SiteBanner {
  id: string;
  /** שם פנימי, לרשימה בלוח הבקרה בלבד */
  name: string;
  title: string;
  text: string;
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
  /** העמודים שבהם הבאנר מוצג, באותו פורמט כמו `SiteTextRule.page` */
  pages: string[];
  placement: BannerPlacement;
  tone: BannerTone;
  active: boolean;
  /** YYYY-MM-DD, כולל. ריק — בלי הגבלה */
  startsOn: string;
  endsOn: string;
  dismissible: boolean;
}

export interface SiteContent {
  texts: SiteTextRule[];
  banners: SiteBanner[];
}

export const ALL_PAGES = '*';

export const EMPTY_SITE_CONTENT: SiteContent = { texts: [], banners: [] };

const MAX_TEXT_LENGTH = 2000;
const MAX_RULES = 3000;
const MAX_BANNERS = 60;

export const BANNER_PLACEMENTS: Array<{ id: BannerPlacement; label: string }> = [
  { id: 'top', label: 'פס בראש העמוד' },
  { id: 'bottom', label: 'פס בתחתית העמוד' },
  { id: 'popup', label: 'חלונית צפה בפינה' },
];

export const BANNER_TONES: Array<{ id: BannerTone; label: string }> = [
  { id: 'blue', label: 'כחול' },
  { id: 'emerald', label: 'ירוק' },
  { id: 'amber', label: 'כתום' },
  { id: 'rose', label: 'אדום' },
  { id: 'slate', label: 'אפור' },
  { id: 'dark', label: 'כהה' },
];

export interface SitePageDef {
  path: string;
  title: string;
  group: string;
  /** הכתובת שנפתחת לעריכה על הדף, כשהיא שונה מהנתיב (מסכי לקוח נפתחים בהדגמה) */
  editPath?: string;
}

/**
 * כל העמודים והמסכים של הפלטפורמה, לבחירה בעורך. מסכי אזור הלקוח נפתחים לעריכה
 * במסכי ההדגמה, שמציגים את אותו ממשק על נתונים בדויים — היועץ אינו נכנס לאזור
 * הלקוח האמיתי.
 */
export const SITE_PAGES: SitePageDef[] = [
  { path: ALL_PAGES, title: 'כל האתר (כל העמודים)', group: 'כללי' },

  { path: '/', title: 'דף הבית', group: 'האתר הציבורי' },
  { path: '/pricing', title: 'מחירים ומסלולים', group: 'האתר הציבורי' },
  { path: '/how-it-works', title: 'איך זה עובד', group: 'האתר הציבורי' },
  { path: '/consult', title: 'ייעוץ', group: 'האתר הציבורי' },
  { path: '/learn', title: 'מרכז הידע', group: 'האתר הציבורי' },
  { path: '/demo', title: 'הדגמות', group: 'האתר הציבורי' },
  { path: '/accessibility', title: 'הצהרת נגישות', group: 'האתר הציבורי' },
  { path: '/privacy', title: 'מדיניות פרטיות', group: 'האתר הציבורי' },
  { path: '/terms', title: 'תנאי שימוש', group: 'האתר הציבורי' },

  { path: '/mortgage-advisor', title: 'מחשבון היתכנות', group: 'כלים' },
  { path: '/mortgage-refinance', title: 'בדיקת מיחזור', group: 'כלים' },
  { path: '/equity-planning', title: 'תכנון הון עצמי', group: 'כלים' },
  { path: '/consumer-loans', title: 'הלוואות צרכניות', group: 'כלים' },
  { path: '/custom-mix-builder', title: 'בונה התמהילים', group: 'כלים' },
  { path: '/mortgage-planning', title: 'תכנון משכנתא', group: 'כלים' },
  { path: '/principal-approval', title: 'אישור עקרוני', group: 'כלים' },
  { path: '/saved-mixes', title: 'תמהילים שמורים', group: 'כלים' },
  { path: '/uniform-mixes', title: 'תמהילים אחידים', group: 'כלים' },
  { path: '/financial-dynamics', title: 'דינמיקה פיננסית', group: 'כלים' },
  { path: '/mortgage-application', title: 'בקשת משכנתא', group: 'כלים' },

  { path: '/afford', title: 'נחיתה: מחשבון היתכנות', group: 'דפי נחיתה' },
  { path: '/refinance-check', title: 'נחיתה: בדיקת מיחזור', group: 'דפי נחיתה' },
  { path: '/equity', title: 'נחיתה: תכנון הון עצמי', group: 'דפי נחיתה' },
  { path: '/loans', title: 'נחיתה: הלוואות צרכניות', group: 'דפי נחיתה' },
  { path: '/digital-office', title: 'נחיתה: משרד משכנתאות דיגיטלי', group: 'דפי נחיתה' },

  { path: '/auth/login', title: 'התחברות', group: 'התחברות והרשמה' },
  { path: '/auth/register', title: 'הרשמה', group: 'התחברות והרשמה' },
  { path: '/auth/forgot-password', title: 'שכחתי סיסמה', group: 'התחברות והרשמה' },
  { path: '/auth/reset-password', title: 'בחירת סיסמה חדשה', group: 'התחברות והרשמה' },
  { path: '/auth/check-email', title: 'בדיקת המייל', group: 'התחברות והרשמה' },
  { path: '/auth/verify', title: 'אישור ההרשמה', group: 'התחברות והרשמה' },

  { path: '/dashboard', title: 'האזור האישי', group: 'אזור הלקוח', editPath: '/demo/dashboard' },
  { path: '/dashboard/plans/*', title: 'שולחן העבודה של התהליך', group: 'אזור הלקוח', editPath: '/demo/plan' },
  {
    path: '/dashboard/plans/*/authorization-letters',
    title: 'כתבי הסמכה',
    group: 'אזור הלקוח',
    editPath: '/demo/authorization-letters',
  },
  { path: '/dashboard/plans/*/payment-schedule', title: 'לוח הסילוקין', group: 'אזור הלקוח' },
  { path: '/dashboard/mix-planner', title: 'מתכנן התמהיל', group: 'אזור הלקוח' },
  { path: '/dashboard/checkout', title: 'רכישת מסלול', group: 'אזור הלקוח' },
  { path: '/dashboard/tour', title: 'סיור בפלטפורמה', group: 'אזור הלקוח' },
  { path: '/meeting/*', title: 'שיחת וידאו עם היועץ', group: 'אזור הלקוח', editPath: '/demo/meeting' },

  { path: '/pay/*', title: 'עמוד תשלום בקישור', group: 'תשלומים' },
  { path: '/billing/renew', title: 'חידוש מנוי', group: 'תשלומים' },
  { path: '/billing/result', title: 'תוצאת התשלום', group: 'תשלומים' },

  { path: '/advisor-dashboard', title: 'לוח הבקרה של היועץ', group: 'אזור היועץ' },
  { path: '/advisor-dashboard/client/*', title: 'תיק לקוח', group: 'אזור היועץ' },
];

export function sitePageTitle(path: string): string {
  return SITE_PAGES.find((page) => page.path === path)?.title ?? path;
}

/**
 * מסכי ההדגמה מציגים את מסכי הלקוח האמיתיים, ולכן מקבלים את ההחלפות והבאנרים
 * שלהם: עריכה במסך ההדגמה נשמרת לעמוד האמיתי.
 */
const DEMO_PATHS: Array<[string, string]> = [
  ['/demo/dashboard', '/dashboard'],
  ['/demo/plan', '/dashboard/plans/demo'],
  ['/demo/authorization-letters', '/dashboard/plans/demo/authorization-letters'],
  ['/demo/meeting', '/meeting/demo'],
];

export function canonicalPath(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return DEMO_PATHS.find(([demo]) => demo === path)?.[1] ?? path;
}

/** העמוד שאליו נשמרת עריכה שנעשתה בכתובת הזו — הנתיב המוגדר בקטלוג כשיש כזה */
export function pageKeyForPath(pathname: string): string {
  const path = canonicalPath(pathname);
  // הנתיב המפורט ביותר שמתאים: כתבי ההסמכה ולא "שולחן העבודה של התהליך"
  const known = SITE_PAGES.filter((page) => page.path !== ALL_PAGES && pageMatches(page.path, path)).sort(
    (a, b) => b.path.split('/').length - a.path.split('/').length || Number(a.path.endsWith('*')) - Number(b.path.endsWith('*'))
  )[0];
  return known?.path ?? path;
}

/**
 * `*` לבד — כל האתר. כוכבית בתוך נתיב מחליפה מקטע אחד (למשל לוח הסילוקין של כל תהליך);
 * כוכבית בסוף הנתיב כוללת גם את כל מה שמתחתיו.
 */
export function pageMatches(pattern: string, pathname: string): boolean {
  if (pattern === ALL_PAGES) return true;
  const path = canonicalPath(pathname);
  if (!pattern.includes('*')) return pattern === path;
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  const trailing = patternParts[patternParts.length - 1] === '*';
  if (trailing ? pathParts.length < patternParts.length : pathParts.length !== patternParts.length) return false;
  return patternParts.every((part, index) => part === '*' || part === pathParts[index]);
}

/** טקסט להשוואה: רווחים מרובים ושבירות שורה נחשבים לרווח אחד */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * ההחלפות שחלות בעמוד, כמילון "מקורי ← חדש". החלפה של עמוד מסוים גוברת על
 * החלפה של קבוצת עמודים, וזו גוברת על החלפה לכל האתר.
 */
export function textRulesForPath(content: SiteContent, pathname: string): Map<string, string> {
  const specificity = (page: string) => (page === ALL_PAGES ? 0 : page.includes('*') ? 1 : 2);
  const matching = content.texts
    .filter((rule) => pageMatches(rule.page, pathname))
    .sort((a, b) => specificity(a.page) - specificity(b.page));
  const map = new Map<string, string>();
  for (const rule of matching) map.set(normalizeText(rule.from), rule.to);
  return map;
}

/** YYYY-MM-DD בשעון ישראל */
export function israelDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(date);
}

export function bannerLive(banner: SiteBanner, today: string): boolean {
  if (!banner.active) return false;
  if (banner.startsOn && today < banner.startsOn) return false;
  if (banner.endsOn && today > banner.endsOn) return false;
  return Boolean(banner.title || banner.text || banner.imageUrl);
}

export function bannersForPath(
  content: SiteContent,
  pathname: string,
  placement: BannerPlacement,
  today: string = israelDate()
): SiteBanner[] {
  return content.banners.filter(
    (banner) =>
      banner.placement === placement &&
      bannerLive(banner, today) &&
      banner.pages.some((page) => pageMatches(page, pathname))
  );
}

// ─────────────────────── ניקוי מה שנשמר ───────────────────────

function str(value: unknown, max = MAX_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function cleanPage(value: unknown): string | null {
  const page = str(value, 300).trim();
  if (page === ALL_PAGES) return page;
  if (!page.startsWith('/') || /\s/.test(page)) return null;
  return page.length > 1 ? page.replace(/\/+$/, '') : page;
}

/** קישור בבאנר: נתיב באתר או כתובת https/http בלבד */
export function safeLink(value: unknown): string {
  const link = str(value, 1000).trim();
  if (!link) return '';
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  return /^https?:\/\//i.test(link) ? link : '';
}

function cleanDate(value: unknown): string {
  const date = str(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function cleanId(value: unknown, fallback: string): string {
  const id = str(value, 60);
  return /^[\w-]+$/.test(id) ? id : fallback;
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function oneOf<T extends string>(value: unknown, options: Array<{ id: T }>, fallback: T): T {
  return options.some((option) => option.id === value) ? (value as T) : fallback;
}

export function normalizeSiteContent(raw: unknown): SiteContent {
  const source = (raw && typeof raw === 'object' ? raw : {}) as { texts?: unknown; banners?: unknown };

  const texts: SiteTextRule[] = [];
  const seen = new Set<string>();
  for (const [index, item] of (Array.isArray(source.texts) ? source.texts : []).entries()) {
    if (!item || typeof item !== 'object' || texts.length >= MAX_RULES) continue;
    const rule = item as Record<string, unknown>;
    const page = cleanPage(rule.page);
    const from = normalizeText(str(rule.from));
    const to = str(rule.to).trim();
    // נוסח חדש ריק — הטקסט המקורי נשאר
    if (!page || !from || !to || from === normalizeText(to)) continue;
    // אותו טקסט באותו עמוד — האחרון נשמר
    const key = `${page}\u0000${from}`;
    if (seen.has(key)) {
      const existing = texts.findIndex((other) => `${other.page}\u0000${other.from}` === key);
      texts.splice(existing, 1);
    }
    seen.add(key);
    texts.push({ id: cleanId(rule.id, `t${index}`), page, from, to });
  }

  const banners: SiteBanner[] = [];
  for (const [index, item] of (Array.isArray(source.banners) ? source.banners : []).entries()) {
    if (!item || typeof item !== 'object' || banners.length >= MAX_BANNERS) continue;
    const banner = item as Record<string, unknown>;
    const pages = (Array.isArray(banner.pages) ? banner.pages : [])
      .map(cleanPage)
      .filter((page): page is string => Boolean(page));
    banners.push({
      id: cleanId(banner.id, `b${index}`),
      name: str(banner.name, 200).trim(),
      title: str(banner.title, 300).trim(),
      text: str(banner.text).trim(),
      imageUrl: safeLink(banner.imageUrl),
      linkUrl: safeLink(banner.linkUrl),
      linkLabel: str(banner.linkLabel, 100).trim(),
      pages: Array.from(new Set(pages)),
      placement: oneOf(banner.placement, BANNER_PLACEMENTS, 'top'),
      tone: oneOf(banner.tone, BANNER_TONES, 'blue'),
      active: banner.active !== false,
      startsOn: cleanDate(banner.startsOn),
      endsOn: cleanDate(banner.endsOn),
      dismissible: banner.dismissible !== false,
    });
  }

  return { texts, banners };
}

export function emptyBanner(): SiteBanner {
  return {
    id: newId(),
    name: '',
    title: '',
    text: '',
    imageUrl: '',
    linkUrl: '',
    linkLabel: '',
    pages: [ALL_PAGES],
    placement: 'top',
    tone: 'blue',
    active: true,
    startsOn: '',
    endsOn: '',
    dismissible: true,
  };
}

/** עריכה ישירה על הדף: קובעת (או מוחקת, כשהטקסט החדש ריק) החלפה אחת */
export function setTextRule(content: SiteContent, page: string, from: string, to: string): SiteContent {
  const original = normalizeText(from);
  const texts = content.texts.filter((rule) => !(rule.page === page && rule.from === original));
  if (to.trim() && normalizeText(to) !== original) texts.push({ id: newId(), page, from: original, to: to.trim() });
  return { ...content, texts };
}
