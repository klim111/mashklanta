import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { pdfTextOrder } from './authorization-pdf';
import { autoTrackName, computeMix, formatDuration } from '@/components/mortgage-advisor/engine';
import type { MixBorrower, MixExplanation, MixResult, WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { DEAL_TYPES, formatTrackTypeWithAmortization } from '@/components/mortgage-advisor/types';

/**
 * דוח התמהיל — סיכום אחד שהיועץ מוריד או שולח ללקוח בצ'אט.
 *
 * מבנה ההסבר קבוע: הסבר כללי על התמהיל, ושורת יתרונות אחת לכל מסלול. מספר
 * שורות ההסבר הוא תמיד מספר המסלולים, כי ההסבר נשמר לפי מזהה המסלול ונבנה
 * מחדש מהמסלולים שבתמהיל — מסלול שנמחק לא משאיר שורה, ומסלול חדש מקבל שורה.
 */

export interface MixReportInput {
  mix: WorkspaceMix;
  explanation: MixExplanation;
  /** מי הכין את הדוח — שם היועץ */
  preparedBy?: string | null;
  /** שם הלקוח, כשהדוח נשלח ללקוח מסוים */
  clientName?: string | null;
  generatedAt?: Date;
}

export interface MixReportTrack {
  id: string;
  index: number;
  title: string;
  amount: number;
  percent: number;
  rate: number;
  years: number;
  monthlyPayment: number;
  totalInterest: number;
  advantages: string;
}

export interface MixReportModel {
  title: string;
  mixName: string;
  generatedAt: Date;
  preparedBy: string | null;
  clientName: string | null;
  deal: Array<{ label: string; value: string }>;
  borrowers: MixBorrower[];
  /** החזר חודשי ראשון מתוך סך ההכנסות של הלווים, כשהוזנו */
  paymentToIncome: number | null;
  summary: Array<{ label: string; value: string }>;
  overview: string;
  tracks: MixReportTrack[];
}

export function shekel(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value).toLocaleString('he-IL')} ש"ח`;
}

