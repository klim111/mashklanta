'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  ListChecks,
  MapPin,
  MessageSquare,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { StageChip } from '@/components/advisor/ui';
import {
  MEETING_STATUS_LABELS,
  dayKey,
  formatDate,
  formatTime,
  meetingIsLive,
  relativeDayLabel,
} from '@/lib/advisor-crm';
import type { AdvisorMeetingView } from '@/lib/advisor-crm';
import { planStageNumber } from '@/lib/mortgage-plan';
import { clientTaskIdOf, upcomingEvents } from '@/lib/client-agenda';
import type { AgendaTarget, CalendarEvent, ClientTask, DashboardSection } from '@/lib/client-agenda';
import { AddTaskDialog } from '@/components/plan/tasks/AddTaskDialog';
import { DocumentUploadDialog } from '@/components/plan/documents/DocumentUploadDialog';
import type { ClientTaskView } from '@/lib/client-tasks';
import { ClientCalendar, DayList, eventTone } from './ClientCalendar';
import type { CalendarView } from './ClientCalendar';
import { TaskItem } from './TaskItem';
import { DashCard } from './ui';
import type { ClientDashboardData } from './useClientDashboard';

/** הפריט שנפתח לפרטים בפאנל הצד */
type Detail = { kind: 'event'; event: CalendarEvent } | { kind: 'task'; task: ClientTask };

/**
 * משימות ולוח שנה.
 *
 * הלוח מציג פגישות ומועדים ביום, בשבוע או בחודש. לצדו פאנל שמציג את היום
 * הנבחר ואת מה שקרוב — פגישות ומשימות — ולחיצה על פריט פותחת את הפרטים שלו
 * באותו פאנל, עם כפתור חזרה ללוח בתוך הפאנל עצמו. מתחת: כל המשימות והערות
 * היועץ.
 */
