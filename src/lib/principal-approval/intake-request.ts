/**
 * פניות מהעמוד הראשי דרך טופס פרטי הלקוח: "הגישו בקשות לכל הבנקים" (מכרז
 * ריביות למשכנתא חדשה) ו"בדיקת מיחזור משכנתא".
 *
 * מבקר שלא מחובר ממלא את הטופס בדפדפן (LocalCaseProvider), ובלחיצה על "שדר
 * ליועץ" כל הטופס מגיע לכאן בבת אחת: נפתח לו כרטיס לקוח מתעניין אצל היועץ,
 * עם תיק שבו כל מה שמילא, והכרטיס מסומן לפי סוג הבקשה. לקוח מחובר ממלא את
 * התיק שלו בשרת כרגיל, וכאן רק מסומנים הבקשה והשידור.
 *
 * בבדיקת מיחזור מצורף גם דוח יתרות עדכני. הקובץ עולה מהדפדפן ישירות לחנות
 * הקבצים (כמו בפנייה ליועץ, src/lib/lead-files.ts) ונרשם בתיק המסמכים של
 * הלקוח, בתהליך המיחזור שלו.
 */

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { emailAdvisorAboutRequest } from '@/lib/advisor-notify';
import { ensureClientLinkSafely, primaryAdvisor } from '@/lib/advisor-link';
import { syncStageDocuments } from '@/lib/clients';
import { resolveLeadFiles } from '@/lib/lead-files';
import type { LeadFileRef } from '@/lib/lead-file-paths';
import { createEmptyRefinancePlan } from '@/lib/mortgage-plans';
import { PROSPECT_EMAIL_DOMAIN } from '@/lib/prospect-email';
import { REPEATABLE_ENTITIES, getFieldDef, type EntityType } from './schema';
import { validateValue } from './validation';
import { CASE_ENTITY_ID, encodeForStorage, ensureCaseForClient } from './server';
import { intakeReportPath } from './intake';

export type RequestKind = 'TENDER' | 'REFINANCE_CHECK';

export const REQUEST_KINDS: RequestKind[] = ['TENDER', 'REFINANCE_CHECK'];

/** איך הלקוח מסומן ברשימת הלקוחות של היועץ */
export const REQUEST_KIND_LABELS: Record<RequestKind, string> = {
  TENDER: 'ביקש מכרז ריביות',
  REFINANCE_CHECK: 'מבקש לבחון מיחזור',
};

export function parseRequestKind(value: unknown): RequestKind | null {
  return REQUEST_KINDS.includes(value as RequestKind) ? (value as RequestKind) : null;
}

/** המפתח של דוח היתרות בתיק המסמכים */
export const BALANCE_REPORT_KEY = 'refi-balance-report';
export const BALANCE_REPORT_NAME = 'דוח יתרות עדכני';

const MAX_ENTITIES = 120;

/** רשומה כפי שהדפדפן שולח אותה */
export interface PayloadEntity {
  id: string;
  type: EntityType;
  parentId: string | null;
  values: Record<string, unknown>;
}

export interface IntakePayload {
  caseValues: Record<string, unknown>;
  entities: PayloadEntity[];
}

/** סוג ההורה שכל רשומה תלויה בו */
const PARENT_TYPES: Partial<Record<EntityType, EntityType[]>> = {
  income: ['borrower', 'guarantor'],
  prevEmployment: ['income'],
};

const ALLOWED_TYPES: EntityType[] = REPEATABLE_ENTITIES.filter((type) => type !== 'bankApproval');

/** ערכים שעברו בדיקה בלבד — ערך לא תקין או שדה לא מוכר פשוט לא נשמרים */
function cleanValues(type: EntityType, values: unknown): Record<string, unknown> {
  if (!values || typeof values !== 'object') return {};
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
    const def = getFieldDef(type, key);
    if (!def || value === null || value === undefined || value === '') continue;
    if (def.kind === 'documents' || def.kind === 'basketRates') continue;
    if (!validateValue({ ...def, required: false }, value).valid) continue;
    clean[key] = value;
  }
  return clean;
}

export type ParsedPayload = { ok: true; payload: IntakePayload } | { ok: false; error: string };

/** הטופס כפי שהגיע מהדפדפן, אחרי בדיקה של המבנה ושל כל ערך */
export function parseIntakePayload(raw: unknown): ParsedPayload {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'הטופס ריק' };
  const input = raw as { caseValues?: unknown; entities?: unknown };
  const list = Array.isArray(input.entities) ? input.entities : [];
  if (list.length > MAX_ENTITIES) return { ok: false, error: 'יותר מדי רשומות בטופס' };

  const entities: PayloadEntity[] = [];
  const byId = new Map<string, PayloadEntity>();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const type = row.type as EntityType;
    if (typeof row.id !== 'string' || !ALLOWED_TYPES.includes(type) || byId.has(row.id)) continue;
    const entity: PayloadEntity = {
      id: row.id,
      type,
      parentId: typeof row.parentId === 'string' ? row.parentId : null,
      values: cleanValues(type, row.values),
    };
    entities.push(entity);
    byId.set(entity.id, entity);
  }

  // רשומה שתלויה בהורה חייבת להורה קיים מהסוג הנכון; אחרת היא נזרקת
  const valid = entities.filter((entity) => {
    const parents = PARENT_TYPES[entity.type];
    if (!parents) return true;
    const parent = entity.parentId ? byId.get(entity.parentId) : undefined;
    return Boolean(parent && parents.includes(parent.type));
  });
  const keep = new Set(valid.map((entity) => entity.id));
  // מקום עבודה קודם של הכנסה שנזרקה נזרק גם הוא
  const final = valid.filter((entity) => !entity.parentId || keep.has(entity.parentId) || !PARENT_TYPES[entity.type]);

  return {
    ok: true,
    payload: { caseValues: cleanValues('case', input.caseValues), entities: final },
  };
}

