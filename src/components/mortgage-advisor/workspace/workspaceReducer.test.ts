import { describe, expect, it } from 'vitest';
import { createInitialWorkspaceState, workspaceReducer } from './useMortgageWorkspace';
import type { WorkspaceAction, WorkspaceState } from './useMortgageWorkspace';
import {
  computeMix,
  createEmptyMix,
  createTrack,
  createWorkspaceMix,
  normalizeMix,
  remainingAmount,
} from '../engine';
import type { WorkspaceMix } from '../engine';

/** תמהיל שמשבץ את כל סכום המשכנתא, כמו שהאשף מייצר */
function stateWith(amounts: number[], overrides: Partial<WorkspaceMix> = {}): WorkspaceState {
  return createInitialWorkspaceState(
    createWorkspaceMix({
      totalAmount: amounts.reduce((sum, amount) => sum + amount, 0),
      tracks: amounts.map((amount, i) =>
        createTrack({ id: `t${i}`, type: 'fixed_unlinked', amount, years: 25 })
      ),
      ...overrides,
    })
  );
}

function run(state: WorkspaceState, ...actions: WorkspaceAction[]): WorkspaceState {
  return actions.reduce(workspaceReducer, state);
}

const total = (state: WorkspaceState) => state.mix.tracks.reduce((s, t) => s + t.amount, 0);
const amountOf = (state: WorkspaceState, id: string) =>
  state.mix.tracks.find((t) => t.id === id)?.amount ?? 0;

describe('a fresh workspace', () => {
  it('starts empty so the tool opens without any previous data', () => {
    const state = createInitialWorkspaceState();
    expect(state.mix.tracks).toHaveLength(0);
    expect(state.mix.totalAmount).toBe(0);
    expect(state.mix.name).toBe('');
  });

  it('builds a mix from the setup wizard with matching percentages', () => {
    // מה שהאשף מייצר: סכום שהוזן, ומסלולים שמכסים אותו במלואו
    const mix = normalizeMix(
      createEmptyMix({
        name: 'תמהיל בדיקה',
        totalAmount: 1_000_000,
        tracks: [
          createTrack({ id: 'a', type: 'fixed_unlinked', amount: 400_000, years: 20 }),
          createTrack({ id: 'b', type: 'prime', amount: 600_000, years: 25 }),
        ],
      })
    );

    expect(mix.totalAmount).toBe(1_000_000);
    expect(mix.tracks[0].percentage).toBeCloseTo(40, 6);
    expect(mix.tracks[1].percentage).toBeCloseTo(60, 6);

    const state = run(createInitialWorkspaceState(), { type: 'load', mix });
    expect(state.mix.name).toBe('תמהיל בדיקה');
    expect(state.mix.tracks).toHaveLength(2);
  });

  it('keeps the current constraints when load is called without them', () => {
    const before = createInitialWorkspaceState(createWorkspaceMix());
    const withCap = run(before, { type: 'setConstraints', patch: { maxMonthlyPayment: 7_000 } });
    const reloaded = run(withCap, { type: 'load', mix: createWorkspaceMix() });
    expect(reloaded.constraints.maxMonthlyPayment).toBe(7_000);

    const reset = run(withCap, { type: 'load', mix: createWorkspaceMix(), constraints: { maxYears: 30 } });
    expect(reset.constraints.maxMonthlyPayment).toBeUndefined();
  });
});

describe('percentages', () => {
  it('always sum to 100 and match the amounts', () => {
    const state = stateWith([600_000, 300_000, 100_000]);
    const sum = state.mix.tracks.reduce((s, t) => s + t.percentage, 0);
    expect(sum).toBeCloseTo(100, 6);
    expect(state.mix.tracks[0].percentage).toBeCloseTo(60, 6);
    expect(state.mix.totalAmount).toBe(1_000_000);
  });
});

describe('setTotalAmount', () => {
  it('rescales tracks and keeps the composition intact', () => {
    const before = stateWith([600_000, 400_000]);
    const after = run(before, { type: 'setTotalAmount', amount: 2_000_000 });

    expect(after.mix.totalAmount).toBeCloseTo(2_000_000, 6);
    expect(amountOf(after, 't0')).toBeCloseTo(1_200_000, 6);
    expect(after.mix.tracks[0].percentage).toBeCloseTo(60, 6);
    expect(after.mix.tracks[1].percentage).toBeCloseTo(40, 6);
  });
});

