import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import {
  FUNDING_SOURCE_FIELDS,
  INCOME_FIELDS,
  completeness,
  fieldLabel,
  fieldPlaceholder,
  getFieldDef,
  isFieldVisible,
} from './schema';
import { intakeFormUrl, intakeLinkEmail, intakeReportPath } from './intake';

const funding = (key: string) => FUNDING_SOURCE_FIELDS.find((f) => f.key === key)!;
const income = (key: string) => INCOME_FIELDS.find((f) => f.key === key)!;

describe('טופס פרטי הלקוח — השלמות מידע רק כשמשהו מצדיק אותן', () => {
  it('הון עצמי מחסכונות לא מבקש פירוט, מועד או חוזה מכירה', () => {
    const values = { sourceType: 'savings' };
    expect(isFieldVisible(funding('details'), values)).toBe(false);
    expect(isFieldVisible(funding('expectedDate'), values)).toBe(false);
    expect(isFieldVisible(funding('saleContractSigned'), values)).toBe(false);
    // רק סוג וסכום נשארים חובה
    expect(completeness('fundingSource', values).total).toBe(2);
  });

  it('מכירת דירה שואלת על הדירה הנמכרת ועל חוזה המכירה', () => {
    const values = { sourceType: 'apartment_sale' };
    expect(isFieldVisible(funding('details'), values)).toBe(true);
    expect(fieldLabel(funding('details'), values)).toBe('כתובת הדירה הנמכרת');
    expect(fieldPlaceholder(funding('details'), values)).toContain('הרצל');
    expect(isFieldVisible(funding('saleContractSigned'), values)).toBe(true);
  });

  it('מתנה ממשפחה שואלת ממי המתנה, בלי חוזה מכירה', () => {
    const values = { sourceType: 'gift_from_family' };
    expect(fieldLabel(funding('details'), values)).toBe('ממי המתנה');
    expect(isFieldVisible(funding('saleContractSigned'), values)).toBe(false);
  });

  it('לפני שנבחר מקור לא נפתח שום שדה פירוט', () => {
    expect(isFieldVisible(funding('details'), {})).toBe(false);
    expect(fieldLabel(funding('details'), {})).toBe('פירוט');
  });

  it('פנסיה או שכירות לא מבקשות תאריך תחילת העסקה ופרטי מעסיק', () => {
    for (const incomeType of ['pension', 'rent', 'alimony']) {
      expect(isFieldVisible(income('employmentStartDate'), { incomeType })).toBe(false);
      expect(isFieldVisible(income('employerName'), { incomeType })).toBe(false);
    }
    expect(isFieldVisible(income('employmentStartDate'), { incomeType: 'salary' })).toBe(true);
  });

  it('אפשר לסמן ערבים כ"לא רלוונטי"', () => {
    const def = getFieldDef('case', 'hasGuarantors')!;
    expect(def.options?.map((o) => o.value)).toEqual(['yes', 'not_relevant']);
  });
});

describe('הקישור והמייל ללקוח', () => {
  it('בונה את הקישור לטופס ואת הנתיב לדוח', () => {
    expect(intakeFormUrl('https://mashkalanta.com/')).toBe('https://mashkalanta.com/client-details-form');
    expect(intakeReportPath('abc')).toBe('/advisor-dashboard/client/abc/client-details');
  });

  it('המייל כולל את הקישור ופונה בשם', () => {
    const mail = intakeLinkEmail({ name: 'דנה', url: 'https://x.co/client-details-form' });
    expect(mail.html).toContain('https://x.co/client-details-form');
    expect(mail.html).toContain('שלום דנה');
    expect(mail.text).toContain('שדר ליועץ');
  });
});
