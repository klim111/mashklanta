import { describe, expect, it } from 'vitest';
import {
  CLIENT_STAGES,
  STAGE_DOCUMENTS,
  documentsUpToStage,
  stageIndex,
  stageProgress,
} from './client-process';

describe('שלבי הליווי', () => {
  it('ההתקדמות עולה עם השלב, מאפס ועד מאה', () => {
    expect(stageProgress('INTAKE')).toBe(0);
    expect(stageProgress('COMPLETED')).toBe(100);

    const progressions = CLIENT_STAGES.map(stageProgress);
    progressions.forEach((value, index) => {
      if (index === 0) return;
      expect(value).toBeGreaterThan(progressions[index - 1]);
    });
  });

  it('כל מסמך מופיע פעם אחת בלבד בכל הקטלוג', () => {
    const keys = CLIENT_STAGES.flatMap((stage) => STAGE_DOCUMENTS[stage].map((doc) => doc.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('מסמכי שלב נפתחים יחד עם כל מה שנדרש בשלבים שלפניו', () => {
    const opened = documentsUpToStage('PLANNING');
    const expected = ['INTAKE', 'DOCUMENTS', 'PLANNING'].flatMap(
      (stage) => STAGE_DOCUMENTS[stage as (typeof CLIENT_STAGES)[number]]
    );

    expect(opened).toHaveLength(expected.length);
    expect(opened.every((doc) => stageIndex(doc.stage) <= stageIndex('PLANNING'))).toBe(true);
    // מסמכים של שלבים מאוחרים עוד לא נפתחים
    expect(opened.some((doc) => doc.key === 'approval_letter')).toBe(false);
  });

  it('בשלב הראשון נפתחים רק מסמכי ההיכרות', () => {
    expect(documentsUpToStage('INTAKE')).toHaveLength(STAGE_DOCUMENTS.INTAKE.length);
  });
});
