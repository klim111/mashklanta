import { describe, expect, it } from 'vitest';
import { annuityPayment, monthsToPayOff } from './schedule';
import { computeMix, computeMixWithForecast, snapshotAt } from './mix';
import {
  createTrack,
  createWorkspaceMix,
  normalizeMix,
  remainingAmount,
  sanitizeMix,
} from './factory';
import { optimizeMix } from './optimize';
import type { WorkspaceMix } from './types';
import { fallbackPrimeForecast } from '@/lib/prime-forward-curve';

function singleTrackMix(overrides: Partial<WorkspaceMix> = {}): WorkspaceMix {
  return createWorkspaceMix({
    totalAmount: 1_000_000,
    tracks: [
      createTrack({
        id: 'a',
        type: 'fixed_unlinked',
        amount: 1_000_000,
        interestRate: 5,
        years: 20,
        amortizationType: 'spitzer',
      }),
    ],
    assumptions: { rateDeltas: {}, annualInflation: 0 },
    ...overrides,
  });
}

describe('reading mixes that were stored by an older version', () => {
  it('repairs null numbers instead of passing them on to the display', () => {
    // בדיוק הצורה שהפילה את כרטיס התמהיל: percentage שנשמר כ-null
    const stored = {
      id: 'mix-1',
      name: 'תמהיל שמור',
      totalAmount: null,
      tracks: [
        { id: 'a', name: '', type: 'fixed_unlinked', amount: 600_000, percentage: null, interestRate: 5, years: 20 },
        { id: 'b', name: '', type: 'prime', amount: 400_000, percentage: null, interestRate: null, years: null },
      ],
    };

    const mix = sanitizeMix(stored)!;

    expect(mix.totalAmount).toBe(1_000_000);
    expect(mix.tracks[0].percentage).toBeCloseTo(60, 6);
    expect(mix.tracks[1].percentage).toBeCloseTo(40, 6);
    // ריבית ותקופה חסרות חוזרות לברירת המחדל של סוג המסלול
    expect(Number.isFinite(mix.tracks[1].interestRate)).toBe(true);
    expect(mix.tracks[1].years).toBe(25);
    // מזהי המסלולים נשמרים כדי שאירועים שמצביעים עליהם לא יאבדו
    expect(mix.tracks.map((t) => t.id)).toEqual(['a', 'b']);

    const result = computeMix(mix);
    expect(result.summary.monthlyPayment).toBeGreaterThan(0);
    expect(Number.isFinite(result.summary.totalInterest)).toBe(true);
  });

  it('fills in the parts of the mix that are missing entirely', () => {
    const mix = sanitizeMix({
      tracks: [{ id: 'a', type: 'fixed_unlinked', amount: 500_000 }],
    })!;

    expect(mix.id).toBeTruthy();
    expect(mix.events).toEqual([]);
    expect(mix.assumptions.annualInflation).toBe(2);
    expect(new Date(mix.startDate).toString()).not.toBe('Invalid Date');
    expect(mix.tracks[0].amortizationType).toBe('spitzer');
    expect(mix.tracks[0].name).toBeTruthy();
  });

  it('rejects data that has nothing worth restoring', () => {
    expect(sanitizeMix(null)).toBeNull();
    expect(sanitizeMix({})).toBeNull();
    expect(sanitizeMix({ tracks: [] })).toBeNull();
    expect(sanitizeMix({ tracks: [null] })).toBeNull();
  });
});

describe('annuity math', () => {
  it('matches the standard annuity formula', () => {
    expect(annuityPayment(1_000_000, 5, 240)).toBeCloseTo(6599.56, 1);
  });

  it('handles a zero rate as a straight split of the principal', () => {
    expect(annuityPayment(120_000, 0, 120)).toBeCloseTo(1000, 6);
  });

  it('reports an unpayable debt when the payment does not cover the interest', () => {
    expect(monthsToPayOff(1_000_000, 5, 1000)).toBe(Infinity);
  });
});

