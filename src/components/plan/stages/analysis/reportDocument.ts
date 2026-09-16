/**
 * דוח הפרופיל הפיננסי כמסמך אחד.
 *
 * אותו HTML משמש גם לתצוגה על המסך וגם להדפסה ל-PDF, כדי שמה שהלקוח רואה
 * יהיה בדיוק מה שיישמר אצלו כקובץ — בדיוק כמו מכתב בקשת הריביות לבנקים.
 * כל כללי העיצוב תחומים תחת ‎.pr-doc‎ כדי שלא ישפיעו על שאר המסך.
 */

import type { CheckStatus, ProfileReport } from '@/lib/profile-report';
import { DOCUMENT_CONSISTENCY_WARNING, overallHeadline } from '@/lib/profile-report';
import { describeMonths } from '@/lib/mortgage-plan';

const PRINT_STYLE_ID = 'pr-print-style';
export const PROFILE_REPORT_PRINT_ROOT_CLASS = 'pr-print-root';

const DATE_FORMAT = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: 'עומד בדרישה',
  near: 'קרוב למגבלה',
  fail: 'אינו עומד בדרישה',
  unknown: 'חסרים נתונים',
};

export const PROFILE_REPORT_CSS = `
.pr-doc {
  --pr-navy: #0b2545;
  --pr-blue: #1d4ed8;
  --pr-ink: #0f172a;
  --pr-muted: #5b6b82;
  --pr-line: #dbe3ef;
  --pr-soft: #f4f7fc;
  --pr-pass: #047857;
  --pr-pass-bg: #ecfdf5;
  --pr-near: #b45309;
  --pr-near-bg: #fffbeb;
  --pr-fail: #b91c1c;
  --pr-fail-bg: #fef2f2;
  direction: rtl;
  text-align: right;
  background: #ffffff;
  color: var(--pr-ink);
  font-family: "Assistant", "Heebo", "Segoe UI", "Noto Sans Hebrew", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.75;
  padding: 34px 38px 30px;
  box-sizing: border-box;
}
.pr-doc * { box-sizing: border-box; }
.pr-doc p { margin: 0 0 10px; }

/* סגנונות האפליקציה מרכזים ומחליפים גופן לכל אלמנט; הבלוק הזה מחזיר למסמך
   את היישור והגופן שלו, כדי שהתצוגה במסך תהיה זהה לקובץ שנשמר. */
.pr-doc.pr-doc,
.pr-doc.pr-doc div,
.pr-doc.pr-doc p,
.pr-doc.pr-doc span,
.pr-doc.pr-doc li,
.pr-doc.pr-doc td,
.pr-doc.pr-doc th,
.pr-doc.pr-doc h1,
.pr-doc.pr-doc h2,
.pr-doc.pr-doc h3 {
  direction: rtl;
  text-align: right;
  font-family: inherit;
}

.pr-doc .pr-head {
  border-bottom: 3px solid var(--pr-navy);
  padding-bottom: 14px;
  margin-bottom: 18px;
  text-align: center;
}
.pr-doc.pr-doc .pr-head, .pr-doc.pr-doc .pr-head * { text-align: center; }
.pr-doc .pr-brand {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--pr-blue);
}
.pr-doc h1 { font-size: 23px; font-weight: 900; margin: 6px 0 4px; color: var(--pr-navy); }
.pr-doc .pr-sub { font-size: 13px; color: var(--pr-muted); font-weight: 600; margin: 0; }

.pr-doc .pr-verdict {
  border: 2px solid var(--pr-line);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 18px;
  text-align: center;
}
.pr-doc.pr-doc .pr-verdict, .pr-doc.pr-doc .pr-verdict * { text-align: center; }
.pr-doc .pr-verdict.pass { border-color: var(--pr-pass); background: var(--pr-pass-bg); }
.pr-doc .pr-verdict.near { border-color: var(--pr-near); background: var(--pr-near-bg); }
.pr-doc .pr-verdict.fail { border-color: var(--pr-fail); background: var(--pr-fail-bg); }
.pr-doc .pr-verdict.unknown { background: var(--pr-soft); }
.pr-doc .pr-verdict h2 { font-size: 17px; font-weight: 900; margin: 0; }

.pr-doc h3 {
  font-size: 14px;
  font-weight: 900;
  color: var(--pr-navy);
  margin: 20px 0 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--pr-line);
}

.pr-doc table.pr-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.pr-doc table.pr-table th {
  background: var(--pr-navy);
  color: #fff;
  font-size: 11.5px;
  font-weight: 800;
  padding: 7px 9px;
  text-align: right;
}
.pr-doc table.pr-table td {
  border-bottom: 1px solid var(--pr-line);
  padding: 7px 9px;
  font-size: 12.5px;
  vertical-align: top;
}
.pr-doc table.pr-table tr:nth-child(even) td { background: var(--pr-soft); }
.pr-doc .pr-status { font-weight: 900; white-space: nowrap; }
.pr-doc .pr-status.pass { color: var(--pr-pass); }
.pr-doc .pr-status.near { color: var(--pr-near); }
.pr-doc .pr-status.fail { color: var(--pr-fail); }
.pr-doc .pr-status.unknown { color: var(--pr-muted); }
.pr-doc .pr-note { color: var(--pr-muted); font-size: 11.5px; }

.pr-doc .pr-figures { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.pr-doc .pr-figure {
  flex: 1 1 150px;
  border: 1px solid var(--pr-line);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--pr-soft);
  text-align: center;
}
.pr-doc.pr-doc .pr-figure, .pr-doc.pr-doc .pr-figure * { text-align: center; }
.pr-doc .pr-figure .k { display: block; font-size: 11px; color: var(--pr-muted); font-weight: 700; }
.pr-doc .pr-figure .v { display: block; font-size: 15px; font-weight: 900; }

.pr-doc ul { margin: 0 0 10px; padding-right: 18px; }
.pr-doc li { font-size: 12.5px; margin-bottom: 3px; }

.pr-doc .pr-warn {
  border: 2px solid var(--pr-near);
  background: var(--pr-near-bg);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 12.5px;
  line-height: 1.8;
}
.pr-doc .pr-warn b { color: var(--pr-near); }

.pr-doc .pr-rec {
  border: 1px solid var(--pr-line);
  border-right: 4px solid var(--pr-blue);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fff;
}
.pr-doc .pr-rec b { display: block; font-size: 13px; margin-bottom: 3px; color: var(--pr-navy); }

.pr-doc .pr-tiles { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.pr-doc .pr-tile {
  flex: 1 1 160px;
  border: 1px solid var(--pr-line);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--pr-soft);
}
.pr-doc .pr-tile .k { display: block; font-size: 11px; color: var(--pr-muted); font-weight: 700; }
.pr-doc .pr-tile .v { display: block; font-size: 18px; font-weight: 900; color: var(--pr-navy); }
.pr-doc .pr-tile .n { display: block; font-size: 10.5px; color: var(--pr-muted); }
.pr-doc .pr-cols { display: flex; gap: 12px; }
.pr-doc .pr-col { flex: 1 1 0; border: 1px solid var(--pr-line); border-radius: 12px; padding: 10px 12px; }
.pr-doc .pr-col h4 { margin: 0 0 6px; font-size: 13px; font-weight: 900; color: var(--pr-navy); }
.pr-doc .pr-row { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dashed var(--pr-line); padding: 3px 0; font-size: 12px; }
.pr-doc .pr-row:last-child { border-bottom: 0; }
.pr-doc .pr-row b { font-weight: 800; }
.pr-doc .pr-risk {
  border: 1px solid var(--pr-line);
  border-right: 4px solid var(--pr-near);
  border-radius: 10px;
  padding: 8px 12px;
  margin-bottom: 6px;
  background: #fff;
}
.pr-doc .pr-risk.critical { border-right-color: var(--pr-fail); }
.pr-doc .pr-risk.info { border-right-color: var(--pr-blue); }
.pr-doc .pr-risk b { display: block; font-size: 12.5px; margin-bottom: 2px; }
.pr-doc .pr-guide { display: flex; gap: 8px; margin-bottom: 7px; }
.pr-doc .pr-guide .num {
  flex: 0 0 20px; height: 20px; border-radius: 50%; background: var(--pr-pass);
  color: #fff; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center;
}
.pr-doc .pr-guide b { display: block; font-size: 12.5px; color: var(--pr-navy); }

.pr-doc .pr-foot {
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px solid var(--pr-line);
  font-size: 11px;
  color: var(--pr-muted);
  line-height: 1.7;
}
`;

