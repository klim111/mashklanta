'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Calculator,
  Check,
  UserCheck,
  Compass,
  Eye,
  FileText,
  FolderOpen,
  Gavel,
  Layers,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { journeyStageFor } from '@/data/platform/planStages';
import { formatDate, formatTime, relativeDayLabel } from '@/lib/advisor-crm';
import { planCreatedLabel, summarizePlan, upcomingEvents } from '@/lib/client-agenda';
import type { AgendaTarget, DashboardSection } from '@/lib/client-agenda';
import { useStartPlan } from '@/components/plan/StartCard';
import { MortgageEntry } from '@/components/service-flow/MortgageEntry';
import { AdvisorCta } from './AdvisorCta';
import { MiniCalendar, eventTone } from './ClientCalendar';
import { DeletePlanDialog } from './DeletePlanDialog';
import { EquityOverviewCard } from './EquityOverviewCard';
import { PlanMixDetail, planMixOf } from './PlanMixDetail';
import { PlanPeekDialog } from './PlanPeekDialog';
import { TaskGroupsList } from './TaskGroups';
import { PlanRecommendations } from './PlanRecommendations';
import { DashCard } from './ui';
import type { ClientDashboardData } from './useClientDashboard';

/** "היום" / "מחר", ואחרת יום.חודש — קצר מספיק לתיבת המועד */
function shortDayLabel(iso: string): string {
  const relative = relativeDayLabel(iso);
  return relative === 'היום' || relative === 'מחר' ? relative : formatDate(iso).slice(0, 5);
}

/**
 * הסקירה — המסך הראשון.
 *
 * כשעדיין אין תהליך, פגישה או משימה, "איפה אתם בתהליך" הוא מרכז המסך: משם
 * מתחיל הכול, ושאר האזורים יושבים מתחתיו. אחרי הפעולה הראשונה התצוגה מתהפכת —
 * מצב התהליכים ולוח השנה למעלה, המשימות והפעולות מתחתם, והפנייה ליועץ בשורה
 * שלמה בתחתית. שאלת הפתיחה עצמה נשארת זמינה תמיד, בתפריט הצד.
 */
