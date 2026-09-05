/**
 * מסמך "בקשה להצעת ריביות" — התמהיל כפי שהוא נשלח לבנקים למיקוח.
 *
 * המסמך מתאר את התמהיל במלואו: לוח סילוקין, סוג ריבית, תקופה, סכום ואחוז מכלל
 * התמהיל — בלי הריביות. עמודת הריבית נשארת ריקה בכוונה: זה בדיוק מה שהבנק
 * אמור למלא, וכך כל הבנקים מתמחרים את אותו מבנה בדיוק וההשוואה ביניהם אמיתית.
 */

import { AMORTIZATION_TYPES, DEAL_TYPES, TRACK_TYPES, VARIABLE_PERIODS } from '../types';
import type { DealType, MortgageTrack } from '../types';
import { computeMix, formatDuration } from '../engine';
import type { MixSummary, WorkspaceMix } from '../engine';
import { isIndexLinked, isRateVariable } from '../scenarioCalculations';

/** הפרטים שהמשתמש ממלא לפני ההפקה — כולם רשות */
export interface RateRequestDetails {
  /** הבנק שאליו מופנית הבקשה. ריק — מכתב אחיד לכל הבנקים */
  bankName?: string;
  /** שם הפונה כפי שיופיע בפתיח ובחתימה */
  applicantName?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** מועד אחרון לקבלת ההצעה (ISO של תאריך) */
  replyBy?: string;
  /** בקשות מיוחדות שיתווספו לסעיפי הבקשה */
  notes?: string;
}

/** שורת מסלול במכתב — כל מה שהבנק צריך כדי לתמחר */
export interface RateRequestLine {
  index: number;
  trackId: string;
  /** סוג הריבית, למשל "ריבית קבועה לא צמודה" */
  typeLabel: string;
  /** לוח הסילוקין, למשל "שפיצר" */
  amortizationLabel: string;
  /** "צמוד מדד" / "לא צמוד" */
  linkageLabel: string;
  /** תחנת שינוי במסלול משתנה, למשל "כל 5 שנים" */
  stationLabel?: string;
  months: number;
  periodLabel: string;
  amount: number;
  /** אחוז המסלול מכלל התמהיל */
  share: number;
}

export interface RateRequestDocument {
  /** מזהה הבקשה בכלי — משמש גם כמפתח שמירה */
  id: string;
  /** מספר אסמכתה שמופיע במכתב */
  reference: string;
  createdAt: string;
  mixId: string;
  mixName: string;
  title: string;
  details: RateRequestDetails;
  totalAmount: number;
  propertyAddress?: string;
  propertyValue?: number;
  dealTypeLabel?: string;
  ltv?: number;
  months: number;
  periodLabel: string;
  lines: RateRequestLine[];
  /** סכום שעדיין לא שובץ למסלול, אם נשאר כזה */
  unallocated: number;
  /** פסקאות הפתיח */
  intro: string[];
  /** סעיפי הבקשה מהבנק */
  asks: string[];
  /** פסקת הסיום לפני החתימה */
  closing: string;
}

function newId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/** אסמכתה קריאה, למשל "BR-260905-4F2A" */
function referenceFor(date: Date): string {
  const stamp = [
    String(date.getFullYear()).slice(2),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  return `BR-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function formatRateRequestDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function linkageLabel(track: MortgageTrack): string {
  if (isIndexLinked(track.type)) return 'צמוד מדד';
  if (track.type === 'dollar') return 'צמוד דולר';
  if (track.type === 'euro') return 'צמוד יורו';
  return 'לא צמוד';
}

function stationLabel(track: MortgageTrack): string | undefined {
  if (!isRateVariable(track.type)) return undefined;
  if (track.type === 'prime') return 'מתעדכן עם ריבית הפריים';
  if (track.type === 'makam') return 'מתעדכן לפי המק"מ';
  const period = track.variablePeriod;
  if (!period) return 'תחנת שינוי לפי תנאי הבנק';
  const label = VARIABLE_PERIODS[period as keyof typeof VARIABLE_PERIODS];
  return label ? `תחנת שינוי כל ${label}` : 'תחנת שינוי לפי תנאי הבנק';
}

function lineFor(track: MortgageTrack, index: number, totalAmount: number): RateRequestLine {
  const months = Math.max(1, Math.round(track.years * 12));
  const share = totalAmount > 0 ? (track.amount / totalAmount) * 100 : 0;
  return {
    index: index + 1,
    trackId: track.id,
    typeLabel: TRACK_TYPES[track.type],
    amortizationLabel: AMORTIZATION_TYPES[track.amortizationType || 'spitzer'],
    linkageLabel: linkageLabel(track),
    stationLabel: stationLabel(track),
    months,
    periodLabel: formatDuration(months),
    amount: Math.round(track.amount),
    share,
  };
}

function introParagraphs(
  details: RateRequestDetails,
  mix: WorkspaceMix,
  lineCount: number
): string[] {
  const amount = new Intl.NumberFormat('he-IL').format(Math.round(mix.totalAmount));
  const where = mix.propertyAddress?.trim()
    ? ` לרכישת נכס ב${mix.propertyAddress.trim()}`
    : '';
  const who = details.applicantName?.trim() ? `${details.applicantName.trim()}, ` : '';

  return [
    `${who}מבקש/ת לקבל מכם הצעת ריביות עבור תמהיל משכנתא בסך ${amount} ש"ח${where}. ` +
      `התמהיל נבנה מראש בהתאם ליכולת ההחזר ולצורכי משק הבית, והוא מובא לפניכם כמות שהוא.`,
    `התמהיל מורכב מ-${lineCount} מסלולים, ולכל מסלול נקבעו מראש לוח סילוקין, סוג ריבית, תקופה וסכום. ` +
      `נבקשכם לתמחר את המסלולים במבנה זה בלבד — בלי לשנות סכומים, תקופות או לוחות סילוקין.`,
    'בטבלה שלהלן, עמודת "ריבית שנתית מוצעת" ועמודת "החזר חודשי" הושארו ריקות בכוונה, והן מיועדות למילוי על ידכם. ' +
      'הצעות של מספר בנקים על אותו מבנה תמהיל מאפשרות השוואה מלאה ביניהן, ולכן חשוב שהמבנה יישמר.',
  ];
}

