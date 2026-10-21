import { SITE_CONTACT } from './site-contact';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize Nodemailer transporter for SMTP
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return null;
};

const transporter = createTransporter();

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** לאן תגיע תשובה למייל — למשל ללקוח שפנה ליועץ. ברירת המחדל: כתובת הקשר */
  replyTo?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Email send timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function sendEmail({ to, subject, html, text, replyTo: replyToOverride }: EmailOptions) {
  // בלי EMAIL_FROM המייל יוצא מהדומיין המאומת של משכלנתא לשליחה (mashkalanta.co.il)
  const from = process.env.EMAIL_FROM || `${SITE_CONTACT.brand} <noreply@mashkalanta.co.il>`;
  // תשובה למייל מערכת מגיעה לכתובת הקשר של משכלנתא (info@)
  const replyTo = replyToOverride || process.env.EMAIL_REPLY_TO || SITE_CONTACT.email;
  const timeoutMs = 8000;

  // Try Resend first
  if (resend) {
    try {
      const result = await withTimeout(
        resend.emails.send({
          from,
          to,
          subject,
          html,
          text,
          replyTo,
        }),
        timeoutMs
      );
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Resend email error:', error);
    }
  }

  // Fallback to SMTP
  if (transporter) {
    try {
      const result = await withTimeout(
        transporter.sendMail({
          from,
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''),
          replyTo,
        }),
        timeoutMs
      );
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('SMTP email error:', error);
    }
  }

  // בלי שירות מייל מוגדר ההרשמה עדיין חייבת להצליח — המשתמש כבר נשמר במסד
  console.warn('No email service configured; skipped send to', to);
  return { success: false, messageId: 'skipped' };
}

/** בריחה של טקסט שהמשתמש הקליד (שם, שם משתמש) לפני שהוא נכנס ל-HTML של מייל */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const appName = () => process.env.PUBLIC_APP_NAME || 'משכלנתא';

/** כפתור כחול למיילים — קישור אמיתי, לא טקסט שתלוי בזיהוי אוטומטי של תוכנת המייל */
export function emailButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">${label}</a>
  </div>`;
}

/** מעטפת אחידה למיילי המערכת: RTL, פונט מערכת, כפתור כחול, ופרטי הקשר בתחתית */
export function authEmailShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Assistant,Arial,sans-serif;direction:rtl;color:#0f172a;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#2563eb;color:#ffffff;padding:24px 28px;">
      <div style="font-size:20px;font-weight:700;">${escapeHtml(appName())}</div>
      <div style="font-size:15px;opacity:.9;margin-top:4px;">${title}</div>
    </div>
    <div style="padding:28px;font-size:15px;line-height:1.7;">${body}</div>
    <div style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;">
      שאלות? ${escapeHtml(SITE_CONTACT.brand)} — <a href="${SITE_CONTACT.phoneHref}" style="color:#2563eb;text-decoration:none;" dir="ltr">${SITE_CONTACT.phone}</a> · <a href="${SITE_CONTACT.emailHref}" style="color:#2563eb;text-decoration:none;" dir="ltr">${SITE_CONTACT.email}</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * התראה קצרה ללקוח (הודעה בצ'אט, מייל שהגיע לכתובת האישית): הטקסט כפי שהוא,
 * ואחריו כפתור לפלטפורמה — באותה מעטפת של שאר מיילי הלקוח.
 */
export function clientNoticeEmail({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href: string;
  label: string;
}): { html: string; text: string } {
  const body = `<div>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</div>${emailButton(href, escapeHtml(label))}`;
  return {
    html: authEmailShell(escapeHtml(title), body),
    text: `${text}\n\n${label}: ${href}\n\nשאלות? ${SITE_CONTACT.phone} · ${SITE_CONTACT.email}`,
  };
}

// Email templates
export const emailTemplates = {
  /**
   * קישור אימות להרשמה. מציין למי ומתי נפתח החשבון, ומבקש לא ללחוץ אם לא
   * אתם נרשמתם — כך בעל המייל מזהה הרשמה שמישהו אחר פתח בשמו.
   */
  verificationEmail: ({
    name,
    email,
    verificationUrl,
    ttlMinutes,
  }: {
    name: string;
    email: string;
    verificationUrl: string;
    ttlMinutes: number;
  }) => {
    const greeting = name ? `שלום ${escapeHtml(name)},` : 'שלום,';
    return {
      subject: `אישור ההרשמה ל${appName()}`,
      html: authEmailShell(
        'אישור כתובת המייל',
        `<p style="margin:0 0 12px;">${greeting}</p>
         <p style="margin:0 0 12px;">התקבלה בקשה לפתוח חשבון לקוח עבור <strong dir="ltr">${escapeHtml(email)}</strong>.</p>
         <p style="margin:0 0 20px;">החשבון ייפתח רק אחרי שתאשרו שהמייל הזה שלכם:</p>
         <div style="text-align:center;margin:0 0 20px;">
           <a href="${verificationUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">אישור ההרשמה</a>
         </div>
         <p style="margin:0 0 12px;color:#475569;font-size:14px;">הקישור תקף ל-${ttlMinutes} דקות ולשימוש אחד בלבד.</p>
         <p style="margin:0;color:#475569;font-size:14px;"><strong>לא אתם נרשמתם?</strong> אל תלחצו על הקישור. בלי אישור לא ייפתח חשבון, והבקשה תימחק מעצמה.</p>`
      ),
      text: `${name ? `שלום ${name},` : 'שלום,'}