describe('single fixed track', () => {
  const result = computeMix(singleTrackMix());

  it('produces one row per month', () => {
    expect(result.schedule).toHaveLength(240);
  });

  it('keeps a level payment and closes the balance exactly', () => {
    expect(result.summary.monthlyPayment).toBeCloseTo(6599.56, 1);
    expect(result.schedule[239].balanceEnd).toBeLessThan(0.02);
  });

  it('derives total interest as total paid minus principal', () => {
    expect(result.summary.totalPaid - result.summary.totalInterest).toBeCloseTo(1_000_000, 0);
  });
});

describe('equal principal track', () => {
  const result = computeMix(
    singleTrackMix({
      tracks: [
        createTrack({
          id: 'a',
          type: 'fixed_unlinked',
          amount: 240_000,
          interestRate: 6,
          years: 20,
          amortizationType: 'equal_principal',
        }),
      ],
    })
  );

  it('repays a constant principal each month', () => {
    expect(result.tracks[0].schedule[0].principal).toBeCloseTo(1000, 2);
    expect(result.tracks[0].schedule[100].principal).toBeCloseTo(1000, 2);
  });

  it('starts high and declines', () => {
    const first = result.schedule[0].payment;
    const last = result.schedule[239].payment;
    expect(first).toBeGreaterThan(last);
    expect(first).toBeCloseTo(1000 + 240_000 * 0.005, 2);
  });
});

describe('index linked track', () => {
  it('grows the balance and costs more when inflation is positive', () => {
    const base = computeMix(
      singleTrackMix({
        tracks: [createTrack({ id: 'a', type: 'fixed_linked', amount: 1_000_000, interestRate: 3, years: 20 })],
        assumptions: { rateDeltas: {}, annualInflation: 0 },
      })
    );
    const inflated = computeMix(
      singleTrackMix({
        tracks: [createTrack({ id: 'a', type: 'fixed_linked', amount: 1_000_000, interestRate: 3, years: 20 })],
        assumptions: { rateDeltas: {}, annualInflation: 3 },
      })
    );

    expect(inflated.summary.totalPaid).toBeGreaterThan(base.summary.totalPaid);
    expect(inflated.summary.totalIndexation).toBeGreaterThan(0);
  });

  it('never lets the principal drop below its original value when the index falls', () => {
    const deflated = computeMix(
      singleTrackMix({
        tracks: [createTrack({ id: 'a', type: 'fixed_linked', amount: 1_000_000, interestRate: 3, years: 20 })],
        assumptions: { rateDeltas: {}, annualInflation: -2 },
      })
    );
    expect(deflated.summary.totalIndexation).toBeCloseTo(0, 6);
  });
});

