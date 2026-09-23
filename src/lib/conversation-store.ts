import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { prisma } from './db';
import { canonicalSiteOrigin } from './auth-url';
import { sendEmail } from './email';
import { parseStageData } from './mortgage-plan';
import {
  MAX_CHAT_LENGTH,
  MAX_EMAIL_LENGTH,
  allowedRecipients,
  bankFor,
  bankerContacts,
  carbonCopies,
  cleanSubject,
  emailHtml,
  htmlToText,
  isValidEmail,
  mailboxAddress,
  mailboxKeyFromAddresses,
  normalizeEmail,
  parseAddress,
  senderAddress,
  senderDisplayName,
  trimQuotedReply,
} from './conversation';
import type {
  AdvisorInboxRow,
  ChatMessageView,
  ConversationContact,
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

/** הדומיין שמקבל מיילים לשיחות. בלעדיו השליחה עובדת, והתשובות מגיעות רק לתיבה של הלקוח */
export function inboundDomain(): string | null {
  const value = (process.env.EMAIL_INBOUND_DOMAIN || '').trim().toLowerCase();
  return value || null;
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
  author: { select: { name: true } },
} as const;

type MessageRow = {
  id: string;
  authorRole: ConversationRole;
  body: string;
  createdAt: Date;
  readAt: Date | null;
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

export async function postChatMessage(
  access: ConversationAccess,
  rawBody: unknown
): Promise<ChatMessageView | null> {
  const body = typeof rawBody === 'string' ? rawBody.trim().slice(0, MAX_CHAT_LENGTH) : '';
  if (!body) return null;

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
    },
    select: messageSelect,
  });

  if (waiting === 0) void notifyNewMessage(access, body).catch(() => {});
  return toMessageView(row);
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
      ...(access.viewerRole === 'CLIENT' ? { readByClientAt: null } : { readByAdvisorAt: null }),
    },
  });
}

export async function conversationSummary(access: ConversationAccess): Promise<ConversationSummary> {
  const domain = inboundDomain();
  const [unreadChat, unreadEmails, advisor, key] = await Promise.all([
    prisma.conversationMessage.count({
      where: { clientUserId: access.clientUserId, authorRole: otherRole(access.viewerRole), readAt: null },
    }),
    unreadEmailCount(access),
    advisorOf(access.clientUserId),
    // ללקוח הכתובת נוצרת כבר עכשיו, כדי שיוכל להעביר אליה מייל שהבנק שלח לו ישירות
    domain && access.viewerRole === 'CLIENT'
      ? ensureMailboxKey(access.clientUserId)
      : prisma.user
          .findUnique({ where: { id: access.clientUserId }, select: { mailboxKey: true } })
          .then((user) => user?.mailboxKey ?? null),
  ]);
  return {
    unreadChat,
    unreadEmails,
    advisorName: advisor?.name ?? null,
    mailboxAddress: mailboxAddress(key, domain),
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
        OR: [{ conversationMessages: { some: {} } }, { conversationEmails: { some: {} } }],
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
      where: { clientUserId: { in: ids }, readByAdvisorAt: null },
      _count: { _all: true },
    }),
    prisma.conversationMessage.findMany({
      where: { clientUserId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      distinct: ['clientUserId'],
      select: { clientUserId: true, body: true, createdAt: true },
    }),
    prisma.conversationEmail.findMany({
      where: { clientUserId: { in: ids } },
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
  const [client, advisor, stages] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientUserId }, select: { name: true, email: true } }),
    advisorOf(clientUserId),
    prisma.mortgagePlanStage.findMany({
      where: { stage: 'APPLICATIONS', plan: { ownerId: clientUserId } },
      orderBy: { updatedAt: 'desc' },
      select: { dataJson: true },
    }),
  ]);

  const bankers = bankerContacts(
    stages.flatMap((row) => parseStageData('APPLICATIONS', row.dataJson).bankApprovals)
  );
  const contacts: ConversationContact[] = [...bankers];
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
  createdAt: Date;
  readByClientAt: Date | null;
  readByAdvisorAt: Date | null;
};

function toEmailView(row: EmailRow, viewer: ConversationRole): ConversationEmailView {
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
  };
}

/** המיילים של השיחה, מהחדש לישן. `unread` נשאר כפי שהיה לפני הפתיחה, כדי שיודגש פעם אחת */
export async function listConversationEmails(access: ConversationAccess): Promise<ConversationEmailView[]> {
  const rows = await prisma.conversationEmail.findMany({
    where: { clientUserId: access.clientUserId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const views = rows.map((row) => toEmailView(row, access.viewerRole));
  if (views.some((view) => view.unread)) {
    await prisma.conversationEmail.updateMany({
      where: {
        clientUserId: access.clientUserId,
        ...(access.viewerRole === 'CLIENT' ? { readByClientAt: null } : { readByAdvisorAt: null }),
      },
      data: access.viewerRole === 'CLIENT' ? { readByClientAt: new Date() } : { readByAdvisorAt: new Date() },
    });
  }
  return views;
}

/** המפתח של הכתובת האישית, ונוצר בפעם הראשונה שצריך אותו */
async function ensureMailboxKey(clientUserId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: clientUserId }, select: { mailboxKey: true } });
  if (user?.mailboxKey) return user.mailboxKey;
  const key = randomBytes(12).toString('hex');
  await prisma.user.update({ where: { id: clientUserId }, data: { mailboxKey: key } });
  return key;
}

