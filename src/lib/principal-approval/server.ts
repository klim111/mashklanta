/**
 * Server-side services for the principal-approval intake: loading a case,
 * persisting a single field (the autosave endpoint), managing repeatable rows,
 * advisor permissions and profile conflicts.
 */

import { prisma } from '@/lib/db';
import {
  EntityType,
  REPEATABLE_ENTITIES,
  fieldsFor,
  getFieldDef,
  isFieldRequired,
} from './schema';
import { validateValue } from './validation';
import { PROFILE_MAPPINGS, profileKeyFor, valuesDiffer } from './profile';
import type {
  AdvisorAccessDTO,
  CaseDTO,
  ConflictDTO,
  EntityDTO,
  FieldMeta,
  FieldSource,
  ViewerContext,
} from './types';
import { canEditField } from './access';

export const CASE_ENTITY_ID = 'case';

export class AccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/* Value encoding                                                             */
/* -------------------------------------------------------------------------- */

export function encodeValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

export function decodeValue(raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/* -------------------------------------------------------------------------- */
/* Viewer resolution                                                          */
/* -------------------------------------------------------------------------- */

async function resolveViewer(caseId: string, userId: string): Promise<ViewerContext> {
  const [user, mortgageCase, access] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } }),
    prisma.mortgageCase.findUnique({ where: { id: caseId }, select: { clientId: true, advisorId: true } }),
    prisma.advisorAccess.findUnique({
      where: { caseId_advisorId: { caseId, advisorId: userId } },
      select: { canEdit: true, revokedAt: true },
    }),
  ]);

  if (!user) throw new AccessError('משתמש לא נמצא', 401);
  if (!mortgageCase) throw new AccessError('התיק לא נמצא', 404);

  if (mortgageCase.clientId === userId) {
    return { id: user.id, name: user.name, role: 'client', canEditClientFields: true };
  }

  const isAssignedAdvisor = mortgageCase.advisorId === userId;
  const hasAccessRow = Boolean(access && !access.revokedAt);
  if (!isAssignedAdvisor && !hasAccessRow) {
    throw new AccessError('אין לך הרשאה לצפות בתיק זה', 403);
  }

  return {
    id: user.id,
    name: user.name,
    role: 'advisor',
    canEditClientFields: Boolean(access && !access.revokedAt && access.canEdit),
  };
}

/* -------------------------------------------------------------------------- */
/* Case creation & pre-fill                                                   */
/* -------------------------------------------------------------------------- */

