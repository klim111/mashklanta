'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Cloud,
  CloudOff,
  FileText,
  FolderCheck,
  HandCoins,
  Landmark,
  Loader2,
  PiggyBank,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { completeness, type EntityType } from '@/lib/principal-approval/schema';
import { CaseProvider, useCase, CASE_ENTITY_ID } from './CaseContext';
import { toApprovalSummary, type ApprovalSummary } from '@/lib/principal-approval/plan-bridge';
import { ConflictResolver } from './ConflictResolver';
import { PermissionPanel } from './PermissionPanel';
import { ApprovalReport } from './ApprovalReport';
import { PeopleSection } from './sections/PeopleSection';
import { BankAccountsSection } from './sections/BankAccountsSection';
import { LoanDetailsSection } from './sections/LoanDetailsSection';
import { FundingSection } from './sections/FundingSection';
import { DocumentsSection } from './sections/DocumentsSection';
import { BankApprovalsSection } from './sections/BankApprovalsSection';

type StepId =
  | 'borrowers'
  | 'accounts'
  | 'loan'
  | 'funding'
  | 'guarantors'
  | 'documents'
  | 'approvals'
  | 'report';

const STEPS: { id: StepId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'borrowers', label: 'לווים והכנסות', icon: Users },
  { id: 'accounts', label: 'חשבונות בנק', icon: Landmark },
  { id: 'loan', label: 'הלוואה ונכס', icon: Building2 },
  { id: 'funding', label: 'מקורות מימון', icon: PiggyBank },
  { id: 'guarantors', label: 'ערבים', icon: HandCoins },
  { id: 'documents', label: 'תיק המסמכים', icon: FolderCheck },
  { id: 'approvals', label: 'אישור עקרוני לפי בנק', icon: BadgeCheck },
  { id: 'report', label: 'דוח מסכם', icon: FileText },
];

function SaveStatus() {
  const { pendingCount, lastSavedAt } = useCase();
  if (pendingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-100">
        <Loader2 className="h-3 w-3 animate-spin" />
        שומר…
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
        <Cloud className="h-3 w-3" />
        נשמר {lastSavedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
      <Cloud className="h-3 w-3" />
      שמירה אוטומטית פעילה
    </span>
  );
}

/** Overall progress across every required field currently visible. */
function useOverallProgress() {
  const { data, valuesOf, entities } = useCase();
  return useMemo(() => {
    if (!data) return { filled: 0, total: 0, ratio: 0 };
    let filled = 0;
    let total = 0;
    const add = (type: EntityType, values: Record<string, unknown>) => {
      const c = completeness(type, values);
      filled += c.filled;
      total += c.total;
    };
    add('case', valuesOf('case', CASE_ENTITY_ID));
    (
      [
        'borrower',
        'guarantor',
        'income',
        'prevEmployment',
        'bankAccount',
        'fundingSource',
        'bankApproval',
      ] as EntityType[]
    ).forEach(
      (type) => entities(type).forEach((entity) => add(type, valuesOf(type, entity.id))),
    );
    return { filled, total, ratio: total === 0 ? 0 : filled / total };
  }, [data, valuesOf, entities]);
}

/**
 * Reports the per-bank approvals upward so the plan stage can keep feeding
 * `PlanData.APPLICATIONS`. Fires only when the payload actually changes, so it
 * cannot ping-pong with the parent's own state update.
 */
function ApprovalsReporter({ onApprovals }: { onApprovals: (list: ApprovalSummary[]) => void }) {
  const { entities, valuesOf } = useCase();
  const approvals = entities('bankApproval');
  const serialized = JSON.stringify(
    approvals.map((approval) => toApprovalSummary(approval.id, valuesOf('bankApproval', approval.id))),
  );
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (lastSent.current === serialized) return;
    lastSent.current = serialized;
    onApprovals(JSON.parse(serialized) as ApprovalSummary[]);
  }, [serialized, onApprovals]);

  return null;
}

