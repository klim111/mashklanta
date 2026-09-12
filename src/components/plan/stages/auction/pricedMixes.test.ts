import { describe, expect, it } from 'vitest';
import { computeMix, createTrack, createWorkspaceMix } from '@/components/mortgage-advisor/engine';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { buildQuotedMix } from '@/components/mortgage-advisor/bankQuote/quote';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import type { MortgageBank } from '@/components/mortgage-advisor/types';
import {
  banksWithOffers,
  bankTone,
  filterByBanks,
  offersSpread,
  pricedMixLabel,
  pricedMixesFor,
  toggleBank,
  winningPricedMix,
} from './pricedMixes';

function finalMix(): WorkspaceMix {
  return createWorkspaceMix({
    id: 'mix-final',
    name: 'התמהיל הסופי',
    totalAmount: 1_000_000,
    tracks: [
      createTrack({ id: 't1', type: 'fixed_unlinked', amount: 600_000, years: 25, interestRate: 4.5 }),
      createTrack({ id: 't2', type: 'prime', amount: 400_000, years: 20, interestRate: 5.5 }),
    ],
  });
}

function saved(mix: WorkspaceMix): SavedMix {
  return { mix, summary: computeMix(mix).summary, savedAt: mix.updatedAt };
}

function offer(source: WorkspaceMix, bank: MortgageBank, rate: number, receivedAt = '2026-09-12') {
  return saved(
    buildQuotedMix({
      source,
      bank,
      receivedAt,
      rates: { t1: rate, t2: rate + 1 },
    })
  );
}

describe('pricedMixesFor', () => {
  it('אוסף רק את ההצעות שהתקבלו על התמהיל הסופי', () => {
    const source = finalMix();
    const other = createWorkspaceMix({ id: 'mix-other', name: 'תמהיל אחר', totalAmount: 500_000 });
    const items = [
      saved(source),
      offer(source, 'לאומי', 4.2),
      offer(other, 'מזרחי', 4.0),
      saved(other),
    ];

    const priced = pricedMixesFor(items, 'mix-final');
    expect(priced).toHaveLength(1);
    expect(priced[0].bank).toBe('לאומי');
  });

  it('בלי תמהיל סופי אין תמהילים מתומחרים', () => {
    const source = finalMix();
    expect(pricedMixesFor([offer(source, 'לאומי', 4.2)], null)).toEqual([]);
  });

  it('מסדר את ההצעות מהזולה ליקרה בסך התשלומים', () => {
    const source = finalMix();
    const priced = pricedMixesFor(
      [offer(source, 'לאומי', 4.6), offer(source, 'מזרחי', 4.0), offer(source, 'דיסקונט', 4.3)],
      'mix-final'
    );

    expect(priced.map((item) => item.bank)).toEqual(['מזרחי', 'דיסקונט', 'לאומי']);
    const totals = priced.map((item) => item.summary.totalPaid);
    expect([...totals].sort((a, b) => a - b)).toEqual(totals);
  });

  it('שומר את הבנק ואת תאריך קבלת הריביות מההצעה', () => {
    const source = finalMix();
    const priced = pricedMixesFor([offer(source, 'הפועלים', 4.4, '2026-08-01')], 'mix-final');
    expect(priced[0].bank).toBe('הפועלים');
    expect(priced[0].receivedAt.startsWith('2026-08-01')).toBe(true);
  });
});

describe('סינון לפי בנקים', () => {
  it('בחירה ריקה מציגה את הכול', () => {
    const source = finalMix();
    const priced = pricedMixesFor([offer(source, 'לאומי', 4.2), offer(source, 'מזרחי', 4.4)], 'mix-final');
    expect(filterByBanks(priced, [])).toHaveLength(2);
  });

  it('מסנן לכמה בנקים בלי הגבלה', () => {
    const source = finalMix();
    const priced = pricedMixesFor(
      [offer(source, 'לאומי', 4.2), offer(source, 'מזרחי', 4.4), offer(source, 'ירושלים', 4.9)],
      'mix-final'
    );

    expect(filterByBanks(priced, ['לאומי']).map((item) => item.bank)).toEqual(['לאומי']);
    expect(filterByBanks(priced, ['לאומי', 'ירושלים']).map((item) => item.bank).sort()).toEqual(
      ['ירושלים', 'לאומי'].sort()
    );
  });

  it('הבנקים שתמחרו מוחזרים בלי כפילויות ולפי סדר הרשימה', () => {
    const source = finalMix();
    const priced = pricedMixesFor(
      [offer(source, 'ירושלים', 4.9), offer(source, 'לאומי', 4.2), offer(source, 'לאומי', 4.1)],
      'mix-final'
    );
    expect(banksWithOffers(priced)).toEqual(['לאומי', 'ירושלים']);
  });

  it('לחיצה על בנק מוסיפה ומסירה אותו מהבחירה', () => {
    expect(toggleBank<string>([], 'לאומי')).toEqual(['לאומי']);
    expect(toggleBank(['לאומי'], 'מזרחי')).toEqual(['לאומי', 'מזרחי']);
    expect(toggleBank(['לאומי', 'מזרחי'], 'לאומי')).toEqual(['מזרחי']);
  });
});

describe('התמהיל המנצח', () => {
  it('הזול ביותר בסך התשלומים', () => {
    const source = finalMix();
    const priced = pricedMixesFor(
      [offer(source, 'לאומי', 4.6), offer(source, 'מזרחי', 4.0)],
      'mix-final'
    );
    expect(winningPricedMix(priced)?.bank).toBe('מזרחי');
  });

  it('בלי הצעות אין מנצח ואין פער', () => {
    expect(winningPricedMix([])).toBeNull();
    expect(offersSpread([])).toBe(0);
  });

  it('הפער הוא בין ההצעה היקרה לזולה', () => {
    const source = finalMix();
    const priced = pricedMixesFor(
      [offer(source, 'לאומי', 4.6), offer(source, 'מזרחי', 4.0), offer(source, 'דיסקונט', 4.3)],
      'mix-final'
    );
    const totals = priced.map((item) => item.summary.totalPaid);
    expect(offersSpread(priced)).toBeCloseTo(Math.max(...totals) - Math.min(...totals), 6);
    expect(offersSpread(priced)).toBeGreaterThan(0);
  });

  it('הצעה יחידה היא המנצחת, ובלי פער', () => {
    const source = finalMix();
    const priced = pricedMixesFor([offer(source, 'דיסקונט', 4.3)], 'mix-final');
    expect(winningPricedMix(priced)?.bank).toBe('דיסקונט');
    expect(offersSpread(priced)).toBe(0);
  });
});

describe('סימון הבנק', () => {
  it('לכל בנק צבע משלו', () => {
    const dots = new Set(['לאומי', 'הפועלים', 'מזרחי', 'דיסקונט'].map((bank) => bankTone(bank).dot));
    expect(dots.size).toBe(4);
  });

  it('בנק לא מוכר מקבל גוון ניטרלי במקום לקרוס', () => {
    expect(bankTone('בנק שלא קיים').dot).toBe(bankTone(null).dot);
  });

  it('הכיתוב אומר איזה בנק תמחר', () => {
    expect(pricedMixLabel('מזרחי')).toContain('מזרחי');
  });
});
