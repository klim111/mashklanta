/**
 * גישה בתשלום שהיועץ מגדיר ללקוח.
 *
 * לקוח שמשלם דרך האתר מקבל חודש מכל תשלום. כשהיועץ גובה בעצמו — בקישור
 * תשלום של HYP מטאב "תשלום והרשאה" בדף הלקוח, או מחוץ לאתר — הוא מסמן את
 * הלקוח כמשלם לתקופה שהוא בוחר (`User.paidAccessUntil`). עד אז הלקוח נחשב
 * משלם בכל מקום שבודק זאת: התהליכים שלו פתוחים (`processAccess`), הוא יכול
 * לפתוח תהליך חדש (`/api/platform/access` → `active`), והוא מופיע אצל היועץ
 * ברשימת המשלמים. היועץ מעדכן את התקופה או מבטל אותה בכל עת.
 *
 * הקובץ טהור בכוונה: נבדק בבדיקות יחידה ונטען גם בשרת וגם בדפדפן.
 */

export interface GrantedAccess {
  /** מאיזה יום הגישה — לתצוגה ולרשימת התשלומים */
  from: string;
  until: string;
  /** מתי היועץ הגדיר או עדכן לאחרונה */
  setAt: string | null;
  note: string | null;
  active: boolean;
  daysLeft: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** תקופה ארוכה מזה היא כנראה טעות הקלדה בשנה */
export const MAX_GRANT_YEARS = 5;

export const GRANT_PRESETS: ReadonlyArray<{ months: number; label: string }> = [
  { months: 1, label: 'חודש' },
  { months: 3, label: '3 חודשים' },
  { months: 6, label: 'חצי שנה' },
  { months: 12, label: 'שנה' },
];

/** אותו יום בחודש, כמה חודשים קדימה. 31 בינואר + חודש = סוף פברואר */
export function addMonths(at: Date | string, months: number): Date {
  const start = new Date(at);
  const result = new Date(start);
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  return result;
}

/** סוף היום של תאריך שנבחר בלוח (YYYY-MM-DD) לפי שעון ישראל — הגישה פתוחה כל אותו יום */
export function endOfIsraelDay(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [year, month, date] = day.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, date, 12));
  if (Number.isNaN(probe.getTime()) || probe.getUTCDate() !== date) return null;
  // ישראל ב-UTC+2 בחורף וב-UTC+3 בקיץ; 21:59:59 UTC הוא תמיד בתוך אותו יום בישראל
  const offsetHours = israelOffsetHours(probe);
  return new Date(Date.UTC(year, month - 1, date, 23 - offsetHours, 59, 59, 999));
}

function israelOffsetHours(at: Date): number {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', hour: 'numeric', hourCycle: 'h23' }).format(at)
  );
  return (hour - at.getUTCHours() + 24) % 24;
}

/** התאריך (YYYY-MM-DD) של מועד לפי שעון ישראל — לשדה התאריך בטופס */
export function israelDateInput(at: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(at));
}

export function grantActive(until: Date | string | null | undefined, now = new Date()): boolean {
  return Boolean(until) && new Date(until as Date | string).getTime() > now.getTime();
}

export function grantedAccessOf(
  row: {
    paidAccessFrom: Date | string | null;
    paidAccessUntil: Date | string | null;
    paidAccessSetAt?: Date | string | null;
    paidAccessNote?: string | null;
  },
  now = new Date()
): GrantedAccess | null {
  if (!row.paidAccessUntil) return null;
  const until = new Date(row.paidAccessUntil);
  const from = new Date(row.paidAccessFrom ?? row.paidAccessSetAt ?? until);
  const left = until.getTime() - now.getTime();
  return {
    from: from.toISOString(),
    until: until.toISOString(),
    setAt: row.paidAccessSetAt ? new Date(row.paidAccessSetAt).toISOString() : null,
    note: row.paidAccessNote ?? null,
    active: left > 0,
    daysLeft: left > 0 ? Math.ceil(left / DAY_MS) : 0,
  };
}

export interface GrantInput {
  from: Date;
  until: Date;
  note: string | null;
}

/**
 * קריאת הטופס של היועץ: `until` — תאריך הסיום (YYYY-MM-DD, כולל אותו יום),
 * או `months` — מספר חודשים מ-`from`. `from` ברירת מחדל היום.
 */
export function readGrantInput(raw: unknown, now = new Date()): { input: GrantInput } | { error: string } {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  let from = now;
  if (typeof body.from === 'string' && body.from) {
    const day = endOfIsraelDay(body.from);
    if (!day) return { error: 'תאריך ההתחלה אינו תקין' };
    // תחילת אותו יום
    from = new Date(day.getTime() + 1 - DAY_MS);
  }

  let until: Date | null = null;
  if (typeof body.until === 'string' && body.until) {
    until = endOfIsraelDay(body.until);
    if (!until) return { error: 'תאריך הסיום אינו תקין' };
  } else if (typeof body.months === 'number' && Number.isInteger(body.months) && body.months > 0) {
    until = addMonths(from, body.months);
  }
  if (!until) return { error: 'נדרש עד מתי הגישה' };
  if (until.getTime() <= now.getTime()) return { error: 'תאריך הסיום כבר עבר' };
  if (until.getTime() <= from.getTime()) return { error: 'תאריך הסיום לפני תאריך ההתחלה' };
  if (until.getTime() > addMonths(now, MAX_GRANT_YEARS * 12).getTime()) {
    return { error: `אפשר להגדיר גישה לעד ${MAX_GRANT_YEARS} שנים` };
  }

  const note = typeof body.note === 'string' ? body.note.replace(/\s+/g, ' ').trim().slice(0, 200) || null : null;
  return { input: { from, until, note } };
}
