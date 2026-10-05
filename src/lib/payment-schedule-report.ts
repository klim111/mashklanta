import {
  BANK_LAST_EXPLANATION,
  LAWYER_NOTES,
  PAYMENT_SOURCE_LABELS,
  equityShare,
  scheduleIssues,
  sumBySource,
} from './payment-schedule';
import type { PaymentInstallment, PaymentSchedule } from './payment-schedule';

/**
 * דוח פעימות התשלום כעמוד HTML עצמאי — אותו עיצוב כמו טבלת הפעימות שהוכנה
 * קודם: סיכום עם חלוקת המחיר, טבלה אחת בשני חלקים (הון עצמי ואחריו כספי
 * הבנק), וההערות לעורך הדין. העמוד נפתח מהפלטפורמה ואפשר להוריד אותו כקובץ
 * ולשלוח לעורך הדין.
 */

export interface ScheduleReportInput {
  schedule: PaymentSchedule;
  /** שם התהליך או כתובת הנכס */
  title: string;
  propertyAddress: string | null;
  generatedAt: Date;
}

export function shekelText(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString('he-IL')} ש"ח`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDueDate(value: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/** מספר הפעימה בדוח: לפי הסדר, 1, 2, 3… */
export function installmentLabel(index: number): string {
  return `פעימה ${index + 1}`;
}

