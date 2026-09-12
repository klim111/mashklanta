'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpLeft, UserCheck, Wand2 } from 'lucide-react';
import { journeyStages } from '@/data/platform/journey';
import {
  FULL_SERVICE_PRICE,
  PLATFORM_MONTHLY_PRICE,
} from '@/data/platform/pricing';
import AnimatedNumber from './AnimatedNumber';

const RECOMMENDED = ['mix', 'auction'];

export default function FlexibilityMixer() {
  const [advisorStages, setAdvisorStages] = useState<string[]>(RECOMMENDED);

  const toggle = (id: string) =>
    setAdvisorStages((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const { advisorCost, isFull, selfCount } = useMemo(() => {
    const raw = journeyStages
      .filter((s) => advisorStages.includes(s.id))
      .reduce((sum, s) => sum + s.advisorPrice, 0);
    const isFull = advisorStages.length === journeyStages.length;
    return {
      advisorCost: isFull ? FULL_SERVICE_PRICE : raw,
      isFull,
      selfCount: journeyStages.length - advisorStages.length,
    };
  }, [advisorStages]);

  const headline =
    advisorStages.length === 0
      ? 'אתם עושים הכל לבד'
      : isFull
        ? 'היועץ מלווה מקצה לקצה'
        : `${advisorStages.length} שלבים עם יועץ · ${selfCount} לבד`;

  return (
    <div dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-700">
          לחצו על כל שלב כדי להחליט מי מבצע אותו
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAdvisorStages([])}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              advisorStages.length === 0
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            המומלץ
          </button>
          <button
            type="button"
            onClick={() => setAdvisorStages(journeyStages.map((s) => s.id))}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              isFull ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ליווי מלא
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
                  ? 'border-violet-400 bg-violet-50/80 shadow-violet-100'
                  : 'border-blue-200 bg-blue-50/50 hover:border-blue-300'
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${stage.gradient}`} />

              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stage.gradient} text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-black text-gray-600">
                  {stage.number}/{journeyStages.length}
                </span>
              </div>

              <div className="mb-3 min-h-[2.75rem] text-sm font-black leading-snug text-gray-900">
                {stage.shortTitle}
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${
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

              <div className="mt-3 text-xs font-semibold text-gray-700">
                {withAdvisor ? (
                  <>₪{stage.advisorPrice.toLocaleString('he-IL')}</>
                ) : (
                  <>כלול במנוי</>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 text-white shadow-xl">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-white">{headline}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {advisorStages.length > 0 && (
                <span className="text-3xl font-black text-white">
                  <AnimatedNumber value={advisorCost} prefix="₪" live duration={500} />
                </span>
              )}
              {advisorStages.length > 0 && !isFull && (
                <span className="text-sm text-slate-200">ליועץ</span>
              )}
              {!isFull && (
                <span className="text-lg font-black text-cyan-200">
                  {advisorStages.length > 0 ? '+' : ''} ₪{PLATFORM_MONTHLY_PRICE}
                  <span className="mr-1 text-sm font-semibold text-slate-200">לחודש</span>
                </span>
              )}
              {isFull && (
                <span className="text-sm font-semibold text-emerald-200">כולל גישה לפלטפורמה</span>
              )}
            </div>
          </div>
          <Link
            href="/pricing#builder"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-gray-900 shadow-lg transition-colors hover:bg-blue-50"
          >
            בנו את החבילה המדויקת
            <ArrowUpLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
