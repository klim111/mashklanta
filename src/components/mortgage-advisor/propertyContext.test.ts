import { describe, expect, it } from 'vitest';
import {
  fixedAmount,
  meetsFixedRequirement,
  minFixedAmount,
  missingFixedAmount,
} from './propertyContext';
import { createTrack } from './engine';
import type { MortgageTrack } from './types';

const TOTAL = 900_000;
/** שליש מ-900,000 לפי הכלל של בנק ישראל (33%) */
const THIRD = (TOTAL * 33) / 100;

function mixOf(...tracks: MortgageTrack[]) {
  return { totalAmount: TOTAL, tracks };
}

function track(type: MortgageTrack['type'], amount: number): MortgageTrack {
  return createTrack({ type, amount, years: 25 });
}

describe('דרישת שליש הריבית הקבועה', () => {
  it('הדרישה היא שליש מסכום המשכנתא', () => {
    expect(minFixedAmount(TOTAL)).toBe(THIRD);
    expect(minFixedAmount(0)).toBe(0);
  });

  it('קבועה צמודה ולא צמודה נספרות באותה קופה', () => {
    const mix = mixOf(
      track('fixed_unlinked', 100_000),
      track('fixed_linked', 200_000),
      track('prime', 600_000)
    );
    expect(fixedAmount(mix.tracks)).toBe(300_000);
  });

  it('מסלולים שאינם קבועים אינם נספרים', () => {
    const mix = mixOf(track('prime', 500_000), track('variable_unlinked', 400_000));
    expect(fixedAmount(mix.tracks)).toBe(0);
    expect(meetsFixedRequirement(mix)).toBe(false);
  });

  it('שליש שכולו קבועה לא צמודה עומד בדרישה', () => {
    expect(meetsFixedRequirement(mixOf(track('fixed_unlinked', THIRD), track('prime', 603_000)))).toBe(
      true
    );
  });

  it('שליש שכולו קבועה צמודה עומד בדרישה', () => {
    expect(meetsFixedRequirement(mixOf(track('fixed_linked', THIRD), track('prime', 603_000)))).toBe(
      true
    );
  });

  it('חלוקה בין שני המסלולים הקבועים תקינה כשסכומם מגיע לשליש', () => {
    // כל מסלול לבדו קטן משליש, ויחד הם משלימים אותו
    const mix = mixOf(
      track('fixed_unlinked', THIRD / 3),
      track('fixed_linked', (THIRD * 2) / 3),
      track('prime', 603_000)
    );
    expect(meetsFixedRequirement(mix)).toBe(true);
    expect(missingFixedAmount(mix)).toBe(0);
  });

  it('מתחת לשליש הכולל — הדרישה אינה מתקיימת, ומדווח כמה חסר', () => {
    const mix = mixOf(
      track('fixed_unlinked', 50_000),
      track('fixed_linked', 50_000),
      track('prime', 800_000)
    );
    expect(meetsFixedRequirement(mix)).toBe(false);
    expect(missingFixedAmount(mix)).toBe(THIRD - 100_000);
  });

  it('הפרשי עיגול של שקל אינם מפילים תמהיל תקין', () => {
    const mix = mixOf(track('fixed_unlinked', THIRD - 0.5), track('prime', 603_000));
    expect(meetsFixedRequirement(mix)).toBe(true);
    expect(missingFixedAmount(mix)).toBe(0);
  });
});
