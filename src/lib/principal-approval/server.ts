/**
 * Server-side services for the principal-approval intake: loading a case,
 * persisting a single field (the autosave endpoint), managing repeatable rows,
 * advisor permissions and profile conflicts.
 *
 * Two conventions of this codebase are honoured here rather than re-invented:
 *   • the advisor↔client link is the `Client` model, not a table of our own;
 *   • the client profile is `User.profileJson`, read through `client-profile.ts`;
 *   • sensitive values are encrypted at rest via `src/lib/crypto.ts`, exactly as
 *     the financial columns on `Client` are.
 */

import { prisma } from '@/lib/db';
import { decryptField, encryptField } from '@/lib/crypto';
import { parseClientProfile, profileToJson } from '@/lib/client-profile';
import type { ClientProfileFinancials } from '@/lib/client-profile';
import {
  EntityType,
  REPEATABLE_ENTITIES,
  fieldsFor,
  getFieldDef,
  isFieldRequired,
  isSensitiveField,
} from './schema';
import { validateValue } from './validation';
import {
  PROFILE_MAPPINGS,
  profileKeyFor,
  splitFullName,
  toCaseValue,
  toProfileValue,
  valuesDiffer,
} from './profile';
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
/* Value encoding — plaintext or encrypted, decided by the field definition    */
/* -------------------------------------------------------------------------- */

/**
 * The encryption context is bound to the exact row, so a ciphertext cannot be
 * moved between fields or between cases and still decrypt.
 */
function fieldContext(caseId: string, entityType: string, entityId: string, fieldKey: string): string {
  return `CaseField:${caseId}:${entityType}:${entityId}:${fieldKey}`;
}

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

/** Splits a value into the plaintext / encrypted columns of `CaseField`. */
function encodeForStorage(
  caseId: string,
  entityType: EntityType,
  entityId: string,
  fieldKey: string,
  value: unknown,
): { value: string | null; valueEnc: string | null } {
  const encoded = encodeValue(value);
  if (encoded === null) return { value: null, valueEnc: null };
  if (!isSensitiveField(entityType, fieldKey)) return { value: encoded, valueEnc: null };
  return {
    value: null,
    valueEnc: encryptField(encoded, fieldContext(caseId, entityType, entityId, fieldKey)),
  };
}

/**
 * Reads a stored field back.
 *
 * A decryption failure is surfaced as null rather than thrown: one unreadable
 * field must not take down the whole case view, and the caller can see the
 * field as empty and re-enter it.
 */
function decodeFromStorage(
  caseId: string,
  row: { entityType: string; entityId: string; fieldKey: string; value: string | null; valueEnc: string | null },
): unknown {
  if (row.valueEnc) {
    try {
      return decodeValue(
        decryptField(row.valueEnc, fieldContext(caseId, row.entityType, row.entityId, row.fieldKey)),
      );
    } catch {
      return null;
    }
  }
  return decodeValue(row.value);
}

/* -------------------------------------------------------------------------- */
/* Viewer resolution                                                          */
/* -------------------------------------------------------------------------- */

/**
 * An advisor may open a case when the platform's own advisor↔client link
 * (`Client`) exists between them, or when they are the case's assigned advisor.
 */
async function resolveViewer(caseId: string, userId: string): Promise<ViewerContext> {
  const [user, mortgageCase] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } }),
    prisma.mortgageCase.findUnique({ where: { id: caseId }, select: { clientId: true, advisorId: true } }),
  ]);

  if (!user) throw new AccessError('משתמש לא נמצא', 401);
  if (!mortgageCase) throw new AccessError('התיק לא נמצא', 404);

  if (mortgageCase.clientId === userId) {
    return { id: user.id, name: user.name, role: 'client', canEditClientFields: true };
  }

  const [link, access] = await Promise.all([
    prisma.client.findFirst({
      where: { advisorId: userId, userId: mortgageCase.clientId },
      select: { id: true },
    }),
    prisma.approvalAccess.findUnique({
      where: { caseId_advisorId: { caseId, advisorId: userId } },
      select: { canEdit: true, revokedAt: true },
    }),
  ]);

  if (!link && mortgageCase.advisorId !== userId) {
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
/* Profile access — User.profileJson, via client-profile.ts                    */
/* -------------------------------------------------------------------------- */

async function getProfile(userId: string): Promise<ClientProfileFinancials> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { profileJson: true } });
  return parseClientProfile(user?.profileJson ?? null);
}

async function writeProfileValue(
  clientId: string,
  profileKey: keyof ClientProfileFinancials,
  value: unknown,
): Promise<void> {
  const current = await getProfile(clientId);
  const next = { ...current, [profileKey]: value ?? null } as ClientProfileFinancials;
  await prisma.user.update({
    where: { id: clientId },
    data: { profileJson: profileToJson(next) as any },
  });
}