export type SendEmailResult =
  | { ok: true; email: ConversationEmailView }
  | { ok: false; status: number; error: string };

export async function sendConversationEmail(
  access: ConversationAccess,
  input: { to: unknown; subject: unknown; text: unknown }
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
    return { ok: false, status: 400, error: 'אפשר לשלוח רק לבנקאי שהוזן בשלב האישור העקרוני, ליועץ או ללקוח' };
  }

  const domain = inboundDomain();
  const mailbox = domain ? mailboxAddress(await ensureMailboxKey(access.clientUserId), domain) : null;
  const senderEmail = normalizeEmail(sender?.email);
  const cc = carbonCopies(recipients, contacts);
  const replyTo = [mailbox, isValidEmail(senderEmail) ? senderEmail : null].filter(
    (item): item is string => Boolean(item)
  );
  const fromName = senderDisplayName(sender?.name ?? null, access.viewerRole, appName());
  const fromAddress = senderAddress(process.env.EMAIL_FROM);
  const to = recipients.map((item) => item.email);

  const footer =
    access.viewerRole === 'CLIENT'
      ? `נשלח דרך ${appName()} בשם ${sender?.name || senderEmail}. תשובה למייל הזה תגיע אליו ואל השיחה שלו בפלטפורמה.`
      : `נשלח דרך ${appName()} על ידי היועץ המלווה. תשובה למייל הזה תגיע ליועץ ואל השיחה בפלטפורמה.`;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to,
    ...(cc.length > 0 ? { cc } : {}),
    ...(replyTo.length > 0 ? { replyTo } : {}),
    subject,
    text: `${text}\n\n—\n${footer}`,
    html: emailHtml(text, footer),
  });
  if (error || !data) {
    console.error('Conversation email failed:', error);
    return { ok: false, status: 502, error: 'המייל לא נשלח. נסו שוב בעוד רגע' };
  }

  const now = new Date();
  const row = await prisma.conversationEmail.create({
    data: {
      clientUserId: access.clientUserId,
      direction: 'OUTBOUND',
      senderId: access.viewerId,
      senderRole: access.viewerRole,
      fromAddress: isValidEmail(senderEmail) ? senderEmail : fromAddress,
      fromName: sender?.name ?? null,
      toAddresses: to,
      ccAddresses: cc,
      subject,
      text,
      bank: bankFor(to, contacts),
      providerId: `out:${data.id}`,
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

/**
 * מייל שהגיע לכתובת אישית של לקוח (דרך webhook של Resend). הגוף נמשך מה-API
 * של Resend, כי ה-webhook מחזיק רק את הכותרות. מייל לכתובת שאינה של לקוח —
 * או שכבר נשמר — פשוט מדולג.
 */
export async function ingestInboundEmail(event: InboundEvent): Promise<'stored' | 'skipped'> {
  const domain = inboundDomain();
  const key = mailboxKeyFromAddresses([...event.receivedFor, ...event.to, ...event.cc], domain);
  if (!key) return 'skipped';

  const owner = await prisma.user.findUnique({ where: { mailboxKey: key }, select: { id: true } });
  if (!owner) return 'skipped';

  const providerId = `in:${event.emailId}`;
  const existing = await prisma.conversationEmail.findUnique({ where: { providerId }, select: { id: true } });
  if (existing) return 'skipped';

  let text = '';
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const { data } = await new Resend(apiKey).emails.receiving.get(event.emailId);
    text = data?.text?.trim() || (data?.html ? htmlToText(data.html) : '');
  }

  const contacts = await conversationContacts(owner.id);
  const from = parseAddress(event.from);
  // הכתובות האישיות בדומיין הקבלה הן צנרת פנימית — לא נמענים שכדאי להציג
  const visible = (list: string[]) =>
    list.map((item) => parseAddress(item).email).filter((email) => !email.endsWith(`@${domain}`));
  const known = contacts.find((contact) => contact.email === from.email) ?? null;

  await prisma.conversationEmail.create({
    data: {
      clientUserId: owner.id,
      direction: 'INBOUND',
      senderRole: known?.kind === 'CLIENT' ? 'CLIENT' : known?.kind === 'ADVISOR' ? 'ADVISOR' : null,
      fromAddress: from.email,
      fromName: from.name ?? known?.name ?? null,
      toAddresses: visible(event.to),
      ccAddresses: visible(event.cc),
      subject: cleanSubject(event.subject) || '(ללא נושא)',
      text: trimQuotedReply(text || '(המייל הגיע בלי תוכן טקסט)').slice(0, MAX_EMAIL_LENGTH),
      bank: bankFor([event.from], contacts),
      providerId,
      messageId: event.messageId,
      // מייל שהלקוח עצמו העביר אינו "חדש" בשבילו
      ...(known?.kind === 'CLIENT' ? { readByClientAt: new Date() } : {}),
      ...(known?.kind === 'ADVISOR' ? { readByAdvisorAt: new Date() } : {}),
    },
  });
  return 'stored';
}
