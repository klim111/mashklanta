'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Info, Sparkles, TrendingDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import AnimatedNumber from './AnimatedNumber';

/** Typical weighted effective rate of a first, un-negotiated bank offer */
const DEFAULT_RATE = 0.054;
/** Typical weighted effective rate after mix optimisation and a rate auction */
const OPTIMISED_RATE = 0.0465;

const monthlyPayment = (principal: number, annualRate: number, years: number) => {
  const r = annualRate / 12;
  const n = years * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
};

export default function DefaultVsAdvisor() {
  const [amount, setAmount] = useState(1_200_000);
  const [years, setYears] = useState(25);

  const { basePayment, optimisedPayment, baseTotal, optimisedTotal, saving, barRatio } =
    useMemo(() => {
      const basePayment = monthlyPayment(amount, DEFAULT_RATE, years);
      const optimisedPayment = monthlyPayment(amount, OPTIMISED_RATE, years);
      const baseTotal = basePayment * years * 12;
      const optimisedTotal = optimisedPayment * years * 12;
      return {
        basePayment,
        optimisedPayment,
        baseTotal,
        optimisedTotal,
        saving: baseTotal - optimisedTotal,
        barRatio: optimisedTotal / baseTotal,
      };
    }, [amount, years]);

  return (
    <div dir="rtl" className="rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl md:p-10">
      {/* Controls */}
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <label className="text-sm font-bold text-gray-700">סכום המשכנתא</label>
            <span className="text-xl font-black text-gray-900">
              ₪{amount.toLocaleString('he-IL')}
            </span>
          </div>
          <Slider
            value={[amount]}
            onValueChange={([v]) => setAmount(v)}
            min={300_000}
            max={3_000_000}
            step={50_000}
            aria-label="סכום המשכנתא"
          />
          <div className="mt-2 flex justify-between text-xs text-gray-600">
            <span>₪3,000,000</span>
            <span>₪300,000</span>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <label className="text-sm font-bold text-gray-700">תקופה</label>
            <span className="text-xl font-black text-gray-900">{years} שנים</span>
          </div>
          <Slider
            value={[years]}
            onValueChange={([v]) => setYears(v)}
            min={10}
            max={30}
            step={1}
            aria-label="תקופת המשכנתא"
          />
          <div className="mt-2 flex justify-between text-xs text-gray-600">
            <span>30 שנים</span>
            <span>10 שנים</span>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        {/* Default */}
        <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-300">
              <Building2 className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <div className="font-black text-gray-900">ברירת המחדל</div>
              <div className="text-xs text-gray-600">ההצעה הראשונה של הבנק</div>
            </div>
          </div>

          <div className="mb-5 h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-full bg-gradient-to-l from-gray-400 to-gray-500" />
          </div>

          <dl className="space-y-3">
            <div className="flex items-baseline justify-between">
              <dt className="text-sm text-gray-600">ריבית משוקללת</dt>
              <dd className="font-bold text-gray-900">{(DEFAULT_RATE * 100).toFixed(2)}%</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-sm text-gray-600">החזר חודשי</dt>
              <dd className="text-lg font-black text-gray-900">
                <AnimatedNumber value={basePayment} prefix="₪" live duration={700} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
              <dt className="text-sm text-gray-600">עלות כוללת</dt>
              <dd className="text-lg font-black text-gray-900">
                <AnimatedNumber value={baseTotal} prefix="₪" live duration={700} />
              </dd>
            </div>
          </dl>
        </div>

        {/* Saving badge */}
        <div className="flex items-center justify-center lg:px-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="w-full rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-6 text-center text-white shadow-xl lg:w-56"
          >
            <TrendingDown className="mx-auto mb-2 h-7 w-7" />
            <div className="text-xs font-bold uppercase tracking-wide text-white">
              הפער בין השניים
            </div>
            <div className="my-1 text-3xl font-black leading-none text-white">
              <AnimatedNumber value={saving} prefix="₪" live duration={800} />
            </div>
            <div className="text-xs text-white">לאורך חיי המשכנתא</div>
          </motion.div>
        </div>

        {/* Optimised */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-6 shadow-lg">
          <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-emerald-200/50 blur-2xl" />
          <div className="relative mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-black text-gray-900">אחרי עבודת היועץ</div>
              <div className="text-xs text-emerald-700">תמהיל מותאם + מכרז ריביות</div>
            </div>
          </div>

          <div className="relative mb-5 h-4 w-full overflow-hidden rounded-full bg-emerald-100">
            <motion.div
              className="h-full bg-gradient-to-l from-emerald-500 to-teal-500"
              animate={{ width: `${barRatio * 100}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 18 }}
            />
          </div>

          <dl className="relative space-y-3">
            <div className="flex items-baseline justify-between">
              <dt className="text-sm text-gray-600">ריבית משוקללת</dt>
              <dd className="font-bold text-emerald-700">
                {(OPTIMISED_RATE * 100).toFixed(2)}%
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-sm text-gray-600">החזר חודשי</dt>
              <dd className="text-lg font-black text-emerald-700">
                <AnimatedNumber value={optimisedPayment} prefix="₪" live duration={700} />
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-emerald-200 pt-3">
              <dt className="text-sm text-gray-600">עלות כוללת</dt>
              <dd className="text-lg font-black text-emerald-700">
                <AnimatedNumber value={optimisedTotal} prefix="₪" live duration={700} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <p className="mt-8 flex items-start gap-2 rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          הדגמה בלבד. החישוב מבוסס על פער ריבית משוקללת אופייני של כ-0.75% בין הצעה ראשונה
          לבין תמהיל מותאם לאחר התמחרות, בלוח סילוקין שפיצר. הפער בפועל תלוי בפרופיל הלקוח,
          ב-LTV ובתנאי השוק. בפלטפורמה החישוב מתבצע על הנתונים האמיתיים שלכם, מסלול אחר מסלול.
        </span>
      </p>
    </div>
  );
}
