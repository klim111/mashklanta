import { describe, expect, it } from 'vitest';
import { buildZip, safeEntryName, uniqueEntryName } from './zip';

const encoder = new TextEncoder();

describe('ארכיון תיק המסמכים', () => {
  it('נפתח כקובץ ZIP תקני עם כל הקבצים', () => {
    const archive = buildZip([
      { name: 'a.pdf', data: encoder.encode('hello') },
      { name: 'b.pdf', data: encoder.encode('world!') },
    ]);
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);

    // חתימת קובץ מקומי בתחילת הארכיון, וחתימת סיום בסופו
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(archive.byteLength - 22, true)).toBe(0x06054b50);
    // שתי רשומות במדד המרכזי
    expect(view.getUint16(archive.byteLength - 22 + 10, true)).toBe(2);
  });

  it('שם קובץ מנוקה מתווי נתיב, וכפילות מקבלת מספר', () => {
    expect(safeEntryName('תיקייה/קובץ.pdf', 'מסמך')).toBe('תיקייה-קובץ.pdf');
    expect(safeEntryName('   ', 'מסמך')).toBe('מסמך');

    const taken = new Set<string>();
    expect(uniqueEntryName('scan.pdf', taken)).toBe('scan.pdf');
    expect(uniqueEntryName('scan.pdf', taken)).toBe('scan (2).pdf');
    expect(uniqueEntryName('scan.pdf', taken)).toBe('scan (3).pdf');
  });
});