function percentText(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** הכותרת של מסלול בהסבר ובדוח: מספר, סוג הריבית ולוח הסילוקין */
export function trackTitle(track: WorkspaceMix['tracks'][number], index: number): string {
  const type = formatTrackTypeWithAmortization(track);
  // שם שהכלי נתן אוטומטית חוזר על הסוג, התקופה והריבית — מוצג רק שם שהיועץ בחר
  const name = track.name?.trim();
  const custom = name && name !== type && name !== autoTrackName(track) && !name.includes(' · ');
  return `מסלול ${index + 1} · ${type}${custom ? ` · ${name}` : ''}`;
}

/** ההסבר של התמהיל, מיושר למסלולים שבו: שורה אחת לכל מסלול, לפי הסדר */
export function alignExplanation(mix: WorkspaceMix, explanation?: MixExplanation | null): MixExplanation {
  const tracks: Record<string, string> = {};
  mix.tracks.forEach((track) => {
    tracks[track.id] = explanation?.tracks?.[track.id] ?? '';
  });
  return { overview: explanation?.overview ?? '', tracks };
}

/** מה עוד חסר בהסבר לפני שאפשר לשלוח — ריק כשהכול מולא */
export function explanationGaps(mix: WorkspaceMix, explanation: MixExplanation): string[] {
  const gaps: string[] = [];
  if (!explanation.overview.trim()) gaps.push('הסבר כללי על התמהיל');
  mix.tracks.forEach((track, index) => {
    if (!explanation.tracks[track.id]?.trim()) gaps.push(`היתרונות של מסלול ${index + 1}`);
  });
  return gaps;
}

export function mixReportModel(input: MixReportInput, result: MixResult = computeMix(input.mix)): MixReportModel {
  const { mix } = input;
  const explanation = alignExplanation(mix, input.explanation);
  const summary = result.summary;
  const total = mix.totalAmount || mix.tracks.reduce((sum, track) => sum + track.amount, 0);

  const deal: Array<{ label: string; value: string }> = [];
  if (mix.propertyAddress?.trim()) deal.push({ label: 'כתובת הנכס', value: mix.propertyAddress.trim() });
  if (mix.dealType) deal.push({ label: 'סוג העסקה', value: DEAL_TYPES[mix.dealType] });
  if (mix.propertyValue && mix.propertyValue > 0) {
    deal.push({ label: 'מחיר הנכס', value: shekel(mix.propertyValue) });
    deal.push({ label: 'הון עצמי', value: shekel(Math.max(0, mix.propertyValue - total)) });
  }
  deal.push({ label: 'סכום המשכנתא', value: shekel(total) });
  if (mix.propertyValue && mix.propertyValue > 0) {
    deal.push({ label: 'אחוז מימון', value: percentText((total / mix.propertyValue) * 100) });
  }

  const borrowers = (mix.borrowers ?? []).filter((item) => item.name.trim() || item.age || item.monthlyIncome);
  const income = borrowers.reduce((sum, item) => sum + (item.monthlyIncome ?? 0), 0);

  return {
    title: 'סיכום תמהיל משכנתא',
    mixName: mix.name?.trim() || 'תמהיל ללא שם',
    generatedAt: input.generatedAt ?? new Date(),
    preparedBy: input.preparedBy?.trim() || null,
    clientName: input.clientName?.trim() || null,
    deal,
    borrowers,
    paymentToIncome: income > 0 ? (summary.monthlyPayment / income) * 100 : null,
    summary: [
      { label: 'החזר חודשי ראשון', value: shekel(summary.monthlyPayment) },
      { label: 'החזר חודשי מרבי', value: shekel(summary.peakMonthlyPayment) },
      { label: 'ריבית ממוצעת', value: percentText(summary.averageRate, 2) },
      { label: 'משך', value: formatDuration(summary.months) },
      { label: 'סך הריבית', value: shekel(summary.totalInterest) },
      { label: 'סך התשלומים', value: shekel(summary.totalPaid) },
      { label: 'עלות לכל שקל', value: `${summary.costPerShekel.toFixed(2)} ש"ח` },
    ],
    overview: explanation.overview.trim(),
    tracks: mix.tracks.map((track, index) => {
      const detail = result.tracks.find((item) => item.track.id === track.id);
      return {
        id: track.id,
        index,
        title: trackTitle(track, index),
        amount: track.amount,
        percent: total > 0 ? (track.amount / total) * 100 : 0,
        rate: track.interestRate,
        years: track.years,
        monthlyPayment: detail?.monthlyPayment ?? 0,
        totalInterest: detail?.totalInterest ?? 0,
        advantages: explanation.tracks[track.id]?.trim() ?? '',
      };
    }),
  };
}

/** שם הקובץ — עם שם התמהיל, כדי שבצ'אט יהיה ברור מה נשלח */
export function mixReportFileName(mix: Pick<WorkspaceMix, 'name'>): string {
  const name = (mix.name || 'תמהיל').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 60) || 'תמהיל';
  return `סיכום תמהיל - ${name}.pdf`;
}

/** הטקסט שמלווה את הקובץ בהודעת הצ'אט */
export function mixReportMessage(model: Pick<MixReportModel, 'mixName' | 'overview' | 'summary' | 'tracks'>): string {
  const payment = model.summary.find((item) => item.label === 'החזר חודשי ראשון')?.value;
  const lines = [
    `שלחתי לך את התמהיל "${model.mixName}"${payment ? ` · החזר חודשי ראשון ${payment}` : ''}.`,
    model.overview,
    `בקובץ המצורף פירוט ${model.tracks.length} המסלולים והיתרונות של כל אחד מהם.`,
  ];
  return lines.filter(Boolean).join('\n\n');
}

// ───────────────────────────────── PDF ─────────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const RIGHT = PAGE_W - MARGIN;
const LEFT = MARGIN;

