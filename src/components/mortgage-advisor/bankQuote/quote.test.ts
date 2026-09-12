import { describe, expect, it } from 'vitest';
import { computeMix, createTrack, createWorkspaceMix, sanitizeMix } from '../engine';
import {
  buildQuotedMix,
  defaultQuoteName,
  formatQuoteDate,
  isoToQuoteDate,
  missingQuoteRates,
  quoteDateToIso,
  quoteLabel,
  uniqueQuoteName,
} from './quote';

function submittedMix() {
  return createWorkspaceMix({
    id: 'mix-submitted',
    name: 'תמהיל מאוזן',
    totalAmount: 1_000_000,
    propertyAddress: 'הרצל 10, תל אביב',
    tracks: [
      createTrack({ id: 't1', type: 'fixed_unlinked', amount: 600_000, years: 25, interestRate: 4.5 }),
      createTrack({ id: 't2', type: 'prime', amount: 400_000, years: 20, interestRate: 5.5 }),
    ],
  });
}

describe('buildQuotedMix', () => {
  it('שומר את מבנה התמהיל ומחליף רק את הריביות', () => {
    const source = submittedMix();
    const quoted = buildQuotedMix({
      source,
      bank: 'לאומי',
      receivedAt: '2026-09-12',
      rates: { t1: 4.1, t2: 5.05 },
    });

    expect(quoted.id).not.toBe(source.id);
    expect(quoted.totalAmount).toBe(source.totalAmount);
    expect(quoted.propertyAddress).toBe(source.propertyAddress);
    expect(quoted.tracks.map((track) => track.type)).toEqual(['fixed_unlinked', 'prime']);
    expect(quoted.tracks.map((track) => track.amount)).toEqual([600_000, 400_000]);
    expect(quoted.tracks.map((track) => track.years)).toEqual([25, 20]);
    expect(quoted.tracks.map((track) => track.interestRate)).toEqual([4.1, 5.05]);
    // המקור נשאר כמו שהוא — אפשר להזין לו ריביות שוב
    expect(source.tracks.map((track) => track.interestRate)).toEqual([4.5, 5.5]);
  });

  it('מסמן את הבנק, את תאריך קבלת הריביות ואת התמהיל שהוגש', () => {
    const source = submittedMix();
    const quoted = buildQuotedMix({
      source,
      bank: 'מזרחי',
      receivedAt: '2026-09-12',
      rates: { t1: 4.2, t2: 5.1 },
      requestId: 'rate-request-3',
    });

    expect(quoted.quote?.bank).toBe('מזרחי');
    expect(quoted.quote?.sourceMixId).toBe('mix-submitted');
    expect(quoted.quote?.requestId).toBe('rate-request-3');
    expect(formatQuoteDate(quoted.quote!.receivedAt)).toBe('12.09.2026');
    expect(quoteLabel(quoted.quote!)).toBe('התקבלו ריביות · בנק מזרחי');
  });

  it('נותן שם שכולל את הבנק ואת התאריך, וייחודי לכל סבב', () => {
    const source = submittedMix();
    const base = defaultQuoteName(source, 'לאומי', quoteDateToIso('2026-09-12'));
    expect(base).toBe('תמהיל מאוזן · ריביות לאומי 12.09.2026');
    expect(uniqueQuoteName(base, [base])).toBe(`${base} (2)`);
    expect(uniqueQuoteName(base, [base, `${base} (2)`])).toBe(`${base} (3)`);

    const quoted = buildQuotedMix({
      source,
      bank: 'לאומי',
      receivedAt: '2026-09-12',
      rates: { t1: 4.2, t2: 5.1 },
    });
    expect(quoted.name).toBe(base);
  });

  it('כל הצעה נשמרת בנפרד, ולכן אפשר להזין ריביות לאותו תמהיל שוב ושוב', () => {
    const source = submittedMix();
    const first = buildQuotedMix({
      source,
      bank: 'לאומי',
      receivedAt: '2026-09-12',
      rates: { t1: 4.1, t2: 5.0 },
    });
    const second = buildQuotedMix({
      source,
      bank: 'הפועלים',
      receivedAt: '2026-09-15',
      rates: { t1: 4.35, t2: 5.2 },
    });

    expect(first.id).not.toBe(second.id);
    expect(first.quote?.bank).not.toBe(second.quote?.bank);
    expect(first.quote?.sourceMixId).toBe(second.quote?.sourceMixId);
    expect(computeMix(first).summary.monthlyPayment).toBeLessThan(
      computeMix(second).summary.monthlyPayment
    );
  });

  it('הצעה של הצעה עדיין מצביעה על התמהיל המקורי שהוגש', () => {
    const source = submittedMix();
    const first = buildQuotedMix({
      source,
      bank: 'לאומי',
      receivedAt: '2026-09-12',
      rates: { t1: 4.1, t2: 5.0 },
    });
    const second = buildQuotedMix({
      source: first,
      bank: 'דיסקונט',
      receivedAt: '2026-09-20',
      rates: { t1: 4.0, t2: 4.9 },
    });
    expect(second.quote?.sourceMixId).toBe('mix-submitted');
  });
});

describe('missingQuoteRates', () => {
  it('סופר מסלולים שעדיין אין להם ריבית', () => {
    const source = submittedMix();
    expect(missingQuoteRates(source, {})).toBe(2);
    expect(missingQuoteRates(source, { t1: 4.1 })).toBe(1);
    expect(missingQuoteRates(source, { t1: 4.1, t2: 0 })).toBe(1);
    expect(missingQuoteRates(source, { t1: 4.1, t2: 5 })).toBe(0);
  });
});

describe('תאריך ההצעה', () => {
  it('עובר הלוך ושוב בין שדה תאריך ל-ISO', () => {
    const iso = quoteDateToIso('2026-09-12');
    expect(isoToQuoteDate(iso)).toBe('2026-09-12');
    expect(formatQuoteDate(iso)).toBe('12.09.2026');
  });

  it('ערך ריק או שגוי נופל להיום', () => {
    const today = isoToQuoteDate(new Date().toISOString());
    expect(isoToQuoteDate(quoteDateToIso(''))).toBe(today);
    expect(isoToQuoteDate(quoteDateToIso('לא תאריך'))).toBe(today);
  });
});

describe('sanitizeMix', () => {
  it('שומר את סימון ההצעה בשמירה ובטעינה מחדש', () => {
    const quoted = buildQuotedMix({
      source: submittedMix(),
      bank: 'הבינלאומי',
      receivedAt: '2026-09-12',
      rates: { t1: 4.1, t2: 5.0 },
      notes: 'ההצעה בתוקף ל-14 יום',
    });

    const roundTripped = sanitizeMix(JSON.parse(JSON.stringify(quoted)));
    expect(roundTripped?.quote).toEqual(quoted.quote);
    expect(roundTripped?.quote?.notes).toBe('ההצעה בתוקף ל-14 יום');
  });

  it('פוסל סימון הצעה בלי בנק מוכר', () => {
    const mix = submittedMix() as unknown as Record<string, unknown>;
    mix.quote = { bank: 'בנק שלא קיים', receivedAt: '2026-09-12' };
    expect(sanitizeMix(mix)?.quote).toBeUndefined();
  });
});
