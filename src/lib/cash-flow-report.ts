/**
 * דוח מצב הון ותזרים — כאקסל וכ-PDF.
 *
 * שני הקבצים מציגים את אותו סיכום: ההכנסה הפנויה, המשכנתא, כל הלוואה וההחזר
 * שלה, סך ההחזר, יחס ההחזר בפועל ויחס ההחזר לחישוב כושר ההחזר למשכנתא.
 * באקסל יש גם גיליון של התזרים החודשי. ה-PDF נבנה בדפדפן עם pdf-lib והגופן
 * של הפלטפורמה, כמו דוח פעימות התשלום.
 */

import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { pdfTextOrder } from './authorization-pdf';
import {
  LONG_LOAN_MONTHS,
  MORTGAGE_RATIO_LIMIT,
  cashFlowAlerts,
  incomeTotal,
  isLongLoan,
  loanPayment,
  maxMortgageAmount,
  monthLabel,
  summarize,
  timeline,
} from './cash-flow';
import type { CashFlowState, IncomeOwner } from './cash-flow';
import type { XlsxCell, XlsxSheet, XlsxStyle } from './xlsx';

const shekel = (value: number) => `₪${Math.round(value).toLocaleString('he-IL')}`;
const pct = (ratio: number | null) => (ratio === null ? '—' : `${(ratio * 100).toFixed(1)}%`);

function ownerName(state: CashFlowState, owner: IncomeOwner): string {
  if (owner === 'partner') return state.partnerName || 'בן/בת הזוג';
  return state.borrowerName || (state.household === 'COUPLE' ? 'לווה 1' : 'הלווה');
}

function loanTitle(state: CashFlowState, index: number): string {
  return state.loans[index].name || `הלוואה ${index + 1}`;
}

export function cashFlowFileName(ext: 'pdf' | 'xlsx', date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `מצב-הון-ותזרים-${stamp}.${ext}`;
}

// ───────────────────────────── אקסל ─────────────────────────────

const NAVY = '0B2545';
const SOFT = 'F4F7FC';
const LINE = 'DBE3EF';
const box = { top: { style: 'thin' as const, color: LINE }, bottom: { style: 'thin' as const, color: LINE }, left: { style: 'thin' as const, color: LINE }, right: { style: 'thin' as const, color: LINE } };
const title: XlsxStyle = { font: { bold: true, size: 18, color: 'FFFFFF' }, fill: NAVY, align: { horizontal: 'right', vertical: 'center' } };
const section: XlsxStyle = { font: { bold: true, size: 13, color: NAVY }, fill: SOFT, border: { bottom: { style: 'medium', color: '1D4ED8' } }, align: { horizontal: 'right' } };
const head: XlsxStyle = { font: { bold: true, size: 11, color: 'FFFFFF' }, fill: '1D4ED8', border: box, align: { horizontal: 'center', vertical: 'center', wrap: true } };
const label: XlsxStyle = { font: { bold: true, color: '475569' }, fill: SOFT, border: box, align: { horizontal: 'right' } };
const text: XlsxStyle = { border: box, align: { horizontal: 'right' } };
const money: XlsxStyle = { border: box, format: 'shekel', align: { horizontal: 'center' } };
const moneyBold: XlsxStyle = { ...money, font: { bold: true, color: NAVY } };
const percent: XlsxStyle = { border: box, format: 'percent', align: { horizontal: 'center' } };
const integer: XlsxStyle = { border: box, format: 'integer', align: { horizontal: 'center' } };
const note: XlsxStyle = { font: { size: 10, color: '475569' }, align: { horizontal: 'right', wrap: true } };

const c = (value: XlsxCell['value'], style: XlsxStyle): XlsxCell => ({ value, style });
const ratioCell = (ratio: number | null) => c(ratio === null ? '—' : Math.round(ratio * 10000) / 100, percent);

