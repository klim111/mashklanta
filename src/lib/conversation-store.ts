import { Resend } from 'resend';
import { Prisma as PrismaErrors } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { MAX_DOCUMENT_BYTES, isAllowedDocumentType, storeFileInPlan } from './plan-documents';
import { canonicalSiteOrigin } from './auth-url';
import { sendEmail } from './email';
import { parseStageData } from './mortgage-plan';
import { deleteStoredFiles, readStoredFile, resolveOutgoingFiles } from './conversation-files';
import {
  MAX_CHAT_LENGTH,
  MAX_CUSTOM_RECIPIENTS,
  MAX_EMAIL_LENGTH,
  isRecipientRole,
  parseOutgoingFiles,
  allowedRecipients,
  attachmentDocumentKey,
  attachmentView,
  addressedToDomains,
  domainList,
  escapeHtml,
  inboundAttachments,
  isFallbackMailboxName,
  mailboxNameCandidates,
  mailboxNameSource,
  mailboxTargets,
  senderAllowed,
  storedAttachments,
  bankFor,
  bankerContacts,
  carbonCopies,
  cleanSubject,
  emailHtml,
  htmlToText,
  isValidEmail,
  mailboxAddress,
  normalizeEmail,
  parseAddress,
  senderAddress,
  senderDisplayName,
  trimQuotedReply,
} from './conversation';
import type {
  AdvisorInboxRow,
  AttachmentFolder,
  StoredAttachment,
  ChatMessageView,
  ConversationContact,
  ConversationDocument,
  ConversationEmailView,
  ConversationRole,
  ConversationSummary,
} from './conversation';

/**
 * שכבת הגישה להתכתבות לקוח–יועץ.
 *
 * כל פעולה עוברת קודם דרך `resolveConversationAccess`: לקוח ניגש תמיד לשיחה
 * של עצמו, ויועץ ניגש רק לשיחה של לקוח שהוא מלווה — או של לקוח שעדיין לא שויך
 * לאף יועץ, כמו פנייה חדשה שממתינה לטיפול.
 */

export interface ConversationAccess {
  clientUserId: string;
  viewerId: string;
  viewerRole: ConversationRole;
}

const appName = () => process.env.PUBLIC_APP_NAME || 'משכלנתא';

/**
 * הדומיין של הכתובות האישיות של הלקוחות (`EMAIL_INBOUND_DOMAIN`, למשל
 * mashkalanta.com). בלעדיו השליחה עובדת, והתשובות מגיעות רק לתיבה של הלקוח.
 */
export function inboundDomain(): string | null {
  return domainList(process.env.EMAIL_INBOUND_DOMAIN)[0] ?? null;
}

/**
 * כל הדומיינים שמקבלים מיילים: הדומיין הנוכחי, ודומיינים קודמים
 * (`EMAIL_INBOUND_LEGACY_DOMAINS`) — כדי שכתובות שכבר נמסרו לבנקים ימשיכו לעבוד.
 */
export function inboundDomains(): string[] {
  const all = [...domainList(process.env.EMAIL_INBOUND_DOMAIN), ...domainList(process.env.EMAIL_INBOUND_LEGACY_DOMAINS)];
  return Array.from(new Set(all));
}

export async function resolveConversationAccess(
  user: { id?: string | null; role?: string | null } | undefined,
  requestedClientUserId: string | null
): Promise<ConversationAccess | null> {
  const viewerId = user?.id;
  if (!viewerId) return null;

  if (user?.role !== 'ADVISOR') {
    return { clientUserId: viewerId, viewerId, viewerRole: 'CLIENT' };
  }

  const clientUserId = requestedClientUserId?.trim();
  if (!clientUserId || clientUserId === viewerId) return null;

  const records = await prisma.client.findMany({
    where: { userId: clientUserId },
    select: { advisorId: true },
  });
  if (records.some((row) => row.advisorId === viewerId)) {
    return { clientUserId, viewerId, viewerRole: 'ADVISOR' };
  }
  if (records.length > 0) return null;

  // לקוח בלי יועץ — פתוח לכל יועץ, כמו פנייה שלא שויכה
  const target = await prisma.user.findUnique({ where: { id: clientUserId }, select: { role: true } });
  if (target?.role !== 'CLIENT') return null;
  return { clientUserId, viewerId, viewerRole: 'ADVISOR' };
}

/** היועץ המלווה של הלקוח, אם כבר שויך — הרשומה הראשונה שנפתחה */
async function advisorOf(clientUserId: string) {
  const record = await prisma.client.findFirst({
    where: { userId: clientUserId },
    orderBy: { createdAt: 'asc' },
    select: { advisor: { select: { id: true, name: true, email: true } } },
  });
  return record?.advisor ?? null;
}

// ───────────────────────────────── צ'אט ─────────────────────────────────

const messageSelect = {
  id: true,
  authorRole: true,
  body: true,
  createdAt: true,
  readAt: true,
  attachments: true,
  author: { select: { name: true } },
} as const;

type MessageRow = {
  id: string;
  authorRole: ConversationRole;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  attachments: Prisma.JsonValue | null;
  author: { name: string | null } | null;
};

function toMessageView(row: MessageRow): ChatMessageView {
  return {
    id: row.id,
    authorRole: row.authorRole,
    authorName: row.author?.name ?? null,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    attachments: storedAttachments(row.attachments).map(attachmentView),
  };
}

const otherRole = (role: ConversationRole): ConversationRole => (role === 'CLIENT' ? 'ADVISOR' : 'CLIENT');

/** ההודעות בשיחה, מהישנה לחדשה. מה שהצד השני כתב מסומן כנקרא */
export async function listChatMessages(access: ConversationAccess): Promise<ChatMessageView[]> {
  await prisma.conversationMessage.updateMany({
    where: { clientUserId: access.clientUserId, authorRole: otherRole(access.viewerRole), readAt: null },
    data: { readAt: new Date() },
  });
  const rows = await prisma.conversationMessage.findMany({
    where: { clientUserId: access.clientUserId },
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: messageSelect,
  });
  return rows.reverse().map(toMessageView);
}

/** עד כמה קבצים יחד בהודעת צ'אט אחת */
const MAX_CHAT_FILES_BYTES = 30 * 1024 * 1024;

export type PostChatResult = { ok: true; message: ChatMessageView } | { ok: false; status: number; error: string };

/** הודעה חדשה בצ'אט: טקסט, קבצים, או שניהם */
export async function postChatMessage(
  access: ConversationAccess,
  rawBody: unknown,
  rawFiles?: unknown
): Promise<PostChatResult> {
  const body = typeof rawBody === 'string' ? rawBody.trim().slice(0, MAX_CHAT_LENGTH) : '';
  const refs = parseOutgoingFiles(rawFiles);
  if (!refs) return { ok: false, status: 400, error: 'אפשר לצרף עד 5 קבצים' };
  if (!body && refs.length === 0) return { ok: false, status: 400, error: 'ההודעה ריקה' };
  const resolved = await resolveOutgoingFiles(access, refs, MAX_CHAT_FILES_BYTES);
  if (!resolved.ok) return resolved;

  // הודעה ראשונה שממתינה לצד השני — רק עליה נשלחת התראה במייל, לא על כל שורה
  const waiting = await prisma.conversationMessage.count({
    where: { clientUserId: access.clientUserId, authorRole: access.viewerRole, readAt: null },
  });

  const row = await prisma.conversationMessage.create({
    data: {
      clientUserId: access.clientUserId,
      authorId: access.viewerId,
      authorRole: access.viewerRole,
      body,
      ...(resolved.files.length > 0 ? { attachments: resolved.files as unknown as Prisma.InputJsonValue } : {}),
    },
    select: messageSelect,
  });

  const files = resolved.files.map((item) => item.fileName);
  const preview = [body, files.length > 0 ? `מצורף: ${files.join(', ')}` : ''].filter(Boolean).join('\n');
  if (waiting === 0) void notifyNewMessage(access, preview).catch(() => {});
  return { ok: true, message: toMessageView(row) };
}

