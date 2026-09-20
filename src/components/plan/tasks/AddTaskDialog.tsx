'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CalendarPlus,
  Check,
  FileUp,
  Landmark,
  ListChecks,
  Loader2,
  Lock,
  PenLine,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/plan-documents';
import { customDocumentKey } from '@/lib/document-progress';
import { usePlanDocuments } from '../documents/usePlanDocuments';
import { MORTGAGE_BANKS } from '@/components/mortgage-advisor/types';
import { journeyStageFor } from '@/data/platform/planStages';
import {
  ALL_TASK_TEMPLATES,
  CLIENT_TASK_KINDS,
  CLIENT_TASK_KIND_LABELS,
  STAGE_TASK_TEMPLATES,
  bankTaskTitle,
} from '@/lib/client-tasks';
import type { ClientTaskKind, ClientTaskTemplate } from '@/lib/client-tasks';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { fromLocalInputValue } from '@/components/advisor/ui';
import type { NewClientTaskInput } from './useClientTasks';
import { demoId } from '@/demo/demo-attr';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

const KIND_ICONS = { TASK: ListChecks, MEETING: CalendarClock, DOCUMENT: FileUp } as const;
const ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');
const MAX_MB = Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024));

type Picked = { template: ClientTaskTemplate; stage: PlanStageId } | 'free';

export interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** התהליך שאליו נוספת המשימה — ריק כשמוסיפים משימה כללית מלוח השנה */
  planId: string | null;
  /** השלב שממנו נפתח החלון; ריק — מציעים את התבניות של כל השלבים */
  stage: PlanStageId | null;
  /** יום שנבחר בלוח השנה (YYYY-MM-DD) — ממלא את המועד מראש */
  defaultDay?: string | null;
  /**
   * התהליך שאליו יעלה מסמך, כשהוא שונה מ-`planId` — למשל משימה כללית מלוח
   * השנה שהקובץ שלה צריך בכל זאת להיכנס לתיק של המשכנתא הפתוחה.
   */
  documentPlanId?: string | null;
  onSubmit: (input: NewClientTaskInput) => Promise<unknown>;
}

/**
 * הוספת משימה מתוכננת.
 *
 * למעלה התבניות של השלב (או של כל השלבים, כשמגיעים מלוח השנה) — לחיצה עליהן
 * ממלאת את הטופס; ומתחת ניסוח חופשי: משימה, פגישה או מסמך, עם מועד ופרטים.
 * תבנית שדורשת בנק פותחת בחירת בנק, והכותרת מקבלת את שמו.
 */
