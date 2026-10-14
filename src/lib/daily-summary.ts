import { prisma } from './db';
import { authEmailShell, escapeHtml, sendEmail } from './email';
import { canonicalSiteOrigin } from './auth-url';
import { NOTIFY_EMAIL } from './advisor-notify';
import { israelDay } from './site-analytics';

/**
 * מייל הסיכום היומי ל-NOTIFY_EMAIL: כמה ביקורים היו באתר, כמה נרשמו וכמה שילמו
 * ביום שהסתיים, לפי שעון ישראל. Vercel מריץ אותו פעם ביום אחרי חצות
 * (vercel.json), והוא מסכם את היום הקודם.
 */

const HOUR_MS = 60 * 60 * 1000;

/** תחילת יום לפי שעון ישראל, ב-UTC. ישראל ב-UTC+2 בחורף וב-UTC+3 בקיץ */
function israelMidnight(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const utcMidnight = Date.UTC(year, month - 1, date);
  for (const offset of [3, 2]) {
    const candidate = new Date(utcMidnight - offset * HOUR_MS);
    if (israelDay(candidate) === day && israelDay(new Date(candidate.getTime() - 1)) !== day) return candidate;
  }
  return new Date(utcMidnight - 2 * HOUR_MS);
}

/** "2026-10-14" → היום הבא */
function nextDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

/** הגבולות של יום לפי שעון ישראל: מחצות עד חצות */
export function israelDayRange(day: string): { from: Date; to: Date } {
  return { from: israelMidnight(day), to: israelMidnight(nextDay(day)) };
}

/** היום שהסתיים — מה שהסיכום שנשלח אחרי חצות מתאר */
export function previousIsraelDay(now = new Date()): string {
  const today = israelDay(now);
  return israelDay(new Date(israelMidnight(today).getTime() - HOUR_MS));
}

export interface DailySummary {
  day: string;
  visits: { views: number; visitors: number; sessions: number; signedInVisitors: number };
  /** התחילו להקליד בטופס ההרשמה */
  startedSignup: number;
  signups: Array<{ name: string | null; email: string | null; at: string }>;
  payments: Array<{ who: string; what: string; amount: number; at: string }>;
}

