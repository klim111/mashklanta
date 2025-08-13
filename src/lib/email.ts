import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize Nodemailer transporter for SMTP
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransporter({
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

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  const from = process.env.EMAIL_FROM || 'noreply@nadlanium.com';
  const replyTo = process.env.EMAIL_REPLY_TO || 'support@nadlanium.com';

  // Try Resend first
  if (resend) {
    try {
      const result = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
        reply_to: replyTo,
      });
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Resend email error:', error);
    }
  }

  // Fallback to SMTP
  if (transporter) {
    try {
      const result = await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        replyTo,
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('SMTP email error:', error);
    }
  }

  // If no email service is configured, log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email would be sent:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', text || html.substring(0, 200) + '...');
    return { success: true, messageId: 'dev-' + Date.now() };
  }

  throw new Error('No email service configured');
}

// Email templates
export const emailTemplates = {
  welcomeEmail: (name: string, verificationUrl: string) => ({
    subject: `ברוכים הבאים ל-${process.env.PUBLIC_APP_NAME || 'Nadlanium'}!`,
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
            <h1>ברוכים הבאים ל-Nadlanium!</h1>
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
            <p>© 2024 Nadlanium. כל הזכויות שמורות.</p>
            <p>אם יש לך שאלות, אל תהסס <a href="mailto:${process.env.EMAIL_REPLY_TO}">ליצור איתנו קשר</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ברוכים הבאים ל-Nadlanium!
      
      שלום ${name || 'משתמש יקר'},
      
      תודה שנרשמת לשירות שלנו! כדי להשלים את תהליך ההרשמה, אנא אמת את כתובת המייל שלך:
      
      ${verificationUrl}
      
      הקישור תקף ל-24 שעות.
      
      אם לא ביקשת ליצור חשבון, אנא התעלם מהודעה זו.
      
      בברכה,
      צוות Nadlanium
    `
  }),

  passwordResetEmail: (name: string, resetUrl: string) => ({
    subject: 'איפוס סיסמה - Nadlanium',
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
      איפוס סיסמה - Nadlanium
      
      שלום ${name || 'משתמש יקר'},
      
      קיבלנו בקשה לאיפוס הסיסמה שלך. השתמש בקישור הבא:
      ${resetUrl}
      
      הקישור תקף לשעה אחת בלבד.
      
      אם לא ביקשת לאפס את הסיסמה, אנא התעלם מהודעה זו.
    `
  })
};