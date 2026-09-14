'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Calculator,
  Check,
  Compass,
  FileText,
  Gavel,
  ListChecks,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import { journeyStageFor, PLAN_JOURNEY_STAGES } from '@/data/platform/planStages';
import { formatDate, formatTime, relativeDayLabel } from '@/lib/advisor-crm';
import { summarizePlan, upcomingEvents } from '@/lib/client-agenda';
import type { AgendaTarget, DashboardSection } from '@/lib/client-agenda';
import { StartCard, useStartPlan } from '@/components/plan/StartCard';
import { AdvisorCta } from './AdvisorCta';
import { MiniCalendar, eventTone } from './ClientCalendar';
import { TaskItem } from './TaskItem';
import { DashCard } from './ui';
import type { ClientDashboardData } from './useClientDashboard';

/** "היום" / "מחר", ואחרת יום.חודש — קצר מספיק לתיבת המועד */
function shortDayLabel(iso: string): string {
  const relative = relativeDayLabel(iso);
  return relative === 'היום' || relative === 'מחר' ? relative : formatDate(iso).slice(0, 5);
}

/**
 * הסקירה — המסך הראשון, בלי גלילה במסך רגיל.
 *
 * "איפה אתם בתהליך" הוא נקודת ההתחלה של הכול, ולכן כשעדיין אין תהליך הוא
 * במרכז המסך; כשכבר יש תהליך הוא יושב לצד מצב התהליכים. מתחת: ארבעה מספרים,
 * היומן הקרוב, המשימות הבאות, הפעולות המהירות והפנייה ליועץ. כל כרטיס מוביל
 * לאזור המפורט שלו.
 */