export function AddTaskDialog({
  open,
  onOpenChange,
  planId,
  stage,
  defaultDay,
  documentPlanId,
  onSubmit,
}: AddTaskDialogProps) {
  const [picked, setPicked] = useState<Picked>('free');
  const [kind, setKind] = useState<ClientTaskKind>('TASK');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [bank, setBank] = useState<string>('');
  const [when, setWhen] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** התהליך שהקובץ ייכנס לתיק שלו */
  const uploadPlanId = documentPlanId ?? planId;
  const { upload, error: uploadError } = usePlanDocuments(uploadPlanId);

  useEffect(() => {
    if (!open) return;
    setPicked('free');
    setKind('TASK');
    setTitle('');
    setDetails('');
    setBank('');
    setWhen(defaultDay ? `${defaultDay}T10:00` : '');
    setFile(null);
    setBusy(false);
    setError(null);
  }, [open, defaultDay]);

  const suggestions = useMemo(
    () =>
      stage
        ? STAGE_TASK_TEMPLATES[stage].map((template) => ({ template, stage }))
        : ALL_TASK_TEMPLATES.map(({ stage: templateStage, ...template }) => ({ template, stage: templateStage })),
    [stage]
  );

  const chooseTemplate = (entry: { template: ClientTaskTemplate; stage: PlanStageId }) => {
    setPicked(entry);
    setKind(entry.template.kind);
    setTitle(entry.template.needsBank ? '' : entry.template.title);
    setBank('');
    setFile(null);
  };

  const chosen = picked === 'free' ? null : picked;
  const needsBank = Boolean(chosen?.template.needsBank);
  const finalTitle = chosen && needsBank && bank ? bankTaskTitle(chosen.template, bank) : title.trim();
  const canSubmit =
    finalTitle.length >= 2 && (!needsBank || Boolean(bank)) && (kind !== 'MEETING' || Boolean(when));

  const taskStage = picked === 'free' ? stage : picked.stage;

  /**
   * שמירת המשימה. כשנבחר קובץ, הוא עולה קודם לאחסון הפרטי ונרשם בתיק המסמכים
   * של הלקוח — ורק אז נפתחת המשימה, כבר מקושרת אליו וסגורה. כך "העלאת מסמך"
   * אינה תזכורת אלא העלאה אמיתית.
   */
  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      let documentId: string | null = null;
      if (file && uploadPlanId) {
        const record = await upload(customDocumentKey(taskStage, finalTitle), finalTitle, file);
        if (!record) {
          setError(uploadError ?? 'העלאת המסמך נכשלה. נסו שוב.');
          return;
        }
        documentId = record.id;
      }

      const result = await onSubmit({
        planId,
        stage: taskStage,
        kind,
        templateKey: picked === 'free' ? null : picked.template.key,
        title: finalTitle,
        details: details.trim() || undefined,
        bank: bank || null,
        dueAt: when ? fromLocalInputValue(when) : null,
        documentId,
      });
      if (result === null) {
        setError('המשימה לא נשמרה. נסו שוב.');
        return;
      }
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 md:p-8">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg">
            <CalendarPlus className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-xl font-black text-slate-900">הוסף משימה מתוכננת</DialogTitle>
            <p className="mt-0.5 text-sm text-slate-500">
              {stage
                ? `משימה בשלב ${journeyStageFor(stage).shortTitle} — מהמוצעות או בניסוח חופשי`
                : 'משימה או פגישה — מהמוצעות בכל השלבים או בניסוח חופשי'}
            </p>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              משימות מוצעות
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((entry) => {
                const Icon = KIND_ICONS[entry.template.kind];
                const active =
                  chosen !== null && chosen.template.key === entry.template.key && chosen.stage === entry.stage;
                return (
                  <button
                    key={`${entry.stage}:${entry.template.key}`}
                    type="button"
                    onClick={() => chooseTemplate(entry)}
                    className={`flex items-start gap-2.5 rounded-2xl border-2 p-3 text-right transition-all ${
                      active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {active ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black leading-snug text-slate-900">
                        {entry.template.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">
                        {stage ? entry.template.hint : `${journeyStageFor(entry.stage).shortTitle} · ${entry.template.hint}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-black text-slate-500">
            <PenLine className="h-3.5 w-3.5 text-blue-600" />
            {picked === 'free' ? 'או בניסוח חופשי' : 'פרטי המשימה'}
          </p>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {CLIENT_TASK_KINDS.map((option) => {
              const Icon = KIND_ICONS[option];
              return (
                <button
                  key={option}
                  type="button"
                  {...demoId(`task-kind-${option}`)}
                  onClick={() => {
                    setKind(option);
                    // קובץ שנבחר שייך למשימת מסמך בלבד
                    if (option !== 'DOCUMENT') setFile(null);
                    if (chosen && chosen.template.kind !== option) setPicked('free');
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                    kind === option ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {CLIENT_TASK_KIND_LABELS[option]}
                </button>
              );
            })}
          </div>

          {chosen && needsBank ? (
            <label className="block text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1">
                <Landmark className="h-3.5 w-3.5" />
                עם איזה בנק?
              </span>
              <select value={bank} onChange={(event) => setBank(event.target.value)} className={`mt-1 ${inputClass}`}>
                <option value="">בחרו בנק</option>
                {MORTGAGE_BANKS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {bank && (
                <span className="mt-1.5 block text-[12px] font-black text-blue-700">
                  {bankTaskTitle(chosen.template, bank)}
                </span>
              )}
            </label>
          ) : (
            <label className="block text-xs font-bold text-slate-600">
              כותרת
              <input
                {...demoId('task-title')}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (chosen) setPicked('free');
                }}
                className={`mt-1 ${inputClass}`}
                placeholder={
                  kind === 'MEETING' ? 'למשל: פגישה עם הבנקאי בסניף' : kind === 'DOCUMENT' ? 'למשל: אישור יתרה מהבנק' : 'מה צריך לעשות'
                }
                autoFocus
              />
            </label>
          )}

          {/* מסמך — העלאה אמיתית לתיק, כאן ועכשיו */}
          {kind === 'DOCUMENT' && (
            <div className="mt-3">
              {uploadPlanId ? (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                      file
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'
                    }`}
                  >
                    <Upload className={`h-5 w-5 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-black text-slate-800">
                      {file ? file.name : 'בחרו קובץ להעלאה עכשיו — PDF או תמונה'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {file
                        ? 'המסמך יישמר בתיק המסמכים שלכם, והמשימה תיסגר'
                        : `עד ${MAX_MB}MB · אפשר גם לשמור עכשיו ולהעלות אחר כך`}
                    </span>
                  </button>
                  {file && (
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                      <Lock className="h-3.5 w-3.5" />
                      הקובץ נשמר באחסון פרטי ומוצג רק לכם וליועץ שמלווה אתכם
                    </p>
                  )}
                </>
              ) : (
                <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-bold text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  כדי להעלות מסמך לתיק צריך תהליך משכנתא פתוח. המשימה תישמר, ואפשר להעלות את הקובץ
                  מתוך השלב.
                </p>
              )}
            </div>
          )}

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              מועד {kind === 'MEETING' ? '' : <span className="font-normal text-slate-400">(רשות)</span>}
              <input
                {...demoId('task-when')}
                type="datetime-local"
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                className={`mt-1 ${inputClass}`}
                dir="ltr"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              פרטים <span className="font-normal text-slate-400">(רשות)</span>
              <input
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                className={`mt-1 ${inputClass}`}
                placeholder="מקום, מה להביא, על מה לשאול"
              />
            </label>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
          >
            ביטול
          </button>
          <button
            type="button"
            {...demoId('task-submit')}
            disabled={!canSubmit || busy}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white shadow-md transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : file ? (
              <Upload className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {file ? 'העלו את המסמך לתיק' : kind === 'MEETING' ? 'קבעו את הפגישה' : 'שמרו את המשימה'}
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-400">
          {PLAN_STAGES.length} שלבים · כל משימה עם מועד מופיעה בלוח השנה וברשימת המשימות שלכם
        </p>
      </DialogContent>
    </Dialog>
  );
}
