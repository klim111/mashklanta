/**
 * כתיבת קובץ אקסל (xlsx) בדפדפן, בלי ספריות חיצוניות.
 *
 * הקובץ נבנה כארכיון ZIP עם החלקים המינימליים של פורמט OOXML, והתאים נשמרים
 * כמחרוזות מוטבעות (inlineStr) כדי לא להחזיק טבלת מחרוזות נפרדת. כל הקבצים
 * נשמרים בלי דחיסה (method 0) — ZIP תקין לחלוטין, וכך אין צורך במימוש deflate.
 *
 * מה שכן נתמך, כי בלעדיו המסמך לא נראה מקצועי: גופנים, צבעי רקע, מסגרות,
 * יישור וגלישת טקסט, פורמטי מספר, רוחב עמודות, גובה שורות, מיזוג תאים
 * וגיליון מימין לשמאל.
 */

export interface XlsxFont {
  bold?: boolean;
  italic?: boolean;
  /** גודל בנקודות */
  size?: number;
  /** צבע כ-RRGGBB */
  color?: string;
  name?: string;
}

export type XlsxBorderStyle = 'thin' | 'medium' | 'thick' | 'double' | 'dotted' | 'dashed';

export interface XlsxBorderSide {
  style?: XlsxBorderStyle;
  color?: string;
}

export interface XlsxBorder {
  top?: XlsxBorderSide;
  bottom?: XlsxBorderSide;
  left?: XlsxBorderSide;
  right?: XlsxBorderSide;
}

export interface XlsxAlign {
  horizontal?: 'left' | 'center' | 'right';
  vertical?: 'top' | 'center' | 'bottom';
  wrap?: boolean;
}

/** פורמטים מוכנים, או מחרוזת פורמט של אקסל */
export type XlsxFormat = 'general' | 'shekel' | 'percent' | 'integer' | 'decimal' | string;

export interface XlsxStyle {
  font?: XlsxFont;
  /** צבע רקע מלא כ-RRGGBB */
  fill?: string;
  border?: XlsxBorder;
  align?: XlsxAlign;
  format?: XlsxFormat;
}

export interface XlsxCell {
  value?: string | number | null;
  style?: XlsxStyle;
}

export interface XlsxRow {
  cells: Array<XlsxCell | string | number | null | undefined>;
  /** גובה השורה בנקודות */
  height?: number;
}

export interface XlsxSheet {
  name: string;
  rows: XlsxRow[];
  /** רוחב כל עמודה בתווים, לפי הסדר */
  columns?: number[];
  /** מיזוגים בכתיב "A1:D1" */
  merges?: string[];
  /** גיליון מימין לשמאל — ברירת המחדל כאן, כי המסמכים בעברית */
  rightToLeft?: boolean;
  showGridLines?: boolean;
}

