'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CreditCard,
  LayoutDashboard,
  ListOrdered,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StageRail } from '@/components/plan/StageRail';
import { NEW_PLAN_FLOW, PLAN_STAGES, flowStages } from '@/lib/mortgage-plan';
import type { PlanStageId, PlanStageStatus } from '@/lib/mortgage-plan';
import { AdvisoryStatusBar } from '@/components/advisor/AdvisoryStatusBar';
import { ClientContextRow } from '@/components/advisor/ClientContextRow';
import { ClientStageWorkspace } from '@/components/advisor/ClientStageWorkspace';
import { MeetingDialog } from '@/components/advisor/MeetingDialog';
import { QuickActions } from '@/components/advisor/QuickActions';
import { SendAuthorizationButton } from '@/components/advisor/ClientAuthorizationLetters';
import { TaskDialog } from '@/components/advisor/TaskDialog';
import { useClientDetail } from '@/components/advisor/useClientDetail';
import { useClientActivity } from '@/components/advisor/useClientActivity';
import { ClientActivitySummary } from '@/components/advisor/ClientActivitySummary';
import { ClientControlBoard } from '@/components/advisor/ClientControlBoard';
import { ClientPaymentSettings } from '@/components/advisor/ClientPaymentSettings';
import { ClientToolAccessCard } from '@/components/advisor/office/ClientToolAccessCard';
import { AdvisorInboxDock } from '@/components/conversation/AdvisorInboxDock';
import { VideoCallPicker } from '@/components/meeting-call/VideoCallPicker';
import { ProspectFileCard } from '@/components/advisor/ProspectFileCard';
import { ClientIntakeCard } from '@/components/advisor/ClientIntakeCard';
import {
  useAdvisorNotes,
  useAdvisorTasks,
  useClientProcess,
  useMeetings,
} from '@/components/advisor/useAdvisorCrm';

type ClientTab = 'overview' | 'stages' | 'board' | 'summary';

const CLIENT_TABS: Array<{ id: ClientTab; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'סקירה', icon: LayoutDashboard },
  { id: 'stages', label: 'עבודה בשלבים', icon: ListOrdered },
  { id: 'board', label: 'פגישות והודעות', icon: MessageCircle },
  { id: 'summary', label: 'חשבון ותשלום', icon: CreditCard },
];

/** כתובות ישנות: `?tab=payment` היה טאב נפרד, והיום הוא חלק מ"חשבון ותשלום" */
const TAB_ALIASES: Record<string, ClientTab> = { payment: 'summary' };

/**
 * דף הלקוח באזור היועץ ("תיק לקוח").
 *
 * בראש העמוד כרטיס אחד: מי הלקוח, איך יוצרים איתו קשר וארבע פעולות. מתחתיו
 * ארבעה טאבים, וכל מידע מופיע רק באחד מהם:
 * - סקירה — איפה הלקוח עומד בתהליך, המסמכים, הפגישות והמשימות, וטופס הפרטים.
 * - עבודה בשלבים — חמשת השלבים כסרגל, והשדות והכלים של השלב שנבחר.
 * - פגישות והודעות — השיחות שנקבעו, לוח שנה וההודעות.
 * - חשבון ותשלום — מתי נרשם ושילם, גבייה, והכלים שהלקוח רואה.
 * `?tab=stages`, `?tab=board` או `?tab=summary` (וגם `?tab=payment` הישן)
 * פותחים את הדף ישר בטאב.
 */
