import { describe, expect, it } from 'vitest';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import { PLAN_STAGE_TOOLS, journeyStageFor, planToolHref, toolById } from './planStages';

describe('כלים לפי שלבי התהליך', () => {
  it('לכל שלב יש כלים חיוניים, וכולם קיימים בקטלוג', () => {
    PLAN_STAGES.forEach((stage) => {
      const tools = PLAN_STAGE_TOOLS[stage];
      expect(tools.essential.length).toBeGreaterThan(0);
      expect(() => journeyStageFor(stage)).not.toThrow();
      [...tools.essential, ...tools.optional].forEach((id) => {
        expect(toolById(id), `${id} missing from catalog`).toBeDefined();
      });
    });
  });

  it('קישור לכלי שומר פרמטרים קיימים ומוסיף את מזהה התהליך', () => {
    expect(planToolHref('/equity-planning', 'abc')).toBe('/equity-planning?fromPlan=abc');
    expect(planToolHref('/mortgage-planning?flow=affordability', 'abc')).toBe(
      '/mortgage-planning?flow=affordability&fromPlan=abc'
    );
  });
});
