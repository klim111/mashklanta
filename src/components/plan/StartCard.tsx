'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  HeartHandshake,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import type { LeadTopic } from '@/lib/advisor-leads';
import { AdvisorLeadDialog } from './advisor/AdvisorLeadDialog';
import type { PlanView } from './usePlan';

type FoundOption = {
  id: string;
  label: string;
  hint: string;
  action: 'start' | 'lead';
  topic?: LeadTopic;
  gradient: string;
};

const FOUND_OPTIONS: FoundOption[] = [
  {
    id: 'start',
    label: 'נתחיל תהליך לקיחת משכנתא מהתחלה',
    hint: 'בונים פרופיל, תמהיל ואישור עקרוני — צעד אחר צעד',
    action: 'start',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'have-approval',
    label: 'יש לי כבר אישור עקרוני מבנק אחד לפחות',
    hint: 'נמשיך מכאן להתמחרות ולבחירת התמהיל הטוב ביותר',
    action: 'start',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'rejected',
    label: 'הבנק סירב לתת לי אישור עקרוני',
    hint: 'יועץ יבין למה, ויעזור לתקן לפני שמגישים שוב',
    action: 'lead',
    topic: 'FOUND_PROPERTY_REJECTED',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'dont-know',
    label: 'אני לא יודע ממה להתחיל — עזרו לי',
    hint: 'יועץ ילווה אתכם מהצעד הראשון',
    action: 'lead',
    topic: 'FOUND_PROPERTY_DONT_KNOW',
    gradient: 'from-violet-500 to-purple-600',
  },
];

/** פתיחת תהליך חדש ומעבר אליו — משותף לסקירה ולאזור המשכנתאות */
export function useStartPlan(start: () => Promise<PlanView>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const startPlan = async () => {
    setBusy(true);
    try {
      const plan = await start();
      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      // השגיאה מוצגת דרך usePlans
    } finally {
      setBusy(false);
    }
  };

  return { startPlan, busy };
}

/**
 * "איפה אתם בתהליך" — נקודת הכניסה לתהליך.
 *
 * הלקוח אומר קודם איפה הוא עומד. "מצאתי נכס" פורש ארבע אפשרויות: שתיים
 * שפותחות תהליך, ושתיים שפותחות טופס פנייה ליועץ. "בדיקת היתכנות" מובילה
 * לכלי ההיתכנות.
 *
 * `hero` הוא הכרטיס הגדול והכהה — כשעדיין אין תהליך, זה מרכז המסך.
 * `compact` הוא כרטיס לבן שיושב לצד מצב התהליכים כשכבר יש תהליך פתוח.
 */
