import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import type { ClientTaskKind, ClientTaskStatus, ClientTaskView } from './client-tasks';
import type { PlanStageId } from './mortgage-plan';

/**
 * שכבת הגישה למשימות המתוכננות של הלקוח.
 *
 * כל משימה שייכת למשתמש שיצר אותה, ורק הוא רואה ועורך אותה. משימה יכולה
 * להיות משויכת לתהליך ולשלב (כשנוספה מתוך שלב) או לעמוד בפני עצמה (כשנוספה
 * מלוח השנה).
 */

const taskSelect = {
  id: true,
  planId: true,
  stage: true,
  kind: true,
  templateKey: true,
  title: true,
  details: true,
  bank: true,
  dueAt: true,
  status: true,
  documentId: true,
  completedAt: true,
  createdAt: true,
} satisfies Prisma.ClientTaskSelect;

type TaskRow = Prisma.ClientTaskGetPayload<{ select: typeof taskSelect }>;

function toView(row: TaskRow): ClientTaskView {
  return {
    id: row.id,
    planId: row.planId,
    stage: (row.stage as PlanStageId | null) ?? null,
    kind: row.kind as ClientTaskKind,
    templateKey: row.templateKey,
    title: row.title,
    details: row.details,
    bank: row.bank,
    dueAt: row.dueAt?.toISOString() ?? null,
    status: row.status as ClientTaskStatus,
    documentId: row.documentId,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listClientTasks(
  ownerId: string,
  filter: { planId?: string; includeDone?: boolean } = {}
): Promise<ClientTaskView[]> {
  const rows = await prisma.clientTask.findMany({
    where: {
      ownerId,
      ...(filter.planId ? { planId: filter.planId } : {}),
      ...(filter.includeDone ? {} : { status: 'OPEN' }),
    },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    select: taskSelect,
  });
  return rows.map(toView);
}

export interface CreateClientTaskInput {
  planId: string | null;
  stage: PlanStageId | null;
  kind: ClientTaskKind;
  templateKey: string | null;
  title: string;
  details: string | null;
  bank: string | null;
  dueAt: Date | null;
}

export async function createClientTask(
  ownerId: string,
  input: CreateClientTaskInput
): Promise<ClientTaskView | null> {
  if (input.planId) {
    const plan = await prisma.mortgagePlan.findFirst({
      where: { id: input.planId, ownerId },
      select: { id: true },
    });
    if (!plan) return null;
  }

  const row = await prisma.clientTask.create({
    data: {
      ownerId,
      planId: input.planId,
      stage: input.stage,
      kind: input.kind,
      templateKey: input.templateKey,
      title: input.title,
      details: input.details,
      bank: input.bank,
      dueAt: input.dueAt,
    },
    select: taskSelect,
  });
  return toView(row);
}

export interface UpdateClientTaskInput {
  status?: ClientTaskStatus;
  title?: string;
  details?: string | null;
  dueAt?: Date | null;
  documentId?: string | null;
}

export async function updateClientTask(
  ownerId: string,
  taskId: string,
  input: UpdateClientTaskInput
): Promise<ClientTaskView | null> {
  const existing = await prisma.clientTask.findFirst({
    where: { id: taskId, ownerId },
    select: { id: true },
  });
  if (!existing) return null;

  const row = await prisma.clientTask.update({
    where: { id: taskId },
    data: {
      ...(input.status !== undefined
        ? { status: input.status, completedAt: input.status === 'DONE' ? new Date() : null }
        : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.details !== undefined ? { details: input.details } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
      ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
    },
    select: taskSelect,
  });
  return toView(row);
}

export async function deleteClientTask(ownerId: string, taskId: string): Promise<boolean> {
  const result = await prisma.clientTask.deleteMany({ where: { id: taskId, ownerId } });
  return result.count > 0;
}