/* -------------------------------------------------------------------------- */
/* Case creation & pre-fill                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Seeds a new case: one borrower row with an income row, one bank account and
 * one funding source, plus everything we can already take from the client's
 * profile and (when an advisor opened it) their CRM record.
 *
 * Pre-filled values are marked `source: 'profile'` so the UI can label them and
 * so a later change is recognised as a divergence from the profile.
 */
async function seedCase(caseId: string, clientId: string, advisorId?: string): Promise<void> {
  const [profile, user, crm] = await Promise.all([
    getProfile(clientId),
    prisma.user.findUnique({ where: { id: clientId }, select: { name: true, email: true } }),
    advisorId
      ? prisma.client.findFirst({
          where: { advisorId, userId: clientId },
          select: { phone: true, address: true, age: true, propertyValue: true, propertyAddress: true },
        })
      : Promise.resolve(null),
  ]);

  const borrower = await prisma.caseEntity.create({ data: { caseId, type: 'borrower', position: 0 } });
  await prisma.caseEntity.create({ data: { caseId, type: 'income', parentId: borrower.id, position: 0 } });
  await prisma.caseEntity.create({ data: { caseId, type: 'bankAccount', position: 0 } });
  await prisma.caseEntity.create({ data: { caseId, type: 'fundingSource', position: 0 } });

  const seeds: { entityType: EntityType; entityId: string; fieldKey: string; value: unknown }[] = [];

  // Two-way mapped fields, for the primary borrower and the case.
  for (const mapping of PROFILE_MAPPINGS) {
    if (mapping.slot === 'partner') continue; // only one borrower exists at seed time
    const raw = profile[mapping.profileKey];
    const value = toCaseValue(mapping.profileKey, raw);
    if (value === null || value === undefined || value === '') continue;
    seeds.push({
      entityType: mapping.entityType,
      entityId: mapping.entityType === 'case' ? CASE_ENTITY_ID : borrower.id,
      fieldKey: mapping.fieldKey,
      value,
    });
  }

  // Pre-fill only — these have no two-way counterpart in the profile.
  const name = splitFullName(user?.name);
  if (name) {
    seeds.push({ entityType: 'borrower', entityId: borrower.id, fieldKey: 'firstName', value: name.firstName });
    if (name.lastName) {
      seeds.push({ entityType: 'borrower', entityId: borrower.id, fieldKey: 'lastName', value: name.lastName });
    }
  }
  if (user?.email) {
    seeds.push({ entityType: 'borrower', entityId: borrower.id, fieldKey: 'email', value: user.email });
  }
  if (crm?.phone) {
    seeds.push({ entityType: 'borrower', entityId: borrower.id, fieldKey: 'phone', value: crm.phone });
  }
  if (crm?.address) {
    seeds.push({ entityType: 'borrower', entityId: borrower.id, fieldKey: 'address', value: crm.address });
  }
  if (crm?.propertyValue) {
    seeds.push({ entityType: 'case', entityId: CASE_ENTITY_ID, fieldKey: 'propertyPrice', value: crm.propertyValue });
  }
  if (crm?.propertyAddress) {
    seeds.push({
      entityType: 'case',
      entityId: CASE_ENTITY_ID,
      fieldKey: 'propertyAddress',
      value: crm.propertyAddress,
    });
  }

  for (const seed of seeds) {
    const stored = encodeForStorage(caseId, seed.entityType, seed.entityId, seed.fieldKey, seed.value);
    await prisma.caseField.create({
      data: {
        caseId,
        entityType: seed.entityType,
        entityId: seed.entityId,
        fieldKey: seed.fieldKey,
        value: stored.value,
        valueEnc: stored.valueEnc,
        source: 'profile',
      },
    });
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
  await seedCase(created.id, clientId, advisorId);
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
  bankApproval: [],
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
    case 'bankApproval':
      return `אישור עקרוני ${position + 1}`;
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
    const value = decodeFromStorage(caseId, field);

    if (field.entityId === CASE_ENTITY_ID) {
      caseValues[field.fieldKey] = value;
      caseMeta[field.fieldKey] = meta;
      continue;
    }
    const entity = byEntityId.get(field.entityId);
    if (!entity) continue;
    entity.values[field.fieldKey] = value;
    entity.meta[field.fieldKey] = meta;
  }

  for (const list of Object.values(entities)) {
    list.sort((a, b) => a.position - b.position);
  }

  const conflicts: ConflictDTO[] = mortgageCase.conflicts.map((c) => {
    const entity = byEntityId.get(c.entityId);
    const context = fieldContext(caseId, c.entityType, c.entityId, c.fieldKey);
    const read = (payload: string | null) => {
      if (payload === null) return null;
      if (!c.encrypted) return decodeValue(payload);
      try {
        return decodeValue(decryptField(payload, context));
      } catch {
        return null;
      }
    };
    return {
      id: c.id,
      entityType: c.entityType as EntityType,
      entityId: c.entityId,
      fieldKey: c.fieldKey,
      fieldLabel: getFieldDef(c.entityType as EntityType, c.fieldKey)?.label ?? c.fieldKey,
      entityLabel: entity
        ? entityLabel(entity.type, entity.position)
        : entityLabel(c.entityType as EntityType, 0),
      profileValue: read(c.profileValue),
      caseValue: read(c.caseValue),
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

  // Every advisor who already follows this client can be granted permission,
  // even before an access row exists for them.
  const links = await prisma.client.findMany({
    where: { userId: mortgageCase.clientId },
    select: { advisor: { select: { id: true, name: true, email: true } } },
  });
  for (const link of links) {
    if (advisors.some((a) => a.advisorId === link.advisor.id)) continue;
    advisors.push({
      advisorId: link.advisor.id,
      advisorName: link.advisor.name,
      advisorEmail: link.advisor.email,
      canEdit: false,
      grantedAt: null,
      isAssigned: mortgageCase.advisorId === link.advisor.id,
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
    profile: (await getProfile(mortgageCase.clientId)) as unknown as Record<string, unknown>,
  };
}

/* -------------------------------------------------------------------------- */
/* Saving a single field                                                      */
/* -------------------------------------------------------------------------- */

/** Position of a borrower row, or null when the entity is not a borrower. */
async function borrowerPosition(caseId: string, entityId: string): Promise<number | null> {
  const entity = await prisma.caseEntity.findUnique({ where: { id: entityId } });
  if (!entity || entity.caseId !== caseId || entity.type !== 'borrower') return null;
  return entity.position;
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
  const stored = encodeForStorage(caseId, input.entityType, input.entityId, input.fieldKey, input.value);

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
      value: stored.value,
      valueEnc: stored.valueEnc,
      source,
      updatedById: userId,
    },
    update: { value: stored.value, valueEnc: stored.valueEnc, source, updatedById: userId },
  });

  await prisma.mortgageCase.update({ where: { id: caseId }, data: { updatedAt: new Date() } });

  const conflict = await syncWithProfile(caseId, input);
  await syncDerivedProfileFields(caseId);

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
): Promise<ConflictDTO | null> {
  const position = input.entityType === 'borrower' ? await borrowerPosition(caseId, input.entityId) : null;
  const profileKey = profileKeyFor(input.entityType, input.fieldKey, position);
  if (!profileKey) return null;

  const mortgageCase = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    select: { clientId: true },
  });
  if (!mortgageCase) return null;

  const profile = await getProfile(mortgageCase.clientId);
  const profileValue = profile[profileKey];
  const asProfileValue = toProfileValue(profileKey, input.value);

  const clearConflict = () =>
    prisma.fieldConflict.deleteMany({
      where: {
        caseId,
        entityType: input.entityType,
        entityId: input.entityId,
        fieldKey: input.fieldKey,
        status: 'open',
      },
    });

  // Nothing in the profile yet, or a value the profile cannot express: adopt
  // the new value silently rather than inventing a contradiction.
  if (profileValue === undefined || profileValue === null || profileValue === '') {
    if (asProfileValue !== null && asProfileValue !== undefined) {
      await writeProfileValue(mortgageCase.clientId, profileKey, asProfileValue);
    }
    await clearConflict();
    return null;
  }
  if (asProfileValue === null || asProfileValue === undefined) {
    await clearConflict();
    return null;
  }

  if (!valuesDiffer(profileValue, asProfileValue)) {
    await clearConflict();
    return null;
  }

  const encrypted = isSensitiveField(input.entityType, input.fieldKey);
  const context = fieldContext(caseId, input.entityType, input.entityId, input.fieldKey);
  const store = (value: unknown) => {
    const encoded = encodeValue(value);
    if (encoded === null) return null;
    return encrypted ? encryptField(encoded, context) : encoded;
  };

  const conflict = await prisma.fieldConflict.upsert({
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
      profileValue: store(toCaseValue(profileKey, profileValue)),
      caseValue: store(input.value),
      encrypted,
      status: 'open',
    },
    update: {
      profileValue: store(toCaseValue(profileKey, profileValue)),
      caseValue: store(input.value),
      encrypted,
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
    profileValue: toCaseValue(profileKey, profileValue),
    caseValue: input.value,
    status: 'open',
    resolvedWith: null,
    createdAt: conflict.createdAt.toISOString(),
  };
}

/**
 * Pushes the values the approval flow computes from several rows — total income
 * per borrower, household composition, the primary bank — into the profile.
 *
 * These are one-way on purpose: the case holds the itemised truth, so asking a
 * user to choose between a sum and the rows it came from would be meaningless.
 */
async function syncDerivedProfileFields(caseId: string): Promise<void> {
  const mortgageCase = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    select: { clientId: true },
  });
  if (!mortgageCase) return;

  const [entities, fields] = await Promise.all([
    prisma.caseEntity.findMany({ where: { caseId }, orderBy: { position: 'asc' } }),
    prisma.caseField.findMany({ where: { caseId } }),
  ]);

  const valueOf = (entityId: string, fieldKey: string): unknown => {
    const row = fields.find((f) => f.entityId === entityId && f.fieldKey === fieldKey);
    return row ? decodeFromStorage(caseId, row) : null;
  };

  const borrowers = entities.filter((e) => e.type === 'borrower').sort((a, b) => a.position - b.position);
  const incomeTotal = (borrowerId: string): number | null => {
    const rows = entities.filter((e) => e.type === 'income' && e.parentId === borrowerId);
    const amounts = rows
      .map((row) => valueOf(row.id, 'monthlyAmount'))
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return amounts.length === 0 ? null : amounts.reduce((a, b) => a + b, 0);
  };

  const current = await getProfile(mortgageCase.clientId);
  const next: ClientProfileFinancials = { ...current };

  if (borrowers[0]) {
    const total = incomeTotal(borrowers[0].id);
    if (total !== null) next.income = total;
  }
  if (borrowers[1]) {
    const total = incomeTotal(borrowers[1].id);
    if (total !== null) next.partnerIncome = total;
  }
  if (borrowers.length > 0) {
    next.household = borrowers.length > 1 ? 'COUPLE' : 'SINGLE';
  }

  const primaryAccount =
    entities.find((e) => e.type === 'bankAccount' && valueOf(e.id, 'isPrimary') === true) ??
    entities.find((e) => e.type === 'bankAccount');
  if (primaryAccount) {
    const bankCode = valueOf(primaryAccount.id, 'bankCode');
    if (typeof bankCode === 'string' && bankCode !== '') {
      const { getBank } = await import('@/lib/banks/banks');
      next.primaryBank = getBank(bankCode)?.name ?? next.primaryBank;
    }
  }

  await prisma.user.update({
    where: { id: mortgageCase.clientId },
    data: { profileJson: profileToJson(next) as any },
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

  const entityType = conflict.entityType as EntityType;
  const context = fieldContext(caseId, conflict.entityType, conflict.entityId, conflict.fieldKey);
  const read = (payload: string | null) => {
    if (payload === null) return null;
    if (!conflict.encrypted) return decodeValue(payload);
    return decodeValue(decryptField(payload, context));
  };

  const winning = choice === 'profile' ? read(conflict.profileValue) : read(conflict.caseValue);
  const stored = encodeForStorage(caseId, entityType, conflict.entityId, conflict.fieldKey, winning);

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
      value: stored.value,
      valueEnc: stored.valueEnc,
      source: viewer.role === 'advisor' ? 'advisor' : 'client',
      updatedById: userId,
    },
    update: {
      value: stored.value,
      valueEnc: stored.valueEnc,
      source: viewer.role === 'advisor' ? 'advisor' : 'client',
      updatedById: userId,
    },
  });

  const mortgageCase = await prisma.mortgageCase.findUnique({
    where: { id: caseId },
    select: { clientId: true },
  });
  const position =
    entityType === 'borrower' ? await borrowerPosition(caseId, conflict.entityId) : null;
  const profileKey = profileKeyFor(entityType, conflict.fieldKey, position);
  if (profileKey && mortgageCase) {
    await writeProfileValue(mortgageCase.clientId, profileKey, toProfileValue(profileKey, winning));
  }

  await prisma.fieldConflict.update({
    where: { id: conflictId },
    data: {
      status: 'resolved',
      resolvedValue: conflict.encrypted
        ? encryptField(encodeValue(winning) ?? 'null', context)
        : encodeValue(winning),
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

  await syncDerivedProfileFields(caseId);
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

  // Permission may only be granted to an advisor who actually follows this client.
  const link = await prisma.client.findFirst({
    where: { advisorId, userId: mortgageCase.clientId },
    select: { id: true },
  });
  if (!link && mortgageCase.advisorId !== advisorId) {
    throw new AccessError('היועץ אינו מלווה אותך', 403);
  }

  const access = await prisma.approvalAccess.upsert({
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
