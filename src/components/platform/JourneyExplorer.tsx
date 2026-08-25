'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  UserCheck,
  Wand2,
} from 'lucide-react';
import { journeyStages } from '@/data/platform/journey';

type Performer = 'advisor' | 'self';

const AUTOPLAY_MS = 9000;

export default function JourneyExplorer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [performer, setPerformer] = useState<Performer>('advisor');
  const [autoplay, setAutoplay] = useState(true);

  const stage = journeyStages[activeIndex];
  const Icon = stage.icon;

  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(
      () => setActiveIndex((i) => (i + 1) % journeyStages.length),
      AUTOPLAY_MS
    );
    return () => clearTimeout(timer);
  }, [autoplay, activeIndex]);

  const select = (index: number) => {
    setAutoplay(false);
    setActiveIndex((index + journeyStages.length) % journeyStages.length);
  };

  const progress = (activeIndex / (journeyStages.length - 1)) * 100;

  return (
    <div dir="rtl" className="w-full">
      {/* Stage rail */}
      <div className="relative mb-10">
        <div className="absolute top-7 right-[10%] left-[10%] h-1 bg-gray-200 rounded-full hidden md:block" />
        <motion.div
          className="absolute top-7 right-[10%] h-1 bg-gradient-to-l from-blue-500 via-violet-500 to-amber-500 rounded-full hidden md:block"
          animate={{ width: `${progress * 0.8}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />

        <ol className="relative flex gap-3 md:gap-0 overflow-x-auto md:overflow-visible pb-2 md:grid md:grid-cols-5 snap-x">
          {journeyStages.map((s, index) => {
            const isActive = index === activeIndex;
            const isPassed = index < activeIndex;
            return (
              <li key={s.id} className="snap-center shrink-0 w-[62%] sm:w-[38%] md:w-auto">
                <button
                  type="button"
                  onClick={() => select(index)}
                  aria-current={isActive ? 'step' : undefined}
                  className="group w-full flex flex-col items-center text-center focus:outline-none"
                >
                  <motion.span
                    animate={{ scale: isActive ? 1.12 : 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black shadow-lg transition-colors ${
                      isActive
                        ? `bg-gradient-to-br ${s.gradient} text-white shadow-xl`
                        : isPassed
                          ? 'bg-white text-gray-700 border-2 border-gray-300'
                          : 'bg-white text-gray-600 border-2 border-gray-200 group-hover:border-blue-300 group-hover:text-blue-600'
                    }`}
                  >
                    {isPassed ? <Check className="h-6 w-6 text-emerald-600" /> : s.number}
                    {isActive && (
                      <motion.span
                        layoutId="stage-halo"
                        className="absolute -inset-2 rounded-3xl border-2 border-blue-400/40"
                      />
                    )}
                  </motion.span>
                  <span
                    className={`mt-3 text-sm font-bold leading-snug transition-colors ${
                      isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                    }`}
                  >
                    {s.shortTitle}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Detail panel */}
      <div className="relative rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className={`h-1.5 w-full bg-gradient-to-l ${stage.gradient}`} />

        <div className="p-6 md:p-10">
          {/* Panel header */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${stage.gradient} shadow-lg`}
              >
                <Icon className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="mb-1 text-sm font-bold text-gray-600">
                  שלב {stage.number} מתוך {journeyStages.length}
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                  {stage.title}
                </h3>
                <p className="mt-2 text-gray-600">{stage.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                    <Clock className="h-3.5 w-3.5" />
                    {stage.duration}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                    <UserCheck className="h-3.5 w-3.5" />
                    עם יועץ · ₪{stage.advisorPrice.toLocaleString('he-IL')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    <Wand2 className="h-3.5 w-3.5" />
                    לבד · כלול במנוי
                  </span>
                </div>
              </div>
            </div>

            {/* Performer toggle */}
            <div className="shrink-0">
              <div className="mb-2 text-xs font-bold text-gray-600 md:text-left">מי מבצע את השלב?</div>
              <div className="relative z-0 flex rounded-2xl bg-gray-100 p-1">
                {(
                  [
                    { id: 'advisor' as const, label: 'היועץ', icon: UserCheck },
                    { id: 'self' as const, label: 'אני, בפלטפורמה', icon: Wand2 },
                  ]
                ).map((option) => {
                  const OptionIcon = option.icon;
                  const selected = performer === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setPerformer(option.id);
                        setAutoplay(false);
                      }}
                      className={`relative z-10 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                        selected ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      {selected && (
                        <motion.span
                          layoutId="performer-pill"
                          className="absolute inset-0 z-0 rounded-xl bg-gray-900"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <OptionIcon className="relative z-10 h-4 w-4" />
                      <span className="relative z-10">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel body */}
          <div className="mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${stage.id}-${performer}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="grid gap-6 lg:grid-cols-5"
              >
                {performer === 'advisor' ? (
                  <>
                    <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-6">
                      <h4 className="mb-4 text-lg font-bold text-gray-900">
                        מה היועץ עושה בפועל
                      </h4>
                      <ul className="space-y-3">
                        {stage.advisorActions.map((action, i) => (
                          <motion.li
                            key={action}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.08 * i }}
                            className="flex items-start gap-3"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                              <Check className="h-3 w-3 text-emerald-600" />
                            </span>
                            <span className="text-gray-700 leading-relaxed">{action}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className={`lg:col-span-2 rounded-2xl bg-gradient-to-br ${stage.gradient} p-6 text-white shadow-lg`}
                    >
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" />
                        הערך המוסף ללקוח
                      </div>
                      <h4 className="mb-3 text-2xl font-black leading-tight text-white">
                        {stage.valueHeadline}
                      </h4>
                      <p className="leading-relaxed text-white">{stage.valueDescription}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="lg:col-span-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-6">
                      <h4 className="mb-2 text-lg font-bold text-gray-900">
                        איך עושים את זה לבד בפלטפורמה
                      </h4>
                      <p className="mb-4 text-gray-600 leading-relaxed">
                        {stage.selfServiceSummary}
                      </p>
                      <ul className="space-y-3">
                        {stage.selfServiceSteps.map((step, i) => (
                          <motion.li
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.08 * i }}
                            className="flex items-start gap-3"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                              {i + 1}
                            </span>
                            <span className="text-gray-700 leading-relaxed">{step}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
                      <h4 className="mb-4 text-lg font-bold text-gray-900">
                        הכלים שמחכים לכם
                      </h4>
                      <div className="space-y-2">
                        {stage.tools.map((tool, i) => (
                          <motion.div
                            key={tool.href + tool.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 * i }}
                          >
                            <Link
                              href={tool.href}
                              className="group flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 transition-all hover:border-blue-300 hover:bg-blue-50"
                            >
                              <span className="font-semibold text-gray-800 group-hover:text-blue-700">
                                {tool.label}
                              </span>
                              <ArrowUpLeft className="h-4 w-4 text-gray-400 transition-transform group-hover:-translate-y-0.5 group-hover:text-blue-600" />
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Panel footer navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => select(activeIndex - 1)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronRight className="h-4 w-4" />
              השלב הקודם
            </button>

            <div className="flex gap-1.5">
              {journeyStages.map((s, index) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => select(index)}
                  aria-label={s.shortTitle}
                  className={`h-2 rounded-full transition-all ${
                    index === activeIndex ? 'w-8 bg-gray-900' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => select(activeIndex + 1)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              השלב הבא
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
