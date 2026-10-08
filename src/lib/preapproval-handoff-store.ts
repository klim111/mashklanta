import { prisma } from './db';
import { ensureClientLinkSafely } from './advisor-link';
import { emailAdvisorAboutRequest } from './advisor-notify';
import { isValidEmail, normalizeEmail } from './conversation';
import { readApplicationsStage, updateApplicationsStage } from './mortgage-plans';
import type { BankPreApproval, PreApprovalData } from './mortgage-plan';
import { parseDay, dayKey } from './rate-validity';
import { PRE_APPROVAL_BANKS } from '@/components/plan/stages/preapproval/banks';
import {
  HANDOFF_MEETING_TASK_TITLE,
  HANDOFF_MEETING_TITLE,
  emptyBankRow,
  handoffTaskDetails,
  handoffTaskTitle,
  withLeadingApproval,
} from './preapproval-handoff';

/**
 * הצד של השרת בהגשה לבנק דרך יועץ משכלנתא: הלקוח מעביר בנק ליועץ, היועץ קובע
 * מועד לפגישה ומזין את הבנקאי והאישור. ראו `preapproval-handoff.ts`.
 */

export function isPreApprovalBank(bank: unknown): bank is string {
  return typeof bank === 'string' && PRE_APPROVAL_BANKS.some((info) => info.bank === bank);
}

const LIVE_TASK = { in: ['OPEN', 'IN_PROGRESS'] as Array<'OPEN' | 'IN_PROGRESS'> };
const LIVE_MEETING = { in: ['PROPOSED', 'CONFIRMED'] as Array<'PROPOSED' | 'CONFIRMED'> };

export interface HandoffResult {
  data: PreApprovalData;
  /** נמצא יועץ שהמשימה נפתחה אצלו */
  advisorLinked: boolean;
}

/**
 * הלקוח בחר "הגשה באמצעות יועץ משכלנתא" לבנק אחד. הבנק נרשם כמועבר ליועץ,
 * אצל היועץ נפתחת משימה לבנק (בלי כפילות כל עוד אחת פתוחה), ומשימה אחת לקבוע
 * פגישה להשלמת פרטים — רק אם אין כבר משימה כזו פתוחה או פגישה שנקבעה. היועץ
 * מקבל מייל על הבקשה.
 */
export async function handBankToAdvisor(
  userId: string,
  planId: string,
  bank: string
): Promise<HandoffResult | null> {
  const plan = await prisma.mortgagePlan.findFirst({
    where: { id: planId, ownerId: userId },
    select: {
      name: true,
      propertyAddress: true,
      client: { select: { id: true, advisorId: true } },
      owner: { select: { name: true, email: true } },
    },
  });
  if (!plan) return null;

  const now = new Date().toISOString();
  const data = await updateApplicationsStage(planId, (current) => {
    const existing = current.bankApprovals.find((row) => row.bank === bank) ?? null;
    if (existing?.channel === 'ADVISOR') return current;
    const row: BankPreApproval = { ...(existing ?? emptyBankRow(bank)), channel: 'ADVISOR', handedAt: now };
    return {
      ...current,
      bankApprovals: existing
        ? current.bankApprovals.map((item) => (item.bank === bank ? row : item))
        : [...current.bankApprovals, row],
    };
  });

  const link = plan.client
    ? { clientId: plan.client.id, advisorId: plan.client.advisorId }
    : await ensureClientLinkSafely(userId);
  if (!link) return { data, advisorLinked: false };

  const place = plan.propertyAddress || plan.name;
  const title = handoffTaskTitle(bank);
  const [bankTask, meetingTask, meeting] = await Promise.all([
    prisma.advisorTask.findFirst({
      where: { clientId: link.clientId, title, status: LIVE_TASK },
      select: { id: true },
    }),
    prisma.advisorTask.findFirst({
      where: { clientId: link.clientId, title: HANDOFF_MEETING_TASK_TITLE, status: LIVE_TASK },
      select: { id: true },
    }),
    prisma.advisorMeeting.findFirst({
      where: { clientId: link.clientId, title: HANDOFF_MEETING_TITLE, status: LIVE_MEETING },
      select: { id: true },
    }),
  ]);

  if (!bankTask) {
    await prisma.advisorTask.create({
      data: {
        advisorId: link.advisorId,
        clientId: link.clientId,
        stage: 'APPLICATIONS',
        title,
        details: handoffTaskDetails(bank, place),
      },
    });
    await emailAdvisorAboutRequest({
      advisorId: link.advisorId,
      what: `בקשה להגשה ל${bank} דרך יועץ`,
      details: [
        ['שלב', 'אישור עקרוני'],
        ['בנק', bank],
        ['תהליך', place],
      ],
      from: { name: plan.owner.name, email: plan.owner.email },
      path: `/advisor-dashboard/client/${link.clientId}`,
    });
  }
  if (!meetingTask && !meeting) {
    await prisma.advisorTask.create({
      data: {
        advisorId: link.advisorId,
        clientId: link.clientId,
        stage: 'APPLICATIONS',
        title: HANDOFF_MEETING_TASK_TITLE,
        details: `הלקוח העביר אליכם הגשה לבנקים בתהליך "${place}". קבעו את המועד בשלב האישור העקרוני של הלקוח, והפגישה תופיע אצלו עם התאריך והשעה.`,
      },
    });
  }

  return { data, advisorLinked: true };
}

/** התהליך של לקוח שהיועץ הזה מלווה */
async function advisorPlan(advisorId: string, planId: string) {
  return prisma.mortgagePlan.findFirst({
    where: { id: planId, client: { advisorId } },
    select: { id: true, clientId: true },
  });
}

export interface HandoffMeetingView {
  id: string;
  startsAt: string;
  status: string;
}

