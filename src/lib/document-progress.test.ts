import { describe, expect, it } from 'vitest';
import { emptyPlanData } from './mortgage-plan';
import type { PlanDocumentView } from './plan-documents';
import type { ClientTaskView } from './client-tasks';
import { customDocumentKey, customDocumentStage, documentProgress } from './document-progress';
import { vaultCounts } from './plan-document-catalog';
import { demoDocuments, demoPlanData } from './demo-plan';

function doc(key: string): PlanDocumentView {
  return {
    id: key,
    planId: 'p1',
    key,
    name: key,
    fileName: `${key}.pdf`,
    contentType: 'application/pdf',
    size: 10,
    uploadedAt: '2026-09-01T00:00:00.000Z',
  };
}

function task(partial: Partial<ClientTaskView>): ClientTaskView {
  return {
    id: 't1',
    planId: 'p1',
    stage: 'AUCTION',
    kind: 'DOCUMENT',
    templateKey: null,
    title: 'מסמך',
    details: null,
    bank: null,
    dueAt: null,
    status: 'OPEN',
    documentId: null,
    completedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...partial,
  };
}

describe('customDocumentKey', () => {
  it('מקודד את השלב והכותרת, ומשחזר את השלב מהמפתח', () => {
    const key = customDocumentKey('AUCTION', 'הצעת ריבית מבנק לאומי');
    expect(key.startsWith('custom:AUCTION:')).toBe(true);
    expect(customDocumentStage({ key })).toBe('AUCTION');
    expect(customDocumentStage({ key: 'preapproval-leumi' })).toBeNull();
  });
});

describe('documentProgress', () => {
  it('תהליך ריק: מסמכי הפרופיל ושלושת האישורים נספרים, שלב התמהיל לא', () => {
    const progress = documentProgress(emptyPlanData(), []);
    const byStage = Object.fromEntries(progress.stages.map((row) => [row.stage, row]));
    expect(byStage.ANALYSIS.total).toBeGreaterThan(0);
    expect(byStage.APPLICATIONS.total).toBe(3);
    expect(byStage.MIX.relevant).toBe(false);
    expect(progress.overall.percent).toBe(0);
  });

  it('תהליך ההדגמה: שלושת האישורים מלאים', () => {
    const progress = documentProgress(demoPlanData(), demoDocuments());
    const applications = progress.stages.find((row) => row.stage === 'APPLICATIONS');
    expect(applications?.done).toBe(3);
    expect(applications?.percent).toBe(100);
  });

  it('מסמך חופשי שאינו מהרשימה אינו נספר, ומשימת מסמך פתוחה מוסיפה יעד', () => {
    const data = emptyPlanData();
    const before = documentProgress(data, []);
    const uploaded = doc(customDocumentKey('ANALYSIS', 'הצעה'));
    const withDoc = documentProgress(data, [uploaded]);
    // «0 מתוך 6» נשאר «0 מתוך 6» — ולא הופך ל«1 מתוך 7»
    expect(withDoc.overall).toEqual(before.overall);

    const withTask = documentProgress(data, [uploaded], [task({})]);
    const auction = withTask.stages.find((row) => row.stage === 'AUCTION');
    expect(auction?.total).toBe(1);
    expect(auction?.done).toBe(0);
  });

  it('משימת מסמך שבוצעה נספרת כמוגשת, ולא פעמיים כשמולאה במסמך מהרשימה', () => {
    const data = emptyPlanData();
    const free = doc(customDocumentKey('AUCTION', 'הצעה'));
    const done = documentProgress(data, [free], [task({ status: 'DONE', documentId: free.id })]);
    const auction = done.stages.find((row) => row.stage === 'AUCTION');
    expect(auction).toMatchObject({ done: 1, total: 1 });

    const approval = doc('preapproval-leumi');
    const viaApproval = documentProgress(
      data,
      [approval],
      [task({ stage: 'APPLICATIONS', status: 'DONE', documentId: approval.id })]
    );
    const applications = viaApproval.stages.find((row) => row.stage === 'APPLICATIONS');
    expect(applications).toMatchObject({ done: 1, total: 3 });
  });
});

describe('ספירת תיק המסמכים', () => {
  const file = (key: string) => ({ key });

  it('סופרת מסמך שממלא דרישה', () => {
    const requirements = [
      { key: 'b1:identity', name: 'ת"ז', group: 'ל1', stage: 'APPLICATIONS' as const },
      { key: 'b1:payslips', name: 'תלושים', group: 'ל1', stage: 'APPLICATIONS' as const },
    ];
    expect(vaultCounts(requirements, [file('b1:identity')])).toEqual({
      uploaded: 1,
      total: 2,
      extras: 0,
    });
  });

  it('מסמך שהועלה ואינו ברשימה אינו נספר מתוך הרשימה, אלא בנפרד', () => {
    const requirements = [
      { key: 'b1:identity', name: 'ת"ז', group: 'ל1', stage: 'APPLICATIONS' as const },
    ];
    // אישור עקרוני מהבנק, מסמך בכותרת חופשית, ומפתח שכבר אינו ברשימה
    const documents = [file('pre-approval:leumi'), file('custom:ANALYSIS:x'), file('b1:old-key')];
    expect(vaultCounts(requirements, documents)).toEqual({ uploaded: 0, total: 1, extras: 3 });
  });

  it('תיק ריק הוא אפס מתוך מה שנדרש', () => {
    const requirements = [
      { key: 'b1:identity', name: 'ת"ז', group: 'ל1', stage: 'APPLICATIONS' as const },
    ];
    expect(vaultCounts(requirements, [])).toEqual({ uploaded: 0, total: 1, extras: 0 });
  });
});