export function OverviewSection({
  data,
  onNavigate,
}: {
  data: ClientDashboardData;
  onNavigate: (section: DashboardSection, day?: string) => void;
}) {
  const { plansState, tasks, events, requests, advisorStages, ready } = data;
  const { startPlan, busy } = useStartPlan(plansState.start);
  const active = plansState.plans.filter((plan) => plan.status === 'IN_PROGRESS');
  const summaries = active.map((plan) => summarizePlan(plan, advisorStages[plan.id]));
  const upcoming = upcomingEvents(events, new Date(), 3);
  const next = upcoming[0] ?? null;
  const urgent = tasks.filter((task) => task.tone === 'urgent').length;
  const lead = summaries[0] ?? null;
  const hasPlans = plansState.plans.length > 0;

  const go = (target: AgendaTarget) => {
    if (target.kind === 'section') onNavigate(target.section);
    else window.location.assign(target.href);
  };

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
      </div>
    );
  }

  const kpis = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        icon={<Compass className="h-5 w-5" />}
        tone="blue"
        label="משכנתאות בתהליך"
        value={`${active.length}`}
        hint={active.length === 0 ? 'עוד לא התחלתם תהליך' : 'לכל המשכנתאות'}
        onClick={() => onNavigate('mortgages')}
      />
      <KpiTile
        icon={<ListChecks className="h-5 w-5" />}
        tone="violet"
        label="השלב הנוכחי"
        value={lead ? `שלב ${lead.stageNumber}` : '—'}
        hint={lead ? journeyStageFor(lead.currentStage).shortTitle : 'מתחילים ב"איפה אתם בתהליך"'}
        onClick={() => (lead ? window.location.assign(lead.href) : onNavigate('mortgages'))}
      />
      <KpiTile
        icon={<CalendarDays className="h-5 w-5" />}
        tone={next && !next.confirmed && next.kind === 'meeting' ? 'amber' : 'emerald'}
        label="הפגישה הקרובה"
        value={next ? `${shortDayLabel(next.at)} ${formatTime(next.at)}` : 'אין'}
        hint={next ? next.title : 'לא נקבעה פגישה'}
        onClick={() => onNavigate('agenda')}
      />
      <KpiTile
        icon={<ListChecks className="h-5 w-5" />}
        tone={urgent > 0 ? 'rose' : 'slate'}
        label="משימות פתוחות"
        value={`${tasks.length}`}
        hint={urgent > 0 ? `${urgent} דורשות טיפול מיידי` : 'הכול מעודכן'}
        onClick={() => onNavigate('agenda')}
      />
    </div>
  );

  const agendaCard = (
    <DashCard
      title="היומן הקרוב"
      icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
      action={<CardLink onClick={() => onNavigate('agenda')}>ללוח המלא</CardLink>}
    >
      <div className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-center text-sm text-slate-500">
            אין פגישות או מועדים קרובים
          </p>
        ) : (
          upcoming.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => go(event.target)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right transition-colors hover:border-blue-300"
            >
              <span className="flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 text-slate-800">
                <span className="text-[11px] font-bold leading-none text-slate-500">{shortDayLabel(event.at)}</span>
                <span className="mt-0.5 text-sm font-black leading-none">{formatTime(event.at)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-black text-slate-900">{event.title}</span>
                <span className="block truncate text-[13px] text-slate-500">{event.subtitle}</span>
              </span>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${eventTone(event).dot}`} />
            </button>
          ))
        )}
        <MiniCalendar events={events} onSelect={(day) => onNavigate('agenda', day)} />
      </div>
    </DashCard>
  );

  const tasksCard = (
    <DashCard
      title="המשימות הבאות שלי"
      icon={<ListChecks className="h-5 w-5 text-blue-600" />}
      action={<CardLink onClick={() => onNavigate('agenda')}>לכל המשימות</CardLink>}
    >
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-5 w-5" />
          </span>
          <p className="text-[15px] font-bold text-slate-700">אין משימות פתוחות</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 4).map((task) => (
            <TaskItem key={task.id} task={task} compact onOpen={go} />
          ))}
        </div>
      )}
    </DashCard>
  );

  const actionsColumn = (
    <div className="flex flex-col gap-4">
      <DashCard title="פעולות מהירות" icon={<Calculator className="h-5 w-5 text-blue-600" />}>
        <div className="grid grid-cols-2 gap-2">
          <QuickAction href="/principal-approval" icon={<FileText className="h-4 w-4" />} label="אישור עקרוני — פרטי הבקשה" />
          <QuickAction
            onClick={() => onNavigate('rate-requests')}
            icon={<Gavel className="h-4 w-4" />}
            label="תמהילים שהוגשו לבנקים"
            badge={requests.length}
          />
          <QuickAction href="/dashboard/mix-planner" icon={<Calculator className="h-4 w-4" />} label="בניית תמהיל" />
          <QuickAction
            href="/mortgage-planning?flow=affordability"
            icon={<Search className="h-4 w-4" />}
            label="בדיקת היתכנות"
          />
          <QuickAction href="/mortgage-refinance" icon={<RefreshCw className="h-4 w-4" />} label="מיחזור משכנתא" />
          <QuickAction
            onClick={() => onNavigate('settings')}
            icon={<UserRound className="h-4 w-4" />}
            label="פרטי הלווים והחשבון"
          />
        </div>
      </DashCard>
      <AdvisorCta variant="banner" />
    </div>
  );

  if (active.length === 0) {
    // בלי תהליך — נקודת ההתחלה היא המסך
    return (
      <div className="grid gap-4">
        <StartCard variant="hero" onStart={startPlan} busy={busy} hasPlans={hasPlans} />
        {kpis}
        <div className="grid gap-4 lg:grid-cols-3">
          {agendaCard}
          {tasksCard}
          {actionsColumn}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {kpis}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DashCard
          title="המשכנתאות שלי — מצב נוכחי"
          icon={<Compass className="h-5 w-5 text-blue-600" />}
          action={<CardLink onClick={() => onNavigate('mortgages')}>לכל המשכנתאות</CardLink>}
        >
          <div className="max-h-[420px] space-y-3 overflow-y-auto pl-1">
            {summaries.map((summary) => (
              <PlanStatusRow key={summary.id} summary={summary} />
            ))}
          </div>
        </DashCard>

        <StartCard variant="compact" onStart={startPlan} busy={busy} hasPlans={hasPlans} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {agendaCard}
        {tasksCard}
        {actionsColumn}
      </div>
    </div>
  );
}

const KPI_TONES = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
} as const;

function KpiTile({
  icon,
  tone,
  label,
  value,
  hint,
  onClick,
}: {
  icon: ReactNode;
  tone: keyof typeof KPI_TONES;
  label: string;
  value: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${KPI_TONES[tone]}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-slate-500">{label}</span>
        <span className="block truncate text-2xl font-black leading-tight text-slate-900">{value}</span>
        <span className="block truncate text-[13px] text-slate-500">{hint}</span>
      </span>
    </button>
  );
}

function CardLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-black text-blue-600 hover:underline"
    >
      {children}
      <ArrowLeft className="h-3.5 w-3.5" />
    </button>
  );
}

/** שורת מצב של תהליך אחד: חמשת השלבים כמסלול, ומה הפעולה הבאה */
function PlanStatusRow({ summary }: { summary: ReturnType<typeof summarizePlan> }) {
  const journey = journeyStageFor(summary.currentStage);
  const progress = Math.round((summary.completedStages / summary.stages.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-lg font-black text-slate-900">
          <MapPin className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="truncate">{summary.label}</span>
        </p>
        <span className={`rounded-full bg-gradient-to-l ${journey.gradient} px-3 py-1 text-[13px] font-black text-white`}>
          שלב {summary.stageNumber} · {journey.shortTitle}
        </span>
      </div>

      <ol className="mt-4 grid grid-cols-5 gap-1">
        {PLAN_JOURNEY_STAGES.map((stage, index) => {
          const status = summary.stages[index];
          const current = index + 1 === summary.stageNumber;
          return (
            <li key={stage.id} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                  status === 'COMPLETED'
                    ? 'bg-emerald-500 text-white'
                    : current
                      ? `bg-gradient-to-br ${stage.gradient} text-white ring-4 ring-white`
                      : 'bg-white text-slate-400 ring-1 ring-slate-200'
                }`}
              >
                {status === 'COMPLETED' ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className={`text-[13px] font-bold leading-tight ${current ? 'text-slate-900' : 'text-slate-500'}`}>
                {stage.shortTitle}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full bg-gradient-to-l ${journey.gradient}`}
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
        <span className="text-sm font-black text-slate-700">{progress}%</span>
        <Link
          href={summary.href}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[15px] font-black text-white ${
            summary.advisorStage ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-700'
          }`}
        >
          {summary.advisorStage ? 'היועץ מטפל · הצג פרטים' : 'המשיכו מהמקום שעצרתם'}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  onClick,
  icon,
  label,
  badge,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  const className =
    'flex min-h-[60px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-[15px] font-bold text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40';
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[13px] font-black text-amber-800">{badge}</span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
