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

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  const from = process.env.EMAIL_FROM || 'noreply@nadlanium.com';
  const replyTo = process.env.EMAIL_REPLY_TO || 'support@nadlanium.com';
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
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const appName = () => process.env.PUBLIC_APP_NAME || 'משכלנתא';

/** מעטפת אחידה למיילי ההרשמה: RTL, פונט מערכת, כפתור כחול */
function authEmailShell(title: string, body: string): string {
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
  </div>
</body>
</html>`;
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
    username,
    verificationUrl,
    ttlMinutes,
  }: {
    name: string;
    email: string;
    username: string | null;
    verificationUrl: string;
    ttlMinutes: number;
  }) => {
    const greeting = name ? `שלום ${escapeHtml(name)},` : 'שלום,';
    const userLine = username ? `<br>שם משתמש: <strong>${escapeHtml(username)}</strong>` : '';
    return {
      subject: `אישור ההרשמה ל${appName()}`,
      html: authEmailShell(
        'אישור כתובת המייל',
        `<p style="margin:0 0 12px;">${greeting}</p>
         <p style="margin:0 0 12px;">התקבלה בקשה לפתוח חשבון לקוח עבור <strong dir="ltr">${escapeHtml(email)}</strong>.${userLine}</p>
         <p style="margin:0 0 20px;">החשבון ייפתח רק אחרי שתאשרו שהמייל הזה שלכם:</p>
         <div style="text-align:center;margin:0 0 20px;">
           <a href="${verificationUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">אישור ההרשמה</a>
         </div>
         <p style="margin:0 0 12px;color:#475569;font-size:14px;">הקישור תקף ל-${ttlMinutes} דקות ולשימוש אחד בלבד.</p>
         <p style="margin:0;color:#475569;font-size:14px;"><strong>לא אתם נרשמתם?</strong> אל תלחצו על הקישור. בלי אישור לא ייפתח חשבון, והבקשה תימחק מעצמה.</p>`
      ),
      text: `${name ? `שלום ${name},` : 'שלום,'}

התקבלה בקשה לפתוח חשבון לקוח ב${appName()} עבור ${email}.${username ? `\nשם משתמש: ${username}` : ''}

לאישור ההרשמה (תקף ל-${ttlMinutes} דקות, לשימוש אחד):
${verificationUrl}

לא אתם נרשמתם? אל תלחצו על הקישור. בלי אישור לא ייפתח חשבון.`,
    };
  },

  /** נשלח כשמנסים להירשם עם מייל שכבר רשום — במקום לחשוף זאת בטופס */
  accountExistsEmail: ({ loginUrl }: { loginUrl: string }) => ({
    subject: `כבר יש לכם חשבון ב${appName()}`,
    html: authEmailShell(
      'ניסיון הרשמה עם המייל שלכם',
      `<p style="margin:0 0 12px;">שלום,</p>
       <p style="margin:0 0 20px;">מישהו ניסה עכשיו להירשם עם כתובת המייל הזו, אבל כבר קיים עבורה חשבון. לא נפתח חשבון חדש.</p>
       <div style="text-align:center;margin:0 0 20px;">
         <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">כניסה לחשבון</a>
       </div>
       <p style="margin:0;color:#475569;font-size:14px;">אם זה לא הייתם אתם, אין צורך לעשות דבר. החשבון שלכם לא השתנה.</p>`
    ),
    text: `מישהו ניסה עכשיו להירשם עם כתובת המייל הזו, אבל כבר קיים עבורה חשבון. לא נפתח חשבון חדש.

לכניסה: ${loginUrl}

אם זה לא הייתם אתם, אין צורך לעשות דבר.`,
  }),

  welcomeEmail: (name: string, verificationUrl: string) => ({
    subject: `ברוכים הבאים ל-${process.env.PUBLIC_APP_NAME || 'משכלנתא'}!`,
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
            direction: rtl;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 40px 30px;
          }
          .button {
            display: inline-block;
            padding: 14px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
          }
          .logo {
            font-size: 40px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏠</div>
            <h1>ברוכים הבאים למשכלנתא!</h1>
          </div>
          <div class="content">
            <h2>שלום ${name || 'משתמש יקר'},</h2>
            <p>תודה שנרשמת לשירות שלנו! אנחנו שמחים שהצטרפת אלינו.</p>
            <p>כדי להשלים את תהליך ההרשמה ולהפעיל את החשבון שלך, אנא לחץ על הכפתור למטה:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">אמת את כתובת המייל</a>
            </div>
            <p>או העתק את הקישור הבא לדפדפן שלך:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
              ${verificationUrl}
            </p>
            <p><strong>הקישור תקף ל-24 שעות.</strong></p>
            <h3>מה הלאה?</h3>
            <ul>
              <li>גישה למחשבוני משכנתא מתקדמים</li>
              <li>שמירת החישובים שלך</li>
              <li>מעקב אחר המשכנתאות שלך</li>
              <li>קבלת עדכונים על שינויים בריביות</li>
            </ul>
            <p>אם לא ביקשת ליצור חשבון, אנא התעלם מהודעה זו.</p>
          </div>
          <div class="footer">
            <p>© 2024 משכלנתא. כל הזכויות שמורות.</p>
            <p>אם יש לך שאלות, אל תהסס <a href="mailto:${process.env.EMAIL_REPLY_TO}">ליצור איתנו קשר</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ברוכים הבאים למשכלנתא!
      
      שלום ${name || 'משתמש יקר'},
      
      תודה שנרשמת לשירות שלנו! כדי להשלים את תהליך ההרשמה, אנא אמת את כתובת המייל שלך:
      
      ${verificationUrl}
      
      הקישור תקף ל-24 שעות.
      
      אם לא ביקשת ליצור חשבון, אנא התעלם מהודעה זו.
      
      בברכה,
      צוות משכלנתא
    `
  }),

  passwordResetEmail: (name: string, resetUrl: string) => ({
    subject: 'איפוס סיסמה - משכלנתא',
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            direction: rtl;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .button {
            display: inline-block;
            padding: 14px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>איפוס סיסמה</h2>
          <p>שלום ${name || 'משתמש יקר'},</p>
          <p>קיבלנו בקשה לאיפוס הסיסמה שלך. לחץ על הכפתור למטה כדי ליצור סיסמה חדשה:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">איפוס סיסמה</a>
          </div>
          <p>הקישור תקף לשעה אחת בלבד.</p>
          <p>אם לא ביקשת לאפס את הסיסמה, אנא התעלם מהודעה זו.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      איפוס סיסמה - משכלנתא
      
      שלום ${name || 'משתמש יקר'},
      
      קיבלנו בקשה לאיפוס הסיסמה שלך. השתמש בקישור הבא:
      ${resetUrl}
      
      הקישור תקף לשעה אחת בלבד.
      
      אם לא ביקשת לאפס את הסיסמה, אנא התעלם מהודעה זו.
    `
  })
};