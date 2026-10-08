/**
 * שם קריא לעמוד בפלטפורמה, לפי הנתיב שלו — כדי שהיועץ יראה "כלי המיחזור"
 * ולא "/mortgage-refinance". נתיב לא מוכר מוצג כמו שהוא.
 */
const PAGES: Array<[prefix: string, label: string]> = [
  ['/dashboard/plans', 'תהליך משכנתא באזור האישי'],
  ['/dashboard/checkout', 'תשלום על הפלטפורמה'],
  ['/dashboard', 'האזור האישי'],
  ['/mortgage-refinance', 'כלי המיחזור'],
  ['/consumer-loans', 'כלי ההלוואות הצרכניות'],
  ['/equity-planning', 'תכנון הון עצמי והוצאות'],
  ['/custom-mix-builder', 'בניית תמהיל'],
  ['/mortgage-advisor', 'בניית תמהיל'],
  ['/uniform-mixes', 'תמהילים אחידים'],
  ['/simulations', 'סימולציות'],
  ['/pricing', 'מחירים'],
  ['/how-it-works', 'איך זה עובד'],
  ['/learn', 'מידע ולמידה'],
  ['/principal-approval', 'אישור עקרוני'],
  ['/consult', 'היוועצו איתנו בתפריט העליון'],
];

export function pageLabel(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.split(/[?#]/)[0] || '/';
  if (clean === '/') return 'דף הבית';
  const match = PAGES.find(([prefix]) => clean === prefix || clean.startsWith(`${prefix}/`));
  return match ? match[1] : clean;
}

/** נתיב שנשלח מהדפדפן — רק נתיב פנימי וקצר */
export function cleanSourcePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim().slice(0, 200);
  return /^\/(?!\/)[\w\-./%]*$/.test(path) ? path : null;
}
