import { describe, expect, it } from 'vitest';
import { createTrack, createWorkspaceMix } from '../engine';
import { buildRateRequestDocument, rateRequestFileName } from './document';
import { rateRequestBodyHtml, rateRequestPrintHtml } from './letter';
import { rateRequestSheets } from './excel';

function demoMix() {
  return createWorkspaceMix({
    id: 'mix-1',
    name: 'תמהיל מאוזן',
    totalAmount: 1_000_000,
    propertyValue: 1_500_000,
    propertyAddress: 'הרצל 10, תל אביב',
    dealType: 'first_home',
    tracks: [
      createTrack({
        type: 'fixed_unlinked',
        amount: 500_000,
        years: 25,
        interestRate: 4.55,
        amortizationType: 'spitzer',
      }),
      createTrack({
        type: 'variable_unlinked',
        amount: 300_000,
        years: 20,
        interestRate: 5.25,
        variablePeriod: 5,
        amortizationType: 'equal_principal',
      }),
      createTrack({
        type: 'fixed_linked',
        amount: 200_000,
        years: 15,
        interestRate: 3.15,
        amortizationType: 'spitzer',
      }),
    ],
  });
}

describe('buildRateRequestDocument', () => {
  it('מתאר כל מסלול: סוג ריבית, לוח סילוקין, תקופה, סכום ואחוז מהתמהיל', () => {
    const doc = buildRateRequestDocument(demoMix());

    expect(doc.lines).toHaveLength(3);
    expect(doc.lines[0]).toMatchObject({
      index: 1,
      typeLabel: 'ריבית קבועה לא צמודה',
      amortizationLabel: 'שפיצר',
      linkageLabel: 'לא צמוד',
      periodLabel: '25 שנים',
      amount: 500_000,
    });
    expect(doc.lines[0].share).toBeCloseTo(50, 5);
    expect(doc.lines[1].amortizationLabel).toBe('קרן שווה');
    expect(doc.lines[1].stationLabel).toBe('תחנת שינוי כל 5 שנים');
    expect(doc.lines[2].linkageLabel).toBe('צמוד מדד');

    const shares = doc.lines.reduce((sum, line) => sum + line.share, 0);
    expect(shares).toBeCloseTo(100, 5);
    expect(doc.unallocated).toBe(0);
    expect(doc.ltv).toBeCloseTo(66.666, 2);
  });

  it('אינו נושא ריביות — הן נשארות לתמחור הבנק', () => {
    const doc = buildRateRequestDocument(demoMix());
    const serialized = JSON.stringify(doc);
    for (const rate of ['4.55', '5.25', '3.15']) {
      expect(serialized).not.toContain(rate);
    }
  });

  it('שומר מזהה, אסמכתה ותאריך יצירה כשמסמך שמור נבנה מחדש', () => {
    const doc = buildRateRequestDocument(demoMix(), {
      id: 'rate-request-7',
      reference: 'BR-260101-AAAA',
      createdAt: '2026-01-01T09:00:00.000Z',
      details: { bankName: 'מזרחי', applicantName: 'ישראל ישראלי' },
    });
    expect(doc.id).toBe('rate-request-7');
    expect(doc.reference).toBe('BR-260101-AAAA');
    expect(doc.createdAt).toBe('2026-01-01T09:00:00.000Z');
    expect(rateRequestFileName(doc, 'xlsx')).toBe('בקשת-ריביות-תמהיל-מאוזן-מזרחי.xlsx');
  });

  it('מציג יתרה שלא שובצה למסלול, כדי שהבנק יראה את כל הסכום', () => {
    const mix = demoMix();
    mix.totalAmount = 1_200_000;
    const doc = buildRateRequestDocument(mix);
    expect(doc.unallocated).toBe(200_000);
  });
});

describe('rateRequestBodyHtml', () => {
  it('כותב מכתב עם פתיח, טבלה, סעיפי בקשה, תודה וחתימה', () => {
    const doc = buildRateRequestDocument(demoMix(), {
      details: { bankName: 'לאומי', applicantName: 'ישראל ישראלי', contactPhone: '050-0000000' },
    });
    const html = rateRequestBodyHtml(doc);

    expect(html).toContain('מחלקת המשכנתאות, בנק לאומי');
    expect(html).toContain('הנדון: בקשה להצעת ריביות לתמהיל משכנתא מותאם אישית');
    expect(html).toContain('ריבית שנתית מוצעת');
    expect(html).toContain('תודה מראש');
    expect(html).toContain('בכבוד רב');
    expect(html).toContain('ישראל ישראלי');
    expect(html).toContain('חתימה ותאריך');
    // תאריך היצירה מופיע במכתב עצמו
    expect(html).toContain(new Intl.DateTimeFormat('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(doc.createdAt)));
  });

  it('משאיר את תאי הריבית וההחזר ריקים בכל שורת מסלול', () => {
    const doc = buildRateRequestDocument(demoMix());
    const html = rateRequestBodyHtml(doc);
    // שני תאים ריקים לכל מסלול, ועוד שניים בשורת הסיכום
    expect(html.split('<td class="rr-blank"></td>').length - 1).toBe(2 * doc.lines.length + 2);
    expect(html).not.toContain('4.55');
  });

  it('מסמך ההדפסה עצמאי וכולל את גיליון הסגנונות', () => {
    const html = rateRequestPrintHtml(buildRateRequestDocument(demoMix()));
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page');
    expect(html).toContain('.rr-doc');
  });
});

describe('rateRequestSheets', () => {
  it('בונה גיליון מימין לשמאל עם תשע עמודות ושורת סיכום', () => {
    const doc = buildRateRequestDocument(demoMix(), { details: { bankName: 'הפועלים' } });
    const [sheet] = rateRequestSheets(doc);

    expect(sheet.rightToLeft).toBe(true);
    expect(sheet.columns).toHaveLength(9);
    const flat = sheet.rows.flatMap((row) =>
      row.cells.map((cell) =>
        cell && typeof cell === 'object' ? cell.value : cell
      )
    );
    expect(flat).toContain('ריבית שנתית מוצעת');
    expect(flat).toContain('למילוי הבנק');
    expect(flat).toContain('סה"כ');
    expect(flat).toContain(1_000_000);
  });

  it('משאיר את שתי עמודות הבנק ריקות אך מעוצבות', () => {
    const doc = buildRateRequestDocument(demoMix());
    const [sheet] = rateRequestSheets(doc);
    const trackRows = sheet.rows.filter((row) => {
      const first = row.cells[0];
      return first && typeof first === 'object' && typeof first.value === 'number';
    });
    expect(trackRows).toHaveLength(doc.lines.length);

    for (const row of trackRows) {
      for (const index of [7, 8]) {
        const cell = row.cells[index];
        expect(cell && typeof cell === 'object' ? cell.value : cell).toBeUndefined();
        expect(cell && typeof cell === 'object' ? cell.style?.fill : undefined).toBe('FFFBEB');
      }
    }
  });
});