export function AgendaSection({
  data,
  initialDay,
  onNavigate,
}: {
  data: ClientDashboardData;
  /** היום שנבחר בלוח המוקטן בסקירה, אם הגיעו משם */
  initialDay?: string;
  onNavigate: (section: DashboardSection) => void;
}) {
  const { tasks, events, meetingsState, notes, clientTasksState, plansState } = data;
  const [view, setView] = useState<CalendarView>('month');
  const [selected, setSelected] = useState(() => initialDay ?? dayKey(new Date()));
  const [detail, setDetail] = useState<Detail | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  /** משימת מסמך שנפתח עבורה חלון ההעלאה */
  const [uploadFor, setUploadFor] = useState<ClientTaskView | null>(null);
  /** משימה חדשה מלוח השנה משויכת לתהליך הפתוח, כשיש אחד */
  const activePlanId = plansState.plans.find((plan) => plan.status === 'IN_PROGRESS')?.id ?? null;

  /** משימה שהלקוח הוסיף לעצמו — אפשר לסמן כבוצעה, להעלות מסמך ולמחוק מכאן */
  const ownTaskId = (id: string) => clientTaskIdOf(id);
  const ownTaskOf = (id: string): ClientTaskView | null => {
    const taskId = ownTaskId(id);
    return taskId ? (clientTasksState.tasks.find((task) => task.id === taskId) ?? null) : null;
  };
  const completeOwn = async (id: string) => {
    const taskId = ownTaskId(id);
    if (!taskId) return;
    await clientTasksState.complete(taskId);
    setDetail(null);
  };
  const removeOwn = async (id: string) => {
    const taskId = ownTaskId(id);
    if (!taskId) return;
    await clientTasksState.remove(taskId);
    setDetail(null);
  };

  const selectedEvents = useMemo(
    () => events.filter((event) => dayKey(event.at) === selected),
    [events, selected]
  );
  const upcoming = upcomingEvents(events, new Date(), 4);
  const awaiting = meetingsState.meetings.filter((meeting) => meeting.status === 'PROPOSED').length;
  const sortedNotes = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const go = (target: AgendaTarget) => {
    if (target.kind === 'section') onNavigate(target.section);
    else window.location.assign(target.href);
  };

  const openEvent = (event: CalendarEvent) => {
    setSelected(dayKey(event.at));
    setDetail({ kind: 'event', event });
  };

  const meetingOf = (event: CalendarEvent): AdvisorMeetingView | null =>
    event.kind === 'meeting'
      ? (meetingsState.meetings.find((meeting) => `meeting:${meeting.id}` === event.id) ?? null)
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DashCard
          title="לוח השנה"
          icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
          action={
            awaiting > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[13px] font-black text-amber-800">
                {awaiting} ממתינות לאישורכם
              </span>
            ) : undefined
          }
        >
          <ClientCalendar
            events={events}
            view={view}
            onViewChange={setView}
            selected={selected}
            onSelect={(key) => {
              setSelected(key);
              setDetail(null);
            }}
            onOpen={openEvent}
          />
        </DashCard>

        {detail ? (
          <DetailPanel
            detail={detail}
            meeting={detail.kind === 'event' ? meetingOf(detail.event) : null}
            ownTask={ownTaskOf(detail.kind === 'event' ? detail.event.id : detail.task.id)}
            onUpload={() => setUploadFor(ownTaskOf(detail.kind === 'event' ? detail.event.id : detail.task.id))}
            onComplete={() => void completeOwn(detail.kind === 'event' ? detail.event.id : detail.task.id)}
            onRemove={() => void removeOwn(detail.kind === 'event' ? detail.event.id : detail.task.id)}
            onBack={() => setDetail(null)}
            onGo={go}
            onRespond={(meeting, accepted) => {
              void meetingsState.respond(meeting.id, accepted);
              setDetail(null);
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <DashCard
              title={relativeDayLabel(new Date(`${selected}T12:00:00`))}
              icon={<Clock className="h-5 w-5 text-blue-600" />}
              action={
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-[13px] font-black text-white hover:bg-slate-700"
                >
                  <CalendarPlus className="h-4 w-4" />
                  הוסף משימה או פגישה
                </button>
              }
            >
              <DayList items={selectedEvents} onOpen={openEvent} empty="אין פגישות או מועדים ביום הזה" />
            </DashCard>

            <DashCard title="הקרוב ביומן" icon={<CalendarCheck2 className="h-5 w-5 text-blue-600" />}>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-black text-slate-500">פגישות ומועדים</p>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-slate-500">אין פגישות או מועדים קרובים.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {upcoming.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => openEvent(event)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-right text-sm transition-colors hover:bg-slate-50"
                        >
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${eventTone(event).dot}`} />
                          <span className="w-24 shrink-0 text-[13px] font-bold text-slate-500">
                            {relativeDayLabel(event.at).replace(/^יום /, '')} · {formatTime(event.at)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-slate-900">
                            {event.title}
                          </span>
                          <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-black text-slate-500">משימות קרובות</p>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-slate-500">אין משימות פתוחות.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {tasks.slice(0, 4).map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          compact
                          onOpen={() => setDetail({ kind: 'task', task })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DashCard>
          </div>
        )}
      </div>

      {/* משימת מסמך מלוח השנה — העלאה אמיתית לתיק של המשכנתא הפתוחה */}
      {uploadFor && (uploadFor.planId ?? activePlanId) && (
        <DocumentUploadDialog
          open
          onOpenChange={(next) => {
            if (!next) setUploadFor(null);
          }}
          planId={(uploadFor.planId ?? activePlanId) as string}
          stage={uploadFor.stage}
          defaultTitle={uploadFor.title}
          onUploaded={(document) => {
            void clientTasksState.attachDocument(uploadFor.id, document.id);
            setDetail(null);
          }}
        />
      )}

      <AddTaskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        planId={activePlanId}
        documentPlanId={activePlanId}
        stage={null}
        defaultDay={selected}
        onSubmit={clientTasksState.add}
      />

      <div className={`grid gap-4 ${sortedNotes.length > 0 ? 'xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}>
        <DashCard
          title="כל המשימות שלי"
          icon={<ListChecks className="h-5 w-5 text-blue-600" />}
          action={
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-slate-700">
              {tasks.length}
            </span>
          }
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-6 w-6" />
              </span>
              <p className="text-base font-black text-slate-800">אין משימות פתוחות</p>
              <p className="text-sm text-slate-500">כשיהיה משהו לעשות — הוא יופיע כאן וגם בסקירה.</p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} onOpen={() => setDetail({ kind: 'task', task })} />
              ))}
            </div>
          )}
        </DashCard>

        {sortedNotes.length > 0 && (
          <DashCard title="הערות מהיועץ" icon={<MessageSquare className="h-5 w-5 text-blue-600" />}>
            <div className="space-y-2">
              {sortedNotes.map((note) => (
                <div key={note.id} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{note.body}</p>
                  <p className="mt-1.5 text-[13px] text-slate-500">
                    <span className="font-bold text-blue-700">{note.advisorName}</span> · שלב{' '}
                    {planStageNumber(note.stage)} · {formatDate(note.createdAt)} {formatTime(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </DashCard>
        )}
      </div>
    </div>
  );
}

/**
 * פרטי הפריט שנבחר — במקום הפאנל של היום, עם חזרה ללוח בראש ובתחתית.
 * פגישה שממתינה לאישור מאושרת או נדחית מכאן.
 */
function DetailPanel({
  detail,
  meeting,
  ownTask,
  onComplete,
  onRemove,
  onUpload,
  onBack,
  onGo,
  onRespond,
}: {
  detail: Detail;
  meeting: AdvisorMeetingView | null;
  /** המשימה שהלקוח הוסיף בעצמו — אפשר לסמן, להעלות מסמך ולמחוק */
  ownTask: ClientTaskView | null;
  onComplete: () => void;
  onRemove: () => void;
  onUpload: () => void;
  onBack: () => void;
  onGo: (target: AgendaTarget) => void;
  onRespond: (meeting: AdvisorMeetingView, accepted: boolean) => void;
}) {
  const ownActions = ownTask ? (
    <>
      {ownTask.kind === 'DOCUMENT' && ownTask.status === 'OPEN' && (
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-[15px] font-black text-white hover:bg-emerald-700"
        >
          <Upload className="h-4 w-4" />
          העלאת המסמך לתיק
        </button>
      )}
      <button
        type="button"
        onClick={onComplete}
        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[15px] font-black ${
          ownTask.kind === 'DOCUMENT'
            ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        <Check className="h-4 w-4" />
        סמנו כבוצעה
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] font-bold text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
      >
        <Trash2 className="h-4 w-4" />
        מחיקה
      </button>
    </>
  ) : null;
  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
    >
      <ArrowRight className="h-4 w-4" />
      חזרה ללוח
    </button>
  );

  if (detail.kind === 'task') {
    const { task } = detail;
    return (
      <DashCard title="פרטי המשימה" icon={<ListChecks className="h-5 w-5 text-blue-600" />} action={backButton}>
        <div className="flex h-full flex-col">
          <h3 className="text-xl font-black leading-snug text-slate-900">{task.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{task.hint}</p>
          <dl className="mt-4 space-y-2 text-[15px]">
            {task.due && (
              <Row icon={<Clock className="h-4 w-4" />} label="מועד">
                {formatDate(task.due)} · {formatTime(task.due)}
              </Row>
            )}
            {task.stage && (
              <Row icon={<ListChecks className="h-4 w-4" />} label="שלב">
                <StageChip stage={task.stage} />
              </Row>
            )}
          </dl>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
            {ownActions}
            <button
              type="button"
              onClick={() => onGo(task.target)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[15px] font-black text-white hover:bg-slate-700"
            >
              {ownTask ? 'לשלב בתהליך' : 'לביצוע המשימה'}
              <ArrowLeft className="h-4 w-4" />
            </button>
            {backButton}
          </div>
        </div>
      </DashCard>
    );
  }

  const { event } = detail;
  const tone = eventTone(event);
  return (
    <DashCard
      title={
        event.kind === 'meeting'
          ? 'פרטי הפגישה'
          : event.kind === 'expense'
            ? 'תשלום מתוכנן'
            : 'מועד חשוב'
      }
      icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
      action={backButton}
    >
      <div className="flex h-full flex-col">
        <div className={`rounded-2xl border p-4 ${tone.card}`}>
          <p className="text-[13px] font-bold text-slate-500">{relativeDayLabel(event.at)}</p>
          <p className="mt-0.5 text-2xl font-black text-slate-900">
            {formatDate(event.at)} · {formatTime(event.at)}
          </p>
          <h3 className="mt-2 text-xl font-black leading-snug text-slate-900">{event.title}</h3>
          <p className="mt-1 text-[15px] text-slate-600">{event.subtitle}</p>
        </div>

        {meeting && (
          <dl className="mt-4 space-y-2 text-[15px]">
            <Row icon={<UserRound className="h-4 w-4" />} label="יועץ">
              {meeting.advisorName}
            </Row>
            <Row icon={<Clock className="h-4 w-4" />} label="משך">
              {meeting.durationMinutes} דקות
            </Row>
            {meeting.location && (
              <Row icon={<MapPin className="h-4 w-4" />} label="מקום">
                {meeting.location}
              </Row>
            )}
            {meeting.stage && (
              <Row icon={<ListChecks className="h-4 w-4" />} label="שלב">
                <StageChip stage={meeting.stage} />
              </Row>
            )}
            <Row icon={<CalendarCheck2 className="h-4 w-4" />} label="סטטוס">
              {MEETING_STATUS_LABELS[meeting.status]}
            </Row>
            {meeting.note && (
              <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{meeting.note}</p>
            )}
          </dl>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
          {ownActions}
          {meeting && meeting.status === 'PROPOSED' && meetingIsLive(meeting.status) && (
            <>
              <button
                type="button"
                onClick={() => onRespond(meeting, true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-[15px] font-black text-white hover:bg-emerald-700"
              >
                <CalendarCheck2 className="h-4 w-4" />
                אשרו את המועד
              </button>
              <button
                type="button"
                onClick={() => onRespond(meeting, false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] font-bold text-slate-600 hover:bg-slate-50"
              >
                המועד לא מתאים
              </button>
            </>
          )}
          {event.target.kind === 'href' && (
            <Link
              href={event.target.href}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[15px] font-black text-white hover:bg-slate-700"
            >
              לשלב בתהליך
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          {backButton}
        </div>
      </div>
    </DashCard>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="flex w-20 shrink-0 items-center gap-1.5 font-bold text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 items-center font-bold text-slate-900">{children}</dd>
    </div>
  );
}
