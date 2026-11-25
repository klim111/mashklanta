import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { authorizationFormSpec, fieldValue } from './authorization-forms';
import type { AuthorizationFillInput, Box } from './authorization-forms';

/**
 * מילוי טופס כתב הסמכה: הפרטים נכתבים בתיבות שבמפה, החתימות מוטבעות במקומן,
 * והתוצאה היא קובץ PDF אחד — הטופס המקורי של הבנק, מלא וחתום.
 *
 * הקוד רץ גם בדפדפן וגם ב-Node: הוא מקבל את הבייטים של הטופס, של הגופן ושל
 * תמונות החתימה, ואינו טוען דבר בעצמו.
 */

const INK = rgb(0.06, 0.1, 0.35);
const MAX_SIZE = 10;
const MIN_SIZE = 6;

export interface AuthorizationPdfAssets {
  form: Uint8Array | ArrayBuffer;
  font: Uint8Array | ArrayBuffer;
  /** תמונת PNG של החתימה, לכל לווה לפי הסדר. ריק — הלווה לא חתם */
  signatures: Array<Uint8Array | ArrayBuffer | null>;
}

export async function fillAuthorizationForm(
  slug: string,
  input: AuthorizationFillInput,
  assets: AuthorizationPdfAssets
): Promise<Uint8Array> {
  const spec = authorizationFormSpec(slug);
  if (!spec) throw new Error(`אין מפת מילוי לטופס של ${slug}`);

  const pdf = await PDFDocument.load(assets.form);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(assets.font, { subset: true });
  const pages = pdf.getPages();

  const signatureImages: Array<PDFImage | null> = await Promise.all(
    assets.signatures.map((bytes) => (bytes ? pdf.embedPng(bytes) : Promise.resolve(null)))
  );

  for (const placement of spec.placements) {
    const page = pages[placement.page];
    if (!page) continue;

    if (placement.kind === 'text') {
      // לווה שני שלא הוזן — אין מה לכתוב בשורה שלו
      const text = fieldValue(placement.field, input);
      if (!text) continue;
      drawText(page, font, text, placement.box, placement.align ?? 'right', placement.valign ?? 'middle');
    } else if (placement.kind === 'signature') {
      if (placement.signer >= input.borrowers.length) continue;
      const image = signatureImages[placement.signer];
      if (image) drawSignature(page, image, placement.box);
    } else if (placement.signer < input.borrowers.length && input.customer[placement.signer] === placement.answer) {
      drawCheck(page, placement.at);
    }
  }

  pdf.setTitle('כתב הסמכה ליועץ משכנתאות');
  pdf.setProducer('משכלנתא');
  return pdf.save();
}

/** y מלמעלה (כמו במפה) → y מלמטה (כמו ב-PDF) */
function flipY(page: PDFPage, y: number): number {
  return page.getHeight() - y;
}

function drawText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  box: Box,
  align: 'right' | 'center',
  valign: 'middle' | 'bottom'
) {
  const visual = pdfTextOrder(text);
  const [x0, y0, x1, y1] = box;
  const width = x1 - x0;

  let size = MAX_SIZE;
  while (size > MIN_SIZE && font.widthOfTextAtSize(visual, size) > width) size -= 0.5;
  const textWidth = Math.min(font.widthOfTextAtSize(visual, size), width);

  const x = align === 'center' ? x0 + (width - textWidth) / 2 : x1 - textWidth;
  // קו מילוי: קצת מעל הקו. תא: באמצע הגובה
  const baseline = valign === 'bottom' ? y1 - 2 : y0 + (y1 - y0) / 2 + size * 0.35;

  page.drawText(visual, { x, y: flipY(page, baseline), size, font, color: INK, maxWidth: width });
}

function drawSignature(page: PDFPage, image: PDFImage, box: Box) {
  const [x0, y0, x1, y1] = box;
  const boxWidth = x1 - x0;
  const boxHeight = y1 - y0;
  const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  // מיושרת לימין ולתחתית — כמו חתימה על קו
  page.drawImage(image, { x: x1 - width, y: flipY(page, y1), width, height });
}

function drawCheck(page: PDFPage, [x, y]: [number, number]) {
  const cy = flipY(page, y);
  const r = 3.2;
  page.drawLine({ start: { x: x - r, y: cy - r }, end: { x: x + r, y: cy + r }, thickness: 1.2, color: INK });
  page.drawLine({ start: { x: x - r, y: cy + r }, end: { x: x + r, y: cy - r }, thickness: 1.2, color: INK });
}

// ───────────────────────────── סדר תצוגה ─────────────────────────────

const STRONG_LETTER = /[\u0590-\u05FF\uFB1D-\uFB4FA-Za-z\u00C0-\u024F]/;

/**
 * המחרוזת שמועברת ל-pdf-lib. fontkit, שמסדר את הגליפים, הופך את כל המחרוזת
 * כשהאות הראשונה בה עברית — כולל מספרים ואנגלית שבתוכה. לכן מחשבים את הסדר
 * החזותי הנכון, ואם fontkit עומד להפוך אותו — הופכים אותו מראש.
 */
export function pdfTextOrder(text: string): string {
  const visual = visualOrder(text);
  const first = Array.from(text).find((char) => STRONG_LETTER.test(char));
  return first && HEBREW.test(first) ? Array.from(visual).reverse().join('') : visual;
}

const HEBREW = /[֐-׿יִ-ﭏ]/;
const STRONG_LTR = /[A-Za-z0-9À-ɏ]/;
const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '<': '>', '>': '<' };

/**
 * pdf-lib כותב את התווים משמאל לימין בסדר שבו קיבל אותם. עברית צריכה להיכתב
 * מימין לשמאל, ומספרים ואנגלית בתוכה — משמאל לימין. כאן המחרוזת הלוגית
 * הופכת לסדר החזותי: קטעי עברית מתהפכים, קטעים לטיניים ומספרים נשארים
 * כמו שהם, וסדר הקטעים מתהפך. מחרוזת בלי עברית (ת"ז, טלפון, אימייל) נשארת
 * כמו שהיא.
 */
export function visualOrder(text: string): string {
  if (!HEBREW.test(text)) return text;

  const chars = Array.from(text);
  const types = chars.map((char) => (HEBREW.test(char) ? 'R' : STRONG_LTR.test(char) ? 'L' : 'N'));

  // סימן ניטרלי בין שני תווים לטיניים שייך לקטע הלטיני (למשל 03-1234567, a@b.co)
  const resolved = types.map((type, index) => {
    if (type !== 'N') return type;
    // סימן אחוז צמוד למספר שייך למספר (70.6%), גם כשאחריו עברית
    if (chars[index] === '%' && /[0-9]/.test(chars[index - 1] ?? '')) return 'L';
    const before = types.slice(0, index).reverse().find((item) => item !== 'N');
    const after = types.slice(index + 1).find((item) => item !== 'N');
    return before === 'L' && after === 'L' ? 'L' : 'R';
  });

  const runs: Array<{ dir: string; text: string[] }> = [];
  chars.forEach((char, index) => {
    const dir = resolved[index];
    const last = runs[runs.length - 1];
    if (last && last.dir === dir) last.text.push(char);
    else runs.push({ dir, text: [char] });
  });

  return runs
    .reverse()
    .map((run) => (run.dir === 'R' ? run.text.reverse().map((char) => MIRROR[char] ?? char).join('') : run.text.join('')))
    .join('');
}
