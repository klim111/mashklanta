import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createWorkspaceMix, sanitizeMix } from '@/components/mortgage-advisor/engine';
import {
  alignExplanation,
  explanationGaps,
  mixReportFileName,
  mixReportMessage,
  mixReportModel,
  mixReportPdf,
} from './mix-report';

const mix = createWorkspaceMix({
  name: 'תמהיל יציב',
  totalAmount: 1_200_000,
  propertyValue: 2_000_000,
  propertyAddress: 'הרצל 10, תל אביב',
  dealType: 'first_home',
  borrowers: [
    { name: 'דנה כהן', age: 34, monthlyIncome: 16_000 },
    { name: 'יוסי כהן', age: 36, monthlyIncome: 14_000 },
  ],
});

describe('mix report explanation', () => {
  it('keeps exactly one advantages line per track', () => {
    const [first, second] = mix.tracks;
    const aligned = alignExplanation(mix, {
      overview: 'תמהיל מאוזן',
      tracks: { [first.id]: 'יציבות', removed: 'מסלול שנמחק' },
    });
    expect(Object.keys(aligned.tracks)).toEqual(mix.tracks.map((track) => track.id));
    expect(aligned.tracks[first.id]).toBe('יציבות');
    expect(aligned.tracks[second.id]).toBe('');
  });

  it('lists what is still missing before sending', () => {
    const empty = alignExplanation(mix, null);
    expect(explanationGaps(mix, empty)).toHaveLength(mix.tracks.length + 1);
    const full = alignExplanation(mix, {
      overview: 'הסבר',
      tracks: Object.fromEntries(mix.tracks.map((track) => [track.id, 'יתרון'])),
    });
    expect(explanationGaps(mix, full)).toEqual([]);
  });
});

describe('mix report model', () => {
  it('includes the deal, the borrowers and every track', () => {
    const model = mixReportModel({
      mix,
      explanation: { overview: 'הסבר כללי', tracks: { [mix.tracks[0].id]: 'קבועה ויציבה' } },
      clientName: 'משפחת כהן',
    });
    expect(model.tracks).toHaveLength(mix.tracks.length);
    expect(model.tracks[0].advantages).toBe('קבועה ויציבה');
    expect(model.deal.find((item) => item.label === 'הון עצמי')?.value).toContain('800,000');
    expect(model.borrowers).toHaveLength(2);
    expect(model.paymentToIncome).toBeGreaterThan(0);
    expect(mixReportMessage(model)).toContain('הסבר כללי');
  });

  it('names the file after the mix', () => {
    expect(mixReportFileName({ name: 'א/ב' })).toBe('סיכום תמהיל - א ב.pdf');
  });

  it('keeps borrowers and the explanation through sanitizing', () => {
    const restored = sanitizeMix(
      JSON.parse(JSON.stringify({ ...mix, explanation: { overview: 'x', tracks: { a: 'y', b: 3 } } }))
    );
    expect(restored?.borrowers?.[0]).toEqual({ name: 'דנה כהן', age: 34, monthlyIncome: 16_000 });
    expect(restored?.explanation).toEqual({ overview: 'x', tracks: { a: 'y' } });
  });
});

describe('mix report PDF', () => {
  it('builds a PDF with the Hebrew font', async () => {
    const font = readFileSync(path.join(__dirname, '../../public/fonts/Assistant-Regular.ttf'));
    const bytes = await mixReportPdf(
      {
        mix,
        explanation: {
          overview: 'תמהיל שמאזן בין יציבות לגמישות. '.repeat(20),
          tracks: Object.fromEntries(mix.tracks.map((track, i) => [track.id, `יתרון של מסלול ${i + 1}`])),
        },
        preparedBy: 'היועץ',
        clientName: 'משפחת כהן',
      },
      font
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