describe('variable rate reset', () => {
  it('applies a rate change only from the first exit point onward', () => {
    const mix = singleTrackMix({
      tracks: [
        createTrack({
          id: 'a',
          type: 'variable_unlinked',
          amount: 1_000_000,
          interestRate: 4,
          years: 20,
          variablePeriod: 5,
        }),
      ],
      assumptions: { rateDeltas: { variable_unlinked: 2 }, annualInflation: 0 },
    });
    const result = computeMix(mix);

    expect(result.tracks[0].schedule[0].annualRate).toBeCloseTo(4, 6);
    expect(result.tracks[0].schedule[59].annualRate).toBeCloseTo(4, 6);
    expect(result.tracks[0].schedule[60].annualRate).toBeCloseTo(6, 6);
  });

  it('reprices prime immediately', () => {
    const result = computeMix(
      singleTrackMix({
        tracks: [createTrack({ id: 'a', type: 'prime', amount: 500_000, interestRate: 5, years: 20 })],
        assumptions: { rateDeltas: { prime: 1 }, annualInflation: 0 },
      })
    );
    expect(result.tracks[0].schedule[0].annualRate).toBeCloseTo(6, 6);
  });

    it('prices unlinked variable tracks off period forwards at each exit station', () => {
      const forecast = fallbackPrimeForecast();
      const withCurve = computeMix(
        singleTrackMix({
          tracks: [
            createTrack({
              id: 'a',
              type: 'variable_unlinked',
              amount: 500_000,
              interestRate: 4.6,
              years: 20,
              variablePeriod: 5,
            }),
          ],
          assumptions: { rateDeltas: {}, annualInflation: 0, primeForecast: forecast },
        })
      );
      const flat = computeMix(
        singleTrackMix({
          tracks: [
            createTrack({
              id: 'a',
              type: 'variable_unlinked',
              amount: 500_000,
              interestRate: 4.6,
              years: 20,
              variablePeriod: 5,
            }),
          ],
          assumptions: { rateDeltas: {}, annualInflation: 0 },
        })
      );

      expect(withCurve.tracks[0].schedule[0].annualRate).toBeCloseTo(4.6, 6);
      expect(withCurve.tracks[0].schedule[59].annualRate).toBeCloseTo(4.6, 6);
      expect(withCurve.tracks[0].schedule[60].isRateStation).toBe(true);
      expect(withCurve.tracks[0].schedule[0].isRateStation).toBeFalsy();
      expect(withCurve.tracks[0].schedule[60].annualRate).not.toBeCloseTo(4.6, 1);
      expect(withCurve.tracks[0].schedule[61].annualRate).toBeCloseTo(
        withCurve.tracks[0].schedule[60].annualRate,
        8
      );
      expect(withCurve.summary.totalInterest).not.toBeCloseTo(flat.summary.totalInterest, 0);
    });

    it('uses a 2-year station calendar when the variable period is 2 years', () => {
      const forecast = fallbackPrimeForecast();
      const result = computeMix(
        singleTrackMix({
          tracks: [
            createTrack({
              id: 'a',
              type: 'variable_unlinked',
              amount: 400_000,
              interestRate: 4.5,
              years: 10,
              variablePeriod: 2,
            }),
          ],
          assumptions: { rateDeltas: {}, annualInflation: 0, primeForecast: forecast },
        })
      );
      expect(result.tracks[0].schedule[23].isRateStation).toBeFalsy();
      expect(result.tracks[0].schedule[24].isRateStation).toBe(true);
      expect(result.tracks[0].schedule[24].annualRate).not.toBeCloseTo(
        result.tracks[0].schedule[23].annualRate,
        2
      );
    });

  it('prices each prime payment off the government zero curve', () => {
    const forecast = {
      asOf: '2026-07',
      source: 'fallback' as const,
      boiRate: 3.5,
      spots: [
        { years: 1, yieldPct: 3.2 },
        { years: 10, yieldPct: 4.0 },
        { years: 15, yieldPct: 4.3 },
      ],
    };
    const withCurve = computeMix(
      singleTrackMix({
        tracks: [createTrack({ id: 'a', type: 'prime', amount: 500_000, interestRate: 4.5, years: 20 })],
        assumptions: { rateDeltas: {}, annualInflation: 0, primeForecast: forecast },
      })
    );
    const flat = computeMix(
      singleTrackMix({
        tracks: [createTrack({ id: 'a', type: 'prime', amount: 500_000, interestRate: 4.5, years: 20 })],
        assumptions: { rateDeltas: {}, annualInflation: 0 },
      })
    );

    expect(withCurve.tracks[0].schedule[0].annualRate).toBeCloseTo(4.5, 6);
    expect(withCurve.tracks[0].schedule[119].annualRate).not.toBeCloseTo(4.5, 1);
    expect(withCurve.tracks[0].schedule).toHaveLength(240);
    expect(withCurve.summary.totalInterest).not.toBeCloseTo(flat.summary.totalInterest, 0);
  });

  it('prices a uniform-style basket total paid with forwards on variable tracks', () => {
    const mix = createWorkspaceMix({
      totalAmount: 900_000,
      tracks: [
        createTrack({ type: 'fixed_unlinked', amount: 300_000, interestRate: 5, years: 20 }),
        createTrack({ type: 'prime', amount: 300_000, interestRate: 6, years: 20 }),
        createTrack({
          type: 'variable_unlinked',
          amount: 300_000,
          interestRate: 4.6,
          years: 20,
          variablePeriod: 5,
        }),
      ],
      assumptions: { rateDeltas: {}, annualInflation: 0 },
    });
    const forecast = fallbackPrimeForecast();
    const flat = computeMix(mix);
    const withFwd = computeMixWithForecast(mix, forecast);

    expect(withFwd.summary.totalPaid).toBeGreaterThan(mix.totalAmount);
    expect(withFwd.summary.totalPaid).not.toBeCloseTo(flat.summary.totalPaid, 0);
    expect(withFwd.summary.totalInterest).not.toBeCloseTo(flat.summary.totalInterest, 0);
  });
});

