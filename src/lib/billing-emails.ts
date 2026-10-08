import { authEmailShell, escapeHtml } from './email';

/**
 * המיילים של החיוב: אישור תשלום (עם מספר החשבונית), ותזכורת לקראת סוף החודש
 * עם קישור לחידוש. התוכן נבנה כאן בלי לשלוח, כדי שאפשר לבדוק אותו.
 */

const appName = () => process.env.PUBLIC_APP_NAME || 'משכלנתא';

/** "8 בנובמבר 2026" לפי שעון ישראל */
export function hebrewDate(at: Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(at);
}

function button(href: string, label: string): string {
  return `<div style="text-align:center;margin:0 0 20px;">
           <a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">${label}</a>
         </div>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#475569;">${label}</td><td style="padding:6px 0;font-weight:700;">${value}</td></tr>`;
}

export interface PaymentConfirmationInput {
  name: string | null;
  amount: number;
  paidAt: Date;
  accessUntil: Date;
  invoiceNumber: string | null;
  last4: string;
  renewal: boolean;
  dashboardUrl: string;
}

/** אישור רישום ותשלום — נשלח מיד אחרי שהתשלום אומת מול HYP */
export function paymentConfirmationEmail(input: PaymentConfirmationInput) {
  const greeting = input.name ? `שלום ${escapeHtml(input.name)},` : 'שלום,';
  const what = input.renewal ? 'חידוש הגישה לחודש נוסף' : 'ההרשמה למסלול העצמאי / ההיברידי';
  const invoiceNote = input.invoiceNumber
    ? `חשבונית מס/קבלה מספר ${escapeHtml(input.invoiceNumber)} נשלחה אליכם במייל נפרד ממערכת הסליקה HYP.`
    : 'חשבונית מס/קבלה תישלח אליכם במייל נפרד ממערכת הסליקה HYP.';
  const accessUntil = hebrewDate(input.accessUntil);
  return {
    subject: input.renewal ? `הגישה ל${appName()} חודשה` : `אישור ההרשמה והתשלום ב${appName()}`,
    html: authEmailShell(
      input.renewal ? 'הגישה חודשה' : 'אישור הרשמה ותשלום',
      `<p style="margin:0 0 12px;">${greeting}</p>
         <p style="margin:0 0 16px;">התשלום על ${what} התקבל. כל השלבים וכל הכלים פתוחים בפניכם.</p>
         <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:15px;">
           ${row('סכום', `₪${input.amount}`)}
           ${row('תאריך התשלום', hebrewDate(input.paidAt))}
           ${row('הגישה פתוחה עד', accessUntil)}
           ${input.last4 ? row('כרטיס', `<span dir="ltr">**** ${escapeHtml(input.last4)}</span>`) : ''}
           ${input.invoiceNumber ? row('מספר חשבונית', escapeHtml(input.invoiceNumber)) : ''}
         </table>
         <p style="margin:0 0 20px;color:#475569;font-size:14px;">${invoiceNote}</p>
         ${button(input.dashboardUrl, 'לאזור האישי')}
         <p style="margin:0;color:#475569;font-size:14px;">אין חיוב חוזר אוטומטי. לקראת סוף החודש נשלח לכם תזכורת, ואתם מחליטים אם להמשיך.</p>`
    ),
    text: `${input.name ? `שלום ${input.name},` : 'שלום,'}

התשלום על ${what} התקבל.
סכום: ₪${input.amount}
הגישה פתוחה עד: ${accessUntil}
${invoiceNote}

לאזור האישי: ${input.dashboardUrl}

אין חיוב חוזר אוטומטי. לקראת סוף החודש נשלח לכם תזכורת, ואתם מחליטים אם להמשיך.`,
  };
}

export interface RenewalReminderInput {
  name: string | null;
  accessUntil: Date;
  daysLeft: number;
  price: number;
  renewUrl: string;
}

/** תזכורת לקראת סוף החודש, עם קישור לאישור החידוש */
export function renewalReminderEmail(input: RenewalReminderInput) {
  const greeting = input.name ? `שלום ${escapeHtml(input.name)},` : 'שלום,';
  const accessUntil = hebrewDate(input.accessUntil);
  const when = input.daysLeft <= 1 ? 'מחר' : `בעוד ${input.daysLeft} ימים`;
  return {
    subject: `חודש הגישה ב${appName()} מסתיים ${when}`,
    html: authEmailShell(
      'חודש הגישה מסתיים בקרוב',
      `<p style="margin:0 0 12px;">${greeting}</p>
         <p style="margin:0 0 12px;">חודש הגישה שלכם לפלטפורמה מסתיים ב-<strong>${accessUntil}</strong>. אחרי התאריך הזה הכלים ננעלים לעריכה, וכל מה שהזנתם נשמר.</p>
         <p style="margin:0 0 20px;">צריכים עוד זמן? אפשר לחדש לחודש נוסף ב-₪${input.price}. החיוב מתבצע רק אחרי שתאשרו ותשלמו בעמוד התשלום המאובטח.</p>
         ${button(input.renewUrl, 'אישור חידוש לחודש נוסף')}
         <p style="margin:0;color:#475569;font-size:14px;">סיימתם? אין צורך לעשות דבר. אין חיוב חוזר אוטומטי.</p>`
    ),
    text: `${input.name ? `שלום ${input.name},` : 'שלום,'}

חודש הגישה שלכם ב${appName()} מסתיים ב-${accessUntil}.
לחידוש לחודש נוסף ב-₪${input.price} (החיוב רק אחרי שתאשרו):
${input.renewUrl}

סיימתם? אין צורך לעשות דבר. אין חיוב חוזר אוטומטי.`,
  };
}