התקבלה בקשה לפתוח חשבון לקוח ב${appName()} עבור ${email}.

לאישור ההרשמה (תקף ל-${ttlMinutes} דקות, לשימוש אחד):
${verificationUrl}

לא אתם נרשמתם? אל תלחצו על הקישור. בלי אישור לא ייפתח חשבון.`,
    };
  },

  /** קישור לבחירת סיסמה חדשה, מעמוד "שכחתי סיסמה" */
  passwordResetEmail: ({
    name,
    resetUrl,
    ttlMinutes,
  }: {
    name: string | null;
    resetUrl: string;
    ttlMinutes: number;
  }) => {
    const greeting = name ? `שלום ${escapeHtml(name)},` : 'שלום,';
    return {
      subject: `בחירת סיסמה חדשה ל${appName()}`,
      html: authEmailShell(
        'בחירת סיסמה חדשה',
        `<p style="margin:0 0 12px;">${greeting}</p>
         <p style="margin:0 0 20px;">התקבלה בקשה לאפס את הסיסמה של החשבון שלכם. לבחירת סיסמה חדשה:</p>
         <div style="text-align:center;margin:0 0 20px;">
           <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">בחירת סיסמה חדשה</a>
         </div>
         <p style="margin:0 0 12px;color:#475569;font-size:14px;">הקישור תקף ל-${ttlMinutes} דקות ולשימוש אחד בלבד.</p>
         <p style="margin:0;color:#475569;font-size:14px;"><strong>לא ביקשתם?</strong> אין צורך לעשות דבר. הסיסמה הנוכחית שלכם לא השתנתה.</p>`
      ),
      text: `${name ? `שלום ${name},` : 'שלום,'}

התקבלה בקשה לאפס את הסיסמה של החשבון שלכם ב${appName()}.

לבחירת סיסמה חדשה (תקף ל-${ttlMinutes} דקות, לשימוש אחד):
${resetUrl}

לא ביקשתם? אין צורך לעשות דבר. הסיסמה הנוכחית שלכם לא השתנתה.`,
    };
  },

  /** קישור הכניסה הנסתרת של היועץ. עובד רק בדפדפן שביקש אותו */
  advisorLoginEmail: ({ loginUrl, ttlMinutes }: { loginUrl: string; ttlMinutes: number }) => ({
    subject: `קישור כניסה לאזור היועץ ב${appName()}`,
    html: authEmailShell(
      'כניסה לאזור היועץ',
      `<p style="margin:0 0 20px;">התבקש קישור כניסה לאזור היועץ. לכניסה:</p>
       <div style="text-align:center;margin:0 0 20px;">
         <a href="${loginUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">כניסה לאזור היועץ</a>
       </div>
       <p style="margin:0 0 12px;color:#475569;font-size:14px;">הקישור תקף ל-${ttlMinutes} דקות, לשימוש אחד, ועובד רק באותו דפדפן שבו ביקשת אותו.</p>
       <p style="margin:0;color:#475569;font-size:14px;"><strong>לא ביקשת?</strong> אל תפתח את הקישור. בלי הדפדפן שביקש אותו הוא לא מכניס אף אחד.</p>`
    ),
    text: `התבקש קישור כניסה לאזור היועץ ב${appName()}.

לכניסה (תקף ל-${ttlMinutes} דקות, לשימוש אחד, רק באותו דפדפן שבו ביקשת אותו):
${loginUrl}

לא ביקשת? אל תפתח את הקישור.`,
  }),

  /** הודעה אחרי כל כניסה לאזור היועץ */
  advisorLoginNotice: ({ when, ip, userAgent }: { when: Date; ip: string; userAgent: string | null }) => {
    const time = new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Jerusalem',
    }).format(when);
    const device = userAgent ? escapeHtml(userAgent.slice(0, 200)) : 'לא ידוע';
    return {
      subject: `נכנסת לאזור היועץ ב${appName()}`,
      html: authEmailShell(
        'כניסה לאזור היועץ',
        `<p style="margin:0 0 12px;">בוצעה כניסה לאזור היועץ.</p>
         <p style="margin:0 0 4px;color:#475569;font-size:14px;">מתי: ${time}</p>
         <p style="margin:0 0 4px;color:#475569;font-size:14px;">כתובת IP: ${escapeHtml(ip)}</p>
         <p style="margin:0 0 16px;color:#475569;font-size:14px;">דפדפן: ${device}</p>
         <p style="margin:0;color:#475569;font-size:14px;">אם זה לא היית אתה, החלף מיד את הסיסמה של תיבת המייל הזו.</p>`
      ),
      text: `בוצעה כניסה לאזור היועץ.
מתי: ${time}
כתובת IP: ${ip}
דפדפן: ${userAgent ?? 'לא ידוע'}

אם זה לא היית אתה, החלף מיד את הסיסמה של תיבת המייל הזו.`,
    };
  },
};