const NAMED_FORMATS: Record<string, string> = {
  shekel: '#,##0\\ "₪"',
  percent: '0.00"%"',
  integer: '#,##0',
  decimal: '#,##0.00',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // תווי בקרה אינם חוקיים ב-XML ומפילים את פתיחת הקובץ
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/** "A", "B" ... "AA" — אות העמודה לפי אינדקס מאפס */
export function columnLetter(index: number): string {
  let rest = index;
  let letters = '';
  do {
    letters = String.fromCharCode(65 + (rest % 26)) + letters;
    rest = Math.floor(rest / 26) - 1;
  } while (rest >= 0);
  return letters;
}

/** הפניה לתא, למשל (0,0) → "A1" */
export function cellRef(row: number, column: number): string {
  return `${columnLetter(column)}${row + 1}`;
}

// ───────────────────────────── רישום העיצובים ─────────────────────────────

class StyleRegistry {
  private numFmts: string[] = [];
  private fonts: string[] = [];
  private fills: string[] = [];
  private borders: string[] = [];
  private xfs: string[] = [];
  private index = new Map<string, number>();

  constructor() {
    // הערכים ההתחלתיים שאקסל מצפה למצוא בכל קובץ
    this.fonts.push('<font><sz val="11"/><color theme="1"/><name val="Arial"/></font>');
    this.fills.push('<fill><patternFill patternType="none"/></fill>');
    this.fills.push('<fill><patternFill patternType="gray125"/></fill>');
    this.borders.push('<border><left/><right/><top/><bottom/><diagonal/></border>');
    this.xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
  }

  /** מזהה העיצוב של התא (s=""), עם איחוד עיצובים זהים */
  styleId(style?: XlsxStyle): number {
    if (!style) return 0;
    const key = JSON.stringify(style);
    const existing = this.index.get(key);
    if (existing !== undefined) return existing;

    const fontId = this.fontId(style.font);
    const fillId = this.fillId(style.fill);
    const borderId = this.borderId(style.border);
    const numFmtId = this.numFmtId(style.format);

    const align = style.align;
    const alignment = align
      ? `<alignment${align.horizontal ? ` horizontal="${align.horizontal}"` : ''}${
          align.vertical ? ` vertical="${align.vertical === 'center' ? 'center' : align.vertical}"` : ''
        }${align.wrap ? ' wrapText="1"' : ''}/>`
      : '';

    this.xfs.push(
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
        ` applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"${
          alignment ? ' applyAlignment="1"' : ''
        }>${alignment}</xf>`
    );
    const id = this.xfs.length - 1;
    this.index.set(key, id);
    return id;
  }

  private fontId(font?: XlsxFont): number {
    if (!font) return 0;
    const xml =
      '<font>' +
      (font.bold ? '<b/>' : '') +
      (font.italic ? '<i/>' : '') +
      `<sz val="${font.size ?? 11}"/>` +
      `<color rgb="FF${(font.color ?? '111827').replace('#', '').toUpperCase()}"/>` +
      `<name val="${font.name ?? 'Arial'}"/>` +
      '</font>';
    return pushUnique(this.fonts, xml);
  }

  private fillId(fill?: string): number {
    if (!fill) return 0;
    const rgb = fill.replace('#', '').toUpperCase();
    const xml = `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
    return pushUnique(this.fills, xml);
  }

  private borderId(border?: XlsxBorder): number {
    if (!border) return 0;
    const side = (name: 'left' | 'right' | 'top' | 'bottom', value?: XlsxBorderSide) => {
      if (!value) return `<${name}/>`;
      const color = (value.color ?? 'CBD5E1').replace('#', '').toUpperCase();
      return `<${name} style="${value.style ?? 'thin'}"><color rgb="FF${color}"/></${name}>`;
    };
    const xml =
      '<border>' +
      side('left', border.left) +
      side('right', border.right) +
      side('top', border.top) +
      side('bottom', border.bottom) +
      '<diagonal/></border>';
    return pushUnique(this.borders, xml);
  }

  private numFmtId(format?: XlsxFormat): number {
    if (!format || format === 'general') return 0;
    const code = NAMED_FORMATS[format] ?? format;
    const existing = this.numFmts.indexOf(code);
    if (existing >= 0) return 164 + existing;
    this.numFmts.push(code);
    return 164 + this.numFmts.length - 1;
  }

  toXml(): string {
    const numFmts =
      this.numFmts.length > 0
        ? `<numFmts count="${this.numFmts.length}">${this.numFmts
            .map((code, i) => `<numFmt numFmtId="${164 + i}" formatCode="${escapeXml(code)}"/>`)
            .join('')}</numFmts>`
        : '';
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      numFmts +
      `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>` +
      `<fills count="${this.fills.length}">${this.fills.join('')}</fills>` +
      `<borders count="${this.borders.length}">${this.borders.join('')}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>'
    );
  }
}

function pushUnique(list: string[], xml: string): number {
  const existing = list.indexOf(xml);
  if (existing >= 0) return existing;
  list.push(xml);
  return list.length - 1;
}

// ───────────────────────────── בניית הגיליון ─────────────────────────────

