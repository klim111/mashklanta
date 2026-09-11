import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAYMENT_DAY,
  clampPaymentDay,
  endDateFromMonths,
  findAboveMarketTracks,
  goalForTermChange,
  monthlyPaymentForMonths,
  rateBoundsForRefinance,
  rateWorsensTerms,
  remainingPayments,
  termBoundsForGoal,
  totalInterestForMonths,
  trackRemainingMonths,
  trackWithRemainingTerm,
} from '@/lib/refinance';
import { mapBoiRatesToTrackTypes } from '@/lib/boi-average-rates';
import { goalProgress, guidanceFor, trackGuidance } from '@/lib/refinance-guidance';
import type { TrackDraft } from '@/lib/refinance-guidance';
import { calculateTrack, monthsInTerm } from '@/components/mortgage-advisor/mortgageCalculations';
import type { MortgageTrack } from '@/components/mortgage-advisor/types';

const track = (overrides: Partial<MortgageTrack> = {}): MortgageTrack => ({
  id: 'track-1',
  name: 'קל"צ',
  type: 'fixed_unlinked',
  amount: 400_000,
  percentage: 100,
  interestRate: 5.5,
  years: 20,
  amortizationType: 'spitzer',
  ...overrides,
});

describe('remainingPayments', () => {
  it('סופר את התשלום הקרוב ואת האחרון', () => {
    // היום ה-5 בחודש, יום החיוב ה-10 — התשלום של החודש הזה עוד לא ירד
    const result = remainingPayments({
      endDate: '2027-03-31',
      paymentDay: 10,
      from: new Date(2026, 8, 5),
    });
    // ספטמבר 2026 עד מרץ 2027 כולל = 7 תשלומים
    expect(result.months).toBe(7);
    expect(result.nextPaymentDate?.getMonth()).toBe(8);
    expect(result.lastPaymentDate?.getMonth()).toBe(2);
  });

  it('מדלג על החודש הנוכחי כשיום החיוב כבר עבר', () => {
    const result = remainingPayments({
      endDate: '2027-03-15',
      paymentDay: 10,
      from: new Date(2026, 8, 20),
    });
    // התשלום הקרוב הוא אוקטובר 2026 — שישה תשלומים עד מרץ 2027
    expect(result.months).toBe(6);
    expect(result.nextPaymentDate?.getMonth()).toBe(9);
  });

  it('מחזיר אפס כשאין תאריך סיום', () => {
    expect(remainingPayments({ endDate: undefined }).months).toBe(0);
  });

  it('לא מחזיר מספר שלילי כשהתאריך כבר עבר', () => {
    const result = remainingPayments({
      endDate: '2020-01-01',
      from: new Date(2026, 8, 10),
    });
    expect(result.months).toBe(0);
  });

  it('יום חיוב מוגבל לטווח שקיים בכל חודש', () => {
    expect(clampPaymentDay(31)).toBe(28);
    expect(clampPaymentDay(0)).toBe(1);
    expect(clampPaymentDay(undefined)).toBe(DEFAULT_PAYMENT_DAY);
  });

  it('endDateFromMonths ו-remainingPayments הפוכים זה לזה', () => {
    const from = new Date(2026, 8, 5);
    const endDate = endDateFromMonths(37, 10, from);
    const back = remainingPayments({
      endDate: endDate.toISOString(),
      paymentDay: 10,
      from,
    });
    expect(back.months).toBe(37);
  });
});

describe('תקופת המסלול נגזרת מהזמן שנותר', () => {
  it('תאריך הסיום גובר על התקופה שהוזנה', () => {
    const from = new Date(2026, 8, 5);
    const withDates = track({ years: 20, endDate: '2031-09-30', paymentDay: 10 });
    // ספטמבר 2026 עד ספטמבר 2031 = 61 תשלומים
    expect(trackRemainingMonths(withDates, from)).toBe(61);
    expect(trackWithRemainingTerm(withDates, from).years).toBeCloseTo(61 / 12, 10);
  });

  it('בלי תאריך סיום נשארים עם התקופה שהוזנה', () => {
    expect(trackRemainingMonths(track({ years: 12 }))).toBe(144);
  });

  it('החזר וסך ריבית מחושבים על מספר התשלומים שנותר', () => {
    const from = new Date(2026, 8, 5);
    const remaining = trackWithRemainingTerm(
      track({ amount: 300_000, interestRate: 5, endDate: '2031-09-30', paymentDay: 10 }),
      from
    );
    const months = trackRemainingMonths(remaining, from);
    const calc = calculateTrack(remaining);

    // לוח הסילוקין נספר בדיוק כמספר התשלומים שנותרו — גם כשהתקופה אינה שנים שלמות
    expect(calc.amortSchedule.length).toBe(months);
    expect(calc.monthlyPayment).toBeCloseTo(monthlyPaymentForMonths(300_000, 5, months), 4);
    expect(calc.totalInterest).toBeCloseTo(totalInterestForMonths(300_000, 5, months), 2);
  });

  it('תקופה של חודשים שאינם כפולה של שנה אינה מאבדת חודש', () => {
    // 239 חודשים נשמרים כשנים; בלי עיגול הכפל חוזר 238.9999
    expect(monthsInTerm(239 / 12)).toBe(239);
    const calc = calculateTrack(track({ years: 239 / 12 }));
    expect(calc.amortSchedule.length).toBe(239);
  });
});