describe('prepayment', () => {
  const baseline = computeMix(singleTrackMix());

  it('shortens the term while keeping the payment', () => {
    const result = computeMix(
      singleTrackMix({
        events: [
          { id: 'p1', kind: 'prepayment', month: 12, amount: 200_000, mode: 'shorten_term', trackId: 'a' },
        ],
      })
    );

    expect(result.schedule.length).toBeLessThan(baseline.schedule.length);
    expect(result.summary.totalInterest).toBeLessThan(baseline.summary.totalInterest);
    // ההחזר החודשי השוטף לא משתנה
    expect(result.schedule[24].payment).toBeCloseTo(baseline.schedule[24].payment, 0);
  });

  it('reduces the payment while keeping the term', () => {
    const result = computeMix(
      singleTrackMix({
        events: [
          { id: 'p1', kind: 'prepayment', month: 12, amount: 200_000, mode: 'reduce_payment', trackId: 'a' },
        ],
      })
    );

    expect(result.schedule).toHaveLength(baseline.schedule.length);
    expect(result.schedule[24].payment).toBeLessThan(baseline.schedule[24].payment);
    expect(result.summary.totalInterest).toBeLessThan(baseline.summary.totalInterest);
  });

  it('spreads an unassigned prepayment across open balances', () => {
    const mix = createWorkspaceMix({
      tracks: [
        createTrack({ id: 'a', type: 'fixed_unlinked', amount: 600_000, interestRate: 5, years: 20 }),
        createTrack({ id: 'b', type: 'fixed_unlinked', amount: 400_000, interestRate: 5, years: 20 }),
      ],
      assumptions: { rateDeltas: {}, annualInflation: 0 },
      events: [{ id: 'p1', kind: 'prepayment', month: 12, amount: 100_000, mode: 'shorten_term' }],
    });
    const result = computeMix(mix);

    expect(result.tracks[0].totalPrepaid).toBeCloseTo(60_000, -1);
    expect(result.tracks[1].totalPrepaid).toBeCloseTo(40_000, -1);
  });
});

describe('refinance', () => {
  it('applies the new rate and term from the refinance month', () => {
    const baseline = computeMix(singleTrackMix());
    const result = computeMix(
      singleTrackMix({
        events: [
          {
            id: 'r1',
            kind: 'refinance',
            month: 61,
            trackId: 'a',
            newRate: 3,
            newYears: 15,
          },
        ],
      })
    );

    expect(result.tracks[0].schedule[60].annualRate).toBeCloseTo(3, 6);
    expect(result.schedule).toHaveLength(60 + 180);
    expect(result.summary.totalInterest).toBeLessThan(baseline.summary.totalInterest);
  });
});

