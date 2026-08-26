import { journeyStages } from './journey';
import type { JourneyStage } from './journey';
import { platformTools } from './tools';
import type { PlatformTool } from './tools';
import { PLAN_STAGES, STAGE_JOURNEY_ID } from '@/lib/mortgage-plan';
import type { PlanStageId } from '@/lib/mortgage-plan';

/**
 * הכלים של כל שלב בתהליך התכנון.
 *
 * `essential` הם הכלים שהשלב נשען עליהם, ו-`optional` הם כלים שרלוונטיים לשלב
 * אך אינם חובה — הם מוצעים ללקוח, ומודגשים רק כשהנתונים שהזין מצדיקים זאת
 * (ראו `stageHints` ב-`src/lib/mortgage-plan.ts`).
 */
export interface PlanStageTools {
  essential: string[];
  optional: string[];
}

export const PLAN_STAGE_TOOLS: Record<PlanStageId, PlanStageTools> = {
  ANALYSIS: {
    essential: ['affordability'],
    optional: ['equity', 'consumer-loans', 'financial-dynamics'],
  },
  MIX: {
    essential: ['advisor-workspace', 'custom-mix'],
    optional: ['uniform-mixes', 'simulations', 'learn'],
  },
  APPLICATIONS: {
    essential: ['application', 'documents'],
    optional: ['uniform-mixes', 'consumer-loans', 'journey-map', 'video-call'],
  },
  AUCTION: {
    essential: ['advisor-workspace', 'saved-mixes'],
    optional: ['uniform-mixes', 'simulations'],
  },
  SIGNING: {
    essential: ['advisor-workspace', 'mortgage-dashboard'],
    optional: ['journey-map', 'refinance'],
  },
};

/** כותרת הפעולה שהלקוח מבצע בשלב, מעל הטופס */
export const PLAN_STAGE_ACTIONS: Record<PlanStageId, { title: string; hint: string }> = {
  ANALYSIS: {
    title: 'בניית הפרופיל הפיננסי',
    hint: 'מתחילים בשאלה אם כבר נמצא נכס, ממשיכים להכנסות, אופן העסקה והון עצמי — ומסיימים בפרטי העסקה. הכול נשמר תוך כדי הקלדה.',
  },
  MIX: {
    title: 'בניית תמהיל',
    hint: 'הסלים האחידים מהאישור העקרוני כבר שמורים כתמהילים. בנו מולם תמהיל אישי ושפרו אותו.',
  },
  APPLICATIONS: {
    title: 'הגשת בקשה לאישור עקרוני',
    hint: 'השלימו את תיק המסמכים, בחרו את הבנק שאליו תגישו, וכשהאישור בידכם הזינו את הריביות שקיבלתם לסלים האחידים.',
  },
  AUCTION: {
    title: 'מכרז הריביות',
    hint: 'הזינו כל הצעה שקיבלתם והשוו אותה מול הריביות שקיבלתם באישור העקרוני. ההצעה שתבחרו תעבור הלאה.',
  },
  SIGNING: {
    title: 'חתימה על תיק המשכנתא בבנק',
    hint: 'לפני שחותמים — ודאו שכל מה שסוכם במכרז אכן נכנס לחוזה. סגירת השלב מסיימת את התהליך.',
  },
};

const toolIndex = new Map(platformTools.map((tool) => [tool.id, tool]));

export function toolById(id: string): PlatformTool | undefined {
  return toolIndex.get(id);
}

export function toolsByIds(ids: string[]): PlatformTool[] {
  return ids.flatMap((id) => {
    const tool = toolById(id);
    return tool ? [tool] : [];
  });
}

/**
 * קישור לכלי מתוך תהליך תכנון. `fromPlan` מאפשר לכלי לדעת מאיפה הגיעו,
 * בלי לשנות את הנתיב הבסיסי שהקטלוג כבר מגדיר.
 */
export function planToolHref(href: string, planId: string): string {
  const joiner = href.includes('?') ? '&' : '?';
  return `${href}${joiner}fromPlan=${encodeURIComponent(planId)}`;
}

const journeyIndex = new Map(journeyStages.map((stage) => [stage.id, stage]));

/** השלב בעמוד "איך זה עובד" שממנו נלקחים הכותרת, התיאור והעיצוב */
export function journeyStageFor(stage: PlanStageId): JourneyStage {
  const found = journeyIndex.get(STAGE_JOURNEY_ID[stage]);
  if (!found) throw new Error(`missing journey stage for ${stage}`);
  return found;
}

export const PLAN_JOURNEY_STAGES = PLAN_STAGES.map(journeyStageFor);