describe('מטרת המיחזור', () => {
  it('הקטנת סך ריבית מגבילה את התקופה לתקופה הנוכחית', () => {
    expect(termBoundsForGoal('reduce_interest', 120).max).toBe(120);
    expect(termBoundsForGoal('reduce_payment', 120).max).toBeGreaterThan(120);
  });

  it('הארכת תקופה מעבירה אוטומטית להקטנת ההחזר החודשי', () => {
    expect(goalForTermChange('reduce_interest', 130, 120)).toBe('reduce_payment');
    expect(goalForTermChange('reduce_interest', 100, 120)).toBe('reduce_interest');
    expect(goalForTermChange('reduce_payment', 130, 120)).toBe('reduce_payment');
  });

  it('ריבית גבוהה מהריבית הקיימת נחשבת החמרה בתנאים', () => {
    expect(rateWorsensTerms(5.6, 5.5)).toBe(true);
    expect(rateWorsensTerms(5.5, 5.5)).toBe(false);
    expect(rateWorsensTerms(4.9, 5.5)).toBe(false);
  });

  it('סרגל הריבית מאפשר גם להוריד וגם להעלות', () => {
    const bounds = rateBoundsForRefinance(5.5, 4.2);
    expect(bounds.min).toBeLessThan(4.2);
    expect(bounds.max).toBeGreaterThan(5.5);
  });
});

describe('השוואה לריבית הממוצעת בבנק ישראל', () => {
  const market = mapBoiRatesToTrackTypes({
    prime: 5,
    fixed_unlinked: 4.85,
    fixed_cpi: 3.05,
    asOf: '2026-08-31',
    source: 'boi',
  });

  it('ממפה את מפתחות בנק ישראל לסוגי המסלולים', () => {
    expect(market.rates.fixed_unlinked).toBe(4.85);
    expect(market.rates.fixed_linked).toBe(3.05);
    expect(market.rates.prime).toBe(5);
    expect(market.asOf).toBe('2026-08-31');
  });

  it('מסמן מסלול שהריבית בו גבוהה מהממוצע ומחשב את פוטנציאל החיסכון', () => {
    const from = new Date(2026, 8, 5);
    const above = track({ interestRate: 6.2, endDate: '2036-09-30', paymentDay: 10 });
    const findings = findAboveMarketTracks([above], market, from);

    expect(findings).toHaveLength(1);
    expect(findings[0].marketRate).toBe(4.85);
    expect(findings[0].gap).toBeCloseTo(1.35, 5);
    expect(findings[0].potentialSaving).toBeGreaterThan(0);
  });

  it('מסלול בריבית נמוכה מהממוצע אינו מסומן', () => {
    const from = new Date(2026, 8, 5);
    const good = track({ interestRate: 4.1, endDate: '2036-09-30', paymentDay: 10 });
    expect(findAboveMarketTracks([good], market, from)).toHaveLength(0);
  });
});

describe('הכוונה לפי מטרת המיחזור', () => {
  const base = track({ interestRate: 5.5, endDate: '2036-09-30', paymentDay: 10 });
  const baseMonths = trackRemainingMonths(base, new Date(2026, 8, 5));
  const draft = (overrides: Partial<TrackDraft> = {}): TrackDraft => ({
    interestRate: base.interestRate,
    months: baseMonths,
    type: base.type,
    amortizationType: 'spitzer',
    ...overrides,
  });

  it('הקטנת החזר חודשי: הורדת ריבית והארכת תקופה', () => {
    const guidance = trackGuidance({ goal: 'reduce_payment', track: base, draft: draft() });
    expect(guidanceFor(guidance, 'rate')?.direction).toBe('down');
    expect(guidanceFor(guidance, 'term')?.direction).toBe('up');
    expect(guidanceFor(guidance, 'rate')?.weight).toBe('primary');
  });

  it('הקטנת סך ריבית: הורדת ריבית וקיצור תקופה', () => {
    const guidance = trackGuidance({ goal: 'reduce_interest', track: base, draft: draft() });
    expect(guidanceFor(guidance, 'term')?.direction).toBe('down');
    expect(guidanceFor(guidance, 'amortization')?.label).toContain('קרן שווה');
  });

  it('מסמן שינוי שמשרת את המטרה ושינוי שפועל נגדה', () => {
    const helping = trackGuidance({
      goal: 'reduce_payment',
      track: base,
      draft: draft({ interestRate: 4.9, months: baseMonths + 24 }),
    });
    expect(guidanceFor(helping, 'rate')?.satisfied).toBe(true);
    expect(guidanceFor(helping, 'term')?.satisfied).toBe(true);

    const hurting = trackGuidance({
      goal: 'reduce_payment',
      track: base,
      draft: draft({ interestRate: 6.1, months: baseMonths - 12 }),
    });
    expect(guidanceFor(hurting, 'rate')?.conflicting).toBe(true);
    expect(guidanceFor(hurting, 'term')?.conflicting).toBe(true);
  });

  it('מודד התקדמות לעבר המטרה ואת המחיר בצד השני', () => {
    const progress = goalProgress({
      goal: 'reduce_payment',
      baseMonthly: 5000,
      refinedMonthly: 4600,
      baseInterest: 300_000,
      refinedInterest: 340_000,
    });
    expect(progress.metric).toBe('monthlyPayment');
    expect(progress.achieved).toBe(true);
    expect(progress.delta).toBe(-400);
    expect(progress.tradeoff).toBe(40_000);

    const interestGoal = goalProgress({
      goal: 'reduce_interest',
      baseMonthly: 5000,
      refinedMonthly: 5400,
      baseInterest: 300_000,
      refinedInterest: 260_000,
    });
    expect(interestGoal.metric).toBe('totalInterest');
    expect(interestGoal.achieved).toBe(true);
    expect(interestGoal.tradeoff).toBe(400);
  });
});