/** כללי ההדפסה — רק המסמך מודפס, ולא שאר העמוד שממנו הופעלה ההדפסה */
export const PROFILE_REPORT_PRINT_CSS = `
@media screen {
  .pr-print-root { display: none !important; }
}

@media print {
  @page { size: A4; margin: 12mm; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }
  body > *:not(.pr-print-root) { display: none !important; }
  .pr-print-root {
    display: block !important;
    position: static !important;
    width: auto !important;
    max-width: none !important;
  }
  .pr-print-root, .pr-print-root * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .pr-print-root .pr-doc { padding: 0; font-size: 11.5px; }
  .pr-print-root .pr-doc table.pr-table { page-break-inside: auto; }
  .pr-print-root .pr-doc table.pr-table tr { page-break-inside: avoid; }
  .pr-print-root .pr-doc thead { display: table-header-group; }
  .pr-print-root .pr-doc .pr-warn,
  .pr-print-root .pr-doc .pr-rec,
  .pr-print-root .pr-doc .pr-risk,
  .pr-print-root .pr-doc .pr-guide,
  .pr-print-root .pr-doc .pr-col,
  .pr-print-root .pr-doc .pr-verdict { page-break-inside: avoid; }
}
`;

/** גוף המסמך. `planName` הוא שם התהליך, כדי שהקובץ יזוהה אחר כך */
export function profileReportBodyHtml(report: ProfileReport, planName?: string): string {
  const date = DATE_FORMAT.format(new Date(report.generatedAt));

  const checks = report.checks
    .map(
      (check) => `
      <tr>
        <td><b>${escapeHtml(check.label)}</b></td>
        <td>${escapeHtml(check.value)}</td>
        <td>${escapeHtml(check.limit)}</td>
        <td class="pr-status ${check.status}">${STATUS_LABEL[check.status]}</td>
        <td class="pr-note">${escapeHtml(check.note)}</td>
      </tr>`
    )
    .join('');

  const figures = report.figures
    .map(
      (figure) => `
      <div class="pr-figure">
        <span class="k">${escapeHtml(figure.label)}</span>
        <span class="v">${escapeHtml(figure.value)}</span>
      </div>`
    )
    .join('');

  const documents = report.documents
    .map(
      (group) => `
      <div>
        <b style="font-size:12.5px">${escapeHtml(group.title)}</b>
        <ul>${group.documents.map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul>
      </div>`
    )
    .join('');

  const money = (value: number | null | undefined) =>
    value === null || value === undefined || !Number.isFinite(value)
      ? '—'
      : `₪${Math.round(value).toLocaleString('he-IL')}`;
  const pct = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`);
  const { summary } = report;

  const tiles = [
    { k: 'סכום המשכנתא', v: summary.ready ? money(summary.mortgageAmount) : '—', n: summary.propertyValue ? `מתוך נכס בשווי ${money(summary.propertyValue)}` : '' },
    { k: 'שיעור מימון', v: pct(summary.ltv), n: `תקרה ${summary.maxLtv}%` },
    { k: 'יחס החזר', v: pct(summary.repaymentRatio), n: `מגבלה ${summary.ratioLimit}%` },
    { k: 'החזר חודשי משוער', v: summary.ready ? money(summary.estimatedMonthlyPayment) : '—', n: `${describeMonths(summary.months)} · ריבית ${summary.estimateRate}% להערכה` },
    { k: 'הכנסה פנויה אחרי המשכנתא', v: summary.ready ? money(summary.disposableAfterMortgage) : '—', n: 'הכנסה נטו פחות הלוואות ופחות ההחזר' },
    { k: 'סך הריביות לאורך התקופה', v: summary.ready ? money(summary.totalInterest) : '—', n: summary.interestShare !== null ? `${summary.interestShare.toFixed(0)}% מהקרן · סך תשלומים ${money(summary.totalPaid)}` : '' },
    { k: 'החזר חודשי מרבי לפי הבנקים', v: money(summary.maxMonthlyPayment), n: `${summary.ratioLimit}% מההכנסה הפנויה` },
    { k: 'הון עצמי בעסקה', v: summary.ready ? money(summary.equityInDeal) : money(summary.equity), n: summary.equityGap > 0 ? `חסרים ${money(summary.equityGap)}` : '' },
  ]
    .map(
      (tile) => `
      <div class="pr-tile">
        <span class="k">${escapeHtml(tile.k)}</span>
        <span class="v">${escapeHtml(tile.v)}</span>
        ${tile.n ? `<span class="n">${escapeHtml(tile.n)}</span>` : ''}
      </div>`
    )
    .join('');

  const row = (label: string, value: string) =>
    `<div class="pr-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
  const dealRows = [
    row('סוג העסקה', summary.dealTypeLabel ?? '—'),
    row('כתובת הנכס', summary.propertyAddress ?? '—'),
    row('מחיר הנכס', money(summary.propertyValue)),
    row('הון עצמי מוצהר', money(summary.equity)),
    row('סכום המשכנתא המבוקש', summary.ready ? money(summary.mortgageAmount) : '—'),
    row('תקופה מבוקשת', describeMonths(summary.months)),
    ...(summary.maxYearsByAge !== null
      ? [row('תקופה מרבית לפי גיל (מדיניות מקובלת)', describeMonths(Math.min(30, summary.maxYearsByAge) * 12))]
      : []),
  ].join('');
  const householdRows = [
    ...summary.borrowers.map((borrower) =>
      row(
        `${borrower.label} · הכנסה נטו`,
        `${money(borrower.income)}${borrower.age !== null ? ` · גיל ${borrower.age}` : ''}${borrower.employment ? ` · ${borrower.employment}` : ''}${borrower.bank ? ` · בנק ${borrower.bank}` : ''}`
      )
    ),
    row('הכנסה חודשית מוכרת', money(summary.totalIncome)),
    row('החזר על הלוואות קיימות', money(summary.existingLoans)),
    row('הכנסה פנויה לחישוב ההחזר', money(summary.disposableIncome)),
  ].join('');

  const risks = report.risks
    .map(
      (risk) => `
      <div class="pr-risk ${risk.tone}">
        <b>${escapeHtml(risk.title)}</b>
        <span>${escapeHtml(risk.body)}</span>
      </div>`
    )
    .join('');

  const alerts = report.alerts
    .map(
      (item) => `
      <div class="pr-rec">
        <b>${escapeHtml(item.title)}</b>
        <span>${escapeHtml(item.body)}</span>
        ${item.bullets && item.bullets.length > 0 ? `<ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>` : ''}
      </div>`
    )
    .join('');

  const guidelines = report.guidelines
    .map(
      (item, index) => `
      <div class="pr-guide">
        <span class="num">${index + 1}</span>
        <div><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.body)}</span></div>
      </div>`
    )
    .join('');

  const recommendations = report.recommendations
    .map(
      (item) => `
      <div class="pr-rec">
        <b>${escapeHtml(item.title)}</b>
        <span>${escapeHtml(item.body)}</span>
      </div>`
    )
    .join('');

  return `<div class="pr-doc">
    <div class="pr-head">
      <div class="pr-brand">משכלנתא · דוח פרופיל פיננסי</div>
      <h1>${escapeHtml(planName || 'דוח פרופיל פיננסי')}</h1>
      <p class="pr-sub">${escapeHtml(report.headline)} · הופק ב-${date}</p>
    </div>

    <div class="pr-verdict ${report.overall}">
      <h2>${escapeHtml(overallHeadline(report.overall))}</h2>
    </div>

    <h3>מספרי המפתח</h3>
    <div class="pr-tiles">${tiles}</div>

    <div class="pr-cols">
      <div class="pr-col"><h4>נתוני העסקה</h4>${dealRows}</div>
      <div class="pr-col"><h4>פרופיל הלקוח</h4>${householdRows}</div>
    </div>

    <h3>עמידה בדרישות הבנקים ובמגבלות הרגולציה</h3>
    <table class="pr-table">
      <thead>
        <tr>
          <th>הבדיקה</th>
          <th>הערך שנמדד</th>
          <th>המגבלה</th>
          <th>התוצאה</th>
          <th>המשמעות</th>
        </tr>
      </thead>
      <tbody>${checks}</tbody>
    </table>

    <h3>התמונה הפיננסית</h3>
    <div class="pr-figures">${figures}</div>

    ${risks ? `<h3>סיכונים</h3>${risks}` : ''}

    ${alerts ? `<h3>המלצות שצפו בזמן מילוי הפרטים</h3>${alerts}` : ''}

    <h3>המסמכים שיידרשו לאימות הנתונים</h3>
    <p class="pr-note">
      הבנק אינו מסתמך על מה שהוצהר, אלא מאמת אותו מול מסמכים. אלה המסמכים שיידרשו לפי הרכב
      הלווים ואופן ההעסקה שהוזנו — שלושה חודשים אחורה בכל מסמך שוטף.
    </p>
    ${documents}

    <h3>התאמה בין המסמכים — הנקודה שמכשילה הכי הרבה בקשות</h3>
    <div class="pr-warn">
      <b>לפני ההגשה, הצליבו את הסכומים.</b>
      ${escapeHtml(DOCUMENT_CONSISTENCY_WARNING)}
    </div>

    ${
      recommendations
        ? `<h3>המלצות לתכנון התמהיל</h3>${recommendations}`
        : ''
    }

    <h3>קווים מנחים לבניית התמהיל</h3>
    <p class="pr-note">איזון בין עלות המימון, גמישות לשינויים ולפירעונות מוקדמים, סיכון ויציבות — לפי הפרופיל הפיננסי שלכם.</p>
    ${guidelines}

    <div class="pr-foot">
      הדוח מסכם את הנתונים שהוזנו בשלב הפרופיל הפיננסי ואת בדיקתם מול מגבלות בנק ישראל
      התקפות למועד ההפקה. הוא אינו אישור עקרוני ואינו מחייב בנק כלשהו: ההחלטה על אישור
      המשכנתא, גובהה והריביות שייקבעו נתונה לחיתום הבנק בלבד. הנתונים מבוססים על הצהרת
      הלקוח, וכל שינוי בהם — בהכנסה, בהלוואות הקיימות או במחיר הנכס — משנה את התוצאה.
    </div>
  </div>`;
}

