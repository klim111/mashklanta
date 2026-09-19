'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleDashed, FileUp, ListChecks, Loader2, Lock, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/plan-documents';
import type { PlanDocumentView } from '@/lib/plan-documents';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { customDocumentKey } from '@/lib/document-progress';
import type { PlanData } from '@/lib/mortgage-plan';
import { usePlanDocuments } from './usePlanDocuments';
import { usePlanRequirements } from './usePlanRequirements';

const ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  /** השלב שהמסמך שייך לו — נשמר במפתח, כדי שהתקדמות השלב תספור אותו */
  stage: PlanStageId | null;
  /** כותרת מוצעת, למשל מכותרת המשימה */
  defaultTitle?: string;
  /** סוג המסמך שהחלון נפתח עליו, כשנפתח משורת מסמך בתיק */
  defaultKey?: string | null;
  /** נתוני התהליך, כשהם כבר ביד — אחרת הם נטענים לפי המזהה */
  data?: PlanData;
  onUploaded?: (document: PlanDocumentView) => void;
}

/**
 * העלאת מסמך בכותרת חופשית.
 *
 * הכותרת היא המפתח של המסמך בתיק: הקובץ עולה לאחסון הפלטפורמה, משויך ללקוח
 * ולתהליך, ומופיע מיד בתיק המסמכים — לצד המסמכים שהקטלוג דורש.
 */
