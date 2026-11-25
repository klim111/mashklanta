import { describe, expect, it } from 'vitest';
import { customDocumentKey } from './document-progress';
import { cleanDocumentMeta, documentCategory, documentStage, filterDocuments } from './document-organize';

const doc = (key: string, name = key, extra: { category?: string; stage?: string; fileName?: string } = {}) => ({
  key,
  name,
  fileName: `${key}.pdf`,
  ...extra,
});

describe('סידור תיק המסמכים', () => {
  it('גוזר קטגוריה ושלב מהמפתח כשהלקוח לא קבע', () => {
    expect(documentCategory(doc('b1:payslips'))).toBe('BANK');
    expect(documentStage(doc('b1:payslips'))).toBe('ANALYSIS');
    expect(documentCategory(doc('preapproval-leumi'))).toBe('BANK');
    expect(documentStage(doc('preapproval-leumi'))).toBe('APPLICATIONS');
    expect(documentCategory(doc('signing:x:contract', 'חוזה רכישה'))).toBe('LAWYER');
    expect(documentCategory(doc('signing:x:sellers', 'התחייבות מוכרים לרישום משכנתא'))).toBe('SELLER');
    expect(documentStage(doc('signing:x:contract'))).toBe('SIGNING');
    const free = doc(customDocumentKey('AUCTION', 'הצעה'));
    expect(documentCategory(free)).toBe('SELF');
    expect(documentStage(free)).toBe('AUCTION');
    expect(documentStage(doc('email:abc'))).toBeNull();
  });

  it('מה שהלקוח קבע גובר על מה שנגזר, כולל «ללא שלב»', () => {
    const row = doc('b1:payslips', 'תלושים', { category: 'LAWYER', stage: 'NONE' });
    expect(documentCategory(row)).toBe('LAWYER');
    expect(documentStage(row)).toBeNull();
  });

  it('שומר רק ערכים מוכרים', () => {
    expect(cleanDocumentMeta({ category: 'SELLER', stage: 'MIX' })).toEqual({ category: 'SELLER', stage: 'MIX' });
    expect(cleanDocumentMeta({ category: 'x', stage: 'y' })).toEqual({});
    expect(cleanDocumentMeta({ stage: 'NONE' })).toEqual({ stage: 'NONE' });
  });

  it('מחפש בשם ובקובץ ומסנן לפי קטגוריה ושלב', () => {
    const rows = [
      doc('b1:payslips', 'תלושי שכר'),
      doc('preapproval-leumi', 'אישור עקרוני · לאומי'),
      doc(customDocumentKey(null, 'קבלה'), 'קבלה על שמאות'),
    ];
    expect(filterDocuments(rows, { query: 'לאומי' }).map((row) => row.key)).toEqual(['preapproval-leumi']);
    expect(filterDocuments(rows, { query: 'payslips.pdf' })).toHaveLength(1);
    expect(filterDocuments(rows, { category: 'BANK' })).toHaveLength(2);
    expect(filterDocuments(rows, { stage: 'APPLICATIONS' })).toHaveLength(1);
    expect(filterDocuments(rows, { stage: 'NONE' }).map((row) => row.name)).toEqual(['קבלה על שמאות']);
  });
});
