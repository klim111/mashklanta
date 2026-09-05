/**
 * אותו מכתב, כחוברת אקסל. הבנק מקבל קובץ שאפשר למלא בו את עמודת הריבית
 * ולהחזיר — ולכן המבנה זהה לזה שבמכתב, כולל הפתיח, סעיפי הבקשה והחתימה.
 */

import type { XlsxCell, XlsxSheet, XlsxStyle } from '@/lib/xlsx';
import { downloadXlsx } from '@/lib/xlsx';
import type { RateRequestDocument } from './document';
import { formatRateRequestDate, rateRequestFileName } from './document';

const NAVY = '0B2545';
const BLUE = '1D4ED8';
const HEADER = 'EEF3FB';
const SOFT = 'F4F7FC';
const LINE = 'DBE3EF';
const BANK_FILL = 'FFFBEB';
const BANK_INK = '7A5C12';
const BANK_LINE = 'F0C674';

const COLUMNS = [5, 30, 14, 16, 20, 17, 13, 20, 17];
const LAST = 'I';

const box = (color = LINE) => ({
  top: { style: 'thin' as const, color },
  bottom: { style: 'thin' as const, color },
  left: { style: 'thin' as const, color },
  right: { style: 'thin' as const, color },
});

const titleStyle: XlsxStyle = {
  font: { bold: true, size: 20, color: 'FFFFFF' },
  fill: NAVY,
  align: { horizontal: 'right', vertical: 'center' },
};

const subtitleStyle: XlsxStyle = {
  font: { bold: true, size: 12, color: 'FFFFFF' },
  fill: BLUE,
  align: { horizontal: 'right', vertical: 'center' },
};

const metaStyle: XlsxStyle = {
  font: { size: 10, color: '475569' },
  align: { horizontal: 'right', vertical: 'center' },
};

const paragraphStyle: XlsxStyle = {
  font: { size: 11, color: '1F2937' },
  align: { horizontal: 'right', vertical: 'top', wrap: true },
};

const sectionStyle: XlsxStyle = {
  font: { bold: true, size: 13, color: NAVY },
  fill: SOFT,
  border: { bottom: { style: 'medium', color: BLUE } },
  align: { horizontal: 'right', vertical: 'center' },
};

const labelStyle: XlsxStyle = {
  font: { bold: true, size: 11, color: '475569' },
  fill: SOFT,
  border: box(),
  align: { horizontal: 'right', vertical: 'center' },
};

const valueStyle: XlsxStyle = {
  font: { bold: true, size: 11, color: NAVY },
  border: box(),
  align: { horizontal: 'right', vertical: 'center' },
};

const groupStyle: XlsxStyle = {
  font: { bold: true, size: 11, color: 'FFFFFF' },
  fill: NAVY,
  border: box('1E3A63'),
  align: { horizontal: 'center', vertical: 'center' },
};

const bankGroupStyle: XlsxStyle = {
  ...groupStyle,
  fill: BANK_INK,
  border: box('6B4F0D'),
};

const headStyle: XlsxStyle = {
  font: { bold: true, size: 11, color: NAVY },
  fill: HEADER,
  border: box(),
  align: { horizontal: 'center', vertical: 'center', wrap: true },
};

const bankHeadStyle: XlsxStyle = {
  ...headStyle,
  font: { bold: true, size: 11, color: BANK_INK },
  fill: BANK_FILL,
};

const cellStyle = (extra: Partial<XlsxStyle> = {}): XlsxStyle => ({
  font: { size: 11, color: '0F172A' },
  border: box(),
  align: { horizontal: 'center', vertical: 'center' },
  ...extra,
});

const blankStyle: XlsxStyle = {
  fill: BANK_FILL,
  border: box(BANK_LINE),
  align: { horizontal: 'center', vertical: 'center' },
  format: 'percent',
};

const blankMoneyStyle: XlsxStyle = { ...blankStyle, format: 'shekel' };

const totalStyle = (extra: Partial<XlsxStyle> = {}): XlsxStyle => ({
  font: { bold: true, size: 12, color: NAVY },
  fill: 'E8EEFA',
  border: box('B9C8E4'),
  align: { horizontal: 'center', vertical: 'center' },
  ...extra,
});

const hintStyle: XlsxStyle = {
  font: { bold: true, size: 10, color: BANK_INK },
  fill: BANK_FILL,
  border: box(BANK_LINE),
  align: { horizontal: 'right', vertical: 'center', wrap: true },
};

const footStyle: XlsxStyle = {
  font: { size: 9, color: '64748B' },
  align: { horizontal: 'right', vertical: 'top', wrap: true },
  border: { top: { style: 'thin', color: LINE } },
};

/** גובה משוער לשורת פסקה, לפי אורך הטקסט על פני כל רוחב הטבלה */
function paragraphHeight(text: string): number {
  const perLine = 115;
  return Math.max(18, Math.ceil(text.length / perLine) * 15 + 4);
}

