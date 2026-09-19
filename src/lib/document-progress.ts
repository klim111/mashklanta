/**
 * התקדמות איסוף המסמכים — לכל שלב ולכל התהליך.
 *
 * הקובץ טהור (בלי React ובלי Prisma) וגוזר את ההתקדמות משלושה מקורות שכבר
 * קיימים: קטלוג המסמכים של הפרופיל (שלב 1), האישורים העקרוניים מהבנקים
 * (שלב 3), רשימת מסמכי החתימה של התרחיש שנבחר (שלב 5), ומשימות המסמך שהלקוח
 * הוסיף לעצמו בכל שלב. מסמך שהועלה בכותרת חופשית נספר בשלב שממנו הועלה.
 */

import { PLAN_STAGES, preApprovalDocumentGroups } from './mortgage-plan';
import type { PlanData, PlanStageId } from './mortgage-plan';
import type { PlanDocumentView } from './plan-documents';
import type { ClientTaskView } from './client-tasks';
import { PRE_APPROVAL_BANKS, preApprovalDocumentKey } from '@/components/plan/stages/preapproval/banks';
import { signingDealType, signingDocumentKey, signingScenario } from './signing-documents';

/** כמה אישורים עקרוניים נחשבים "תיק מלא" למכרז — שלושה בנקים */
export const PRE_APPROVAL_TARGET = 3;

const CUSTOM_PREFIX = 'custom:';

/** המפתח של מסמך בכותרת חופשית: `custom:<שלב>:<כותרת>` */
export function customDocumentKey(stage: PlanStageId | null, title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${CUSTOM_PREFIX}${stage ?? 'GENERAL'}:${slug || 'document'}`;
}

export function isCustomDocument(document: Pick<PlanDocumentView, 'key'>): boolean {
  return document.key.startsWith(CUSTOM_PREFIX);
}

/** השלב שמסמך חופשי הועלה ממנו, או null למסמך כללי */
export function customDocumentStage(document: Pick<PlanDocumentView, 'key'>): PlanStageId | null {
  if (!isCustomDocument(document)) return null;
  const stage = document.key.slice(CUSTOM_PREFIX.length).split(':')[0];
  return (PLAN_STAGES as readonly string[]).includes(stage) ? (stage as PlanStageId) : null;
}

export interface StageDocumentProgress {
  stage: PlanStageId;
  done: number;
  total: number;
  /** 0–100; שלב בלי מסמכים נדרשים מקבל 100 */
  percent: number;
  /** האם יש בשלב הזה מסמכים לספור בכלל */
  relevant: boolean;
}

export interface DocumentProgress {
  stages: StageDocumentProgress[];
  overall: { done: number; total: number; percent: number };
}

function percentOf(done: number, total: number): number {
  if (total === 0) return 100;
  return Math.round(Math.min(1, done / total) * 100);
}

export function documentProgress(
  data: PlanData,
  documents: readonly PlanDocumentView[],
  tasks: readonly ClientTaskView[] = []
): DocumentProgress {
  const keys = new Set(documents.map((document) => document.key));

  const counts: Record<PlanStageId, { done: number; total: number }> = {
    ANALYSIS: { done: 0, total: 0 },
    MIX: { done: 0, total: 0 },
    APPLICATIONS: { done: 0, total: 0 },
    AUCTION: { done: 0, total: 0 },
    SIGNING: { done: 0, total: 0 },
  };

  // שלב 1 — מסמכי הפרופיל שהבנק ידרוש (חובה בלבד)
  preApprovalDocumentGroups(data).forEach((group) => {
    group.documents
      .filter((document) => document.required !== false)
      .forEach((document) => {
        counts.ANALYSIS.total += 1;
        if (keys.has(document.key)) counts.ANALYSIS.done += 1;
      });
  });

  // שלב 3 — אישורים עקרוניים מהבנקים, עד היעד לשלושה בנקים
  const approvals = PRE_APPROVAL_BANKS.filter((info) => keys.has(preApprovalDocumentKey(info.slug))).length;
  const approvedRows = data.APPLICATIONS.bankApprovals.filter((row) => row.approved).length;
  counts.APPLICATIONS.total += PRE_APPROVAL_TARGET;
  counts.APPLICATIONS.done += Math.min(PRE_APPROVAL_TARGET, Math.max(approvals, approvedRows));

  // שלב 5 — רשימת המסמכים של תרחיש הרכישה שנבחר
  const deal = signingDealType(data.SIGNING.dealTypeId);
  const scenario = signingScenario(deal, data.SIGNING.scenarioId);
  if (scenario) {
    scenario.documents.forEach((document) => {
      counts.SIGNING.total += 1;
      if (data.SIGNING.documents[signingDocumentKey(scenario.id, document.key)]) counts.SIGNING.done += 1;
    });
  }

  // מסמכים בכותרת חופשית ומשימות מסמך — נספרים בשלב שלהם
  documents.filter(isCustomDocument).forEach((document) => {
    const stage = customDocumentStage(document);
    if (!stage) return;
    counts[stage].total += 1;
    counts[stage].done += 1;
  });
  tasks
    .filter((task) => task.kind === 'DOCUMENT' && task.stage && task.status === 'OPEN')
    .forEach((task) => {
      counts[task.stage as PlanStageId].total += 1;
    });

  const stages = PLAN_STAGES.map((stage) => {
    const { done, total } = counts[stage];
    return { stage, done, total, percent: percentOf(done, total), relevant: total > 0 };
  });
  const done = stages.reduce((sum, row) => sum + row.done, 0);
  const total = stages.reduce((sum, row) => sum + row.total, 0);

  return { stages, overall: { done, total, percent: percentOf(done, total) } };
}
