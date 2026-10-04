import { prisma } from './db';
import { authEmailShell, escapeHtml, sendEmail } from './email';
import { canonicalSiteOrigin } from './auth-url';
import { primaryAdvisor } from './advisor-link';

/**
 * מייל ליועץ על פנייה חדשה: "מחכה לך בקשה לפגישה", "מחכה לך בקשת ליווי"
 * וכו׳, לפי מה שהלקוח סימן. נשלח רק על פניות ובקשות — לא על כל פעולה של
 * הלקוח — לכתובת המייל של היועץ ששמורה בחשבון שלו. כשל בשליחה נכתב ללוג ולא
 * עוצר את הפנייה עצמה, שכבר נשמרה ומופיעה ביועץ.
 */

export interface AdvisorRequestEmail {
  /** היועץ שהפנייה שויכה אליו; ריק — היועץ של הפלטפורמה */
  advisorId?: string | null;
  /** מה מחכה ליועץ: "בקשה לפגישה", "בקשת ליווי לשלב בניית התמהיל" */
  what: string;
  /** שורות פרטים, לפי הסדר: [כותרת, ערך] */
  details: Array<[string, string | null | undefined]>;
  from: { name?: string | null; email?: string | null; phone?: string | null };
  note?: string | null;
  /** הנתיב באזור היועץ שהכפתור פותח */
  path?: string;
}

function siteOrigin(): string {
  return (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
}

async function advisorEmail(advisorId: string | null | undefined): Promise<string | null> {
  if (advisorId) {
    const advisor = await prisma.user.findUnique({ where: { id: advisorId }, select: { email: true } });
    if (advisor?.email) return advisor.email;
  }
  return (await primaryAdvisor())?.email ?? null;
}

/** תוכן המייל — בנפרד, כדי שאפשר לבדוק אותו בלי לשלוח */
export function advisorRequestEmailContent(input: AdvisorRequestEmail, origin = siteOrigin()) {
  const who = input.from.name?.trim() || input.from.email || 'לקוח';
  const all: Array<[string, string]> = [
    ['מאת', who],
    ['מייל', input.from.email || ''],
    ['טלפון', input.from.phone || ''],
    ...input.details.map(([label, value]): [string, string] => [label, value || '']),
  ];
  const rows = all.filter(([, value]) => value.trim());
  const href = `${origin}${input.path ?? '/advisor-dashboard?tab=requests'}`;

  const table = `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#64748b;width:110px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(value)}</td></tr>`
    )
    .join('')}</table>`;
  const note = input.note?.trim()
    ? `<div style="margin:0 0 16px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;white-space:pre-wrap;">${escapeHtml(input.note.trim())}</div>`
    : '';
  const button = `<div style="text-align:center;margin:24px 0;"><a href="${href}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">לצפייה בפנייה</a></div>`;

  const subject = `מחכה לך ${input.what} מ${who}`;
  const html = authEmailShell(
    escapeHtml(`מחכה לך ${input.what}`),
    `<p style="margin:0 0 16px;">${escapeHtml(who)} שלח/ה ${escapeHtml(input.what)}.</p>${table}${note}${button}`
  );
  const text = [
    `מחכה לך ${input.what}`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(input.note?.trim() ? ['', input.note.trim()] : []),
    '',
    `לצפייה בפנייה: ${href}`,
  ].join('\n');
  return { subject, html, text };
}

export async function emailAdvisorAboutRequest(input: AdvisorRequestEmail): Promise<void> {
  try {
    const to = await advisorEmail(input.advisorId);
    if (!to) return;
    const content = advisorRequestEmailContent(input);
    // תשובה למייל מגיעה ישר ללקוח שפנה
    const replyTo = input.from.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.from.email) ? input.from.email : undefined;
    const result = await sendEmail({ to, ...content, replyTo });
    if (result && typeof result === 'object' && 'success' in result && !result.success) {
      console.error('[advisor-notify] sending failed:', result);
    }
  } catch (error) {
    console.error('[advisor-notify] sending failed:', error);
  }
}
