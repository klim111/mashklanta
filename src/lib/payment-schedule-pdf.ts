import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { pdfTextOrder } from './authorization-pdf';
import {
  BANK_EQUITY_EXPLANATION,
  FULL_EQUITY_NOTE,
  LAWYER_NOTES,
  equityPaidBeforeBank,
  equityShare,
  requiredEquityBeforeBank,
  scheduleIssues,
  sumBySource,
} from './payment-schedule';
import { formatDueDate, installmentLabel, shekelText } from './payment-schedule-report';
import type { ScheduleReportInput } from './payment-schedule-report';

/**
 * דוח פעימות התשלום כ-PDF, באותו מבנה כמו עמוד ה-HTML. נבנה בדפדפן עם
 * pdf-lib והגופן של כתבי ההסמכה, ולכן הקוד מקבל את בייטי הגופן ואינו טוען
 * דבר בעצמו.
 */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const RIGHT = PAGE_W - MARGIN;
const LEFT = MARGIN;

const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const LINE = rgb(0.89, 0.91, 0.94);
const EQUITY = rgb(0.05, 0.58, 0.53);
const BANK = rgb(0.15, 0.39, 0.92);
const DARK = rgb(0.06, 0.09, 0.16);
const WHITE = rgb(1, 1, 1);
const NOTE_BG = rgb(1, 0.98, 0.92);
const NOTE_FG = rgb(0.47, 0.21, 0.06);
const INFO_BG = rgb(0.94, 0.96, 1);
const INFO_FG = rgb(0.12, 0.23, 0.54);
const BAD_BG = rgb(1, 0.95, 0.95);
const BAD_FG = rgb(0.62, 0.07, 0.22);

/** עמודות הטבלה מימין לשמאל: [קצה ימני, רוחב] */
const COLUMNS = {
  number: [RIGHT, 62],
  payee: [RIGHT - 62, 120],
  condition: [RIGHT - 182, 233],
  amount: [RIGHT - 415, 100],
} as const;

/** סימני כיווניות שמערכת העיצוב של המספרים מוסיפה — אין להם גליף בגופן */
const BIDI_MARKS = /[‎‏؜‪-‮⁦-⁩]/g;

class Writer {
  page: PDFPage;
  y = PAGE_H - MARGIN;

  constructor(
    private readonly pdf: PDFDocument,
    readonly font: PDFFont
  ) {
    this.page = pdf.addPage([PAGE_W, PAGE_H]);
  }

  newPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  /** מקום ל-`height` נקודות לפני סוף העמוד, אחרת עמוד חדש */
  ensure(height: number): boolean {
    if (this.y - height >= MARGIN) return false;
    this.newPage();
    return true;
  }

  width(text: string, size: number): number {
    return this.font.widthOfTextAtSize(pdfTextOrder(clean(text)), size);
  }

  /** טקסט מיושר לימין, שהקצה הימני שלו ב-`right` */
  right(text: string, right: number, y: number, size: number, color: RGB = INK) {
    const visual = pdfTextOrder(clean(text));
    const width = this.font.widthOfTextAtSize(visual, size);
    this.page.drawText(visual, { x: right - width, y, size, font: this.font, color });
  }

  left(text: string, left: number, y: number, size: number, color: RGB = INK) {
    this.page.drawText(pdfTextOrder(clean(text)), { x: left, y, size, font: this.font, color });
  }

  center(text: string, y: number, size: number, color: RGB = INK) {
    const visual = pdfTextOrder(clean(text));
    const width = this.font.widthOfTextAtSize(visual, size);
    this.page.drawText(visual, { x: (PAGE_W - width) / 2, y, size, font: this.font, color });
  }

  /** שבירת שורות לפי מילים, לרוחב נתון */
  wrap(text: string, width: number, size: number): string[] {
    const lines: string[] = [];
    for (const paragraph of clean(text).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && this.width(candidate, size) > width) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
    }
    return lines.length ? lines : [''];
  }

  rect(x: number, y: number, width: number, height: number, color: RGB) {
    this.page.drawRectangle({ x, y, width, height, color });
  }

  rule(y: number, color: RGB = LINE, thickness = 0.8) {
    this.page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness, color });
  }
}

function clean(text: string): string {
  return text.replace(BIDI_MARKS, '');
}

function percent(part: number, total: number): string {
  return total ? `${((part / total) * 100).toFixed(1)}%` : '0%';
}

