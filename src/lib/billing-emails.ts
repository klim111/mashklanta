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

export interface AdvisoryEndedInput {
  name: string | null;
  planName: string;
  price: number;
  continueUrl: string;
  dashboardUrl: string;
}

/** הליווי בתהליך הסתיים — הצעה להמשיך לעבוד בכלים לבד, במחיר החודשי */
export function advisoryEndedEmail(input: AdvisoryEndedInput) {
  const greeting = input.name ? `שלום ${escapeHtml(input.name)},` : 'שלום,';
  return {
    subject: `הליווי בתהליך הסתיים · אפשר להמשיך ב${appName()} ב-₪${input.price} לחודש`,
    html: authEmailShell(
      'הליווי בתהליך הסתיים',
      `<p style="margin:0 0 12px;">${greeting}</p>
         <p style="margin:0 0 12px;">היועץ סימן שהליווי בתהליך <strong>${escapeHtml(input.planName)}</strong> הסתיים. תודה שבחרתם בנו!</p>
         <p style="margin:0 0 20px;">כל מה שהוזן בתהליך שמור. רוצים להמשיך לעבוד בכלים ובמחשבונים? ממשיכים במסלול העצמאי ב-₪${input.price} לחודש. החיוב מתבצע רק אחרי שתאשרו ותשלמו בעמוד התשלום המאובטח.</p>
         ${button(input.continueUrl, `להמשך ב-₪${input.price} לחודש`)}
         <p style="margin:0;color:#475569;font-size:14px;">לא צריכים יותר את הכלים? אין צורך לעשות דבר. התהליך נשאר שמור באזור האישי: <a href="${input.dashboardUrl}" style="color:#2563eb;">לאזור האישי</a></p>`
    ),
    text: `${input.name ? `שלום ${input.name},` : 'שלום,'}

היועץ סימן שהליווי בתהליך ${input.planName} הסתיים. כל מה שהוזן שמור.
רוצים להמשיך לעבוד בכלים? ממשיכים במסלול העצמאי ב-₪${input.price} לחודש (החיוב רק אחרי שתאשרו):
${input.continueUrl}

לא צריכים יותר את הכלים? אין צורך לעשות דבר.`,
  };
}

function money(amount: number): string {
  return `₪${amount.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
}

export interface PaymentLinkEmailInput {
  name: string | null;
  title: string;
  description: string | null;
  amount: number;
  payUrl: string;
}

/** הקישור לתשלום, כפי שהיועץ שולח אותו ללקוח */
export function paymentLinkEmail(input: PaymentLinkEmailInput) {
  const greeting = input.name ? `שלום ${escapeHtml(input.name)},` : 'שלום,';
  return {
    subject: `קישור לתשלום: ${input.title}`,
    html: authEmailShell(
      'קישור לתשלום',
      `<p style="margin:0 0 12px;">${greeting}</p>
         <p style="margin:0 0 16px;">מצורף קישור לתשלום מאובטח עבור <strong>${escapeHtml(input.title)}</strong>.</p>
         <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:15px;">
           ${row('שירות', escapeHtml(input.title))}
           ${input.description ? row('פירוט', escapeHtml(input.description)) : ''}
           ${row('סכום', money(input.amount))}
         </table>
         ${button(input.payUrl, `לתשלום ${money(input.amount)}`)}
         <p style="margin:0;color:#475569;font-size:14px;">התשלום מתבצע בעמוד התשלום המאובטח של HYP, וחשבונית מס/קבלה נשלחת אליכם במייל אחרי התשלום.</p>`
    ),
    text: `${input.name ? `שלום ${input.name},` : 'שלום,'}

קישור לתשלום מאובטח עבור ${input.title}${input.description ? ` (${input.description})` : ''}.
סכום: ${money(input.amount)}

לתשלום: ${input.payUrl}

חשבונית מס/קבלה נשלחת אליכם במייל אחרי התשלום.`,
  };
}

export interface LinkPaidClientInput {
  name: string | null;
  title: string;
  amount: number;
  paidAt: Date;
  invoiceNumber: string | null;
  last4: string | null;
}

/** אישור ללקוח ששילם בקישור תשלום */
export function linkPaidClientEmail(input: LinkPaidClientInput) {
  const greeting = input.name ? `שלום ${escapeHtml(input.name)},` : 'שלום,';
  const invoiceNote = input.invoiceNumber
    ? `חשבונית מס/קבלה מספר ${escapeHtml(input.invoiceNumber)} נשלחה אליכם במייל נפרד ממערכת הסליקה HYP.`
    : 'חשבונית מס/קבלה תישלח אליכם במייל נפרד ממערכת הסליקה HYP.';
  return {
    subject: `התשלום התקבל: ${input.title}`,
    html: authEmailShell(
      'התשלום התקבל',
      `<p style="margin:0 0 12px;">${greeting}</p>
         <p style="margin:0 0 16px;">התשלום עבור <strong>${escapeHtml(input.title)}</strong> התקבל. תודה!</p>
         <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:15px;">
           ${row('סכום', money(input.amount))}
           ${row('תאריך התשלום', hebrewDate(input.paidAt))}
           ${input.last4 ? row('כרטיס', `<span dir="ltr">**** ${escapeHtml(input.last4)}</span>`) : ''}
           ${input.invoiceNumber ? row('מספר חשבונית', escapeHtml(input.invoiceNumber)) : ''}
         </table>
         <p style="margin:0;color:#475569;font-size:14px;">${invoiceNote}</p>`
    ),
    text: `${input.name ? `שלום ${input.name},` : 'שלום,'}

התשלום עבור ${input.title} התקבל: ${money(input.amount)}.
${invoiceNote}`,
  };
}

export interface LinkPaidAdvisorInput {
  clientName: string | null;
  clientEmail: string | null;
  title: string;
  amount: number;
  invoiceNumber: string | null;
  dashboardUrl: string;
}

/** הודעה ליועץ שלקוח שילם בקישור תשלום */
export function linkPaidAdvisorEmail(input: LinkPaidAdvisorInput) {
  const who = input.clientName || input.clientEmail || 'לקוח';
  return {
    subject: `התקבל תשלום: ${input.title} · ${money(input.amount)}`,
    html: authEmailShell(
      'התקבל תשלום בקישור',
      `<p style="margin:0 0 16px;"><strong>${escapeHtml(who)}</strong> שילם/ה ${money(input.amount)} עבור ${escapeHtml(input.title)}.</p>
         <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:15px;">
           ${input.clientEmail ? row('מייל', `<span dir="ltr">${escapeHtml(input.clientEmail)}</span>`) : ''}
           ${input.invoiceNumber ? row('מספר חשבונית', escapeHtml(input.invoiceNumber)) : ''}
         </table>
         ${button(input.dashboardUrl, 'ללוח היועץ')}`
    ),
    text: `${who} שילם/ה ${money(input.amount)} עבור ${input.title}.${input.invoiceNumber ? `\nמספר חשבונית: ${input.invoiceNumber}` : ''}`,
  };
}
