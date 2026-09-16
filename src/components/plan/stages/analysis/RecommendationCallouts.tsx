'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertOctagon, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import { profileRecommendations, shouldAskIncomeIncrease } from '@/lib/profile-report';
import type { ProfileRecommendation, RecommendationTone } from '@/lib/profile-report';
import type { AnalysisData, ProfileScreen } from '@/lib/mortgage-plan';
import { NumberField } from '../../ui';

const toneStyles: Record<
  RecommendationTone,
  { ring: string; icon: typeof Lightbulb; iconBox: string; title: string; text: string; badge: string }
> = {
  info: {
    ring: 'border-blue-200 bg-gradient-to-l from-blue-50 to-white',
    icon: Lightbulb,
    iconBox: 'bg-blue-600',
    title: 'text-blue-950',
    text: 'text-blue-900/80',
    badge: 'bg-blue-100 text-blue-700',
  },
  warning: {
    ring: 'border-amber-300 bg-gradient-to-l from-amber-50 to-white',
    icon: AlertTriangle,
    iconBox: 'bg-amber-500',
    title: 'text-amber-950',
    text: 'text-amber-900/80',
    badge: 'bg-amber-100 text-amber-800',
  },
  critical: {
    ring: 'border-rose-300 bg-gradient-to-l from-rose-50 to-white',
    icon: AlertOctagon,
    iconBox: 'bg-rose-600',
    title: 'text-rose-950',
    text: 'text-rose-900/80',
    badge: 'bg-rose-100 text-rose-700',
  },
};

const toneLabel: Record<RecommendationTone, string> = {
  info: 'המלצה',
  warning: 'שימו לב',
  critical: 'קריטי',
};

export function RecommendationCard({
  recommendation,
  compact = false,
}: {
  recommendation: ProfileRecommendation;
  compact?: boolean;
}) {
  const style = toneStyles[recommendation.tone];
  const Icon = style.icon;
  return (
    <div className={`rounded-2xl border p-4 text-right shadow-sm ${style.ring}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ${style.iconBox}`}>
          <Icon className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${style.badge}`}>
              {toneLabel[recommendation.tone]}
            </span>
            <h4 className={`text-sm font-black leading-snug ${style.title}`}>{recommendation.title}</h4>
          </div>
          <p className={`mt-1.5 leading-relaxed ${compact ? 'text-[12px]' : 'text-sm'} ${style.text}`}>
            {recommendation.body}
          </p>
          {recommendation.bullets && recommendation.bullets.length > 0 && (
            <ul className={`mt-2 space-y-1 leading-relaxed ${compact ? 'text-[11px]' : 'text-xs'} ${style.text}`}>
              {recommendation.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-1.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * השאלה שנשאלת כשיחס ההחזר קרוב למגבלה: האם ההכנסה הפנויה צפויה לגדול. תשובה
 * חיובית פותחת את «בכמה ומתי», ומהן נגזר מסלול הגרייס שמופיע מיד מתחת.
 */
function IncomeIncreaseQuestion({
  profile,
  patch,
}: {
  profile: AnalysisData;
  patch: (next: Partial<AnalysisData>) => void;
}) {
  const answer = profile.expectsIncomeIncrease;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-md">
          <TrendingUp className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-slate-900">האם צפויה הגדלה בהכנסה הפנויה?</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            סיום הלוואה, קידום, חזרה לעבודה מלאה או סיום תשלום גן — אם ההכנסה הפנויה תגדל
            בהמשך, אפשר להקל על ההחזר בתקופה הראשונה עם מסלול בלון.
          </p>
          <div className="mt-3 flex gap-2">
            {[
              { value: true, label: 'כן, צפויה עלייה' },
              { value: false, label: 'לא צפויה' },
            ].map((option) => {
              const selected = answer === option.value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => patch({ expectsIncomeIncrease: option.value })}
                  className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-bold transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <AnimatePresence initial={false}>
            {answer === true && (
              <motion.div
                key="details"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="בכמה תגדל ההכנסה הפנויה (לחודש)"
                    value={profile.futureMonthlyIncrease}
                    onChange={(futureMonthlyIncrease) => patch({ futureMonthlyIncrease })}
                    suffix="₪"
                    placeholder="2,500"
                  />
                  <NumberField
                    label="בעוד כמה שנים"
                    value={profile.futureMonthlyIncreaseInYears}
                    onChange={(futureMonthlyIncreaseInYears) => patch({ futureMonthlyIncreaseInYears })}
                    suffix="שנים"
                    max={30}
                  />
                </div>
                {(profile.futureMonthlyIncreaseInYears ?? 0) <= 0 && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    הזינו בעוד כמה שנים צפויה העלייה — לפי זה ייקבע אורך מסלול הגרייס המומלץ.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/**
 * ההמלצות שצפות במסך הנוכחי, בסדר שבו הן נגזרות מהפרופיל. אחרי המלצת יחס
 * ההחזר נשאלת שאלת ההכנסה, כי התשובה עליה היא שפותחת את המלצת הגרייס.
 */
export function RecommendationCallouts({
  profile,
  screen,
  patch,
}: {
  profile: AnalysisData;
  screen: ProfileScreen;
  patch: (next: Partial<AnalysisData>) => void;
}) {
  const items = profileRecommendations(profile).filter((item) => item.screens.includes(screen));
  const askIncome = shouldAskIncomeIncrease(profile) && (screen === 'borrowers' || screen === 'deal');
  if (items.length === 0 && !askIncome) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <RecommendationCard recommendation={item} />
            {item.id === 'repayment-ratio' && askIncome && (
              <IncomeIncreaseQuestion profile={profile} patch={patch} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