export async function scheduleReportPdf(input: ScheduleReportInput, fontBytes: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  const { schedule, title, propertyAddress, generatedAt } = input;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const w = new Writer(pdf, font);

  const price = schedule.propertyPrice ?? 0;
  const bank = schedule.bankAmount ?? 0;
  const equity = equityShare(schedule) ?? 0;

  // ── כותרת
  w.right('לוח תשלומים לפי החוזה · משכלנתא', RIGHT, w.y - 10, 10, BANK);
  w.y -= 36;
  w.right('פעימות התשלום למוכר', RIGHT, w.y, 22, INK);
  w.y -= 20;
  for (const line of w.wrap(
    `${propertyAddress || title}. הפעימות לפי הסדר בחוזה, וליד כל אחת מקור הכסף שלה.`,
    RIGHT - LEFT,
    11
  )) {
    w.right(line, RIGHT, w.y, 11, MUTED);
    w.y -= 15;
  }

  // ── סיכום
  w.y -= 14;
  w.center('מחיר הנכס', w.y, 10, MUTED);
  w.y -= 22;
  w.center(shekelText(price), w.y, 20, INK);
  w.y -= 16;
  const barWidth = RIGHT - LEFT;
  const equityWidth = price ? (equity / price) * barWidth : 0;
  w.rect(LEFT, w.y, barWidth, 7, LINE);
  // הון עצמי מימין, כמו בעמוד
  w.rect(RIGHT - equityWidth, w.y, equityWidth, 7, EQUITY);
  w.rect(LEFT, w.y, barWidth - equityWidth, 7, BANK);
  w.y -= 18;
  const half = barWidth / 2;
  w.right(`הון עצמי · ${percent(equity, price)}`, RIGHT - half / 2 + w.width(`הון עצמי · ${percent(equity, price)}`, 10) / 2, w.y, 10, MUTED);
  w.right(`משכנתא · ${percent(bank, price)}`, LEFT + half / 2 + w.width(`משכנתא · ${percent(bank, price)}`, 10) / 2, w.y, 10, MUTED);
  w.y -= 18;
  w.right(shekelText(equity), RIGHT - half / 2 + w.width(shekelText(equity), 15) / 2, w.y, 15, EQUITY);
  w.right(shekelText(bank), LEFT + half / 2 + w.width(shekelText(bank), 15) / 2, w.y, 15, BANK);
  w.y -= 28;

  // ── הטבלה
  const header = () => {
    w.rule(w.y + 4);
    w.right('פעימה', COLUMNS.number[0] - 6, w.y - 10, 9, MUTED);
    w.right('למי מועבר', COLUMNS.payee[0] - 6, w.y - 10, 9, MUTED);
    w.right('באיזה שלב / במה מותנה', COLUMNS.condition[0] - 6, w.y - 10, 9, MUTED);
    w.left('סכום', COLUMNS.amount[0] - COLUMNS.amount[1] + 6, w.y - 10, 9, MUTED);
    w.y -= 18;
    w.rule(w.y);
  };
  header();

  schedule.installments.forEach((item, index) => {
    const fromEquity = item.source === 'EQUITY';
    const color = fromEquity ? EQUITY : BANK;
    const conditionLines = w.wrap(
      [item.dueDate ? `${formatDueDate(item.dueDate)}.` : '', item.condition].filter(Boolean).join(' '),
      COLUMNS.condition[1] - 12,
      9.5
    );
    const payeeLines = w.wrap(item.payee || '—', COLUMNS.payee[1] - 12, 9.5);
    const height = Math.max(conditionLines.length, payeeLines.length, 2) * 13 + 14;
    if (w.ensure(height)) header();
    const top = w.y - 15;
    w.rect(RIGHT - 3, w.y - height, 3, height, color);
    w.right(installmentLabel(index), COLUMNS.number[0] - 8, top, 10.5, INK);
    w.right(fromEquity ? 'הון עצמי' : 'כספי הבנק', COLUMNS.number[0] - 8, top - 13, 8.5, color);
    payeeLines.forEach((line, i) => w.right(line, COLUMNS.payee[0] - 6, top - i * 13, 9.5, INK));
    conditionLines.forEach((line, i) => w.right(line, COLUMNS.condition[0] - 6, top - i * 13, 9.5, INK));
    w.left(shekelText(item.amount), COLUMNS.amount[0] - COLUMNS.amount[1] + 6, top, 10.5, INK);
    w.y -= height;
    w.rule(w.y);
  });

  const subtotal = (label: string, value: number, color: RGB) => {
    if (w.ensure(24)) header();
    w.right(label, COLUMNS.number[0] - 8, w.y - 15, 10.5, color);
    w.left(shekelText(value), COLUMNS.amount[0] - COLUMNS.amount[1] + 6, w.y - 15, 10.5, color);
    w.y -= 22;
    w.rule(w.y, LINE, 1.4);
  };

  subtotal(`סך הכל מההון העצמי (${percent(equity, price)} מהעסקה)`, sumBySource(schedule, 'EQUITY'), EQUITY);
  subtotal(`סך הכל מכספי המשכנתא (${percent(bank, price)} מהעסקה)`, sumBySource(schedule, 'BANK'), BANK);

  w.ensure(32);
  w.rect(LEFT, w.y - 30, RIGHT - LEFT, 30, DARK);
  const paid = sumBySource(schedule, 'EQUITY') + sumBySource(schedule, 'BANK');
  w.right(
    `סך הכל · ${shekelText(sumBySource(schedule, 'EQUITY'))} הון עצמי + ${shekelText(sumBySource(schedule, 'BANK'))} משכנתא`,
    RIGHT - 8,
    w.y - 19,
    10.5,
    WHITE
  );
  w.left(shekelText(paid), LEFT + 8, w.y - 20, 13, WHITE);
  w.y -= 46;

  // ── תיבות הסבר
  const box = (heading: string, lines: string[], bg: RGB, fg: RGB) => {
    const width = RIGHT - LEFT - 24;
    const wrapped = lines.flatMap((line) => w.wrap(line, width - 10, 10).map((text, i) => ({ text, bullet: i === 0 && lines.length > 1 })));
    const height = 30 + wrapped.length * 14 + 10;
    w.ensure(height);
    w.rect(LEFT, w.y - height, RIGHT - LEFT, height, bg);
    w.right(heading, RIGHT - 12, w.y - 20, 12, fg);
    wrapped.forEach((line, i) => {
      const y = w.y - 38 - i * 14;
      if (line.bullet) w.right('•', RIGHT - 12, y, 10, fg);
      w.right(line.text, RIGHT - (lines.length > 1 ? 22 : 12), y, 10, fg);
    });
    w.y -= height + 12;
  };

  const issues = scheduleIssues(schedule);
  if (issues.length) box('הלוח עוד לא תקין', issues.map((issue) => issue.message), BAD_BG, BAD_FG);
  const required = requiredEquityBeforeBank(schedule);
  const hasBank = schedule.installments.some((item) => item.source === 'BANK');
  box(
    'ההון העצמי שהבנק דורש לפני כספי המשכנתא',
    [
      required === null
        ? 'האחוז שהבנק דורש עוד לא הוזן בכלי. בררו אותו מול הבנק.'
        : `הבנק דורש ${schedule.bankRequiredEquityPercent}% מההון העצמי (${shekelText(required)}) לפני הפעימה הראשונה מכספי המשכנתא.${
            hasBank ? ` לפי הלוח משולמים עד אליה ${shekelText(equityPaidBeforeBank(schedule))} מההון העצמי.` : ''
          }`,
      BANK_EQUITY_EXPLANATION,
      `שימו לב: ${FULL_EQUITY_NOTE}`,
    ],
    INFO_BG,
    INFO_FG
  );
  box('לבדיקה עם עורך הדין', [...LAWYER_NOTES], NOTE_BG, NOTE_FG);

  const stamp = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(generatedAt);
  for (const line of w.wrap(
    `הסכומים בשקלים חדשים. הסכום הכולל ${Math.abs(paid - price) <= 1 ? 'תואם' : 'אינו תואם'} למחיר הנכס: ${shekelText(price)}. הופק ב-${stamp}. הדוח אינו ייעוץ משפטי; נוסח החוזה נקבע עם עורך הדין.`,
    RIGHT - LEFT,
    9
  )) {
    w.ensure(14);
    w.right(line, RIGHT, w.y, 9, MUTED);
    w.y -= 13;
  }

  pdf.setTitle('פעימות התשלום למוכר');
  pdf.setProducer('משכלנתא');
  return pdf.save();
}
