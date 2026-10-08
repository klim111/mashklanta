'use client';

import { useMemo, useState } from 'react';
import { Download, Eye, FileText, Search, Tags, Trash2, X } from 'lucide-react';
import { formatDate } from '@/lib/advisor-crm';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { PlanStageId } from '@/lib/mortgage-plan';
import type { PlanDocumentView } from '@/lib/plan-documents';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  documentCategory,
  documentStage,
  filterDocuments,
} from '@/lib/document-organize';
import type { DocumentCategory, DocumentMeta } from '@/lib/document-organize';
import { journeyStageFor } from '@/data/platform/planStages';
import { documentDownloadUrl } from './usePlanDocuments';

const CATEGORY_TONES: Record<DocumentCategory, string> = {
  BANK: 'bg-blue-50 text-blue-700 ring-blue-200',
  LAWYER: 'bg-violet-50 text-violet-700 ring-violet-200',
  SELLER: 'bg-amber-50 text-amber-800 ring-amber-200',
  SELF: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

/** שם השלב לתצוגה, עם המספר שלו בתהליך */
export function stageLabel(stage: PlanStageId): string {
  return `${PLAN_STAGES.indexOf(stage) + 1}. ${journeyStageFor(stage).shortTitle}`;
}

/** בחירת שלב לשיוך — כל השלבים, ו«ללא שלב» */
export function StageSelect({
  value,
  onChange,
  className = selectClass,
}: {
  value: PlanStageId | null;
  onChange: (stage: PlanStageId | 'NONE') => void;
  className?: string;
}) {
  return (
    <select
      value={value ?? 'NONE'}
      onChange={(event) => onChange(event.target.value as PlanStageId | 'NONE')}
      className={className}
      aria-label="שיוך לשלב"
    >
      {PLAN_STAGES.map((stage) => (
        <option key={stage} value={stage}>
          {stageLabel(stage)}
        </option>
      ))}
      <option value="NONE">ללא שלב</option>
    </select>
  );
}

/** בחירת קטגוריה — למי המסמך מיועד */
export function CategorySelect({
  value,
  onChange,
  className = selectClass,
}: {
  value: DocumentCategory;
  onChange: (category: DocumentCategory) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as DocumentCategory)}
      className={className}
      aria-label="קטגוריה"
    >
      {DOCUMENT_CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {DOCUMENT_CATEGORY_LABELS[category]}
        </option>
      ))}
    </select>
  );
}

/**
 * כל המסמכים שבתיק, מסודרים לפי קטגוריה — לבנק, לעורך הדין, למוכר, לעצמי —
 * עם השלב שכל מסמך הועלה בו, חיפוש לפי שם, וסינון לפי קטגוריה ושלב. מכל
 * שורה אפשר לשייך את המסמך לקטגוריה ולשלב אחרים.
 */
export function DocumentBrowser({
  planId,
  documents,
  busyKey,
  demo = false,
  onView,
  onRemove,
  onUpdateMeta,
}: {
  planId: string;
  documents: PlanDocumentView[];
  busyKey: string | null;
  demo?: boolean;
  onView: (document: PlanDocumentView) => void;
  onRemove: (document: PlanDocumentView) => void;
  onUpdateMeta: (documentId: string, meta: DocumentMeta) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DocumentCategory | null>(null);
  const [stage, setStage] = useState<PlanStageId | 'NONE' | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [documents]
  );
  /* המונה על כל קטגוריה מתחשב בחיפוש ובשלב, כדי שיתאים למה שיוצג בלחיצה */
  const beforeCategory = useMemo(() => filterDocuments(sorted, { query, stage }), [sorted, query, stage]);
  const visible = useMemo(
    () => (category ? beforeCategory.filter((document) => documentCategory(document) === category) : beforeCategory),
    [beforeCategory, category]
  );
  const groups = DOCUMENT_CATEGORIES.map((id) => ({
    id,
    rows: visible.filter((document) => documentCategory(document) === id),
  })).filter((group) => group.rows.length > 0);
  const filtering = Boolean(query.trim() || category || stage);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי שם המסמך או הקובץ"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <select
          value={stage ?? ''}
          onChange={(event) => setStage((event.target.value || null) as PlanStageId | 'NONE' | null)}
          className={selectClass}
          aria-label="סינון לפי שלב"
        >
          <option value="">כל השלבים</option>
          {PLAN_STAGES.map((id) => (
            <option key={id} value={id}>
              {stageLabel(id)}
            </option>
          ))}
          <option value="NONE">ללא שלב</option>
        </select>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <CategoryChip active={category === null} onClick={() => setCategory(null)} count={beforeCategory.length}>
          הכל
        </CategoryChip>
        {DOCUMENT_CATEGORIES.map((id) => (
          <CategoryChip
            key={id}
            active={category === id}
            onClick={() => setCategory(category === id ? null : id)}
            count={beforeCategory.filter((document) => documentCategory(document) === id).length}
          >
            {DOCUMENT_CATEGORY_LABELS[id]}
          </CategoryChip>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm font-black text-slate-700">אין מסמכים שמתאימים לחיפוש</p>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory(null);
                setStage(null);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:underline"
            >
              <X className="h-3.5 w-3.5" />
              ניקוי הסינון
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <section key={group.id}>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                <span className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${CATEGORY_TONES[group.id]}`}>
                  {DOCUMENT_CATEGORY_LABELS[group.id]}
                </span>
                <span className="text-2xs text-slate-400">{group.rows.length}</span>
              </h4>
              <ul className="space-y-2">
                {group.rows.map((document) => {
                  const docStage = documentStage(document);
                  const isEditing = editing === document.id;
                  return (
                    <li key={document.id} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">{document.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            {document.fileName} · {formatDate(document.uploadedAt)}
                          </p>
                          <p className="mt-0.5 text-2xs font-bold text-slate-500">
                            {docStage ? `הועלה בשלב ${stageLabel(docStage)}` : 'לא משויך לשלב'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!demo && (
                            <>
                              <button
                                type="button"
                                onClick={() => onView(document)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-700"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                צפייה
                              </button>
                              <a
                                href={documentDownloadUrl(planId, document.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
                              >
                                <Download className="h-3.5 w-3.5" />
                                הורדה
                              </a>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditing(isEditing ? null : document.id)}
                            title="שיוך לקטגוריה ולשלב"
                            aria-expanded={isEditing}
                            className={`rounded-lg p-1.5 transition-colors ${
                              isEditing ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                          >
                            <Tags className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busyKey === document.key}
                            onClick={() => onRemove(document)}
                            title="מחיקה"
                            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                          <span className="text-xs font-bold text-slate-600">קטגוריה</span>
                          <CategorySelect
                            value={documentCategory(document)}
                            onChange={(next) => onUpdateMeta(document.id, { category: next })}
                          />
                          <span className="text-xs font-bold text-slate-600">שלב</span>
                          <StageSelect value={docStage} onChange={(next) => onUpdateMeta(document.id, { stage: next })} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black transition-colors ${
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
      }`}
    >
      {children}
      <span className={`rounded-full px-1.5 text-2xs ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </button>
  );
}
