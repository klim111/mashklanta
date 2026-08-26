'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Compass,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PLAN_STAGES, stageIndex } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { usePlans } from './usePlan';
import type { PlanView } from './usePlan';
import { formatDate, formatShekel } from './ui';

function planPlaceLabel(plan: PlanView): string {
  if (plan.propertyAddress) return plan.propertyAddress;
  if (plan.mortgageAmount) return `משכנתא ${formatShekel(plan.mortgageAmount)}`;
  return 'טרם הוזנו פרטי הנכס';
}

/**
 * מרכז תהליכי המשכנתא באזור האישי: פתיחת תהליך חדש, המשך תהליכים פעילים,
 * והמשכנתאות שכבר תוכננו במלואן.
 */
export function PlansOverview() {
  const router = useRouter();
  const { plans, ready, error, start, remove } = usePlans();
  const [starting, setStarting] = useState(false);

  const active = plans.filter((plan) => plan.status === 'IN_PROGRESS');
  const completed = plans.filter((plan) => plan.status === 'COMPLETED');

  const startPlan = async () => {
    setStarting(true);
    try {
      const plan = await start();
      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      // השגיאה מוצגת דרך usePlans
    } finally {
      setStarting(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <StartCard onStart={startPlan} busy={starting} hasPlans={plans.length > 0} />

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      {!ready ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <SectionTitle
                icon={<Compass className="h-4 w-4 text-blue-600" />}
                title="משכנתאות בתהליך"
                count={active.length}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <AnimatePresence initial={false}>
                  {active.map((plan) => (
                    <ActivePlanCard key={plan.id} plan={plan} onRemove={() => void remove(plan.id)} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <SectionTitle
                icon={<BadgeCheck className="h-4 w-4 text-emerald-600" />}
                title="משכנתאות שתוכננו"
                count={completed.length}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <AnimatePresence initial={false}>
                  {completed.map((plan) => (
                    <CompletedPlanCard key={plan.id} plan={plan} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-black text-slate-900">
      {icon}
      {title}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
        {count}
      </span>
    </h2>
  );
}

function StartCard({
  onStart,
  busy,
  hasPlans,
}: {
  onStart: () => void;
  busy: boolean;
  hasPlans: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-xl md:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            חמישה שלבים · הכל נשמר בחשבון שלכם
          </span>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white md:text-3xl">
            {hasPlans ? 'מתכננים משכנתא נוספת?' : 'התחילו לתכנן את המשכנתא שלכם'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            דשבורד אחד שמלווה אתכם מהניתוח הפיננסי ועד החתימה בבנק. כל שלב פותח את הכלים
            שמתאימים לו, וכל נתון שתזינו עובר אוטומטית לשלבים הבאים.
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {PLAN_STAGES.map((stage, index) => {
              const journey = journeyStageFor(stage);
              return (
                <span
                  key={stage}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70"
                >
                  <span className="text-white/40">{index + 1}</span>
                  {journey.shortTitle}
                </span>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-l from-blue-500 to-violet-600 px-7 py-4 text-base font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          התחל תכנון משכנתא חדשה
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>
    </div>
  );
}

function ActivePlanCard({ plan, onRemove }: { plan: PlanView; onRemove: () => void }) {
  const journey = journeyStageFor(plan.currentStage);
  const step = stageIndex(plan.currentStage) + 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className={`h-1.5 w-full bg-gradient-to-l ${journey.gradient}`} />

      <Link href={`/dashboard/plans/${plan.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-slate-900">{plan.name}</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {planPlaceLabel(plan)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full bg-gradient-to-l ${journey.gradient} px-3 py-1 text-[11px] font-black text-white`}
          >
            שלב {step} · {journey.shortTitle}
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-400">התקדמות</span>
            <span className="text-slate-700">{plan.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-l ${journey.gradient}`}
              initial={{ width: 0 }}
              animate={{ width: `${plan.progress}%` }}
              transition={{ type: 'spring', stiffness: 110, damping: 22 }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
          <Stat label="שווי הנכס" value={formatShekel(plan.propertyValue)} />
          <Stat label="משכנתא" value={formatShekel(plan.mortgageAmount)} />
          <Stat label="החזר חודשי" value={formatShekel(plan.monthlyPayment)} />
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-blue-600">
          המשיכו מהמקום שעצרתם
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </span>
      </Link>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('להסיר את התהליך מהאזור האישי? ההיסטוריה נשמרת, אבל הוא לא יוצג יותר ברשימה.')) {
            onRemove();
          }
        }}
        aria-label="הסרת התהליך"
        className="absolute bottom-4 left-4 rounded-lg p-2 text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function CompletedPlanCard({ plan }: { plan: PlanView }) {
  const signing = plan.data.SIGNING;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <Link href={`/dashboard/plans/${plan.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-slate-900">{plan.name}</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {planPlaceLabel(plan)}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black text-white">
            <BadgeCheck className="h-3.5 w-3.5" />
            תוכננה במלואה
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="משכנתא" value={formatShekel(plan.mortgageAmount)} />
          <Stat label="החזר חודשי" value={formatShekel(plan.monthlyPayment)} />
          <Stat
            label="ריבית ממוצעת"
            value={
              signing.finalAverageRate !== null ? `${signing.finalAverageRate.toFixed(2)}%` : '—'
            }
          />
          <Stat label="תאריך חתימה" value={formatDate(signing.signingDate)} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-emerald-200/70 pt-4">
          {signing.bank && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <Building2 className="h-3.5 w-3.5" />
              {signing.bank}
            </span>
          )}
          {plan.completedAt && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
              <CalendarCheck className="h-3.5 w-3.5" />
              הושלם ב-{formatDate(plan.completedAt)}
            </span>
          )}
          <span className="mr-auto inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
            לצפייה בתהליך
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-400">{label}</div>
      <div className="text-sm font-black tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
