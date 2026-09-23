'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Lightbulb,
  Lock,
  MousePointerClick,
  PackageCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/lib/service-flow';
import { journeyStageFor } from '@/data/platform/planStages';
import { STAGE_GUIDE, stageGuideTools } from '@/data/platform/stageGuide';
import { PricingModelStrip } from '@/components/service-flow/PricingModelStrip';

/** מספר השינויים שאפשר לעשות בכלי לפני שמסך ההסבר חוזר */
export const TOUR_FREE_CHANGES = 3;

/** אינדקס "המסך האחרון" — ההצעה לרכישת גישה, אחרי חמשת השלבים */
export const TOUR_OFFER_INDEX = PLAN_STAGES.length;

export interface PlanTourProps {
  /** 0–4 הם השלבים, 5 הוא מסך ההצעה */
  index: number;
  onIndexChange: (index: number) => void;
  /** "נסו את השלב" — סוגר את ההסבר ומשאיר את הכלי פתוח */
  onTry: () => void;
  /** למה חזרנו למסך: אחרי שלושה שינויים בכלי */
  returnedAfterChanges?: boolean;
}

/**
 * מסכי ההסבר הצפים של הסיור.
 *
 * דף אחד לכל שלב — המטרה, החשיבות, הכלים והתוצרים — עם חצים קדימה ואחורה
 * (גם במקלדת). מתחת למסך רואים את הכלי עצמו; "נסו את השלב" פותח אותו לשלושה
 * שינויים, ואז ההסבר חוזר. אחרי השלב החמישי מגיע מסך ההצעה.
 */
/**
 * באילו שלבים אפשר לנסות את הכלי בסיור. שלב האישור העקרוני מוצג כמסך סופי
 * לדוגמה בלבד — עם האישורים מהבנקים — וכל לחיצה בו מחזירה להסבר.
 */
export function tourAllowsTry(stage: PlanStageId): boolean {
  return stage !== 'APPLICATIONS';
}

