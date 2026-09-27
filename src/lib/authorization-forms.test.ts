import { readFileSync } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  AUTHORIZATION_BANKS,
  AUTHORIZATION_FORMS,
  emptyAdvisorDetails,
  emptyBorrower,
  fieldValue,
  missingAdvisorDetails,
  missingForBank,
  parseAdvisorDetails,
} from './authorization-forms';
import type { AuthorizationFillInput } from './authorization-forms';
import { fillAuthorizationForm, pdfTextOrder, visualOrder } from './authorization-pdf';

const PUBLIC = path.join(__dirname, '../../public');

const INPUT: AuthorizationFillInput = {
  borrowers: [
    { name: 'ישראל ישראלי', idNumber: '012345678', phone: '050-1234567', email: 'a@b.co', address: 'הרצל 12, תל אביב' },
    { name: 'דנה כהן', idNumber: '087654321', phone: '052-7654321', email: 'd@b.co', address: 'הרצל 12, תל אביב' },
  ],
  advisor: { name: 'יועץ', idNumber: '312345678', phone: '054-9876543', companyName: 'חברה בע"מ', companyNumber: '516123456' },
  place: 'תל אביב',
  date: new Date(2026, 8, 26),
  customer: [true, false],
};

describe('the form map', () => {
  it('has a map and a blank form for every bank', () => {
    for (const bank of AUTHORIZATION_BANKS) {
      expect(AUTHORIZATION_FORMS[bank.slug]).toBeTruthy();
      expect(readFileSync(path.join(PUBLIC, 'forms/authorization', `${bank.slug}.pdf`)).length).toBeGreaterThan(1000);
    }
  });

  it('places every field on an existing page, inside it, with a signature spot for both borrowers', async () => {
    for (const bank of AUTHORIZATION_BANKS) {
      const pdf = await PDFDocument.load(readFileSync(path.join(PUBLIC, 'forms/authorization', `${bank.slug}.pdf`)));
      const pages = pdf.getPages();
      const spec = AUTHORIZATION_FORMS[bank.slug];
      for (const placement of spec.placements) {
        const page = pages[placement.page];
        expect(page, `${bank.slug} page ${placement.page}`).toBeTruthy();
        const [x, y] = placement.kind === 'check' ? placement.at : placement.box;
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(page.getWidth());
        expect(y).toBeLessThanOrEqual(page.getHeight());
      }
      const signers = new Set(spec.placements.filter((item) => item.kind === 'signature').map((item) => item.signer));
      expect([...signers].sort(), bank.slug).toEqual([0, 1]);
    }
  });
});

describe('fieldValue', () => {
  it('reads borrower, advisor and date fields, and leaves a missing borrower empty', () => {
    expect(fieldValue('b2.idNumber', INPUT)).toBe('087654321');
    expect(fieldValue('adv.companyNumber', INPUT)).toBe('516123456');
    expect(fieldValue('date', INPUT)).toBe('26/09/2026');
    expect(fieldValue('month', INPUT)).toBe('9');
    expect(fieldValue('b2.name', { ...INPUT, borrowers: [INPUT.borrowers[0]] })).toBe('');
  });
});

describe('missingForBank', () => {
  it('asks only for what the bank form needs', () => {
    const borrowers = [{ ...emptyBorrower('ישראל ישראלי'), idNumber: '012345678' }];
    expect(missingForBank('leumi', { borrowers, place: 'חיפה', customer: [] })).toEqual([]);
    expect(missingForBank('leumi', { borrowers, place: '', customer: [] })).toEqual(['היישוב שבו אתם חותמים']);
    expect(missingForBank('discount', { borrowers, place: '', customer: [null] })).toEqual([
      'טלפון',
      'האם לקוח/ה של הבנק',
    ]);
    expect(missingForBank('jerusalem', { borrowers, place: '', customer: [] })).toEqual([
      'טלפון',
      'כתובת מגורים',
      'אימייל',
    ]);
  });
});

describe('advisor details', () => {
  it('falls back to the account name and lists what is missing', () => {
    const details = parseAdvisorDetails({ phone: '054-1234567' }, 'דנה');
    expect(details).toEqual({ ...emptyAdvisorDetails('דנה'), phone: '054-1234567' });
    expect(missingAdvisorDetails(details)).toEqual(['ת"ז']);
  });
});

describe('Hebrew text order', () => {
  it('keeps numbers and Latin left to right inside Hebrew', () => {
    expect(visualOrder('012345678')).toBe('012345678');
    expect(visualOrder('הרצל 12')).toBe('12 לצרה');
    // fontkit הופך מחרוזת שמתחילה בעברית, ולכן היא נמסרת לו הפוכה מראש
    expect(pdfTextOrder('הרצל 12')).toBe('הרצל 21');
    expect(pdfTextOrder('a@b.co')).toBe('a@b.co');
  });
});

describe('fillAuthorizationForm', () => {
  it('produces a PDF with the same pages for every bank', async () => {
    const font = readFileSync(path.join(PUBLIC, 'fonts/Assistant-Regular.ttf'));
    for (const bank of AUTHORIZATION_BANKS) {
      const form = readFileSync(path.join(PUBLIC, 'forms/authorization', `${bank.slug}.pdf`));
      const bytes = await fillAuthorizationForm(bank.slug, INPUT, { form, font, signatures: [null, null] });
      const original = await PDFDocument.load(form);
      const filled = await PDFDocument.load(bytes);
      expect(filled.getPageCount()).toBe(original.getPageCount());
    }
  }, 30000);
});