function sheetXml(sheet: XlsxSheet, styles: StyleRegistry): string {
  const cols =
    sheet.columns && sheet.columns.length > 0
      ? `<cols>${sheet.columns
          .map(
            (width, i) =>
              `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`
          )
          .join('')}</cols>`
      : '';

  const rows = sheet.rows
    .map((row, rowIndex) => {
      const cells = row.cells
        .map((raw, columnIndex) => {
          const cell: XlsxCell =
            raw === null || raw === undefined
              ? {}
              : typeof raw === 'object'
                ? raw
                : { value: raw };
          const styleId = styles.styleId(cell.style);
          const ref = cellRef(rowIndex, columnIndex);
          const value = cell.value;
          if (value === null || value === undefined || value === '') {
            // תא ריק עם עיצוב — למשל עמודת הריביות שהבנק ימלא
            return styleId === 0 ? '' : `<c r="${ref}" s="${styleId}"/>`;
          }
          if (typeof value === 'number' && Number.isFinite(value)) {
            return `<c r="${ref}" s="${styleId}"><v>${value}</v></c>`;
          }
          return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
            String(value)
          )}</t></is></c>`;
        })
        .join('');
      const height = row.height ? ` ht="${row.height}" customHeight="1"` : '';
      return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
    })
    .join('');

  const merges =
    sheet.merges && sheet.merges.length > 0
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
          .map((ref) => `<mergeCell ref="${ref}"/>`)
          .join('')}</mergeCells>`
      : '';

  const rtl = sheet.rightToLeft === false ? '' : ' rightToLeft="1"';
  const grid = sheet.showGridLines ? '' : ' showGridLines="0"';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetViews><sheetView${rtl}${grid} tabSelected="1" workbookViewId="0"/></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="16"/>' +
    cols +
    `<sheetData>${rows}</sheetData>` +
    merges +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    '<pageSetup orientation="portrait" paperSize="9" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>'
  );
}

// ───────────────────────────── ארכיון ה-ZIP ─────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipFile {
  name: string;
  data: Uint8Array;
}

/** ארכיון ZIP עם רשומות ללא דחיסה (stored) */
function zip(files: ZipFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true); // גרסה נדרשת
    localView.setUint16(6, 0x0800, true); // שמות קבצים ב-UTF-8
    localView.setUint16(8, 0, true); // ללא דחיסה
    localView.setUint16(10, 0, true); // שעה
    localView.setUint16(12, 0x2821, true); // תאריך קבוע (1.1.2000)
    localView.setUint32(14, crc, true);
    localView.setUint32(18, file.data.length, true);
    localView.setUint32(22, file.data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    chunks.push(local, file.data);

    const entry = new Uint8Array(46 + nameBytes.length);
    const entryView = new DataView(entry.buffer);
    entryView.setUint32(0, 0x02014b50, true);
    entryView.setUint16(4, 20, true);
    entryView.setUint16(6, 20, true);
    entryView.setUint16(8, 0x0800, true);
    entryView.setUint16(10, 0, true);
    entryView.setUint16(12, 0, true);
    entryView.setUint16(14, 0x2821, true);
    entryView.setUint32(16, crc, true);
    entryView.setUint32(20, file.data.length, true);
    entryView.setUint32(24, file.data.length, true);
    entryView.setUint16(28, nameBytes.length, true);
    entryView.setUint16(30, 0, true);
    entryView.setUint16(32, 0, true);
    entryView.setUint16(34, 0, true);
    entryView.setUint16(36, 0, true);
    entryView.setUint32(38, 0, true);
    entryView.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    central.push(entry);

    offset += local.length + file.data.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const all = [...chunks, ...central, end];
  const total = all.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of all) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

/** בניית חוברת עבודה שלמה כ-Blob מוכן להורדה */
export function buildXlsx(sheets: XlsxSheet[]): Blob {
  const styles = new StyleRegistry();
  const sheetParts = sheets.map((sheet) => sheetXml(sheet, styles));
  const encoder = new TextEncoder();

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${sheets
      .map(
        (sheet, i) =>
          `<sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
      )
      .join('')}</sheets></workbook>`;

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>';

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const files: ZipFile[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
    { name: '_rels/.rels', data: encoder.encode(rootRels) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRels) },
    { name: 'xl/styles.xml', data: encoder.encode(styles.toXml()) },
    ...sheetParts.map((xml, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: encoder.encode(xml),
    })),
  ];

  const bytes = zip(files);
  return new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** הורדת חוברת עבודה בדפדפן */
export function downloadXlsx(fileName: string, sheets: XlsxSheet[]): void {
  const blob = buildXlsx(sheets);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // שחרור מאוחר, כדי שההורדה תספיק להתחיל
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
