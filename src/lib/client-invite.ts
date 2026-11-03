import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { authEmailShell, emailButton, escapeHtml, sendEmail } from './email';
import { createInviteLink, INVITE_TTL_DAYS } from './password-reset';
import { isProspectEmail } from './prospect-email';

/**
 * לקוח שהיועץ רושם בעצמו מאזור היועץ.
 *
 * 1. היועץ פותח תיק (src/lib/prospect-client.ts) ועובד בכלים בשם הלקוח.
 * 2. "שליחת פרטי כניסה" (`sendClientInvite`): החשבון של התיק מקבל את המייל
 *    האמיתי של הלקוח, והלקוח מקבל במייל קישור לקביעת סיסמה. אחרי שקבע סיסמה
 *    הוא נכנס לאזור האישי ומוצא בו את כל מה שהיועץ הזין — אותו חשבון, בלי
 *    העברה. אם הלקוח נרשם בעצמו לפני כן, התיק עובר אליו כרגיל (`claimProspectFile`).
 * 3. סוג הגישה (`setClientSelfPay`): "בליווי" — הכלים פתוחים עד שהיועץ מסמן
 *    שהליווי הסתיים, או "בתשלום" — הכלים פתוחים לפי התקופה שהיועץ סימן כמשלם
 *    (src/lib/granted-access.ts), ואחריה הלקוח מתבקש לשלם מהאזור האישי כמו
 *    לקוח שנרשם לבד.
 */

const appName = () => process.env.PUBLIC_APP_NAME || 'משכלנתא';

export function inviteEmail({
  name,
  advisorName,
  email,
  url,
  ttlDays = INVITE_TTL_DAYS,
}: {
  name: string | null;
  advisorName: string | null;
  email: string;
  url: string;
  ttlDays?: number;
}) {
  const greeting = name ? `שלום ${escapeHtml(name)},` : 'שלום,';
  const who = advisorName ? `${escapeHtml(advisorName)} פתח/ה` : 'פתחנו';
  const body = `<p style="margin:0 0 12px;">${greeting}</p>
    <p style="margin:0 0 12px;">${who} לכם חשבון ב${escapeHtml(appName())}. כל מה שכבר הוזן בתיק שלכם מחכה לכם באזור האישי.</p>
    <p style="margin:0 0 4px;">כדי להיכנס, בחרו סיסמה:</p>
    ${emailButton(url, 'בחירת סיסמה וכניסה')}
    <p style="margin:0 0 12px;">מכאן והלאה נכנסים עם המייל <strong dir="ltr">${escapeHtml(email)}</strong> והסיסמה שבחרתם.</p>
    <p style="margin:0;color:#475569;font-size:14px;">הקישור תקף ל-${ttlDays} ימים ולשימוש אחד. פג תוקפו? בעמוד הכניסה לוחצים "שכחתי סיסמה" עם אותו מייל.</p>`;
  const text = `${name ? `שלום ${name},` : 'שלום,'}

${advisorName ? `${advisorName} פתח/ה` : 'פתחנו'} לכם חשבון ב${appName()}. כל מה שכבר הוזן בתיק שלכם מחכה לכם באזור האישי.

לבחירת סיסמה וכניסה: ${url}

מכאן והלאה נכנסים עם המייל ${email} והסיסמה שבחרתם.
הקישור תקף ל-${ttlDays} ימים ולשימוש אחד.`;
  return {
    subject: `החשבון שלכם ב${appName()} מוכן`,
    html: authEmailShell('פרטי הכניסה לאזור האישי', body),
    text,
  };
}

export type InviteResult =
  | { status: 'sent'; email: string; invitedAt: string }
  | { status: 'not-found' }
  /** אין לתיק מייל אמיתי לשלוח אליו */
  | { status: 'no-email' }
  /** יש כבר חשבון אחר עם המייל הזה — התיק יעבור אליו בכניסה הבאה שלו */
  | { status: 'registered'; email: string }
  | { status: 'email-failed'; email: string; url: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** שליחת פרטי הכניסה ללקוח שהיועץ פתח לו תיק. בטוח לשליחה חוזרת: הקישור הקודם מתבטל */
export async function sendClientInvite(
  advisorId: string,
  clientId: string,
  requestOrigin?: string | null
): Promise<InviteResult> {
  const card = await prisma.client.findFirst({
    where: { id: clientId, advisorId },
    select: {
      id: true,
      name: true,
      email: true,
      prospect: true,
      userId: true,
      user: { select: { email: true, role: true } },
      advisor: { select: { name: true } },
    },
  });
  if (!card || card.user.role !== 'CLIENT') return { status: 'not-found' };

  const email = (card.prospect ? card.email : card.user.email || card.email).trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || isProspectEmail(email)) return { status: 'no-email' };

  if (card.prospect && card.user.email?.toLowerCase() !== email) {
    // החשבון של התיק עובר מהמייל הפנימי למייל של הלקוח — כך הוא נכנס אליו
    const other = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, NOT: { id: card.userId } },
      select: { id: true },
    });
    if (other) return { status: 'registered', email };
    try {
      await prisma.user.update({ where: { id: card.userId }, data: { email } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { status: 'registered', email };
      }
      throw error;
    }
  }

  const url = await createInviteLink(card.userId, requestOrigin);
  const message = inviteEmail({ name: card.name, advisorName: card.advisor.name, email, url });
  const result = await sendEmail({ to: email, ...message });
  if (!result.success) {
    if (process.env.NODE_ENV !== 'production') console.info(`[client-invite] link for ${email}: ${url}`);
    return { status: 'email-failed', email, url };
  }
  const invitedAt = new Date();
  await prisma.client.update({ where: { id: card.id }, data: { invitedAt } });
  return { status: 'sent', email, invitedAt: invitedAt.toISOString() };
}

/**
 * סוג הגישה של הלקוח: true — בתשלום לפי תקופה, false — בליווי. כרטיס שנפתח
 * אוטומטית ללקוח שנרשם לבד ממילא אינו ליווי, ולכן אין בו מה לשנות. העדכון משנה
 * את חותמת העדכון החי של הכרטיס (src/lib/live-stamp.ts), והאזור האישי של הלקוח
 * נפתח או ננעל בלי ריפרש.
 */
export async function setClientSelfPay(advisorId: string, clientId: string, selfPay: boolean): Promise<boolean> {
  const { count } = await prisma.client.updateMany({
    where: { id: clientId, advisorId, autoLinked: false },
    data: { selfPay },
  });
  return count > 0;
}