export function cashFlowSheets(state: CashFlowState, generatedAt = new Date()): XlsxSheet[] {
  const summary = summarize(state);
  const maxAmount = maxMortgageAmount(state, summary);
  const owners: IncomeOwner[] = state.household === 'COUPLE' ? ['borrower', 'partner'] : ['borrower'];

  const rows: XlsxSheet['rows'] = [
    { cells: [c('מצב הון ותזרים · משכלנתא', title), c('', title), c('', title), c('', title), c('', title), c('', title)], height: 32 },
    { cells: [c(`הופק ב-${generatedAt.toLocaleDateString('he-IL')}`, note)] },
    { cells: [] },
    { cells: [c('סיכום', section), c('', section), c('', section), c('', section), c('', section), c('', section)] },
    { cells: [c('הכנסה פנויה', label), c(summary.income, moneyBold)] },
    { cells: [c('החזר משכנתא', label), c(summary.mortgagePayment, money)] },
    { cells: [c('החזר הלוואות', label), c(summary.loansPayment, money)] },
    { cells: [c(`  מתוכן הלוואות מעל ${LONG_LOAN_MONTHS} חודשים`, label), c(summary.longLoansPayment, money)] },
    { cells: [c('סך ההחזר החודשי', label), c(summary.totalPayment, moneyBold)] },
    { cells: [c('נשאר פנוי אחרי כל ההחזרים', label), c(summary.freeMoney, moneyBold)] },
    { cells: [c('יחס החזר בפועל', label), ratioCell(summary.actualRatio)] },
    { cells: [c('הכנסה לחישוב כושר ההחזר', label), c(summary.incomeForMortgage, money)] },
    { cells: [c('יחס החזר לחישוב כושר ההחזר למשכנתא', label), ratioCell(summary.mortgageRatio)] },
    { cells: [c(`החזר מקסימלי למשכנתא (${MORTGAGE_RATIO_LIMIT * 100}%)`, label), c(summary.maxMortgagePayment, money)] },
    ...(maxAmount !== null ? [{ cells: [c('משכנתא מקסימלית באותה ריבית ותקופה', label), c(maxAmount, money)] }] : []),
    { cells: [] },
    { cells: [c('הכנסה פנויה', section), c('', section), c('', section), c('', section), c('', section), c('', section)] },
    { cells: [c('לווה', head), c('מקור', head), c('סכום חודשי', head)] },
    ...owners.flatMap((owner) =>
      state.incomes[owner].map((row) => ({
        cells: [c(ownerName(state, owner), text), c(row.label || '—', text), c(row.amount ?? 0, money)],
      }))
    ),
    { cells: [c('סך הכול', label), c('', label), c(incomeTotal(state), moneyBold)] },
    { cells: [] },
    { cells: [c('משכנתא והלוואות', section), c('', section), c('', section), c('', section), c('', section), c('', section)] },
    { cells: [c('שם', head), c('סכום / יתרה', head), c('ריבית', head), c('חודשים', head), c('החזר חודשי', head), c('בחישוב המשכנתא', head)] },
    {
      cells: [
        c('משכנתא', text),
        c(state.mortgage.amount ?? 0, money),
        c(state.mortgage.rate ?? '—', percent),
        c((state.mortgage.years ?? 0) * 12, integer),
        c(summary.mortgagePayment, moneyBold),
        c('—', text),
      ],
    },
    ...state.loans.map((loan, index) => ({
      cells: [
        c(loanTitle(state, index), text),
        c(loan.amount ?? '—', money),
        c(loan.rate ?? '—', percent),
        c(loan.months ?? '—', integer),
        c(loanPayment(loan), moneyBold),
        c(isLongLoan(loan) ? 'נוגסת בהכנסה' : 'לא נכללת', text),
      ],
    })),
    { cells: [c('סך ההחזר', label), c('', label), c('', label), c('', label), c(summary.totalPayment, moneyBold), c('', label)] },
    { cells: [] },
    { cells: [c('התרעות', section), c('', section), c('', section), c('', section), c('', section), c('', section)] },
    ...cashFlowAlerts(state, summary).map((alert) => ({ cells: [c(`${alert.title}. ${alert.text}`, note)], height: 30 })),
  ];

  const merges = ['A1:F1'];
  rows.forEach((row, index) => {
    if (row.cells.length === 1 && index > 1 && (row.cells[0] as XlsxCell).style === note) merges.push(`A${index + 1}:F${index + 1}`);
  });

  const points = timeline(state);
  const flow: XlsxSheet = {
    name: 'תזרים חודשי',
    columns: [12, 14, ...state.loans.map(() => 14), 14, 14, 12, 14],
    rows: [
      {
        cells: [
          c('חודש', head),
          c('משכנתא', head),
          ...state.loans.map((_, index) => c(loanTitle(state, index), head)),
          c('סך החזר', head),
          c('נשאר פנוי', head),
          c('יחס בפועל', head),
          c('יחס למשכנתא', head),
        ],
        height: 30,
      },
      ...points.map((point) => ({
        cells: [
          c(monthLabel(point.month, generatedAt), text),
          c(point.mortgage, money),
          ...state.loans.map((loan) => c(point.loans[loan.id] ?? 0, money)),
          c(point.total, moneyBold),
          c(point.free, money),
          ratioCell(point.actualRatio),
          ratioCell(point.mortgageRatio),
        ],
      })),
    ],
  };

  return [{ name: 'סיכום', columns: [40, 16, 12, 12, 16, 18], merges, rows }, flow];
}