const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const LINE = rgb(0.89, 0.91, 0.94);
const BRAND = rgb(0.15, 0.39, 0.92);
const SOFT = rgb(0.94, 0.96, 1);
const NOTE_BG = rgb(0.96, 0.95, 1);
const NOTE_FG = rgb(0.33, 0.2, 0.62);
const WHITE = rgb(1, 1, 1);

const TRACK_COLORS = [
  rgb(0.15, 0.39, 0.92),
  rgb(0.05, 0.58, 0.53),
  rgb(0.85, 0.47, 0.02),
  rgb(0.55, 0.36, 0.96),
  rgb(0.86, 0.15, 0.47),
  rgb(0.03, 0.57, 0.7),
];

/** סימני כיווניות שמערכת העיצוב של המספרים מוסיפה — אין להם גליף בגופן */
const BIDI_MARKS = /[‎‏؜‪-‮⁦-⁩]/g;

function clean(text: string): string {
  return text.replace(BIDI_MARKS, '');
}

class Writer {
  page: PDFPage;
  y = PAGE_H - MARGIN;

  constructor(
    private readonly pdf: PDFDocument,
    readonly font: PDFFont
  ) {
    this.page = pdf.addPage([PAGE_W, PAGE_H]);
  }

  ensure(height: number): void {
    if (this.y - height >= MARGIN + 16) return;
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  width(text: string, size: number): number {
    return this.font.widthOfTextAtSize(pdfTextOrder(clean(text)), size);
  }

  right(text: string, right: number, y: number, size: number, color: RGB = INK) {
    const visual = pdfTextOrder(clean(text));
    const width = this.font.widthOfTextAtSize(visual, size);
    this.page.drawText(visual, { x: right - width, y, size, font: this.font, color });
  }

  left(text: string, left: number, y: number, size: number, color: RGB = INK) {
    this.page.drawText(pdfTextOrder(clean(text)), { x: left, y, size, font: this.font, color });
  }

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

  heading(text: string) {
    this.ensure(40);
    this.y -= 8;
    this.right(text, RIGHT, this.y - 14, 13.5, INK);
    this.y -= 22;
    this.rule(this.y, BRAND, 1.2);
    this.y -= 10;
  }

  /** פסקה שבורה לשורות, מיושרת לימין */
  paragraph(text: string, size = 10.5, color: RGB = INK, inset = 0) {
    for (const line of this.wrap(text, RIGHT - LEFT - inset * 2, size)) {
      this.ensure(size + 6);
      this.right(line, RIGHT - inset, this.y - size, size, color);
      this.y -= size + 5;
    }
  }

  /** רשת של זוגות תווית–ערך, שלוש בשורה */
  grid(items: Array<{ label: string; value: string }>, columns = 3) {
    const cell = (RIGHT - LEFT) / columns;
    for (let start = 0; start < items.length; start += columns) {
      this.ensure(44);
      items.slice(start, start + columns).forEach((item, offset) => {
        const right = RIGHT - offset * cell;
        this.rect(right - cell + 4, this.y - 40, cell - 8, 38, SOFT);
        this.right(item.label, right - 10, this.y - 15, 8.5, MUTED);
        this.right(item.value, right - 10, this.y - 31, 11.5, INK);
      });
      this.y -= 46;
    }
  }
}

function dateText(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export async function mixReportPdf(input: MixReportInput, fontBytes: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  const model = mixReportModel(input);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  pdf.setTitle(`${model.title} - ${model.mixName}`);
  const w = new Writer(pdf, font);

  // ── כותרת
  w.rect(0, PAGE_H - 96, PAGE_W, 96, BRAND);
  w.right('משכלנתא · דוח תמהיל', RIGHT, PAGE_H - 34, 10, WHITE);
  w.right(model.title, RIGHT, PAGE_H - 62, 22, WHITE);
  w.right(model.mixName, RIGHT, PAGE_H - 83, 12, WHITE);
  w.left(dateText(model.generatedAt), LEFT, PAGE_H - 34, 10, WHITE);
  w.y = PAGE_H - 112;
  const credits = [
    model.clientName ? `הוכן עבור ${model.clientName}` : '',
    model.preparedBy ? `על ידי ${model.preparedBy}` : '',
  ].filter(Boolean);
  if (credits.length) {
    w.right(credits.join(' · '), RIGHT, w.y - 10, 10.5, MUTED);
    w.y -= 20;
  }

  // ── עסקה
  w.heading('פרטי העסקה');
  w.grid(model.deal);

  // ── לווים
  if (model.borrowers.length > 0) {
    w.heading('הלווים');
    w.grid(
      model.borrowers.map((item, index) => ({
        label: `לווה ${index + 1}`,
        value: [
          item.name.trim() || '—',
          item.age ? `גיל ${item.age}` : '',
          item.monthlyIncome ? `הכנסה ${shekel(item.monthlyIncome)}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      })),
      2
    );
    if (model.paymentToIncome !== null) {
      w.paragraph(`ההחזר החודשי הראשון הוא ${model.paymentToIncome.toFixed(1)}% מסך ההכנסות של הלווים.`, 10, MUTED);
      w.y -= 4;
    }
  }

  // ── סיכום
  w.heading('סיכום התמהיל');
  w.grid(model.summary);

  // ── הסבר כללי
  if (model.overview) {
    w.heading('הסבר כללי על התמהיל');
    const lines = w.wrap(model.overview, RIGHT - LEFT - 28, 11);
    const height = lines.length * 16 + 20;
    w.ensure(Math.min(height, 200));
    // רקע רק כשההסבר נכנס כולו בעמוד — הסבר ארוך ממשיך לעמוד הבא בלי מסגרת
    if (w.y - height >= MARGIN + 16) w.rect(LEFT, w.y - height, RIGHT - LEFT, height, NOTE_BG);
    w.y -= 10;
    lines.forEach((line) => {
      w.ensure(18);
      w.right(line, RIGHT - 14, w.y - 12, 11, NOTE_FG);
      w.y -= 16;
    });
    w.y -= 14;
  }

  // ── מסלולים
  w.heading(`מסלולי התמהיל (${model.tracks.length})`);
  model.tracks.forEach((track) => {
    const color = TRACK_COLORS[track.index % TRACK_COLORS.length];
    const facts = [
      shekel(track.amount),
      `${track.percent.toFixed(1)}% מהמשכנתא`,
      // מילה עברית לפני כל מספר — שני מספרים סמוכים מתהפכים בכיווניות של ה-PDF
      `ריבית ${track.rate.toFixed(2)}%`,
      `תקופה ${track.years} שנים`,
      `החזר ${shekel(track.monthlyPayment)}`,
    ].join(' · ');
    const advantages = track.advantages ? w.wrap(track.advantages, RIGHT - LEFT - 34, 10.5) : [];
    const height = 44 + (advantages.length ? 16 + advantages.length * 15 : 0) + 8;
    w.ensure(Math.min(height, 260));
    const top = w.y;
    if (top - height >= MARGIN + 16) w.rect(RIGHT - 4, top - height + 6, 4, height - 6, color);
    w.right(track.title, RIGHT - 14, top - 14, 12, INK);
    w.right(facts, RIGHT - 14, top - 32, 9.5, MUTED);
    w.y = top - 44;
    if (advantages.length) {
      w.right('יתרונות המסלול:', RIGHT - 14, w.y - 10, 10, color);
      w.y -= 16;
      advantages.forEach((line) => {
        w.ensure(16);
        w.right(line, RIGHT - 20, w.y - 10, 10.5, INK);
        w.y -= 15;
      });
    }
    w.y -= 8;
    w.rule(w.y);
    w.y -= 8;
  });

  // ── הערה
  w.ensure(40);
  w.y -= 6;
  w.paragraph(
    'החישוב מבוסס על הריביות וההנחות שהוזנו בכלי במועד הפקת הדוח, כולל תחזית מדד וריבית במסלולים הצמודים והמשתנים. ההצעה הסופית נקבעת על ידי הבנק.',
    8.5,
    MUTED
  );

  return pdf.save();
}