function askItems(details: RateRequestDetails): string[] {
  const items = [
    'ריבית שנתית מוצעת לכל מסלול ומסלול, כפי שהוא מופיע בטבלה.',
    'ההחזר החודשי לכל מסלול וסך ההחזר החודשי בתמהיל כולו, לפי הריביות שהצעתם.',
    'פירוט העמלות והעלויות הנלוות: עמלת פתיחת תיק, דמי טיפול, שמאות, ביטוח חיים וביטוח מבנה.',
    'ציון בסיס הריבית במסלול הפריים (ריבית הפריים במועד ההצעה והמרווח ממנה), ותחנות היציאה במסלולים המשתנים.',
    'תוקף ההצעה — עד מתי הריביות המוצעות מובטחות.',
  ];
  if (details.replyBy?.trim()) {
    items.push(`קבלת ההצעה עד לתאריך ${formatRateRequestDate(details.replyBy)}.`);
  }
  const notes = details.notes?.trim();
  if (notes) items.push(notes);
  return items;
}

export interface BuildRateRequestOptions {
  details?: RateRequestDetails;
  /** סיכום קיים, כדי לא לחשב לוח סילוקין מחדש */
  summary?: MixSummary;
  /** מזהה ותאריך קיימים — לשחזור מסמך שנשמר */
  id?: string;
  reference?: string;
  createdAt?: string;
}

/** בניית המסמך מתוך תמהיל. זהו המקור היחיד לתצוגה, ל-PDF ולאקסל. */
export function buildRateRequestDocument(
  mix: WorkspaceMix,
  options: BuildRateRequestOptions = {}
): RateRequestDocument {
  const details = options.details ?? {};
  const summary = options.summary ?? computeMix(mix).summary;
  const createdAt = options.createdAt ?? new Date().toISOString();

  const lines = mix.tracks.map((track, index) => lineFor(track, index, mix.totalAmount));
  const allocated = lines.reduce((sum, line) => sum + line.amount, 0);
  const months = Math.max(summary.months, ...lines.map((line) => line.months), 0);
  const ltv =
    mix.propertyValue && mix.propertyValue > 0
      ? (mix.totalAmount / mix.propertyValue) * 100
      : undefined;

  return {
    id: options.id ?? newId('rate-request'),
    reference: options.reference ?? referenceFor(new Date(createdAt)),
    createdAt,
    mixId: mix.id,
    mixName: mix.name?.trim() || 'תמהיל ללא שם',
    title: 'בקשה לקבלת הצעת ריביות לתמהיל משכנתא',
    details,
    totalAmount: Math.round(mix.totalAmount),
    propertyAddress: mix.propertyAddress?.trim() || undefined,
    propertyValue: mix.propertyValue,
    dealTypeLabel: mix.dealType ? DEAL_TYPES[mix.dealType as DealType] : undefined,
    ltv,
    months,
    periodLabel: months > 0 ? formatDuration(months) : '',
    lines,
    unallocated: Math.max(0, Math.round(mix.totalAmount - allocated)),
    intro: introParagraphs(details, mix, lines.length),
    asks: askItems(details),
    closing:
      'נשמח לקבל את הצעתכם בכתב, ולעמוד לרשותכם בכל הבהרה שתידרש לצורך התמחור. ' +
      'תודה מראש על הטיפול ועל זמנכם.',
  };
}

/** שם קובץ בטוח להורדה */
export function rateRequestFileName(doc: RateRequestDocument, extension: string): string {
  const bank = doc.details.bankName?.trim();
  const parts = ['בקשת-ריביות', doc.mixName, bank].filter(Boolean) as string[];
  const base = parts
    .join('-')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-');
  return `${base}.${extension}`;
}