describe('snapshot', () => {
  const result = computeMix(singleTrackMix());

  it('splits paid and remaining interest at a point in time', () => {
    const snap = snapshotAt(result, 120)!;
    expect(snap.month).toBe(120);
    expect(snap.monthsRemaining).toBe(120);
    expect(snap.interestPaidToDate + snap.interestRemaining).toBeCloseTo(result.summary.totalInterest, 0);
    expect(snap.totalPaidToDate + snap.totalRemaining).toBeCloseTo(result.summary.totalPaid, 0);
    expect(snap.remainingBalance).toBeGreaterThan(0);
  });

  it('closes out at the final month', () => {
    const snap = snapshotAt(result, result.schedule.length)!;
    expect(snap.remainingBalance).toBeLessThan(0.02);
    expect(snap.interestRemaining).toBeCloseTo(0, 0);
  });
});

describe('grace amortization', () => {
  /** מסלול של מיליון ש"ח, 5% שנתי, שנתיים, בלי הצמדה ובלי תרחיש */
  function graceTrack(amortizationType: 'full_grace' | 'partial_grace') {
    return computeMix(
      singleTrackMix({
        tracks: [
          createTrack({
            id: 'g',
            type: 'fixed_unlinked',
            amount: 1_000_000,
            interestRate: 5,
            years: 2,
            amortizationType,
          }),
        ],
      })
    ).tracks[0];
  }

  const monthlyRate = 0.05 / 12;

  describe('full grace', () => {
    const result = graceTrack('full_grace');

    it('collects the interest every month and pays nothing until the end', () => {
      expect(result.schedule).toHaveLength(24);
      expect(result.schedule.slice(0, 23).every((row) => row.payment === 0)).toBe(true);
      expect(result.monthlyPayment).toBe(0);
      expect(result.lastMonthlyPayment).toBe(0);
    });

    it('charges interest on the interest that piled up, like a balloon loan', () => {
      // החוב אחרי 24 חודשים הוא הקרן מוכפלת בריבית החודשית 24 פעמים
      const expected = 1_000_000 * Math.pow(1 + monthlyRate, 24);
      expect(result.totalPaid).toBeCloseTo(expected, 2);
      expect(result.totalInterest).toBeCloseTo(expected - 1_000_000, 2);
    });

    it('pays the principal and all the accrued interest in one final payment', () => {
      const last = result.schedule[23];
      expect(last.payment).toBeCloseTo(result.totalPaid, 6);
      expect(last.balloon).toBeCloseTo(last.payment, 6);
      expect(result.balloonPayment).toBeCloseTo(last.payment, 6);
      // הקרן שנפרעת היא הקרן המקורית בלבד; הריבית שנצברה מדווחת בנפרד
      expect(last.principal).toBeCloseTo(1_000_000, 6);
      expect(last.deferredInterest).toBeCloseTo(result.totalInterest - last.interest, 6);
    });

    it('never counts the same interest twice', () => {
      const principal = result.schedule.reduce((sum, row) => sum + row.principal, 0);
      const interest = result.schedule.reduce((sum, row) => sum + row.interest, 0);
      expect(principal).toBeCloseTo(1_000_000, 6);
      expect(principal + interest).toBeCloseTo(result.totalPaid, 6);
    });

    it('shows the debt growing month by month instead of a flat balance', () => {
      expect(result.schedule[0].balanceStart).toBeCloseTo(1_000_000, 6);
      expect(result.schedule[12].balanceStart).toBeGreaterThan(1_000_000);
      expect(result.schedule[23].balanceEnd).toBe(0);
    });
  });

  describe('partial grace', () => {
    const result = graceTrack('partial_grace');

    it('pays the interest every month and the principal only at the end', () => {
      const interestOnly = 1_000_000 * monthlyRate;
      expect(result.monthlyPayment).toBeCloseTo(interestOnly, 6);
      expect(result.schedule[0].principal).toBe(0);
      expect(result.schedule[22].payment).toBeCloseTo(interestOnly, 6);

      const last = result.schedule[23];
      expect(last.principal).toBeCloseTo(1_000_000, 6);
      expect(last.balloon).toBeCloseTo(1_000_000, 6);
      expect(result.balloonPayment).toBeCloseTo(1_000_000, 6);
    });

    it('charges simple interest only, because nothing is left unpaid', () => {
      // 24 חודשי ריבית על קרן שאינה יורדת
      expect(result.totalInterest).toBeCloseTo(1_000_000 * monthlyRate * 24, 2);
      expect(result.totalPaid).toBeCloseTo(1_000_000 + result.totalInterest, 2);
      expect(result.totalInterest).toBeLessThan(graceTrack('full_grace').totalInterest);
    });
  });
});

