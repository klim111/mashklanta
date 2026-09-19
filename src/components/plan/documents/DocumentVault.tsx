'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  CircleDashed,
  Download,
  Eye,
  FileUp,
  FolderDown,
  Loader2,
  Lock,
  Trash2,
  Upload,
} from 'lucide-react';

import type { PlanDocumentView } from '@/lib/plan-documents';
import { DOCUMENTS_MODE_LABELS } from '@/lib/mortgage-plan';
import type { DocumentsMode, PlanData } from '@/lib/mortgage-plan';
import type { StageDocument } from '@/lib/client-process';
import { planDocumentRequirements, vaultCounts } from '@/lib/plan-document-catalog';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentViewerDialog } from './DocumentViewerDialog';
import { documentDownloadUrl, documentsArchiveUrl, usePlanDocuments } from './usePlanDocuments';

/**
 * תיק המסמכים של התהליך.
 *
 * לצד כל מסמך שהקטלוג דורש יש כפתור העלאה וסימון מצב, וכשהקובץ כבר עלה אפשר
 * לצפות בו או להחליף אותו. הקבצים נשמרים באחסון פרטי ונצפים דרך מסלול מאומת
 * בלבד, ולכן אין להם כתובת שניתן לשתף.
 *
 * אפשר גם לדלג: מי שמגיש לבנק בעצמו, ומי שמעדיף להעלות בשלב האישור העקרוני.
 * הבחירה נשמרת בתהליך, כדי שהיא תהיה ברורה גם ליועץ.
 */