/** שם ופרטי קשר מהלווה הראשון — בלעדיהם אי אפשר לחזור ללקוח */
export function contactFrom(payload: IntakePayload) {
  const borrower = payload.entities.find((entity) => entity.type === 'borrower');
  const values = borrower?.values ?? {};
  const name = [values.firstName, values.lastName]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ')
    .trim();
  const email = typeof values.email === 'string' ? values.email.trim().toLowerCase() : '';
  const phone = typeof values.phone === 'string' ? values.phone.trim() : '';
  return { name, email: email || null, phone: phone || null };
}

function digits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/**
 * כרטיס לקוח מתעניין למבקר שלא מחובר. אם כבר יש אצל היועץ כרטיס מתעניין עם
 * אותו מייל או טלפון — הבקשה נכנסת אליו (בתיק חדש). לחשבון רשום לא נכתב כלום
 * מכאן: מי שמילא טופס בלי להתחבר לא יכול לשנות תיק של אדם אחר.
 */
async function prospectFor(advisorId: string, contact: { name: string; email: string | null; phone: string | null }) {
  const candidates = await prisma.client.findMany({
    where: {
      advisorId,
      prospect: true,
      OR: [
        ...(contact.email ? [{ email: { equals: contact.email, mode: 'insensitive' as const } }] : []),
        ...(contact.phone ? [{ phone: { not: null } }] : []),
      ],
    },
    select: { id: true, userId: true, email: true, phone: true },
  });
  const match = candidates.find(
    (row) =>
      (contact.email && row.email.toLowerCase() === contact.email) ||
      (contact.phone && digits(row.phone).length >= 7 && digits(row.phone) === digits(contact.phone)),
  );
  if (match) return { clientId: match.id, userId: match.userId };

  const placeholderEmail = `prospect-${randomBytes(9).toString('hex')}@${PROSPECT_EMAIL_DOMAIN}`;
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: contact.name, email: placeholderEmail, role: 'CLIENT' },
      select: { id: true },
    });
    return tx.client.create({
      data: {
        advisorId,
        userId: user.id,
        name: contact.name,
        email: contact.email ?? '',
        phone: contact.phone,
        prospect: true,
        status: 'POTENTIAL',
      },
      select: { id: true, userId: true },
    });
  });
  await syncStageDocuments(created.id, 'INTAKE');
  return { clientId: created.id, userId: created.userId };
}

/** תיק חדש עם כל מה שמולא בטופס */
async function writeCase(userId: string, advisorId: string, payload: IntakePayload): Promise<string> {
  const now = new Date();
  const created = await prisma.mortgageCase.create({
    data: { clientId: userId, advisorId, intakeRequestedAt: now, intakeSubmittedAt: now },
    select: { id: true },
  });
  const caseId = created.id;

  // הורים לפני ילדים, כדי שלכל רשומה יהיה המזהה החדש של ההורה
  const order: EntityType[] = ['borrower', 'guarantor', 'bankAccount', 'fundingSource', 'income', 'prevEmployment'];
  const idMap = new Map<string, string>();
  const positions = new Map<string, number>();
  const fields: { entityType: EntityType; entityId: string; fieldKey: string; value: unknown }[] = [];

  for (const type of order) {
    for (const entity of payload.entities.filter((row) => row.type === type)) {
      const parentId = entity.parentId ? idMap.get(entity.parentId) ?? null : null;
      if (PARENT_TYPES[type] && !parentId) continue;
      const slot = `${type}:${parentId ?? ''}`;
      const position = positions.get(slot) ?? 0;
      positions.set(slot, position + 1);
      const row = await prisma.caseEntity.create({
        data: { caseId, type, parentId, position },
        select: { id: true },
      });
      idMap.set(entity.id, row.id);
      for (const [fieldKey, value] of Object.entries(entity.values)) {
        fields.push({ entityType: type, entityId: row.id, fieldKey, value });
      }
    }
  }
  for (const [fieldKey, value] of Object.entries(payload.caseValues)) {
    fields.push({ entityType: 'case', entityId: CASE_ENTITY_ID, fieldKey, value });
  }

  if (fields.length > 0) {
    await prisma.caseField.createMany({
      data: fields.map((field) => {
        const stored = encodeForStorage(caseId, field.entityType, field.entityId, field.fieldKey, field.value);
        return {
          caseId,
          entityType: field.entityType,
          entityId: field.entityId,
          fieldKey: field.fieldKey,
          value: stored.value,
          valueEnc: stored.valueEnc,
          source: 'client',
          updatedById: userId,
        };
      }),
    });
  }
  return caseId;
}