describe('paying off a full grace track early', () => {
  const mix = createWorkspaceMix({
    totalAmount: 500_000,
    assumptions: { rateDeltas: {}, annualInflation: 0 },
    tracks: [
      createTrack({
        id: 'g',
        type: 'fixed_unlinked',
        amount: 500_000,
        interestRate: 5,
        years: 10,
        amortizationType: 'full_grace',
      }),
    ],
    events: [
      { id: 'p', kind: 'prepayment', month: 12, amount: 500_000, mode: 'shorten_term', trackId: 'g' },
    ],
  });

  it('settles the interest that piled up together with the principal', () => {
    const track = computeMix(mix).tracks[0];
    expect(track.months).toBe(12);
    // כל מה ששולם הוא הקרן והריבית שנצברה — בלי שקל שנעלם או נספר פעמיים
    expect(track.totalPaid).toBeCloseTo(500_000 + track.totalInterest, 4);
    expect(track.totalInterest).toBeCloseTo(500_000 * (Math.pow(1 + 0.05 / 12, 12) - 1), 2);
  });
});

describe('paying off a full grace track early', () => {
  const result = computeMix(
    createWorkspaceMix({
      totalAmount: 500_000,
      assumptions: { rateDeltas: {}, annualInflation: 0 },
      tracks: [
        createTrack({
          id: 'g',
          type: 'fixed_unlinked',
          amount: 500_000,
          interestRate: 5,
          years: 10,
          amortizationType: 'full_grace',
        }),
      ],
      events: [
        {
          id: 'p1',
          kind: 'prepayment',
          month: 12,
          amount: 500_000,
          mode: 'shorten_term',
          trackId: 'g',
        },
      ],
    })
  ).tracks[0];

  it('settles the interest that piled up together with the principal', () => {
    expect(result.months).toBe(12);
    const last = result.schedule[11];
    expect(last.balanceEnd).toBe(0);
    // הפרעון סוגר את הקרן, ובאותו חודש נפרעת גם כל הריבית שנצברה
    expect(result.totalPaid).toBeCloseTo(500_000 + result.totalInterest, 6);
    expect(result.totalInterest).toBeCloseTo(500_000 * (Math.pow(1 + 0.05 / 12, 12) - 1), 2);
  });
});

describe('equal principal', () => {
  const result = computeMix(
    singleTrackMix({
      tracks: [
        createTrack({
          id: 'e',
          type: 'fixed_unlinked',
          amount: 1_200_000,
          interestRate: 5,
          years: 25,
          amortizationType: 'equal_principal',
        }),
      ],
    })
  ).tracks[0];

  it('starts at the highest payment and ends at the lowest', () => {
    const principalPart = 1_200_000 / 300;
    expect(result.monthlyPayment).toBeCloseTo(principalPart + 1_200_000 * (0.05 / 12), 4);
    expect(result.lastMonthlyPayment).toBeCloseTo(principalPart * (1 + 0.05 / 12), 4);
    expect(result.lastMonthlyPayment).toBeLessThan(result.monthlyPayment);
    expect(result.balloonPayment).toBe(0);
  });
});

