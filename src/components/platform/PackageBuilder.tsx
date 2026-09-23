'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Coins, PartyPopper, Receipt, Scale, Sparkles, Wand2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { journeyStages } from '@/data/platform/journey';
import { PLATFORM_ACCESS_DAYS, PLATFORM_PROCESS_PRICE } from '@/data/platform/pricing';
import { quoteAdvisory } from '@/lib/service-flow';
import AnimatedNumber from './AnimatedNumber';

const presets: { id: string; label: string; stages: string[] }[] = [
  { id: 'solo', label: 'הכל לבד', stages: [] },
  { id: 'recommended', label: 'המומלץ — תמהיל + התמחרות', stages: ['mix', 'auction'] },
  { id: 'full', label: 'ליווי מלא', stages: journeyStages.map((s) => s.id) },
];

export default function PackageBuilder() {
  const [selected, setSelected] = useState<string[]>(['mix', 'auction']);
  /** כמה תקופות גישה (30 יום כל אחת) התהליך צפוי לקחת במסלול העצמאי */
  const [periods, setPeriods] = useState(2);
  /** תקופות גישה שכבר שולמו לפני שמזמינים ליווי — מקוזזות מהמחיר */
  const [paidPeriods, setPaidPeriods] = useState(0);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const withAdvisor = selected.length > 0;

  const { advisorCost, platformCost, total, isFullBundle, rawStagesCost, credit, bundleApplied } =
    useMemo(() => {
      const quote = quoteAdvisory({ stageIds: selected, platformPaid: paidPeriods * PLATFORM_PROCESS_PRICE });
      const isFullBundle = selected.length === journeyStages.length;
      // כל הזמנת ליווי כוללת גישה לפלטפורמה; רק במסלול העצמאי משלמים עליה, לכל תקופת גישה
      const platformCost = withAdvisor ? 0 : periods * PLATFORM_PROCESS_PRICE;
      return {
        rawStagesCost: quote.stagesPrice,
        advisorCost: quote.advisoryPrice,
        platformCost,
        credit: quote.platformCredit,
        bundleApplied: quote.bundleApplied,
        total: withAdvisor ? quote.total : platformCost,
        isFullBundle,
      };
    }, [selected, periods, paidPeriods, withAdvisor]);

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
          <span className="text-sm font-bold text-slate-700">התחילו מתבנית:</span>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelected(preset.stages)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                activePreset?.id === preset.id
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
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
                className={`group flex w-full flex-col gap-3 rounded-2xl border-2 p-4 text-right transition-all sm:flex-row sm:items-center sm:gap-4 ${
                  isOn
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                    isOn ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
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
                  <span className="block text-xs font-bold text-slate-600">
                    שלב {stage.number}
                  </span>
                  <span className="block font-bold text-slate-900">{stage.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-700">
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
                      isOn ? 'text-blue-800' : 'text-slate-500 line-through decoration-1'
                    }`}
                  >
                    ₪{stage.advisorPrice.toLocaleString('he-IL')}
                  </span>
                  <span className="block text-2xs font-semibold text-slate-600">
                    מחיר השלב
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Access periods slider */}
        <div
          className={`mt-6 rounded-2xl border-2 p-5 transition-all ${
            withAdvisor ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900">גישה לפלטפורמה</div>
              <div className="text-sm text-slate-700">
                ₪{PLATFORM_PROCESS_PRICE} לתהליך משכנתא, ל-{PLATFORM_ACCESS_DAYS} יום. אפשר לחדש באותו מחיר
              </div>
            </div>
            <div className="text-left">
              {withAdvisor ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-700">
                  כלול בכל ליווי
                </span>
              ) : (
                <span className="text-lg font-black text-slate-900">{periods * PLATFORM_ACCESS_DAYS} יום</span>
              )}
            </div>
          </div>
          {!withAdvisor && (
            <>
              <Slider
                value={[periods]}
                onValueChange={([v]) => setPeriods(v)}
                min={1}
                max={6}
                step={1}
                aria-label="כמה זמן ייקח התהליך"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-600">
                <span>{6 * PLATFORM_ACCESS_DAYS} יום</span>
                <span>{PLATFORM_ACCESS_DAYS} יום</span>
              </div>
            </>
          )}
        </div>

        {/* Credit slider */}
        {withAdvisor && (
          <div className="mt-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Coins className="h-4 w-4 text-blue-600" />
                  כבר שילמתם על הגישה לפלטפורמה?
                </div>
                <div className="text-sm text-slate-700">
                  התחלתם לבד ועכשיו מזמינים ליווי — כל תשלום על הגישה מקוזז מהמחיר
                </div>
              </div>
              <span className="text-lg font-black text-slate-900">
                {paidPeriods === 0 ? 'עדיין לא' : `₪${paidPeriods * PLATFORM_PROCESS_PRICE}`}
              </span>
            </div>
            <Slider
              value={[paidPeriods]}
              onValueChange={([v]) => setPaidPeriods(v)}
              min={0}
              max={6}
              step={1}
              aria-label="תשלומי גישה לפלטפורמה ששולמו"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-600">
              <span>₪{6 * PLATFORM_PROCESS_PRICE}</span>
              <span>0</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
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
              <div className="flex items-baseline justify-between text-info">
                <span className="text-slate-600">
                  ליווי יועץ ({selected.length} שלבים)
                </span>
                <span className="font-bold text-slate-900">
                  ₪{advisorCost.toLocaleString('he-IL')}
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between text-info">
              <span className="text-slate-600">
                גישה לפלטפורמה{withAdvisor ? '' : ` · ${periods * PLATFORM_ACCESS_DAYS} יום`}
              </span>
              <span className="font-bold text-slate-900">
                {withAdvisor ? 'כלולה' : `₪${platformCost.toLocaleString('he-IL')}`}
              </span>
            </div>

            {credit > 0 && (
              <div className="flex items-baseline justify-between text-info">
                <span className="text-slate-600">קיזוז גישה ששולמה</span>
                <span className="font-bold text-emerald-700">−₪{credit.toLocaleString('he-IL')}</span>
              </div>
            )}

            {bundleApplied && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200"
              >
                {isFullBundle ? (
                  <PartyPopper className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <Scale className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>
                  {isFullBundle ? 'מחיר ליווי מלא' : 'ליווי מלא יצא זול יותר, אז זה המחיר'} — במקום
                  ₪{rawStagesCost.toLocaleString('he-IL')} על השלבים בנפרד.
                  <strong className="mx-1">
                    חסכתם ₪{(rawStagesCost - advisorCost).toLocaleString('he-IL')}
                  </strong>
                  והגישה לפלטפורמה כלולה.
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

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-slate-900">סה״כ</span>
                <span className="text-2xl font-black text-slate-900">
                  ₪{total.toLocaleString('he-IL')}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                המחירים אינם כוללים מע״מ. ניתן לשנות את ההרכב בכל שלב בתהליך — ותמיד תחויבו
                במחיר הנמוך מבין כל האופציות.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-base font-bold text-white shadow-lg hover:text-white"
            >
              <Link href="/#start">
                {selected.length === 0 ? 'התחילו בסיור בכלי' : 'בקשו ליווי עם ההרכב הזה'}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
