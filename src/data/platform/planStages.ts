import { journeyStages } from './journey';
import type { JourneyStage } from './journey';
import { platformTools } from './tools';
import type { PlatformTool } from './tools';
import { NEW_PLAN_FLOW, PLAN_STAGES, STAGE_JOURNEY_ID, flowStages } from '@/lib/mortgage-plan';
import type { PlanFlow, PlanStageId } from '@/lib/mortgage-plan';

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
    hint: 'הזינו כל הצעה שקיבלתם והשוו אותה מול התמהיל שבניתם ומול הריביות שקיבלתם באישור העקרוני. ההצעה שתבחרו תעבור לחתימה.',
  },
  SIGNING: {
    title: 'חתימה על תיק המשכנתא בבנק',
    hint: 'בוחרים את תרחיש הרכישה ומקבלים את רשימת המסמכים שהבנק ידרוש, ומוודאים שהתמהיל ותנאיו באישור הסופי תואמים למה שתומחר במכרז. סגירת השלב מסיימת את התהליך.',
  },
};

/**
 * הכותרות של שלב בתהליך מיחזור.
 *
 * הרכיבים, העיצוב והכלים של כל שלב זהים למשכנתא חדשה; מה שמשתנה הוא הניסוח:
 * "הגשת בקשה לאישור עקרוני" הופכת ל"הגשת בקשת מיחזור לבנק", ומכרז הריביות
 * במיחזור פנימי הוא אימות ההצעה של הבנק שבו המשכנתא מנוהלת.
 */
export interface PlanStageMeta {
  title: string;
  shortTitle: string;
  hint: string;
  /** מה כולל השלב — לשער השלב ולתצוגה המקדימה */
  summary: string;
  steps: string[];
}

const REFINANCE_MIX_META: PlanStageMeta = {
  title: 'בחירת התמהיל למיחזור',
  shortTitle: 'התמהיל למיחזור',
  hint: 'המשכנתא הנוכחית מול התמהיל שבניתם למיחזור. אפשר לפתוח את התמהיל לעריכה ולשמור שוב, ולהכין ממנו בקשה להצעת מחיר לבנק.',
  summary:
    'כלי המיחזור: המשכנתא הנוכחית כפי שהוזנה, פאנל השליטה שבו משנים ריבית, תקופה, סכום וסוג מסלול, ודאשבורד שמראה מיד את ההבדל.',
  steps: [
    'המשכנתא הנוכחית — הבנק, המסלולים, הריביות ומועדי הסיום',
    'פאנל השליטה: ריבית, תקופה, סכום וסוג מסלול לכל מסלול',
    'דאשבורד ההשוואה: המצב היום מול המצב לאחר המיחזור, בטבלה ובגרפים',
    'שמירת התמהיל למיחזור והכנת בקשה להצעת מחיר לבנק',
  ],
};

const REFINANCE_META: Record<'INTERNAL' | 'EXTERNAL', Partial<Record<PlanStageId, PlanStageMeta>>> = {
  INTERNAL: {
    MIX: { ...REFINANCE_MIX_META, title: 'מיחזור המשכנתא' },
    APPLICATIONS: {
      title: 'הגשת בקשת מיחזור לבנק',
      shortTitle: 'הגשה לבנק',
      hint: 'הבקשה מוגשת לבנק שבו המשכנתא מנוהלת. רוב הנתונים כבר אצלו, ולכן נדרשים פחות מסמכים וזמן. כשהאישור בידכם, העלו אותו כאן.',
      summary:
        'הגשת בקשת המיחזור לבנק הנוכחי דרך אזור המשכנתאות הדיגיטלי שלו, והעלאת האישור שהתקבל ממנו.',
      steps: [
        'התמהיל למיחזור — המבנה שהבקשה מוגשת עליו',
        'קישור להגשה באתר הבנק שבו המשכנתא מנוהלת',
        'העלאת האישור שהתקבל מהבנק',
      ],
    },
    AUCTION: {
      title: 'אימות ההצעה של הבנק',
      shortTitle: 'אימות ההצעה',
      hint: 'הזינו את הריביות שהבנק הציע לתמהיל שבניתם, והשוו אותן מול המשכנתא המקורית — בטבלה ובגרפים. ההצעה שתאשרו היא המיחזור שייחתם.',
      summary:
        'הזנת הריביות שהבנק נקב לכל מסלול בתמהיל למיחזור, והשוואה מלאה מול המשכנתא הנוכחית.',
      steps: [
        'טבלת הריביות של הבנק לכל מסלול בתמהיל למיחזור',
        'ההצעה מול המשכנתא המקורית — החזר חודשי, סך ריבית, סך תשלום ותקופה',
        'גרפי ההשוואה של המשכנתא כולה',
        'אישור ההצעה כמיחזור שייחתם',
      ],
    },
  },
  EXTERNAL: {
    MIX: REFINANCE_MIX_META,
    APPLICATIONS: {
      title: 'הגשת בקשת אישור עקרוני למיחזור',
      shortTitle: 'אישור עקרוני',
      hint: 'בנק חדש בוחן את הפרופיל הפיננסי ואת הנכס מחדש, ולכן ההגשה זהה לבקשה למשכנתא חדשה. פנו לבנקים שתרצו להתמחר מולם והעלו את האישורים שהתקבלו.',
      summary:
        'תיק מסמכים דיגיטלי עם מעקב התקדמות, בחירת הבנקים שאליהם מגישים, והעלאת האישורים העקרוניים שהתקבלו למיחזור.',
      steps: [
        'בדיקה שכל פרטי הפרופיל הנדרשים לבקשה הוזנו',
        'רשימת מסמכים מותאמת לשכיר / עצמאי / בעל שליטה עם מעקב התקדמות',
        'הגשה לבנקים שתרצו להתמחר מולם',
        'העלאת האישורים העקרוניים שהתקבלו',
      ],
    },
  },
};

/** הכותרות והתיאורים של שלב, לפי סוג התהליך */
export function planStageMeta(stage: PlanStageId, flow: PlanFlow = NEW_PLAN_FLOW): PlanStageMeta {
  if (flow.kind === 'REFINANCE') {
    const mode = flow.refinanceMode ?? 'EXTERNAL';
    const override = REFINANCE_META[mode][stage];
    if (override) return override;
  }
  const journey = journeyStageFor(stage);
  const action = PLAN_STAGE_ACTIONS[stage];
  return {
    title: journey.title,
    shortTitle: journey.shortTitle,
    hint: action.hint,
    summary: journey.selfServiceSummary || journey.valueDescription,
    steps: journey.selfServiceSteps,
  };
}

/** השלבים של תהליך, עם הכותרות שלהם — לסרגלים ולכרטיסים */
export function planFlowStageMeta(flow: PlanFlow = NEW_PLAN_FLOW): Array<{ stage: PlanStageId; meta: PlanStageMeta }> {
  return flowStages(flow).map((stage) => ({ stage, meta: planStageMeta(stage, flow) }));
}

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
