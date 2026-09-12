'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertTriangle, ArrowRight, Mail, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import VideoCallModal from '@/components/advisor-dashboard/VideoCallModal';
import { StageRail } from '@/components/plan/StageRail';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { PlanStageId, PlanStageStatus } from '@/lib/mortgage-plan';
import { ClientContextRow } from '@/components/advisor/ClientContextRow';
import { ClientStageWorkspace } from '@/components/advisor/ClientStageWorkspace';
import { MeetingDialog } from '@/components/advisor/MeetingDialog';
import { QuickActions } from '@/components/advisor/QuickActions';
import { TaskDialog } from '@/components/advisor/TaskDialog';
import { useClientDetail } from '@/components/advisor/useClientDetail';
import {
  useAdvisorNotes,
  useAdvisorTasks,
  useClientProcess,
  useMeetings,
} from '@/components/advisor/useAdvisorCrm';

/**
 * דף הלקוח באזור היועץ.
 *
 * המבנה זהה לזה שהלקוח רואה בתהליך שלו: חמשת השלבים כסרגל ניווט בראש העמוד,
 * ומתחתיו מסך ראשי שמתחלף לפי השלב שנבחר ופותח את השדות והכלים שלו. השורה
 * שמתחת למסך הראשי — תיק המסמכים, הפגישות והמשימות של הלקוח — נשארת קבועה.
 */
export default function AdvisorClientPage() {
  const params = useParams<{ id: string }>();
  const clientId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();
  const { data: session, status } = useSession();

  const [callOpen, setCallOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingStage, setMeetingStage] = useState<PlanStageId | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PlanStageId | null>(null);

  const { client, loading, error, patch, setDocumentStatus } = useClientDetail(clientId);
  const { process, refresh: refreshProcess } = useClientProcess(clientId);
  const tasks = useAdvisorTasks({ clientId, includeClosed: true }, Boolean(clientId));
  const notes = useAdvisorNotes({ clientId, enabled: Boolean(clientId) });
  const meetings = useMeetings({ clientId, enabled: Boolean(clientId) });

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

  const stage = selectedStage ?? process?.currentStage ?? 'ANALYSIS';

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
              <h1 className="truncate text-xl font-black text-white md:text-2xl">{client.name}</h1>
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

            <button
              type="button"
              onClick={() => setCallOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              <Video className="h-4 w-4" />
              שיחת וידאו
            </button>
          </div>

          <div className="mt-4">
            <StageRail current={stage} statuses={statuses} onSelect={setSelectedStage} />
            {!process?.planId && (
              <p className="mt-2 text-center text-[11px] text-white/50">
                הלקוח עדיין לא פתח תהליך משלו. אפשר לעבוד בכל שלב — מה שתמלאו יחכה לו.
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <ClientStageWorkspace
          client={client}
          stage={stage}
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
          onTaskStatus={(taskId, next) => void tasks.update(taskId, { status: next })}
          onTaskReschedule={(taskId, dueDate) => void tasks.update(taskId, { dueDate })}
          onTaskDelete={(taskId) => void tasks.remove(taskId)}
        />
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

      <VideoCallModal
        isOpen={callOpen}
        onClose={() => setCallOpen(false)}
        client={{
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone ?? undefined,
          status: 'ACTIVE',
          progress: client.progress,
          propertyValue: client.propertyValue ?? undefined,
          downPayment: client.downPayment ?? undefined,
          income: client.income ?? undefined,
          creditScore: client.creditScore ?? undefined,
        }}
        advisor={{
          name: session.user?.name || 'יועץ',
          email: session.user?.email || '',
        }}
      />
    </div>
  );
}
