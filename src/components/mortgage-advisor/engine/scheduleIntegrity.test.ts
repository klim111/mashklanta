/**
 * בדיקות שלמות ללוח הסילוקין.
 *
 * כאן לא נבדקת התנהגות של מסלול מסוים אלא הזהויות החשבונאיות שחייבות להתקיים
 * בכל לוח, בכל סוג מסלול ובכל לוח סילוקין — גם אחרי פרעון מוקדם, מחזור ושינוי
 * מסלול: סך התשלום שווה לקרן ועוד הריבית וההצמדה, החוב נסגר, והתקופה היא מה
 * שנקבע בחוזה.
 */

import { describe, expect, it } from 'vitest';
import type { MortgageTrack } from '../types';
import { annuityPayment } from './schedule';
import { computeMix } from './mix';
import { createTrack, createWorkspaceMix } from './factory';
import type { Assumptions, MixEvent, TrackResult, WorkspaceMix } from './types';
import { fallbackInflationForecast } from '@/lib/inflation-forecast';
import { fallbackPrimeForecast } from '@/lib/prime-forward-curve';

const AMOUNT = 600_000;
const YEARS = 20;

function mixOf(
  tracks: Partial<MortgageTrack>[],
  extra: { events?: MixEvent[]; assumptions?: Assumptions } = {}
): WorkspaceMix {
  return createWorkspaceMix({
    totalAmount: tracks.reduce((sum, track) => sum + (track.amount ?? AMOUNT), 0),
    tracks: tracks.map((track) =>
      createTrack({ amount: AMOUNT, years: YEARS, ...track })
    ),
    events: extra.events ?? [],
    assumptions: extra.assumptions ?? { rateDeltas: {}, annualInflation: 0 },
  });
}

/** סך התשלום חייב להיות הקרן (כולל הצמדה) ועוד כל הריבית שנצברה */
function expectBalanced(result: TrackResult) {
  const principal = result.track.amount + result.totalIndexation;
  expect(result.totalPaid).toBeCloseTo(principal + result.totalInterest, 2);

  const paidRows = result.schedule.reduce((sum, row) => sum + row.payment, 0);
  expect(paidRows).toBeCloseTo(result.totalPaid, 2);

  const interestRows = result.schedule.reduce((sum, row) => sum + row.interest, 0);
  expect(interestRows).toBeCloseTo(result.totalInterest, 2);

  const principalRows = result.schedule.reduce((sum, row) => sum + row.principal, 0);
  expect(principalRows).toBeCloseTo(principal, 2);

  // החוב נסגר במלואו בשורה האחרונה
  expect(result.schedule.at(-1)!.balanceEnd).toBeLessThan(0.01);
}

const TRACK_TYPES_UNDER_TEST: MortgageTrack['type'][] = [
  'fixed_unlinked',
  'fixed_linked',
  'prime',
  'variable_unlinked',
  'variable_linked',
  'makam',
  'eligibility',
];

const AMORTIZATIONS: NonNullable<MortgageTrack['amortizationType']>[] = [
  'spitzer',
  'equal_principal',
  'partial_grace',
  'full_grace',
];

describe('זהויות חשבונאיות בכל מסלול ובכל לוח סילוקין', () => {
  const assumptions: Assumptions = {
    rateDeltas: {},
    annualInflation: 2,
    primeForecast: fallbackPrimeForecast(3.5),
    inflationForecast: fallbackInflationForecast(),
  };

  TRACK_TYPES_UNDER_TEST.forEach((type) => {
    AMORTIZATIONS.forEach((amortizationType) => {
      it(`${type} · ${amortizationType} — סך התשלום שווה לקרן, להצמדה ולריבית`, () => {
        const result = computeMix(
          mixOf([{ type, amortizationType, variablePeriod: 5 }], { assumptions })
        );
        expectBalanced(result.tracks[0]);
        expect(result.tracks[0].schedule).toHaveLength(YEARS * 12);
      });
    });
  });

  it('סיכום התמהיל הוא סכום המסלולים, בלי כפילות ובלי אובדן', () => {
    const result = computeMix(
      mixOf(
        [
          { id: 'a', type: 'fixed_unlinked', interestRate: 4.85 },
          { id: 'b', type: 'prime', interestRate: 5 },
          { id: 'c', type: 'fixed_linked', interestRate: 3.05 },
        ],
        { assumptions }
      )
    );

    const tracksInterest = result.tracks.reduce((sum, track) => sum + track.totalInterest, 0);
    const tracksPaid = result.tracks.reduce((sum, track) => sum + track.totalPaid, 0);
    expect(result.summary.totalInterest).toBeCloseTo(tracksInterest, 2);
    expect(result.summary.totalPaid).toBeCloseTo(tracksPaid, 2);

    const scheduleInterest = result.schedule.reduce((sum, row) => sum + row.interest, 0);
    expect(scheduleInterest).toBeCloseTo(result.summary.totalInterest, 2);
  });
});

