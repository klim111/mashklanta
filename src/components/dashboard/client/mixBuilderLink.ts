import type { PlanView } from '@/components/plan/usePlan';

/** התהליך הפתוח שהלקוח עובד עליו עכשיו — האחרון שעודכן מבין אלה שלא הסתיימו */
export function activeProcess(plans: PlanView[]): PlanView | null {
  return (
    plans
      .filter((plan) => plan.status === 'IN_PROGRESS')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null
  );
}

/** התמהיל שנפתח בכלי, והנכס שהוא שייך אליו — לפי התהליך, או לפי הכתובת שנשמרה בו */
export interface MixBuilderTarget {
  mixId: string;
  planId?: string | null;
  propertyAddress?: string | null;
}

function ownProcess(plans: PlanView[], target: MixBuilderTarget): PlanView | null {
  if (target.planId) return plans.find((plan) => plan.id === target.planId) ?? null;
  const address = (target.propertyAddress ?? '').trim();
  if (!address) return null;
  return plans.find((plan) => (plan.propertyAddress ?? '').trim() === address) ?? null;
}

/**
 * לאן נכנסים לבניית תמהיל מהאזור האישי.
 *
 * כלי בניית התמהילים הוא שלב התמהיל בתהליך — חמשת השלבים, או המיחזור — עם
 * הפרטים שהלקוח הזין בשלבים. תמהיל שמור נפתח בתהליך שהוא שייך אליו, ותמהיל
 * בלי נכס נטען לתהליך הפתוח. רק כשאין תהליך בכלל נשאר הכלי לתמהילים ללא נכס.
 */
export function mixBuilderHref(plans: PlanView[], target?: MixBuilderTarget | null): string {
  const own = target ? ownProcess(plans, target) : null;
  const plan = own ?? activeProcess(plans);
  if (plan) {
    // תמהיל של נכס אחר לא נטען לתהליך הפתוח — השלב שלו מסנן אותו
    const carry = target && (own || !target.planId);
    const mix = carry ? `&mix=${encodeURIComponent(target.mixId)}` : '';
    return `/dashboard/plans/${plan.id}?stage=MIX${mix}`;
  }
  return target
    ? `/dashboard/mix-planner?mix=${encodeURIComponent(target.mixId)}`
    : '/dashboard/mix-planner';
}
