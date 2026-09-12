'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Banknote,
  CalendarPlus,
  Check,
  Home as HomeIcon,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PrincipalApproval } from '@/components/principal-approval/PrincipalApproval';
import { DEAL_TYPES } from '@/components/mortgage-advisor/types';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { journeyStageFor } from '@/data/platform/planStages';
import { formatDate } from '@/lib/advisor-crm';
import type {
  AdvisorMeetingView,
  AdvisorNoteView,
  AdvisorTaskView,
  NoteVisibility,
  PlanStageId,
} from '@/lib/advisor-crm';
import type { ClientDocumentStatus, ClientStage } from '@/lib/client-process';
import type { ClientDetail } from './clientDetail';
import { ClientDetailsForm } from './ClientDetailsForm';
import type { ClientDetailsValues } from './ClientDetailsForm';
import { AdvisorAuctionPanel } from './AdvisorAuctionPanel';
import { AdvisorMixPanel } from './AdvisorMixPanel';
import { ClientDocumentsPanel } from './ClientDocumentsPanel';
import { MeetingRow } from './MeetingRow';
import { StageNotes } from './StageNotes';
import { TaskComposer } from './TaskComposer';
import { TaskRow } from './TaskRow';
import type { ClientStageBoardView } from './useAdvisorCrm';
import type { NewTaskInput } from './useAdvisorCrm';

/** שלבי איסוף המסמכים שנפתחים בכל שלב בתהליך */
const STAGE_DOCUMENT_SCOPE: Record<PlanStageId, readonly ClientStage[]> = {
  ANALYSIS: ['INTAKE'],
  APPLICATIONS: ['DOCUMENTS', 'BANK_SUBMISSION', 'APPROVAL'],
  MIX: ['PLANNING'],
  AUCTION: ['NEGOTIATION'],
  SIGNING: ['SIGNING', 'FUNDING', 'COMPLETED'],
};

interface ClientStageWorkspaceProps {
  client: ClientDetail;
  stage: PlanStageId;
  /** מצב השלב אצל הלקוח, כשהוא פתח תהליך */
  stageView?: ClientStageBoardView;
  planId: string | null;
  tasks: AdvisorTaskView[];
  notes: AdvisorNoteView[];
  meetings: AdvisorMeetingView[];
  onPatchClient: (values: Record<string, unknown>) => Promise<void>;
  onDocumentStatus: (documentId: string, status: ClientDocumentStatus) => void;
  onClientStage: (stage: ClientStage) => void;
  onCreateTask: (input: NewTaskInput) => Promise<string | null>;
  onTaskStatus: (taskId: string, status: AdvisorTaskView['status']) => void;
  onTaskReschedule: (taskId: string, dueDate: string | null) => void;
  onTaskDelete: (taskId: string) => void;
  onCreateNote: (body: string, visibility: NoteVisibility) => Promise<string | null>;
  onNoteVisibility: (noteId: string, visibility: NoteVisibility) => void;
  onNoteDelete: (noteId: string) => void;
  onCancelMeeting: (meetingId: string) => void;
  onScheduleMeeting: () => void;
}

/**
 * המסך הראשי של דף הלקוח, כפי שהוא מתחלף לפי השלב שנבחר בסרגל השלבים.
 *
 * בכל שלב נפתחים השדות והכלים של אותו שלב — פרטי הלקוח בניתוח, טופס האישור
 * העקרוני והמסמכים שלו, כלי בניית התמהיל, וכן הלאה — ומתחתיהם, בכל שלב, עבודת
 * היועץ עצמה: המשימות, ההערות והפגישות שנקבעו לאותו שלב.
 */
