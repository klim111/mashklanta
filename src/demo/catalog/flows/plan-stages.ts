import type { DemoFlow, DemoStep } from '../../types';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { STAGE_GUIDE } from '@/data/platform/stageGuide';
import { journeyStageFor } from '@/data/platform/planStages';

/**
 * הדגמת חמשת השלבים — שולחן העבודה של התהליך.
 * הכתוביות נבנות מתוכן מדריך השלבים הקיים (STAGE_GUIDE), כדי שההסבר בהדגמה
 * ובמסכי ההסבר של הפלטפורמה יהיה אותו הסבר.
 */
function stageSteps(stage: PlanStageId, index: number): DemoStep[] {
  const guide = STAGE_GUIDE[stage];
  const journey = journeyStageFor(stage);
  return [
    {
      id: `stage-${stage}-open`,
      title: `שלב ${index + 1}: ${journey.shortTitle}`,
      caption: `${guide.importance}`,
      actions: [
        { type: 'click', target: `plan-stage-${stage}` },
        // עמוד ההסבר של השלב — בהדגמה מתחילים את השלב כדי לראות את הכלי
        { type: 'click', target: 'plan-stage-intro-start', optional: true },
      ],
      target: 'plan-stage-title',
      spotlight: { side: 'bottom' },
      duration: 7000,
    },
    {
      id: `stage-${stage}-goals`,
      title: 'מה עושים כאן',
      caption: guide.goals.join(' · '),
      target: 'plan-stage-content',
      spotlight: { side: 'over' },
      duration: 7000,
      allowTryIt: stage === 'ANALYSIS' || stage === 'MIX',
      tryItHint: 'הכלי של השלב פתוח לשינויים על נתוני ההדגמה — שנו ערכים וראו איך התהליך מגיב.',
    },
    {
      id: `stage-${stage}-outputs`,
      title: 'התוצרים',
      caption: `בסיום השלב יש לכם: ${guide.outputs.join(', ')}.`,
      target: 'plan-stage-content',
      spotlight: { side: 'over' },
      duration: 6000,
    },
  ];
}

const flow: DemoFlow = {
  id: 'plan-stages',
  title: 'תכנון משכנתא בחמישה שלבים',
  description: 'שולחן העבודה של התהליך',
  route: '/demo/plan',
  exitRoute: '/',
  nextDemos: ['documents', 'scenarios', 'client-dashboard'],
  steps: [
    {
      id: 'header',
      title: 'התהליך שלכם',
      caption: 'כל משכנתא היא תהליך אחד עם שם, נכס וסכום — והוא נשמר לאורך כל הדרך, גם כשעוברים בין הכלים ובין הפגישות עם היועץ.',
      target: 'plan-header',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'rail',
      title: 'פס השלבים',
      caption: 'חמשת השלבים תמיד למעלה: איפה אתם עכשיו, מה הושלם, ומה עוד מחכה. לוחצים על שלב כדי לעבור אליו.',
      target: 'plan-stage-rail',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'vault',
      title: 'תיק המסמכים',
      caption: 'תיק המסמכים זמין מכל שלב — עם פס התקדמות שמראה כמה מהמסמכים שהבנק ידרוש כבר נאספו.',
      target: 'vault-button',
      spotlight: { side: 'bottom' },
    },
    ...PLAN_STAGES.flatMap((stage, index) => stageSteps(stage, index)),
    {
      id: 'end',
      title: 'מהניתוח ועד החתימה',
      caption: 'זה כל התהליך: חמישה שלבים, כלי ייעודי לכל אחד, והמסמכים והמשימות שלו — במקום אחד, בקצב שלכם, עם או בלי יועץ.',
      actions: [{ type: 'click', target: 'plan-stage-ANALYSIS' }],
      target: 'plan-stage-rail',
      spotlight: { side: 'bottom' },
      duration: 5500,
    },
  ],
};

export default flow;