export function PlanTour({ index, onIndexChange, onTry, returnedAfterChanges = false }: PlanTourProps) {
  const isOffer = index >= TOUR_OFFER_INDEX;
  const stage: PlanStageId = PLAN_STAGES[Math.min(index, PLAN_STAGES.length - 1)];
  const canTry = tourAllowsTry(stage);
  const journey = journeyStageFor(stage);
  const guide = STAGE_GUIDE[stage];
  const tools = stageGuideTools(stage);
  const Icon = journey.icon;

  const prev = () => onIndexChange(Math.max(0, index - 1));
  const next = () => onIndexChange(Math.min(TOUR_OFFER_INDEX, index + 1));

  // ניווט במקלדת: בעברית "הבא" הוא שמאלה
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') next();
      if (event.key === 'ArrowRight') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div dir="rtl" className="fixed inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]"
        aria-hidden
      />

      <div className="relative w-full max-w-3xl">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isOffer ? 'offer' : stage}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.28 }}
            role="dialog"
            aria-modal="true"
            className="max-h-[88vh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            {isOffer ? (
              <OfferScreen onBack={prev} />
            ) : (
              <>
                <div className={`h-2 w-full bg-gradient-to-l ${journey.gradient}`} />
                <div className="p-6 md:p-8">
                  {!canTry && (
                    <p className="mb-4 flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-900">
                      <Lock className="h-4 w-4 shrink-0 text-sky-600" />
                      בשלב הזה מוצג המסך הסופי לדוגמה — האישורים העקרוניים משלושה בנקים על תמהיל לדוגמה.
                      כל לחיצה על המסך מחזירה להסבר.
                    </p>
                  )}
                  {returnedAfterChanges && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900"
                    >
                      <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                      זו הצצה בלבד: אחרי {TOUR_FREE_CHANGES} שינויים בכלי חוזרים להסבר. הגישה המלאה נפתחת
                      בסוף הסיור.
                    </motion.p>
                  )}

                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${journey.gradient} shadow-lg`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-400">
                        שלב {index + 1} מתוך {PLAN_STAGES.length} · {journey.duration}
                      </div>
                      <h2 className="text-title font-black leading-tight text-slate-900">
                        {journey.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{journey.tagline}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <GuideBlock icon={<Crosshair className="h-4 w-4" />} title="המטרה" tone="blue">
                      <ul className="space-y-1.5">
                        {guide.goals.map((goal) => (
                          <li key={goal} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </GuideBlock>

                    <GuideBlock icon={<Lightbulb className="h-4 w-4" />} title="למה זה חשוב" tone="amber">
                      <p className="text-sm leading-relaxed text-slate-700">{guide.importance}</p>
                    </GuideBlock>

                    <GuideBlock icon={<Wrench className="h-4 w-4" />} title="הכלים שעומדים לרשותכם" tone="violet">
                      <div className="flex flex-wrap gap-1.5">
                        {tools.map((tool) => {
                          const ToolIcon = tool.icon;
                          return (
                            <span
                              key={tool.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-2xs font-bold text-slate-700 ring-1 ring-slate-200"
                            >
                              <ToolIcon className="h-3 w-3 text-violet-600" />
                              {tool.title}
                            </span>
                          );
                        })}
                      </div>
                    </GuideBlock>

                    <GuideBlock icon={<PackageCheck className="h-4 w-4" />} title="התוצרים של השלב" tone="emerald">
                      <ul className="space-y-1.5">
                        {guide.outputs.map((output) => (
                          <li key={output} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {output}
                          </li>
                        ))}
                      </ul>
                    </GuideBlock>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-2">
                      <NavButton onClick={prev} disabled={index === 0} label="השלב הקודם">
                        <ChevronRight className="h-4 w-4" />
                        השלב הקודם
                      </NavButton>
                      <Dots index={index} onSelect={onIndexChange} />
                      <NavButton onClick={next} label="השלב הבא" primary>
                        {index === PLAN_STAGES.length - 1 ? 'לסיום הסיור' : 'השלב הבא'}
                        <ChevronLeft className="h-4 w-4" />
                      </NavButton>
                    </div>

                    <button
                      type="button"
                      onClick={onTry}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-button font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <MousePointerClick className="h-4 w-4" />
                      {canTry ? 'נסו את השלב' : 'הציצו במסך לדוגמה'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function OfferScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative overflow-hidden">
      <div className="relative bg-slate-950 px-6 py-8 text-white md:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-violet-600/30 blur-3xl" />
        </div>
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-2xs font-black text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            סיימתם את הסיור
          </span>
          <h2 className="mt-3 text-title font-black leading-tight">
            גישה לכל השלבים והכלים לבניית המשכנתא שלכם באמצעות פלטפורמת משכלתנא
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <span className="text-5xl font-black">₪{PLATFORM_PROCESS_PRICE}</span>
            <span className="pb-2 text-sm font-bold text-white/70">לתהליך משכנתא · {PLATFORM_ACCESS_DAYS} יום גישה מלאה</span>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
            חמשת השלבים, כל הכלים והמחשבונים, שמירה אוטומטית בחשבון — בלי הגבלות. ואם באמצע הדרך
            תרצו יועץ, מה ששילמתם מקוזז ממחיר הליווי.
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <p className="mb-3 text-2xs font-black text-slate-400">כך עובד התמחור</p>
        <PricingModelStrip compact className="!grid-cols-1 sm:!grid-cols-2" />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <NavButton onClick={onBack} label="חזרה לשלב האחרון">
              <ChevronRight className="h-4 w-4" />
              חזרה להסבר
            </NavButton>
            <Link
              href="/dashboard"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
            >
              לאזור האישי
            </Link>
          </div>
          <Link
            href="/dashboard/checkout?next=plan"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-blue-500 to-violet-600 px-7 py-3.5 text-cta font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl"
          >
            קבל גישה
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

const BLOCK_TONES = {
  blue: 'border-blue-100 bg-blue-50/60 text-blue-700',
  amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
  violet: 'border-violet-100 bg-violet-50/60 text-violet-700',
  emerald: 'border-emerald-100 bg-emerald-50/60 text-emerald-700',
} as const;

function GuideBlock({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: keyof typeof BLOCK_TONES;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border p-4 ${BLOCK_TONES[tone]}`}>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-black">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  primary,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-black transition-all disabled:opacity-30 ${
        primary
          ? 'bg-slate-900 text-white shadow-md hover:bg-slate-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

function Dots({ index, onSelect }: { index: number; onSelect: (index: number) => void }) {
  return (
    <div className="hidden items-center gap-1.5 px-1 sm:flex">
      {PLAN_STAGES.map((stage, dot) => (
        <button
          key={stage}
          type="button"
          onClick={() => onSelect(dot)}
          aria-label={`שלב ${dot + 1}`}
          className={`h-2 rounded-full transition-all ${
            dot === index ? 'w-6 bg-slate-900' : 'w-2 bg-slate-300 hover:bg-slate-400'
          }`}
        />
      ))}
    </div>
  );
}
