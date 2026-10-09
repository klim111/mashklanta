import { describe, expect, it } from 'vitest';
import {
  MAX_TOOL_DATA_BYTES,
  TOOL_HAS_CONTENT,
  analysisFromToolData,
  parseToolData,
  parseToolDataWrite,
} from './tool-data';

const affordability = {
  userData: {
    applicationType: 'individual',
    propertyType: 'first-home',
    monthlyIncome: '18,000',
    age: '34',
    ownCapital: '450,000',
    propertyPrice: '1,800,000',
  },
  currentStep: 'results',
};

describe('נתוני הכלים בחשבון', () => {
  it('קורא רק כלים מוכרים, ורק ערכים שהם אובייקט', () => {
    expect(parseToolData(null)).toEqual({});
    expect(parseToolData([])).toEqual({});
    expect(
      parseToolData({ refinance: { tracks: [] }, consumerLoans: 'x', other: { a: 1 } })
    ).toEqual({ refinance: { tracks: [] } });
  });

  it('בודק את גוף השמירה', () => {
    expect(parseToolDataWrite({ key: 'refinance', data: { tracks: [] } })).toEqual({
      ok: true,
      key: 'refinance',
      data: { tracks: [] },
    });
    expect(parseToolDataWrite({ key: 'consumerLoans', data: null })).toEqual({
      ok: true,
      key: 'consumerLoans',
      data: null,
    });
    expect(parseToolDataWrite({ key: 'profile', data: {} }).ok).toBe(false);
    expect(parseToolDataWrite({ key: 'refinance', data: [1] }).ok).toBe(false);
    expect(parseToolDataWrite({ key: 'refinance', data: 'x' }).ok).toBe(false);
    const huge = { tracks: ['x'.repeat(MAX_TOOL_DATA_BYTES)] };
    expect(parseToolDataWrite({ key: 'refinance', data: huge }).ok).toBe(false);
  });

  it('מזהה מתי הוזן בכלי משהו ששווה להעביר לחשבון', () => {
    expect(TOOL_HAS_CONTENT.refinance({ tracks: [] })).toBe(false);
    expect(TOOL_HAS_CONTENT.refinance({ tracks: [{ amount: 1 }] })).toBe(true);
    expect(TOOL_HAS_CONTENT.consumerLoans({ loans: [] })).toBe(false);
    expect(TOOL_HAS_CONTENT.consumerLoans({ loans: [{ principal: 1 }] })).toBe(true);
    expect(TOOL_HAS_CONTENT.affordability({ userData: { propertyType: 'first-home' } })).toBe(false);
    expect(TOOL_HAS_CONTENT.affordability(affordability)).toBe(true);
    expect(
      TOOL_HAS_CONTENT.affordability({ userData: { borrower2: { monthlyIncome: '9,000' } } })
    ).toBe(true);
    expect(TOOL_HAS_CONTENT.affordability(null)).toBe(false);
  });

  it('פותח את הפרופיל הפיננסי של התהליך ממה שהוזן בכלי ההיתכנות', () => {
    const analysis = analysisFromToolData({ affordability });
    expect(analysis).toBeDefined();
    expect(analysis!.household).toBe('SINGLE');
    expect(analysis!.income).toBe(18_000);
    expect(analysis!.age).toBe(34);
    expect(analysis!.equity).toBe(450_000);
    expect(analysis!.propertyValue).toBe(1_800_000);
  });

  it('אינו פותח פרופיל כשבכלי לא הוזן דבר', () => {
    expect(analysisFromToolData(null)).toBeUndefined();
    expect(analysisFromToolData({ affordability: { userData: {} } })).toBeUndefined();
  });
});