function ApprovalShell({ embedded = false }: { embedded?: boolean }) {
  const { data, loading, loadError, openConflicts, actionError, dismissActionError } = useCase();
  const [step, setStep] = useState<StepId>('borrowers');
  const stepIndex = Math.max(STEPS.findIndex((s) => s.id === step), 0);
  const progress = useOverallProgress();

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center', embedded ? 'min-h-[240px]' : 'min-h-[60vh]')}>
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
          <p className="text-sm">טוען את התיק…</p>
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <CloudOff className="mx-auto mb-3 h-8 w-8 text-rose-400" />
        <h2 className="text-base font-bold text-rose-900">לא ניתן לטעון את התיק</h2>
        <p className="mt-1 text-[13px] text-rose-700">{loadError ?? 'שגיאה לא ידועה'}</p>
      </div>
    );
  }

  const percent = Math.round(progress.ratio * 100);

  return (
    <div
      className={cn('space-y-6', embedded ? '' : 'mx-auto max-w-6xl px-4 py-8')}
      dir="rtl"
    >
      {/* Header */}
      <header
        className={cn(
          'print:hidden',
          embedded
            ? 'rounded-2xl border border-slate-200 bg-slate-50/60 p-4'
            : 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {!embedded && (
              <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500">
                שלב האישור העקרוני
              </p>
            )}
            <h1
              className={cn(
                'font-black tracking-tight text-slate-900',
                embedded ? 'text-base' : 'mt-1 text-2xl',
              )}
            >
              איסוף פרטי הבקשה
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              {data.viewer.role === 'advisor'
                ? `תיק של ${data.client.name ?? data.client.email} · הנתונים שתזין יסומנו אצל הלקוח כ"הוזן על ידי היועץ"`
                : 'כל שדה נשמר אוטומטית ברגע ההקלדה — אפשר לצאת ולחזור בכל שלב'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SaveStatus />
            <div className="flex items-center gap-2">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    percent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-l from-indigo-500 to-violet-500',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-[12px] font-bold text-slate-700">{percent}%</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {progress.filled} מתוך {progress.total} שדות חובה
            </span>
          </div>
        </div>

        {/* Step navigation */}
        <nav className="mt-6 flex flex-wrap gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = step === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all',
                  active
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </header>

      {actionError && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 print:hidden">
          <p className="flex items-start gap-2 text-[13px] text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {actionError}
          </p>
          <button type="button" onClick={dismissActionError} className="text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="print:hidden">
        <ConflictResolver />
      </div>

      {openConflicts.length === 0 && percent === 100 && step !== 'report' && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 print:hidden">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-[13px] font-medium text-emerald-900">
            כל שדות החובה מולאו — ניתן לעבור ללשונית "דוח מסכם" ולהפיק את הדוח.
          </p>
        </div>
      )}

      <main className="space-y-6">
        {step === 'borrowers' && <PeopleSection kind="borrower" />}
        {step === 'accounts' && <BankAccountsSection />}
        {step === 'loan' && <LoanDetailsSection />}
        {step === 'funding' && <FundingSection />}
        {step === 'guarantors' && <PeopleSection kind="guarantor" />}
        {step === 'documents' && <DocumentsSection />}
        {step === 'approvals' && <BankApprovalsSection />}
        {step === 'report' && <ApprovalReport />}
      </main>

      {/* Previous / next between the sections */}
      <nav className="flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStep(STEPS[stepIndex - 1].id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-all',
            stepIndex === 0
              ? 'cursor-not-allowed border-slate-100 text-slate-300'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
          )}
        >
          <ChevronRight className="h-4 w-4" />
          {stepIndex === 0 ? 'תחילת הטופס' : STEPS[stepIndex - 1].label}
        </button>

        <span className="text-[11px] font-medium text-slate-400">
          {stepIndex + 1} מתוך {STEPS.length}
        </span>

        <button
          type="button"
          disabled={stepIndex === STEPS.length - 1}
          onClick={() => setStep(STEPS[stepIndex + 1].id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all',
            stepIndex === STEPS.length - 1
              ? 'cursor-not-allowed bg-slate-100 text-slate-300'
              : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800',
          )}
        >
          {stepIndex === STEPS.length - 1 ? 'סוף הטופס' : STEPS[stepIndex + 1].label}
          <ChevronLeft className="h-4 w-4" />
        </button>
      </nav>

      {step !== 'report' && (
        <div className="print:hidden">
          <PermissionPanel />
        </div>
      )}
    </div>
  );
}

/**
 * Entry point for the principal-approval stage.
 * `clientRecordId` (a `Client.id`) is passed on the advisor side to open a
 * specific client's file; on the client side it is omitted and the signed-in
 * user's own file is used.
 */
export function PrincipalApproval({
  clientRecordId,
  embedded = false,
  onApprovals,
}: {
  clientRecordId?: string;
  /** Rendered inside another screen (the plan flow), so it drops the page chrome. */
  embedded?: boolean;
  /** Called with the per-bank approvals whenever they change. */
  onApprovals?: (approvals: ApprovalSummary[]) => void;
}) {
  if (embedded) {
    return (
      <CaseProvider clientRecordId={clientRecordId}>
        {onApprovals && <ApprovalsReporter onApprovals={onApprovals} />}
        <ApprovalShell embedded />
      </CaseProvider>
    );
  }
  return (
    <CaseProvider clientRecordId={clientRecordId}>
      {onApprovals && <ApprovalsReporter onApprovals={onApprovals} />}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <ApprovalShell />
      </div>
    </CaseProvider>
  );
}
