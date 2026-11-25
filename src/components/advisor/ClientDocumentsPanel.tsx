'use client';

import React from 'react';
import { Check, Circle, FileText, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CLIENT_STAGES,
  DOCUMENT_STATUS_LABELS,
  STAGE_LABELS,
  stageIndex,
} from '@/lib/client-process';
import type { ClientDocumentStatus, ClientStage } from '@/lib/client-process';
import type { ClientDocumentView } from './clientDetail';

interface ClientDocumentsPanelProps {
  documents: ClientDocumentView[];
  /** שלב איסוף המסמכים שהלקוח נמצא בו */
  stage: ClientStage;
  onStageChange: (stage: ClientStage) => void;
  onStatusChange: (documentId: string, status: ClientDocumentStatus) => void;
  /**
   * צמצום לשלבי איסוף מסוימים — לתצוגה בתוך שלב בתהליך, ולא בתיק המלא.
   * כשהוא קיים, רצף השלבים אינו מוצג, כי לא משנים כאן את שלב הלקוח.
   */
  stages?: readonly ClientStage[];
  title?: string;
  /** תוכן נוסף בכותרת — למשל קישור לתיק המלא */
  action?: React.ReactNode;
}

/**
 * תיק המסמכים של הלקוח.
 *
 * השלבים כאן הם שלבי איסוף המסמכים של הליווי, ולא חמשת שלבי התהליך — ולכן הם
 * מוצגים כרצף משלהם, עם המסמכים שנדרשים בכל אחד מהם.
 */
export function ClientDocumentsPanel({
  documents,
  stage,
  onStageChange,
  onStatusChange,
  stages,
  title,
  action,
}: ClientDocumentsPanelProps) {
  const scoped = stages !== undefined;
  const shown = scoped ? documents.filter((doc) => stages.includes(doc.stage)) : documents;
  const submitted = shown.filter((doc) => doc.status !== 'PENDING');
  const remaining = shown.filter((doc) => doc.status === 'PENDING');

  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileText className="h-4 w-4 text-blue-600" />
            {title ?? 'תיק המסמכים'}
          </p>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
              {submitted.length} הוגשו
            </Badge>
            <Badge className="bg-amber-100 text-[10px] text-amber-800 hover:bg-amber-100">
              {remaining.length} נותרו
            </Badge>
            {action}
          </div>
        </div>

        {!scoped && (
          <>
            <StageTrack stage={stage} onSelect={onStageChange} />
            <p className="text-[11px] text-slate-500">
              לחיצה על שלב מעבירה את הלקוח אליו ופותחת את המסמכים שנדרשים בו. השלבים כאן הם שלבי
              איסוף המסמכים, ולא חמשת שלבי התהליך.
            </p>
          </>
        )}

        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {scoped
              ? 'אין מסמכים פתוחים בשלב הזה.'
              : 'אין עדיין מסמכים פתוחים. הם ייפתחו לפי השלב בתהליך.'}
          </p>
        ) : (
          <div className="space-y-3">
            {CLIENT_STAGES.filter((item) => shown.some((doc) => doc.stage === item)).map(
              (item) => (
                <div key={item} className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-600">{STAGE_LABELS[item]}</p>
                  {shown
                    .filter((doc) => doc.stage === item)
                    .map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        document={doc}
                        onChange={(next) => onStatusChange(doc.id, next)}
                      />
                    ))}
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** רצף השלבים. השלבים שהושלמו מסומנים, והלחיצה מעבירה את הלקוח לשלב אחר */
function StageTrack({
  stage,
  onSelect,
}: {
  stage: ClientStage;
  onSelect: (stage: ClientStage) => void;
}) {
  const current = stageIndex(stage);

  return (
    <div className="flex flex-wrap gap-1.5">
      {CLIENT_STAGES.map((item, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              active
                ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700'
                : done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            {STAGE_LABELS[item]}
          </button>
        );
      })}
    </div>
  );
}

function DocumentRow({
  document,
  onChange,
}: {
  document: ClientDocumentView;
  onChange: (status: ClientDocumentStatus) => void;
}) {
  const submitted = document.status !== 'PENDING';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          document.status === 'APPROVED'
            ? 'bg-emerald-100 text-emerald-700'
            : document.status === 'REJECTED'
              ? 'bg-red-100 text-red-700'
              : document.status === 'SUBMITTED'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-400'
        }`}
      >
        {submitted ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-800">
          {document.name}
          {!document.required && <span className="text-slate-400"> (לא חובה)</span>}
        </p>
        <p className="text-[10px] text-slate-500">
          {DOCUMENT_STATUS_LABELS[document.status]}
          {document.submittedAt &&
            ` · ${new Date(document.submittedAt).toLocaleDateString('he-IL')}`}
        </p>
      </div>

      {document.status === 'PENDING' ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          onClick={() => onChange('SUBMITTED')}
        >
          סמן כהוגש
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          {document.status !== 'APPROVED' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => onChange('APPROVED')}
            >
              אושר
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-slate-500"
            title="החזר לרשימת המסמכים החסרים"
            onClick={() => onChange('PENDING')}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
