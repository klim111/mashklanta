import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { computeMix, sanitizeMix } from '@/components/mortgage-advisor/engine';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import {
  sanitizeRateRequestDetails,
  toSavedRateRequest,
} from '@/components/mortgage-advisor/rateRequest/record';
import type { SavedRateRequest } from '@/components/mortgage-advisor/rateRequest/record';
import type { RateRequestDetails } from '@/components/mortgage-advisor/rateRequest/document';

const requestSelect = {
  id: true,
  requestKey: true,
  reference: true,
  clientId: true,
  createdAt: true,
  mixJson: true,
  detailsJson: true,
  client: { select: { name: true } },
  owner: { select: { name: true, email: true } },
} satisfies Prisma.BankRateRequestSelect;

type RequestRow = Prisma.BankRateRequestGetPayload<{ select: typeof requestSelect }>;

function fromRow(row: RequestRow): SavedRateRequest | null {
  return toSavedRateRequest({
    recordId: row.id,
    id: row.requestKey,
    reference: row.reference,
    createdAt: row.createdAt.toISOString(),
    mix: row.mixJson,
    details: row.detailsJson,
    clientId: row.clientId,
    clientName: row.client?.name ?? null,
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
  });
}

function fromRows(rows: RequestRow[]): SavedRateRequest[] {
  return rows.flatMap((row) => {
    const saved = fromRow(row);
    return saved ? [saved] : [];
  });
}

/** רשומות הליווי שבהן המשתמש הוא הלקוח */
async function clientIdsOf(userId: string): Promise<string[]> {
  const rows = await prisma.client.findMany({ where: { userId }, select: { id: true } });
  return rows.map((row) => row.id);
}

/**
 * כל בקשות הריביות שהמשתמש רשאי לראות: אלה שהוא הפיק, ואלה ששויכו אליו כלקוח —
 * כך שבקשה שהיועץ הכין עבורו מופיעה גם באזור האישי שלו.
 */
export async function listRateRequestsForUser(userId: string): Promise<SavedRateRequest[]> {
  const clientIds = await clientIdsOf(userId);
  const rows = await prisma.bankRateRequest.findMany({
    where:
      clientIds.length > 0
        ? { OR: [{ ownerId: userId }, { clientId: { in: clientIds } }] }
        : { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: requestSelect,
  });
  return fromRows(rows);
}

export async function listRateRequestsForClient(clientId: string): Promise<SavedRateRequest[]> {
  const rows = await prisma.bankRateRequest.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    select: requestSelect,
  });
  return fromRows(rows);
}

export interface SaveRateRequestInput {
  ownerId: string;
  requestKey: string;
  reference: string;
  mix: WorkspaceMix;
  details: RateRequestDetails;
  createdAt?: string;
  clientId?: string | null;
}

/** שמירת בקשה. שמירה חוזרת של אותה בקשה מעדכנת את הרשומה הקיימת */
export async function saveRateRequest(input: SaveRateRequestInput): Promise<SavedRateRequest | null> {
  const { mix } = input;
  const summary = computeMix(mix).summary;
  const months = Math.max(
    summary.months,
    ...mix.tracks.map((track) => Math.round(track.years * 12)),
    0
  );

  const columns = {
    reference: input.reference,
    mixKey: mix.id,
    name: mix.name?.trim() || 'תמהיל ללא שם',
    bankName: input.details.bankName?.trim() || null,
    propertyAddress: mix.propertyAddress?.trim() || null,
    totalAmount: mix.totalAmount,
    trackCount: mix.tracks.length,
    months,
    mixJson: mix as unknown as Prisma.InputJsonValue,
    detailsJson: input.details as unknown as Prisma.InputJsonValue,
  };

  const row = await prisma.bankRateRequest.upsert({
    where: { ownerId_requestKey: { ownerId: input.ownerId, requestKey: input.requestKey } },
    create: {
      ownerId: input.ownerId,
      requestKey: input.requestKey,
      ...(input.clientId === undefined ? {} : { clientId: input.clientId }),
      ...(input.createdAt ? { createdAt: new Date(input.createdAt) } : {}),
      ...columns,
    },
    update: {
      ...(input.clientId === undefined ? {} : { clientId: input.clientId }),
      ...columns,
    },
    select: requestSelect,
  });

  return fromRow(row);
}

/** האם המשתמש רשאי למחוק את הבקשה — הבעלים, או היועץ של הלקוח ששויך אליה */
export async function canEditRateRequest(userId: string, id: string): Promise<boolean> {
  const row = await prisma.bankRateRequest.findUnique({
    where: { id },
    select: { ownerId: true, client: { select: { advisorId: true, userId: true } } },
  });
  if (!row) return false;
  if (row.ownerId === userId) return true;
  return row.client?.advisorId === userId || row.client?.userId === userId;
}

/** קריאת גוף הבקשה מהלקוח, עם ניקוי מלא של מה שהגיע */
export function parseRateRequestBody(body: unknown): {
  requestKey: string;
  reference: string;
  createdAt?: string;
  mix: WorkspaceMix;
  details: RateRequestDetails;
} | null {
  if (!body || typeof body !== 'object') return null;
  const source = body as Record<string, unknown>;

  const mix = sanitizeMix(source.mix);
  if (!mix) return null;

  const requestKey = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : null;
  const reference =
    typeof source.reference === 'string' && source.reference.trim()
      ? source.reference.trim()
      : null;
  if (!requestKey || !reference) return null;

  return {
    requestKey: requestKey.slice(0, 120),
    reference: reference.slice(0, 60),
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : undefined,
    mix,
    details: sanitizeRateRequestDetails(source.details),
  };
}
