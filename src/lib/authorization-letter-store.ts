import { prisma } from './db';
import {
  AUTHORIZATION_TASK_KEY,
  authorizationTaskSpec,
  isAuthorizationDocumentKey,
} from './authorization-letters';
import type { PlanDocumentView } from './plan-documents';

/**
 * כתבי ההסמכה מהצד של היועץ: שליחת המשימה ללקוח, והכתבים החתומים שהעלה.
 *
 * כל פעולה כאן מוודאת קודם שהיועץ באמת מלווה את הלקוח.
 */

export interface AuthorizationRequestView {
  taskId: string;
  status: 'OPEN' | 'DONE';
  sentAt: string;
  completedAt: string | null;
}

export interface AuthorizationLettersView {
  /** התהליך שאליו נשלחת המשימה ושבו נשמרים הכתבים. ריק — ללקוח אין תהליך */
  planId: string | null;
  /** הבקשה האחרונה שנשלחה ללקוח */
  request: AuthorizationRequestView | null;
  letters: PlanDocumentView[];
}

async function clientOf(advisorId: string, clientId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, advisorId },
    select: { id: true, userId: true, advisor: { select: { name: true } } },
  });
}

/** התהליך הפעיל של הלקוח, ואם אין — האחרון שנפתח */
async function planOf(client: { id: string; userId: string }): Promise<string | null> {
  const where = { clientId: client.id, ownerId: client.userId };
  const active = await prisma.mortgagePlan.findFirst({
    where: { ...where, status: 'IN_PROGRESS' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  if (active) return active.id;
  const latest = await prisma.mortgagePlan.findFirst({
    where,
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  return latest?.id ?? null;
}

function toRequest(row: {
  id: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
}): AuthorizationRequestView {
  return {
    taskId: row.id,
    status: row.status === 'DONE' ? 'DONE' : 'OPEN',
    sentAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function authorizationLettersFor(
  advisorId: string,
  clientId: string
): Promise<AuthorizationLettersView | null> {
  const client = await clientOf(advisorId, clientId);
  if (!client) return null;

  const [planId, task, documents] = await Promise.all([
    planOf(client),
    prisma.clientTask.findFirst({
      where: { ownerId: client.userId, templateKey: AUTHORIZATION_TASK_KEY },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, createdAt: true, completedAt: true },
    }),
    prisma.planDocument.findMany({
      where: { clientId: client.id, key: { startsWith: 'authorization-letter:' } },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        planId: true,
        key: true,
        name: true,
        fileName: true,
        contentType: true,
        size: true,
        uploadedAt: true,
      },
    }),
  ]);

  return {
    planId,
    request: task ? toRequest(task) : null,
    letters: documents
      .filter((document) => isAuthorizationDocumentKey(document.key))
      .map((document) => ({ ...document, uploadedAt: document.uploadedAt.toISOString() })),
  };
}

export type SendAuthorizationResult =
  | { ok: true; request: AuthorizationRequestView; alreadyOpen: boolean }
  | { ok: false; status: number; error: string };

/**
 * שליחת המשימה ללקוח. משימה שכבר פתוחה אצלו אינה נשלחת פעם שנייה — היא
 * מוחזרת כמו שהיא, כדי שלחיצה כפולה לא תמלא לו את רשימת המשימות.
 */
export async function sendAuthorizationRequest(
  advisorId: string,
  clientId: string,
  now = new Date()
): Promise<SendAuthorizationResult> {
  const client = await clientOf(advisorId, clientId);
  if (!client) return { ok: false, status: 404, error: 'הלקוח לא נמצא' };

  const planId = await planOf(client);
  if (!planId) {
    return {
      ok: false,
      status: 409,
      error: 'ללקוח עדיין אין תהליך משכנתא. הכתבים נשמרים בתיק של התהליך, ולכן אפשר לשלוח אחרי שיפתח אחד.',
    };
  }

  const open = await prisma.clientTask.findFirst({
    where: { ownerId: client.userId, templateKey: AUTHORIZATION_TASK_KEY, planId, status: 'OPEN' },
    select: { id: true, status: true, createdAt: true, completedAt: true },
  });
  if (open) return { ok: true, request: toRequest(open), alreadyOpen: true };

  const spec = authorizationTaskSpec(client.advisor.name, now);
  const row = await prisma.clientTask.create({
    data: {
      ownerId: client.userId,
      planId,
      stage: spec.stage,
      kind: spec.kind,
      templateKey: spec.templateKey,
      title: spec.title,
      details: spec.details,
      dueAt: spec.dueAt,
    },
    select: { id: true, status: true, createdAt: true, completedAt: true },
  });
  return { ok: true, request: toRequest(row), alreadyOpen: false };
}