describe('הצמדה למדד חלה רק על מסלולים צמודים', () => {
  const inflated: Assumptions = {
    rateDeltas: {},
    annualInflation: 2,
    inflationForecast: fallbackInflationForecast(),
  };

  it('מסלול לא צמוד — פריים, מק"מ, קל"צ ומל"צ — לא צובר הצמדה אפילו באינפלציה גבוהה', () => {
    const unlinked: MortgageTrack['type'][] = [
      'prime',
      'makam',
      'fixed_unlinked',
      'variable_unlinked',
      'eligibility',
    ];
    const result = computeMix(
      mixOf(
        unlinked.map((type, index) => ({ id: `t${index}`, type, variablePeriod: 5 })),
        { assumptions: { ...inflated, annualInflation: 6 } }
      )
    );

    result.tracks.forEach((track) => {
      expect(track.totalIndexation).toBe(0);
      expect(track.schedule.every((row) => row.indexation === 0)).toBe(true);
    });
    expect(result.summary.totalIndexation).toBe(0);
  });

  it('לוח של מסלול לא צמוד זהה לחלוטין עם ובלי תחזית אינפלציה', () => {
    const withForecast = computeMix(mixOf([{ type: 'prime', interestRate: 5 }], { assumptions: inflated }));
    const frozen = computeMix(
      mixOf([{ type: 'prime', interestRate: 5 }], {
        assumptions: { rateDeltas: {}, annualInflation: 0 },
      })
    );

    expect(withForecast.summary.totalPaid).toBeCloseTo(frozen.summary.totalPaid, 6);
    expect(withForecast.summary.totalInterest).toBeCloseTo(frozen.summary.totalInterest, 6);
    expect(withForecast.summary.monthlyPayment).toBeCloseTo(frozen.summary.monthlyPayment, 6);
  });

  it('מסלול צמוד כן צובר הצמדה, והקרן גדלה בהתאם', () => {
    const result = computeMix(
      mixOf([{ type: 'fixed_linked', interestRate: 3.05 }], { assumptions: inflated })
    );
    expect(result.tracks[0].totalIndexation).toBeGreaterThan(0);
    expectBalanced(result.tracks[0]);
  });
});

describe('ההחזר החודשי מול הנוסחה', () => {
  it('שפיצר בריבית קבועה — בדיוק נוסחת האנונה על הקרן, הריבית והתקופה', () => {
    const result = computeMix(mixOf([{ type: 'fixed_unlinked', interestRate: 4.85 }]));
    expect(result.summary.monthlyPayment).toBeCloseTo(
      annuityPayment(AMOUNT, 4.85, YEARS * 12),
      6
    );
  });

  it('פריים — אותה נוסחה, לפי הריבית התקפה עכשיו', () => {
    const result = computeMix(
      mixOf([{ type: 'prime', interestRate: 5.75 }], {
        assumptions: { rateDeltas: {}, annualInflation: 0, primeForecast: fallbackPrimeForecast(3.5) },
      })
    );
    expect(result.summary.monthlyPayment).toBeCloseTo(annuityPayment(AMOUNT, 5.75, YEARS * 12), 6);
  });

  it('תקופה ארוכה יותר מקטינה את ההחזר ומגדילה את סך הריבית', () => {
    const short = computeMix(mixOf([{ type: 'fixed_unlinked', interestRate: 4.85, years: 15 }]));
    const long = computeMix(mixOf([{ type: 'fixed_unlinked', interestRate: 4.85, years: 30 }]));

    expect(long.summary.monthlyPayment).toBeLessThan(short.summary.monthlyPayment);
    expect(long.summary.totalInterest).toBeGreaterThan(short.summary.totalInterest);
    expect(long.schedule).toHaveLength(360);
    expect(short.schedule).toHaveLength(180);
  });
});

