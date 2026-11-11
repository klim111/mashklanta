import { describe, expect, it } from 'vitest';
import {
  PLAN_STAGES,
  STAGE_TASK_TEMPLATES,
  asPlanStage,
  dayKey,
  defaultRateFrom,
  answerMeeting,
  meetingAwaiting,
  meetingIsLive,
  meetingStatusLabel,
  relativeDayLabel,
  taskIsClosed,
  taskIsOverdue,
} from './advisor-crm';
import type { AdvisorRateDefaultView } from './advisor-crm';

describe('שלבי היועץ', () => {
  it('השלבים זהים לחמשת השלבים של כלי תכנון המשכנתא', () => {
    expect([...PLAN_STAGES]).toEqual(['ANALYSIS', 'MIX', 'APPLICATIONS', 'AUCTION', 'SIGNING']);
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

describe('הצעת מועד, הצעה נגדית ואישור', () => {
  const at = new Date('2026-10-20T10:00:00Z');
  const later = new Date('2026-10-21T12:00:00Z');

  it('פגישה שהיועץ הציע ממתינה ללקוח, והלקוח מאשר — מאושרת אצל שניהם', () => {
    const proposed = { status: 'PROPOSED' as const, proposedBy: 'ADVISOR' as const };
    expect(meetingAwaiting(proposed)).toBe('CLIENT');
    expect(meetingStatusLabel(proposed, 'CLIENT')).toBe('ממתינה לאישורכם');
    expect(meetingStatusLabel(proposed, 'ADVISOR')).toBe('ממתינה לאישור הלקוח');
    const accepted = answerMeeting(proposed, 'CLIENT', { action: 'accept' }, at);
    expect(accepted).toEqual({ status: 'CONFIRMED', proposedBy: 'ADVISOR', respondedAt: at });
  });

  it('הלקוח מציע מועד אחר — הפגישה עוברת לאישור היועץ, ושוב חזרה, עד שמישהו מאשר', () => {
    const fromAdvisor = { status: 'PROPOSED' as const, proposedBy: 'ADVISOR' as const };
    const counter = answerMeeting(fromAdvisor, 'CLIENT', { action: 'propose', startsAt: later });
    expect(counter).toEqual({ status: 'PROPOSED', proposedBy: 'CLIENT', startsAt: later, respondedAt: null });
    expect(meetingAwaiting(counter!)).toBe('ADVISOR');
    expect(meetingStatusLabel(counter!, 'ADVISOR')).toContain('ממתינה לאישורך');

    // הלקוח לא יכול לאשר את ההצעה של עצמו
    expect(answerMeeting(counter!, 'CLIENT', { action: 'accept' })).toBeNull();

    // היועץ מציע שוב מועד אחר — חזרה לאישור הלקוח
    const back = answerMeeting(counter!, 'ADVISOR', { action: 'propose', startsAt: at });
    expect(back?.proposedBy).toBe('ADVISOR');
    expect(meetingAwaiting(back!)).toBe('CLIENT');

    // והפעם היועץ מאשר את הצעת הלקוח
    expect(answerMeeting(counter!, 'ADVISOR', { action: 'accept' }, at)?.status).toBe('CONFIRMED');
  });

  it('מועד חדש לפגישה מאושרת מחזיר אותה לאישור הצד השני', () => {
    const confirmed = { status: 'CONFIRMED' as const, proposedBy: 'ADVISOR' as const };
    expect(meetingAwaiting(confirmed)).toBeNull();
    const moved = answerMeeting(confirmed, 'CLIENT', { action: 'propose', startsAt: later });
    expect(moved?.status).toBe('PROPOSED');
    expect(meetingAwaiting(moved!)).toBe('ADVISOR');
    // אין מה לאשר בפגישה שכבר מאושרת
    expect(answerMeeting(confirmed, 'ADVISOR', { action: 'accept' })).toBeNull();
  });

  it('פגישה שבוטלה או נדחתה לא מקבלת תשובות', () => {
    const cancelled = { status: 'CANCELLED' as const, proposedBy: 'ADVISOR' as const };
    expect(answerMeeting(cancelled, 'CLIENT', { action: 'accept' })).toBeNull();
    expect(answerMeeting(cancelled, 'CLIENT', { action: 'propose', startsAt: later })).toBeNull();
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
