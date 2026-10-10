'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlarmClock,
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
  PhoneCall,
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
import { groupTasks, planCreatedLabel, summarizePlan, upcomingEvents } from '@/lib/client-agenda';
import type { AgendaTarget, CalendarEvent, DashboardSection } from '@/lib/client-agenda';
import { useStartPlan } from '@/components/plan/StartCard';
import { MortgageEntry } from '@/components/service-flow/MortgageEntry';
import { RateValidityDialog } from '@/components/plan/RateValidity';
import { leadRateValidity, rateValidity } from '@/lib/rate-validity';
import type { RateValidityRow } from '@/lib/rate-validity';
import { AdvisorCta } from './AdvisorCta';
import { MiniCalendar, eventTone } from './ClientCalendar';
import { DeletePlanDialog } from './DeletePlanDialog';
import { PlanMixDetail, planMixOf } from './PlanMixDetail';
import { PlanPeekDialog } from './PlanPeekDialog';
import { TaskGroupsList } from './TaskGroups';
import { PlanRecommendations } from './PlanRecommendations';
import { SavedToolsCard } from './SavedToolsCard';
import { DashCard } from './ui';
import { DashboardWorkspace } from './DashboardWorkspace';
import type { WorkspaceId } from './DashboardWorkspace';
import { SnapshotFloat } from './SnapshotFloat';
import type { SnapshotItem } from './SnapshotFloat';
import { useCashFlow } from '@/components/cash-flow/useCashFlow';
import { usePlatformAccess } from '@/components/service-flow/usePlatformAccess';
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
  workspace = null,
}: {
  data: ClientDashboardData;
  /** אזור שנפתח לרוחב שלוש העמודות כבר בכניסה — למשל `#cash-flow` */
  workspace?: WorkspaceId | null;
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
    pendingLead,
  } = data;
  /** בקשה מבחוץ לפתוח אחת משלוש העמודות — למשל מהשורה של הבקשה ליועץ */
  const [workspaceRequest, setWorkspaceRequest] = useState<{ id: WorkspaceId; nonce: number } | null>(null);
  const { startPlan, busy } = useStartPlan(plansState.start);
  const [peekPlanId, setPeekPlanId] = useState<string | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);

  const active = plansState.plans.filter((plan) => plan.status === 'IN_PROGRESS');
  const completed = plansState.plans.filter((plan) => plan.status === 'COMPLETED');
  const summaries = active.map((plan) => summarizePlan(plan, advisorStages[plan.id]));
  const upcoming = upcomingEvents(events, new Date(), 6);
  /** הפגישה הקרובה — ואם אין פגישה, המועד הקרוב ביומן */
  /* כשהיועץ עוד חוזר אליכם, השורה הזו שמורה לפגישה בלבד — מועד אחר לא תופס את מקומה */
  const nextMeeting =
    upcoming.find((event) => event.kind === 'meeting') ?? (pendingLead ? null : upcoming[0] ?? null);
  /** כלי מצב ההון והתזרים — נטען כאן כדי שהתקציר בעמודה והכלי הפתוח יחלקו את אותם נתונים */
  const cashFlow = useCashFlow(active[0] ?? null, plansState.ready);
  /** הקישור להרשמה בתשלום מוצג רק למי שעדיין אין לו גישה פעילה */
  const { access, ready: accessReady } = usePlatformAccess();
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

  /** תמונת המצב — ארבעת המספרים שהיו בראש המסך, בחלונית הצפה */
  const snapshot: SnapshotItem[] = [
    {
      id: 'plans',
      icon: <Compass className="h-4 w-4" />,
      tone: 'blue',
      label: 'משכנתאות בתהליך',
      value: `${active.length}`,
      hint: active.length === 0 ? 'בחרו מה תרצו לעשות' : 'המצב הנוכחי בכרטיס המשכנתא',
      onClick: scrollToPlans,
    },
    {
      id: 'stage',
      icon: <ListChecks className="h-4 w-4" />,
      tone: 'violet',
      label: 'השלב הנוכחי',
      value: lead ? `שלב ${lead.stageNumber}` : '—',
      hint: lead ? journeyStageFor(lead.currentStage).shortTitle : 'מתחילים ב״מה תרצו לעשות?״',
      onClick: () => (lead ? window.location.assign(lead.href) : scrollToPlans()),
    },
    {
      id: 'meeting',
      icon: <CalendarDays className="h-4 w-4" />,
      tone: nextMeeting && !nextMeeting.confirmed ? 'amber' : 'emerald',
      label: 'הפגישה הקרובה',
      value: nextMeeting ? `${shortDayLabel(nextMeeting.at)} ${formatTime(nextMeeting.at)}` : 'אין',
      hint: nextMeeting ? nextMeeting.title : pendingLead ? 'היועץ חוזר אליכם לקביעת שיחה' : 'לא נקבעה פגישה',
      onClick: () => onNavigate('agenda'),
    },
    {
      id: 'tasks',
      icon: <ListChecks className="h-4 w-4" />,
      tone: urgent > 0 ? 'rose' : 'slate',
      label: 'משימות פתוחות',
      value: `${tasks.length}`,
      hint: urgent > 0 ? `${urgent} דורשות טיפול מיידי` : 'הכול מעודכן',
      onClick: () => onNavigate('agenda'),
    },
  ];

  /*
    לוח השנה ומתחתיו שורה אחת — הפגישה הקרובה. שאר המועדים נפתחים ב"ראה עוד",
    כדי שהכרטיס יישאר בגובה של כרטיס המשכנתא שלידו.
  */
  const restOfAgenda = upcoming.filter((event) => event.id !== nextMeeting?.id);
  const calendarCard = (
    <DashCard
      demoId="dash-calendar-card"
      title="לוח השנה שלי"
      icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
      action={<GoLink onClick={() => onNavigate('agenda')}>ללוח המלא</GoLink>}
      className="h-full"
    >
      <div className="space-y-2.5">
        <MiniCalendar events={events} onSelect={(day) => onNavigate('agenda', day)} />
        <div className="border-t border-slate-100 pt-2.5">
          <p className="mb-1.5 text-sm font-black text-slate-500">הפגישה הקרובה</p>
          {nextMeeting ? (
            <EventRow event={nextMeeting} onOpen={() => go(nextMeeting.target)} />
          ) : pendingLead ? (
            <p className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-900">
              <PhoneCall className="h-4 w-4 shrink-0 text-violet-600" />
              <span className="min-w-0 flex-1 !text-right">היועץ חוזר אליכם לקביעת שיחת ייעוץ</span>
            </p>
          ) : (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">לא נקבעה פגישה</p>
          )}
          {agendaOpen &&
            restOfAgenda.map((event) => (
              <div key={event.id} className="mt-1.5">
                <EventRow event={event} onOpen={() => go(event.target)} />
              </div>
            ))}
          {restOfAgenda.length > 0 && (
            <button
              type="button"
              onClick={() => setAgendaOpen((open) => !open)}
              className="mt-1.5 text-sm font-black text-blue-600 hover:underline"
            >
              {agendaOpen ? 'הצג פחות' : restOfAgenda.length === 1 ? 'ראה עוד מועד' : `ראה עוד ${restOfAgenda.length} מועדים`}
            </button>
          )}
        </div>
      </div>
    </DashCard>
  );

  /** המשימות: שורה אחת — מה שהכי דוחק — והשאר ב"ראה עוד" */
  const taskGroups = groupTasks(tasks);
  // בזמן שהיועץ חוזר אל הלקוח, זו השורה שמופיעה — אלא אם יש משימה באיחור
  const leadTask = pendingLead ? tasks.find((task) => task.id === `lead-pending:${pendingLead.id}`) ?? null : null;
  const nextTask =
    taskGroups.overdue[0] ?? leadTask ?? taskGroups.scheduled[0] ?? taskGroups.undated[0] ?? null;
  const tasksStrip = (
    <section
      data-demo-id="dash-tasks-card"
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-base font-black text-slate-900">
          <ListChecks className="h-5 w-5 text-blue-600" />
          המשימות שלי
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm font-black text-slate-600">{tasks.length}</span>
          {urgent > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-sm font-black text-rose-700">{urgent} דחופות</span>
          )}
        </span>
        {nextTask ? (
          <button
            type="button"
            onClick={() => go(nextTask.target)}
            className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-right transition-colors hover:border-blue-300 ${
              taskGroups.overdue[0] === nextTask || nextTask.tone === 'urgent'
                ? 'border-rose-200 bg-rose-50'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="min-w-0 flex-1 truncate !text-right text-info font-black text-slate-900">{nextTask.title}</span>
            {nextTask.due && (
              <span className="shrink-0 text-sm font-bold text-slate-500">
                {shortDayLabel(nextTask.due)} {formatTime(nextTask.due)}
              </span>
            )}
            <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        ) : (
          <span className="flex-1 text-sm font-semibold text-emerald-700">אין משימות פתוחות</span>
        )}
        {tasks.length > 1 && (
          <button
            type="button"
            onClick={() => setTasksOpen((open) => !open)}
            className="shrink-0 text-sm font-black text-blue-600 hover:underline"
          >
            {tasksOpen ? 'הצג פחות' : tasks.length === 2 ? 'ראה עוד משימה' : `ראה עוד ${tasks.length - 1} משימות`}
          </button>
        )}
      </div>
      {tasksOpen && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <TaskGroupsList
            tasks={tasks}
            compact
            columns={2}
            onOpen={(task) => go(task.target)}
            onSchedule={scheduleTask}
          />
        </div>
      )}
    </section>
  );
  const quickActions = (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4" data-demo-id="dash-quick-actions">
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
      <p className="mb-3 text-center text-info font-bold text-slate-600">
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
    <div className="grid grid-cols-1 gap-4">
      {/*
        הלקוח פנה ליועץ ועוד לא נקבעה פגישה: שורה אחת שאומרת מה קורה עכשיו.
        כשהיועץ קובע פגישה היא נכנסת ללוח השנה, והשורה הזו יורדת.
      */}
      {pendingLead && (
        <section
          data-demo-id="dash-lead-pending"
          className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 py-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
            <UserCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 [&>span]:!text-right">
            <span className="block text-info font-black text-slate-900">
              {pendingLead.requestKindLabel ? `${pendingLead.requestKindLabel} הועברה ליועץ` : 'הבקשה הועברה ליועץ'}
            </span>
            <span className="block text-sm font-medium text-slate-600">
              היועץ יקבע אתכם שיחת ייעוץ חינם בהקדם. בינתיים אתם מוזמנים להשתמש בכלים של משכלנתא.
            </span>
          </span>
          <button
            type="button"
            onClick={() => setWorkspaceRequest((current) => ({ id: 'actions', nonce: (current?.nonce ?? 0) + 1 }))}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-button font-black text-white transition-colors hover:bg-blue-700"
          >
            <Calculator className="h-4 w-4" />
            לכלים המהירים
          </button>
          {!access.active && accessReady && (
            <Link
              href="/dashboard/checkout"
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-blue-200 bg-white px-4 py-2 text-button font-black text-blue-700 transition-colors hover:border-blue-400"
            >
              להרשמה לפלטפורמה בתשלום
            </Link>
          )}
        </section>
      )}

      {/* המשכנתא ולוח השנה — למעלה, באותו גובה */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DashCard
          demoId="dash-mortgages-card"
          title="המשכנתא שלי"
          icon={<Compass className="h-5 w-5 text-blue-600" />}
          className="h-full scroll-mt-24"
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
                    className={`flex flex-wrap items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-right transition-colors ${
                      notice.done
                        ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400'
                        : 'border-violet-200 bg-violet-50 hover:border-violet-400'
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
                      <span className="block text-info font-black text-slate-900">
                        {notice.done
                          ? `היועץ סיים לטפל בשלב ${notice.stageNumber} · ${notice.stageTitle}`
                          : `היועץ מטפל בשלב ${notice.stageNumber} · ${notice.stageTitle}`}
                      </span>
                      <span className="block text-sm font-medium text-slate-600">
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
            <MortgageEntry
              variant="hero"
              onStart={startPlan}
              busy={busy}
              hasPlans={completed.length > 0}
              deletePlan={plansState.remove}
            />
          ) : (
            <div className="space-y-3">
              {(plansOpen ? summaries : summaries.slice(0, 1)).map((summary, index) => (
                <PlanStatusRow
                  key={summary.id}
                  summary={summary}
                  rates={rateValidity(active[index].data)}
                  onPeek={() => setPeekPlanId(summary.id)}
                  onDelete={() => setDeletePlanId(summary.id)}
                />
              ))}
              {summaries.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPlansOpen((open) => !open)}
                  className="text-sm font-black text-blue-600 hover:underline"
                >
                  {plansOpen ? 'הצג פחות' : summaries.length === 2 ? 'ראה עוד תהליך' : `ראה עוד ${summaries.length - 1} תהליכים`}
                </button>
              )}
            </div>
          )}

          {/* משכנתאות שהסתיימו — שורה מקופלת אחת */}
          {completed.length > 0 && (
            <details className="group mt-3 border-t border-slate-100 pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-black text-slate-500">
                <Check className="h-4 w-4 text-emerald-600" />
                משכנתאות שלקחתי ({completed.length})
                <span className="text-blue-600 group-open:hidden">· ראה עוד</span>
              </summary>
              <div className="mt-2 space-y-2">
                {completed.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/dashboard/plans/${plan.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-info transition-colors hover:border-emerald-400"
                  >
                    <span className="min-w-0 truncate font-black text-slate-900">
                      {plan.propertyAddress || plan.name}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-emerald-800">
                      התהליך הסתיים
                      {plan.completedAt ? ` · ${formatDate(plan.completedAt)}` : ''}
                      {plan.data.SIGNING.bank ? ` · בנק ${plan.data.SIGNING.bank}` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          )}

          {/*
            ללקוח שכבר פתח משכנתא, מה שחשוב מתחת לשורה שלה הוא מה כדאי לעשות
            עכשיו — הערה אחת, והשאר ב"ראה עוד".
          */}
          {summaries.length === 0 ? (
            <div className="mt-4 flex justify-center border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
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
              limit={1}
            />
          )}
        </DashCard>

        {calendarCard}
      </div>

      {detailRow}

      {tasksStrip}

      {/* שלוש העמודות: פעולות מהירות, הון עצמי, מצב הון ותזרים */}
      <DashboardWorkspace
        actions={quickActions}
        actionsCount={8}
        equityPlan={equityState.plan}
        cashFlow={cashFlow}
        initial={workspace}
        request={workspaceRequest}
      />
      {/* מה שהוזן בכלי המיחזור, ההיתכנות וההלוואות — כולל לפני ההרשמה */}
      <SavedToolsCard />

      <AdvisorCta variant="row" />
      <MortgageEntry
        variant="dialog"
        open={addOpen}
        onOpenChange={setAddOpen}
        onStart={startPlan}
        busy={busy}
        hasPlans={plansState.plans.length > 0}
        deletePlan={plansState.remove}
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
      <SnapshotFloat items={snapshot} alert={urgent > 0} />
    </div>
  );
}

/** שורה אחת ביומן: יום ושעה, כותרת ונקודת הצבע של סוג המועד */
function EventRow({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right transition-colors hover:border-blue-300"
    >
      <span className="flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 text-slate-800">
        <span className="text-2xs font-bold leading-none text-slate-500">{shortDayLabel(event.at)}</span>
        <span className="mt-0.5 text-sm font-black leading-none">{formatTime(event.at)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-info font-black text-slate-900">{event.title}</span>
        <span className="block truncate text-sm text-slate-500">{event.subtitle}</span>
      </span>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${eventTone(event).dot}`} />
    </button>
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

/** שורת מצב של תהליך אחד: חמשת השלבים כמסלול, ומה הפעולה הבאה */
function PlanStatusRow({
  summary,
  rates,
  onPeek,
  onDelete,
}: {
  summary: ReturnType<typeof summarizePlan>;
  /** תוקף הריביות בכל אישור עקרוני שהתקבל — ריק עד שהלקוח הגיע לשלב הזה */
  rates: RateValidityRow[];
  onPeek: () => void;
  onDelete: () => void;
}) {
  const [ratesOpen, setRatesOpen] = useState(false);
  const journey = journeyStageFor(summary.currentStage);
  /* הבנק שנבחר סופית קובע את הספירה שעל הכפתור; עד שנבחר — האישור הקרוב לפקוע */
  const leadRate = leadRateValidity(rates);
  const progress = Math.round((summary.completedStages / summary.stages.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-lg font-black text-slate-900">
          <MapPin className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="truncate">{summary.label}</span>
        </p>
        <span className={`rounded-full bg-gradient-to-l ${journey.gradient} px-3 py-1 text-sm font-black text-white`}>
          שלב {summary.stageNumber} · {journey.shortTitle}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-slate-500">{planCreatedLabel(summary.createdAt)}</p>

      <ol
        className="mt-3 grid gap-1"
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
              <span className={`text-sm font-bold leading-tight ${current ? 'text-slate-900' : 'text-slate-500'}`}>
                {summary.stageTitles[index]}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
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
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2 text-button font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
        >
          <Eye className="h-4 w-4" />
          להציץ בפרטים
        </button>
        {leadRate && (
          <button
            type="button"
            onClick={() => setRatesOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3.5 py-2 text-button font-black transition-colors ${
              leadRate.daysLeft < 0
                ? 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                : leadRate.daysLeft <= 5
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400'
                  : leadRate.daysLeft <= 10
                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            <AlarmClock className="h-4 w-4" />
            תוקף ריביות
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-2xs font-black">
              {leadRate.daysLeft >= 0 ? `${leadRate.daysLeft} ימים` : 'פג'}
            </span>
          </button>
        )}
        <Link
          href={summary.href}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-info font-black text-white ${
            summary.advisorStage ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'
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
          className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {rates.length > 0 && (
        <RateValidityDialog
          rows={rates}
          title={summary.label}
          open={ratesOpen}
          onOpenChange={setRatesOpen}
        />
      )}
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
    'flex min-h-[60px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-info font-bold text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40';
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-black text-amber-800">{badge}</span>
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