function percent(part: number, total: number): string {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

export function scheduleReportHtml({ schedule, title, propertyAddress, generatedAt }: ScheduleReportInput): string {
  const price = schedule.propertyPrice ?? 0;
  const bank = schedule.bankAmount ?? 0;
  const equity = equityShare(schedule) ?? 0;
  const equityRows = schedule.installments.filter((item) => item.source === 'EQUITY');
  const bankRows = schedule.installments.filter((item) => item.source === 'BANK');
  const issues = scheduleIssues(schedule);
  const equityWidth = price ? (equity / price) * 100 : 0;

  const row = (item: PaymentInstallment, index: number) => `
        <tr>
          <td class="pay">${installmentLabel(index)}</td>
          <td class="to">${escapeHtml(item.payee || '—')}</td>
          <td class="when">${item.dueDate ? `<b>${formatDueDate(item.dueDate)}.</b> ` : ''}${escapeHtml(item.condition || '')}</td>
          <td class="num amount">${shekelText(item.amount)}</td>
        </tr>`;

  const section = (
    kind: 'equity' | 'mortgage',
    heading: string,
    rows: PaymentInstallment[],
    offset: number,
    subtotal: number,
    target: number
  ) => `
      <tbody class="${kind}">
        <tr class="section ${kind}">
          <th colspan="4" scope="rowgroup">${heading}<span class="step">${rows.length} ${rows.length === 1 ? 'פעימה' : 'פעימות'}</span><span class="src">מקור הכסף: ${kind === 'equity' ? PAYMENT_SOURCE_LABELS.EQUITY : 'משכנתא'}</span></th>
        </tr>${rows.map((item, index) => row(item, offset + index)).join('')}
        <tr class="subtotal">
          <td colspan="3">סיכום ביניים: ${kind === 'equity' ? 'הון עצמי' : 'משכנתא'} <span class="share">(${percent(target, price)} מהעסקה)</span></td>
          <td class="num">${shekelText(subtotal)}</td>
        </tr>
      </tbody>`;

  const stamp = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(generatedAt);

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>פעימות התשלום · ${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&display=swap">
<style>
  :root {
    --bg: #f1f5f9; --sheet: #ffffff; --fg: #0f172a; --muted: #64748b; --line: #e2e8f0;
    --accent: #2563eb; --equity: #0d9488; --equity-soft: #f0fdfa; --mortgage: #2563eb; --mortgage-soft: #eff6ff;
    --total-bg: #0f172a; --total-fg: #ffffff; --note-bg: #fffbeb; --note-line: #f59e0b; --note-fg: #78350f;
    --info-bg: #eff6ff; --info-line: #93c5fd; --info-fg: #1e3a8a; --bad-bg: #fff1f2; --bad-line: #fda4af; --bad-fg: #9f1239;
    --font: "Assistant", "Segoe UI", "Arial Hebrew", Arial, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0b1220; --sheet: #111a2e; --fg: #e2e8f0; --muted: #94a3b8; --line: #1f2a44; --accent: #60a5fa;
      --equity: #2dd4bf; --equity-soft: #0f2a2c; --mortgage: #60a5fa; --mortgage-soft: #15223d;
      --total-bg: #1d4ed8; --total-fg: #ffffff; --note-bg: #2a2110; --note-line: #f59e0b; --note-fg: #fcd34d;
      --info-bg: #15223d; --info-line: #1d4ed8; --info-fg: #bfdbfe; --bad-bg: #2a1118; --bad-line: #9f1239; --bad-fg: #fda4af;
      color-scheme: dark;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 15px; line-height: 1.6; padding: 32px 16px 48px; }
  .sheet { max-width: 1080px; margin: 0 auto; background: var(--sheet); border: 1px solid var(--line); border-radius: 16px; padding: 28px clamp(16px, 3vw, 36px) 32px; display: grid; gap: 24px; }
  header { display: grid; gap: 6px; }
  .eyebrow { font-size: 13px; font-weight: 700; color: var(--accent); }
  h1 { margin: 0; font-size: clamp(26px, 3.4vw, 34px); font-weight: 800; line-height: 1.2; }
  .lead { margin: 0; color: var(--muted); font-size: 16px; max-width: 70ch; }
  .summary { display: grid; gap: 10px; }
  .fig { display: grid; }
  .fig span { font-size: 13px; color: var(--muted); font-weight: 600; }
  .fig b { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .fig.total { text-align: center; justify-items: center; }
  .fig.total b { font-size: 26px; }
  .fig.equity b { color: var(--equity); }
  .fig.mortgage b { color: var(--mortgage); }
  .bar, .parts { display: flex; }
  .bar { height: 10px; border-radius: 999px; overflow: hidden; background: var(--line); }
  .bar i { display: block; height: 100%; }
  .bar .e { background: var(--equity); width: ${equityWidth.toFixed(2)}%; }
  .bar .m { background: var(--mortgage); width: ${(100 - equityWidth).toFixed(2)}%; }
  .parts .fig { text-align: center; justify-items: center; flex: 1; min-width: 0; padding-inline: 4px; }
  .scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; }
  table { width: 100%; min-width: 760px; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  thead th { text-align: right; font-size: 13px; font-weight: 700; color: var(--muted); padding: 12px 14px; border-bottom: 1px solid var(--line); }
  th.num, td.num { text-align: left; white-space: nowrap; }
  td { padding: 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr.section th { text-align: right; padding: 12px 14px; font-size: 16px; font-weight: 800; border-bottom: 1px solid var(--line); }
  tr.section.equity th { background: var(--equity-soft); color: var(--equity); }
  tr.section.mortgage th { background: var(--mortgage-soft); color: var(--mortgage); }
  .section .step { display: inline-block; font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 999px; border: 1px solid currentColor; margin-inline-start: 8px; vertical-align: 2px; }
  .section .src { font-weight: 500; font-size: 13px; color: var(--muted); margin-inline-start: 8px; }
  .pay { white-space: nowrap; font-weight: 800; font-size: 16px; }
  tbody.equity td:first-child { border-inline-start: 4px solid var(--equity); }
  tbody.mortgage td:first-child { border-inline-start: 4px solid var(--mortgage); }
  .to { font-weight: 600; }
  .when b { font-weight: 800; }
  .amount { font-weight: 800; font-size: 16px; }
  tr.subtotal td { font-weight: 800; border-bottom: 2px solid var(--line); }
  tbody.equity tr.subtotal td { color: var(--equity); }
  tbody.mortgage tr.subtotal td { color: var(--mortgage); }
  tr.subtotal td:first-child { border-inline-start-color: transparent; }
  tr.subtotal .share { font-weight: 600; color: var(--muted); font-size: 13px; }
  tfoot td { background: var(--total-bg); color: var(--total-fg); font-weight: 800; font-size: 17px; padding: 16px 14px; border: 0; }
  tfoot .split { font-weight: 500; font-size: 14px; opacity: .85; }
  tfoot .grand { font-size: 20px; }
  .box { display: grid; gap: 6px; border-radius: 12px; padding: 16px 18px; border: 1px solid; }
  .box h2 { margin: 0; font-size: 16px; font-weight: 800; }
  .box p, .box li { margin: 0; max-width: 80ch; }
  .box ul { margin: 0; padding-inline-start: 20px; display: grid; gap: 4px; }
  .info { background: var(--info-bg); color: var(--info-fg); border-color: var(--info-line); }
  .note { background: var(--note-bg); color: var(--note-fg); border-color: var(--note-line); }
  .bad { background: var(--bad-bg); color: var(--bad-fg); border-color: var(--bad-line); }
  footer { color: var(--muted); font-size: 13px; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: 0; } }
</style>
</head>
<body>
<main class="sheet" dir="rtl" lang="he">
  <header>
    <div class="eyebrow">לוח תשלומים לפי החוזה · משכלנתא</div>
    <h1>פעימות התשלום למוכר</h1>
    <p class="lead">${escapeHtml(propertyAddress || title)}. התשלומים מסודרים לפי סדר הזמנים: קודם פעימות ההון העצמי, אחריהן פעימות כספי המשכנתא.</p>
  </header>

  <section class="summary" aria-label="סיכום">
    <div class="fig total"><span>מחיר הנכס</span><b>${shekelText(price)}</b></div>
    <div class="bar" aria-hidden="true"><i class="e"></i><i class="m"></i></div>
    <div class="parts">
      <div class="fig equity"><span>הון עצמי · ${percent(equity, price)}</span><b>${shekelText(equity)}</b></div>
      <div class="fig mortgage"><span>משכנתא · ${percent(bank, price)}</span><b>${shekelText(bank)}</b></div>
    </div>
  </section>

  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th scope="col" style="width:11%">פעימה</th>
          <th scope="col" style="width:22%">למי מועבר</th>
          <th scope="col">באיזה שלב / במה מותנה</th>
          <th scope="col" class="num" style="width:15%">סכום</th>
        </tr>
      </thead>
${section('equity', 'שלב א׳: פעימות מההון העצמי', equityRows, 0, sumBySource(schedule, 'EQUITY'), equity)}
${bankRows.length ? section('mortgage', 'שלב ב׳: פעימות מכספי המשכנתא', bankRows, equityRows.length, sumBySource(schedule, 'BANK'), bank) : ''}
      <tfoot>
        <tr>
          <td colspan="3">סך הכל <span class="split">· ${shekelText(sumBySource(schedule, 'EQUITY'))} הון עצמי + ${shekelText(sumBySource(schedule, 'BANK'))} משכנתא</span></td>
          <td class="num grand">${shekelText(sumBySource(schedule, 'EQUITY') + sumBySource(schedule, 'BANK'))}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${
    issues.length
      ? `<aside class="box bad"><h2>הלוח עוד לא תקין</h2><ul>${issues.map((issue) => `<li>${escapeHtml(issue.message)}</li>`).join('')}</ul></aside>`
      : ''
  }

  <aside class="box info">
    <h2>למה כספי הבנק מועברים אחרונים</h2>
    <p>${escapeHtml(BANK_LAST_EXPLANATION)}</p>
  </aside>

  <aside class="box note">
    <h2>לבדיקה עם עורך הדין</h2>
    <ul>${LAWYER_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
  </aside>

  <footer>הסכומים בשקלים חדשים. הסכום הכולל ${
    Math.abs(sumBySource(schedule, 'EQUITY') + sumBySource(schedule, 'BANK') - price) <= 1 ? 'תואם' : 'אינו תואם'
  } למחיר הנכס: ${shekelText(price)}. הופק ב-${stamp}. הדוח אינו ייעוץ משפטי; נוסח החוזה נקבע עם עורך הדין.</footer>
</main>
</body>
</html>`;
}