// ───────────────────────────── PDF ─────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const RIGHT = PAGE_W - MARGIN;
const LEFT = MARGIN;
const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const LINE_C = rgb(0.89, 0.91, 0.94);
const BLUE = rgb(0.16, 0.47, 0.84);
const SOFT_C = rgb(0.96, 0.97, 0.99);
const GOOD = rgb(0.02, 0.47, 0.34);
const BAD = rgb(0.75, 0.1, 0.2);
const WARN = rgb(0.6, 0.38, 0.02);
const BIDI_MARKS = /[‎‏؜‪-‮⁦-⁩]/g;

class Writer {
  page: PDFPage;
  y = PAGE_H - MARGIN;
  constructor(private readonly pdf: PDFDocument, readonly font: PDFFont) {
    this.page = pdf.addPage([PAGE_W, PAGE_H]);
  }
  ensure(height: number) {
    if (this.y - height >= MARGIN) return;
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }
  visual(value: string) {
    return pdfTextOrder(value.replace(BIDI_MARKS, ''));
  }
  width(value: string, size: number) {
    return this.font.widthOfTextAtSize(this.visual(value), size);
  }
  right(value: string, right: number, y: number, size: number, color: RGB = INK) {
    const visual = this.visual(value);
    this.page.drawText(visual, { x: right - this.font.widthOfTextAtSize(visual, size), y, size, font: this.font, color });
  }
  left(value: string, left: number, y: number, size: number, color: RGB = INK) {
    this.page.drawText(this.visual(value), { x: left, y, size, font: this.font, color });
  }
  wrap(value: string, width: number, size: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of value.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && this.width(candidate, size) > width) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  }
  rect(x: number, y: number, w: number, h: number, color: RGB) {
    this.page.drawRectangle({ x, y, width: w, height: h, color });
  }
  rule(y: number) {
    this.page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 0.8, color: LINE_C });
  }
  heading(value: string) {
    this.ensure(40);
    this.y -= 22;
    this.right(value, RIGHT, this.y, 14, INK);
    this.y -= 8;
    this.rule(this.y);
    this.y -= 4;
  }
}

