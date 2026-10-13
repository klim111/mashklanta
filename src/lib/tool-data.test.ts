import { describe, expect, it } from 'vitest';
import {
  MAX_TOOL_DATA_BYTES,
  TOOL_HAS_CONTENT,
  analysisFromToolData,
  guestSnapshotToToolData,
  parseResume,
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

describe('מה שנשלח עם ההרשמה', () => {
  const now = new Date('2026-10-13T08:00:00Z');
  const refinance = { tracks: [{ amount: 600_000 }] };
  const equity = { propertyData: { price: 2_000_000 }, expenses: [], currentStep: 1 };

  it('שומר כל כלי שהוזן בו משהו, עם השלב שבו עצרו', () => {
    const result = guestSnapshotToToolData(
      {
        affordability,
        refinance,
        equity,
        consumerLoans: { loans: [] },
        steps: { affordability: 'results', refinance: 'preview', equity: '1', other: 'x' },
      },
      now
    );
    expect(result).toEqual({
      affordability,
      refinance,
      equity,
      resume: {
        tools: ['affordability', 'refinance', 'equity'],
        steps: { affordability: 'results', refinance: 'preview', equity: '1' },
        savedAt: now.toISOString(),
      },
    });
  });

  it('בלי נתונים בכלים אין מה לשמור', () => {
    expect(guestSnapshotToToolData(undefined)).toBeNull();
    expect(guestSnapshotToToolData({ refinance: { tracks: [] }, steps: {} })).toBeNull();
    expect(guestSnapshotToToolData([refinance])).toBeNull();
    expect(guestSnapshotToToolData({ refinance: { tracks: ['x'.repeat(700_000)] } })).toBeNull();
  });

  it('קורא את ההודעה "תרצו להמשיך?" רק עם כלים מוכרים', () => {
    expect(parseResume(null)).toBeNull();
    expect(parseResume({ tools: ['other'] })).toBeNull();
    expect(parseResume({ tools: ['consumerLoans', 'refinance'], steps: { refinance: 'result' } })).toEqual({
      tools: ['refinance', 'consumerLoans'],
      steps: { refinance: 'result' },
      savedAt: '',
    });
  });

  it('נתוני הכלים בחשבון כוללים את ההודעה ואת טיוטת ההון העצמי', () => {
    expect(parseToolData({ resume: { tools: ['equity'] }, equity: {} })).toEqual({
      resume: { tools: ['equity'] },
      equity: {},
    });
    expect(parseToolDataWrite({ key: 'resume', data: null }).ok).toBe(true);
  });
});