export async function collectDailySummary(day: string): Promise<DailySummary> {
  const { from, to } = israelDayRange(day);
  const inDay = { gte: from, lt: to };

  const [visits, startedSignup, users, platformPayments, links, orders] = await Promise.all([
    prisma.siteVisit.findMany({
      where: { startedAt: inDay },
      select: { visitorId: true, sessionId: true, userId: true },
      take: 200_000,
    }),
    prisma.signupDraft.count({ where: { createdAt: inDay } }),
    prisma.user.findMany({
      where: { role: 'CLIENT', createdAt: inDay },
      orderBy: { createdAt: 'asc' },
      select: { name: true, email: true, createdAt: true },
    }),
    prisma.platformPayment.findMany({
      where: { status: 'PAID', createdAt: inDay },
      orderBy: { createdAt: 'asc' },
      select: { amountAgorot: true, createdAt: true, planId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.paymentLink.findMany({
      where: { status: 'PAID', paidAt: inDay },
      orderBy: { paidAt: 'asc' },
      select: { title: true, amountAgorot: true, paidAt: true, clientName: true, clientEmail: true },
    }),
    prisma.advisorServiceOrder.findMany({
      where: { status: 'PAID', paidAt: inDay },
      orderBy: { paidAt: 'asc' },
      select: { amount: true, paidAt: true, owner: { select: { name: true, email: true } } },
    }),
  ]);

  const payments: DailySummary['payments'] = [
    ...platformPayments.map((payment) => ({
      who: payment.user.name || payment.user.email || 'לקוח',
      what: payment.planId ? 'חידוש גישה לחודש' : 'גישה לפלטפורמה לחודש',
      amount: payment.amountAgorot / 100,
      at: payment.createdAt.toISOString(),
    })),
    ...links.map((link) => ({
      who: link.clientName || link.clientEmail || 'לקוח',
      what: link.title,
      amount: link.amountAgorot / 100,
      at: (link.paidAt ?? from).toISOString(),
    })),
    ...orders.map((order) => ({
      who: order.owner.name || order.owner.email || 'לקוח',
      what: 'ליווי יועץ לשלבים',
      amount: order.amount,
      at: (order.paidAt ?? from).toISOString(),
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return {
    day,
    visits: {
      views: visits.length,
      visitors: new Set(visits.map((visit) => visit.visitorId)).size,
      sessions: new Set(visits.map((visit) => visit.sessionId)).size,
      signedInVisitors: new Set(visits.filter((visit) => visit.userId).map((visit) => visit.userId)).size,
    },
    startedSignup,
    signups: users.map((user) => ({ name: user.name, email: user.email, at: user.createdAt.toISOString() })),
    payments,
  };
}

const TIME = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' });
const DAY_TITLE = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const money = (amount: number) => `₪${amount.toLocaleString('he-IL')}`;
const count = (value: number) => value.toLocaleString('he-IL');

/** תוכן המייל — בנפרד, כדי שאפשר לבדוק אותו בלי לשלוח */
export function dailySummaryEmail(summary: DailySummary, origin = '') {
  const dayTitle = DAY_TITLE.format(new Date(`${summary.day}T12:00:00Z`));
  const payers = new Set(summary.payments.map((payment) => payment.who)).size;
  const total = summary.payments.reduce((sum, payment) => sum + payment.amount, 0);

  const tiles: Array<[string, string, string]> = [
    ['ביקורים באתר', count(summary.visits.sessions), `${count(summary.visits.visitors)} מבקרים · ${count(summary.visits.views)} צפיות`],
    ['נרשמו', count(summary.signups.length), `${count(summary.startedSignup)} התחילו למלא את טופס ההרשמה`],
    ['שילמו', count(payers), summary.payments.length ? `${count(summary.payments.length)} תשלומים · ${money(total)}` : 'אין תשלומים'],
  ];
  const tileHtml = `<table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 0 20px;"><tr>${tiles
    .map(
      ([label, value, hint]) =>
        `<td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center;vertical-align:top;">
           <div style="font-size:13px;color:#64748b;">${escapeHtml(label)}</div>
           <div style="font-size:28px;font-weight:800;color:#0f172a;">${escapeHtml(value)}</div>
           <div style="font-size:12px;color:#64748b;">${escapeHtml(hint)}</div>
         </td>`
    )
    .join('')}</tr></table>`;

  const list = (title: string, rows: string[]) =>
    rows.length
      ? `<h3 style="margin:0 0 8px;font-size:16px;">${escapeHtml(title)}</h3><table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;">${rows.join('')}</table>`
      : '';
  const row = (cells: string[]) =>
    `<tr>${cells.map((cell) => `<td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">${cell}</td>`).join('')}</tr>`;

  const signupRows = summary.signups.map((user) =>
    row([
      TIME.format(new Date(user.at)),
      `<strong>${escapeHtml(user.name || user.email || 'לקוח')}</strong>`,
      user.email ? `<span dir="ltr">${escapeHtml(user.email)}</span>` : '',
    ])
  );
  const paymentRows = summary.payments.map((payment) =>
    row([
      TIME.format(new Date(payment.at)),
      `<strong>${escapeHtml(payment.who)}</strong>`,
      escapeHtml(payment.what),
      `<strong>${money(payment.amount)}</strong>`,
    ])
  );

  const href = `${origin}/advisor-dashboard?tab=clients`;
  const button = `<div style="text-align:center;margin:24px 0 8px;"><a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;padding:14px 32px;border-radius:10px;">ללוח היועץ</a></div>`;

  const subject = `סיכום יומי · ${dayTitle} · ${count(summary.visits.sessions)} ביקורים, ${count(summary.signups.length)} נרשמו, ${count(payers)} שילמו`;
  const html = authEmailShell(
    escapeHtml(`סיכום הפעילות של ${dayTitle}`),
    `${tileHtml}${list('מי נרשם', signupRows)}${list('מי שילם', paymentRows)}${button}`
  );
  const text = [
    `סיכום הפעילות של ${dayTitle}`,
    '',
    ...tiles.map(([label, value, hint]) => `${label}: ${value} (${hint})`),
    ...(summary.signups.length
      ? ['', 'מי נרשם:', ...summary.signups.map((user) => `${TIME.format(new Date(user.at))} ${user.name || ''} ${user.email || ''}`.trim())]
      : []),
    ...(summary.payments.length
      ? ['', 'מי שילם:', ...summary.payments.map((payment) => `${TIME.format(new Date(payment.at))} ${payment.who} · ${payment.what} · ${money(payment.amount)}`)]
      : []),
    '',
    `ללוח היועץ: ${href}`,
  ].join('\n');
  return { subject, html, text };
}

/** איסוף ושליחה של הסיכום על היום שהסתיים */
export async function sendDailySummary(now = new Date()): Promise<{ day: string; sent: boolean }> {
  const day = previousIsraelDay(now);
  const summary = await collectDailySummary(day);
  const origin = (canonicalSiteOrigin() || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  const result = await sendEmail({ to: NOTIFY_EMAIL, ...dailySummaryEmail(summary, origin) }).catch((error) => {
    console.error('[daily-summary] sending failed:', error);
    return { success: false };
  });
  return { day, sent: result.success };
}