/** דוח היתרות נרשם בתיק המסמכים, בתהליך המיחזור של הלקוח */
async function attachBalanceReport(userId: string, refs: LeadFileRef[]): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (refs.length === 0) return { ok: true };
  const resolved = await resolveLeadFiles(refs);
  if (!resolved.ok) return resolved;

  const existing = await prisma.mortgagePlan.findFirst({
    where: { ownerId: userId, status: { not: 'ARCHIVED' } },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, clientId: true },
  });
  const planId = existing?.id ?? (await createEmptyRefinancePlan(userId))?.id ?? null;
  if (!planId) return { ok: false, status: 500, error: 'לא ניתן היה לשמור את דוח היתרות' };
  const plan = existing ?? (await prisma.mortgagePlan.findUnique({ where: { id: planId }, select: { id: true, clientId: true } }));

  for (const [index, file] of resolved.files.entries()) {
    const key = index === 0 ? BALANCE_REPORT_KEY : `${BALANCE_REPORT_KEY}-${index + 1}`;
    const data = {
      planId,
      ownerId: userId,
      clientId: plan?.clientId ?? null,
      key,
      name: index === 0 ? BALANCE_REPORT_NAME : `${BALANCE_REPORT_NAME} (${index + 1})`,
      fileName: file.fileName,
      contentType: file.contentType,
      size: file.size,
      blobPath: file.blob ?? '',
      category: 'BANK',
      uploadedAt: new Date(),
    };
    await prisma.planDocument.upsert({
      where: { planId_key: { planId, key } },
      create: data,
      update: data,
    });
  }
  return { ok: true };
}

export interface SubmitRequestInput {
  kind: RequestKind;
  /** לקוח מחובר — התיק שלו כבר בשרת */
  userId?: string | null;
  /** מבקר שלא מחובר — כל הטופס */
  payload?: unknown;
  files: LeadFileRef[];
}

export type SubmitRequestResult =
  | { ok: true; clientId: string; submittedAt: string }
  | { ok: false; status: number; error: string };

export async function submitIntakeRequest(input: SubmitRequestInput): Promise<SubmitRequestResult> {
  if (input.kind === 'REFINANCE_CHECK' && input.files.length === 0) {
    return { ok: false, status: 400, error: 'יש לצרף דוח יתרות עדכני' };
  }

  let clientId: string;
  let userId: string;
  let contact: { name: string; email: string | null; phone: string | null };

  if (input.userId) {
    const link = await ensureClientLinkSafely(input.userId);
    if (!link) return { ok: false, status: 403, error: 'אפשר לשלוח בקשה רק מחשבון לקוח' };
    clientId = link.clientId;
    userId = input.userId;
    const caseId = await ensureCaseForClient(userId, link.advisorId);
    await prisma.mortgageCase.update({ where: { id: caseId }, data: { intakeSubmittedAt: new Date() } });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    const card = await prisma.client.findUnique({ where: { id: clientId }, select: { phone: true } });
    contact = { name: user?.name ?? '', email: user?.email ?? null, phone: card?.phone ?? null };
  } else {
    const parsed = parseIntakePayload(input.payload);
    if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
    contact = contactFrom(parsed.payload);
    if (!contact.name) return { ok: false, status: 400, error: 'יש למלא שם פרטי ושם משפחה של הלווה הראשון' };
    if (!contact.email && !contact.phone) {
      return { ok: false, status: 400, error: 'יש למלא טלפון או אימייל של הלווה הראשון, כדי שנוכל לחזור אליכם' };
    }
    const advisor = await primaryAdvisor();
    if (!advisor) return { ok: false, status: 503, error: 'לא ניתן לשלוח את הבקשה כרגע' };
    const prospect = await prospectFor(advisor.id, contact);
    clientId = prospect.clientId;
    userId = prospect.userId;
    await writeCase(userId, advisor.id, parsed.payload);
  }

  if (input.kind === 'REFINANCE_CHECK') {
    const attached = await attachBalanceReport(userId, input.files);
    if (!attached.ok) return attached;
  }

  const submittedAt = new Date();
  await prisma.client.update({
    where: { id: clientId },
    data: { requestKind: input.kind, requestedAt: submittedAt },
  });

  await emailAdvisorAboutRequest({
    what: input.kind === 'TENDER' ? 'בקשת מכרז ריביות' : 'בקשה לבדיקת מיחזור משכנתא',
    details: [
      ['סוג הבקשה', REQUEST_KIND_LABELS[input.kind]],
      ['מה התקבל', input.kind === 'TENDER' ? 'טופס פרטי לקוח מלא' : 'טופס פרטי לקוח מלא ודוח יתרות עדכני'],
    ],
    from: contact,
    path: intakeReportPath(clientId),
  });

  return { ok: true, clientId, submittedAt: submittedAt.toISOString() };
}