export interface AdvisorHandoffView {
  banks: BankPreApproval[];
  meeting: HandoffMeetingView | null;
}

async function liveMeeting(clientId: string): Promise<HandoffMeetingView | null> {
  const row = await prisma.advisorMeeting.findFirst({
    where: { clientId, title: HANDOFF_MEETING_TITLE, status: LIVE_MEETING },
    orderBy: { startsAt: 'desc' },
    select: { id: true, startsAt: true, status: true },
  });
  return row ? { id: row.id, startsAt: row.startsAt.toISOString(), status: row.status } : null;
}

/** הבנקים שהלקוח העביר ליועץ, והפגישה להשלמת הפרטים — כפי שהיועץ רואה אותם */
export async function advisorHandoffView(
  advisorId: string,
  planId: string
): Promise<AdvisorHandoffView | null> {
  const plan = await advisorPlan(advisorId, planId);
  if (!plan?.clientId) return null;
  const data = await readApplicationsStage(planId);
  return {
    banks: data.bankApprovals.filter((row) => row.channel === 'ADVISOR'),
    meeting: await liveMeeting(plan.clientId),
  };
}

export interface HandoffBankPatch {
  bank: string;
  bankerName?: string;
  bankerEmail?: string;
  /** יום קבלת האישור העקרוני (YYYY-MM-DD), או null להסרת האישור */
  approvedAt?: string | null;
}

export type HandoffPatchError = 'not-found' | 'invalid-email' | 'invalid-date' | 'not-handed';

/** היועץ מזין את הבנקאי המטפל ואת יום קבלת האישור העקרוני בבנק שהועבר אליו */
export async function updateHandoffBank(
  advisorId: string,
  planId: string,
  patch: HandoffBankPatch
): Promise<AdvisorHandoffView | HandoffPatchError> {
  const plan = await advisorPlan(advisorId, planId);
  if (!plan?.clientId) return 'not-found';

  const bankerEmail = patch.bankerEmail === undefined ? undefined : normalizeEmail(patch.bankerEmail);
  if (bankerEmail && !isValidEmail(bankerEmail)) return 'invalid-email';

  let approvedDay: string | null | undefined = undefined;
  if (patch.approvedAt === null || patch.approvedAt === '') approvedDay = null;
  else if (patch.approvedAt !== undefined) {
    const day = parseDay(patch.approvedAt);
    if (!day) return 'invalid-date';
    approvedDay = dayKey(day);
  }

  let handed = true;
  const data = await updateApplicationsStage(planId, (current) => {
    const existing = current.bankApprovals.find((row) => row.bank === patch.bank) ?? null;
    if (existing?.channel !== 'ADVISOR') {
      handed = false;
      return current;
    }
    const row: BankPreApproval = {
      ...existing,
      ...(patch.bankerName !== undefined ? { bankerName: patch.bankerName.trim().slice(0, 120) } : {}),
      ...(bankerEmail !== undefined ? { bankerEmail } : {}),
      ...(approvedDay !== undefined
        ? {
            approved: approvedDay !== null,
            approvedAt: approvedDay,
            submittedAt: existing.submittedAt ?? (approvedDay ? new Date().toISOString() : null),
          }
        : {}),
    };
    const bankApprovals = current.bankApprovals.map((item) => (item.bank === patch.bank ? row : item));
    // אישור שהוסר — הבנק המוביל נגזר מחדש מהאישורים שנשארו
    const stillApproved = bankApprovals.find((item) => item.approved) ?? null;
    const next = { ...current, bankApprovals };
    if (approvedDay === null && current.bank === patch.bank) {
      return withLeadingApproval({
        ...next,
        bank: stillApproved?.bank ?? null,
        approved: Boolean(stillApproved),
      });
    }
    return withLeadingApproval(next);
  });
  if (!handed) return 'not-handed';

  return {
    banks: data.bankApprovals.filter((row) => row.channel === 'ADVISOR'),
    meeting: await liveMeeting(plan.clientId),
  };
}

/**
 * היועץ קובע מועד לפגישה להשלמת הפרטים. המועד שהוא קובע הוא הסופי: הפגישה
 * נרשמת כמאושרת ומופיעה אצל הלקוח עם התאריך והשעה, ומשימת קביעת המועד נסגרת.
 */
export async function setHandoffMeeting(
  advisorId: string,
  planId: string,
  startsAt: Date
): Promise<HandoffMeetingView | null> {
  const plan = await advisorPlan(advisorId, planId);
  if (!plan?.clientId) return null;
  const clientId = plan.clientId;

  const existing = await prisma.advisorMeeting.findFirst({
    where: { clientId, advisorId, title: HANDOFF_MEETING_TITLE, status: LIVE_MEETING },
    orderBy: { startsAt: 'desc' },
    select: { id: true },
  });
  const row = existing
    ? await prisma.advisorMeeting.update({
        where: { id: existing.id },
        data: { startsAt, status: 'CONFIRMED', respondedAt: new Date() },
        select: { id: true, startsAt: true, status: true },
      })
    : await prisma.advisorMeeting.create({
        data: {
          advisorId,
          clientId,
          stage: 'APPLICATIONS',
          title: HANDOFF_MEETING_TITLE,
          startsAt,
          durationMinutes: 45,
          status: 'CONFIRMED',
          respondedAt: new Date(),
        },
        select: { id: true, startsAt: true, status: true },
      });

  await prisma.advisorTask.updateMany({
    where: { clientId, advisorId, title: HANDOFF_MEETING_TASK_TITLE, status: LIVE_TASK },
    data: { status: 'DONE', completedAt: new Date() },
  });

  return { id: row.id, startsAt: row.startsAt.toISOString(), status: row.status };
}