async function getProfileData(userId: string): Promise<Record<string, unknown>> {
  const profile = await prisma.clientProfile.findUnique({ where: { userId } });
  if (!profile) return {};
  const data = profile.dataJson as unknown;
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

/**
 * Seeds a new case: one borrower row, one income row for that borrower, one bank
 * account and one funding source, plus every value we can already take from the
 * client profile (marked `source: 'profile'`).
 */
async function seedCase(caseId: string, clientId: string): Promise<void> {
  const profile = await getProfileData(clientId);

  const borrower = await prisma.caseEntity.create({
    data: { caseId, type: 'borrower', position: 0 },
  });
  await prisma.caseEntity.create({
    data: { caseId, type: 'income', parentId: borrower.id, position: 0 },
  });
  await prisma.caseEntity.create({ data: { caseId, type: 'bankAccount', position: 0 } });
  await prisma.caseEntity.create({ data: { caseId, type: 'fundingSource', position: 0 } });

  const rows = PROFILE_MAPPINGS.filter((m) => profile[m.profileKey] !== undefined && profile[m.profileKey] !== null && profile[m.profileKey] !== '')
    .map((m) => ({
      caseId,
      entityType: m.entityType,
      entityId: m.entityType === 'case' ? CASE_ENTITY_ID : borrower.id,
      fieldKey: m.fieldKey,
      value: encodeValue(profile[m.profileKey]),
      source: 'profile' as FieldSource,
    }));

  if (rows.length > 0) {
    await prisma.caseField.createMany({ data: rows });
  }
}

/** Returns the client's open case, creating and seeding one when none exists. */
export async function ensureCaseForClient(clientId: string, advisorId?: string): Promise<string> {
  const existing = await prisma.mortgageCase.findFirst({
    where: { clientId, status: { in: ['draft', 'submitted'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, advisorId: true },
  });

  if (existing) {
    if (advisorId && !existing.advisorId) {
      await prisma.mortgageCase.update({ where: { id: existing.id }, data: { advisorId } });
    }
    return existing.id;
  }

  const created = await prisma.mortgageCase.create({ data: { clientId, advisorId: advisorId ?? null } });
  await seedCase(created.id, clientId);
  return created.id;
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_ENTITIES = (): Record<EntityType, EntityDTO[]> => ({
  case: [],
  borrower: [],
  guarantor: [],
  income: [],
  prevEmployment: [],
  bankAccount: [],
  fundingSource: [],
});

export function entityLabel(type: EntityType, position: number): string {
  switch (type) {
    case 'borrower':
      return `לווה ${position + 1}`;
    case 'guarantor':
      return `ערב ${position + 1}`;
    case 'income':
      return `הכנסה ${position + 1}`;
    case 'prevEmployment':
      return `מקום עבודה קודם ${position + 1}`;
    case 'bankAccount':
      return `חשבון ${position + 1}`;
    case 'fundingSource':
      return `מקור מימון ${position + 1}`;
    default:
      return 'פרטי התיק';
  }
}

export async function loadCase(caseId: string, userId: string): Promise<CaseDTO> {
  const viewer = await resolveViewer(caseId, userId);

  const mortgageCase = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    include: {
      client: { select: { id: true, name: true, email: true } },
      advisor: { select: { id: true, name: true, email: true } },
      entities: { orderBy: [{ type: 'asc' }, { position: 'asc' }] },
      fields: true,
      conflicts: { orderBy: { createdAt: 'desc' } },
      accesses: { include: { advisor: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!mortgageCase) throw new AccessError('התיק לא נמצא', 404);

  const updaterIds = Array.from(
    new Set(mortgageCase.fields.map((f) => f.updatedById).filter((v): v is string => Boolean(v))),
  );
  const updaters = updaterIds.length
    ? await prisma.user.findMany({ where: { id: { in: updaterIds } }, select: { id: true, name: true } })
    : [];
  const updaterName = new Map(updaters.map((u) => [u.id, u.name]));

  const entities = EMPTY_ENTITIES();
  const byEntityId = new Map<string, EntityDTO>();

  for (const row of mortgageCase.entities) {
    const dto: EntityDTO = {
      id: row.id,
      type: row.type as EntityType,
      parentId: row.parentId,
      position: row.position,
      values: {},
      meta: {},
    };
    byEntityId.set(row.id, dto);
    (entities[row.type as EntityType] ||= []).push(dto);
  }

  const caseValues: Record<string, unknown> = {};
  const caseMeta: Record<string, FieldMeta> = {};

  for (const field of mortgageCase.fields) {
    const meta: FieldMeta = {
      source: field.source as FieldSource,
      updatedAt: field.updatedAt.toISOString(),
      updatedById: field.updatedById,
      updatedByName: field.updatedById ? updaterName.get(field.updatedById) ?? null : null,
    };
    if (field.entityId === CASE_ENTITY_ID) {
      caseValues[field.fieldKey] = decodeValue(field.value);
      caseMeta[field.fieldKey] = meta;
      continue;
    }
    const entity = byEntityId.get(field.entityId);
    if (!entity) continue;
    entity.values[field.fieldKey] = decodeValue(field.value);
    entity.meta[field.fieldKey] = meta;
  }

  for (const list of Object.values(entities)) {
    list.sort((a, b) => a.position - b.position);
  }

  const conflicts: ConflictDTO[] = mortgageCase.conflicts.map((c) => {
    const entity = byEntityId.get(c.entityId);
    return {
      id: c.id,
      entityType: c.entityType as EntityType,
      entityId: c.entityId,
      fieldKey: c.fieldKey,
      fieldLabel: getFieldDef(c.entityType as EntityType, c.fieldKey)?.label ?? c.fieldKey,
      entityLabel: entity
        ? entityLabel(entity.type, entity.position)
        : entityLabel(c.entityType as EntityType, 0),
      profileValue: decodeValue(c.profileValue),
      caseValue: decodeValue(c.caseValue),
      status: c.status as 'open' | 'resolved',
      resolvedWith: (c.resolvedWith as 'profile' | 'case' | null) ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  });

  const advisors: AdvisorAccessDTO[] = mortgageCase.accesses
    .filter((a) => !a.revokedAt)
    .map((a) => ({
      advisorId: a.advisorId,
      advisorName: a.advisor.name,
      advisorEmail: a.advisor.email,
      canEdit: a.canEdit,
      grantedAt: a.grantedAt.toISOString(),
      isAssigned: a.advisorId === mortgageCase.advisorId,
    }));

  if (mortgageCase.advisor && !advisors.some((a) => a.advisorId === mortgageCase.advisor!.id)) {
    advisors.unshift({
      advisorId: mortgageCase.advisor.id,
      advisorName: mortgageCase.advisor.name,
      advisorEmail: mortgageCase.advisor.email,
      canEdit: false,
      grantedAt: null,
      isAssigned: true,
    });
  }

  return {
    id: mortgageCase.id,
    title: mortgageCase.title,
    status: mortgageCase.status,
    createdAt: mortgageCase.createdAt.toISOString(),
    updatedAt: mortgageCase.updatedAt.toISOString(),
    client: mortgageCase.client,
    advisor: mortgageCase.advisor,
    viewer,
    caseValues,
    caseMeta,
    entities,
    conflicts,
    advisors,
    profile: await getProfileData(mortgageCase.clientId),
  };
}

/* -------------------------------------------------------------------------- */
/* Saving a single field                                                      */
/* -------------------------------------------------------------------------- */

async function isPrimaryBorrower(caseId: string, entityId: string): Promise<boolean> {
  const entity = await prisma.caseEntity.findUnique({ where: { id: entityId } });
  return Boolean(entity && entity.caseId === caseId && entity.type === 'borrower' && entity.position === 0);
}

export async function saveField(
  caseId: string,
  userId: string,
  input: { entityType: EntityType; entityId: string; fieldKey: string; value: unknown },
): Promise<{ meta: FieldMeta; conflict: ConflictDTO | null }> {
  const viewer = await resolveViewer(caseId, userId);
  const def = getFieldDef(input.entityType, input.fieldKey);
  if (!def) throw new AccessError(`שדה לא מוכר: ${input.fieldKey}`, 400);

  // Server-side re-validation — never trust the browser.
  const result = validateValue(def, input.value);
  if (!result.valid) throw new AccessError(result.error ?? 'ערך לא תקין', 400);

  if (input.entityId !== CASE_ENTITY_ID) {
    const entity = await prisma.caseEntity.findUnique({ where: { id: input.entityId } });
    if (!entity || entity.caseId !== caseId) throw new AccessError('רשומה לא נמצאה', 404);
    if (entity.type !== input.entityType) throw new AccessError('סוג רשומה לא תואם', 400);
  }

  const existing = await prisma.caseField.findUnique({
    where: {
      caseId_entityType_entityId_fieldKey: {
        caseId,
        entityType: input.entityType,
        entityId: input.entityId,
        fieldKey: input.fieldKey,
      },
    },
  });

  const existingMeta: FieldMeta | undefined = existing
    ? {
        source: existing.source as FieldSource,
        updatedAt: existing.updatedAt.toISOString(),
        updatedById: existing.updatedById,
      }
    : undefined;

  if (!canEditField(viewer, existingMeta)) {
    throw new AccessError('השדה הוזן על ידי הלקוח וניתן לעריכה רק לאחר קבלת הרשאה', 403);
  }

  const source: FieldSource = viewer.role === 'advisor' ? 'advisor' : 'client';
  const encoded = encodeValue(input.value);

  const saved = await prisma.caseField.upsert({
    where: {
      caseId_entityType_entityId_fieldKey: {
        caseId,
        entityType: input.entityType,
        entityId: input.entityId,
        fieldKey: input.fieldKey,
      },
    },
    create: {
      caseId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldKey: input.fieldKey,
      value: encoded,
      source,
      updatedById: userId,
    },
    update: { value: encoded, source, updatedById: userId },
  });

  await prisma.mortgageCase.update({ where: { id: caseId }, data: { updatedAt: new Date() } });

  const conflict = await syncWithProfile(caseId, input, viewer);

  return {
    meta: {
      source: saved.source as FieldSource,
      updatedAt: saved.updatedAt.toISOString(),
      updatedById: saved.updatedById,
      updatedByName: viewer.name,
    },
    conflict,
  };
}

/**
 * Compares the freshly saved value against the client profile and opens (or
 * closes) a conflict accordingly.
 */
async function syncWithProfile(
  caseId: string,
  input: { entityType: EntityType; entityId: string; fieldKey: string; value: unknown },
  viewer: ViewerContext,
): Promise<ConflictDTO | null> {
  const primary =
    input.entityType === 'case' ? true : await isPrimaryBorrower(caseId, input.entityId);
  const profileKey = profileKeyFor(input.entityType, input.fieldKey, primary);
  if (!profileKey) return null;

  const mortgageCase = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    select: { clientId: true },
  });
  if (!mortgageCase) return null;

  const profile = await getProfileData(mortgageCase.clientId);
  const profileValue = profile[profileKey];

  const conflictWhere = {
    caseId_entityType_entityId_fieldKey: {
      caseId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldKey: input.fieldKey,
    },
  };

  // Nothing in the profile yet: adopt the new value silently.
  if (profileValue === undefined || profileValue === null || profileValue === '') {
    await writeProfileValue(mortgageCase.clientId, profileKey, input.value);
    await prisma.fieldConflict.deleteMany({
      where: { caseId, entityType: input.entityType, entityId: input.entityId, fieldKey: input.fieldKey, status: 'open' },
    });
    return null;
  }

  if (!valuesDiffer(profileValue, input.value)) {
    await prisma.fieldConflict.deleteMany({
      where: { caseId, entityType: input.entityType, entityId: input.entityId, fieldKey: input.fieldKey, status: 'open' },
    });
    return null;
  }

  const conflict = await prisma.fieldConflict.upsert({
    where: conflictWhere,
    create: {
      caseId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldKey: input.fieldKey,
      profileValue: encodeValue(profileValue),
      caseValue: encodeValue(input.value),
      status: 'open',
    },
    update: {
      profileValue: encodeValue(profileValue),
      caseValue: encodeValue(input.value),
      status: 'open',
      resolvedValue: null,
      resolvedWith: null,
      resolvedAt: null,
      resolvedById: null,
    },
  });

  const entity =
    input.entityId === CASE_ENTITY_ID
      ? null
      : await prisma.caseEntity.findUnique({ where: { id: input.entityId } });

  return {
    id: conflict.id,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldKey: input.fieldKey,
    fieldLabel: getFieldDef(input.entityType, input.fieldKey)?.label ?? input.fieldKey,
    entityLabel: entity ? entityLabel(entity.type as EntityType, entity.position) : 'פרטי התיק',
    profileValue,
    caseValue: input.value,
    status: 'open',
    resolvedWith: null,
    createdAt: conflict.createdAt.toISOString(),
  };
}

async function writeProfileValue(clientId: string, profileKey: string, value: unknown): Promise<void> {
  const current = await getProfileData(clientId);
  const next = { ...current, [profileKey]: value ?? null };
  await prisma.clientProfile.upsert({
    where: { userId: clientId },
    create: { userId: clientId, dataJson: next as any },
    update: { dataJson: next as any },
  });
}

/* -------------------------------------------------------------------------- */
/* Conflict resolution                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Applies the user's choice: the winning value is written to the case *and* back
 * to the client profile, so every screen that reads the profile picks it up.
 */
export async function resolveConflict(
  caseId: string,
  userId: string,
  conflictId: string,
  choice: 'profile' | 'case',
): Promise<{ fieldKey: string; entityType: EntityType; entityId: string; value: unknown }> {
  const viewer = await resolveViewer(caseId, userId);
  const conflict = await prisma.fieldConflict.findUnique({ where: { id: conflictId } });
  if (!conflict || conflict.caseId !== caseId) throw new AccessError('הסתירה לא נמצאה', 404);

  const winning = choice === 'profile' ? decodeValue(conflict.profileValue) : decodeValue(conflict.caseValue);
  const entityType = conflict.entityType as EntityType;

  await prisma.caseField.upsert({
    where: {
      caseId_entityType_entityId_fieldKey: {
        caseId,
        entityType,
        entityId: conflict.entityId,
        fieldKey: conflict.fieldKey,
      },
    },
    create: {
      caseId,
      entityType,
      entityId: conflict.entityId,
      fieldKey: conflict.fieldKey,
      value: encodeValue(winning),
      source: viewer.role === 'advisor' ? 'advisor' : 'client',
      updatedById: userId,
    },
    update: {
      value: encodeValue(winning),
      source: viewer.role === 'advisor' ? 'advisor' : 'client',
      updatedById: userId,
    },
  });

  const mortgageCase = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    select: { clientId: true },
  });
  const primary =
    entityType === 'case' ? true : await isPrimaryBorrower(caseId, conflict.entityId);
  const profileKey = profileKeyFor(entityType, conflict.fieldKey, primary);
  if (profileKey && mortgageCase) {
    await writeProfileValue(mortgageCase.clientId, profileKey, winning);
  }

  await prisma.fieldConflict.update({
    where: { id: conflictId },
    data: {
      status: 'resolved',
      resolvedValue: encodeValue(winning),
      resolvedWith: choice,
      resolvedById: userId,
      resolvedAt: new Date(),
    },
  });

  return { fieldKey: conflict.fieldKey, entityType, entityId: conflict.entityId, value: winning };
}

/* -------------------------------------------------------------------------- */
/* Repeatable rows                                                            */
/* -------------------------------------------------------------------------- */

export async function addEntity(
  caseId: string,
  userId: string,
  type: EntityType,
  parentId?: string | null,
): Promise<EntityDTO> {
  await resolveViewer(caseId, userId);
  if (!REPEATABLE_ENTITIES.includes(type)) throw new AccessError('לא ניתן להוסיף רשומה מסוג זה', 400);

  const siblings = await prisma.caseEntity.count({
    where: { caseId, type, parentId: parentId ?? null },
  });
  const created = await prisma.caseEntity.create({
    data: { caseId, type, parentId: parentId ?? null, position: siblings },
  });

  // A new borrower or guarantor starts with one income row.
  if (type === 'borrower' || type === 'guarantor') {
    await prisma.caseEntity.create({
      data: { caseId, type: 'income', parentId: created.id, position: 0 },
    });
  }

  return {
    id: created.id,
    type,
    parentId: created.parentId,
    position: created.position,
    values: {},
    meta: {},
  };
}

export async function removeEntity(caseId: string, userId: string, entityId: string): Promise<void> {
  const viewer = await resolveViewer(caseId, userId);
  const entity = await prisma.caseEntity.findUnique({ where: { id: entityId } });
  if (!entity || entity.caseId !== caseId) throw new AccessError('רשומה לא נמצאה', 404);

  if (entity.type === 'borrower' && entity.position === 0) {
    throw new AccessError('לא ניתן להסיר את הלווה הראשי', 400);
  }

  // An advisor may not delete a row the client filled in unless permitted.
  if (viewer.role === 'advisor' && !viewer.canEditClientFields) {
    const clientEntered = await prisma.caseField.count({
      where: { caseId, entityId, source: 'client' },
    });
    if (clientEntered > 0) {
      throw new AccessError('הרשומה הוזנה על ידי הלקוח וניתנת להסרה רק לאחר קבלת הרשאה', 403);
    }
  }

  const children = await prisma.caseEntity.findMany({ where: { caseId, parentId: entityId } });
  const ids = [entityId, ...children.map((c) => c.id)];

  await prisma.caseField.deleteMany({ where: { caseId, entityId: { in: ids } } });
  await prisma.fieldConflict.deleteMany({ where: { caseId, entityId: { in: ids } } });
  await prisma.caseEntity.deleteMany({ where: { id: { in: ids } } });

  // Close the gap in positions so labels stay sequential.
  const remaining = await prisma.caseEntity.findMany({
    where: { caseId, type: entity.type, parentId: entity.parentId },
    orderBy: { position: 'asc' },
  });
  await Promise.all(
    remaining.map((row, index) =>
      row.position === index
        ? Promise.resolve(null)
        : prisma.caseEntity.update({ where: { id: row.id }, data: { position: index } }),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* Advisor permissions                                                        */
/* -------------------------------------------------------------------------- */

export async function setAdvisorPermission(
  caseId: string,
  userId: string,
  advisorId: string,
  canEdit: boolean,
): Promise<AdvisorAccessDTO> {
  const mortgageCase = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    select: { clientId: true, advisorId: true },
  });
  if (!mortgageCase) throw new AccessError('התיק לא נמצא', 404);
  // Only the client owns the decision to let an advisor edit their data.
  if (mortgageCase.clientId !== userId) {
    throw new AccessError('רק הלקוח יכול לשנות הרשאות עריכה', 403);
  }

  const advisor = await prisma.user.findUnique({
    where: { id: advisorId },
    select: { id: true, name: true, email: true },
  });
  if (!advisor) throw new AccessError('היועץ לא נמצא', 404);

  const access = await prisma.advisorAccess.upsert({
    where: { caseId_advisorId: { caseId, advisorId } },
    create: { caseId, advisorId, canEdit },
    update: { canEdit, revokedAt: null },
  });

  return {
    advisorId,
    advisorName: advisor.name,
    advisorEmail: advisor.email,
    canEdit: access.canEdit,
    grantedAt: access.grantedAt.toISOString(),
    isAssigned: mortgageCase.advisorId === advisorId,
  };
}

/* -------------------------------------------------------------------------- */
/* Completeness summary (used by the header meter and the report)             */
/* -------------------------------------------------------------------------- */

export function caseCompleteness(dto: CaseDTO): { filled: number; total: number; ratio: number } {
  let filled = 0;
  let total = 0;

  const tally = (type: EntityType, values: Record<string, unknown>) => {
    for (const field of fieldsFor(type)) {
      if (!isFieldRequired(field, values)) continue;
      total += 1;
      const value = values[field.key];
      const empty =
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);
      if (!empty) filled += 1;
    }
  };

  tally('case', dto.caseValues);
  for (const type of REPEATABLE_ENTITIES) {
    for (const entity of dto.entities[type] ?? []) tally(type, entity.values);
  }

  return { filled, total, ratio: total === 0 ? 0 : filled / total };
}
