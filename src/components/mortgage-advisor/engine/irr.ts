import type { ScheduleRow } from './types';

/**
 * שיעור התשואה הפנימי (IRR) של הלוואה — "הריבית המתואמת".
 *
 * הריבית הממוצעת המשוקללת אומרת מה כתוב בחוזה; ה-IRR אומר כמה הכסף עולה
 * בפועל: הריבית החודשית שבה הערך הנוכחי של כל התשלומים (שוטפים, פרעונות
 * מוקדמים, בלון והצמדה) שווה בדיוק לקרן שהתקבלה, מתורגמת לריבית שנתית
 * אפקטיבית. הצמדה למדד, ריבית דחויה ותשלומי בלון נכנסים כולם לחישוב, ולכן
 * ה-IRR גבוה מהריבית הנקובה גם בהלוואה "פשוטה" — ריבית דריבית חודשית.
 */

/** ערך נוכחי נקי של הקרן מול התשלומים, והנגזרת שלו לפי הריבית — במעבר אחד */
function npvWithSlope(principal: number, payments: number[], monthlyRate: number): [number, number] {
  const factor = 1 / (1 + monthlyRate);
  let discount = 1;
  let value = principal;
  let slope = 0;
  for (let i = 0; i < payments.length; i += 1) {
    discount *= factor;
    value -= payments[i] * discount;
    slope += (i + 1) * payments[i] * discount * factor;
  }
  return [value, slope];
}

/**
 * IRR שנתי באחוזים לזרם תשלומים חודשי. מחזיר 0 לזרם ריק, וכשאין פתרון
 * (סך התשלומים קטן מהקרן, כמו בהלוואה במענק) מחזיר את הערך השלילי המתאים.
 *
 * הפתרון בשיטת ניוטון: ה-NPV יורד ומונוטוני בריבית, ולכן מריבית התחלתית
 * סבירה הוא מתכנס בכמה צעדים — חשוב, כי החישוב רץ על כל מסלול ועל התמהיל
 * בכל תזוזת סליידר. אם ניוטון בורח, החצייה מסיימת את העבודה.
 */
export function monthlyCashFlowIrr(principal: number, payments: number[]): number {
  if (principal <= 0 || payments.length === 0) return 0;
  const totalPaid = payments.reduce((sum, value) => sum + value, 0);
  if (totalPaid <= 0) return 0;

  let rate = 0.004;
  for (let i = 0; i < 40; i += 1) {
    const [value, slope] = npvWithSlope(principal, payments, rate);
    if (slope <= 0) break;
    const next = rate - value / slope;
    if (!Number.isFinite(next) || next <= -0.99) break;
    if (Math.abs(next - rate) < 1e-11) return annualize(next);
    rate = next;
  }

  // גיבוי: חצייה על טווח רחב, למקרה שניוטון לא התכנס
  let low = -0.5;
  let high = 1;
  let fLow = npvWithSlope(principal, payments, low)[0];
  const fHigh = npvWithSlope(principal, payments, high)[0];
  if (fLow * fHigh > 0) return 0;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    const fMid = npvWithSlope(principal, payments, mid)[0];
    if (fMid * fLow > 0) {
      low = mid;
      fLow = fMid;
    } else {
      high = mid;
    }
    if (high - low < 1e-11) break;
  }
  return annualize((low + high) / 2);
}

function annualize(monthlyRate: number): number {
  return ((1 + monthlyRate) ** 12 - 1) * 100;
}

/** IRR של מסלול בודד מתוך לוח הסילוקין שלו — כל תשלום כפי ששולם בפועל */
export function scheduleIrr(principal: number, schedule: Array<Pick<ScheduleRow, 'payment'>>): number {
  return monthlyCashFlowIrr(
    principal,
    schedule.map((row) => row.payment)
  );
}
