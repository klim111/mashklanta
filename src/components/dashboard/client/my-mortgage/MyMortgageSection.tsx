'use client';

import type { PlanView } from '@/components/plan/usePlan';
import { EmptyHint } from '@/components/plan/ui';
import { MyMortgageTracker } from './MyMortgageTracker';

/** המשכנתאות שהתהליך שלהן הסתיים — מהחדשה לישנה */
export function completedPlans(plans: PlanView[]): PlanView[] {
  return plans
    .filter((plan) => plan.status === 'COMPLETED')
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
}

/**
 * אזור "המשכנתא שלי" באזור האישי. מופיע אחרי שהלקוח סיים את שלב 5 וחתם בבנק.
 * כשיש יותר ממשכנתא אחת, בוחרים ביניהן בראש האזור.
 */
export function MyMortgageSection({
  plans,
  planId,
  onSelect,
}: {
  plans: PlanView[];
  planId: string | null;
  onSelect: (planId: string) => void;
}) {
  const completed = completedPlans(plans);
  const current = completed.find((plan) => plan.id === planId) ?? completed[0] ?? null;

  if (!current) {
    return <EmptyHint>המשכנתא תופיע כאן אחרי שתסיימו את שלב 5 ותחתמו על המשכנתא בבנק.</EmptyHint>;
  }

  return (
    <div className="space-y-4">
      {completed.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {completed.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                plan.id === current.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'
              }`}
            >
              {plan.propertyAddress || plan.name}
            </button>
          ))}
        </div>
      )}
      <MyMortgageTracker key={current.id} planId={current.id} />
    </div>
  );
}
