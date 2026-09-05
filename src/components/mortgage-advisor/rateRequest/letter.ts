/**
 * המכתב עצמו — HTML אחד שמשמש גם לתצוגה בחלון וגם להדפסה ל-PDF, כדי שמה
 * שהמשתמש רואה על המסך יהיה בדיוק מה שיישמר אצלו כקובץ.
 *
 * כל כללי העיצוב תחומים תחת ‎.rr-doc‎ כדי שאפשר יהיה להזריק אותם לתוך האפליקציה
 * בלי להשפיע על שאר המסך.
 */

import type { RateRequestDocument } from './document';
import { formatRateRequestDate } from './document';

const shekel = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

function money(value: number): string {
  return shekel.format(Math.round(value));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const RATE_REQUEST_CSS = `
.rr-doc {
  --rr-navy: #0b2545;
  --rr-blue: #1d4ed8;
  --rr-ink: #0f172a;
  --rr-muted: #64748b;
  --rr-line: #dbe3ef;
  --rr-soft: #f4f7fc;
  --rr-fill: #fffbeb;
  --rr-fill-line: #f0c674;
  direction: rtl;
  text-align: right;
  background: #ffffff;
  color: var(--rr-ink);
  font-family: "Assistant", "Heebo", "Segoe UI", "Noto Sans Hebrew", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.75;
  padding: 34px 38px 30px;
  box-sizing: border-box;
}
.rr-doc * { box-sizing: border-box; }
.rr-doc p { margin: 0 0 10px; }

/* סגנונות האפליקציה מרכזים כל div/p/span שאין לו dir מפורש ומחליפים את הגופן.
   הבלוק הזה מחזיר למכתב את היישור והגופן שלו, כדי שהתצוגה במסך תהיה זהה לקובץ
   שנשמר. הכפילות ב-.rr-doc.rr-doc היא כדי לגבור על אותם כללים כלליים. */
.rr-doc.rr-doc,
.rr-doc.rr-doc div,
.rr-doc.rr-doc p,
.rr-doc.rr-doc span,
.rr-doc.rr-doc li,
.rr-doc.rr-doc h1,
.rr-doc.rr-doc h2 {
  direction: rtl;
  text-align: right;
  font-family: inherit;
}

.rr-doc .rr-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 16px;
  border-bottom: 3px solid var(--rr-navy);
}
.rr-doc .rr-brand { display: flex; align-items: center; gap: 12px; }
.rr-doc .rr-logo {
  width: 46px; height: 46px; border-radius: 14px;
  background: linear-gradient(135deg, var(--rr-blue), #7c3aed);
  color: #fff; font-weight: 800; font-size: 20px;
  display: flex; align-items: center; justify-content: center;
  letter-spacing: -0.5px;
}
.rr-doc .rr-brand-name { margin: 0; font-size: 19px; font-weight: 800; color: var(--rr-navy); letter-spacing: -0.3px; }
.rr-doc .rr-brand-tag { margin: 0; font-size: 11px; color: var(--rr-muted); letter-spacing: 0.4px; }
.rr-doc .rr-meta { text-align: left; font-size: 11px; color: var(--rr-muted); }
.rr-doc .rr-meta b { display: block; font-size: 12.5px; color: var(--rr-ink); font-weight: 700; }
.rr-doc .rr-meta div + div { margin-top: 6px; }

.rr-doc .rr-title {
  margin: 22px 0 2px;
  font-size: 21px;
  font-weight: 800;
  color: var(--rr-navy);
  letter-spacing: -0.4px;
}
.rr-doc .rr-subtitle { margin: 0 0 18px; font-size: 12.5px; color: var(--rr-muted); }
.rr-doc .rr-subtitle b { color: var(--rr-blue); font-weight: 700; }

.rr-doc .rr-to { margin-bottom: 14px; font-size: 13px; }
.rr-doc .rr-to .rr-to-name { font-weight: 800; font-size: 14.5px; color: var(--rr-navy); }
.rr-doc .rr-to span { color: var(--rr-muted); }

.rr-doc .rr-subject {
  display: inline-block;
  margin: 4px 0 14px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--rr-soft);
  border: 1px solid var(--rr-line);
  font-weight: 800;
  font-size: 12.5px;
  color: var(--rr-navy);
}

.rr-doc .rr-facts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 16px 0 20px;
}
.rr-doc .rr-fact {
  border: 1px solid var(--rr-line);
  border-radius: 10px;
  background: var(--rr-soft);
  padding: 8px 10px;
}
.rr-doc .rr-fact span { display: block; font-size: 10px; color: var(--rr-muted); letter-spacing: 0.2px; }
.rr-doc .rr-fact b { display: block; font-size: 13.5px; font-weight: 800; color: var(--rr-navy); }

.rr-doc h2.rr-section {
  margin: 20px 0 8px;
  font-size: 14px;
  font-weight: 800;
  color: var(--rr-navy);
  padding-right: 10px;
  border-right: 4px solid var(--rr-blue);
}

.rr-doc table.rr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
  border: 1px solid var(--rr-line);
  border-radius: 10px;
  overflow: hidden;
}
.rr-doc table.rr-table th,
.rr-doc table.rr-table td {
  border: 1px solid var(--rr-line);
  padding: 7px 8px;
  text-align: center;
  vertical-align: middle;
}
.rr-doc table.rr-table thead .rr-group th {
  background: var(--rr-navy);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  border-color: #1e3a63;
}
.rr-doc table.rr-table thead .rr-group th.rr-bank-group {
  background: #7a5c12;
  border-color: #6b4f0d;
}
.rr-doc table.rr-table thead .rr-cols th {
  background: #eef3fb;
  color: var(--rr-navy);
  font-weight: 800;
  font-size: 11px;
}
.rr-doc table.rr-table thead .rr-cols th.rr-bank { background: var(--rr-fill); color: #7a5c12; }
.rr-doc table.rr-table td { white-space: nowrap; }
.rr-doc table.rr-table td.rr-track { white-space: normal; }
.rr-doc table.rr-table td.rr-start { text-align: right; }
.rr-doc table.rr-table td.rr-track { font-weight: 700; color: var(--rr-navy); }
.rr-doc table.rr-table td .rr-note { display: block; font-size: 10px; font-weight: 500; color: var(--rr-muted); }
.rr-doc table.rr-table tbody tr:nth-child(even) td { background: #fafcff; }
.rr-doc table.rr-table td.rr-blank {
  background: var(--rr-fill);
  border: 1px dashed var(--rr-fill-line);
  min-width: 74px;
}
.rr-doc table.rr-table tfoot td {
  background: #e8eefa;
  font-weight: 800;
  color: var(--rr-navy);
  font-size: 12px;
}
.rr-doc table.rr-table tfoot td.rr-blank { background: var(--rr-fill); }
.rr-doc .rr-amount { font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 700; }

.rr-doc .rr-fill-hint {
  margin: 8px 0 0;
  font-size: 10.5px;
  color: #7a5c12;
  background: var(--rr-fill);
  border: 1px dashed var(--rr-fill-line);
  border-radius: 8px;
  padding: 6px 10px;
}

/* list-style מוגדר במפורש, כי איפוס הסגנונות של האפליקציה מבטל מספור ברירת מחדל */
.rr-doc ol.rr-asks { margin: 0; padding-right: 20px; list-style: decimal outside; }
.rr-doc ol.rr-asks li { margin-bottom: 5px; }
.rr-doc ol.rr-asks li::marker { color: var(--rr-blue); font-weight: 700; }

.rr-doc .rr-sign { margin-top: 22px; display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; }
.rr-doc .rr-sign .rr-sign-name { font-size: 14px; font-weight: 800; color: var(--rr-navy); margin: 2px 0 0; }
.rr-doc .rr-sign .rr-sign-contact { font-size: 11.5px; color: var(--rr-muted); margin: 0; }
.rr-doc .rr-sign-line { min-width: 190px; border-top: 1px solid var(--rr-line); padding-top: 5px; text-align: center; font-size: 10.5px; color: var(--rr-muted); }

.rr-doc .rr-foot {
  margin-top: 24px;
  padding-top: 10px;
  border-top: 1px solid var(--rr-line);
  font-size: 10px;
  color: var(--rr-muted);
  line-height: 1.6;
}

@media (max-width: 640px) {
  .rr-doc { padding: 18px 16px; font-size: 12px; }
  .rr-doc .rr-facts { grid-template-columns: repeat(2, 1fr); }
  .rr-doc table.rr-table { font-size: 10.5px; }
  .rr-doc .rr-head { flex-direction: column; }
  .rr-doc .rr-meta { text-align: right; }
}
`;

/** כללי הדפסה — נפרדים, כדי שלא ישפיעו על התצוגה במסך */
export const RATE_REQUEST_PRINT_CSS = `
@page { size: A4; margin: 12mm; }
html, body { margin: 0; padding: 0; background: #fff; }
.rr-doc { padding: 0; font-size: 11.5px; }
.rr-doc table.rr-table { page-break-inside: auto; }
.rr-doc table.rr-table tr { page-break-inside: avoid; }
.rr-doc thead { display: table-header-group; }
.rr-doc .rr-asks-section, .rr-doc .rr-sign { page-break-inside: avoid; }
`;

function factsHtml(doc: RateRequestDocument): string {
  const facts: Array<[string, string]> = [
    ['סכום המשכנתא המבוקש', money(doc.totalAmount)],
    ['מספר מסלולים', String(doc.lines.length)],
  ];
  if (doc.periodLabel) facts.push(['התקופה הארוכה בתמהיל', doc.periodLabel]);
  if (doc.propertyValue && doc.propertyValue > 0) {
    facts.push(['שווי הנכס', money(doc.propertyValue)]);
  }
  if (doc.ltv !== undefined) facts.push(['אחוז מימון', `${doc.ltv.toFixed(1)}%`]);
  if (doc.dealTypeLabel) facts.push(['סוג העסקה', doc.dealTypeLabel]);
  if (doc.propertyAddress) facts.push(['הנכס', doc.propertyAddress]);

  return `<div class="rr-facts">${facts
    .map(
      ([label, value]) =>
        `<div class="rr-fact"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`
    )
    .join('')}</div>`;
}

function tableHtml(doc: RateRequestDocument): string {
  const rows = doc.lines
    .map(
      (line) => `<tr>
        <td>${line.index}</td>
        <td class="rr-start rr-track">${escapeHtml(line.typeLabel)}${
          line.stationLabel ? `<span class="rr-note">${escapeHtml(line.stationLabel)}</span>` : ''
        }</td>
        <td>${escapeHtml(line.linkageLabel)}</td>
        <td>${escapeHtml(line.amortizationLabel)}</td>
        <td>${escapeHtml(line.periodLabel)}</td>
        <td class="rr-amount">${money(line.amount)}</td>
        <td>${line.share.toFixed(1)}%</td>
        <td class="rr-blank"></td>
        <td class="rr-blank"></td>
      </tr>`
    )
    .join('');

  const unallocated =
    doc.unallocated > 0
      ? `<tr><td colspan="5" class="rr-start">יתרה שטרם שובצה למסלול</td>
         <td class="rr-amount">${money(doc.unallocated)}</td><td>—</td>
         <td class="rr-blank"></td><td class="rr-blank"></td></tr>`
      : '';

  return `<table class="rr-table">
    <thead>
      <tr class="rr-group">
        <th colspan="7">מבנה התמהיל — כפי שנבנה ואינו לשינוי</th>
        <th colspan="2" class="rr-bank-group">למילוי הבנק</th>
      </tr>
      <tr class="rr-cols">
        <th style="width:34px">#</th>
        <th>סוג הריבית</th>
        <th>הצמדה</th>
        <th>לוח סילוקין</th>
        <th>תקופה</th>
        <th>סכום המסלול</th>
        <th>% מהתמהיל</th>
        <th class="rr-bank">ריבית שנתית מוצעת</th>
        <th class="rr-bank">החזר חודשי</th>
      </tr>
    </thead>
    <tbody>${rows}${unallocated}</tbody>
    <tfoot>
      <tr>
        <td colspan="5" class="rr-start">סה"כ</td>
        <td class="rr-amount">${money(doc.totalAmount)}</td>
        <td>100%</td>
        <td class="rr-blank"></td>
        <td class="rr-blank"></td>
      </tr>
    </tfoot>
  </table>
  <p class="rr-fill-hint">שתי העמודות המסומנות הושארו ריקות בכוונה — הן מיועדות לתמחור הבנק. בשורת הסיכום נא לציין את הריבית המשוקללת ואת סך ההחזר החודשי.</p>`;
}

function signatureHtml(doc: RateRequestDocument): string {
  const name = doc.details.applicantName?.trim();
  const contact = [doc.details.contactPhone?.trim(), doc.details.contactEmail?.trim()]
    .filter(Boolean)
    .join(' · ');

  return `<div class="rr-sign">
    <div>
      <p style="margin:0">בכבוד רב,</p>
      <p class="rr-sign-name">${escapeHtml(name || 'מבקש/ת המשכנתא')}</p>
      ${contact ? `<p class="rr-sign-contact">${escapeHtml(contact)}</p>` : ''}
    </div>
    <div class="rr-sign-line">חתימה ותאריך</div>
  </div>`;
}

/** גוף המכתב בלבד — מוזרק גם לתצוגה במסך וגם לקובץ ההדפסה */
export function rateRequestBodyHtml(doc: RateRequestDocument): string {
  const bank = doc.details.bankName?.trim();
  const date = formatRateRequestDate(doc.createdAt);

  return `<div class="rr-doc" dir="rtl">
    <div class="rr-head">
      <div class="rr-brand">
        <div class="rr-logo">מ</div>
        <div>
          <p class="rr-brand-name">משכלתנא</p>
          <p class="rr-brand-tag">תכנון וליווי משכנתאות</p>
        </div>
      </div>
      <div class="rr-meta">
        <div>תאריך<b>${escapeHtml(date)}</b></div>
        <div>אסמכתה<b>${escapeHtml(doc.reference)}</b></div>
      </div>
    </div>

    <h1 class="rr-title">${escapeHtml(doc.title)}</h1>
    <p class="rr-subtitle">תמהיל מותאם אישית · <b>${escapeHtml(doc.mixName)}</b></p>

    <div class="rr-to">
      <span>לכבוד</span>
      <div class="rr-to-name">${escapeHtml(
        bank ? `מחלקת המשכנתאות, בנק ${bank}` : 'מחלקת המשכנתאות'
      )}</div>
      <span>שלום רב,</span>
    </div>

    <div class="rr-subject">הנדון: בקשה להצעת ריביות לתמהיל משכנתא מותאם אישית</div>

    ${doc.intro.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}

    ${factsHtml(doc)}

    <h2 class="rr-section">פירוט מסלולי התמהיל</h2>
    ${tableHtml(doc)}

    <div class="rr-asks-section">
      <h2 class="rr-section">מה נבקש לקבל בהצעה</h2>
      <ol class="rr-asks">
        ${doc.asks.map((ask) => `<li>${escapeHtml(ask)}</li>`).join('')}
      </ol>
    </div>

    <p style="margin-top:14px">${escapeHtml(doc.closing)}</p>

    ${signatureHtml(doc)}

    <div class="rr-foot">
      המסמך הופק בתאריך ${escapeHtml(date)} באמצעות מערכת משכלתנא, אסמכתה ${escapeHtml(
        doc.reference
      )}.
      עמודות הריבית וההחזר החודשי הושארו ריקות במתכוון לצורך תמחור הבנק. הסכומים והתקופות מעוגלים לצורך הצגה,
      וההצעה שתתקבל תיבחן מול הצעות בנקים נוספים על אותו מבנה תמהיל.
    </div>
  </div>`;
}

/** מסמך HTML עצמאי — הבסיס להדפסה ולשמירה כ-PDF */
export function rateRequestPrintHtml(doc: RateRequestDocument): string {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>${escapeHtml(`${doc.title} — ${doc.mixName}`)}</title>
<style>${RATE_REQUEST_CSS}${RATE_REQUEST_PRINT_CSS}</style>
</head>
<body>${rateRequestBodyHtml(doc)}</body>
</html>`;
}

/**
 * הדפסת המכתב דרך חלונית מוסתרת. כך אין תלות בחלון קופץ שנחסם, והמשתמש בוחר
 * "שמירה כ-PDF" בתיבת ההדפסה של הדפדפן.
 */
export function printRateRequest(doc: RateRequestDocument): void {
  if (typeof document === 'undefined') return;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.bottom = '0';
  frame.style.width = '210mm';
  frame.style.height = '297mm';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const cleanup = () => {
    setTimeout(() => frame.remove(), 1000);
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.onafterprint = cleanup;
    // מרווח קצר כדי שהפריסה תסתיים לפני שתיבת ההדפסה נפתחת
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } finally {
        setTimeout(cleanup, 60_000);
      }
    }, 120);
  };

  frame.srcdoc = rateRequestPrintHtml(doc);
}