describe('a mix that mixes grace with a regular track', () => {
  const result = computeMix(
    createWorkspaceMix({
      totalAmount: 1_000_000,
      assumptions: { rateDeltas: {}, annualInflation: 0 },
      tracks: [
        createTrack({
          id: 'spitzer',
          type: 'fixed_unlinked',
          amount: 700_000,
          interestRate: 5,
          years: 20,
          amortizationType: 'spitzer',
        }),
        createTrack({
          id: 'balloon',
          type: 'fixed_unlinked',
          amount: 300_000,
          interestRate: 5,
          years: 20,
          amortizationType: 'full_grace',
        }),
      ],
    })
  );

  it('keeps the balloon out of the monthly payment and reports it on its own', () => {
    const spitzerPayment = result.tracks[0].monthlyPayment;
    expect(result.summary.monthlyPayment).toBeCloseTo(spitzerPayment, 6);
    expect(result.summary.peakMonthlyPayment).toBeCloseTo(spitzerPayment, 6);
    expect(result.summary.balloonPayment).toBeCloseTo(result.tracks[1].balloonPayment, 6);
    expect(result.summary.balloonPayment).toBeGreaterThan(300_000);
  });
});

describe('normalizeMix', () => {
  it('derives percentages from the mortgage amount', () => {
    const mix = normalizeMix(
      createWorkspaceMix({
        totalAmount: 1_000_000,
        tracks: [
          createTrack({ id: 'a', amount: 750_000 }),
          createTrack({ id: 'b', amount: 250_000 }),
        ],
      })
    );
    expect(mix.totalAmount).toBe(1_000_000);
    expect(mix.tracks[0].percentage).toBeCloseTo(75, 6);
    expect(mix.tracks[1].percentage).toBeCloseTo(25, 6);
    expect(remainingAmount(mix)).toBe(0);
  });

  it('keeps the mortgage amount when the tracks do not cover it', () => {
    const mix = normalizeMix(
      createWorkspaceMix({
        totalAmount: 1_000_000,
        tracks: [createTrack({ id: 'a', amount: 600_000 })],
      })
    );
    expect(mix.totalAmount).toBe(1_000_000);
    expect(mix.tracks[0].percentage).toBeCloseTo(60, 6);
    expect(remainingAmount(mix)).toBe(400_000);
  });

  it('falls back to the track amounts when there is no mortgage amount', () => {
    const mix = normalizeMix(
      createWorkspaceMix({ totalAmount: 0, tracks: [createTrack({ id: 'a', amount: 800_000 })] })
    );
    expect(mix.totalAmount).toBe(800_000);
    expect(remainingAmount(mix)).toBe(0);
  });
});

describe('optimizer', () => {
  const mix = singleTrackMix();
  const baseline = computeMix(mix).summary;

  it('lowers the monthly payment by extending the term', () => {
    const outcome = optimizeMix(mix, 'lower_monthly', { maxYears: 30 });
    expect(outcome.after.monthlyPayment).toBeLessThan(baseline.monthlyPayment);
    expect(outcome.mix.tracks[0].years).toBe(30);
  });

  it('finds the shortest term that still fits the cap', () => {
    const cap = baseline.monthlyPayment * 1.3;
    const outcome = optimizeMix(mix, 'faster_payoff', { maxMonthlyPayment: cap, maxYears: 30 });
    expect(outcome.feasible).toBe(true);
    expect(outcome.after.monthlyPayment).toBeLessThanOrEqual(cap + 1);
    expect(outcome.after.months).toBeLessThan(baseline.months);
  });

  it('flags an unreachable cap instead of silently failing', () => {
    const outcome = optimizeMix(mix, 'faster_payoff', { maxMonthlyPayment: 500, maxYears: 30 });
    expect(outcome.feasible).toBe(false);
  });

  it('cuts total interest without breaking the cap', () => {
    const cap = baseline.monthlyPayment * 1.2;
    const outcome = optimizeMix(mix, 'lower_total_interest', { maxMonthlyPayment: cap, maxYears: 30 });
    expect(outcome.after.totalInterest).toBeLessThan(baseline.totalInterest);
    expect(outcome.after.monthlyPayment).toBeLessThanOrEqual(cap + 1);
  });
});