export function StartCard({
  onStart,
  busy,
  hasPlans,
  variant = 'hero',
}: {
  onStart: () => void;
  busy: boolean;
  hasPlans: boolean;
  variant?: 'hero' | 'compact';
}) {
  const [foundOpen, setFoundOpen] = useState(false);
  const [leadTopic, setLeadTopic] = useState<LeadTopic | null>(null);
  const hero = variant === 'hero';

  const entryButton = hero
    ? 'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/15'
    : 'border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50/40';
  const entryOpen = hero ? 'border-blue-400 bg-blue-500/15' : 'border-blue-500 bg-blue-50';
  const entryHint = hero ? 'text-white/60' : 'text-slate-500';
  const optionCard = hero
    ? 'border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10'
    : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-white';
  const optionLabel = hero ? 'text-white' : 'text-slate-900';
  const optionHint = hero ? 'text-white/55' : 'text-slate-500';

  const dialog = (
    <AdvisorLeadDialog
      open={leadTopic !== null}
      onOpenChange={(next) => {
        if (!next) setLeadTopic(null);
      }}
      topic={leadTopic ?? 'OTHER'}
    />
  );

  const entries = (
    <div className={`grid gap-3 ${hero ? 'sm:grid-cols-2' : ''}`}>
      <button
        type="button"
        onClick={() => setFoundOpen((v) => !v)}
        aria-expanded={foundOpen}
        className={`group flex items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 text-right transition-all ${
          foundOpen ? entryOpen : entryButton
        }`}
      >
        <span>
          <span className="flex items-center gap-2 text-lg font-black">
            <MapPin className="h-5 w-5" />
            מצאתי נכס
          </span>
          <span className={`mt-0.5 block text-sm ${entryHint}`}>יש נכס על השולחן — נתקדם איתו</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${foundOpen ? 'rotate-180' : ''}`} />
      </button>

      <Link
        href="/mortgage-planning?flow=affordability"
        className={`group flex items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 text-right transition-all ${entryButton}`}
      >
        <span>
          <span className="flex items-center gap-2 text-lg font-black">
            <Search className="h-5 w-5" />
            מעוניין לבדוק היתכנות רכישת נכס
          </span>
          <span className={`mt-0.5 block text-sm ${entryHint}`}>נחשב לאיזה מחיר אפשר לכוון</span>
        </span>
        <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-1" />
      </Link>
    </div>
  );

  const options = (
    <AnimatePresence initial={false}>
      {foundOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className={`mt-3 grid gap-2.5 ${hero ? 'sm:grid-cols-2' : ''}`}>
            {FOUND_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (option.action === 'start') onStart();
                  else if (option.topic) setLeadTopic(option.topic);
                }}
                className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all hover:-translate-y-0.5 disabled:opacity-60 ${optionCard}`}
              >
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${option.gradient}`}
                >
                  {option.action === 'start' ? (
                    busy ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <ArrowLeft className="h-5 w-5 text-white" />
                    )
                  ) : (
                    <HeartHandshake className="h-5 w-5 text-white" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[15px] font-black leading-snug ${optionLabel}`}>{option.label}</span>
                  <span className={`mt-0.5 block text-[13px] leading-snug ${optionHint}`}>{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!hero) {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-4 py-3 text-center">
          <h2 className="flex items-center justify-center gap-2 text-lg font-black text-slate-900">
            <Sparkles className="h-5 w-5 text-blue-600" />
            {hasPlans ? 'מתכננים משכנתא נוספת?' : 'איפה אתם בתהליך?'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">בחרו את המצב שמתאים לכם ונתאים את הצעד הבא</p>
        </header>
        <div className="flex-1 p-4">
          {entries}
          {options}
        </div>
        <footer className="border-t border-slate-100 px-4 py-3 text-center">
          <Link
            href="/mortgage-refinance"
            className="inline-flex items-center gap-2 text-sm font-black text-blue-600 hover:underline"
          >
            <RefreshCw className="h-4 w-4" />
            יש לכם משכנתא? בדקו מיחזור
          </Link>
        </footer>
        {dialog}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-xl md:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-violet-600/25 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[13px] font-black text-white/80 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          משכלנתא מלווה אתכם מהצעד הראשון ועד החתימה
        </span>
        <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl">
          {hasPlans ? 'מתכננים משכנתא נוספת? איפה אתם בתהליך?' : 'איפה אתם בתהליך?'}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-white/65">
          נתחיל מהמקום שבו אתם נמצאים. בחרו את המצב שמתאים לכם, ונתאים לכם את הצעד הבא.
        </p>

        <div className="mt-6 text-right">
          {entries}
          {options}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {PLAN_STAGES.map((stage, index) => (
            <span
              key={stage}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold text-white/75"
            >
              <span className="text-white/40">{index + 1}</span>
              {journeyStageFor(stage).shortTitle}
            </span>
          ))}
        </div>
        <Link
          href="/mortgage-refinance"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-black text-white transition-all hover:bg-white/15"
        >
          <RefreshCw className="h-4 w-4" />
          יש לכם כבר משכנתא? בדקו מיחזור
        </Link>
      </div>

      {dialog}
    </section>
  );
}
