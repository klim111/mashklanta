import { describe, expect, it } from 'vitest';
import { emptyPlanData } from './mortgage-plan';
import type { PlanDocumentView } from './plan-documents';
import type { ClientTaskView } from './client-tasks';
import { customDocumentKey, customDocumentStage, documentProgress } from './document-progress';
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

  it('מסמך חופשי נספר בשלב שלו, ומשימת מסמך פתוחה מוסיפה יעד', () => {
    const data = emptyPlanData();
    const uploaded = doc(customDocumentKey('AUCTION', 'הצעה'));
    const withDoc = documentProgress(data, [uploaded]);
    const auction = withDoc.stages.find((row) => row.stage === 'AUCTION');
    expect(auction?.done).toBe(1);
    expect(auction?.total).toBe(1);

    const withTask = documentProgress(data, [uploaded], [task({})]);
    const auctionWithTask = withTask.stages.find((row) => row.stage === 'AUCTION');
    expect(auctionWithTask?.total).toBe(2);
    expect(auctionWithTask?.percent).toBe(50);
  });
});
