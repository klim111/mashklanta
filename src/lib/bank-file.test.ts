import { describe, expect, it } from 'vitest';
import {
  BANK_FILE_AUTHORIZE_KEY,
  BANK_FILE_DOCUMENTS,
  bankFileDueAt,
  bankFileTaskSpecs,
  dueDay,
} from './bank-file';

const NOW = new Date(2026, 8, 23, 14, 30);

describe('bankFileTaskSpecs', () => {
  it('asks the client to send each document and mark it done', () => {
    const specs = bankFileTaskSpecs('לאומי', false);
    expect(specs.map((spec) => spec.templateKey)).toEqual([
      BANK_FILE_AUTHORIZE_KEY,
      ...BANK_FILE_DOCUMENTS.map((document) => document.key),
    ]);
    expect(specs[0].title).toBe('אשרו לבנק לאומי להתקדם עם התמהיל שאושר סופית');
    expect(specs.slice(1).every((spec) => spec.kind === 'TASK')).toBe(true);
  });

  it('opens an upload task per document when an advisor handles it', () => {
    const specs = bankFileTaskSpecs('לאומי', true);
    expect(specs.slice(1).every((spec) => spec.kind === 'DOCUMENT')).toBe(true);
  });
});

describe('bankFileDueAt', () => {
  it('schedules days ahead at ten in the morning', () => {
    const due = new Date(bankFileDueAt(3, null, NOW));
    expect(dueDay(due.toISOString())).toBe('2026-09-26');
    expect(due.getHours()).toBe(10);
  });

  it('never lands after the rates expire', () => {
    expect(dueDay(bankFileDueAt(3, '2026-09-24', NOW))).toBe('2026-09-24');
  });

  it('never lands in the past when the rates already expired', () => {
    expect(dueDay(bankFileDueAt(3, '2026-09-01', NOW))).toBe('2026-09-23');
  });
});
