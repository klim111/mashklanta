import { prisma } from './db';
import { authEmailShell, escapeHtml, sendEmail } from './email';
import { canonicalSiteOrigin } from './auth-url';
import { clientMailboxAddress } from './conversation-store';
import type { PlanKind } from './mortgage-plan';

/**
 * מיילי מערכת ללקוח: ברוכים הבאים אחרי ההרשמה, והסבר כשנפתח תהליך. יוצאים
 * מכתובת הפלטפורמה (`EMAIL_FROM`). כשל בשליחה לא עוצר את ההרשמה או את פתיחת
 * התהליך — הוא נכתב ללוג בלבד.
 */

const appName = () => process.env.PUBLIC_APP_NAME || 'משכלנתא';

function siteOrigin(): string {
  return (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
}

function button(href: string, label: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">${label}</a>
  </div>`;
}

function list(items: string[]): string {
  return `<ul style="margin:0 0 16px;padding:0 20px 0 0;">${items
    .map((item) => `<li style="margin:0 0 8px;">${item}</li>`)
    .join('')}</ul>`;
}

/** קטע הכתובת האישית — רק כשקבלת מיילים מוגדרת */
function mailboxBlock(address: string | null, lead: string): string {
  if (!address) return '';
  return `<div style="margin:0 0 16px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
    <div style="font-weight:700;margin:0 0 4px;">הכתובת האישית שלכם ב${escapeHtml(appName())}</div>
    <div dir="ltr" style="font-size:17px;font-weight:700;color:#1d4ed8;text-align:right;">${escapeHtml(address)}</div>
    <div style="color:#475569;font-size:14px;margin-top:6px;">${lead}</div>
  </div>`;
}

function plainText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '$2: $1')
    .replace(/<li[^>]*>/g, '• ')
    .replace(/<\/(p|div|li|ul)>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/^ /gm, '')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

async function clientOf(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
  return user?.role === 'CLIENT' && user.email ? user : null;
}

export function welcomeEmail({ name, mailbox, origin }: { name: string | null; mailbox: string | null; origin: string }) {
  const greeting = name ? `שלום ${escapeHtml(name)},` : 'שלום,';
  const body = `<p style="margin:0 0 12px;">${greeting}</p>
    <p style="margin:0 0 12px;">החשבון שלכם ב${escapeHtml(appName())} נפתח. כך ממשיכים מכאן:</p>
    ${list([
      '<strong>פותחים תהליך</strong> — משכנתא חדשה או מיחזור. התהליך מחולק לשלבים, ואפשר לעבור ביניהם בכל סדר.',
      '<strong>בונים תמהיל</strong> — חלוקת המשכנתא למסלולים.',
      '<strong>מבקשים אישורים עקרוניים</strong> מהבנקים, עם הטפסים שכבר מולאו בשבילכם.',
      '<strong>מתייעצים</strong> עם יועץ משכלנתא בצ\'אט שבפלטפורמה, בכל שלב.',
    ])}
    ${mailboxBlock(
      mailbox,
      'רשמו אותה בבקשות באתרי הבנקים. מיילים שיגיעו אליה יופיעו בפלטפורמה וגם בתיבה הרגילה שלכם.'
    )}
    ${button(`${origin}/dashboard`, 'כניסה לאזור האישי')}
    <p style="margin:0;color:#475569;font-size:14px;">יש שאלה? אפשר לכתוב לנו בצ'אט באזור האישי.</p>`;
  const html = authEmailShell('ברוכים הבאים', body);
  return { subject: `ברוכים הבאים ל${appName()}`, html, text: plainText(body) };
}

export function processStartEmail({
  name,
  planName,
  kind,
  mailbox,
  url,
}: {
  name: string | null;
  planName: string;
  kind: PlanKind;
  mailbox: string | null;
  url: string;
}) {
  const greeting = name ? `שלום ${escapeHtml(name)},` : 'שלום,';
  const refinance = kind === 'REFINANCE';
  const steps = refinance
    ? [
        '<strong>תמהיל חדש</strong> — בונים את התמהיל שיחליף את המשכנתא הקיימת, ורואים כמה הוא חוסך.',
        '<strong>אישורים עקרוניים</strong> — מבקשים הצעות מהבנק הנוכחי ומבנקים אחרים.',
        '<strong>מכרז</strong> — משווים את ההצעות ומשפרים אותן. כשעוברים לבנק אחר, נוספים גם שלבי ניתוח וחתימה.',
      ]
    : [
        '<strong>ניתוח</strong> — הכנסות, הון עצמי והנכס, וכמה משכנתא מתאימה לכם.',
        '<strong>תמהיל</strong> — בונים את חלוקת המסלולים.',
        '<strong>אישורים עקרוניים</strong> — מבקשים הצעות מכמה בנקים.',
        '<strong>מכרז</strong> — משווים את ההצעות ומשפרים אותן.',
        '<strong>חתימה</strong> — פתיחת תיק בבנק ובדיקת החוזה לפני החתימה.',
      ];
  const body = `<p style="margin:0 0 12px;">${greeting}</p>
    <p style="margin:0 0 12px;">פתחתם את התהליך <strong>${escapeHtml(planName)}</strong>${refinance ? ' למיחזור משכנתא' : ''}. אלה השלבים שלו:</p>
    ${list(steps)}
    <p style="margin:0 0 12px;">אפשר לפתוח כל שלב בכל סדר. כשחסר נתון, השלב יגיד מה חסר ואיפה ממלאים אותו.</p>
    <p style="margin:0 0 16px;">הריביות באישור עקרוני תקפות 24 יום מקבלת האישור, והפלטפורמה תתריע לפני שהתוקף נגמר.</p>
    ${mailboxBlock(
      mailbox,
      'כשאתם ממלאים בקשה לאישור עקרוני באתר של בנק, רשמו את הכתובת הזו כמייל ליצירת קשר. התשובות של הבנק יגיעו לתהליך וגם לתיבה שלכם.'
    )}
    ${button(url, 'המשך התהליך')}
    <p style="margin:0;color:#475569;font-size:14px;">רוצים עזרה? יועץ משכלנתא זמין בצ'אט, מכל מסך בפלטפורמה.</p>`;
  const html = authEmailShell(refinance ? 'נפתח תהליך מיחזור' : 'נפתח תהליך משכנתא', body);
  return { subject: `התהליך "${planName}" נפתח`, html, text: plainText(body) };
}

/** מייל ברוכים הבאים ללקוח שהחשבון שלו נפתח עכשיו */
export async function sendWelcomeEmail(userId: string): Promise<void> {
  try {
    const user = await clientOf(userId);
    if (!user) return;
    const mailbox = await clientMailboxAddress(userId);
    const message = welcomeEmail({ name: user.name, mailbox, origin: siteOrigin() });
    await sendEmail({ to: user.email!, ...message });
  } catch (error) {
    console.error('[client-emails] welcome email failed:', error);
  }
}

/** מייל הסבר ללקוח שפתח תהליך */
export async function sendProcessStartEmail(
  userId: string,
  plan: { id: string; name: string; kind: PlanKind }
): Promise<void> {
  try {
    const user = await clientOf(userId);
    if (!user) return;
    const mailbox = await clientMailboxAddress(userId);
    const message = processStartEmail({
      name: user.name,
      planName: plan.name,
      kind: plan.kind,
      mailbox,
      url: `${siteOrigin()}/dashboard/plans/${plan.id}`,
    });
    await sendEmail({ to: user.email!, ...message });
  } catch (error) {
    console.error('[client-emails] process start email failed:', error);
  }
}
