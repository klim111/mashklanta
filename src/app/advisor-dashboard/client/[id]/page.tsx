'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
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
import { AdvisorInboxDock } from '@/components/conversation/AdvisorInboxDock';
import { VideoCallPicker } from '@/components/meeting-call/VideoCallPicker';
import {
  useAdvisorNotes,
  useAdvisorTasks,
  useClientProcess,
  useMeetings,
} from '@/components/advisor/useAdvisorCrm';

type ClientTab = 'stages' | 'summary' | 'board' | 'payment';

const CLIENT_TABS: Array<{ id: ClientTab; label: string; icon: typeof Activity }> = [
  { id: 'stages', label: 'שלבים', icon: ListOrdered },
  { id: 'summary', label: 'סיכום פעילות', icon: Activity },
  { id: 'board', label: 'לוח בקרה', icon: LayoutDashboard },
  { id: 'payment', label: 'תשלום והרשאה', icon: CreditCard },
];

/**
 * דף הלקוח באזור היועץ.
 *
 * המבנה זהה לזה שהלקוח רואה בתהליך שלו: חמשת השלבים כסרגל ניווט בראש העמוד,
 * ומתחתיו מסך ראשי שמתחלף לפי השלב שנבחר ופותח את השדות והכלים שלו. השורה
 * שמתחת למסך הראשי — תיק המסמכים, הפגישות והמשימות של הלקוח — נשארת קבועה.
 *
 * לצד השלבים יש עוד שלושה טאבים: "סיכום פעילות" — מתי נרשם, מתי שילם, עד מתי
 * הגישה בתשלום ושליחת מייל — ו"לוח בקרה" עם השיחות שנקבעו, לוח שנה וההודעות
 * ממנו. "תשלום והרשאה" — גבייה ב-HYP, וסימון הלקוח כמשלם לתקופה שהיועץ בוחר.
 * `?tab=summary`, `?tab=board` או `?tab=payment` פותחים את הדף ישר בטאב.
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
  const [tab, setTab] = useState<ClientTab>('stages');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (requested && CLIENT_TABS.some((item) => item.id === requested)) setTab(requested as ClientTab);
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

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      {/* ראש העמוד: זהות הלקוח, הגישה המהירה וסרגל חמשת השלבים */}
      <header className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/advisor-dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              הלקוחות שלי
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 truncate text-xl font-black text-white md:text-2xl">
                <span className="truncate">{client.name}</span>
                {activity.activity?.billing.paid && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-2xs font-bold text-emerald-200">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    שילם
                  </span>
                )}
              </h1>
              <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-white/50">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {client.email}
                </span>
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {client.phone}
                  </span>
                )}
              </p>
            </div>

            <QuickActions
              tone="dark"
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

            <SendAuthorizationButton clientId={client.id} clientName={client.name} />

            {/* שיחה אחת נפתחת מיד; כשנקבעו כמה, בוחרים לאיזו להתחבר; בלי פגישה — קובעים אחת */}
            <VideoCallPicker meetings={meetings.meetings} onSchedule={() => openMeeting(null)} />

            {client.userId && (
              <button
                type="button"
                onClick={() => setChatSignal((value) => value + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700"
              >
                <MessageCircle className="h-4 w-4" />
                צ'אט ומיילים
              </button>
            )}
          </div>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label="אזורי דף הלקוח">
            {CLIENT_TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    if (item.id !== 'stages') void activity.refresh();
                  }}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-button font-bold transition-all ${
                    active ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.id === 'board' && (activity.activity?.counts.unread ?? 0) > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-2xs font-black ${
                        active ? 'bg-violet-100 text-violet-700' : 'bg-violet-500 text-white'
                      }`}
                    >
                      {activity.activity?.counts.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {tab === 'stages' && (
            <div className="mt-4">
              <StageRail current={stage} statuses={statuses} onSelect={setSelectedStage} flow={flow} />
              {!process?.planId && (
                <p className="mt-2 text-center text-[11px] text-white/50">
                  הלקוח עדיין לא פתח תהליך משלו. אפשר לעבוד בכל שלב — מה שתמלאו יחכה לו.
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {tab === 'summary' && (
          <ClientActivitySummary activity={activity.activity} ready={activity.ready} error={activity.error} />
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

        {tab === 'payment' && (
          <ClientPaymentSettings
            clientId={clientId}
            billing={activity.activity?.billing}
            onChanged={() => void activity.refresh()}
          />
        )}

        {tab === 'stages' && (
          <>
          {process?.planId && process.advisory && (
            <AdvisoryStatusBar planId={process.planId} advisory={process.advisory} onChanged={refreshProcess} />
          )}

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
          </>
        )}
      </main>

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
