'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Info,
  LayoutDashboard,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  UserRound,
} from 'lucide-react';
import {
  PAYMENT_TO_INCOME_LIMIT,
  REFI_CHECK_GOALS,
  TRACK_TYPE_LABELS,
  formatTerm,
  type AverageRates,
  type RefiCheckResult as Result,
} from '@/lib/refinance-check';
import { GuidanceRequestDialog } from '@/components/service-flow/GuidanceRequestDialog';
import { TRACK_COLORS } from '@/components/mortgage-advisor/workspace/primitives';
import { cn } from '@/lib/utils';
import { formatMonth, formatRate, formatShekel } from './format';

/** אחרי ההרשמה האורח ממשיך ישר לתהליך מיחזור עצמאי — כמו בבחירה בעמוד הבית */
const REGISTER_HREF = `/auth/register?callbackUrl=${encodeURIComponent('/dashboard?goal=REFINANCE&service=SELF')}`;
export const PREVIEW_HREF = '/mortgage-refinance?view=preview';

export function RefinanceCheckResult({
  result,
  averages,
  onEditTracks,
  onChangeGoal,
}: {
  result: Result;
  averages: AverageRates;
  onEditTracks: () => void;
  onChangeGoal: () => void;
}) {
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const proposed = result.proposed?.summary ?? null;

  return (
    <div className="space-y-5">
      <Verdict result={result} />

      {proposed && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-subtitle font-black text-slate-900">היום מול {result.proposed!.label}</h3>
            <span className="text-2xs font-bold text-slate-400">הערכה לפי ממוצעי בנק ישראל</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Compare label="החזר חודשי" now={result.current.payment} next={proposed.payment} format={formatShekel} lowerIsBetter />
            <Compare
              label="תקופה שנותרה"
              now={result.current.months}
              next={proposed.months}
              format={formatTerm}
              lowerIsBetter={result.goal !== 'reduce-payment'}
            />
            <Compare
              label="סך הריבית עד הסוף"
              now={result.current.totalInterest}
              next={proposed.totalInterest}
              format={formatShekel}
              lowerIsBetter
            />
          </div>

          {result.goal === 'reduce-payment' && result.alternative && (
            <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              להשוואה, {result.alternative.label}: החזר של {formatShekel(result.alternative.summary.payment)} בחודש.
            </p>
          )}
          {result.goal === 'reduce-payment' && proposed.totalInterest > result.current.totalInterest && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              פריסה לתקופה ארוכה מורידה את ההחזר החודשי, אבל מגדילה את סך הריבית לאורך השנים. בתמהיל מדויק אפשר
              לאזן בין השניים.
            </p>
          )}
        </section>
      )}

      {result.affordability && (
        <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-6">
          <Stat label="הכנסה פנויה" value={formatShekel(result.affordability.disposable)} />
          <Stat
            label={`החזר מקסימלי (${Math.round(PAYMENT_TO_INCOME_LIMIT * 100)}%)`}
            value={formatShekel(result.affordability.maxPayment)}
          />
          <Stat
            label="ההחזר היום מההכנסה הפנויה"
            value={
              result.affordability.disposable > 0
                ? `${Math.round((result.current.payment / result.affordability.disposable) * 100)}%`
                : '—'
            }
            tone={result.affordability.currentOverLimit ? 'bad' : 'neutral'}
          />
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h3 className="text-subtitle font-black text-slate-900">הריביות שלכם מול בנק ישראל</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-2xs text-slate-500">
                <th className="py-2 font-bold">מסלול</th>
                <th className="py-2 font-bold">יתרה</th>
                <th className="py-2 font-bold">הריבית שלכם</th>
                <th className="py-2 font-bold">ממוצע בנק ישראל</th>
                <th className="py-2 font-bold">מצב</th>
              </tr>
            </thead>
            <tbody>
              {result.tracks.map((track) => (
                <tr key={track.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2 font-bold text-slate-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TRACK_COLORS[track.type] }} />
                      {TRACK_TYPE_LABELS[track.type]}
                    </span>
                  </td>
                  <td className="py-2.5 tabular-nums text-slate-700">{formatShekel(track.balance)}</td>
                  <td className="py-2.5 tabular-nums font-bold text-slate-900">{formatRate(track.rate)}</td>
                  <td className="py-2.5 tabular-nums text-slate-700">
                    {track.average !== null
                      ? formatRate(track.average)
                      : track.primeMargin !== null
                        ? `פריים ${formatRate(averages.primeAnchor!)}`
                        : '—'}
                  </td>
                  <td className="py-2.5">
                    {track.aboveAverage ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-800">
                        מעל הממוצע ב-{(track.rate - track.average!).toFixed(2)}%
                      </span>
                    ) : track.average !== null ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-bold text-emerald-800">
                        בממוצע או מתחתיו
                      </span>
                    ) : track.primeMargin !== null ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-600">
                        מרווח {track.primeMargin >= 0 ? '+' : '−'}
                        {Math.abs(track.primeMargin).toFixed(2)}% · אין ממוצע
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-600">
                        אין ממוצע · נשארת הריבית שלכם
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-2xs leading-relaxed text-slate-500">
          ריביות ממוצעות להלוואות חדשות לדיור בכל המערכת הבנקאית, בנק ישראל, {formatMonth(averages.asOf)}. לפריים,
          למשתנה לא צמודה ולזכאות בנק ישראל אינו מפרסם ממוצע, ובהם החישוב נשאר עם הריבית שלכם. החישוב נומינלי,
          בלי תחזית מדד ובלי עמלות פירעון מוקדם — הערכה בלבד, לא הצעה של בנק.
        </p>
      </section>

      <Invitation improvement={result.improvement} onAdvisor={() => setAdvisorOpen(true)} />

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onEditTracks}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-button font-bold text-slate-700 hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" />
          עריכת המסלולים
        </button>
        <button
          type="button"
          onClick={onChangeGoal}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-button font-bold text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          בדיקה למטרה אחרת
        </button>
      </div>

      {advisorOpen && (
        <GuidanceRequestDialog
          open
          onOpenChange={(open) => !open && setAdvisorOpen(false)}
          goal="REFINANCE"
          serviceType="FULL"
          mode="guest"
        />
      )}
    </div>
  );
}

