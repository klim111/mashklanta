import { describe, expect, it } from 'vitest';
import {
  PLAN_STAGES,
  STAGE_TASK_TEMPLATES,
  asPlanStage,
  dayKey,
  defaultRateFrom,
  meetingIsLive,
  relativeDayLabel,
  taskIsClosed,
  taskIsOverdue,
} from './advisor-crm';
import type { AdvisorRateDefaultView } from './advisor-crm';

describe('שלבי היועץ', () => {
  it('השלבים זהים לחמשת השלבים של כלי תכנון המשכנתא', () => {
    expect([...PLAN_STAGES]).toEqual(['ANALYSIS', 'APPLICATIONS', 'MIX', 'AUCTION', 'SIGNING']);
  });

  it('לכל שלב יש תבניות משימה מוכנות', () => {
    PLAN_STAGES.forEach((stage) => {
      expect(STAGE_TASK_TEMPLATES[stage].length).toBeGreaterThan(0);
    });
  });

  it('שלב שהגיע מהדפדפן מאומת מול הרשימה', () => {
    expect(asPlanStage('MIX')).toBe('MIX');
    expect(asPlanStage('INTAKE')).toBeNull();
    expect(asPlanStage(null)).toBeNull();
  });
});

describe('ריביות ברירת המחדל של היועץ', () => {
  const rates: AdvisorRateDefaultView[] = [
    { bank: 'לאומי', amortizationType: 'spitzer', trackType: 'prime', rate: 4.9 },
    { bank: 'לאומי', amortizationType: 'equal_principal', trackType: 'prime', rate: 5.4 },
  ];

  it('הצירוף המדויק של בנק, לוח סילוקין וסוג מסלול מנצח', () => {
    expect(defaultRateFrom(rates, 'לאומי', 'equal_principal', 'prime')).toBe(5.4);
  });

  it('בהיעדר ערך ללוח הסילוקין הזה נופלים לערך של שפיצר', () => {
    expect(defaultRateFrom(rates, 'לאומי', 'full_grace', 'prime')).toBe(4.9);
  });

  it('בלי בנק או בלי ערך שמור אין ריבית מועדפת', () => {
    expect(defaultRateFrom(rates, undefined, 'spitzer', 'prime')).toBeNull();
    expect(defaultRateFrom(rates, 'הפועלים', 'spitzer', 'prime')).toBeNull();
    expect(defaultRateFrom(rates, 'לאומי', 'spitzer', 'fixed_unlinked')).toBeNull();
  });
});

describe('משימות ופגישות', () => {
  const now = new Date('2026-09-02T10:00:00');

  it('משימה שעבר מועדה ועדיין פתוחה מסומנת כאיחור', () => {
    expect(
      taskIsOverdue({ dueDate: '2026-09-01T09:00:00', status: 'OPEN' }, now)
    ).toBe(true);
  });

  it('משימה שהושלמה או שאין לה מועד אינה באיחור', () => {
    expect(taskIsOverdue({ dueDate: '2026-09-01T09:00:00', status: 'DONE' }, now)).toBe(false);
    expect(taskIsOverdue({ dueDate: null, status: 'OPEN' }, now)).toBe(false);
  });

  it('משימה סגורה היא זו שהושלמה או שבוטלה', () => {
    expect(taskIsClosed('DONE')).toBe(true);
    expect(taskIsClosed('CANCELLED')).toBe(true);
    expect(taskIsClosed('IN_PROGRESS')).toBe(false);
  });

  it('פגישה תופסת מקום ביומן כל עוד לא בוטלה או נדחתה', () => {
    expect(meetingIsLive('PROPOSED')).toBe(true);
    expect(meetingIsLive('CONFIRMED')).toBe(true);
    expect(meetingIsLive('DECLINED')).toBe(false);
    expect(meetingIsLive('CANCELLED')).toBe(false);
  });
});

describe('ימים בלוח השנה', () => {
  it('מפתח היום נגזר מהזמן המקומי, כדי שפגישת ערב לא תיפול ליום הבא', () => {
    expect(dayKey(new Date(2026, 8, 2, 23, 30))).toBe('2026-09-02');
  });

  it('היום ומחר מקבלים ניסוח יחסי', () => {
    const now = new Date(2026, 8, 2, 10, 0);
    const tomorrow = new Date(2026, 8, 3, 10, 0);
    expect(relativeDayLabel(now, now)).toBe('היום');
    expect(relativeDayLabel(tomorrow, now)).toBe('מחר');
  });
});