describe('setTrackAmount', () => {
  it('changes only that track and leaves the rest of the mortgage to allocate', () => {
    const before = stateWith([500_000, 300_000, 200_000]);
    const after = run(before, { type: 'setTrackAmount', id: 't0', amount: 300_000 });

    expect(amountOf(after, 't0')).toBeCloseTo(300_000, 4);
    expect(amountOf(after, 't1')).toBeCloseTo(300_000, 4);
    expect(amountOf(after, 't2')).toBeCloseTo(200_000, 4);
    expect(after.mix.totalAmount).toBeCloseTo(1_000_000, 4);
    expect(remainingAmount(after.mix)).toBeCloseTo(200_000, 4);
  });

  it('caps a track at what is left of the mortgage amount', () => {
    const before = stateWith([500_000, 300_000, 200_000]);
    const after = run(before, { type: 'setTrackAmount', id: 't0', amount: 900_000 });

    expect(amountOf(after, 't0')).toBeCloseTo(500_000, 4);
    expect(total(after)).toBeCloseTo(1_000_000, 4);
    expect(remainingAmount(after.mix)).toBe(0);
  });

  it('lets a single track shrink below the mortgage amount', () => {
    const before = stateWith([1_000_000]);
    const after = run(before, { type: 'setTrackAmount', id: 't0', amount: 400_000 });

    expect(amountOf(after, 't0')).toBeCloseTo(400_000, 4);
    expect(remainingAmount(after.mix)).toBeCloseTo(600_000, 4);
  });
});

describe('addTrack and removeTrack', () => {
  it('gives a new track the amount that is missing from the mortgage', () => {
    const before = run(stateWith([600_000, 400_000]), {
      type: 'setTrackAmount',
      id: 't1',
      amount: 100_000,
    });
    expect(remainingAmount(before.mix)).toBeCloseTo(300_000, 4);

    const after = run(before, { type: 'addTrack', trackType: 'prime' });
    expect(after.mix.tracks).toHaveLength(3);
    expect(after.mix.tracks[2].type).toBe('prime');
    expect(after.mix.tracks[2].amount).toBeCloseTo(300_000, 4);
    expect(remainingAmount(after.mix)).toBe(0);
  });

  it('carves a tenth from the existing tracks when the mortgage is fully allocated', () => {
    const before = stateWith([600_000, 400_000]);
    const after = run(before, { type: 'addTrack', trackType: 'prime' });

    expect(after.mix.tracks).toHaveLength(3);
    expect(total(after)).toBeCloseTo(1_000_000, 4);
    expect(after.mix.tracks[2].percentage).toBeCloseTo(10, 4);
  });

  it('turns a removed track into an amount that has to be allocated again', () => {
    const before = stateWith([500_000, 300_000, 200_000]);
    const after = run(before, { type: 'removeTrack', id: 't2' });

    expect(after.mix.tracks).toHaveLength(2);
    expect(after.mix.totalAmount).toBeCloseTo(1_000_000, 4);
    expect(amountOf(after, 't0')).toBeCloseTo(500_000, 4);
    expect(amountOf(after, 't1')).toBeCloseTo(300_000, 4);
    expect(remainingAmount(after.mix)).toBeCloseTo(200_000, 4);
  });

  it('refuses to remove the last remaining track', () => {
    const before = stateWith([1_000_000]);
    const after = run(before, { type: 'removeTrack', id: 't0' });
    expect(after.mix.tracks).toHaveLength(1);
  });

  it('drops events that pointed at a removed track', () => {
    const before = run(stateWith([600_000, 400_000]), {
      type: 'addEvent',
      event: { id: 'e1', kind: 'prepayment', month: 12, amount: 50_000, mode: 'shorten_term', trackId: 't1' },
    });
    expect(before.mix.events).toHaveLength(1);

    const after = run(before, { type: 'removeTrack', id: 't1' });
    expect(after.mix.events).toHaveLength(0);
  });
});