/**
 * הדפסת הדוח, ומשם שמירה כ-PDF מתיבת ההדפסה של הדפדפן.
 *
 * המסמך נשתל בעמוד עצמו וכללי ההדפסה מורידים ממנו כל מה שאינו הוא, כך שמה
 * שיוצא לקובץ זהה למה שמוצג על המסך — גם בדפדפנים שמדפיסים תמיד את המסמך
 * הראשי ומתעלמים מהדפסה של חלונית פנימית.
 */
export function printProfileReport(report: ProfileReport, planName?: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  document
    .querySelectorAll(`.${PROFILE_REPORT_PRINT_ROOT_CLASS}, #${PRINT_STYLE_ID}`)
    .forEach((element) => element.remove());

  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `${PROFILE_REPORT_CSS}\n${PROFILE_REPORT_PRINT_CSS}`;

  const root = document.createElement('div');
  root.className = PROFILE_REPORT_PRINT_ROOT_CLASS;
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = profileReportBodyHtml(report, planName);

  document.head.appendChild(style);
  document.body.appendChild(root);

  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    root.remove();
    style.remove();
  };
  window.addEventListener('afterprint', cleanup);

  window.setTimeout(() => {
    try {
      window.print();
    } finally {
      window.setTimeout(cleanup, 60_000);
    }
  }, 60);
}
