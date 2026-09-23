'use client';

import { motion } from 'framer-motion';
import { Check, Gavel, Lightbulb, TrendingUp, Undo2 } from 'lucide-react';
import { planRecommendations } from '@/lib/client-agenda';
import type { AgendaPlan, ClientTaskState, PlanRecommendation } from '@/lib/client-agenda';

const ICONS: Record<string, typeof Gavel> = {
  lawyer: Gavel,
  appraisal: Lightbulb,
  'free-income': TrendingUp,
};

function iconFor(recommendation: PlanRecommendation) {
  const suffix = recommendation.key.split(':').pop() ?? '';
  return ICONS[suffix] ?? Lightbulb;
}

/**
 * ההערות למשכנתא שכבר נפתחה.
 *
 * מה שהיה כאן קודם הוא כפתור לפתיחת משכנתא נוספת; ללקוח שכבר יש משכנתא בתהליך
 * מה שחשוב מתחת לשורה שלה הוא מה כדאי לעשות עכשיו — וכל הערה נסגרת בלחיצה על
 * "בוצע", שנשמרת בחשבון ולא נעלמת בטעינה הבאה.
 */
export function PlanRecommendations({
  plans,
  states,
  onDone,
}: {
  plans: AgendaPlan[];
  states: Record<string, ClientTaskState>;
  onDone: (key: string, done: boolean) => void;
}) {
  const rows = plans.flatMap((plan) =>
    planRecommendations(plan).map((recommendation) => ({
      plan,
      recommendation,
      key: `note:${recommendation.key}`,
    }))
  );

  if (rows.length === 0) return null;

  const multiplePlans = plans.length > 1;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="mb-3 text-center text-sm font-black text-slate-500">
        הערות והמלצות למשכנתא שלכם
      </p>
      <div className="space-y-2">
        {rows.map(({ plan, recommendation, key }) => {
          const done = Boolean(states[key]?.done);
          const Icon = iconFor(recommendation);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-wrap items-start gap-3 rounded-2xl border-2 p-3.5 transition-colors ${
                done
                  ? 'border-emerald-200 bg-emerald-50'
                  : recommendation.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : recommendation.tone === 'warning'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-900 text-white'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-info font-black leading-snug ${
                    done ? 'text-emerald-800 line-through' : 'text-slate-900'
                  }`}
                >
                  {recommendation.title}
                </span>
                <span
                  className={`mt-0.5 block text-sm font-medium leading-relaxed ${
                    done ? 'text-emerald-700/70 line-through' : 'text-slate-600'
                  }`}
                >
                  {recommendation.hint}
                </span>
                {multiplePlans && (
                  <span className="mt-1 block text-2xs font-bold text-slate-400">
                    {plan.propertyAddress?.trim() || plan.name}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onDone(key, !done)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black transition-colors ${
                  done
                    ? 'border-2 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {done ? (
                  <>
                    <Undo2 className="h-4 w-4" />
                    ביטול
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    בוצע
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