function Verdict({ result }: { result: Result }) {
  const goal = REFI_CHECK_GOALS[result.goal];
  const headline = (() => {
    if (!result.improvement) return null;
    if (result.goal === 'reduce-payment')
      return { value: formatShekel(result.savings.monthly), unit: 'פחות בכל חודש' };
    if (result.goal === 'reduce-interest')
      return { value: formatShekel(result.savings.interest), unit: 'פחות ריבית עד סוף המשכנתא' };
    return { value: formatTerm(result.savings.months), unit: 'מוקדם יותר' };
  })();
  const sub = (() => {
    if (!result.improvement || !result.proposed) return result.reason;
    if (result.goal === 'fast-payoff')
      return `וחיסכון מוערך של ${formatShekel(result.savings.interest)} בריבית, בהחזר של ${formatShekel(result.proposed.summary.payment)} בחודש — בתוך מגבלת יחס ההחזר.`;
    if (result.goal === 'reduce-interest')
      return `הריביות שמעל הממוצע יורדות לממוצע, והמשכנתא מסתיימת בעוד ${formatTerm(result.proposed.summary.months)} — בלי להגדיל את ההחזר החודשי.`;
    return `ההחזר יורד מ-${formatShekel(result.current.payment)} ל-${formatShekel(result.proposed.summary.payment)} בחודש.`;
  })();

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative overflow-hidden rounded-3xl p-6 text-center shadow-xl sm:p-8',
        result.improvement ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white' : 'bg-brand-dark text-white'
      )}
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
          {result.improvement ? <TrendingDown className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {goal.title}
        </span>
        <h2 className="mt-3 text-title font-black text-white">
          {result.improvement ? 'יש מקום לשיפור' : 'לא מצאנו שיפור משמעותי'}
        </h2>
        {headline && (
          <div className="mt-3">
            <div className="text-2xs font-bold uppercase text-emerald-100">הערכת חיסכון</div>
            <div className="text-5xl font-black tabular-nums sm:text-6xl">{headline.value}</div>
            <div className="mt-1 text-lg font-bold text-emerald-50">{headline.unit}</div>
          </div>
        )}
        {sub && <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-white/90">{sub}</p>}
      </div>
    </motion.section>
  );
}

