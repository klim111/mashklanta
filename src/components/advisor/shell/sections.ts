/**
 * הניווט של אזור היועץ: שישה אזורים בתפריט, ועוד "חשבון" ו"ניהול הפלטפורמה".
 *
 * המיקום נשמר בכתובת — `?section=calendar&view=tasks` — כדי שקישור מבחוץ (מייל,
 * דף הלקוח, הפעולות המהירות) יפתח ישר את המקום הנכון. הקישורים הישנים של
 * הלשוניות (`?tab=requests`) ממשיכים לעבוד: כל לשונית ישנה מובילה לאזור שבו
 * היא נמצאת עכשיו.
 *
 * הקובץ טהור, ונבדק בבדיקות יחידה.
 */

export const ADVISOR_SECTIONS = ['home', 'clients', 'inbox', 'calendar', 'tools', 'office', 'account', 'admin'] as const;
export type AdvisorSection = (typeof ADVISOR_SECTIONS)[number];

/** המסכים שבתוך כל אזור. הראשון הוא ברירת המחדל */
export const SECTION_VIEWS: Record<AdvisorSection, readonly string[]> = {
  home: [],
  clients: [],
  inbox: [],
  calendar: ['calendar', 'tasks'],
  tools: ['tools', 'mixes', 'rate-requests'],
  office: ['profile', 'client-tools', 'payment-links', 'professional'],
  account: [],
  admin: ['visits', 'signups', 'pricing', 'site-content', 'landing-pages', 'maintenance'],
};

export interface AdvisorLocation {
  section: AdvisorSection;
  /** המסך בתוך האזור, או ריק באזור בלי מסכים */
  view: string;
}

/** הלשוניות של לוח הבקרה הקודם, ואיפה כל אחת נמצאת עכשיו */
export const LEGACY_TABS: Record<string, AdvisorLocation> = {
  clients: { section: 'clients', view: '' },
  requests: { section: 'inbox', view: '' },
  tasks: { section: 'calendar', view: 'tasks' },
  calendar: { section: 'calendar', view: 'calendar' },
  mixes: { section: 'tools', view: 'mixes' },
  'rate-requests': { section: 'tools', view: 'rate-requests' },
  'site-visits': { section: 'admin', view: 'visits' },
  'unfinished-signups': { section: 'admin', view: 'signups' },
  pricing: { section: 'admin', view: 'pricing' },
  'site-content': { section: 'admin', view: 'site-content' },
  'landing-pages': { section: 'admin', view: 'landing-pages' },
  'payment-links': { section: 'office', view: 'payment-links' },
  settings: { section: 'office', view: 'professional' },
};

export function isAdvisorSection(value: unknown): value is AdvisorSection {
  return typeof value === 'string' && (ADVISOR_SECTIONS as readonly string[]).includes(value);
}

/** מיקום תקין: מסך שקיים באזור, או מסך ברירת המחדל שלו */
export function normalizeLocation(section: AdvisorSection, view?: string | null): AdvisorLocation {
  const views = SECTION_VIEWS[section];
  if (views.length === 0) return { section, view: '' };
  return { section, view: view && views.includes(view) ? view : views[0] };
}

/** המיקום מתוך הכתובת: `section`/`view`, ואחריהם לשונית ישנה (`tab`) */
export function locationFromParams(params: URLSearchParams): AdvisorLocation {
  const section = params.get('section');
  if (isAdvisorSection(section)) return normalizeLocation(section, params.get('view'));
  const tab = params.get('tab');
  if (tab && LEGACY_TABS[tab]) return LEGACY_TABS[tab];
  return { section: 'home', view: '' };
}

/** אזור או לשונית ישנה בשם אחד — מהפעולות המהירות (ADVISOR_TAB_EVENT) */
export function locationFromName(name: string): AdvisorLocation | null {
  if (isAdvisorSection(name)) return normalizeLocation(name);
  return LEGACY_TABS[name] ?? null;
}

export function locationQuery(location: AdvisorLocation): string {
  if (location.section === 'home') return '';
  const params = new URLSearchParams({ section: location.section });
  if (location.view && location.view !== SECTION_VIEWS[location.section][0]) params.set('view', location.view);
  return `?${params.toString()}`;
}

/** האזור שמוצג בפועל: ניהול הפלטפורמה רק למי שמורשה, ואחרת — הבית */
export function allowedLocation(location: AdvisorLocation, platformAdmin: boolean): AdvisorLocation {
  if (location.section === 'admin' && !platformAdmin) return { section: 'home', view: '' };
  return location;
}
