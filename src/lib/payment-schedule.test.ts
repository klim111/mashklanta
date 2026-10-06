import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  draftSchedule,
  orderInstallments,
  parsePaymentSchedule,
  scheduleDefined,
  scheduleIssues,
  sumBySource,
} from './payment-schedule';
import type { PaymentSchedule } from './payment-schedule';
import { emptyPlanData, missingForStage, parseStageData, stageIsComplete } from './mortgage-plan';
import { scheduleReportHtml } from './payment-schedule-report';
import { scheduleReportPdf } from './payment-schedule-pdf';

describe('draftSchedule', () => {
  it('splits the price into equity first and bank money last', () => {
    const schedule = draftSchedule(2_550_000, 1_800_000);
    expect(sumBySource(schedule, 'EQUITY')).toBe(750_000);
    expect(sumBySource(schedule, 'BANK')).toBe(1_800_000);
    expect(schedule.installments.at(-1)?.source).toBe('BANK');
    expect(scheduleIssues(schedule)).toEqual([]);
  });

  it('is empty without a property price', () => {
    expect(draftSchedule(null, null).installments).toEqual([]);
  });
});

describe('scheduleIssues', () => {
  const base = (): PaymentSchedule => draftSchedule(1_000_000, 600_000);

  it('rejects equity paid after bank money', () => {
    const schedule = base();
    schedule.installments = [...schedule.installments.slice(1), schedule.installments[0]];
    expect(scheduleIssues(schedule).map((issue) => issue.kind)).toContain('order');
    expect(orderInstallments(schedule.installments).at(-1)?.source).toBe('BANK');
  });

  it('checks the equity and bank totals against the split', () => {
    const schedule = base();
    schedule.installments[0] = { ...schedule.installments[0], amount: 50_000 };
    expect(scheduleIssues(schedule).map((issue) => issue.kind)).toContain('equity-total');
    schedule.bankAmount = 700_000;
    const kinds = scheduleIssues(schedule).map((issue) => issue.kind);
    expect(kinds).toContain('bank-total');
  });

  it('counts as defined only once confirmed and valid', () => {
    const schedule = base();
    expect(scheduleDefined(schedule)).toBe(false);
    expect(scheduleDefined({ ...schedule, confirmedAt: new Date().toISOString() })).toBe(true);
  });
});

describe('signing stage', () => {
  it('keeps the schedule through parsing and requires it to close a new-mortgage signing', () => {
    const data = emptyPlanData();
    data.SIGNING.bank = 'לאומי';
    data.SIGNING.checklist = Object.fromEntries(
      Object.keys(parseStageData('SIGNING', {}).checklist).map((key) => [key, true])
    );
    const all = parseStageData('SIGNING', { ...data.SIGNING, checklist: {} });
    expect(all.paymentSchedule).toBeNull();

    const schedule = { ...draftSchedule(1_000_000, 600_000), confirmedAt: new Date().toISOString() };
    const parsed = parseStageData('SIGNING', { ...data.SIGNING, paymentSchedule: schedule, contractAnswer: 'NOT_YET' });
    expect(parsed.paymentSchedule?.installments).toHaveLength(schedule.installments.length);
    expect(parsed.contractAnswer).toBe('NOT_YET');
    expect(parsePaymentSchedule({ installments: [{ source: 'X', amount: -5 }] })?.installments[0]).toMatchObject({
      source: 'EQUITY',
      amount: null,
    });

    expect(missingForStage('SIGNING', data)).toContain('הגדרת פעימות התשלום');
    data.SIGNING.paymentSchedule = schedule;
    expect(missingForStage('SIGNING', data)).not.toContain('הגדרת פעימות התשלום');
  });

  it('does not require a schedule for refinance', () => {
    const data = emptyPlanData();
    data.MIX.refinancePending = true;
    expect(missingForStage('SIGNING', data)).not.toContain('הגדרת פעימות התשלום');
    expect(stageIsComplete('SIGNING', data)).toBe(false);
  });
});

describe('reports', () => {
  const input = {
    schedule: draftSchedule(2_550_000, 1_800_000),
    title: 'תכנון משכנתא',
    propertyAddress: 'הרצל 1, תל אביב <script>',
    generatedAt: new Date('2026-10-05T08:00:00Z'),
  };

  it('builds an escaped standalone HTML page', () => {
    const html = scheduleReportHtml(input);
    expect(html).toContain('פעימות התשלום למוכר');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('builds a PDF with the Hebrew font', async () => {
    const font = readFileSync(path.join(__dirname, '../../public/fonts/Assistant-Regular.ttf'));
    const bytes = await scheduleReportPdf(input, font);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
  });
});
