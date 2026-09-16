'use client';

import React, { useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Compass,
  Download,
  FileText,
  HelpCircle,
  Home,
  Info,
  Lightbulb,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import type { PlanData } from '@/lib/mortgage-plan';
import { describeMonths } from '@/lib/mortgage-plan';
import {
  DOCUMENT_CONSISTENCY_WARNING,
  buildProfileReport,
  overallHeadline,
} from '@/lib/profile-report';
import type { CheckStatus, RecommendationTone } from '@/lib/profile-report';
import { formatPercent, formatShekel } from '../../ui';
import { RecommendationCard } from './RecommendationCallouts';
import { printProfileReport } from './reportDocument';

const STATUS_STYLE: Record<
  CheckStatus,
  { box: string; text: string; chip: string; fill: string; track: string; label: string; icon: React.ReactNode }
> = {
  pass: {
    box: 'border-emerald-300 bg-emerald-50/70',
    text: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-800',
    fill: 'bg-emerald-500',
    track: 'bg-emerald-100',
    label: 'עומד בדרישה',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  near: {
    box: 'border-amber-300 bg-amber-50/70',
    text: 'text-amber-700',
    chip: 'bg-amber-100 text-amber-800',
    fill: 'bg-amber-500',
    track: 'bg-amber-100',
    label: 'קרוב למגבלה',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  fail: {
    box: 'border-rose-300 bg-rose-50/70',
    text: 'text-rose-700',
    chip: 'bg-rose-100 text-rose-800',
    fill: 'bg-rose-600',
    track: 'bg-rose-100',
    label: 'אינו עומד בדרישה',
    icon: <XCircle className="h-5 w-5" />,
  },
  unknown: {
    box: 'border-slate-300 bg-slate-50',
    text: 'text-slate-600',
    chip: 'bg-slate-100 text-slate-600',
    fill: 'bg-slate-400',
    track: 'bg-slate-100',
    label: 'חסרים נתונים',
    icon: <HelpCircle className="h-5 w-5" />,
  },
};

const RISK_TONE: Record<RecommendationTone, { ring: string; icon: typeof Info; iconColor: string }> = {
  info: { ring: 'border-blue-200 bg-blue-50/60', icon: Info, iconColor: 'text-blue-600' },
  warning: { ring: 'border-amber-200 bg-amber-50/70', icon: AlertTriangle, iconColor: 'text-amber-600' },
  critical: { ring: 'border-rose-200 bg-rose-50/70', icon: AlertOctagon, iconColor: 'text-rose-600' },
};

function StatusChip({ status }: { status: CheckStatus }) {
  const tone = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${tone.chip}`}>
      {tone.label}
    </span>
  );
}

/** מד דק: המילוי צבוע לפי החומרה, המסילה בגוון בהיר של אותו צבע, וסימון לגבול */
function LimitMeter({
  value,
  limit,
  status,
  scaleMax,
}: {
  value: number | null;
  limit: number;
  status: CheckStatus;
  scaleMax: number;
}) {
  const tone = STATUS_STYLE[status];
  const pct = value === null ? 0 : Math.min(100, (value / scaleMax) * 100);
  const limitPct = Math.min(100, (limit / scaleMax) * 100);
  return (
    <div className="relative mt-3 h-2 w-full rounded-full">
      <div className={`absolute inset-0 rounded-full ${tone.track}`} />
      <div className={`absolute inset-y-0 right-0 rounded-full ${tone.fill}`} style={{ width: `${pct}%` }} />
      <div
        className="absolute -top-1 h-4 w-0.5 rounded-full bg-slate-900"
        style={{ right: `calc(${limitPct}% - 1px)` }}
        aria-hidden
      />
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  status,
  dark = false,
}: {
  label: string;
  value: string;
  note?: string;
  status?: CheckStatus;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-right ${
        dark ? 'border border-white/15 bg-white/10 text-white backdrop-blur' : 'border-2 border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-bold ${dark ? 'text-white/70' : 'text-slate-500'}`}>{label}</span>
        {status && <StatusChip status={status} />}
      </div>
      <div className={`mt-1 text-2xl font-black leading-none md:text-[28px] ${dark ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </div>
      {note && <div className={`mt-1.5 text-[11px] leading-snug ${dark ? 'text-white/60' : 'text-slate-500'}`}>{note}</div>}
    </div>
  );
}

function Block({
  icon: Icon,
  title,
  subtitle,
  accent,
  children,
}: {
  icon: typeof Home;
  title: string;
  subtitle?: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white text-right shadow-sm">
      <div className={`h-1 w-full bg-gradient-to-l ${accent}`} />
      <div className="flex items-center gap-3 px-5 pt-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} shadow-md`}>
          <Icon className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-slate-900">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 pt-4">{children}</div>
    </section>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-100 py-1.5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm tabular-nums ${strong ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>{value}</span>
    </div>
  );
}

/**
 * התוצר של השלב הראשון, על המסך — דשבורד של בלוקים.
 *
 * מספרי המפתח למעלה, ואחריהם נתוני העסקה, פרופיל הלקוח, העמידה בדרישות,
 * הסיכונים וההמלצות, הקווים המנחים לתמהיל ותיק המסמכים. אותו תוכן יוצא
 * לקובץ בהורדה. `sample` מציג דוח דמה במסך «על השלב» — בלי כפתור הורדה.
 */
export function ProfileReportPanel({
  data,
  planName,
  sample = false,
}: {
  data: PlanData;
  planName?: string;
  sample?: boolean;
}) {
  const report = useMemo(() => buildProfileReport(data), [data]);
  const verdict = STATUS_STYLE[report.overall];
  const { summary } = report;
  const date = useMemo(
    () => new Intl.DateTimeFormat('he-IL', { dateStyle: 'long' }).format(new Date(report.generatedAt)),
    [report.generatedAt]
  );
  const afterStatus: CheckStatus = !summary.ready
    ? 'unknown'
    : summary.disposableAfterMortgage < 0
      ? 'fail'
      : summary.disposableAfterMortgage < summary.totalIncome * 0.25
        ? 'near'
        : 'pass';

  return (
    <section className="space-y-4">
      {/* כותרת ומספרי המפתח */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>
        <div className="relative p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="text-right">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                  התוצר של השלב · דוח פרופיל פיננסי
                </span>
                {sample && (
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-900">דוגמה</span>
                )}
              </div>
              <h3 className="mt-3 text-2xl font-black leading-tight md:text-3xl">
                {planName || 'הפרופיל הפיננסי שלכם'}
              </h3>
              <p className="mt-1 text-sm text-white/70">
                {report.headline} · הופק {date}
              </p>
            </div>
            {!sample && (
              <button
                type="button"
                onClick={() => printProfileReport(report, planName)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-900 shadow-lg transition-all hover:bg-blue-50"
              >
                <Download className="h-4 w-4" />
                הורדת הדוח כ-PDF
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              dark
              label="סכום המשכנתא"
              value={summary.ready ? formatShekel(summary.mortgageAmount) : '—'}
              note={summary.propertyValue ? `מתוך נכס בשווי ${formatShekel(summary.propertyValue)}` : 'ממתין למחיר הנכס'}
            />
            <Tile
              dark
              label="שיעור מימון"
              value={formatPercent(summary.ltv)}
              note={`תקרה ${summary.maxLtv}% לסוג העסקה`}
              status={summary.ltvStatus}
            />
            <Tile
              dark
              label="יחס החזר"
              value={formatPercent(summary.repaymentRatio)}
              note={`מגבלה ${summary.ratioLimit}% · נוח עד ${summary.ratioComfort}%`}
              status={summary.ratioStatus}
            />
            <Tile
              dark
              label="החזר חודשי משוער"
              value={summary.ready ? formatShekel(summary.estimatedMonthlyPayment) : '—'}
              note={`${describeMonths(summary.months)} · ריבית ${summary.estimateRate}% קל"צ להערכה`}
            />
          </div>
        </div>
      </div>

      <div className={`rounded-3xl border-2 p-4 text-center ${verdict.box}`}>
        <span className={`inline-flex items-center justify-center gap-2 ${verdict.text}`}>
          {verdict.icon}
          <span className="text-lg font-black">{overallHeadline(report.overall)}</span>
        </span>
      </div>

      {/* שורת התוצאות הכספיות */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="הכנסה פנויה אחרי המשכנתא"
          value={summary.ready ? formatShekel(summary.disposableAfterMortgage) : '—'}
          note="הכנסה נטו פחות הלוואות קיימות ופחות ההחזר המשוער"
          status={afterStatus}
        />
        <Tile
          label="סך הריביות לאורך התקופה"
          value={summary.ready ? formatShekel(summary.totalInterest) : '—'}
          note={
            summary.interestShare !== null
              ? `${summary.interestShare.toFixed(0)}% מהקרן · סך תשלומים ${formatShekel(summary.totalPaid)}`
              : undefined
          }
        />
        <Tile
          label="החזר חודשי מרבי לפי הבנקים"
          value={formatShekel(summary.maxMonthlyPayment)}
          note={`${summary.ratioLimit}% מההכנסה הפנויה`}
        />
        <Tile
          label="הון עצמי בעסקה"
          value={summary.ready ? formatShekel(summary.equityInDeal) : formatShekel(summary.equity)}
          note={summary.equityGap > 0 ? `חסרים ${formatShekel(summary.equityGap)} לתקרת המימון` : 'מכסה את המינימום לסוג העסקה'}
          status={summary.equityGap > 0 ? 'fail' : summary.ready ? 'pass' : 'unknown'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block icon={Home} title="נתוני העסקה" subtitle="הנכס, המימון והבטוחה" accent="from-blue-600 to-cyan-500">
          <Row label="סוג העסקה" value={summary.dealTypeLabel ?? '—'} />
          <Row label="כתובת הנכס" value={summary.propertyAddress ?? '—'} />
          <Row label="מחיר הנכס" value={formatShekel(summary.propertyValue)} />
          <Row label="הון עצמי מוצהר" value={formatShekel(summary.equity)} />
          <Row label="סכום המשכנתא המבוקש" value={summary.ready ? formatShekel(summary.mortgageAmount) : '—'} strong />
          <Row label="תקופה מבוקשת" value={describeMonths(summary.months)} />
          {summary.maxYearsByAge !== null && (
            <Row
              label="תקופה מרבית לפי גיל (מדיניות מקובלת)"
              value={describeMonths(Math.min(30, summary.maxYearsByAge) * 12)}
            />
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">שיעור מימון מול התקרה</span>
              <span className="font-black tabular-nums text-slate-900">
                {formatPercent(summary.ltv)} / {summary.maxLtv}%
              </span>
            </div>
            <LimitMeter value={summary.ltv} limit={summary.maxLtv} status={summary.ltvStatus} scaleMax={100} />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              הבטוחה למשכנתא היא הנכס עצמו. הבנק מחשב את המימון לפי הנמוך מבין מחיר הרכישה
              לשווי השמאות, ולכן הפער מהתקרה הוא מרווח הביטחון שלכם מול שמאות נמוכה.
            </p>
          </div>
        </Block>

        <Block icon={Users} title="פרופיל הלקוח" subtitle="הלווים, ההכנסות והתחייבויות" accent="from-violet-600 to-fuchsia-500">
          <div className={`grid gap-3 ${summary.couple ? 'sm:grid-cols-2' : ''}`}>
            {summary.borrowers.map((borrower) => (
              <div key={borrower.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="mb-1.5 text-[11px] font-black text-slate-500">{borrower.label}</div>
                <Row label="הכנסה נטו" value={formatShekel(borrower.income)} strong />
                <Row label="גיל" value={borrower.age !== null ? String(borrower.age) : '—'} />
                <Row label="אופן העסקה" value={borrower.employment ?? '—'} />
                <Row label="הבנק של החשבון" value={borrower.bank ?? '—'} />
                {borrower.loanPayment > 0 && <Row label="החזר הלוואות" value={formatShekel(borrower.loanPayment)} />}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Row label="הכנסה חודשית מוכרת" value={formatShekel(summary.totalIncome)} strong />
            <Row label="החזר על הלוואות קיימות" value={formatShekel(summary.existingLoans)} />
            <Row label="הכנסה פנויה לחישוב ההחזר" value={formatShekel(summary.disposableIncome)} />
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">יחס החזר מול המגבלה</span>
              <span className="font-black tabular-nums text-slate-900">
                {formatPercent(summary.repaymentRatio)} / {summary.ratioLimit}%
              </span>
            </div>
            <LimitMeter value={summary.repaymentRatio} limit={summary.ratioLimit} status={summary.ratioStatus} scaleMax={60} />
          </div>
          {(data.ANALYSIS.futureLumpSums.some((item) => (item.amount ?? 0) > 0) ||
            (data.ANALYSIS.futureMonthlyIncrease ?? 0) > 0) && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="mb-1 text-[11px] font-black text-emerald-800">צפי הכנסות עתידיות</div>
              <ul className="space-y-0.5 text-xs text-emerald-900">
                {data.ANALYSIS.futureLumpSums
                  .filter((item) => (item.amount ?? 0) > 0)
                  .map((item) => (
                    <li key={item.id}>
                      {item.label || 'הכנסה חד-פעמית'} · {formatShekel(item.amount)}
                      {item.inYears ? ` בעוד ${describeMonths(item.inYears * 12)}` : ''}
                    </li>
                  ))}
                {(data.ANALYSIS.futureMonthlyIncrease ?? 0) > 0 && (
                  <li>
                    תוספת של {formatShekel(data.ANALYSIS.futureMonthlyIncrease)} לחודש
                    {data.ANALYSIS.futureMonthlyIncreaseInYears
                      ? ` בעוד ${describeMonths(data.ANALYSIS.futureMonthlyIncreaseInYears * 12)}`
                      : ''}
                  </li>
                )}
              </ul>
            </div>
          )}
        </Block>
      </div>

      <Block
        icon={ShieldAlert}
        title="עמידה בדרישות הבנקים ובמגבלות הרגולציה"
        subtitle="הוראות בנק ישראל מול העסקה שלכם"
        accent="from-slate-700 to-slate-900"
      >
        <div className="space-y-2.5">
          {report.checks.map((check) => {
            const style = STATUS_STYLE[check.status];
            return (
              <div key={check.key} className={`rounded-2xl border-2 p-3.5 ${style.box}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-black ${style.text}`}>
                    {style.icon}
                    {style.label}
                  </span>
                  <span className="text-sm font-black text-slate-900">{check.label}</span>
                  <span className="text-base font-black tabular-nums text-slate-900">{check.value}</span>
                  <span className="text-xs font-bold text-slate-600">מגבלה: {check.limit}</span>
                </div>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-700">{check.note}</p>
              </div>
            );
          })}
        </div>
      </Block>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block icon={AlertTriangle} title="סיכונים" subtitle="מה יכול לעצור את הבקשה או להכביד על התזרים" accent="from-rose-600 to-orange-500">
          {report.risks.length === 0 ? (
            <p className="text-sm text-slate-500">לא זוהו סיכונים מיוחדים בפרופיל. זה נדיר — ומצוין.</p>
          ) : (
            <ul className="space-y-2.5">
              {report.risks.map((risk) => {
                const tone = RISK_TONE[risk.tone];
                const Icon = tone.icon;
                return (
                  <li key={risk.id} className={`rounded-2xl border p-3 ${tone.ring}`}>
                    <div className="flex items-start gap-2.5">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconColor}`} />
                      <div>
                        <div className="text-sm font-black text-slate-900">{risk.title}</div>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{risk.body}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Block>

        <Block icon={Lightbulb} title="המלצות" subtitle="מה שצף בזמן מילוי הפרטים, ומה שנגזר לתמהיל" accent="from-amber-500 to-yellow-400">
          {report.alerts.length === 0 && report.recommendations.length === 0 ? (
            <p className="text-sm text-slate-500">
              עדיין אין המלצות ייעודיות. הן יופיעו כשיוזנו הנכס, ההכנסות והבנק של החשבון.
            </p>
          ) : (
            <div className="space-y-2.5">
              {report.alerts.map((item) => (
                <RecommendationCard key={item.id} recommendation={item} compact />
              ))}
              {report.recommendations.map((item) => (
                <div key={item.title} className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5">
                  <h5 className="flex items-center gap-2 text-sm font-black text-blue-900">
                    <Lightbulb className="h-4 w-4 shrink-0" />
                    {item.title}
                  </h5>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </Block>
      </div>

      <Block
        icon={Compass}
        title="קווים מנחים לבניית התמהיל"
        subtitle="איזון בין עלות המימון, גמישות לשינויים ולפירעונות מוקדמים, סיכון ויציבות — לפי הפרופיל שלכם"
        accent="from-emerald-600 to-teal-500"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {report.guidelines.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                  {index + 1}
                </span>
                <h5 className="text-sm font-black text-slate-900">{item.title}</h5>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block
        icon={FileText}
        title="רשימת המסמכים להגשת הבקשה לבנקים"
        subtitle="לפי הרכב הלווים, אופן ההעסקה, ניהול החשבון וסוג העסקה"
        accent="from-indigo-600 to-blue-500"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {report.documents.map((group) => (
            <div key={group.title} className="rounded-2xl border border-slate-100 bg-white p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                <h5 className="text-[13px] font-black text-slate-800">{group.title}</h5>
              </div>
              <ul className="space-y-1.5">
                {group.documents.map((name) => (
                  <li key={name} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                    {name}
                  </li>
                ))}
                {group.documents.length === 0 && (
                  <li className="text-xs text-slate-400">הרשימה תיבנה אחרי בחירת אופן ההעסקה.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4">
          <h5 className="flex items-center gap-2 text-sm font-black text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            לפני ההגשה — הצליבו את הסכומים וודאו שכל מסמך תקין ומלא
          </h5>
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-amber-900">{DOCUMENT_CONSISTENCY_WARNING}</p>
        </div>
      </Block>

      {!sample && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => printProfileReport(report, planName)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-3.5 text-base font-black text-white shadow-lg transition-colors hover:bg-slate-700"
          >
            <Download className="h-5 w-5" />
            הורדת הדוח כ-PDF
          </button>
        </div>
      )}

      <p className="px-2 text-center text-[11px] font-medium leading-relaxed text-slate-500">
        ההחזר החודשי, יחס ההחזר וסך הריביות הם הערכה לפי ריבית קבועה לא צמודה של {summary.estimateRate}% על
        כל הסכום, לצורך סדר גודל בלבד. הדוח אינו אישור עקרוני ואינו מחייב בנק כלשהו — ההחלטה על אישור
        המשכנתא, גובהה והריביות נתונה לחיתום הבנק בלבד.
      </p>
    </section>
  );
}