export function DocumentUploadDialog({
  open,
  onOpenChange,
  planId,
  stage,
  defaultTitle = '',
  defaultKey = null,
  data,
  onUploaded,
}: DocumentUploadDialogProps) {
  const { documents, error, upload, busyKey } = usePlanDocuments(planId);
  const requirements = usePlanRequirements(planId, data);
  const [title, setTitle] = useState(defaultTitle);
  /** סוג המסמך מהקטלוג; ריק — כותרת חופשית */
  const [typeKey, setTypeKey] = useState<string>(defaultKey ?? '');
  const [fileName, setFileName] = useState('');
  const [showList, setShowList] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState<PlanDocumentView | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setTypeKey(defaultKey ?? '');
    setFile(null);
    setFileName('');
    setShowList(false);
    setDone(null);
    setBusy(false);
  }, [open, defaultTitle, defaultKey]);

  const byKey = useMemo(
    () => new Map(documents.map((document) => [document.key, document])),
    [documents]
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof requirements>();
    requirements.forEach((requirement) => {
      map.set(requirement.group, [...(map.get(requirement.group) ?? []), requirement]);
    });
    return [...map.entries()];
  }, [requirements]);

  const selected = requirements.find((requirement) => requirement.key === typeKey) ?? null;
  const pending = requirements.filter((requirement) => !byKey.has(requirement.key));
  const submitted = requirements.filter((requirement) => byKey.has(requirement.key));

  /* סוג מהקטלוג שומר תחת המפתח שלו; כותרת חופשית מקבלת מפתח לפי השלב */
  const key = selected ? selected.key : customDocumentKey(stage, title);
  const documentName = selected ? selected.name : title.trim();
  const canUpload = Boolean(selected || title.trim().length >= 2) && file !== null && !busy;

  const pickType = (next: string) => {
    setTypeKey(next);
    const match = requirements.find((requirement) => requirement.key === next);
    if (match) setTitle(match.name);
  };

  const submit = async () => {
    if (!file || !canUpload) return;
    setBusy(true);
    try {
      // הקובץ עולה לאחסון הפרטי, והרשומה שחוזרת היא המסמך בתיק הלקוח
      const record = await upload(key, documentName, file, fileName.trim() || file.name);
      if (!record) return;
      setDone(record);
      onUploaded?.(record);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg rounded-3xl bg-white p-6 md:p-8">
        {done ? (
          <div className="py-4 text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </span>
            <DialogTitle className="text-xl font-black text-slate-900">המסמך נשמר בתיק</DialogTitle>
            <p className="mt-2 text-sm text-slate-500">
              «{done.name}» זמין עכשיו בתיק המסמכים שלכם, ונספר בהתקדמות איסוף המסמכים.
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-5 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white hover:bg-slate-700"
            >
              סגירה
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                <FileUp className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">העלאת מסמך לתיק</DialogTitle>
                <p className="mt-0.5 text-sm text-slate-500">
                  {stage ? `שלב ${journeyStageFor(stage).shortTitle} · ` : ''}
                  {requirements.length > 0
                    ? 'בחרו את סוג המסמך מתוך מה שנדרש בתהליך שלכם'
                    : 'הכותרת היא המפתח שבו המסמך יישמר'}
                </p>
              </div>
            </div>

            {/* רשימת המסמכים המלאה — מעל סוג המסמך, במרכז החלון */}
            {requirements.length > 0 && (
              <div className="mb-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowList((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
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
                  <div className="mb-3 max-h-56 space-y-3 overflow-y-auto rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-3">
                    <FullList
                      title="עדיין לא הוגשו"
                      icon={<CircleDashed className="h-4 w-4 text-slate-400" />}
                      rows={pending.map((requirement) => ({
                        key: requirement.key,
                        name: requirement.name,
                        note: requirement.group,
                      }))}
                      onPick={(next) => {
                        pickType(next);
                        setShowList(false);
                      }}
                    />
                    <FullList
                      title="כבר הוגשו"
                      icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      rows={submitted.map((requirement) => ({
                        key: requirement.key,
                        name: requirement.name,
                        note: byKey.get(requirement.key)?.fileName ?? requirement.group,
                      }))}
                      onPick={(next) => {
                        pickType(next);
                        setShowList(false);
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {requirements.length > 0 && (
              <label className="block text-xs font-bold text-slate-600">
                סוג המסמך
                <select
                  value={typeKey}
                  onChange={(event) => pickType(event.target.value)}
                  className={`mt-1 ${inputClass}`}
                >
                  <option value="">כותרת חופשית…</option>
                  {groups.map(([group, rows]) => (
                    <optgroup key={group} label={group}>
                      {rows.map((requirement) => (
                        <option key={requirement.key} value={requirement.key}>
                          {byKey.has(requirement.key) ? `✓ ${requirement.name}` : requirement.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}

            {selected?.note && (
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                {selected.note}
              </p>
            )}

            {selected && byKey.has(selected.key) && (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] font-bold text-amber-900">
                כבר קיים קובץ למסמך הזה ({byKey.get(selected.key)?.fileName}). העלאה חדשה תחליף אותו.
              </p>
            )}

            {!selected && (
              <label className="mt-2 block text-xs font-bold text-slate-600">
                כותרת המסמך
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={`mt-1 ${inputClass}`}
                  placeholder="למשל: תדפיס עו״ש 3 חודשים"
                />
              </label>
            )}

            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                setFile(picked);
                setFileName(picked?.name ?? '');
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              className={`mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                file ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
              }`}
            >
              <Upload className={`h-6 w-6 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-sm font-black text-slate-800">
                {file ? file.name : 'בחרו קובץ — PDF או תמונה'}
              </span>
              <span className="text-[11px] text-slate-500">
                עד {Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))}MB
              </span>
            </button>

            {file && (
              <label className="mt-3 block text-xs font-bold text-slate-600">
                שם הקובץ שיישמר
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  className={`mt-1 ${inputClass}`}
                />
                <span className="mt-1 block text-[11px] font-medium text-slate-500">
                  נשמר בשם שבו הועלה — אפשר לשנות אותו כאן לפני השמירה
                </span>
              </label>
            )}

            {error && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {error}
              </p>
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              הקובץ נשמר באחסון פרטי ומוצג רק לכם וליועץ שמלווה אתכם
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={!canUpload || busyKey === key}
                onClick={() => void submit()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-md transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                העלאה לתיק
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FullList({
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
      <p className="mb-1.5 flex items-center justify-center gap-1.5 text-[11px] font-black text-slate-600">
        {icon}
        {title}
        <span className="rounded-full bg-white px-1.5 text-[10px] text-slate-500">{rows.length}</span>
      </p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onPick(row.key)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
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