describe('פרעון מוקדם, מחזור ושינוי מסלול — הלוח נשאר מאוזן', () => {
  const prepayment: MixEvent = {
    id: 'p1',
    kind: 'prepayment',
    month: 36,
    amount: 120_000,
    mode: 'shorten_term',
    trackId: 'a',
  };
  const reduce: MixEvent = { ...prepayment, id: 'p2', mode: 'reduce_payment' };
  const refinance: MixEvent = {
    id: 'r1',
    kind: 'refinance',
    month: 60,
    trackId: 'a',
    newRate: 3.9,
    newYears: 12,
    newType: 'fixed_unlinked',
  };

  it('קיצור תקופה — הלוח מאוזן, התקופה מתקצרת וההחזר נשמר', () => {
    const base = computeMix(mixOf([{ id: 'a', type: 'fixed_unlinked', interestRate: 4.85 }]));
    const result = computeMix(
      mixOf([{ id: 'a', type: 'fixed_unlinked', interestRate: 4.85 }], { events: [prepayment] })
    );

    expectBalanced(result.tracks[0]);
    expect(result.tracks[0].totalPrepaid).toBeCloseTo(120_000, 2);
    expect(result.schedule.length).toBeLessThan(base.schedule.length);
    expect(result.schedule[48].payment).toBeCloseTo(base.schedule[48].payment, 0);
    expect(result.summary.totalInterest).toBeLessThan(base.summary.totalInterest);
  });

  it('הקטנת החזר — הלוח מאוזן, התקופה נשמרת וההחזר יורד', () => {
    const base = computeMix(mixOf([{ id: 'a', type: 'fixed_unlinked', interestRate: 4.85 }]));
    const result = computeMix(
      mixOf([{ id: 'a', type: 'fixed_unlinked', interestRate: 4.85 }], { events: [reduce] })
    );

    expectBalanced(result.tracks[0]);
    expect(result.schedule).toHaveLength(base.schedule.length);
    expect(result.schedule[48].payment).toBeLessThan(base.schedule[48].payment);
    expect(result.summary.totalInterest).toBeLessThan(base.summary.totalInterest);
  });

  it('מחזור — הריבית והתקופה החדשות נכנסות לתוקף בדיוק מחודש המחזור', () => {
    const result = computeMix(
      mixOf([{ id: 'a', type: 'prime', interestRate: 5.5 }], { events: [refinance] })
    );
    const schedule = result.tracks[0].schedule;

    expect(schedule[58].annualRate).toBeCloseTo(5.5, 6);
    expect(schedule[59].annualRate).toBeCloseTo(3.9, 6);
    // 59 חודשים לפני המחזור ועוד 12 שנים אחריו
    expect(schedule).toHaveLength(59 + 12 * 12);
    expectBalanced(result.tracks[0]);

    const balanceAtRefinance = schedule[58].balanceEnd;
    expect(schedule[59].payment).toBeCloseTo(annuityPayment(balanceAtRefinance, 3.9, 144), 0);
  });

  it('פרעון מוקדם ומחזור יחד — עדיין מאוזן ונסגר', () => {
    const result = computeMix(
      mixOf([{ id: 'a', type: 'variable_unlinked', interestRate: 4.63, variablePeriod: 5 }], {
        events: [prepayment, refinance],
        assumptions: {
          rateDeltas: {},
          annualInflation: 2,
          primeForecast: fallbackPrimeForecast(3.5),
          inflationForecast: fallbackInflationForecast(),
        },
      })
    );
    expectBalanced(result.tracks[0]);
    expect(result.tracks[0].totalPrepaid).toBeCloseTo(120_000, 2);
  });

  it('פרעון שמפוזר על התמהיל מחלק לפי היתרות ונשאר מאוזן', () => {
    const result = computeMix(
      mixOf(
        [
          { id: 'a', type: 'fixed_unlinked', interestRate: 4.85, amount: 400_000 },
          { id: 'b', type: 'prime', interestRate: 5, amount: 200_000 },
        ],
        {
          events: [
            { id: 'p3', kind: 'prepayment', month: 24, amount: 60_000, mode: 'shorten_term' },
          ],
        }
      )
    );

    result.tracks.forEach(expectBalanced);
    expect(result.summary.totalPrepaid).toBeCloseTo(60_000, 2);
    // החלוקה לפי יחס היתרות — המסלול הגדול סופג את החלק הגדול
    expect(result.tracks[0].totalPrepaid).toBeGreaterThan(result.tracks[1].totalPrepaid);
  });
});