/** בניית הגיליון. מוחזר גם כדי שאפשר יהיה לבדוק אותו בלי דפדפן. */
export function rateRequestSheets(doc: RateRequestDocument): XlsxSheet[] {
  const rows: Array<{ cells: Array<XlsxCell | string | number | null>; height?: number }> = [];
  const merges: string[] = [];
  const wide = (style: XlsxStyle, value?: string | number | null): XlsxCell[] => [
    { value: value ?? null, style },
    ...Array.from({ length: 8 }, () => ({ style })),
  ];
  const mergeWide = () => merges.push(`A${rows.length}:${LAST}${rows.length}`);

  const date = formatRateRequestDate(doc.createdAt);
  const bank = doc.details.bankName?.trim();

  rows.push({ cells: wide(titleStyle, `משכלתנא · ${doc.title}`), height: 38 });
  mergeWide();

  rows.push({
    cells: wide(subtitleStyle, `תמהיל מותאם אישית · ${doc.mixName}`),
    height: 24,
  });
  mergeWide();

  rows.push({
    cells: wide(metaStyle, `תאריך הפקה: ${date}   |   אסמכתה: ${doc.reference}`),
    height: 20,
  });
  mergeWide();

  rows.push({ cells: [] });

  rows.push({
    cells: wide(
      { font: { bold: true, size: 12, color: NAVY }, align: { horizontal: 'right' } },
      `לכבוד: ${bank ? `מחלקת המשכנתאות, בנק ${bank}` : 'מחלקת המשכנתאות'}`
    ),
    height: 20,
  });
  mergeWide();

  rows.push({
    cells: wide(
      { font: { bold: true, size: 11, color: BLUE }, align: { horizontal: 'right' } },
      'הנדון: בקשה להצעת ריביות לתמהיל משכנתא מותאם אישית'
    ),
    height: 20,
  });
  mergeWide();

  rows.push({ cells: [] });

  for (const paragraph of doc.intro) {
    rows.push({ cells: wide(paragraphStyle, paragraph), height: paragraphHeight(paragraph) });
    mergeWide();
  }

  rows.push({ cells: [] });

  rows.push({ cells: wide(sectionStyle, 'פרטי הבקשה'), height: 22 });
  mergeWide();

  const facts: Array<[string, string | number, XlsxStyle?]> = [
    ['סכום המשכנתא המבוקש', doc.totalAmount, { ...valueStyle, format: 'shekel' }],
    ['מספר מסלולים בתמהיל', doc.lines.length],
  ];
  if (doc.periodLabel) facts.push(['התקופה הארוכה בתמהיל', doc.periodLabel]);
  if (doc.propertyValue && doc.propertyValue > 0) {
    facts.push(['שווי הנכס', Math.round(doc.propertyValue), { ...valueStyle, format: 'shekel' }]);
  }
  if (doc.ltv !== undefined) {
    facts.push(['אחוז מימון', Number(doc.ltv.toFixed(1)), { ...valueStyle, format: 'percent' }]);
  }
  if (doc.dealTypeLabel) facts.push(['סוג העסקה', doc.dealTypeLabel]);
  if (doc.propertyAddress) facts.push(['כתובת הנכס', doc.propertyAddress]);
  if (doc.details.applicantName?.trim()) facts.push(['שם הפונה', doc.details.applicantName.trim()]);
  const contact = [doc.details.contactPhone?.trim(), doc.details.contactEmail?.trim()]
    .filter(Boolean)
    .join(' · ');
  if (contact) facts.push(['פרטי התקשרות', contact]);
  if (doc.details.replyBy?.trim()) {
    facts.push(['מועד אחרון לקבלת ההצעה', formatRateRequestDate(doc.details.replyBy)]);
  }

  for (const [label, value, style] of facts) {
    const row = rows.length + 1;
    rows.push({
      cells: [
        { value: label, style: labelStyle },
        { style: labelStyle },
        { style: labelStyle },
        { value, style: style ?? valueStyle },
        ...Array.from({ length: 5 }, () => ({ style: style ?? valueStyle })),
      ],
      height: 20,
    });
    merges.push(`A${row}:C${row}`, `D${row}:${LAST}${row}`);
  }

  rows.push({ cells: [] });

  rows.push({ cells: wide(sectionStyle, 'פירוט מסלולי התמהיל'), height: 22 });
  mergeWide();

  const groupRow = rows.length + 1;
  rows.push({
    cells: [
      { value: 'מבנה התמהיל — כפי שנבנה ואינו לשינוי', style: groupStyle },
      ...Array.from({ length: 6 }, () => ({ style: groupStyle })),
      { value: 'למילוי הבנק', style: bankGroupStyle },
      { style: bankGroupStyle },
    ],
    height: 22,
  });
  merges.push(`A${groupRow}:G${groupRow}`, `H${groupRow}:I${groupRow}`);

  rows.push({
    cells: [
      { value: '#', style: headStyle },
      { value: 'סוג הריבית', style: headStyle },
      { value: 'הצמדה', style: headStyle },
      { value: 'לוח סילוקין', style: headStyle },
      { value: 'תקופה', style: headStyle },
      { value: 'סכום המסלול', style: headStyle },
      { value: '% מהתמהיל', style: headStyle },
      { value: 'ריבית שנתית מוצעת', style: bankHeadStyle },
      { value: 'החזר חודשי', style: bankHeadStyle },
    ],
    height: 30,
  });

  for (const line of doc.lines) {
    rows.push({
      cells: [
        { value: line.index, style: cellStyle() },
        {
          value: line.stationLabel
            ? `${line.typeLabel} (${line.stationLabel})`
            : line.typeLabel,
          style: cellStyle({
            font: { bold: true, size: 11, color: NAVY },
            align: { horizontal: 'right', vertical: 'center', wrap: true },
          }),
        },
        { value: line.linkageLabel, style: cellStyle() },
        { value: line.amortizationLabel, style: cellStyle() },
        { value: line.periodLabel, style: cellStyle() },
        { value: line.amount, style: cellStyle({ format: 'shekel' }) },
        {
          value: Number(line.share.toFixed(1)),
          style: cellStyle({ format: 'percent' }),
        },
        { style: blankStyle },
        { style: blankMoneyStyle },
      ],
      height: 22,
    });
  }

  if (doc.unallocated > 0) {
    const row = rows.length + 1;
    rows.push({
      cells: [
        { value: 'יתרה שטרם שובצה למסלול', style: cellStyle({ align: { horizontal: 'right' } }) },
        ...Array.from({ length: 4 }, () => ({ style: cellStyle() })),
        { value: doc.unallocated, style: cellStyle({ format: 'shekel' }) },
        { value: null, style: cellStyle() },
        { style: blankStyle },
        { style: blankMoneyStyle },
      ],
      height: 20,
    });
    merges.push(`A${row}:E${row}`);
  }

  const totalRow = rows.length + 1;
  rows.push({
    cells: [
      { value: 'סה"כ', style: totalStyle({ align: { horizontal: 'right' } }) },
      ...Array.from({ length: 4 }, () => ({ style: totalStyle() })),
      { value: doc.totalAmount, style: totalStyle({ format: 'shekel' }) },
      { value: 100, style: totalStyle({ format: 'percent' }) },
      { style: { ...blankStyle, font: { bold: true, size: 11, color: BANK_INK } } },
      { style: { ...blankMoneyStyle, font: { bold: true, size: 11, color: BANK_INK } } },
    ],
    height: 24,
  });
  merges.push(`A${totalRow}:E${totalRow}`);

  const hint =
    'שתי העמודות הצהובות הושארו ריקות בכוונה והן מיועדות לתמחור הבנק. בשורת הסיכום נא לציין את הריבית המשוקללת ואת סך ההחזר החודשי.';
  rows.push({ cells: wide(hintStyle, hint), height: paragraphHeight(hint) });
  mergeWide();

  rows.push({ cells: [] });

  rows.push({ cells: wide(sectionStyle, 'מה נבקש לקבל בהצעה'), height: 22 });
  mergeWide();

  doc.asks.forEach((ask, index) => {
    const text = `${index + 1}. ${ask}`;
    rows.push({ cells: wide(paragraphStyle, text), height: paragraphHeight(text) });
    mergeWide();
  });

  rows.push({ cells: [] });

  rows.push({ cells: wide(paragraphStyle, doc.closing), height: paragraphHeight(doc.closing) });
  mergeWide();

  rows.push({ cells: [] });

  rows.push({
    cells: wide({ font: { size: 11, color: '1F2937' }, align: { horizontal: 'right' } }, 'בכבוד רב,'),
    height: 18,
  });
  mergeWide();

  rows.push({
    cells: wide(
      { font: { bold: true, size: 12, color: NAVY }, align: { horizontal: 'right' } },
      doc.details.applicantName?.trim() || 'מבקש/ת המשכנתא'
    ),
    height: 20,
  });
  mergeWide();

  if (contact) {
    rows.push({ cells: wide(metaStyle, contact), height: 18 });
    mergeWide();
  }

  rows.push({ cells: [] });

  const footer =
    `המסמך הופק בתאריך ${date} באמצעות מערכת משכלתנא, אסמכתה ${doc.reference}. ` +
    'עמודות הריבית וההחזר החודשי הושארו ריקות במתכוון לצורך תמחור הבנק, וההצעה שתתקבל תושווה להצעות בנקים נוספים על אותו מבנה תמהיל בדיוק.';
  rows.push({ cells: wide(footStyle, footer), height: paragraphHeight(footer) });
  mergeWide();

  return [
    {
      name: 'בקשת ריביות',
      rows,
      columns: COLUMNS,
      merges,
      rightToLeft: true,
    },
  ];
}

/** הורדת הבקשה כקובץ אקסל */
export function downloadRateRequestXlsx(doc: RateRequestDocument): void {
  downloadXlsx(rateRequestFileName(doc, 'xlsx'), rateRequestSheets(doc));
}
