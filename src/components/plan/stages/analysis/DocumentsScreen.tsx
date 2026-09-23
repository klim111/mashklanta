'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Clock3,
  CloudUpload,
  FileText,
  Info,
  Landmark,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DOCUMENTS_MODE_LABELS, preApprovalDocumentGroups } from '@/lib/mortgage-plan';
import type { AnalysisData, DocumentsMode, PlanData } from '@/lib/mortgage-plan';
import type { StageDocument } from '@/lib/client-process';
import { profileRecommendations } from '@/lib/profile-report';
import { DocumentVault } from '@/components/plan/documents/DocumentVault';
import { Panel } from '../../ui';

/** ההסבר הצף ליד השמאות המוקדמת — למה לשלם עליה לפני החוזה */
export const EARLY_APPRAISAL_TOOLTIP =
  'שמאות מוקדמת יקרה יותר משמאות רגילה, אך היא ממזערת סיכון משמעותי: שמאות בנק נמוכה ממחיר הרכישה מקטינה את המשכנתא שתאושר, ואי-עמידה בתקציב יכולה לגרור קנסות על הפרת חוזה או צורך במימון חוץ-בנקאי בריביות יקרות מאוד.';

/**
 * מסמכי הנכס אינם נדרשים לאישור העקרוני עצמו — הבנק מאשר קודם את הלווים —
 * ולכן הם מסומנים כאופציונליים בשלב זה, עם ההסבר מתי הם כן נדרשים.
 */
const PROPERTY_DOCUMENT_NOTES: Record<string, string> = {
  sale_contract: 'אופציונלי בשלב זה. נדרש רק אחרי האישור העקרוני, לקראת ביצוע המשכנתא.',
  appraisal: 'אינו נדרש לקבלת האישור העקרוני, אך מומלץ לקבל דוח שמאות לפני החתימה על החוזה.',
};

const OPTIONS: Array<{ mode: DocumentsMode; icon: typeof CloudUpload; body: string; accent: string }> = [
  {
    mode: 'UPLOAD',
    icon: CloudUpload,
    body: 'שדה העלאה לכל מסמך. הקבצים נשמרים באחסון פרטי ומחכים לשלב האישור העקרוני.',
    accent: 'from-blue-600 to-cyan-500',
  },
  {
    mode: 'SELF_SUBMIT',
    icon: Landmark,
    body: 'תגישו את המסמכים ישירות לבנק. הרשימה תופיע גם בדוח הסופי להדפסה.',
    accent: 'from-emerald-600 to-teal-500',
  },
  {
    mode: 'LATER',
    icon: Clock3,
    body: 'ממשיכים לדוח עכשיו, ומעלים את התיק כשמגישים את הבקשה בשלב האישור העקרוני.',
    accent: 'from-violet-600 to-fuchsia-500',
  },
];

