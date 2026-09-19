'use client';

import React, { useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Compass,
  Download,
  FileText,
  HelpCircle,
  Home,
  Info,
  Layers,
  Lightbulb,
  ShieldAlert,
  Users,
  Wallet,
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
import {
  CashFlowTimeline,
  CashFlowWaterfall,
  LimitGauge,
  MixTracks,
  ProcessGantt,
  distanceToLimit,
} from './ReportCharts';

const STATUS_STYLE: Record<
  CheckStatus,
  { box: string; text: string; chip: string; label: string; icon: React.ReactNode }
> = {
  pass: {
    box: 'border-emerald-300 bg-emerald-50/70',
    text: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-800',
    label: 'עומד בדרישה',
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  near: {
    box: 'border-amber-300 bg-amber-50/70',
    text: 'text-amber-700',
    chip: 'bg-amber-100 text-amber-800',
    label: 'קרוב למגבלה',
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  fail: {
    box: 'border-rose-300 bg-rose-50/70',
    text: 'text-rose-700',
    chip: 'bg-rose-100 text-rose-800',
    label: 'אינו עומד בדרישה',
    icon: <XCircle className="h-5 w-5" />,
  },
  unknown: {
    box: 'border-slate-300 bg-slate-50',
    text: 'text-slate-600',
    chip: 'bg-slate-100 text-slate-600',
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
  badge,
  tone = 'border-slate-200 bg-white',
  children,
}: {
  icon: typeof Home;
  title: string;
  subtitle?: string;
  accent: string;
  badge?: React.ReactNode;
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-3xl border-2 text-right shadow-sm ${tone}`}>
      <div className={`h-1 w-full bg-gradient-to-l ${accent}`} />
      <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} shadow-md`}>
          <Icon className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-slate-900">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        {badge}
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

/** כותרת משנה בתוך בלוק — מפרידה בין גרף לגרף */
function SubTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <h5 className="text-[13px] font-black text-slate-800">{children}</h5>
      {hint && <p className="text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}

/**
 * התוצר של השלב הראשון — דוח פרופיל פיננסי כלוח בקרה.
 *
 * למעלה מספרי המפתח והמצב מול הרגולציה, ואז מי לוקח ומה העסקה, המדים של יחס
 * המימון ויחס ההחזר מול מגבלות הרגולציה, התזרים החודשי ולאורך השנים, הבדיקות,
 * הסיכונים וההמלצות, לוח הזמנים של התהליך, תיק המסמכים, הקווים המנחים לתמהיל
 * ותיאור מסלולי המשכנתא. אותו תוכן יוצא לקובץ בהורדה. `sample` מציג דוח דמה
 * במסך «על השלב».
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
  const { summary, cashFlow } = report;
  const date = useMemo(
    () => new Intl.DateTimeFormat('he-IL', { dateStyle: 'long' }).format(new Date(report.generatedAt)),
    [report.generatedAt]
  );
  const afterStatus: CheckStatus = !summary.ready
    ? 'unknown'
    : cashFlow.remaining < 0
      ? 'fail'
      : cashFlow.remaining < summary.totalIncome * 0.25
        ? 'near'
        : 'pass';
  const equityStatus: CheckStatus = summary.equityGap > 0 ? 'fail' : summary.ready ? 'pass' : 'unknown';
  const ltvComfort = Math.max(0, summary.maxLtv - 2);
  const stageCount = report.timeline.filter((item) => item.kind === 'stage').length;
  const totalWeeks = Math.max(...report.timeline.map((item) => item.endWeek));
  const download = !sample ? (
    <button
      type="button"
      onClick={() => printProfileReport(report, planName)}
      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-900 shadow-lg transition-all hover:bg-blue-50"
    >
      <Download className="h-4 w-4" />
      הורדת הדוח
    </button>
  ) : null;

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
                  התוצר של השלב
                </span>
                {sample && (
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-900">דוגמה</span>
                )}
              </div>
              <h3 className="mt-3 text-2xl font-black leading-tight md:text-3xl">דוח פרופיל פיננסי</h3>
              <p className="mt-1 text-sm text-white/80">{planName || 'הפרופיל הפיננסי שלכם'}</p>
              <p className="mt-0.5 text-sm text-white/60">
                {report.headline} · הופק {date}
              </p>
            </div>
            {download}
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
              note={`תקרה ${summary.maxLtv}% לסוג העסקה · ${distanceToLimit(summary.ltv, summary.maxLtv)}`}
              status={summary.ltvStatus}
            />
            <Tile
              dark
              label="יחס החזר"
              value={formatPercent(summary.repaymentRatio)}
              note={`מגבלה ${summary.ratioLimit}% · נוח עד ${summary.ratioComfort}% · ${distanceToLimit(summary.repaymentRatio, summary.ratioLimit)}`}
              status={summary.ratioStatus}
            />
            <Tile
              dark
              label="הון עצמי בעסקה"
              value={summary.ready ? formatShekel(summary.equityInDeal) : formatShekel(summary.equity)}
              note={summary.equityGap > 0 ? `חסרים ${formatShekel(summary.equityGap)} לתקרת המימון` : 'מכסה את המינימום לסוג העסקה'}
              status={equityStatus}
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
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            הבטוחה למשכנתא היא הנכס עצמו. הפער מהתקרה הוא מרווח הביטחון שלכם מול שמאות נמוכה
            ממחיר הרכישה.
          </p>
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
            <Row label="הוצאות שוטפות" value={formatShekel(cashFlow.expenses)} />
            <Row label="החזר על הלוואות קיימות" value={formatShekel(summary.existingLoans)} />
            <Row label="הכנסה פנויה לפני המשכנתא" value={formatShekel(cashFlow.disposable)} />
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

      {/* המדים: יחס המימון ויחס ההחזר מול המגבלות */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Block
          icon={Home}
          title="יחס המימון מול תקרת בנק ישראל"
          subtitle={`${summary.dealTypeLabel ?? 'לסוג העסקה'} · תקרה ${summary.maxLtv}% משווי הנכס`}
          accent="from-blue-600 to-cyan-500"
          badge={<StatusChip status={summary.ltvStatus} />}
        >
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <LimitGauge
              value={summary.ltv}
              limit={summary.maxLtv}
              comfort={ltvComfort}
              status={summary.ltvStatus}
              label="שיעור המימון"
            />
            <div className="space-y-2 text-[12px] leading-relaxed text-slate-600">
              <p className="text-sm font-black text-slate-900">{distanceToLimit(summary.ltv, summary.maxLtv)}</p>
              <p>
                הבנק מממן אחוז מהנמוך מבין מחיר הרכישה לשווי השמאות. הקשת כולה היא הטווח המותר,
                והחלק הכתום שלפני הקצה הוא המרווח שבו ירידה קטנה בשמאות כבר מוציאה את העסקה
                מהמגבלה.
              </p>
              <Row label="מחיר הנכס" value={formatShekel(summary.propertyValue)} />
              <Row label="משכנתא מבוקשת" value={summary.ready ? formatShekel(summary.mortgageAmount) : '—'} />
              <Row
                label="המשכנתא המרבית לפי התקרה"
                value={summary.propertyValue ? formatShekel((summary.propertyValue * summary.maxLtv) / 100) : '—'}
              />
            </div>
          </div>
        </Block>

        <Block
          icon={Wallet}
          title="יחס ההחזר מול המגבלה"
          subtitle={`ההחזר החודשי מתוך ההכנסה נטו אחרי הלוואות · מגבלה ${summary.ratioLimit}%, נוח עד ${summary.ratioComfort}%`}
          accent="from-violet-600 to-fuchsia-500"
          badge={<StatusChip status={summary.ratioStatus} />}
        >
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <LimitGauge
              value={summary.repaymentRatio}
              limit={summary.ratioLimit}
              comfort={summary.ratioComfort}
              status={summary.ratioStatus}
              label="יחס ההחזר"
            />
            <div className="space-y-2 text-[12px] leading-relaxed text-slate-600">
              <p className="text-sm font-black text-slate-900">{distanceToLimit(summary.repaymentRatio, summary.ratioLimit)}</p>
              <p>
                מעל {summary.ratioLimit}% הבקשה כמעט תמיד נדחית, ובין {summary.ratioComfort}% ל-{summary.ratioLimit}% החיתום
                מחמיר. היחס כאן מחושב לפי החזר משוער — הערכה שמפורטת בסוף הדוח.
              </p>
              <Row label="הכנסה נטו של משק הבית" value={formatShekel(summary.totalIncome)} />
              <Row label="החזר על הלוואות קיימות" value={formatShekel(summary.existingLoans)} />
              <Row
                label="ההחזר החודשי שיביא למגבלה"
                value={formatShekel(Math.max(0, summary.totalIncome - summary.existingLoans) * (summary.ratioLimit / 100))}
              />
            </div>
          </div>
        </Block>
      </div>

      {/* התזרים: המפל החודשי, ולאורך השנים */}
      <Block
        icon={Wallet}
        title="ההכנסה הפנויה והערכת הכסף שיישאר אחרי תשלום המשכנתא"
        subtitle="הכנסה, הוצאות שוטפות, הלוואות קיימות וההחזר המשוער — היום ולאורך חיי המשכנתא"
        accent="from-teal-600 to-emerald-500"
        badge={<StatusChip status={afterStatus} />}
      >
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-3.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-[12px] font-bold leading-relaxed text-amber-900">
            ההחזר החודשי המשוער כאן הוא הערכה גסה בלבד, שנועדה לתת סדר גודל.
            <span className="font-black">
              {' '}
              ההחזר המדויק ייחושב לאחר בניית התמהיל והשגת הריביות הטובות ביותר שאפשר מהגוף המממן
              שייבחר לעסקה.
            </span>
          </p>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Tile label="הכנסה פנויה לפני המשכנתא" value={formatShekel(cashFlow.disposable)} note="הכנסה נטו פחות הוצאות שוטפות ופחות הלוואות" />
          <Tile
            label="נשאר אחרי המשכנתא"
            value={summary.ready ? formatShekel(cashFlow.remaining) : '—'}
            note={
              cashFlow.remainingShare !== null
                ? `${cashFlow.remainingShare.toFixed(0)}% מסך ההכנסה · לפי ההחזר המשוער`
                : 'יחושב כשיוזנו הנכס וההכנסות'
            }
            status={afterStatus}
          />
          <Tile
            label="יחס ההחזר מול המגבלה"
            value={formatPercent(summary.repaymentRatio)}
            note={`${distanceToLimit(summary.repaymentRatio, summary.ratioLimit)} · נוח עד ${summary.ratioComfort}%`}
            status={summary.ratioStatus}
          />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <SubTitle hint="מההכנסה נטו יורדות ההוצאות וההלוואות, ואז ההחזר המשוער — מה שנשאר הוא הכסף הפנוי החודשי.">
              התזרים החודשי היום
            </SubTitle>
            <CashFlowWaterfall steps={cashFlow.steps} />
          </div>
          <div>
            <SubTitle hint={`הלוואה שמסתיימת והכנסה שגדלה מסומנות כנקודות. הקו המקווקו הוא הרצפה שנגזרת ממגבלת ${summary.ratioLimit}% — מתחתיו הבנק לא היה מאשר.`}>
              לאורך חיי המשכנתא
            </SubTitle>
            <CashFlowTimeline points={cashFlow.timeline} ratioLimit={summary.ratioLimit} ratioComfort={summary.ratioComfort} />
          </div>
        </div>
        {cashFlow.timeline.some((point) => point.events.length > 0) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {cashFlow.timeline
              .filter((point) => point.events.length > 0)
              .map((point) => (
                <li key={point.year} className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-900 ring-1 ring-teal-200">
                  שנה {point.year}: {point.events.join(' · ')} → נשאר {formatShekel(point.remaining)}
                </li>
              ))}
          </ul>
        )}
      </Block>

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

      {/* לוח הזמנים של התהליך */}
      <Block
        icon={CalendarClock}
        title="לוח הזמנים של התהליך"
        subtitle={`${stageCount} שלבים ושתי אבני דרך שמלוות אותם — כ-${totalWeeks} שבועות בקצב אופייני, מהפרופיל ועד החתימה`}
        accent="from-amber-500 to-orange-600"
      >
        <ProcessGantt items={report.timeline} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-right text-xs">
            <thead>
              <tr className="text-[11px] font-black text-slate-500">
                <th className="pb-2 pl-3 font-black">שלב / אבן דרך</th>
                <th className="pb-2 pl-3 font-black">מתי</th>
                <th className="pb-2 pl-3 font-black">משך אופייני</th>
                <th className="pb-2 font-black">מה חשוב</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.timeline.map((item) => (
                <tr key={item.id} className={item.emphasized ? 'bg-amber-50/60' : undefined}>
                  <td className="py-2 pl-3 font-black text-slate-900">{item.label}</td>
                  <td className="py-2 pl-3 text-slate-700">{item.when}</td>
                  <td className="py-2 pl-3 text-slate-700">{item.duration}</td>
                  <td className="py-2 leading-snug text-slate-600">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          הזמנים הם קצב אופייני של תהליך שמתקדם בלי עיכובים. מועדי התשלום בחוזה המכר, תוקף האישור
          העקרוני וזמן הביצוע בבנק הם מה שקובע בפועל — ולכן כדאי לתאם אותם מראש.
        </p>
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

      {/* מסלולי המשכנתא — מה כל אחד מביא לתמהיל */}
      <Block
        icon={Layers}
        title="הרכב מסלולי המשכנתא — תיאור סכמטי"
        subtitle="שלוש זוויות שכל תמהיל מאזן ביניהן: יציבות מול סיכון, גמישות לשינויים, ועלות המימון"
        accent="from-emerald-600 to-teal-500"
        badge={
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-600">
            תיאור עקרוני · הסכומים ייקבעו בשלב התמהיל
          </span>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-[12px] leading-relaxed text-slate-600">
            <div className="mb-1 text-[13px] font-black text-slate-900">סיכון ↔ יציבות</div>
            ריבית קבועה נועלת את ההחזר ומבטלת הפתעות; פריים ומשתנה זולים יותר בהתחלה אבל ההחזר זז עם
            השוק. ככל שיחס ההחזר קרוב למגבלה, כך צריך יותר יציבות.
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-[12px] leading-relaxed text-slate-600">
            <div className="mb-1 text-[13px] font-black text-slate-900">גמישות ↔ עמלת היוון</div>
            במסלולי פריים ומשתנה אפשר לפרוע מוקדם ולמחזר בלי קנס; בקבועה ייתכן קנס כשהריביות יורדות.
            כסף שצפוי להיכנס מכוון למסלול הגמיש.
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-[12px] leading-relaxed text-slate-600">
            <div className="mb-1 text-[13px] font-black text-slate-900">עלות ↔ ביטחון</div>
            הריבית הקבועה היא המחיר של הביטוח. סך הריביות נקבע גם מהתקופה של כל מסלול — מקצרים את
            היקרים, מאריכים את הזולים, ומתכננים פירעון מוקדם שמקצר את הכל.
          </div>
        </div>

        <MixTracks tracks={report.mixTracks} />
      </Block>

      {!sample && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => printProfileReport(report, planName)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-3.5 text-base font-black text-white shadow-lg transition-colors hover:bg-slate-700"
          >
            <Download className="h-5 w-5" />
            הורדת הדוח
          </button>
        </div>
      )}

      <p className="px-2 text-center text-[11px] font-medium leading-relaxed text-slate-500">
        ההחזר החודשי ויחס ההחזר שבדוח הם הערכה גסה לפי ריבית קבועה לא צמודה של {summary.estimateRate}% על
        כל הסכום, לצורך סדר גודל בלבד; ההחזר המדויק ייחושב לאחר בניית התמהיל והשגת הריביות מול הגוף
        המממן. הדוח אינו אישור עקרוני ואינו מחייב בנק כלשהו — ההחלטה על אישור המשכנתא, גובהה
        והריביות נתונה לחיתום הבנק בלבד.
      </p>
    </section>
  );
}
