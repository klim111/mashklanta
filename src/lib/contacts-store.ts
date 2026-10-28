import { prisma } from './db';
import {
  MAX_CUSTOM_RECIPIENTS,
  RECIPIENT_ROLES,
  bankerContacts,
  isRecipientRole,
  isValidEmail,
  normalizeEmail,
} from './conversation';
import { parseStageData } from './mortgage-plan';
import { cleanPhone, contactRoleInfo } from './contact-roles';
import type { ContactView, ContactsPayload } from './contact-roles';
import { conversationAdvisor, isOwnAddress } from './conversation-store';
import type { ConversationAccess } from './conversation-store';

/**
 * אנשי הקשר של הלקוח — עורך הדין, השמאי, הבנקאי, סוכן הביטוח וכו׳.
 *
 * אלה אותן רשומות שמשמשות כנמענים בכלי המיילים (ConversationRecipient), כך
 * שאיש קשר שנוסף בטאב "אנשי הקשר" מופיע מיד בתיבת המיילים, ונמען שנוסף מתיבת
 * המיילים מופיע בטאב. איש קשר עם טלפון בלבד מופיע בטאב, ולא כנמען.
 * הבנקאים שהלקוח הזין בשלב האישור העקרוני מוצגים גם הם, ונערכים שם.
 */

export const EXPERT_JOIN_TOPIC = 'EXPERT_JOIN';

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/[\r\n<>"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export async function listContacts(access: ConversationAccess): Promise<ContactsPayload> {
  const [rows, stages, advisor, expert] = await Promise.all([
    prisma.conversationRecipient.findMany({ where: { clientUserId: access.clientUserId }, orderBy: { createdAt: 'asc' } }),
    prisma.mortgagePlanStage.findMany({
      where: { stage: 'APPLICATIONS', plan: { ownerId: access.clientUserId } },
      orderBy: { updatedAt: 'desc' },
      select: { dataJson: true },
    }),
    conversationAdvisor(access.clientUserId),
    prisma.advisorLead.findFirst({
      where: { ownerId: access.clientUserId, topic: EXPERT_JOIN_TOPIC, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  const contacts: ContactView[] = rows.map((row) => ({
    id: row.id,
    role: isRecipientRole(row.role) ? row.role : 'OTHER',
    name: row.name,
    email: row.email,
    phone: row.phone,
    bank: row.bank,
  }));
  const known = new Set(contacts.flatMap((item) => (item.email ? [item.email] : [])));
  const bankers = bankerContacts(stages.flatMap((row) => parseStageData('APPLICATIONS', row.dataJson).bankApprovals));
  for (const banker of bankers) {
    if (known.has(banker.email)) continue;
    contacts.push({
      id: `stage:${banker.email}`,
      role: 'BANKER',
      name: banker.name,
      email: banker.email,
      phone: null,
      bank: banker.bank,
      fromStage: true,
    });
  }

  return {
    contacts,
    advisor: advisor ? { name: advisor.name, email: advisor.email } : null,
    expertRequestedAt: expert?.createdAt.toISOString() ?? null,
  };
}

export type ContactResult = { ok: true; contact: ContactView } | { ok: false; status: number; error: string };

/**
 * הוספה או עדכון של איש קשר: תפקיד, שם, ומייל או טלפון (לפחות אחד). בלי שם —
 * שם התפקיד. `id` ריק — איש קשר חדש.
 */
export async function saveContact(
  access: ConversationAccess,
  input: { role: unknown; name: unknown; email: unknown; phone: unknown; bank: unknown },
  id?: string
): Promise<ContactResult> {
  if (!isRecipientRole(input.role)) return { ok: false, status: 400, error: 'בחרו תפקיד' };
  const role = input.role;
  const rawEmail = normalizeEmail(input.email);
  const email = rawEmail || null;
  const rawPhone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const phone = cleanPhone(rawPhone);
  if (email && !isValidEmail(email)) return { ok: false, status: 400, error: 'כתובת המייל אינה תקינה' };
  if (email && isOwnAddress(email)) return { ok: false, status: 400, error: 'זו כתובת של משכלנתא, לא של איש קשר' };
  if (rawPhone && !phone) return { ok: false, status: 400, error: 'מספר הטלפון אינו תקין' };
  if (!email && !phone) return { ok: false, status: 400, error: 'הזינו מייל או טלפון' };
  const name = cleanText(input.name, 80) || contactRoleInfo(role)?.title || RECIPIENT_ROLES[role];
  const bank = role === 'BANKER' ? cleanText(input.bank, 60) || null : null;

  if (email) {
    const duplicate = await prisma.conversationRecipient.findFirst({
      where: { clientUserId: access.clientUserId, email, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    if (duplicate) return { ok: false, status: 409, error: 'איש קשר עם המייל הזה כבר ברשימה' };
  }

  if (id) {
    const { count } = await prisma.conversationRecipient.updateMany({
      where: { id, clientUserId: access.clientUserId },
      data: { role, name, email, phone, bank },
    });
    if (count === 0) return { ok: false, status: 404, error: 'איש הקשר לא נמצא' };
    return { ok: true, contact: { id, role, name, email, phone, bank } };
  }

  const count = await prisma.conversationRecipient.count({ where: { clientUserId: access.clientUserId } });
  if (count >= MAX_CUSTOM_RECIPIENTS) {
    return { ok: false, status: 409, error: `אפשר לשמור עד ${MAX_CUSTOM_RECIPIENTS} אנשי קשר` };
  }
  const row = await prisma.conversationRecipient.create({
    data: { clientUserId: access.clientUserId, role, name, email, phone, bank, createdById: access.viewerId },
  });
  return { ok: true, contact: { id: row.id, role, name, email, phone, bank } };
}

/** אנשי הקשר בתפקיד מסוים — למשל עורך הדין, לשלב החתימה בבנק */
export async function contactsWithRole(clientUserId: string, role: string): Promise<ContactView[]> {
  const rows = await prisma.conversationRecipient.findMany({
    where: { clientUserId, role },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    role: isRecipientRole(row.role) ? row.role : 'OTHER',
    name: row.name,
    email: row.email,
    phone: row.phone,
    bank: row.bank,
  }));
}