export function OverviewSection({
  data,
  detailPlanId,
  onDetailPlan,
  onNavigate,
}: {
  data: ClientDashboardData;
  /** התהליך שהתמהיל שלו נפתח בשורת הפירוט — נבחר גם מאזור המשכנתאות */
  detailPlanId: string | null;
  onDetailPlan: (planId: string | null) => void;
  onNavigate: (section: DashboardSection, day?: string) => void;
}) {
  const {
    plansState,
    mixesState,
    tasks,
    events,
    requests,
    advisorStages,
    advisorNotices,
    equityState,
    ready,
    taskStates,
    scheduleTask,
  } = data;
  const { startPlan, busy } = useStartPlan(plansState.start);
  const [peekPlanId, setPeekPlanId] = useState<string | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const active = plansState.plans.filter((plan) => plan.status === 'IN_PROGRESS');
  const completed = plansState.plans.filter((plan) => plan.status === 'COMPLETED');
  const summaries = active.map((plan) => summarizePlan(plan, advisorStages[plan.id]));
  const upcoming = upcomingEvents(events, new Date(), 3);
  const next = upcoming[0] ?? null;
  const urgent = tasks.filter((task) => task.tone === 'urgent').length;
  const lead = summaries[0] ?? null;

  const scrollToPlans = () =>
    document.getElementById('my-mortgages')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

  const detailPlan = plansState.plans.find((plan) => plan.id === detailPlanId) ?? null;
  const detailMixes = detailPlan
    ? mixesState.saved.filter(
        (mix) =>
          mix.planId === detailPlan.id ||
          (mix.mix.propertyAddress ?? '').trim() === (detailPlan.propertyAddress ?? '').trim()
      )
    : [];
  const detailMix = detailPlan ? planMixOf(detailPlan, detailMixes) : null;

  const planToDelete = plansState.plans.find((plan) => plan.id === deletePlanId) ?? null;
  const peekPlan = plansState.plans.find((plan) => plan.id === peekPlanId) ?? null;
  const peekMixes = peekPlan
    ? mixesState.saved.filter(
        (mix) =>
          mix.planId === peekPlan.id ||
          (mix.mix.propertyAddress ?? '').trim() === (peekPlan.propertyAddress ?? '').trim()
      )
    : [];

  const kpis = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        icon={<Compass className="h-5 w-5" />}
        tone="blue"
        label="משכנתאות בתהליך"
        value={`${active.length}`}
        hint={active.length === 0 ? 'בחרו למטה מה תרצו לעשות' : 'המצב הנוכחי למטה'}
        onClick={scrollToPlans}
      />
      <KpiTile
        icon={<ListChecks className="h-5 w-5" />}
        tone="violet"
        label="השלב הנוכחי"
        value={lead ? `שלב ${lead.stageNumber}` : '—'}
        hint={lead ? journeyStageFor(lead.currentStage).shortTitle : 'מתחילים ב״מה תרצו לעשות?״'}
        onClick={() => (lead ? window.location.assign(lead.href) : scrollToPlans())}
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

  const calendarCard = (
    <DashCard
      title="לוח השנה שלי"
      icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
      action={<GoLink onClick={() => onNavigate('agenda')}>ללוח המלא</GoLink>}
    >
      <div className="space-y-3">
        <MiniCalendar events={events} onSelect={(day) => onNavigate('agenda', day)} />
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-center text-[13px] font-black text-slate-500">הקרוב ביומן</p>
          {upcoming.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-sm text-slate-500">
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
                  <span className="text-[11px] font-bold leading-none text-slate-500">
                    {shortDayLabel(event.at)}
                  </span>
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
        </div>
      </div>
    </DashCard>
  );

  const tasksCard = (
    <DashCard
      title="המשימות שלי"
      icon={<ListChecks className="h-5 w-5 text-blue-600" />}
      action={<GoLink onClick={() => onNavigate('agenda')}>לכל המשימות</GoLink>}
    >
      <TaskGroupsList
        tasks={tasks}
        compact
        onOpen={(task) => go(task.target)}
        onSchedule={scheduleTask}
      />
    </DashCard>
  );

  const quickActions = (
    <DashCard title="פעולות מהירות" icon={<Calculator className="h-5 w-5 text-blue-600" />}>
      <div className="grid grid-cols-2 gap-2">
        <QuickAction
          href="/principal-approval"
          icon={<FileText className="h-4 w-4" />}
          label="אישור עקרוני — פרטי הבקשה"
        />
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
        <QuickAction
          onClick={() => onNavigate('documents')}
          icon={<FolderOpen className="h-4 w-4" />}
          label="תיק המסמכים שלי"
        />
        <QuickAction href="/mortgage-refinance" icon={<RefreshCw className="h-4 w-4" />} label="מיחזור משכנתא" />
        <QuickAction
          onClick={() => onNavigate('expenses')}
          icon={<Wallet className="h-4 w-4" />}
          label="תכנון הוצאות והון עצמי"
        />
        <QuickAction
          onClick={() => onNavigate('settings')}
          icon={<UserRound className="h-4 w-4" />}
          label="פרטי הלווים והחשבון"
        />
      </div>
    </DashCard>
  );

  /** שורת הפירוט: התמהיל של התהליך שנבחר, דוחפת את שאר השורות מטה */
  const detailRow = detailPlan && detailMix && (
    <DashCard
      title="התמהיל של המשכנתא שנבחרה"
      icon={<Layers className="h-5 w-5 text-blue-600" />}
      action={
        <button
          type="button"
          onClick={() => onDetailPlan(null)}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-black text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
          סגירה
        </button>
      }
    >
      <p className="mb-3 text-center text-[15px] font-bold text-slate-600">
        {detailPlan.propertyAddress || detailPlan.name} · {planCreatedLabel(detailPlan.createdAt)}
      </p>
      <PlanMixDetail mix={detailMix} planId={detailPlan.id} />
    </DashCard>
  );

  const peekDialog = peekPlan && (
    <PlanPeekDialog
      plan={peekPlan}
      mixes={peekMixes}
      advisorStages={advisorStages[peekPlan.id] ?? []}
      open
      onOpenChange={(open) => {
        if (!open) setPeekPlanId(null);
      }}
      onShowMix={() => onDetailPlan(peekPlan.id)}
    />
  );

  return (
    <div className="grid gap-4">
      {kpis}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DashCard
          title="המשכנתא שלי"
          icon={<Compass className="h-5 w-5 text-blue-600" />}
          className="scroll-mt-24"
          id="my-mortgages"
        >
          {/*
            מה שהיועץ מטפל בו — מעל כל השאר בכרטיס, כי זה מה שקורה עכשיו בלי
            שהלקוח צריך לעשות דבר. שלב שנסגר נשאר כאן בנוסח «סיים לטפל», עם
            השלב שהלקוח עומד בו כעת.
          */}
          {advisorNotices.length > 0 && (
            <ul className="mb-3 space-y-2">
              {advisorNotices.map((notice) => (
                <li key={notice.id}>
                  <Link
                    href={notice.href}
                    className={`flex flex-wrap items-center gap-2 rounded-2xl border-2 px-4 py-3 text-right transition-colors ${
                      notice.done
                        ? 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-400'
                        : 'border-violet-200 bg-violet-50/70 hover:border-violet-400'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white ${
                        notice.done ? 'bg-emerald-600' : 'bg-violet-600'
                      }`}
                    >
                      {notice.done ? <Check className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black text-slate-900">
                        {notice.done
                          ? `היועץ סיים לטפל בשלב ${notice.stageNumber} · ${notice.stageTitle}`
                          : `היועץ מטפל בשלב ${notice.stageNumber} · ${notice.stageTitle}`}
                      </span>
                      <span className="block text-[13px] font-medium text-slate-600">
                        {notice.done
                          ? `אתם עכשיו בשלב ${notice.currentStageNumber} · ${notice.currentStageTitle}`
                          : 'אין מה לעשות מצדכם עכשיו. כשהיועץ יסיים או יקבע פגישה, זה יופיע כאן.'}
                        {summaries.length > 1 ? ` · ${notice.planLabel}` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {summaries.length === 0 ? (
            /*
              עדיין אין משכנתא או מיחזור פעילים — נקודת ההתחלה יושבת כאן, בתוך
              הכרטיס עצמו: "מה תרצו לעשות?" עם כל הכפתורים והפעולות שמתחתיו.
            */
            <MortgageEntry variant="hero" onStart={startPlan} busy={busy} hasPlans={completed.length > 0} />
          ) : (
            <div className="max-h-[430px] space-y-3 overflow-y-auto pl-1">
              {summaries.map((summary) => (
                <PlanStatusRow
                  key={summary.id}
                  summary={summary}
                  onPeek={() => setPeekPlanId(summary.id)}
                  onDelete={() => setDeletePlanId(summary.id)}
                />
              ))}
            </div>
          )}

          {/* משכנתאות שהסתיימו — רק כשיש כאלה */}
          {completed.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-black text-slate-500">
                <Check className="h-4 w-4 text-emerald-600" />
                משכנתאות שלקחתי ({completed.length})
              </p>
              <div className="space-y-2">
                {completed.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/dashboard/plans/${plan.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-[15px] transition-colors hover:border-emerald-400"
                  >
                    <span className="min-w-0 truncate font-black text-slate-900">
                      {plan.propertyAddress || plan.name}
                    </span>
                    <span className="shrink-0 text-[13px] font-bold text-emerald-800">
                      {plan.data.SIGNING.bank ? `בנק ${plan.data.SIGNING.bank} · ` : ''}לצפייה
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/*
            ללקוח שכבר פתח משכנתא, מה שחשוב מתחת לשורה שלה הוא מה כדאי לעשות
            עכשיו — ולא כפתור לפתיחת משכנתא נוספת. פתיחת תהליך נוסף נשארת
            זמינה משאלת הפתיחה שבתפריט הצד ומאזור המשכנתאות.
          */}
          {summaries.length === 0 ? (
            <div className="mt-4 flex justify-center border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-[15px] font-black text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-slate-700"
              >
                <Plus className="h-5 w-5" />
                משכנתא נוספת — מה תרצו לעשות?
              </button>
            </div>
          ) : (
            <PlanRecommendations
              plans={active}
              states={taskStates.states}
              onDone={(key, done) => taskStates.setDone(key, done)}
            />
          )}
        </DashCard>

        {calendarCard}
      </div>

      {detailRow}

      {/*
        העמודה הרחבה היא עמודת המשכנתא — ומתחתיה הפעולות המהירות; העמודה
        הצרה היא לוח השנה — ומתחתיו המשימות, שהמועד שלהן נקבע בלוח.
      */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {quickActions}
        {tasksCard}
      </div>

      {/* תוצרי כלי תכנון ההוצאות — זמינים כאן ברגע שהתכנון נשמר בחשבון */}
      <EquityOverviewCard plan={equityState.plan} onOpen={() => onNavigate('expenses')} />

      <AdvisorCta variant="row" />
      <MortgageEntry
        variant="dialog"
        open={addOpen}
        onOpenChange={setAddOpen}
        onStart={startPlan}
        busy={busy}
        hasPlans={plansState.plans.length > 0}
      />
      {peekDialog}
      {planToDelete && (
        <DeletePlanDialog
          plan={planToDelete}
          open
          onOpenChange={(open) => {
            if (!open) setDeletePlanId(null);
          }}
          onDelete={() => plansState.remove(planToDelete.id)}
        />
      )}
    </div>
  );
}

function GoLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
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

/** שורת מצב של תהליך אחד: חמשת השלבים כמסלול, ומה הפעולה הבאה */
function PlanStatusRow({
  summary,
  onPeek,
  onDelete,
}: {
  summary: ReturnType<typeof summarizePlan>;
  onPeek: () => void;
  onDelete: () => void;
}) {
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
      <p className="mt-0.5 text-[13px] text-slate-500">{planCreatedLabel(summary.createdAt)}</p>

      <ol
        className="mt-4 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${summary.stageIds.length}, minmax(0, 1fr))` }}
      >
        {summary.stageIds.map((stageId, index) => {
          const stage = journeyStageFor(stageId);
          const status = summary.stages[index];
          const current = index + 1 === summary.stageNumber;
          return (
            <li key={stageId} className="flex flex-col items-center gap-1.5 text-center">
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
                {summary.stageTitles[index]}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="h-2.5 min-w-[6rem] flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full bg-gradient-to-l ${journey.gradient}`}
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
        <span className="text-sm font-black text-slate-700">{progress}%</span>
        <button
          type="button"
          onClick={onPeek}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-[15px] font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
        >
          <Eye className="h-4 w-4" />
          להציץ בפרטים
        </button>
        <Link
          href={summary.href}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[15px] font-black text-white ${
            summary.advisorStage ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-700'
          }`}
        >
          {summary.advisorStage ? 'היועץ מטפל · הצג פרטים' : 'המשיכו'}
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          title="מחיקת התהליך"
          aria-label="מחיקת התהליך"
          className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-2.5 text-slate-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
