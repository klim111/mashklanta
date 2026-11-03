import { prisma } from './db';
import { advisorOwnsClient } from './advisor';
import { grantActive, grantedAccessOf } from './granted-access';
import type { GrantInput, GrantedAccess } from './granted-access';
import { listClientPaymentLinks } from './payment-links';
import type { PaymentLinkView } from './payment-links';

/**
 * הגישה בתשלום שהיועץ מגדיר ללקוח — קריאה וכתיבה (הכללים ב-src/lib/granted-access.ts).
 * השינוי נכתב על המשתמש של הלקוח, וכך הוא משנה את חותמת העדכון החי שלו
 * (src/lib/live-stamp.ts): האזור האישי נפתח או ננעל בלי ריפרש.
 */

const GRANT_SELECT = {
  paidAccessFrom: true,
  paidAccessUntil: true,
  paidAccessSetAt: true,
  paidAccessNote: true,
} as const;

export interface ClientPaymentSettings {
  client: { id: string; name: string; email: string; phone: string | null };
  /**
   * סוג הגישה ופרטי הכניסה (src/lib/client-invite.ts). `selfRegistered` — כרטיס
   * שנפתח אוטומטית ללקוח שנרשם לבד: ממילא בתשלום, ואין לו מה לבחור
   */
  account: {
    selfRegistered: boolean;
    selfPay: boolean;
    /** תיק שהיועץ פתח והלקוח עוד לא נכנס אליו */
    prospect: boolean;
    invitedAt: string | null;
    /** ללקוח כבר יש סיסמה או כניסה עם Google */
    canLogIn: boolean;
  };
  grant: GrantedAccess | null;
  links: PaymentLinkView[];
}

async function clientCard(advisorId: string, clientId: string) {
  if (!(await advisorOwnsClient(advisorId, clientId))) return null;
  return prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      phone: true,
      autoLinked: true,
      selfPay: true,
      prospect: true,
      invitedAt: true,
      user: { select: { email: true, hashedPassword: true, accounts: { select: { id: true }, take: 1 } } },
    },
  });
}

export async function getClientPaymentSettings(
  advisorId: string,
  clientId: string
): Promise<ClientPaymentSettings | null> {
  const card = await clientCard(advisorId, clientId);
  if (!card) return null;
  const [user, links] = await Promise.all([
    prisma.user.findUnique({ where: { id: card.userId }, select: GRANT_SELECT }),
    listClientPaymentLinks(card.id, card.user?.email || card.email),
  ]);
  return {
    // בתיק מתעניין, החשבון עוד על מייל פנימי — המייל של הלקוח רשום בתיק
    client: {
      id: card.id,
      name: card.name,
      email: card.prospect ? card.email : card.user?.email || card.email,
      phone: card.phone,
    },
    account: {
      selfRegistered: card.autoLinked,
      selfPay: card.selfPay,
      prospect: card.prospect,
      invitedAt: card.invitedAt?.toISOString() ?? null,
      canLogIn: Boolean(card.user?.hashedPassword || card.user?.accounts.length),
    },
    grant: user ? grantedAccessOf(user) : null,
    links,
  };
}

export async function setClientGrantedAccess(
  advisorId: string,
  clientId: string,
  input: GrantInput
): Promise<GrantedAccess | null> {
  const card = await clientCard(advisorId, clientId);
  if (!card) return null;
  const user = await prisma.user.update({
    where: { id: card.userId },
    data: {
      paidAccessFrom: input.from,
      paidAccessUntil: input.until,
      paidAccessSetAt: new Date(),
      paidAccessSetBy: advisorId,
      paidAccessNote: input.note,
    },
    select: GRANT_SELECT,
  });
  return grantedAccessOf(user);
}

/** ביטול הסימון כמשלם. תשלומים שהלקוח שילם בעצמו נשארים בתוקף */
export async function clearClientGrantedAccess(advisorId: string, clientId: string): Promise<boolean> {
  const card = await clientCard(advisorId, clientId);
  if (!card) return false;
  await prisma.user.update({
    where: { id: card.userId },
    data: {
      paidAccessFrom: null,
      paidAccessUntil: null,
      paidAccessSetAt: new Date(),
      paidAccessSetBy: advisorId,
      paidAccessNote: null,
    },
  });
  return true;
}

/** עד מתי פתוחה הגישה שהיועץ הגדיר למשתמש — null כשאין או שהסתיימה */
export async function activeGrantUntil(userId: string, now = new Date()): Promise<Date | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { paidAccessUntil: true } });
  return user?.paidAccessUntil && grantActive(user.paidAccessUntil, now) ? user.paidAccessUntil : null;
}