export function ClientStageWorkspace(props: ClientStageWorkspaceProps) {
  const { client, stage, stageView, tasks, notes, meetings } = props;
  const journey = journeyStageFor(stage);
  const StageIcon = journey.icon;

  const stageTasks = tasks.filter((task) => task.stage === stage);
  const stageNotes = notes.filter((note) => note.stage === stage);
  const stageMeetings = meetings.filter((meeting) => meeting.stage === stage);

  return (
    <motion.div
      key={stage}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* כותרת השלב הפעיל */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1.5 w-full bg-gradient-to-l ${journey.gradient}`} />
        <div className="flex flex-wrap items-center gap-4 p-4 md:px-6">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${journey.gradient} shadow-lg`}
          >
            <StageIcon className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-400">{journey.shortTitle}</span>
              {stageView?.completedByClient && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
                  <Check className="h-3 w-3" />
                  בוצע על ידי הלקוח
                  {stageView.completedAt && ` · ${formatDate(stageView.completedAt)}`}
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-900 md:text-xl">{journey.title}</h2>
            <p className="text-sm text-slate-500">{journey.tagline}</p>
          </div>
        </div>
      </div>

      <StageTools {...props} />

      {/* עבודת היועץ בשלב — זהה בכל שלב, כדי שתמיד תהיה במקום אחד */}
      <Card className="border-slate-200">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black text-slate-700">המשימות שלי בשלב</p>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-[11px]"
                onClick={props.onScheduleMeeting}
              >
                <CalendarPlus className="ml-1 h-3.5 w-3.5" />
                קבע פגישה בשלב
              </Button>
              <TaskComposer
                clientId={client.id}
                stage={stage}
                onCreate={props.onCreateTask}
              />
            </div>
          </div>

          {stageTasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-center text-[11px] text-slate-400">
              אין עדיין משימות בשלב הזה. הוסיפו משימה וקבעו לה תאריך — היא תופיע בלוח השנה.
            </p>
          ) : (
            <div className="space-y-2">
              {stageTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  showStage={false}
                  onToggle={(status) => props.onTaskStatus(task.id, status)}
                  onReschedule={(dueDate) => props.onTaskReschedule(task.id, dueDate)}
                  onDelete={() => props.onTaskDelete(task.id)}
                />
              ))}
            </div>
          )}

          <StageNotes
            notes={stageNotes}
            onCreate={props.onCreateNote}
            onVisibility={props.onNoteVisibility}
            onDelete={props.onNoteDelete}
          />

          {stageMeetings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-700">פגישות בשלב</p>
              {stageMeetings.map((meeting) => (
                <MeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  viewer="advisor"
                  linkToClient={false}
                  onCancel={() => props.onCancelMeeting(meeting.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** השדות והכלים של השלב עצמו */
function StageTools({
  client,
  stage,
  planId,
  onPatchClient,
  onDocumentStatus,
  onClientStage,
}: ClientStageWorkspaceProps) {
  const detailValues: ClientDetailsValues = {
    phone: client.phone,
    household: client.household,
    age: client.age,
    partnerName: client.partnerName,
    partnerAge: client.partnerAge,
    income: client.income,
    partnerIncome: client.partnerIncome,
    expenses: client.expenses,
    existingLoans: client.existingLoans,
    propertyValue: client.propertyValue,
    propertyAddress: client.propertyAddress,
    mortgageAmount: client.mortgageAmount,
    dealType: client.dealType,
    notes: client.notes,
  };

  const documents = (
    <ClientDocumentsPanel
      documents={client.documents}
      stage={client.stage}
      stages={STAGE_DOCUMENT_SCOPE[stage]}
      title={`המסמכים של ${journeyStageFor(stage).shortTitle}`}
      onStageChange={onClientStage}
      onStatusChange={onDocumentStatus}
      action={
        <Button size="sm" variant="ghost" className="h-7 text-[11px]" asChild>
          <Link href={`/advisor-dashboard/client/${client.id}/documents`}>לתיק המלא</Link>
        </Button>
      }
    />
  );

  if (stage === 'ANALYSIS') {
    return (
      <div className="space-y-4">
        <ClientSummary client={client} />
        <Card className="border-slate-200">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-sm font-black text-slate-900">פרטי משק הבית והיכולת הפיננסית</p>
              <p className="text-[11px] text-slate-500">
                הנתונים שנקבעים כאן מזינים את התזרים, את יכולת ההחזר ואת בניית התמהיל.
              </p>
            </div>
            <ClientDetailsForm
              values={detailValues}
              sections={['household', 'income', 'notes']}
              submitLabel="שמור את פרטי הלקוח"
              confirmOnSave
              onSubmit={onPatchClient}
            />
          </CardContent>
        </Card>
        {documents}
      </div>
    );
  }

  if (stage === 'APPLICATIONS') {
    return (
      <div className="space-y-4">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <p className="text-sm font-black text-slate-900">פרטי הלקוח לאישור עקרוני</p>
            <p className="text-[11px] text-slate-500">
              תיק האישור העקרוני של {client.name} נפתח כאן, בתוך השלב עצמו: הלווים וההכנסות,
              החשבונות, ההלוואה והנכס, מקורות המימון, המסמכים והאישורים שהתקבלו מכל בנק. מה
              שתמלאו נשמר תוך כדי הקלדה ומשותף עם הלקוח.
            </p>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <PrincipalApproval clientRecordId={client.id} embedded />
        </div>

        {documents}
      </div>
    );
  }

  if (stage === 'MIX') {
    return (
      <div className="space-y-4">
        {/*
          שלב בניית התמהיל אצל היועץ הוא אותו מסך בדיוק שהלקוח רואה, בתוספת
          אזור השידור: מה שנשמר כאן נשאר אצל היועץ עד שישדר אותו.
        */}
        <AdvisorMixPanel clientId={client.id} clientName={client.name} planId={planId} />
      </div>
    );
  }

  if (stage === 'AUCTION') {
    return (
      <div className="space-y-4">
        {/*
          שלב התמחור אצל היועץ הוא אותו מסך בדיוק שהלקוח רואה — אותם אזורים,
          אותה תצוגה ואותה התנהגות — בתוספת שידור ההצעה אליו.
        */}
        <AdvisorAuctionPanel clientId={client.id} clientName={client.name} planId={planId} />
        {documents}
      </div>
    );
  }

  return <div className="space-y-4">{documents}</div>;
}

/** תמונת המצב של הלקוח — הנכס, משק הבית, גובה המשכנתא והתזרים */
function ClientSummary({ client }: { client: ClientDetail }) {
  const householdLabel = client.household === 'COUPLE' ? 'זוג' : 'יחיד';
  const ages = [client.age, client.household === 'COUPLE' ? client.partnerAge : null]
    .filter((age): age is number => typeof age === 'number' && age > 0)
    .join(' / ');

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <DetailCard
        icon={<HomeIcon className="h-4 w-4" />}
        label="הנכס"
        value={client.propertyAddress || (client.propertyValue ? 'ללא כתובת' : 'טרם הוגדר')}
        hint={
          [
            client.propertyValue ? `עלות ${formatShekel(client.propertyValue)}` : null,
            client.dealType ? DEAL_TYPES[client.dealType] : null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
      />
      <DetailCard
        icon={
          client.household === 'COUPLE' ? (
            <Users className="h-4 w-4" />
          ) : (
            <UserRound className="h-4 w-4" />
          )
        }
        label="הרכב וגיל"
        value={ages ? `${householdLabel} · גיל ${ages}` : householdLabel}
        hint={
          client.household === 'COUPLE' && client.partnerName
            ? `עם ${client.partnerName}`
            : undefined
        }
      />
      <DetailCard
        icon={<Banknote className="h-4 w-4" />}
        label="גובה המשכנתא"
        value={client.mortgageAmount ? formatShekel(client.mortgageAmount) : 'טרם נקבע'}
        hint={
          client.plannedMonthlyPayment
            ? `החזר מתוכנן ${formatShekel(client.plannedMonthlyPayment)}`
            : undefined
        }
      />
      <DetailCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="צפי תזרים חודשי"
        value={
          client.projectedCashFlow === null
            ? 'חסרים נתוני הכנסה'
            : formatShekel(client.projectedCashFlow)
        }
        hint={
          client.projectedCashFlow === null
            ? 'הזינו הכנסות והוצאות'
            : client.projectedCashFlow >= 0
              ? 'נשאר חופשי אחרי המשכנתא וההלוואות'
              : 'התזרים שלילי — ההחזר גבוה מדי'
        }
        tone={client.projectedCashFlow !== null && client.projectedCashFlow < 0 ? 'danger' : 'default'}
      />
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="text-blue-600">{icon}</span>
          {label}
        </p>
        <p
          className={`mt-1 truncate text-base font-bold ${
            tone === 'danger' ? 'text-red-600' : 'text-slate-900'
          }`}
          title={value}
        >
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-slate-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}