describe('פיצול ההחזר לקרן ולריבית — הבסיס לגרף ההחזר החודשי', () => {
  /**
   * הגרף מצייר מתחת לקו ההחזר שתי שכבות: קרן וריבית. כדי שהן יסתדרו עם הקו,
   * הסכום שלהן חייב להיות ההחזר עצמו (בלי פרעון מוקדם, שאינו החזר שוטף).
   */
  AMORTIZATIONS.forEach((amortizationType) => {
    it(`${amortizationType} — קרן ועוד ריבית הן ההחזר`, () => {
      const result = computeMix(mixOf([{ type: 'fixed_unlinked', amortizationType }]));
      result.tracks[0].schedule.forEach((row) => {
        const principal = row.principal - row.prepayment;
        const interest = row.payment - row.principal;
        expect(principal).toBeGreaterThanOrEqual(-1e-9);
        expect(interest).toBeGreaterThanOrEqual(-1e-9);
        expect(principal + interest).toBeCloseTo(row.payment - row.prepayment, 6);
      });
    });
  });

  it('בשפיצר חלק הקרן גדל וחלק הריבית קטן לאורך התקופה', () => {
    const rows = computeMix(mixOf([{ type: 'fixed_unlinked', interestRate: 5 }])).tracks[0].schedule;
    const firstPrincipal = rows[0].principal;
    const lastPrincipal = rows.at(-1)!.principal;
    expect(lastPrincipal).toBeGreaterThan(firstPrincipal);
    expect(rows.at(-1)!.interest).toBeLessThan(rows[0].interest);
  });

  it('בקרן שווה חלק הקרן קבוע לאורך כל התקופה', () => {
    const rows = computeMix(
      mixOf([{ type: 'fixed_unlinked', amortizationType: 'equal_principal', interestRate: 5 }])
    ).tracks[0].schedule;
    rows.forEach((row) => expect(row.principal).toBeCloseTo(rows[0].principal, 4));
  });

  it('בגרייס חלקי כל ההחזר השוטף הוא ריבית, והקרן נפרעת רק בסוף', () => {
    const rows = computeMix(
      mixOf([{ type: 'fixed_unlinked', amortizationType: 'partial_grace', interestRate: 5 }])
    ).tracks[0].schedule;
    rows.slice(0, -1).forEach((row) => {
      expect(row.principal).toBeCloseTo(0, 6);
      expect(row.interest).toBeCloseTo(row.payment, 6);
    });
    expect(rows.at(-1)!.principal).toBeCloseTo(AMOUNT, 2);
  });

  it('בגרייס מלא הריבית שנצברה נספרת כריבית ולא כקרן', () => {
    const rows = computeMix(
      mixOf([{ type: 'fixed_unlinked', amortizationType: 'full_grace', interestRate: 5 }])
    ).tracks[0].schedule;
    const last = rows.at(-1)!;
    expect(last.deferredInterest).toBeGreaterThan(0);
    // חלק הריבית בתשלום הסוגר כולל את כל מה שנצבר, ולא רק את ריבית החודש
    expect(last.payment - last.principal).toBeCloseTo(last.interest + last.deferredInterest, 6);
    expect(last.payment - last.principal).toBeGreaterThan(last.interest);
    // חודשי הצבירה אינם מציגים תשלום כלל — שתי השכבות אפס
    const accrual = rows[0];
    expect(accrual.payment).toBeCloseTo(0, 6);
    expect(accrual.payment - accrual.principal).toBeCloseTo(0, 6);
  });
});