export default function AdvisorClientPage() {
  const params = useParams<{ id: string }>();
  const clientId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const { data: session, status } = useSession();

  /** עולה בכל לחיצה על "צ'אט ומיילים" — פותח את השיחה עם הלקוח */
  const [chatSignal, setChatSignal] = useState(0);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingStage, setMeetingStage] = useState<PlanStageId | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PlanStageId | null>(null);
  const [tab, setTab] = useState<ClientTab>('overview');

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('tab') ?? '';
    const requested = TAB_ALIASES[raw] ?? raw;
    if (CLIENT_TABS.some((item) => item.id === requested)) setTab(requested as ClientTab);
  }, []);

  const { client, loading, error, patch, setDocumentStatus } = useClientDetail(clientId);
  const { process, refresh: refreshProcess } = useClientProcess(clientId);
  const tasks = useAdvisorTasks({ clientId, includeClosed: true }, Boolean(clientId));
  const notes = useAdvisorNotes({ clientId, enabled: Boolean(clientId) });
  const meetings = useMeetings({ clientId, enabled: Boolean(clientId) });
  const activity = useClientActivity(clientId, Boolean(clientId));

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/login');
    else if (session.user?.role !== 'ADVISOR') router.push('/dashboard');
  }, [session, status, router]);

  const statuses = useMemo(() => {
    const map = {} as Record<PlanStageId, PlanStageStatus>;
    PLAN_STAGES.forEach((stage) => {
      map[stage] = process?.stages.find((item) => item.stage === stage)?.status ?? 'PENDING';
    });
    return map;
  }, [process]);

  /** סוג התהליך של הלקוח — אותם שלבים, באותו סדר ובאותם שמות שהוא רואה אצלו */
  const flow = process?.flow ?? NEW_PLAN_FLOW;
  const firstStage = flowStages(flow)[0];
  const requested = selectedStage ?? process?.currentStage ?? firstStage;
  const stage = flowStages(flow).includes(requested) ? requested : firstStage;

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session || session.user?.role !== 'ADVISOR') return null;

  if (error || !client) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 py-10 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <p className="text-sm text-slate-700">{error ?? 'הלקוח לא נמצא'}</p>
            <Button variant="outline" asChild>
              <Link href="/advisor-dashboard">חזרה לרשימת הלקוחות</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openMeeting = (forStage: PlanStageId | null) => {
    setMeetingStage(forStage);
    setMeetingOpen(true);
  };

  const openTab = (next: ClientTab) => {
    setTab(next);
    if (next === 'board' || next === 'summary') void activity.refresh();
  };

  /** סרגל חמשת השלבים, על הרקע הכהה שלו (כמו אצל הלקוח) */
  const stageRail = (onSelect: (next: PlanStageId) => void) => (
    <div className="rounded-3xl bg-slate-950 p-3 sm:p-4">
      <StageRail current={stage} statuses={statuses} onSelect={onSelect} flow={flow} />
      {!process?.planId && (
        <p className="mt-2 text-center text-xs text-white/60">
          הלקוח עדיין לא פתח תהליך משלו. אפשר לעבוד בכל שלב — מה שתמלאו יחכה לו.
        </p>
      )}
    </div>
  );

  const secondaryButton =
    'inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700';
  const unread = activity.activity?.counts.unread ?? 0;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* כרטיס הלקוח: מי הוא, איך יוצרים קשר, הפעולות והטאבים */}
        <header className="start-aligned rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-black text-blue-700">
              {client.name.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black text-slate-900">
                <span className="truncate">{client.name}</span>
                {client.prospect && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    מתעניין · לא רשום
                  </span>
                )}
                {activity.activity?.billing.paid && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    שילם
                  </span>
                )}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-blue-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {client.email}
                </a>
                {client.phone && (
                  <a href={`tel:${client.phone}`} dir="ltr" className="flex items-center gap-1.5 hover:text-blue-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {client.phone}
                  </a>
                )}
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              {client.userId && (
                <button
                  type="button"
                  onClick={() => setChatSignal((value) => value + 1)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  צ'אט ומיילים
                </button>
              )}
              {/* שיחה אחת נפתחת מיד; כשנקבעו כמה, בוחרים לאיזו להתחבר; בלי פגישה — קובעים אחת */}
              <VideoCallPicker
                meetings={meetings.meetings}
                onSchedule={() => openMeeting(null)}
                className={secondaryButton}
              />
              <SendAuthorizationButton
                clientId={client.id}
                clientName={client.name}
                className={secondaryButton}
                label="כתבי הסמכה"
              />
              {/* משימה, פגישה, תיק מסמכים ותמהיל — בכפתור "חדש" אחד */}
              <QuickActions
                variant="menu"
                clientId={client.id}
                clientName={client.name}
                clients={[{ id: client.id, name: client.name }]}
                onCreateTask={async (input) => {
                  const failure = await tasks.create(input);
                  if (!failure) await refreshProcess();
                  return failure;
                }}
                onProposeMeeting={async (input) => {
                  const failure = await meetings.propose(input);
                  if (!failure) await refreshProcess();
                  return failure;
                }}
              />
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 [scrollbar-width:none] sm:px-4"
            aria-label="אזורי תיק הלקוח"
            role="tablist"
          >
            {CLIENT_TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => openTab(item.id)}
                  className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-3 text-base font-bold transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                  {item.id === 'board' && unread > 0 && (
                    <span className="rounded-full bg-violet-600 px-1.5 text-xs font-black text-white">{unread}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="space-y-5">
          {client.prospect && <ProspectFileCard clientId={client.id} email={client.email} />}

          {tab === 'overview' && (
            <>
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-black text-slate-900">איפה הלקוח עומד</h2>
                  <button
                    type="button"
                    onClick={() => openTab('stages')}
                    className="text-sm font-bold text-blue-700 hover:underline"
                  >
                    לעבודה על השלב ←
                  </button>
                </div>
                {stageRail((next) => {
                  setSelectedStage(next);
                  openTab('stages');
                })}
              </section>

              {process?.planId && process.advisory && (
                <AdvisoryStatusBar planId={process.planId} advisory={process.advisory} onChanged={refreshProcess} />
              )}

              <ClientContextRow
                clientId={client.id}
                clientName={client.name}
                documents={client.documents}
                meetings={meetings.meetings}
                tasks={tasks.tasks}
                onScheduleMeeting={() => openMeeting(null)}
                onAddTask={() => setTaskOpen(true)}
                onCancelMeeting={(meetingId) => void meetings.cancel(meetingId)}
                onAnswerMeeting={meetings.answer}
                onTaskStatus={(taskId, next) => void tasks.update(taskId, { status: next })}
                onTaskReschedule={(taskId, dueDate) => void tasks.update(taskId, { dueDate })}
                onTaskDelete={(taskId) => void tasks.remove(taskId)}
              />

              <ClientIntakeCard clientId={client.id} clientEmail={client.email} />
            </>
          )}

          {tab === 'stages' && (
            <>
              {stageRail(setSelectedStage)}
              <ClientStageWorkspace
                client={client}
                stage={stage}
                flow={flow}
                stageView={process?.stages.find((item) => item.stage === stage)}
                planId={process?.planId ?? null}
                tasks={tasks.tasks}
                notes={notes.notes}
                meetings={meetings.meetings}
                onPatchClient={patch}
                onDocumentStatus={(documentId, next) => void setDocumentStatus(documentId, next)}
                onClientStage={(next) => void patch({ stage: next })}
                onCreateTask={async (input) => {
                  const failure = await tasks.create(input);
                  if (!failure) await refreshProcess();
                  return failure;
                }}
                onTaskStatus={(taskId, next) => void tasks.update(taskId, { status: next })}
                onTaskReschedule={(taskId, dueDate) => void tasks.update(taskId, { dueDate })}
                onTaskDelete={(taskId) => void tasks.remove(taskId)}
                onCreateNote={(body, visibility) => notes.create({ stage, body, visibility })}
                onNoteVisibility={(noteId, visibility) => void notes.setVisibility(noteId, visibility)}
                onNoteDelete={(noteId) => void notes.remove(noteId)}
                onCancelMeeting={(meetingId) => void meetings.cancel(meetingId)}
                onAnswerMeeting={meetings.answer}
                onScheduleMeeting={() => openMeeting(stage)}
              />
            </>
          )}

          {tab === 'board' && (
            <ClientControlBoard
              activity={activity.activity}
              meetings={meetings.meetings}
              tasks={tasks.tasks}
              onOpenChat={client.userId ? () => setChatSignal((value) => value + 1) : undefined}
              onScheduleMeeting={() => openMeeting(null)}
              onCancelMeeting={(meetingId) => void meetings.cancel(meetingId)}
              onAnswerMeeting={meetings.answer}
            />
          )}

          {tab === 'summary' && (
            <div className="space-y-4">
              <ClientActivitySummary activity={activity.activity} ready={activity.ready} error={activity.error} />
              <ClientPaymentSettings
                clientId={clientId}
                billing={activity.activity?.billing}
                onChanged={() => void activity.refresh()}
              />
              {/* אילו כלים הלקוח רואה באזור האישי (src/lib/office.ts) */}
              <ClientToolAccessCard clientId={clientId} />
            </div>
          )}
        </main>
      </div>

      <MeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        clientId={client.id}
        clientName={client.name}
        stage={meetingStage}
        onSubmit={async (input) => {
          const failure = await meetings.propose(input);
          if (!failure) await refreshProcess();
          return failure;
        }}
      />

      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        clientId={client.id}
        clientName={client.name}
        stage={stage}
        onCreate={async (input) => {
          const failure = await tasks.create(input);
          if (!failure) await refreshProcess();
          return failure;
        }}
      />

      <AdvisorInboxDock
        client={client.userId ? { userId: client.userId, name: client.name } : null}
        openSignal={chatSignal}
      />
    </div>
  );
}