export async function cashFlowPdf(state: CashFlowState, fontBytes: Uint8Array | ArrayBuffer, generatedAt = new Date()): Promise<Uint8Array> {
  const summary = summarize(state);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const w = new Writer(pdf, font);

  w.right('משכלנתא', RIGHT, w.y - 10, 10, BLUE);
  w.left(generatedAt.toLocaleDateString('he-IL'), LEFT, w.y - 10, 10, MUTED);
  w.y -= 36;
  w.right('מצב הון ותזרים', RIGHT, w.y, 22, INK);
  w.y -= 18;
  w.right('המשכנתא, כל ההלוואות, ההחזר החודשי ויחס ההחזר מההכנסה הפנויה', RIGHT, w.y, 11, MUTED);
  w.y -= 18;

  // ── ארבעה מספרים מרכזיים
  const tiles: [string, string, RGB][] = [
    ['הכנסה פנויה', shekel(summary.income), INK],
    ['סך ההחזר החודשי', shekel(summary.totalPayment), INK],
    ['נשאר פנוי', shekel(summary.freeMoney), summary.freeMoney < 0 ? BAD : GOOD],
    [
      'יחס החזר למשכנתא',
      pct(summary.mortgageRatio),
      summary.mortgageRatio !== null && summary.mortgageRatio > MORTGAGE_RATIO_LIMIT ? BAD : INK,
    ],
  ];
  const gap = 8;
  const tileW = (RIGHT - LEFT - gap * 3) / 4;
  tiles.forEach(([caption, value, color], index) => {
    const right = RIGHT - index * (tileW + gap);
    w.rect(right - tileW, w.y - 52, tileW, 52, SOFT_C);
    w.right(caption, right - 8, w.y - 18, 9, MUTED);
    w.right(value, right - 8, w.y - 40, 16, color);
  });
  w.y -= 62;

  // ── טבלת סיכום
  w.heading('סיכום התזרים');
  const line = (caption: string, value: string, color: RGB = INK) => {
    w.ensure(18);
    w.y -= 16;
    w.right(caption, RIGHT, w.y, 10.5, MUTED);
    w.left(value, LEFT, w.y, 10.5, color);
  };
  line('הכנסה פנויה', shekel(summary.income));
  line('החזר משכנתא', shekel(summary.mortgagePayment));
  line('החזר כל ההלוואות', shekel(summary.loansPayment));
  line(`מתוכן הלוואות מעל ${LONG_LOAN_MONTHS} חודשים (נוגסות בהכנסה)`, shekel(summary.longLoansPayment));
  line('סך ההחזר החודשי', shekel(summary.totalPayment));
  line('נשאר פנוי אחרי כל ההחזרים', shekel(summary.freeMoney), summary.freeMoney < 0 ? BAD : GOOD);
  line('יחס החזר בפועל (כל ההחזרים מההכנסה)', pct(summary.actualRatio));
  line('הכנסה לחישוב כושר ההחזר (אחרי הלוואות ארוכות)', shekel(summary.incomeForMortgage));
  line('יחס החזר לחישוב כושר ההחזר למשכנתא', pct(summary.mortgageRatio));
  line('החזר מקסימלי למשכנתא לפי 40%', shekel(summary.maxMortgagePayment));
  const maxAmount = maxMortgageAmount(state, summary);
  if (maxAmount !== null) line('משכנתא מקסימלית באותה ריבית ותקופה', shekel(maxAmount));

  // ── הכנסות
  w.heading('הכנסה פנויה');
  const owners: IncomeOwner[] = state.household === 'COUPLE' ? ['borrower', 'partner'] : ['borrower'];
  for (const owner of owners) {
    for (const row of state.incomes[owner]) {
      line(`${ownerName(state, owner)} · ${row.label || 'הכנסה'}`, shekel(row.amount ?? 0));
    }
  }

  // ── משכנתא והלוואות כטבלה
  w.heading('המשכנתא וההלוואות');
  const cols: [string, number][] = [
    ['שם', RIGHT],
    ['סכום', RIGHT - 170],
    ['ריבית', RIGHT - 255],
    ['חודשים', RIGHT - 310],
    ['החזר חודשי', RIGHT - 370],
    ['במשכנתא', RIGHT - 450],
  ];
  w.ensure(20);
  w.y -= 16;
  cols.forEach(([caption, right]) => w.right(caption, right, w.y, 9, MUTED));
  w.y -= 6;
  w.rule(w.y);
  const tableRow = (values: string[], strong = false) => {
    w.ensure(18);
    w.y -= 16;
    values.forEach((value, index) => w.right(value, cols[index][1], w.y, 10, strong && index === 4 ? BLUE : INK));
  };
  tableRow(
    [
      'משכנתא',
      state.mortgage.amount ? shekel(state.mortgage.amount) : '—',
      state.mortgage.rate !== null ? `${state.mortgage.rate}%` : '—',
      state.mortgage.years ? `${state.mortgage.years * 12}` : '—',
      shekel(summary.mortgagePayment),
      '—',
    ],
    true
  );
  state.loans.forEach((loan, index) => {
    tableRow(
      [
        loanTitle(state, index),
        loan.amount ? shekel(loan.amount) : '—',
        loan.rate !== null ? `${loan.rate}%` : '—',
        loan.months ? `${loan.months}` : '—',
        shekel(loanPayment(loan)),
        isLongLoan(loan) ? 'נוגסת' : 'לא נכללת',
      ],
      true
    );
  });
  w.y -= 6;
  w.rule(w.y);
  tableRow(['סך ההחזר', '', '', '', shekel(summary.totalPayment), ''], true);

  // ── התרעות
  const alerts = cashFlowAlerts(state, summary);
  if (alerts.length) {
    w.heading('התרעות');
    for (const alert of alerts) {
      const color = alert.tone === 'bad' ? BAD : alert.tone === 'warn' ? WARN : alert.tone === 'good' ? GOOD : INK;
      const body = w.wrap(alert.text, RIGHT - LEFT, 9.5);
      w.ensure(18 + body.length * 13);
      w.y -= 16;
      w.right(alert.title, RIGHT, w.y, 10.5, color);
      for (const part of body) {
        w.y -= 13;
        w.right(part, RIGHT, w.y, 9.5, MUTED);
      }
      w.y -= 4;
    }
  }

  // ── כשההלוואות מסתיימות
  const ends = state.loans
    .map((loan, index) => ({ loan, index }))
    .filter(({ loan }) => loan.months)
    .sort((a, b) => (a.loan.months ?? 0) - (b.loan.months ?? 0));
  if (ends.length) {
    w.heading('מתי ההחזר יורד');
    const points = timeline(state);
    for (const { loan, index } of ends) {
      const after = points[Math.min(loan.months!, points.length - 1)];
      line(
        `${loanTitle(state, index)} מסתיימת ב${monthLabel(loan.months!, generatedAt)}`,
        `אחריה: החזר ${shekel(after.total)} · פנוי ${shekel(after.free)}`
      );
    }
  }

  w.ensure(30);
  w.y -= 26;
  for (const part of w.wrap(
    'החישוב בשפיצר, נומינלי וללא הצמדה למדד. הלוואה שנותרו לה יותר מ-18 חודשים מופחתת מההכנסה הפנויה לחישוב כושר ההחזר, והחזר המשכנתא לא יעלה על 40% ממה שנותר. זו הערכה, וההחלטה הסופית של הבנק.',
    RIGHT - LEFT,
    8.5
  )) {
    w.right(part, RIGHT, w.y, 8.5, MUTED);
    w.y -= 11;
  }

  return pdf.save();
}