function Compare({
  label,
  now,
  next,
  format,
  lowerIsBetter,
}: {
  label: string;
  now: number;
  next: number;
  format: (value: number) => string;
  lowerIsBetter: boolean;
}) {
  const max = Math.max(now, next, 1);
  const better = lowerIsBetter ? next < now : next > now;
  const same = Math.abs(next - now) < 0.5;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div className="mt-3 space-y-2.5">
        <Bar caption="היום" value={format(now)} ratio={now / max} className="bg-slate-400" />
        <Bar
          caption="אחרי"
          value={format(next)}
          ratio={next / max}
          className={same ? 'bg-slate-400' : better ? 'bg-emerald-500' : 'bg-amber-500'}
        />
      </div>
    </div>
  );
}

function Bar({ caption, value, ratio, className }: { caption: string; value: string; ratio: number; className: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-2xs font-bold text-slate-500">{caption}</span>
        <span className="font-black tabular-nums text-slate-900">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className={cn('h-full rounded-full', className)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(3, Math.min(100, ratio * 100))}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'bad' }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <div className="text-2xs font-bold text-slate-500">{label}</div>
      <div className={cn('mt-1 text-xl font-black tabular-nums', tone === 'bad' ? 'text-rose-600' : 'text-slate-900')}>
        {value}
      </div>
    </div>
  );
}

function Invitation({ improvement, onAdvisor }: { improvement: boolean; onAdvisor: () => void }) {
  return (
    <section className="rounded-3xl border border-blue-100 bg-hero-soft p-5 shadow-sm sm:p-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-black text-blue-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          {improvement ? 'השלב הבא: להפוך את ההערכה לחיסכון אמיתי' : 'רוצים בדיקה מדויקת יותר?'}
        </span>
        <h3 className="mt-3 text-subtitle font-black text-slate-900">
          בונים תמהיל מיחזור מדויק ומנהלים את כל התהליך במשכלנתא
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          ההערכה מבוססת על ממוצעים. בפלטפורמה בונים תמהיל מדויק למיחזור, משווים הצעות של בנקים ומנהלים את כל שלבי
          המיחזור — לבד, או עם יועץ משכלנתא שעושה את העבודה בשבילכם. גם כשהיועץ עובד, אתם רואים בפלטפורמה כל שלב
          שהוא מבצע, את ההתקדמות ואת החיסכון.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Option
          icon={LayoutDashboard}
          iconClass="from-blue-500 to-blue-700"
          title="לנהל את המיחזור בעצמי"
          text="פתיחת חשבון, בניית תמהיל מדויק בכלי המלא וניהול המיחזור שלב אחר שלב."
        >
          <Link
            href={REGISTER_HREF}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-3 text-button font-black text-white shadow-md transition-colors hover:bg-blue-700"
          >
            הרשמה לפלטפורמה
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Option>
        <Option
          icon={UserRound}
          iconClass="from-violet-500 to-violet-700"
          title="יועץ משכלנתא יעשה את העבודה"
          text="יועץ בונה את התמהיל ומנהל מול הבנקים, ואתם עוקבים אחרי כל שלב בפלטפורמה."
        >
          <button
            type="button"
            onClick={onAdvisor}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-3 text-button font-black text-white shadow-md transition-colors hover:bg-violet-700"
          >
            פנייה ליועץ משכלנתא
          </button>
        </Option>
        <Option
          icon={Eye}
          iconClass="from-slate-600 to-slate-800"
          title="הצצה לפלטפורמה"
          text="3 שינויים בכלי המיחזור המלא עם המסלולים שהזנתם, והצצה לאזור האישי ולשלבים."
        >
          <Link
            href={PREVIEW_HREF}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-button font-black text-slate-800 transition-colors hover:border-blue-400 hover:text-blue-700"
          >
            למסך ההצצה
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Option>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-2xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        הנתונים שהזנתם נשארים בדפדפן שלכם ולא נשלחים לשום מקום.
      </p>
    </section>
  );
}

function Option({
  icon: Icon,
  iconClass,
  title,
  text,
  children,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      <span className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${iconClass} shadow`}>
        <Icon className="h-5 w-5 text-white" />
      </span>
      <div className="text-lg font-black text-slate-900">{title}</div>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{text}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
