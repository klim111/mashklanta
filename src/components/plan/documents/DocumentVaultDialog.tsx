'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CircleDashed,
  Download,
  Eye,
  FileText,
  FolderDown,
  FolderOpen,
  ListChecks,
  Loader2,
  Lock,
  Trash2,
  Upload,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/advisor-crm';
import type { PlanData, PlanStageId } from '@/lib/mortgage-plan';
import type { PlanDocumentView } from '@/lib/plan-documents';
import { documentProgress } from '@/lib/document-progress';
import type { DocumentProgress } from '@/lib/document-progress';
import { isDemoPlan } from '@/lib/demo-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { useClientTasks } from '../tasks/useClientTasks';
import { planDocumentRequirements } from '@/lib/plan-document-catalog';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentViewerDialog } from './DocumentViewerDialog';
import { documentDownloadUrl, documentsArchiveUrl, usePlanDocuments } from './usePlanDocuments';
import { demoId } from '@/demo/demo-attr';

/** ההתקדמות של התהליך — נקראת פעם אחת ומשמשת גם את הכפתור וגם את החלון */
export function useDocumentProgress(planId: string, data: PlanData): {
  progress: DocumentProgress;
  documents: PlanDocumentView[];
  ready: boolean;
} {
  const { documents, ready } = usePlanDocuments(planId);
  const { tasks } = useClientTasks({ planId, includeDone: true });
  const progress = useMemo(() => documentProgress(data, documents, tasks), [data, documents, tasks]);
  return { progress, documents, ready };
}

/** פס התקדמות אחד — לשלב או לכל התהליך */
export function ProgressBar({
  percent,
  tone = 'blue',
  size = 'md',
}: {
  percent: number;
  tone?: 'blue' | 'emerald' | 'white';
  size?: 'sm' | 'md';
}) {
  const fill =
    tone === 'emerald'
      ? 'bg-gradient-to-l from-emerald-500 to-teal-400'
      : tone === 'white'
        ? 'bg-gradient-to-l from-cyan-300 to-emerald-300'
        : 'bg-gradient-to-l from-blue-500 to-violet-500';
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${size === 'sm' ? 'h-1.5' : 'h-2.5'} ${
        tone === 'white' ? 'bg-white/20' : 'bg-slate-200'
      }`}
    >
      <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${Math.max(percent, 2)}%` }} />
    </div>
  );
}

/**
 * תיק המסמכים — החלון שנפתח מכל מסך ומכל שלב.
 *
 * למעלה ההתקדמות: לכל שלב שיש בו מסמכים לאסוף, ולכל התהליך. מתחת כל המסמכים
 * שהועלו, עם צפייה ומחיקה, והעלאה של מסמך חדש בכותרת חופשית.
 */