function DocumentBadge({ doc, appraisalRecommended }: { doc: StageDocument; appraisalRecommended: boolean }) {
  if (doc.key === 'appraisal') {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-black ${
                appraisalRecommended ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Info className="h-3 w-3" />
              {appraisalRecommended ? 'מומלץ: שמאות מוקדמת לפני החוזה' : 'אופציונלי בשלב זה'}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-slate-900 text-right text-2xs leading-relaxed text-white">
            {EARLY_APPRAISAL_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (doc.key in PROPERTY_DOCUMENT_NOTES || doc.required === false) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-500">
        אופציונלי בשלב זה
      </span>
    );
  }
  return (
    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-2xs font-black text-indigo-700">
      נדרש לאישור העקרוני
    </span>
  );
}

/**
 * תת-שלב המסמכים.
 *
 * קודם רשימת המסמכים לפי הלווים והעסקה — עם מה שאופציונלי בשלב הזה ומה חובה —
 * ומתחתיה שלוש דרכים להמשיך. רק מי שבוחר להעלות כאן מקבל את שדות ההעלאה
 * במקום הרשימה, וכפתור אחד שמוביל לדוח ומשאיר את ההעלאה פתוחה להמשך.
 */
export function DocumentsScreen({
  data,
  planId,
  patch,
}: {
  data: PlanData;
  planId: string;
  patch: (next: Partial<AnalysisData>) => void;
}) {
  const profile = data.ANALYSIS;
  const groups = preApprovalDocumentGroups(data);
  const uploadMode = profile.documentsMode === 'UPLOAD';
  const appraisalRecommended = profileRecommendations(profile).some((item) => item.id === 'early-appraisal');
  const total = groups.reduce((sum, group) => sum + group.documents.length, 0);

  const choose = (mode: DocumentsMode) => {
    if (mode === 'UPLOAD') patch({ documentsMode: mode });
    else patch({ documentsMode: mode, profileScreen: 'report' });
  };

  return (
    <Panel
      centered
      title={uploadMode ? 'העלאת המסמכים לתיק' : 'תיק המסמכים להגשה'}
      description={
        uploadMode
          ? 'לכל מסמך שדה משלו. אפשר להעלות חלק עכשיו ולהמשיך מאוחר יותר — מה שהועלה נשמר.'
          : 'הרשימה נבנית לפי הרכב הלווים, אופן ההעסקה של כל אחד, ניהול החשבון וסוג העסקה. ודאו שכל מסמך תקין ומלא לפני ההגשה.'
      }
      action={
        !uploadMode ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            {total} מסמכים
          </span>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {uploadMode ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            <DocumentVault
              planId={planId}
              data={data}
              mode={profile.documentsMode}
              onModeChange={(mode) => patch({ documentsMode: mode })}
              hideModes
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => patch({ documentsMode: null })}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronRight className="h-4 w-4" />
                חזרה לרשימה ולאפשרויות
              </button>
              <button
                type="button"
                onClick={() => patch({ profileScreen: 'report' })}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-button font-black text-white transition-colors hover:bg-slate-700"
              >
                נמשיך להעלות בשלב מאוחר יותר — לדוח הסופי
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {groups.map((group) => (
                <div key={group.id} className="rounded-3xl border-2 border-slate-200 bg-slate-50/60 p-4 text-right">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
                      <Building2 className="h-4 w-4 text-white" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{group.title}</h4>
                      <p className="text-2xs text-slate-500">
                        {group.id === 'property'
                          ? `אופציונלי בשלב זה — נדרש לפני הביצוע`
                          : group.subtitle ?? ''}
                      </p>
                    </div>
                  </div>
                  {group.documents.length === 0 ? (
                    <p className="text-xs text-slate-400">הרשימה תיבנה אחרי בחירת אופן ההעסקה במסך «מי לוקח».</p>
                  ) : (
                    <ul className="space-y-2">
                      {group.documents.map((doc) => {
                        const note = PROPERTY_DOCUMENT_NOTES[doc.key];
                        return (
                          <li key={doc.key} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3.5 py-3">
                            <span
                              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                note ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">
                                  {doc.key === 'appraisal' && appraisalRecommended ? 'דוח שמאות מוקדמת' : doc.name}
                                </span>
                                <DocumentBadge doc={doc} appraisalRecommended={appraisalRecommended} />
                              </div>
                              {note && <p className="mt-0.5 text-2xs leading-relaxed text-slate-500">{note}</p>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-3 text-center text-sm font-black text-slate-900">איך תרצו להמשיך עם המסמכים?</h4>
              <div className="grid gap-3 md:grid-cols-3">
                {OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = profile.documentsMode === option.mode;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => choose(option.mode)}
                      className={`group relative overflow-hidden rounded-3xl border-2 p-5 text-right transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                        selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${option.accent} shadow-lg`}>
                        <Icon className="h-5 w-5 text-white" />
                      </span>
                      <span className={`block text-base font-black ${selected ? 'text-white' : 'text-slate-900'}`}>
                        {DOCUMENTS_MODE_LABELS[option.mode]}
                      </span>
                      <span className={`mt-1 block text-xs leading-relaxed ${selected ? 'text-white/70' : 'text-slate-500'}`}>
                        {option.body}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
