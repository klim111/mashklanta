import { describe, expect, it } from 'vitest';
import { buildXlsx, cellRef, columnLetter } from './xlsx';

/** קורא מינימלי של ZIP — מספיק כדי לוודא שהארכיון תקין ושהתוכן ניתן לקריאה */
function readZip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();

  // סוף הארכיון: החתימה של רשומת ה-EOCD
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  expect(end).toBeGreaterThanOrEqual(0);

  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);

  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(cursor + 28, true);
    const size = view.getUint32(cursor + 24, true);
    const offset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    expect(view.getUint32(offset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const start = offset + 30 + localNameLength + extraLength;
    files.set(name, decoder.decode(bytes.subarray(start, start + size)));

    cursor += 46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
  }

  return files;
}

async function build(): Promise<Map<string, string>> {
  const blob = buildXlsx([
    {
      name: 'גיליון',
      columns: [10, 20],
      merges: ['A1:B1'],
      rows: [
        {
          cells: [
            { value: 'כותרת', style: { font: { bold: true, color: 'FFFFFF' }, fill: '0B2545' } },
            { style: { fill: '0B2545' } },
          ],
          height: 30,
        },
        {
          cells: [
            { value: 1234, style: { format: 'shekel' } },
            // תא ריק ומעוצב — עמודת הריביות שהבנק ימלא
            { style: { fill: 'FFFBEB', border: { top: { style: 'dashed' } }, format: 'percent' } },
          ],
        },
      ],
    },
  ]);
  return readZip(new Uint8Array(await blob.arrayBuffer()));
}

describe('columnLetter', () => {
  it('ממפה אינדקס לאות עמודה', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(8)).toBe('I');
    expect(columnLetter(26)).toBe('AA');
    expect(cellRef(2, 1)).toBe('B3');
  });
});

describe('buildXlsx', () => {
  it('בונה ארכיון עם כל החלקים שאקסל דורש', async () => {
    const files = await build();
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(files.has(part)).toBe(true);
    }
  });

  it('שומר טקסט בעברית, מספרים ומיזוגים', async () => {
    const sheet = (await build()).get('xl/worksheets/sheet1.xml') ?? '';
    expect(sheet).toContain('<t xml:space="preserve">כותרת</t>');
    expect(sheet).toContain('<v>1234</v>');
    expect(sheet).toContain('<mergeCell ref="A1:B1"/>');
    expect(sheet).toContain('rightToLeft="1"');
  });

  it('שומר תא ריק מעוצב, כדי שעמודת הריביות תישאר ריקה אבל מסומנת', async () => {
    const sheet = (await build()).get('xl/worksheets/sheet1.xml') ?? '';
    expect(sheet).toMatch(/<c r="B2" s="\d+"\/>/);
  });

  it('מייצר גיליון עיצובים עם הצבעים והפורמטים שהוגדרו', async () => {
    const styles = (await build()).get('xl/styles.xml') ?? '';
    expect(styles).toContain('FF0B2545');
    expect(styles).toContain('FFFFFBEB');
    expect(styles).toContain('numFmtId="164"');
    expect(styles).toContain('dashed');
  });
});
