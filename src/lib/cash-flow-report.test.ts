import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { emptyCashFlow } from './cash-flow';
import { cashFlowPdf, cashFlowSheets } from './cash-flow-report';
import { buildXlsx } from './xlsx';

function state() {
  const s = emptyCashFlow();
  s.household = 'COUPLE';
  s.incomes.borrower = [{ id: 'a', label: 'משכורת', amount: 18000 }];
  s.incomes.partner = [{ id: 'b', label: 'משכורת', amount: 12500 }];
  s.mortgage = { amount: 1_500_000, rate: 5, years: 25, payment: null };
  s.loans = [
    { id: 'l1', name: 'רכב', amount: 120_000, rate: 6.5, months: 48, payment: null },
    { id: 'l2', name: 'שיפוץ', amount: 60_000, rate: 4.75, months: 14, payment: null },
  ];
  return s;
}

describe('cash-flow report', () => {
  it('builds a summary sheet and a monthly sheet', () => {
    const sheets = cashFlowSheets(state(), new Date('2026-10-06'));
    expect(sheets.map((sheet) => sheet.name)).toEqual(['סיכום', 'תזרים חודשי']);
    expect(sheets[1].rows.length).toBe(1 + 54);
    expect(buildXlsx(sheets).size).toBeGreaterThan(1000);
  });

  it('renders a PDF with the platform font', async () => {
    const font = readFileSync(join(process.cwd(), 'public/fonts/Assistant-Regular.ttf'));
    const bytes = await cashFlowPdf(state(), font, new Date('2026-10-06'));
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
