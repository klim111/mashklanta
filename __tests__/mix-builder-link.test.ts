import { describe, expect, it } from 'vitest';
import { activeProcess, mixBuilderHref } from '@/components/dashboard/client/mixBuilderLink';
import type { PlanView } from '@/components/plan/usePlan';

const plan = (id: string, status: string, updatedAt: string, propertyAddress: string | null = null) =>
  ({ id, status, updatedAt, propertyAddress }) as unknown as PlanView;

const plans = [
  plan('old', 'IN_PROGRESS', '2026-01-01T00:00:00Z', 'הרצל 1'),
  plan('signed', 'COMPLETED', '2026-09-01T00:00:00Z', 'ביאליק 2'),
  plan('current', 'IN_PROGRESS', '2026-10-01T00:00:00Z'),
];

describe('mixBuilderHref', () => {
  it('picks the most recently updated open process', () => {
    expect(activeProcess(plans)?.id).toBe('current');
  });

  it('opens the builder at the mix stage of the active process', () => {
    expect(mixBuilderHref(plans)).toBe('/dashboard/plans/current?stage=MIX');
  });

  it('opens a saved mix in its own process', () => {
    expect(mixBuilderHref(plans, { mixId: 'm1', planId: 'signed' })).toBe(
      '/dashboard/plans/signed?stage=MIX&mix=m1'
    );
    expect(mixBuilderHref(plans, { mixId: 'm2', propertyAddress: ' הרצל 1 ' })).toBe(
      '/dashboard/plans/old?stage=MIX&mix=m2'
    );
  });

  it('loads a mix without a property into the active process', () => {
    expect(mixBuilderHref(plans, { mixId: 'm3' })).toBe('/dashboard/plans/current?stage=MIX&mix=m3');
  });

  it('does not load a mix of a deleted process into another one', () => {
    expect(mixBuilderHref(plans, { mixId: 'm4', planId: 'gone' })).toBe('/dashboard/plans/current?stage=MIX');
  });

  it('falls back to the standalone builder without any process', () => {
    expect(mixBuilderHref([], { mixId: 'm5' })).toBe('/dashboard/mix-planner?mix=m5');
    expect(mixBuilderHref([])).toBe('/dashboard/mix-planner');
  });
});
