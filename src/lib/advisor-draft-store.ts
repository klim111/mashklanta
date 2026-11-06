import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { applyDraft, isNavigationPath, parseDraft, pendingPaths } from './advisor-draft';
import type { PlanDrafts, StageDraft } from './advisor-draft';
import { parseStageData } from './mortgage-plan';
import type { AnalysisData, PlanStageId } from './mortgage-plan';
import { getPlanForUser, saveStage } from './mortgage-plans';
import type { PlanView } from './mortgage-plans';
import { mergeProfiles, parseClientProfile, pickProfileFromAnalysis } from './client-profile';
import { clientUpdateData } from './clients';
import { decryptFinancials } from './client-financials';

/**
 * טיוטות היועץ בשלבי התהליך של לקוח (src/lib/advisor-draft.ts): שמירה, ביטול
 * ושידור. רק היועץ המלווה את הלקוח רואה אותן ומשנה אותן.
 */

/** התהליך, כשהמשתמש הוא היועץ המלווה של בעליו */
export async function advisedPlan(userId: string, planId: string) {
  return prisma.mortgagePlan.findFirst({
    where: { id: planId, client: { advisorId: userId } },
    select: { id: true, ownerId: true, clientId: true },
  });
}

export async function loadDrafts(planId: string): Promise<PlanDrafts> {
  const rows = await prisma.mortgagePlanStage.findMany({
    where: { planId },
    select: { stage: true, advisorDraftJson: true },
  });
  const drafts: PlanDrafts = {};
  rows.forEach((row) => {
    const draft = parseDraft(row.advisorDraftJson);
    if (draft) drafts[row.stage as PlanStageId] = draft;
  });
  return drafts;
}

export async function saveDraft(planId: string, stage: PlanStageId, draft: StageDraft | null): Promise<void> {
  const json = draft && pendingPaths(draft).length > 0 ? (draft as unknown as Prisma.InputJsonValue) : null;
  await prisma.mortgagePlanStage.upsert({
    where: { planId_stage: { planId, stage } },
    create: { planId, stage, advisorDraftJson: json ?? Prisma.DbNull },
    update: { advisorDraftJson: json ?? Prisma.DbNull },
  });
}

/** השדות בפרופיל הפיננסי שהשידור מעדכן גם בכרטיס הלקוח אצל היועץ */
const CARD_FIELDS: Record<string, string> = {
  household: 'household',
  age: 'age',
  partnerAge: 'partnerAge',
  income: 'income',
  partnerIncome: 'partnerIncome',
  expenses: 'expenses',
  existingLoans: 'existingLoans',
  equity: 'downPayment',
  propertyValue: 'propertyValue',
  mortgageAmount: 'mortgageAmount',
  propertyAddress: 'propertyAddress',
  dealType: 'dealType',
};

/**
 * "שדר": כל שדה בטיוטה נדרס אצל הלקוח בערך של היועץ, וכל השאר נשאר כפי
 * שהלקוח השאיר אותו. בפרופיל הפיננסי הערכים נשמרים גם בפרופיל של הלקוח, כדי
 * שיופיעו בכל מקום שהוא רואה אותם.
 */
export async function broadcastDraft(
  advisorId: string,
  planId: string,
  stage: PlanStageId
): Promise<PlanView | null> {
  const plan = await advisedPlan(advisorId, planId);
  if (!plan) return null;

  const row = await prisma.mortgagePlanStage.findUnique({
    where: { planId_stage: { planId, stage } },
    select: { dataJson: true, advisorDraftJson: true },
  });
  const draft = parseDraft(row?.advisorDraftJson);
  if (!draft) return getPlanForUser(advisorId, planId);

  const values = Object.fromEntries(
    Object.entries(draft.values).filter(([path]) => !isNavigationPath(stage, path))
  );
  const clientData = parseStageData(stage, row?.dataJson);
  const next = applyDraft(clientData, { ...draft, values });

  const result = await saveStage({ userId: advisorId, planId, stage, data: next });
  if (!result.ok) return null;
  await saveDraft(planId, stage, null);

  if (stage === 'ANALYSIS') {
    const analysis = parseStageData('ANALYSIS', next) as AnalysisData;
    const owner = await prisma.user.findUnique({ where: { id: plan.ownerId }, select: { profileJson: true } });
    const profile = mergeProfiles(parseClientProfile(owner?.profileJson), pickProfileFromAnalysis(analysis));
    await prisma.user.update({
      where: { id: plan.ownerId },
      data: { profileJson: profile as unknown as Prisma.InputJsonValue },
    });

    if (plan.clientId) {
      const touched = Object.keys(values).map((path) => path.split('.')[0]);
      const input: Record<string, unknown> = {};
      touched.forEach((key) => {
        const field = CARD_FIELDS[key];
        if (field) input[field] = (analysis as unknown as Record<string, unknown>)[key];
      });
      if (touched.includes('partnerFirstName') || touched.includes('partnerLastName')) {
        input.partnerName = [analysis.partnerFirstName, analysis.partnerLastName].filter(Boolean).join(' ');
      }
      const card = await prisma.client.findUnique({ where: { id: plan.clientId } });
      if (card && Object.keys(input).length > 0) {
        const data = clientUpdateData(input, decryptFinancials(card));
        if (Object.keys(data).length > 0) await prisma.client.update({ where: { id: card.id }, data });
      }
    }
  }

  return getPlanForUser(advisorId, planId);
}

