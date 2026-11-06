import { describe, expect, it } from 'vitest';
import { PLAN_STAGES } from './mortgage-plan';
import {
  ALL_TASK_TEMPLATES,
  STAGE_TASK_TEMPLATES,
  bankTaskTitle,
  isClientTaskKind,
  templateByKey,
} from './client-tasks';

describe('תבניות המשימות', () => {
  it('לכל שלב יש רשימה, גם אם ריקה — האישור העקרוני חופשי בלבד', () => {
    PLAN_STAGES.forEach((stage) => expect(Array.isArray(STAGE_TASK_TEMPLATES[stage])).toBe(true));
    expect(STAGE_TASK_TEMPLATES.APPLICATIONS).toHaveLength(0);
    expect(STAGE_TASK_TEMPLATES.ANALYSIS.length).toBeGreaterThanOrEqual(3);
  });

  it('המפתחות ייחודיים בתוך שלב', () => {
    PLAN_STAGES.forEach((stage) => {
      const keys = STAGE_TASK_TEMPLATES[stage].map((template) => template.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  it('פגישה עם יועץ בנק מקבלת את שם הבנק שנבחר', () => {
    const template = templateByKey('AUCTION', 'bank-meeting');
    expect(template?.needsBank).toBe(true);
    expect(bankTaskTitle(template!, 'לאומי')).toBe('קבעו פגישה עם יועץ מבנק לאומי');
  });

  it('הרשימה המאוחדת נושאת את השלב של כל תבנית', () => {
    expect(ALL_TASK_TEMPLATES.every((template) => PLAN_STAGES.includes(template.stage))).toBe(true);
    expect(templateByKey(null, 'lawyer-meeting')?.kind).toBe('MEETING');
  });

  it('מזהה סוגי משימה', () => {
    expect(isClientTaskKind('MEETING')).toBe(true);
    expect(isClientTaskKind('OTHER')).toBe(false);
  });
});