describe('updateTrack', () => {
  it('brings the default rate and the variable period when the type changes', () => {
    const before = stateWith([1_000_000, 500_000]);
    const after = run(before, { type: 'updateTrack', id: 't0', patch: { type: 'variable_unlinked' } });
    const track = after.mix.tracks[0];

    expect(track.type).toBe('variable_unlinked');
    expect(track.interestRate).toBeCloseTo(4.63, 2);
    expect(track.variablePeriod).toBe(5);
  });

  it('clears the variable period when moving to a fixed track', () => {
    const before = run(stateWith([1_000_000, 500_000]), {
      type: 'updateTrack',
      id: 't0',
      patch: { type: 'variable_unlinked' },
    });
    const after = run(before, { type: 'updateTrack', id: 't0', patch: { type: 'fixed_unlinked' } });

    expect(after.mix.tracks[0].variablePeriod).toBeUndefined();
  });

  it('respects an explicit rate over the default for the new type', () => {
    const before = stateWith([1_000_000, 500_000]);
    const after = run(before, { type: 'updateTrack', id: 't0', patch: { type: 'prime', interestRate: 6.5 } });
    expect(after.mix.tracks[0].interestRate).toBe(6.5);
  });
});

describe('the maximum monthly payment that was set for the client', () => {
  /** תקרה שנמצאת מעט מעל ההחזר הנוכחי, כדי שכל התייקרות תחרוג ממנה */
  function stateWithCap(amounts: number[]) {
    const loose = stateWith(amounts);
    const cap = Math.round(computeMix(loose.mix).summary.monthlyPayment) + 50;
    return { state: stateWith(amounts, { maxMonthlyPayment: cap }), cap };
  }

  it('rejects a change that pushes the payment over the cap and explains why', () => {
    const { state } = stateWithCap([1_000_000]);
    const after = run(state, { type: 'updateTrack', id: 't0', patch: { years: 10 } });

    expect(after.mix.tracks[0].years).toBe(25);
    expect(after.blockedNotice).toContain('חורג מתקרת ההחזר');
  });

  it('allows a change that keeps the payment within the cap', () => {
    const { state } = stateWithCap([1_000_000]);
    const after = run(state, { type: 'updateTrack', id: 't0', patch: { years: 30 } });

    expect(after.mix.tracks[0].years).toBe(30);
    expect(after.blockedNotice).toBeNull();
  });

  it('does not block a stress scenario, so the exposure stays visible', () => {
    const { state } = stateWithCap([1_000_000]);
    const after = run(state, { type: 'setRateDelta', trackType: 'fixed_unlinked', delta: 3 });

    expect(after.mix.assumptions.rateDeltas.fixed_unlinked).toBe(3);
    expect(after.blockedNotice).toBeNull();
  });

  it('lets the cap itself be updated', () => {
    const { state } = stateWithCap([1_000_000]);
    const after = run(state, { type: 'patchMix', patch: { maxMonthlyPayment: 20_000 } });

    expect(after.mix.maxMonthlyPayment).toBe(20_000);
    expect(after.blockedNotice).toBeNull();
  });
});

describe('assumptions', () => {
  it('resets back to the base scenario', () => {
    const changed = run(
      stateWith([1_000_000]),
      { type: 'setRateDelta', trackType: 'prime', delta: 2 },
      { type: 'setInflation', value: 5 }
    );
    expect(changed.mix.assumptions.rateDeltas.prime).toBe(2);

    const reset = run(changed, { type: 'resetAssumptions' });
    expect(reset.mix.assumptions.rateDeltas).toEqual({});
    expect(reset.mix.assumptions.annualInflation).toBe(2);
  });

  it('keeps the prime forecast when the risk scenario is reset', () => {
    const forecast = {
      asOf: '2026-07',
      source: 'boi' as const,
      boiRate: 3.5,
      spots: [
        { years: 1, yieldPct: 3.2 },
        { years: 10, yieldPct: 4.0 },
      ],
    };
    const withCurve = run(stateWith([1_000_000]), { type: 'setPrimeForecast', forecast });
    const reset = run(
      withCurve,
      { type: 'setRateDelta', trackType: 'prime', delta: 1 },
      { type: 'resetAssumptions' }
    );
    expect(reset.mix.assumptions.primeForecast).toEqual(forecast);
    expect(reset.mix.assumptions.rateDeltas).toEqual({});
  });

  it('keeps the inflation forecast when the risk scenario is reset', () => {
    const inflation = {
      asOf: '2026-03',
      source: 'boi' as const,
      spots: [
        { years: 1, inflationPct: 2.3 },
        { years: 10, inflationPct: 2.2 },
      ],
    };
    const withCurve = run(stateWith([1_000_000]), { type: 'setInflationForecast', forecast: inflation });
    const reset = run(
      withCurve,
      { type: 'setInflation', value: 5 },
      { type: 'resetAssumptions' }
    );
    expect(reset.mix.assumptions.inflationForecast).toEqual(inflation);
    expect(reset.mix.assumptions.annualInflation).toBe(2);
  });
});
