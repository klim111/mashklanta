/**
 * מה שלקוח שקנה ליווי רואה בשלב שהיועץ מבצע עבורו.
 *
 * הלקוח לא עובד בשלב הזה, ולכן מה שחשוב לו אינו הכלים אלא התוצאה: מה היועץ
 * הביא, ומה זה שווה לעומת ברירת המחדל — הסל הזול שהבנק הציע לו באישור
 * העקרוני בשלב התמהיל, והתמהיל כפי שתוכנן בשלב התמחור. הפירוט המלא נשאר
 * זמין מאחורי כפתור.
 */

import { bestBasket, uniformBasket } from './mortgage-plan';
import type { PlanData, PlanStageId } from './mortgage-plan';

export interface AdvisedBaseline {
  /** מה הלקוח משווה מולו, בשמו */
  label: string;
  monthlyPayment: number | null;
  averageRate: number | null;
  totalPaid: number | null;
}

export interface AdvisedResult {
  label: string;
  monthlyPayment: number | null;
  averageRate: number | null;
  totalPaid: number | null;
  /** הבנק שתמחר, כשמדובר בהצעה מתומחרת */
  bank?: string | null;
}

export interface AdvantageRow {
  label: string;
  /** הערך בתוצר של היועץ */
  value: number;
  /** הערך בברירת המחדל */
  baseline: number;
  /** ההפרש. שלילי = היועץ הביא תוצאה זולה יותר */
  delta: number;
  better: boolean;
  unit: 'shekel' | 'percent';
}

/**
 * ברירת המחדל שמולה נמדד מה שהיועץ הביא.
 *
 * בשלב בניית התמהיל זה הסל האחיד הזול שהבנק תמחר באישור העקרוני — ההצעה
 * שהלקוח היה מקבל אם לא היה עושה דבר. בשלב התמחור זה התמהיל כפי שתוכנן,
 * לפני שבנק כלשהו נקב ריביות.
 */
export function advisedBaseline(stage: PlanStageId, data: PlanData): AdvisedBaseline | null {
  if (stage === 'MIX') {
    const basket = bestBasket(data.APPLICATIONS);
    if (!basket) return null;
    const name = uniformBasket(basket.basketId)?.shortName ?? 'הסל האחיד';
    return {
      label: `${name} — ההצעה שקיבלתם באישור העקרוני`,
      monthlyPayment: basket.monthlyPayment,
      averageRate: basket.averageRate,
      totalPaid: basket.totalPaid,
    };
  }

  if (stage === 'AUCTION') {
    const mix = data.MIX;
    if (!mix.mixKey) return null;
    return {
      label: `${mix.mixName ?? 'התמהיל הסופי'} — כפי שתוכנן, לפני תמחור`,
      monthlyPayment: mix.monthlyPayment,
      averageRate: mix.averageRate,
      totalPaid: mix.totalPaid,
    };
  }

  return null;
}

/** התוצר שהיועץ הביא בשלב */
export function advisedResult(stage: PlanStageId, data: PlanData): AdvisedResult | null {
  if (stage === 'MIX') {
    const mix = data.MIX;
    if (!mix.mixKey) return null;
    return {
      label: mix.mixName ?? 'התמהיל שנבנה',
      monthlyPayment: mix.monthlyPayment,
      averageRate: mix.averageRate,
      totalPaid: mix.totalPaid,
    };
  }

  if (stage === 'AUCTION') {
    const signed = data.AUCTION.signedMix;
    if (!signed) return null;
    return {
      label: signed.name,
      bank: signed.bank,
      monthlyPayment: signed.monthlyPayment,
      averageRate: signed.averageRate,
      totalPaid: signed.totalPaid,
    };
  }

  return null;
}

function row(
  label: string,
  value: number | null,
  baseline: number | null,
  unit: AdvantageRow['unit'],
  /** ההפרש הקטן ביותר שעדיין אומר משהו — מתחתיו אין מה להציג */
  epsilon: number
): AdvantageRow | null {
  if (value === null || baseline === null) return null;
  if (!Number.isFinite(value) || !Number.isFinite(baseline)) return null;

  const delta = value - baseline;
  if (Math.abs(delta) < epsilon) return null;

  return { label, value, baseline, delta, better: delta < 0, unit };
}

/**
 * היתרונות של מה שהיועץ הביא מול ברירת המחדל.
 *
 * הפרש זניח אינו מוצג: שקל בחודש אינו יתרון, והצגתו רק מרעישה. שורה שבה
 * היועץ הביא תוצאה גרועה יותר כן מוצגת — הלקוח משלם כדי לראות את התמונה
 * המלאה, לא רק את מה שנוח.
 */
export function advantageRows(
  result: AdvisedResult | null,
  baseline: AdvisedBaseline | null
): AdvantageRow[] {
  if (!result || !baseline) return [];

  return [
    row('החזר חודשי', result.monthlyPayment, baseline.monthlyPayment, 'shekel', 10),
    row('סך התשלומים', result.totalPaid, baseline.totalPaid, 'shekel', 1_000),
    row('ריבית ממוצעת', result.averageRate, baseline.averageRate, 'percent', 0.01),
  ].filter((item): item is AdvantageRow => item !== null);
}

/** משפט אחד שמסכם את השורה התחתונה של הליווי בשלב */
export function advantageHeadline(rows: AdvantageRow[]): string | null {
  const paid = rows.find((item) => item.label === 'סך התשלומים');
  if (paid) {
    return paid.better
      ? `הליווי חסך ${Math.round(Math.abs(paid.delta)).toLocaleString('he-IL')} ₪ בסך התשלומים`
      : `סך התשלומים גבוה ב-${Math.round(paid.delta).toLocaleString('he-IL')} ₪ — בתמורה לתנאים אחרים`;
  }

  const monthly = rows.find((item) => item.label === 'החזר חודשי');
  if (monthly) {
    return monthly.better
      ? `ההחזר החודשי נמוך ב-${Math.round(Math.abs(monthly.delta)).toLocaleString('he-IL')} ₪`
      : `ההחזר החודשי גבוה ב-${Math.round(monthly.delta).toLocaleString('he-IL')} ₪`;
  }

  return null;
}