export function DocumentVaultDialog({
  open,
  onOpenChange,
  planId,
  data,
  stage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  data: PlanData;
  /** השלב הפתוח כרגע — מסמך חדש ישויך אליו */
  stage?: PlanStageId | null;
}) {
  const { documents, ready, error, busyKey, remove } = usePlanDocuments(planId);
  const { tasks } = useClientTasks({ planId, includeDone: true });
  const progress = useMemo(() => documentProgress(data, documents, tasks), [data, documents, tasks]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  /** הרשימה המלאה של מה שהבנק ידרוש — סגורה עד שמבקשים אותה */
  const [showList, setShowList] = useState(false);
  const [viewing, setViewing] = useState<PlanDocumentView | null>(null);
  const demo = isDemoPlan(planId);

  const requirements = useMemo(() => planDocumentRequirements(data), [data]);
  const byKey = useMemo(
    () => new Map(documents.map((document) => [document.key, document])),
    [documents]
  );
  const pending = requirements.filter((requirement) => !byKey.has(requirement.key));
  const submitted = requirements.filter((requirement) => byKey.has(requirement.key));

  const openUpload = (key: string | null) => {
    setUploadKey(key);
    setUploadOpen(true);
  };

  const sorted = useMemo(
    () => [...documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [documents]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl bg-white p-0" {...demoId('vault-dialog')}>
        <div className="relative overflow-hidden bg-slate-950 px-6 py-6 text-white md:px-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl" />
            <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          </div>
          <div className="relative">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <FolderOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl font-black text-white">תיק המסמכים שלי</DialogTitle>
                <p className="mt-0.5 text-sm text-white/60">
                  {progress.overall.done} מתוך {progress.overall.total} מסמכים נאספו · {progress.overall.percent}%
                  מהתהליך
                </p>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar percent={progress.overall.percent} tone="white" />
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-5">
              {progress.stages.map((row, index) => {
                const journey = journeyStageFor(row.stage);
                return (
                  <li
                    key={row.stage}
                    className={`rounded-xl px-3 py-2 ${row.relevant ? 'bg-white/10' : 'bg-white/5 opacity-60'}`}
                  >
                    <p className="flex items-center justify-between text-[11px] font-black">
                      <span className="truncate">
                        {index + 1}. {journey.shortTitle}
                      </span>
                      <span className="text-white/70">{row.relevant ? `${row.done}/${row.total}` : '—'}</span>
                    </p>
                    <div className="mt-1.5">
                      <ProgressBar percent={row.relevant ? row.percent : 0} tone="white" size="sm" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="p-6 md:p-8" {...demoId('vault-list')}>
          {/* הרשימה המלאה של מה שנדרש — במרכז, מעל כותרת מה שכבר הועלה */}
          {requirements.length > 0 && (
            <div className="mb-4 flex justify-center">
              <button
                {...demoId('vault-full-list')}
                type="button"
                onClick={() => setShowList((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
              >
                <ListChecks className="h-4 w-4 text-blue-600" />
                רשימת המסמכים המלאה
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {submitted.length}/{requirements.length}
                </span>
              </button>
            </div>
          )}

          <AnimatePresence initial={false}>
            {showList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mb-4 space-y-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-4">
                  <RequirementList
                    title="עדיין לא הוגשו"
                    icon={<CircleDashed className="h-4 w-4 text-slate-400" />}
                    rows={pending.map((requirement) => ({
                      key: requirement.key,
                      name: requirement.name,
                      note: requirement.group,
                    }))}
                    onPick={openUpload}
                  />
                  <RequirementList
                    title="כבר הוגשו"
                    icon={<FileText className="h-4 w-4 text-emerald-600" />}
                    rows={submitted.map((requirement) => ({
                      key: requirement.key,
                      name: requirement.name,
                      note: byKey.get(requirement.key)?.fileName ?? requirement.group,
                    }))}
                    onPick={openUpload}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-black text-slate-900">כל המסמכים שהעליתם ({documents.length})</h3>
            <div className="flex flex-wrap items-center gap-2">
              {!demo && documents.length > 0 && (
                <a
                  href={documentsArchiveUrl(planId)}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <FolderDown className="h-4 w-4" />
                  הורדת תיק המסמכים
                </a>
              )}
              <button
                type="button"
                onClick={() => openUpload(null)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <Upload className="h-4 w-4" />
                העלאת מסמך
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              {error}
            </p>
          )}

          {!ready ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-black text-slate-700">עדיין לא הועלו מסמכים</p>
              <p className="mt-1 text-xs text-slate-500">
                מסמכי הפרופיל מועלים בשלב 1, האישורים העקרוניים בשלב 3, וכל מסמך אחר — מכאן.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {sorted.map((document) => (
                <li
                  key={document.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">{document.name}</p>
                    <p className="truncate text-[12px] text-slate-500">
                      {document.fileName} · {formatDate(document.uploadedAt)}
                    </p>
                  </div>
                  {!demo && (
                    <>
                      <button
                        type="button"
                        onClick={() => setViewing(document)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-black text-white hover:bg-slate-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        צפייה
                      </button>
                      <a
                        href={documentDownloadUrl(planId, document.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-black text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        הורדה
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={busyKey === document.key}
                    onClick={() => void remove(document.id, document.key)}
                    title="מחיקה"
                    className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              הקבצים באחסון פרטי — לכם וליועץ שמלווה אתכם בלבד
            </p>
            {!demo && (
              <Link
                href={`/dashboard/plans/${planId}?stage=ANALYSIS`}
                className="inline-flex items-center gap-1 text-[12px] font-black text-blue-600 hover:underline"
              >
                לרשימת המסמכים שהבנק דורש
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        <DocumentUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          planId={planId}
          data={data}
          stage={stage ?? null}
          defaultKey={uploadKey}
        />
        <DocumentViewerDialog planId={planId} document={viewing} onClose={() => setViewing(null)} />
      </DialogContent>
    </Dialog>
  );
}

/** קטע ברשימה המלאה: מה שטרם הוגש, ומה שכבר הוגש */
function RequirementList({
  title,
  icon,
  rows,
  onPick,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Array<{ key: string; name: string; note: string }>;
  onPick: (key: string) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <section>
      <p className="mb-2 flex items-center justify-center gap-1.5 text-[13px] font-black text-slate-600">
        {icon}
        {title}
        <span className="rounded-full bg-white px-2 text-[11px] text-slate-500">{rows.length}</span>
      </p>
      <ul className="space-y-1.5">
        {rows.map((row, index) => (
          <li key={row.key}>
            <button
              {...demoId(`vault-pick-${index}`)}
              type="button"
              onClick={() => onPick(row.key)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <span className="block text-[13px] font-black text-slate-900">{row.name}</span>
              <span className="block text-[11px] font-medium text-slate-500">{row.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
