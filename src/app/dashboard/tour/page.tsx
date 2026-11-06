import { PlanWorkspace } from '@/components/plan/PlanWorkspace';
import { DEMO_PLAN_ID } from '@/components/plan/usePlan';

export const metadata = {
  title: 'סיור בכלי תכנון המשכנתא',
};

/**
 * הסיור בכלי: אותו שולחן עבודה כמו בתהליך אמיתי, על תהליך הדגמה שחי בדפדפן
 * בלבד, עם מסכי ההסבר הצפים מעל. בסופו — ההצעה לרכישת גישה.
 */
export default function PlanTourPage() {
  return <PlanWorkspace planId={DEMO_PLAN_ID} tour />;
}
