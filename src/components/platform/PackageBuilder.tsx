'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, PartyPopper, Receipt, Sparkles, Wand2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { journeyStages } from '@/data/platform/journey';
import {
  BUNDLE_SAVING,
  FULL_SERVICE_PRICE,
  PLATFORM_MONTHLY_PRICE,
} from '@/data/platform/pricing';
import AnimatedNumber from './AnimatedNumber';

const presets: { id: string; label: string; stages: string[] }[] = [
  { id: 'solo', label: 'הכל לבד', stages: [] },
  { id: 'recommended', label: 'המומלץ — תמהיל + התמחרות', stages: ['mix', 'auction'] },
  { id: 'full', label: 'ליווי מלא', stages: journeyStages.map((s) => s.id) },
];

export default function PackageBuilder() {
  const [selected, setSelected] = useState<string[]>(['mix', 'auction']);
  const [months, setMonths] = useState(4);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const { advisorCost, platformCost, total, isFullBundle, rawStagesCost } = useMemo(() => {
    const rawStagesCost = journeyStages
      .filter((s) => selected.includes(s.id))
      .reduce((sum, s) => sum + s.advisorPrice, 0);
    const isFullBundle = selected.length === journeyStages.length;
    const advisorCost = isFullBundle ? FULL_SERVICE_PRICE : rawStagesCost;
    // Full-service clients get platform access included
    const platformCost = isFullBundle ? 0 : months * PLATFORM_MONTHLY_PRICE;
    return {
      rawStagesCost,
      advisorCost,
      platformCost,
      total: advisorCost + platformCost,
      isFullBundle,
    };
  }, [selected, months]);

  const activePreset = presets.find(
    (p) =>
      p.stages.length === selected.length &&
      p.stages.every((s) => selected.includes(s))
  );

  return (
    <div dir="rtl" className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      {/* Stage picker */}
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-gray-700">התחילו מתבנית:</span>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelected(preset.stages)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                activePreset?.id === preset.id
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {journeyStages.map((stage) => {
            const Icon = stage.icon;
            const isOn = selected.includes(stage.id);
            return (
              <motion.button
                key={stage.id}
                type="button"
                onClick={() => toggle(stage.id)}
                whileTap={{ scale: 0.99 }}
                aria-pressed={isOn}
                className={`group flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-right transition-all ${
                  isOn
                    ? 'border-blue-500 bg-blue-50/70 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                    isOn ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                  }`}
                >
                  {isOn && <Check className="h-4 w-4 text-white" />}
                </span>

                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stage.gradient} shadow-md`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-gray-600">
                    שלב {stage.number}
                  </span>
                  <span className="block font-bold text-gray-900">{stage.title}</span>
                  <span className="mt-0.5 block text-sm text-gray-700">
                    {isOn ? (
                      <span className="font-semibold text-blue-800">היועץ מבצע עבורכם · {stage.duration}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Wand2 className="h-3.5 w-3.5" />
                        אתם מבצעים בפלטפורמה — ללא עלות נוספת
                      </span>
                    )}
                  </span>
                </span>

                <span className="shrink-0 text-left">
                  <span
                    className={`block text-lg font-black ${
                      isOn ? 'text-blue-800' : 'text-gray-500 line-through decoration-1'
                    }`}
                  >
                    ₪{stage.advisorPrice.toLocaleString('he-IL')}
                  </span>
                  <span className="block text-[11px] font-semibold text-gray-600">
                    מחיר השלב
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Months slider */}
        <div
          className={`mt-6 rounded-2xl border-2 p-5 transition-all ${
            isFullBundle ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <div>
              <div className="font-bold text-gray-900">מנוי לפלטפורמה</div>
              <div className="text-sm text-gray-700">
                ₪{PLATFORM_MONTHLY_PRICE} לחודש, עד קבלת המשכנתא
              </div>
            </div>
            <div className="text-left">
              {isFullBundle ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-700">
                  כלול ללא תשלום
                </span>
              ) : (
                <span className="text-lg font-black text-gray-900">{months} חודשים</span>
              )}
            </div>
          </div>
          {!isFullBundle && (
            <>
              <Slider
                value={[months]}
                onValueChange={([v]) => setMonths(v)}
                min={1}
                max={12}
                step={1}
                aria-label="מספר חודשי שימוש בפלטפורמה"
              />
              <div className="mt-2 flex justify-between text-xs text-gray-600">
                <span>12 חודשים</span>
                <span>חודש אחד</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
          <div className="bg-gradient-to-l from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Receipt className="h-4 w-4" />
              החבילה שלכם
            </div>
            <div className="mt-1 text-4xl font-black text-white">
              <AnimatedNumber value={total} prefix="₪" live duration={600} />
            </div>
            <div className="text-sm text-slate-100">
              {selected.length === 0
                ? 'מסלול עצמאי מלא'
                : isFullBundle
                  ? 'ליווי מלא מקצה לקצה'
                  : `${selected.length} שלבים עם יועץ`}
            </div>
          </div>

          <div className="space-y-3 px-6 py-5">
            {selected.length > 0 && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-600">
                  ליווי יועץ ({selected.length} שלבים)
                </span>
                <span className="font-bold text-gray-900">
                  ₪{advisorCost.toLocaleString('he-IL')}
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between text-sm">
              <span className="text-gray-600">
                מנוי פלטפורמה{isFullBundle ? '' : ` × ${months} חודשים`}
              </span>
              <span className="font-bold text-gray-900">
                {isFullBundle ? 'כלול' : `₪${platformCost.toLocaleString('he-IL')}`}
              </span>
            </div>

            {isFullBundle && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200"
              >
                <PartyPopper className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  מחיר חבילה — במקום ₪{rawStagesCost.toLocaleString('he-IL')}.
                  <strong className="mx-1">
                    חסכתם ₪{BUNDLE_SAVING.toLocaleString('he-IL')}
                  </strong>
                  ומנוי הפלטפורמה כלול.
                </span>
              </motion.div>
            )}

            {selected.length === 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800 ring-1 ring-blue-200">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  אתם מנהלים את כל התהליך לבד, עם כל הכלים שהיועצים עובדים איתם. אפשר
                  לצרף יועץ לכל שלב בהמשך, גם באמצע הדרך.
                </span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-gray-900">סה״כ</span>
                <span className="text-2xl font-black text-gray-900">
                  ₪{total.toLocaleString('he-IL')}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                המחירים אינם כוללים מע״מ. ניתן לשנות את ההרכב בכל שלב בתהליך.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-l from-blue-600 to-violet-600 text-base font-bold text-white shadow-lg hover:from-blue-700 hover:to-violet-700 hover:text-white"
            >
              <Link href="/auth/register">
                {selected.length === 0 ? 'התחילו לבד עכשיו' : 'המשיכו עם ההרכב הזה'}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
