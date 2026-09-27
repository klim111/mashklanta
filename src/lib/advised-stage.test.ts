import { describe, expect, it } from 'vitest';
import { emptyPlanData } from './mortgage-plan';
import type { PlanData } from './mortgage-plan';
import {
  advantageHeadline,
  advantageRows,
  advisedBaseline,
  advisedResult,
} from './advised-stage';

function plan(): PlanData {
  const data = emptyPlanData();
  data.APPLICATIONS = {
    ...data.APPLICATIONS,
    baskets: [
      {
        basketId: data.APPLICATIONS.baskets[0]?.basketId ?? 'balanced',
        rates: {},
        mixKey: null,
        mixRecordId: null,
        monthlyPayment: 8_800,
        averageRate: 4.9,
        totalPaid: 2_640_000,
      },
    ],
  };
  data.MIX = {
    ...data.MIX,
    mixKey: 'mix-1',
    mixName: 'תמהיל מאוזן',
    totalAmount: 1_700_000,
    monthlyPayment: 8_400,
    averageRate: 4.5,
    totalPaid: 2_520_000,
  };
  data.AUCTION = {
    ...data.AUCTION,
    signedMix: {
      mixKey: 'mix-quoted',
      mixRecordId: null,
      bank: 'מזרחי',
      name: 'תמהיל מאוזן · ריביות מזרחי',
      monthlyPayment: 8_100,
      averageRate: 4.12,
      totalInterest: 720_000,
      totalPaid: 2_430_000,
      months: 300,
      chosenAt: '2026-09-12T10:00:00.000Z',
    },
  };
  return data;
}

describe('ברירת המחדל שמולה נמדד הליווי', () => {
  it('בשלב התמהיל — הסל הזול מהאישור העקרוני', () => {
    const baseline = advisedBaseline('MIX', plan());
    expect(baseline?.monthlyPayment).toBe(8_800);
    expect(baseline?.label).toContain('אישור העקרוני');
  });

  it('בשלב התמחור — התמהיל כפי שתוכנן', () => {
    const baseline = advisedBaseline('AUCTION', plan());
    expect(baseline?.monthlyPayment).toBe(8_400);
    expect(baseline?.label).toContain('תוכנן');
  });

  it('בלי נתונים אין מול מה להשוות', () => {
    expect(advisedBaseline('MIX', emptyPlanData())).toBeNull();
    expect(advisedBaseline('AUCTION', emptyPlanData())).toBeNull();
    expect(advisedBaseline('SIGNING', plan())).toBeNull();
  });
});

describe('התוצר שהיועץ הביא', () => {
  it('בשלב התמהיל זה התמהיל שנבנה', () => {
    expect(advisedResult('MIX', plan())?.label).toBe('תמהיל מאוזן');
  });

  it('בשלב התמחור זו ההצעה שנבחרה, עם הבנק', () => {
    const result = advisedResult('AUCTION', plan());
    expect(result?.bank).toBe('מזרחי');
    expect(result?.monthlyPayment).toBe(8_100);
  });

  it('בלי תוצר מוחזר null', () => {
    expect(advisedResult('AUCTION', emptyPlanData())).toBeNull();
  });
});

describe('היתרונות מול ברירת המחדל', () => {
  it('מחשב את ההפרש בכל שורה ומסמן מה טוב יותר', () => {
    const data = plan();
    const rows = advantageRows(advisedResult('MIX', data), advisedBaseline('MIX', data));

    expect(rows.map((row) => row.label)).toEqual([
      'החזר חודשי',
      'סך התשלומים',
      'ריבית ממוצעת',
    ]);
    expect(rows.every((row) => row.better)).toBe(true);
    expect(rows[0].delta).toBe(-400);
    expect(rows[1].delta).toBe(-120_000);
  });

  it('הפרש זניח אינו מוצג', () => {
    const rows = advantageRows(
      { label: 'א', monthlyPayment: 8_405, averageRate: 4.5, totalPaid: 2_520_400 },
      { label: 'ב', monthlyPayment: 8_400, averageRate: 4.5, totalPaid: 2_520_000 }
    );
    expect(rows).toEqual([]);
  });

  it('תוצאה גרועה יותר כן מוצגת, ומסומנת ככזו', () => {
    const rows = advantageRows(
      { label: 'א', monthlyPayment: 9_000, averageRate: null, totalPaid: null },
      { label: 'ב', monthlyPayment: 8_400, averageRate: null, totalPaid: null }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].better).toBe(false);
    expect(rows[0].delta).toBe(600);
  });

  it('בלי תוצר או בלי בסיס אין שורות', () => {
    expect(advantageRows(null, advisedBaseline('MIX', plan()))).toEqual([]);
    expect(advantageRows(advisedResult('MIX', plan()), null)).toEqual([]);
  });

  it('השורה התחתונה מנוסחת לפי סך התשלומים, ובהיעדרו לפי ההחזר', () => {
    const data = plan();
    const rows = advantageRows(advisedResult('MIX', data), advisedBaseline('MIX', data));
    expect(advantageHeadline(rows)).toContain('חסך');

    const monthlyOnly = advantageRows(
      { label: 'א', monthlyPayment: 8_000, averageRate: null, totalPaid: null },
      { label: 'ב', monthlyPayment: 8_400, averageRate: null, totalPaid: null }
    );
    expect(advantageHeadline(monthlyOnly)).toContain('נמוך');
    expect(advantageHeadline([])).toBeNull();
  });
});