export function DocumentVault({
  planId,
  data,
  mode,
  onModeChange,
  hideModes = false,
}: {
  planId: string;
  data: PlanData;
  mode: DocumentsMode | null;
  onModeChange: (mode: DocumentsMode) => void;
  /**
   * כפתורי בחירת הדרך מיותרים במקומות שבהם היא כבר נבחרה — תת-שלב המסמכים,
   * ותיק המסמכים באזור האישי.
   */
  hideModes?: boolean;
}) {
  const { documents, ready, error, busyKey, upload, remove } = usePlanDocuments(planId);
  const [viewing, setViewing] = useState<PlanDocumentView | null>(null);
  /** החלון הצף של ההעלאה, ועליו סוג המסמך שממנו נפתח */
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const requirements = planDocumentRequirements(data);

  const openUpload = (key: string | null) => {
    setUploadKey(key);
    setUploadOpen(true);
  };

  const byKey = new Map(documents.map((document) => [document.key, document]));
  const { uploaded, total } = vaultCounts(requirements, documents);
  const skipped = mode === 'SELF_SUBMIT' || mode === 'LATER';

  /*
    הרשימה היא אחת: מה שהקטלוג יודע לפי הפרופיל ובעלות הנכס, ולצדו מסמכים
    שהועלו ממקום אחר באזור האישי — למשל אישור עקרוני שנשמר בשלב ההגשה — כדי
    שכל מה שבתיק יופיע במקום אחד ובאותו מצב.
  */
  const groups: Array<{ id: string; title: string; documents: StageDocument[] }> = [];
  requirements.forEach((requirement) => {
    const group = groups.find((item) => item.id === requirement.group);
    const entry: StageDocument = {
      key: requirement.key,
      name: requirement.name,
      required: requirement.optional ? false : undefined,
    };
    if (group) group.documents.push(entry);
    else groups.push({ id: requirement.group, title: requirement.group, documents: [entry] });
  });

  const extras = documents.filter(
    (document) => !requirements.some((requirement) => requirement.key === document.key)
  );
  if (extras.length > 0) {
    groups.push({
      id: 'extras',
      title: 'מסמכים נוספים שהעליתם',
      documents: extras.map((document) => ({ key: document.key, name: document.name })),
    });
  }

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <header className="text-center">
        <h4 className="text-xl font-black text-slate-900">תיק המסמכים</h4>
        <p className="mx-auto mt-1.5 max-w-3xl text-[15px] font-medium leading-relaxed text-slate-600">
          הבנק אינו מסתמך על מה שהוצהר אלא מאמת אותו מול מסמכים. אלה המסמכים שיידרשו לפי הרכב
          הלווים ואופן ההעסקה שהוזנו — שלושה חודשים אחורה בכל מסמך שוטף — ואם הגדרתם את בעלות
          הנכס, גם מסמכי החתימה של אותו תרחיש.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[13px] font-black text-slate-600">
          <Lock className="h-3.5 w-3.5" />
          הקבצים נשמרים באחסון פרטי ומוצגים רק לכם וליועץ שמלווה אתכם
        </p>
      </header>

      {/* איך מטפלים בתיק — העלאה כאן, או דילוג מוצהר */}
      {!hideModes && (
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {(Object.keys(DOCUMENTS_MODE_LABELS) as DocumentsMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onModeChange(option)}
            className={`rounded-2xl border-2 px-4 py-3 text-center text-[15px] font-black transition-all ${
              mode === option
                ? 'border-blue-500 bg-blue-50 text-slate-900'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
            }`}
          >
            {DOCUMENTS_MODE_LABELS[option]}
          </button>
        ))}
      </div>
      )}

      {!hideModes && skipped && (
        <p className="mt-3 rounded-2xl border-2 border-amber-200 bg-amber-50/70 px-4 py-3 text-center text-[15px] font-bold leading-relaxed text-amber-900">
          {mode === 'SELF_SUBMIT'
            ? 'סימנתם הגשה עצמאית לבנק — הרשימה כאן היא מה שצריך להביא איתכם.'
            : 'סימנתם שתעלו את המסמכים בשלב האישור העקרוני — הרשימה תחכה לכם שם.'}{' '}
          אפשר בכל זאת להעלות מסמך עכשיו, וגם לשנות את הבחירה בכל רגע.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-[15px] font-bold text-rose-800">
          {error}
        </p>
      )}

      <p className="mt-4 text-center text-[15px] font-black text-slate-700">
        {uploaded} מתוך {total} מסמכים הועלו
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => openUpload(null)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-[15px] font-black text-white transition-colors hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          העלאת מסמך
        </button>
        {documents.length > 0 && (
          <a
            href={documentsArchiveUrl(planId)}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-[15px] font-black text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          >
            <FolderDown className="h-4 w-4" />
            הורדת תיק המסמכים
          </a>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-4">
            <h5 className="text-center text-base font-black text-slate-900">{group.title}</h5>
            <ul className="mt-3 space-y-2">
              {group.documents.map((doc) => (
                <DocumentRow
                  key={doc.key}
                  doc={doc}
                  uploaded={byKey.get(doc.key) ?? null}
                  busy={busyKey === doc.key || !ready}
                  onUpload={() => openUpload(doc.key)}
                  onRemove={(id) => void remove(id, doc.key)}
                  onView={setViewing}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        planId={planId}
        data={data}
        stage={null}
        defaultKey={uploadKey}
      />
      <DocumentViewerDialog planId={planId} document={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}

/** שורת מסמך אחת: מה נדרש, אם הוגש, ומה אפשר לעשות איתו */
function DocumentRow({
  doc,
  uploaded,
  busy,
  onUpload,
  onRemove,
  onView,
}: {
  doc: StageDocument;
  uploaded: PlanDocumentView | null;
  busy: boolean;
  onUpload: () => void;
  onRemove: (documentId: string) => void;
  onView: (document: PlanDocumentView) => void;
}) {

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        {uploaded ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black leading-snug text-slate-900">{doc.name}</p>
          <p className={`text-[13px] font-bold ${uploaded ? 'text-emerald-700' : 'text-slate-500'}`}>
            {uploaded ? `הוגש · ${uploaded.fileName}` : 'טרם הוגש'}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onUpload}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-[13px] font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : uploaded ? (
            <FileUp className="h-3.5 w-3.5" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploaded ? 'החלפת הקובץ' : 'העלאת מסמך'}
        </button>

        {uploaded && (
          <>
            <button
              type="button"
              onClick={() => onView(uploaded)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[13px] font-black text-white transition-colors hover:bg-slate-700"
            >
              <Eye className="h-3.5 w-3.5" />
              צפה במסמך
            </button>
            <a
              href={documentDownloadUrl(uploaded.planId, uploaded.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-[13px] font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50"
            >
              <Download className="h-3.5 w-3.5" />
              הורדה
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(uploaded.id)}
              aria-label="הסרת המסמך"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
