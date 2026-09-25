'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpLeft, UserCheck, Wand2 } from 'lucide-react';
import { journeyStages } from '@/data/platform/journey';
import { ADVISORY_TRACK, PLATFORM_PROCESS_PRICE } from '@/data/platform/pricing';

const RECOMMENDED = ['mix', 'auction'];

export default function FlexibilityMixer() {
  const [advisorStages, setAdvisorStages] = useState<string[]>(RECOMMENDED);

  const toggle = (id: string) =>
    setAdvisorStages((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const { isFull, selfCount } = useMemo(
    () => ({
      isFull: advisorStages.length === journeyStages.length,
      selfCount: journeyStages.length - advisorStages.length,
    }),
    [advisorStages]
  );

  const headline =
    advisorStages.length === 0
      ? 'אתם עושים הכל לבד'
      : isFull
        ? 'היועץ מלווה בכל שלבי התכנון'
        : `${advisorStages.length} שלבים עם יועץ · ${selfCount} לבד`;

  return (
    <div dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          לחצו על כל שלב כדי להחליט מי מבצע אותו
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAdvisorStages([])}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              advisorStages.length === 0
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            הכל לבד
          </button>
          <button
            type="button"
            onClick={() => setAdvisorStages(RECOMMENDED)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              advisorStages.length === RECOMMENDED.length &&
              RECOMMENDED.every((id) => advisorStages.includes(id))
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            המומלץ
          </button>
          <button
            type="button"
            onClick={() => setAdvisorStages(journeyStages.map((s) => s.id))}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              isFull ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            כל השלבים
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {journeyStages.map((stage, index) => {
          const withAdvisor = advisorStages.includes(stage.id);
          const Icon = stage.icon;
          return (
            <motion.button
              key={stage.id}
              type="button"
              onClick={() => toggle(stage.id)}
              aria-pressed={withAdvisor}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-right shadow-md transition-all ${
                withAdvisor
                  ? 'border-violet-400 bg-violet-50 shadow-violet-100'
                  : 'border-blue-200 bg-blue-50 hover:border-blue-300'
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${stage.gradient}`} />

              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stage.gradient} text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-2xs font-black text-slate-600">
                  {stage.number}/{journeyStages.length}
                </span>
              </div>

              <div className="mb-3 min-h-[2.75rem] text-sm font-black leading-snug text-slate-900">
                {stage.shortTitle}
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-black ${
                  withAdvisor
                    ? 'bg-violet-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {withAdvisor ? (
                  <>
                    <UserCheck className="h-3 w-3" />
                    היועץ
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3" />
                    אני
                  </>
                )}
              </span>

              <div className="mt-3 text-xs font-semibold text-slate-700">
                {withAdvisor ? <>לפי מורכבות התיק</> : <>כלול בגישה</>}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-xl">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-white">{headline}</div>
            <div className="mt-1 text-sm leading-relaxed text-slate-200">
              {advisorStages.length === 0
                ? `₪${PLATFORM_PROCESS_PRICE} לתהליך משכנתא, גישה מלאה לכל הכלים`
                : `${ADVISORY_TRACK.priceNote}. ${ADVISORY_TRACK.credit}.`}
            </div>
          </div>
          <Link
            href="/pricing#advisory"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-button font-black text-slate-900 shadow-lg transition-colors hover:bg-blue-50"
          >
            איך נקבע מחיר הליווי
            <ArrowUpLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