/** קובץ שצורף להודעת צ'אט — אם מי שמבקש רשאי לראות את השיחה */
export async function chatAttachment(
  access: ConversationAccess,
  messageId: string,
  attachmentId: string
): Promise<StoredAttachment | null> {
  const row = await prisma.conversationMessage.findFirst({
    where: { id: messageId, clientUserId: access.clientUserId },
    select: { attachments: true },
  });
  return storedAttachments(row?.attachments).find((item) => item.id === attachmentId && item.blob) ?? null;
}

/** התראה במייל לצד השני שיש הודעה חדשה, עם קישור ישר לשיחה */
async function notifyNewMessage(access: ConversationAccess, body: string) {
  const origin = (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const preview = body.length > 280 ? `${body.slice(0, 280)}…` : body;

  if (access.viewerRole === 'CLIENT') {
    const [advisor, client] = await Promise.all([
      advisorOf(access.clientUserId),
      prisma.user.findUnique({ where: { id: access.clientUserId }, select: { name: true, email: true } }),
    ]);
    if (!advisor?.email) return;
    const who = client?.name || client?.email || 'לקוח';
    await sendEmail({
      to: advisor.email,
      subject: `הודעה חדשה מ${who}`,
      html: emailHtml(`${who} כתב/ה לך בצ'אט:\n\n${preview}\n\nלתשובה: ${origin}/advisor-dashboard`, appName()),
      text: `${who} כתב/ה לך בצ'אט:\n\n${preview}\n\nלתשובה: ${origin}/advisor-dashboard`,
    });
    return;
  }

  const client = await prisma.user.findUnique({
    where: { id: access.clientUserId },
    select: { email: true },
  });
  if (!client?.email) return;
  await sendEmail({
    to: client.email,
    subject: `היועץ שלכם ב${appName()} כתב לכם`,
    html: emailHtml(`קיבלתם הודעה חדשה מהיועץ:\n\n${preview}\n\nלתשובה: ${origin}/dashboard#chat`, appName()),
    text: `קיבלתם הודעה חדשה מהיועץ:\n\n${preview}\n\nלתשובה: ${origin}/dashboard#chat`,
  });
}

// ──────────────────────────────── סיכום ────────────────────────────────

async function unreadEmailCount(access: ConversationAccess): Promise<number> {
  return prisma.conversationEmail.count({
    where: {
      clientUserId: access.clientUserId,
      archivedAt: null,
      ...(access.viewerRole === 'CLIENT' ? { readByClientAt: null } : { readByAdvisorAt: null, held: false }),
    },
  });
}

export async function conversationSummary(access: ConversationAccess): Promise<ConversationSummary> {
  const domain = inboundDomain();
  const [unreadChat, unreadEmails, advisor, name] = await Promise.all([
    prisma.conversationMessage.count({
      where: { clientUserId: access.clientUserId, authorRole: otherRole(access.viewerRole), readAt: null },
    }),
    unreadEmailCount(access),
    advisorOf(access.clientUserId),
    // ללקוח הכתובת נוצרת כבר עכשיו, כדי שיוכל להעביר אליה מייל שהבנק שלח לו ישירות
    domain && access.viewerRole === 'CLIENT'
      ? ensureMailboxName(access.clientUserId)
      : prisma.user
          .findUnique({ where: { id: access.clientUserId }, select: { mailboxName: true } })
          .then((user) => user?.mailboxName ?? null),
  ]);
  return {
    unreadChat,
    unreadEmails,
    advisorName: advisor?.name ?? null,
    mailboxAddress: mailboxAddress(name, domain),
    receivesEmail: Boolean(domain),
  };
}

/**
 * תיבת ההודעות של היועץ: כל הלקוחות שהוא מלווה, ולצדם לקוחות שעדיין לא שויכו
 * וכבר כתבו. שיחות עם הודעה שלא נקראה עולות ראשונות.
 */
export async function advisorInbox(advisorId: string): Promise<AdvisorInboxRow[]> {
  const [assigned, unassigned] = await Promise.all([
    prisma.client.findMany({
      where: { advisorId },
      select: { id: true, userId: true, name: true, email: true },
    }),
    prisma.user.findMany({
      where: {
        role: 'CLIENT',
        advisedAs: { none: {} },
        OR: [{ conversationMessages: { some: {} } }, { conversationEmails: { some: { held: false } } }],
      },
      select: { id: true, name: true, email: true },
      take: 100,
    }),
  ]);

  const rows = new Map<string, AdvisorInboxRow>();
  for (const client of assigned) {
    if (rows.has(client.userId)) continue;
    rows.set(client.userId, {
      clientUserId: client.userId,
      clientId: client.id,
      name: client.name,
      email: client.email,
      unassigned: false,
      lastAt: null,
      lastPreview: null,
      unreadChat: 0,
      unreadEmails: 0,
    });
  }
  for (const user of unassigned) {
    rows.set(user.id, {
      clientUserId: user.id,
      clientId: null,
      name: user.name || user.email || 'לקוח',
      email: user.email,
      unassigned: true,
      lastAt: null,
      lastPreview: null,
      unreadChat: 0,
      unreadEmails: 0,
    });
  }

  const ids = [...rows.keys()];
  if (ids.length === 0) return [];

  const [unreadChat, unreadEmails, lastMessages, lastEmails] = await Promise.all([
    prisma.conversationMessage.groupBy({
      by: ['clientUserId'],
      where: { clientUserId: { in: ids }, authorRole: 'CLIENT', readAt: null },
      _count: { _all: true },
    }),
    prisma.conversationEmail.groupBy({
      by: ['clientUserId'],
      where: { clientUserId: { in: ids }, readByAdvisorAt: null, held: false, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.conversationMessage.findMany({
      where: { clientUserId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      distinct: ['clientUserId'],
      select: { clientUserId: true, body: true, createdAt: true },
    }),
    prisma.conversationEmail.findMany({
      where: { clientUserId: { in: ids }, held: false, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      distinct: ['clientUserId'],
      select: { clientUserId: true, subject: true, createdAt: true },
    }),
  ]);

  for (const item of unreadChat) {
    const row = rows.get(item.clientUserId);
    if (row) row.unreadChat = item._count._all;
  }
  for (const item of unreadEmails) {
    const row = rows.get(item.clientUserId);
    if (row) row.unreadEmails = item._count._all;
  }
  const touch = (clientUserId: string, at: Date, preview: string) => {
    const row = rows.get(clientUserId);
    if (!row) return;
    if (!row.lastAt || new Date(row.lastAt) < at) {
      row.lastAt = at.toISOString();
      row.lastPreview = preview;
    }
  };
  lastMessages.forEach((item) => touch(item.clientUserId, item.createdAt, item.body));
  lastEmails.forEach((item) => touch(item.clientUserId, item.createdAt, `מייל: ${item.subject}`));

  return [...rows.values()].sort((a, b) => {
    const unreadA = a.unreadChat + a.unreadEmails > 0 ? 1 : 0;
    const unreadB = b.unreadChat + b.unreadEmails > 0 ? 1 : 0;
    if (unreadA !== unreadB) return unreadB - unreadA;
    if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return a.name.localeCompare(b.name, 'he');
  });
}

// ──────────────────────────────── מיילים ────────────────────────────────

/** מי שאפשר לשלוח אליו מהשיחה: הבנקאים שהוזנו, היועץ והלקוח */
export async function conversationContacts(clientUserId: string): Promise<ConversationContact[]> {
  const [client, advisor, stages, custom] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientUserId }, select: { name: true, email: true } }),
    advisorOf(clientUserId),
    prisma.mortgagePlanStage.findMany({
      where: { stage: 'APPLICATIONS', plan: { ownerId: clientUserId } },
      orderBy: { updatedAt: 'desc' },
      select: { dataJson: true },
    }),
    prisma.conversationRecipient.findMany({ where: { clientUserId }, orderBy: { createdAt: 'asc' } }),
  ]);

  const bankers = bankerContacts(
    stages.flatMap((row) => parseStageData('APPLICATIONS', row.dataJson).bankApprovals)
  );
  const contacts: ConversationContact[] = [...bankers];
  for (const row of custom) {
    if (contacts.some((item) => item.email === row.email)) continue;
    const role = isRecipientRole(row.role) ? row.role : 'OTHER';
    contacts.push({
      kind: role === 'BANKER' ? 'BANKER' : 'CONTACT',
      email: row.email,
      name: row.name,
      bank: role === 'BANKER' ? row.bank : null,
      role,
      recipientId: row.id,
    });
  }
  const advisorEmail = normalizeEmail(advisor?.email);
  if (isValidEmail(advisorEmail) && !contacts.some((item) => item.email === advisorEmail)) {
    contacts.push({ kind: 'ADVISOR', email: advisorEmail, name: advisor?.name || 'היועץ', bank: null });
  }
  const clientEmail = normalizeEmail(client?.email);
  if (isValidEmail(clientEmail) && !contacts.some((item) => item.email === clientEmail)) {
    contacts.push({ kind: 'CLIENT', email: clientEmail, name: client?.name || 'הלקוח', bank: null });
  }
  return contacts;
}

export type RecipientResult = { ok: true; contact: ConversationContact } | { ok: false; status: number; error: string };

/**
 * נמען חדש לשיחה, עם תפקיד — הלקוח או היועץ מוסיפים אותו מתיבת המיילים.
 * כתובת בדומיין של משכלנתא לא מתקבלת (זו הכתובת האישית, לא נמען).
 */
export async function addConversationRecipient(
  access: ConversationAccess,
  input: { email: unknown; name: unknown; role: unknown; bank: unknown }
): Promise<RecipientResult> {
  const email = normalizeEmail(input.email);
  const name = typeof input.name === 'string' ? input.name.replace(/[\r\n<>"]/g, '').trim().slice(0, 80) : '';
  const bank = typeof input.bank === 'string' ? input.bank.replace(/[\r\n<>"]/g, '').trim().slice(0, 60) : '';
  if (!isValidEmail(email)) return { ok: false, status: 400, error: 'כתובת המייל אינה תקינה' };
  if (!name) return { ok: false, status: 400, error: 'נדרש שם' };
  if (!isRecipientRole(input.role)) return { ok: false, status: 400, error: 'בחרו תפקיד' };
  const host = email.slice(email.lastIndexOf('@') + 1);
  if (inboundDomains().includes(host) || host === senderAddress(process.env.EMAIL_FROM).split('@')[1]) {
    return { ok: false, status: 400, error: 'זו כתובת של משכלנתא, לא של נמען' };
  }

  const existing = await conversationContacts(access.clientUserId);
  if (existing.some((item) => item.email === email)) return { ok: false, status: 409, error: 'הנמען כבר ברשימה' };
  const count = await prisma.conversationRecipient.count({ where: { clientUserId: access.clientUserId } });
  if (count >= MAX_CUSTOM_RECIPIENTS) return { ok: false, status: 409, error: `אפשר להוסיף עד ${MAX_CUSTOM_RECIPIENTS} נמענים` };

  const row = await prisma.conversationRecipient.create({
    data: {
      clientUserId: access.clientUserId,
      email,
      name,
      role: input.role,
      bank: input.role === 'BANKER' && bank ? bank : null,
      createdById: access.viewerId,
    },
  });
  return {
    ok: true,
    contact: {
      kind: input.role === 'BANKER' ? 'BANKER' : 'CONTACT',
      email,
      name,
      bank: row.bank,
      role: input.role,
      recipientId: row.id,
    },
  };
}

/** הסרת נמען שנוסף ידנית. בנקאי מהשלב של האישור העקרוני מוסר שם, לא כאן */
export async function removeConversationRecipient(access: ConversationAccess, recipientId: string): Promise<boolean> {
  const { count } = await prisma.conversationRecipient.deleteMany({
    where: { id: recipientId, clientUserId: access.clientUserId },
  });
  return count === 1;
}

type EmailRow = {
  id: string;
  direction: 'OUTBOUND' | 'INBOUND';
  senderRole: ConversationRole | null;
  fromAddress: string;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  text: string;
  bank: string | null;
  attachments: Prisma.JsonValue | null;
  held: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  readByClientAt: Date | null;
  readByAdvisorAt: Date | null;
};

function toEmailView(
  row: EmailRow,
  viewer: ConversationRole,
  saved: ReadonlyMap<string, string> = new Map()
): ConversationEmailView {
  return {
    id: row.id,
    direction: row.direction,
    senderRole: row.senderRole,
    fromAddress: row.fromAddress,
    fromName: row.fromName,
    toAddresses: row.toAddresses,
    ccAddresses: row.ccAddresses,
    subject: row.subject,
    text: row.text,
    bank: row.bank,
    createdAt: row.createdAt.toISOString(),
    unread: viewer === 'CLIENT' ? !row.readByClientAt : !row.readByAdvisorAt,
    held: row.held,
    archived: Boolean(row.archivedAt),
    attachments: storedAttachments(row.attachments).map((item) => ({
      ...attachmentView(item),
      savable: !row.held && isAllowedDocumentType(item.contentType) && item.size <= MAX_DOCUMENT_BYTES,
      savedToPlanId: saved.get(attachmentDocumentKey(item.id)) ?? null,
    })),
  };
}

const NO_TEXT = '(המייל הגיע בלי תוכן טקסט)';

function inboundText(body: string): string {
  return trimQuotedReply(body || NO_TEXT).slice(0, MAX_EMAIL_LENGTH);
}

/**
 * גוף המייל הנכנס והקבצים שצורפו אליו, מ-Resend — ה-webhook מביא רק את פרטי
 * המעטפה. `null` כשלא הצליח; הסיבה נכתבת ללוג, כי מפתח API עם הרשאת שליחה
 * בלבד נכשל כאן בשקט.
 */
async function fetchInboundContent(
  emailId: string
): Promise<{ text: string; attachments: StoredAttachment[] } | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[conversation] inbound email body: RESEND_API_KEY is not set');
    return null;
  }
  const resend = new Resend(apiKey);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await resend.emails.receiving.get(emailId);
    if (data) {
      return {
        text: data.text?.trim() || (data.html ? htmlToText(data.html) : ''),
        attachments: inboundAttachments(data.attachments ?? []),
      };
    }
    console.error(`[conversation] inbound email body ${emailId}: ${error?.name ?? 'unknown'}: ${error?.message ?? ''}`);
    // רק "לא נמצא" שווה ניסיון נוסף — מייל שהתקבל הרגע עוד בעיבוד
    if (error?.name !== 'not_found') break;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
}

/**
 * מיילים נכנסים שהתוכן שלהם לא נטען כשהגיעו — ניסיון נוסף, כמה בכל פעם.
 * `attachments` ריק (null) במייל נכנס פירושו שהתוכן עוד לא נמשך.
 */
async function backfillInboundContent(rows: (EmailRow & { providerId: string | null })[]) {
  const missing = rows
    .filter(
      (row) =>
        row.direction === 'INBOUND' &&
        row.providerId?.startsWith('in:') &&
        (row.text === '' || row.text === NO_TEXT || row.attachments === null)
    )
    .slice(0, 3);
  for (const row of missing) {
    const content = await fetchInboundContent(row.providerId!.slice(3));
    if (!content) continue;
    row.text = inboundText(content.text);
    row.attachments = content.attachments as unknown as Prisma.JsonValue;
    await prisma.conversationEmail.update({
      where: { id: row.id },
      data: { text: row.text, attachments: content.attachments as unknown as Prisma.InputJsonValue },
    });
  }
}

/** הקבצים המצורפים שכבר נשמרו בתיק, לפי המפתח שלהם בתיק ← התהליך */
async function savedAttachmentPlans(clientUserId: string, rows: EmailRow[]): Promise<Map<string, string>> {
  const keys = rows.flatMap((row) => storedAttachments(row.attachments).map((item) => attachmentDocumentKey(item.id)));
  if (keys.length === 0) return new Map();
  const docs = await prisma.planDocument.findMany({
    where: { ownerId: clientUserId, key: { in: keys } },
    orderBy: { uploadedAt: 'asc' },
    select: { key: true, planId: true },
  });
  return new Map(docs.map((doc) => [doc.key, doc.planId]));
}

/** המיילים של השיחה, מהחדש לישן. `unread` נשאר כפי שהיה לפני הפתיחה, כדי שיודגש פעם אחת */
export async function listConversationEmails(access: ConversationAccess): Promise<ConversationEmailView[]> {
  const rows = await prisma.conversationEmail.findMany({
    where: { clientUserId: access.clientUserId, ...(access.viewerRole === 'ADVISOR' ? { held: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  await backfillInboundContent(rows);
  const saved = await savedAttachmentPlans(access.clientUserId, rows);
  const views = rows.map((row) => toEmailView(row, access.viewerRole, saved));
  if (views.some((view) => view.unread)) {
    await prisma.conversationEmail.updateMany({
      where: {
        clientUserId: access.clientUserId,
        ...(access.viewerRole === 'CLIENT' ? { readByClientAt: null } : { readByAdvisorAt: null, held: false }),
      },
      data: access.viewerRole === 'CLIENT' ? { readByClientAt: new Date() } : { readByAdvisorAt: new Date() },
    });
  }
  return views;
}

// ─────────────────────────── קבצים מצורפים ───────────────────────────

/**
 * מסמכים מתיק המסמכים של הלקוח שאפשר לצרף בשליחה. הלקוח רואה את כל התיקים
 * שלו; יועץ — רק תהליכים של לקוח שהוא מלווה.
 */
export async function conversationDocuments(access: ConversationAccess): Promise<ConversationDocument[]> {
  const rows = await prisma.planDocument.findMany({
    where: {
      ownerId: access.clientUserId,
      ...(access.viewerRole === 'ADVISOR' ? { plan: { client: { advisorId: access.viewerId } } } : {}),
    },
    orderBy: { uploadedAt: 'desc' },
    take: 200,
    select: { id: true, name: true, fileName: true, contentType: true, size: true, plan: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    fileName: row.fileName,
    contentType: row.contentType,
    size: row.size,
    planName: row.plan.name,
  }));
}

/**
 * תיקי המסמכים שאפשר לשמור אליהם קובץ מצורף: התהליכים הפתוחים של הלקוח.
 * הלקוח שומר לתיק שלו; יועץ — רק כשהוא היועץ המלווה, לא כשהלקוח עוד לא שויך.
 */
export async function attachmentFolders(access: ConversationAccess): Promise<AttachmentFolder[]> {
  const plans = await prisma.mortgagePlan.findMany({
    where: {
      ownerId: access.clientUserId,
      status: 'IN_PROGRESS',
      ...(access.viewerRole === 'ADVISOR' ? { client: { advisorId: access.viewerId } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true },
  });
  return plans.map((plan) => ({ planId: plan.id, name: plan.name }));
}

async function attachmentOf(access: ConversationAccess, emailId: string, attachmentId: string) {
  const row = await prisma.conversationEmail.findFirst({
    // קבצים ממייל שממתין לאישור השולח לא נפתחים
    where: { id: emailId, clientUserId: access.clientUserId, held: false },
    select: { providerId: true, attachments: true },
  });
  const attachment = storedAttachments(row?.attachments).find((item) => item.id === attachmentId);
  if (!row || !attachment) return null;
  // קובץ שצורף מהפלטפורמה יושב בחנות הקבצים; קובץ ממייל נכנס — אצל ספק המיילים
  if (attachment.blob) return { attachment, providerEmailId: null };
  if (!row.providerId?.startsWith('in:')) return null;
  return { attachment, providerEmailId: row.providerId.slice(3) };
}

export type AttachmentSource =
  | { kind: 'blob'; pathname: string; attachment: StoredAttachment }
  | { kind: 'url'; url: string; attachment: StoredAttachment };

/**
 * איפה הקובץ: בחנות הקבצים (קובץ שצורף מהפלטפורמה), או קישור זמני אצל Resend
 * (מייל נכנס). הקישור לא יוצא לדפדפן — חוץ מקובץ גדול מדי להזרמה דרך השרת
 * (ראו `MAX_STREAMED_ATTACHMENT_BYTES`).
 */
export async function attachmentSource(
  access: ConversationAccess,
  emailId: string,
  attachmentId: string
): Promise<AttachmentSource | null> {
  const found = await attachmentOf(access, emailId, attachmentId);
  if (!found) return null;
  if (found.attachment.blob) return { kind: 'blob', pathname: found.attachment.blob, attachment: found.attachment };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !found.providerEmailId) return null;
  const { data, error } = await new Resend(apiKey).emails.receiving.attachments.get({
    emailId: found.providerEmailId,
    id: attachmentId,
  });
  if (!data?.download_url) {
    console.error(`[conversation] attachment ${attachmentId}: ${error?.name ?? 'unknown'}: ${error?.message ?? ''}`);
    return null;
  }
  return { kind: 'url', url: data.download_url, attachment: found.attachment };
}

/** הקובץ עצמו, נמשך בשרת — לשמירה בתיק */
export async function readAttachment(
  access: ConversationAccess,
  emailId: string,
  attachmentId: string
): Promise<{ bytes: Uint8Array; attachment: StoredAttachment } | null> {
  const source = await attachmentSource(access, emailId, attachmentId);
  if (!source) return null;
  if (source.kind === 'blob') {
    const bytes = await readStoredFile(source.pathname);
    return bytes ? { bytes, attachment: source.attachment } : null;
  }
  const response = await fetch(source.url, { cache: 'no-store' });
  if (!response.ok) return null;
  return { bytes: new Uint8Array(await response.arrayBuffer()), attachment: source.attachment };
}

export type SaveAttachmentResult =
  | { ok: true; planId: string; documentId: string }
  | { ok: false; status: number; error: string };

/** שמירת קובץ מצורף בתיק המסמכים של אחד התהליכים הפתוחים */
export async function saveAttachmentToPlan(
  access: ConversationAccess,
  emailId: string,
  attachmentId: string,
  planId: unknown
): Promise<SaveAttachmentResult> {
  const folders = await attachmentFolders(access);
  const folder = folders.find((item) => item.planId === planId) ?? (folders.length === 1 ? folders[0] : null);
  if (!folder) {
    return {
      ok: false,
      status: folders.length ? 400 : 409,
      error: folders.length ? 'בחרו לאיזה תהליך לשמור' : 'אין תהליך פתוח שאפשר לשמור בתיק שלו',
    };
  }

  const file = await readAttachment(access, emailId, attachmentId);
  if (!file) return { ok: false, status: 404, error: 'הקובץ לא נמצא אצל ספק המיילים' };
  if (!isAllowedDocumentType(file.attachment.contentType)) {
    return { ok: false, status: 415, error: 'אפשר לשמור בתיק רק PDF או תמונה' };
  }

  const doc = await storeFileInPlan(access.clientUserId, folder.planId, {
    key: attachmentDocumentKey(attachmentId),
    name: file.attachment.fileName.replace(/\.[a-z0-9]{2,5}$/i, '') || 'קובץ מהמייל',
    fileName: file.attachment.fileName,
    contentType: file.attachment.contentType,
    bytes: file.bytes,
  });
  if (!doc) return { ok: false, status: 413, error: 'הקובץ גדול מדי לתיק המסמכים (עד 15MB)' };
  return { ok: true, planId: folder.planId, documentId: doc.id };
}

/**
 * השם בכתובת האישית של הלקוח, ונוצר בפעם הראשונה שצריך אותו: לפי השם של
 * הלקוח (ראו mailboxNameSource), ועם מספר כשהשם כבר תפוס. לקוח שקיבל קודם
 * כתובת כללית (client2, כששם המשתמש שלו בעברית) מקבל עכשיו כתובת לפי השם שלו.
 */
async function ensureMailboxName(clientUserId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: clientUserId },
    select: { mailboxName: true, username: true, name: true, email: true },
  });
  if (!user) return null;
  if (user.mailboxName && !isFallbackMailboxName(user.mailboxName)) return user.mailboxName;
  const candidates = mailboxNameCandidates(mailboxNameSource(user), senderAddress(process.env.EMAIL_FROM));
  // אין שם טוב יותר — נשארים עם הכתובת הכללית שכבר יש
  if (user.mailboxName && isFallbackMailboxName(candidates[0])) return user.mailboxName;
  const current = user.mailboxName;
  const taken = new Set(
    (
      await prisma.user.findMany({ where: { mailboxName: { in: candidates } }, select: { mailboxName: true } })
    ).map((row) => row.mailboxName)
  );
  const free = candidates.filter((name) => !taken.has(name));
  // אחרי 20 שמות תפוסים — מספר אקראי
  free.push(`${candidates[0].replace(/\d+$/, '')}${Math.floor(1000 + Math.random() * 9000)}`);
  for (const name of free) {
    try {
      const { count } = await prisma.user.updateMany({ where: { id: clientUserId, mailboxName: current }, data: { mailboxName: name } });
      if (count === 1) return name;
      // נוצר במקביל בבקשה אחרת
      return (await prisma.user.findUnique({ where: { id: clientUserId }, select: { mailboxName: true } }))?.mailboxName ?? null;
    } catch (error) {
      // השם נתפס ברגע זה על ידי לקוח אחר — עוברים לבא
      if (!(error instanceof PrismaErrors.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
  }
  return null;
}

/** הכתובת האישית של הלקוח, אם קבלת מיילים מוגדרת — נוצרת בפעם הראשונה שצריך אותה */
export async function clientMailboxAddress(clientUserId: string): Promise<string | null> {
  const domain = inboundDomain();
  return domain ? mailboxAddress(await ensureMailboxName(clientUserId), domain) : null;
}

/** הקבצים יחד במייל יוצא — ספק המיילים מקבל עד 40MB, כולל הקידוד */
const MAX_OUTGOING_EMAIL_BYTES = 20 * 1024 * 1024;

export type SendEmailResult =
  | { ok: true; email: ConversationEmailView }
  | { ok: false; status: number; error: string };

export async function sendConversationEmail(
  access: ConversationAccess,
  input: { to: unknown; subject: unknown; text: unknown; files?: unknown }
): Promise<SendEmailResult> {
  const requested = Array.isArray(input.to) ? input.to.filter((item): item is string => typeof item === 'string') : [];
  const subject = cleanSubject(input.subject);
  const text = typeof input.text === 'string' ? input.text.trim().slice(0, MAX_EMAIL_LENGTH) : '';
  if (requested.length === 0 || !subject || !text) {
    return { ok: false, status: 400, error: 'נדרשים נמען, נושא ותוכן' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, status: 503, error: 'שליחת מיילים אינה מוגדרת כרגע' };

  const [contacts, sender] = await Promise.all([
    conversationContacts(access.clientUserId),
    prisma.user.findUnique({ where: { id: access.viewerId }, select: { name: true, email: true } }),
  ]);
  const { recipients, rejected } = allowedRecipients(requested, contacts);
  if (rejected.length > 0 || recipients.length === 0) {
    return { ok: false, status: 400, error: 'אפשר לשלוח רק לנמענים שברשימה. נמען חדש מוסיפים עם "הוספת נמען"' };
  }

  const refs = parseOutgoingFiles(input.files);
  if (!refs) return { ok: false, status: 400, error: 'אפשר לצרף עד 5 קבצים' };
  const resolved = await resolveOutgoingFiles(access, refs, MAX_OUTGOING_EMAIL_BYTES);
  if (!resolved.ok) return resolved;
  const outgoing: { filename: string; content: string; contentType: string }[] = [];
  for (const file of resolved.files) {
    const bytes = await readStoredFile(file.blob!);
    if (!bytes) return { ok: false, status: 404, error: `הקובץ ${file.fileName} לא נמצא. נסו לצרף אותו שוב` };
    outgoing.push({ filename: file.fileName, content: Buffer.from(bytes).toString('base64'), contentType: file.contentType });
  }

  const mailbox = await clientMailboxAddress(access.clientUserId);
  const senderEmail = normalizeEmail(sender?.email);
  const cc = carbonCopies(recipients, contacts);
  const to = recipients.map((item) => item.email);
  const systemAddress = senderAddress(process.env.EMAIL_FROM);

  const footer =
    access.viewerRole === 'CLIENT'
      ? `נשלח דרך ${appName()} בשם ${sender?.name || senderEmail}. תשובה למייל הזה תגיע אליו ואל השיחה שלו בפלטפורמה.`
      : `נשלח דרך ${appName()} על ידי היועץ המלווה. תשובה למייל הזה תגיע ליועץ ואל השיחה בפלטפורמה.`;

  /*
    לקוח שולח מהכתובת האישית שלו (igor.l@mashkalanta.com), כך שהבנק רואה
    כתובת אחת קבועה ועונה אליה. יועץ שולח מכתובת הפלטפורמה, עם הכתובת של
    הלקוח בתשובה — כדי שהשרשור יישאר בשיחה של הלקוח.
  */
  const asSystem = {
    from: `${senderDisplayName(sender?.name ?? null, access.viewerRole, appName())} <${systemAddress}>`,
    replyTo: [mailbox, isValidEmail(senderEmail) ? senderEmail : null].filter((item): item is string => Boolean(item)),
  };
  const asClient =
    access.viewerRole === 'CLIENT' && mailbox
      ? { from: `${(sender?.name || appName()).replace(/["<>\r\n]/g, '').trim()} <${mailbox}>`, replyTo: [] as string[] }
      : null;

  const resend = new Resend(apiKey);
  const attempt = (envelope: { from: string; replyTo: string[] }) =>
    resend.emails.send({
      from: envelope.from,
      to,
      ...(cc.length > 0 ? { cc } : {}),
      ...(envelope.replyTo.length > 0 ? { replyTo: envelope.replyTo } : {}),
      subject,
      text: `${text}\n\n—\n${footer}`,
      html: emailHtml(text, footer),
      ...(outgoing.length > 0 ? { attachments: outgoing } : {}),
    });

  let used = asClient ?? asSystem;
  let { data, error } = await attempt(used);
  if (asClient && (error || !data)) {
    // דומיין הכתובות האישיות עוד לא אומת לשליחה — שולחים מכתובת הפלטפורמה
    console.error('Conversation email from the client address failed, retrying from the platform address:', error);
    used = asSystem;
    ({ data, error } = await attempt(used));
  }
  if (error || !data) {
    console.error('Conversation email failed:', error);
    await deleteStoredFiles(resolved.files);
    return { ok: false, status: 502, error: 'המייל לא נשלח. נסו שוב בעוד רגע' };
  }
  const fromAddress = parseAddress(used.from).email;

  const now = new Date();
  const row = await prisma.conversationEmail.create({
    data: {
      clientUserId: access.clientUserId,
      direction: 'OUTBOUND',
      senderId: access.viewerId,
      senderRole: access.viewerRole,
      fromAddress: used === asClient ? fromAddress : isValidEmail(senderEmail) ? senderEmail : fromAddress,
      fromName: sender?.name ?? null,
      toAddresses: to,
      ccAddresses: cc,
      subject,
      text,
      bank: bankFor(to, contacts),
      providerId: `out:${data.id}`,
      ...(resolved.files.length > 0 ? { attachments: resolved.files as unknown as Prisma.InputJsonValue } : {}),
      ...(access.viewerRole === 'CLIENT' ? { readByClientAt: now } : { readByAdvisorAt: now }),
    },
  });
  return { ok: true, email: toEmailView(row, access.viewerRole) };
}

// ─────────────────────────────── מייל נכנס ───────────────────────────────

export interface InboundEvent {
  emailId: string;
  from: string;
  to: string[];
  cc: string[];
  receivedFor: string[];
  subject: string;
  messageId: string | null;
}

/** הלקוח שהכתובת האישית שלו בין הנמענים — לפי השם, או לפי המפתח בכתובת ישנה */
async function mailboxOwner(recipients: string[], domains: string[]) {
  for (const target of mailboxTargets(recipients, domains, senderAddress(process.env.EMAIL_FROM))) {
    const owner = await prisma.user.findFirst({
      where: target.legacyKey ? { mailboxKey: target.legacyKey } : { mailboxName: target.name },
      select: { id: true },
    });
    if (owner) return owner;
  }
  return null;
}

/** הכתובות שהשיחה כבר מכירה: מי שקיבל ממנה מייל, ומי ששלח אליה מייל שנכנס */
async function correspondentsOf(clientUserId: string): Promise<Set<string>> {
  const rows = await prisma.conversationEmail.findMany({
    where: { clientUserId, OR: [{ direction: 'OUTBOUND' }, { direction: 'INBOUND', held: false }] },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { direction: true, fromAddress: true, toAddresses: true, ccAddresses: true },
  });
  return new Set(
    rows
      .flatMap((row) => (row.direction === 'OUTBOUND' ? [...row.toAddresses, ...row.ccAddresses] : [row.fromAddress]))
      .map(normalizeEmail)
  );
}

/** מעבר לזה ביממה, מיילים משולחים לא מוכרים כבר לא נשמרים — הגנה מהצפה */
const MAX_HELD_PER_DAY = 30;

/**
 * מייל שהגיע לכתובת אישית של לקוח (דרך webhook של Resend). הגוף נמשך מה-API
 * של Resend, כי ה-webhook מחזיק רק את הכותרות. מייל משולח שהשיחה לא מכירה
 * נשמר כממתין לאישור הלקוח. מייל לכתובת כללית מועבר, ומייל שכבר נשמר מדולג.
 */
export async function ingestInboundEmail(event: InboundEvent): Promise<'stored' | 'held' | 'forwarded' | 'skipped'> {
  const domains = inboundDomains();
  const owner = await mailboxOwner([...event.receivedFor, ...event.to, ...event.cc], domains);
  // מייל לכתובת כללית בדומיין (info@, hello@) — או לכתובת שאינה של אף לקוח
  if (!owner) return (await forwardGeneralEmail(event, domains)) ? 'forwarded' : 'skipped';

  const providerId = `in:${event.emailId}`;
  const existing = await prisma.conversationEmail.findUnique({ where: { providerId }, select: { id: true } });
  if (existing) return 'skipped';

  // כשהתוכן לא נטען (מפתח בלי הרשאה, או ש-Resend עוד לא סיים לעבד), המייל נשמר
  // בלי תוכן ונטען שוב כשפותחים את טאב המיילים
  const content = await fetchInboundContent(event.emailId);

  const contacts = await conversationContacts(owner.id);
  const from = parseAddress(event.from);
  // הכתובות האישיות בדומיין הקבלה הן צנרת פנימית — לא נמענים שכדאי להציג
  const visible = (list: string[]) =>
    list.map((item) => parseAddress(item).email).filter((email) => !domains.some((host) => email.endsWith(`@${host}`)));
  const known = contacts.find((contact) => contact.email === from.email) ?? null;
  const held = !senderAllowed(from.email, contacts, await correspondentsOf(owner.id));
  if (held) {
    const recent = await prisma.conversationEmail.count({
      where: { clientUserId: owner.id, held: true, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (recent >= MAX_HELD_PER_DAY) {
      console.warn(`[conversation] inbound email from ${from.email} dropped: too many held emails for ${owner.id}`);
      return 'skipped';
    }
  }

  const row = await prisma.conversationEmail.create({
    data: {
      clientUserId: owner.id,
      direction: 'INBOUND',
      senderRole: known?.kind === 'CLIENT' ? 'CLIENT' : known?.kind === 'ADVISOR' ? 'ADVISOR' : null,
      fromAddress: from.email,
      fromName: from.name ?? known?.name ?? null,
      toAddresses: visible(event.to),
      ccAddresses: visible(event.cc),
      subject: cleanSubject(event.subject) || '(ללא נושא)',
      text: content ? inboundText(content.text) : '',
      ...(content ? { attachments: content.attachments as unknown as Prisma.InputJsonValue } : {}),
      bank: bankFor([event.from], contacts),
      providerId,
      messageId: event.messageId,
      held,
      // מייל שהלקוח עצמו העביר אינו "חדש" בשבילו
      ...(known?.kind === 'CLIENT' ? { readByClientAt: new Date() } : {}),
      ...(known?.kind === 'ADVISOR' ? { readByAdvisorAt: new Date() } : {}),
    },
  });
  await (held ? notifyHeldEmail(owner.id, row) : notifyInboundEmail(owner.id, row, known?.kind ?? null)).catch((error) =>
    console.error('[conversation] inbound email notification failed:', error)
  );
  return held ? 'held' : 'stored';
}

export type ReviewSenderResult = { ok: true; count: number } | { ok: false; status: number; error: string };

/**
 * החלטת הלקוח על שולח לא מוכר: אישור מכניס לשיחה את כל המיילים שלו שממתינים
 * (והבאים ייכנסו ישר), מחיקה מוחקת אותם. רק הלקוח מחליט.
 */
export async function reviewHeldSender(
  access: ConversationAccess,
  emailId: string,
  approve: boolean
): Promise<ReviewSenderResult> {
  if (access.viewerRole !== 'CLIENT') return { ok: false, status: 403, error: 'רק הלקוח מאשר שולחים' };
  const email = await prisma.conversationEmail.findFirst({
    where: { id: emailId, clientUserId: access.clientUserId, held: true, ...(approve ? {} : { archivedAt: null }) },
    select: { fromAddress: true },
  });
  if (!email) return { ok: false, status: 404, error: 'המייל לא נמצא' };
  const where = { clientUserId: access.clientUserId, held: true, fromAddress: email.fromAddress };
  // שולח שאושר — גם מה שנמחק ממנו חוזר לפיד

  if (!approve) {
    // כמו כל מחיקה מהפיד — לארכיון, ומשם אפשר למחוק לגמרי
    const { count } = await prisma.conversationEmail.updateMany({
      where: { ...where, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return { ok: true, count };
  }
  const rows = await prisma.conversationEmail.findMany({ where, orderBy: { createdAt: 'asc' } });
  await prisma.conversationEmail.updateMany({
    where: { id: { in: rows.map((row) => row.id) } },
    data: { held: false, archivedAt: null },
  });
  // עכשיו גם היועץ רואה אותם — ומקבל התראה אחת על האחרון
  const last = rows[rows.length - 1];
  if (last) {
    await notifyInboundEmail(access.clientUserId, last, 'CLIENT').catch((error) =>
      console.error('[conversation] approved email notification failed:', error)
    );
  }
  return { ok: true, count: rows.length };
}

/**
 * מייל משולח לא מוכר: הלקוח מקבל הודעה קצרה בלי התוכן — כדי שמייל התחזות לא
 * יגיע אליו מהדומיין של משכלנתא — ומאשר או מוחק בפלטפורמה.
 */
async function notifyHeldEmail(clientUserId: string, email: { fromAddress: string; fromName: string | null; subject: string }) {
  const client = await prisma.user.findUnique({ where: { id: clientUserId }, select: { email: true } });
  if (!client?.email) return;
  const origin = (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const from = email.fromName ? `${email.fromName} (${email.fromAddress})` : email.fromAddress;
  const text = `הגיע מייל לכתובת האישית שלכם ב${appName()} משולח שעוד לא מוכר לשיחה.\n\nמאת: ${from}\nנושא: ${email.subject}\n\nהמייל ממתין בטאב המיילים. אם אתם מכירים את השולח (למשל הבנק), אשרו אותו והמייל ייכנס לשיחה. אם לא — מחקו אותו.\n\n${origin}/dashboard#chat`;
  await sendEmail({ to: client.email, subject: `מייל ממתין לאישור: ${email.subject}`, text, html: emailHtml(text, appName()) });
}

/**
 * מייל שהגיע לכתובת האישית: הלקוח (והיועץ המלווה) מקבלים עליו מייל לתיבה
 * הרגילה שלהם, עם התוכן וקישור לשיחה. מי ששלח את המייל בעצמו לא מקבל התראה.
 */
async function notifyInboundEmail(
  clientUserId: string,
  email: { fromAddress: string; fromName: string | null; subject: string; text: string; attachments: Prisma.JsonValue | null },
  senderKind: ConversationContact['kind'] | null
) {
  const origin = (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const from = email.fromName ? `${email.fromName} (${email.fromAddress})` : email.fromAddress;
  const body = email.text ? (email.text.length > 1500 ? `${email.text.slice(0, 1500)}…` : email.text) : '';
  const files = storedAttachments(email.attachments).length;
  const filesLine = files ? `\n\nמצורפים ${files === 1 ? 'קובץ אחד' : `${files} קבצים`} — אפשר לצפות בהם ולשמור אותם בתיק המסמכים בפלטפורמה.` : '';

  const [client, advisor] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientUserId }, select: { name: true, email: true } }),
    advisorOf(clientUserId),
  ]);

  if (senderKind !== 'CLIENT' && client?.email) {
    const text = `הגיע מייל חדש לכתובת האישית שלכם ב${appName()}.\n\nמאת: ${from}\nנושא: ${email.subject}\n\n${body}${filesLine}\n\nכדי שהתשובה תישמר בשיחה ותצא מהכתובת האישית, ענו מהפלטפורמה: ${origin}/dashboard#chat`;
    await sendEmail({ to: client.email, subject: `מייל חדש: ${email.subject}`, text, html: emailHtml(text, appName()) });
  }
  if (senderKind !== 'ADVISOR' && advisor?.email) {
    const who = client?.name || client?.email || 'הלקוח';
    const text = `הגיע מייל חדש לשיחה של ${who}.\n\nמאת: ${from}\nנושא: ${email.subject}\n\n${body}${filesLine}\n\nלצפייה ולתשובה: ${origin}/advisor-dashboard`;
    await sendEmail({ to: advisor.email, subject: `מייל חדש אצל ${who}: ${email.subject}`, text, html: emailHtml(text, appName()) });
  }
}

/**
 * מייל לכתובת כללית בדומיין — info@, hello@, או תשובה למייל מערכת — מועבר
 * לכתובת שב-`EMAIL_FORWARD_TO`, עם השולח המקורי בשדה התשובה ועם הקבצים שצורפו.
 * כך שום מייל לדומיין לא הולך לאיבוד, גם כשכל הדומיין מקבל דרך Resend.
 */
async function forwardGeneralEmail(event: InboundEvent, domains: readonly string[]): Promise<boolean> {
  const target = normalizeEmail(process.env.EMAIL_FORWARD_TO);
  const apiKey = process.env.RESEND_API_KEY;
  const addressedTo = addressedToDomains([...event.receivedFor, ...event.to, ...event.cc], domains);
  if (!addressedTo || !apiKey || !isValidEmail(target)) {
    if (addressedTo) console.warn(`[conversation] email to ${addressedTo} dropped: EMAIL_FORWARD_TO is not set`);
    return false;
  }
  const original = parseAddress(event.from);
  // לא מעבירים מייל שנשלח מהכתובת שאליה מעבירים — כדי לא ליצור לולאה
  if (original.email === target) return false;

  const resend = new Resend(apiKey);
  const { data: email, error } = await resend.emails.receiving.get(event.emailId);
  if (!email) {
    console.error(`[conversation] forward ${event.emailId}: ${error?.name ?? 'unknown'}: ${error?.message ?? ''}`);
    return false;
  }

  const { attachments } = await attachmentsForSending(
    resend,
    event.emailId,
    (email.attachments ?? []).map((item) => ({ id: item.id, fileName: item.filename || 'attachment', contentType: item.content_type, size: item.size }))
  );

  const header = `הועבר מ${appName()}: מייל שנשלח ל-${addressedTo} מאת ${event.from}. "השב" יענה ישירות לשולח.`;
  const text = email.text?.trim() || (email.html ? htmlToText(email.html) : '');
  const { error: sendError } = await resend.emails.send({
    from: `${(original.name || original.email).replace(/["<>\r\n]/g, '')} דרך ${appName()} <${senderAddress(process.env.EMAIL_FROM)}>`,
    to: target,
    replyTo: original.email,
    subject: cleanSubject(event.subject) || '(ללא נושא)',
    text: `${header}\n\n${text}`,
    html: email.html
      ? `<p style="font-family:Arial,sans-serif;color:#64748b;font-size:13px;direction:rtl;">${escapeHtml(header)}</p><hr>${email.html}`
      : emailHtml(text, header),
    ...(attachments.length > 0 ? { attachments } : {}),
  });
  if (sendError) {
    console.error('[conversation] forward failed:', sendError);
    return false;
  }
  return true;
}

/** מעבר לזה יחד, קבצים לא מצורפים למייל שיוצא (העברה או גיבוי) */
const MAX_OUTGOING_ATTACHMENTS_BYTES = 10 * 1024 * 1024;

/**
 * הקבצים של מייל נכנס, מוכנים לצירוף למייל יוצא — עד 10MB יחד. `skipped` הם
 * הקבצים שלא נכנסו (גדולים מדי, או שלא נמצאו אצל ספק המיילים).
 */
async function attachmentsForSending(resend: Resend, providerEmailId: string, list: readonly StoredAttachment[]) {
  const attachments: { filename: string; content: string; contentType: string }[] = [];
  const skipped: string[] = [];
  let total = 0;
  for (const item of list) {
    if (total + item.size > MAX_OUTGOING_ATTACHMENTS_BYTES) {
      skipped.push(item.fileName);
      continue;
    }
    const { data: file } = await resend.emails.receiving.attachments.get({ emailId: providerEmailId, id: item.id });
    const response = file?.download_url ? await fetch(file.download_url, { cache: 'no-store' }) : null;
    if (!response?.ok) {
      skipped.push(item.fileName);
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    total += bytes.byteLength;
    attachments.push({ filename: item.fileName, content: bytes.toString('base64'), contentType: item.contentType });
  }
  return { attachments, skipped };
}

// ─────────────────────────── ארכיון ומחיקה ───────────────────────────

export type EmailActionResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * מחיקה מהפיד (לארכיון) או החזרה מהארכיון. הלקוח והיועץ המלווה — שניהם רואים
 * את אותו פיד. מייל שממתין לאישור השולח נשאר של הלקוח בלבד.
 */
export async function setEmailArchived(
  access: ConversationAccess,
  emailId: string,
  archived: boolean
): Promise<EmailActionResult> {
  const { count } = await prisma.conversationEmail.updateMany({
    where: {
      id: emailId,
      clientUserId: access.clientUserId,
      ...(access.viewerRole === 'ADVISOR' ? { held: false } : {}),
    },
    data: { archivedAt: archived ? new Date() : null },
  });
  return count === 1 ? { ok: true } : { ok: false, status: 404, error: 'המייל לא נמצא' };
}

/**
 * מחיקה לגמרי של מייל מהארכיון — השורה נמחקת ממסד הנתונים. רק הלקוח, בעל
 * השיחה, מוחק לגמרי. `backup` שולח קודם עותק לתיבה הפרטית שלו, עם הקבצים;
 * כשהגיבוי לא נשלח, המייל לא נמחק.
 */
export async function deleteEmailForever(
  access: ConversationAccess,
  emailId: string,
  backup: boolean
): Promise<EmailActionResult & { backupSkipped?: string[] }> {
  if (access.viewerRole !== 'CLIENT') return { ok: false, status: 403, error: 'רק הלקוח מוחק מיילים לגמרי' };
  const row = await prisma.conversationEmail.findFirst({
    where: { id: emailId, clientUserId: access.clientUserId, archivedAt: { not: null } },
  });
  if (!row) return { ok: false, status: 404, error: 'המייל לא נמצא בארכיון' };

  let backupSkipped: string[] | undefined;
  if (backup) {
    const sent = await sendEmailBackup(access.clientUserId, row);
    if (!sent.ok) return sent;
    backupSkipped = sent.skipped;
  }
  await prisma.conversationEmail.delete({ where: { id: row.id } });
  await deleteStoredFiles(storedAttachments(row.attachments));
  return { ok: true, ...(backupSkipped?.length ? { backupSkipped } : {}) };
}

async function sendEmailBackup(
  clientUserId: string,
  row: EmailRow & { providerId: string | null }
): Promise<{ ok: true; skipped: string[] } | { ok: false; status: number; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const client = await prisma.user.findUnique({ where: { id: clientUserId }, select: { email: true } });
  const to = normalizeEmail(client?.email);
  if (!apiKey || !isValidEmail(to)) return { ok: false, status: 503, error: 'אין לאן לשלוח גיבוי. המייל לא נמחק' };

  const resend = new Resend(apiKey);
  const files = storedAttachments(row.attachments);
  const inProvider = files.filter((item) => !item.blob);
  const { attachments, skipped } =
    row.providerId?.startsWith('in:') && inProvider.length > 0
      ? await attachmentsForSending(resend, row.providerId.slice(3), inProvider)
      : { attachments: [] as { filename: string; content: string; contentType: string }[], skipped: [] as string[] };
  // קבצים שצורפו מהפלטפורמה — מחנות הקבצים, באותה מגבלת גודל
  let total = attachments.reduce((sum, item) => sum + Math.floor((item.content.length * 3) / 4), 0);
  for (const item of files.filter((file) => file.blob)) {
    const bytes = total + item.size <= MAX_OUTGOING_ATTACHMENTS_BYTES ? await readStoredFile(item.blob!) : null;
    if (!bytes) {
      skipped.push(item.fileName);
      continue;
    }
    total += bytes.byteLength;
    attachments.push({ filename: item.fileName, content: Buffer.from(bytes).toString('base64'), contentType: item.contentType });
  }

  const when = new Intl.DateTimeFormat('he-IL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(
    row.createdAt
  );
  const lines = [
    `גיבוי של מייל מההתכתבות ב${appName()}, לפני שנמחק מהפלטפורמה.`,
    '',
    `מאת: ${row.fromName ? `${row.fromName} (${row.fromAddress})` : row.fromAddress}`,
    `אל: ${row.toAddresses.join(', ') || '—'}`,
    ...(row.ccAddresses.length > 0 ? [`העתק: ${row.ccAddresses.join(', ')}`] : []),
    `תאריך: ${when}`,
    `נושא: ${row.subject}`,
    ...(skipped.length > 0 ? [`קבצים שלא צורפו (גדולים מדי או לא זמינים): ${skipped.join(', ')}`] : []),
  ];
  const header = lines.join('\n');
  const { error } = await resend.emails.send({
    from: `${appName()} <${senderAddress(process.env.EMAIL_FROM)}>`,
    to,
    subject: `גיבוי: ${row.subject}`,
    text: `${header}\n\n${row.text}`,
    html: emailHtml(`${header}\n\n${row.text}`, appName()),
    ...(attachments.length > 0 ? { attachments } : {}),
  });
  if (error) {
    console.error('[conversation] email backup failed:', error);
    return { ok: false, status: 502, error: 'הגיבוי לא נשלח, ולכן המייל לא נמחק. נסו שוב בעוד רגע' };
  }
  return { ok: true, skipped };
}
