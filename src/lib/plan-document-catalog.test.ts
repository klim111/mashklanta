import { describe, expect, it } from 'vitest';
import { planDocumentRequirements, signingUploadKey } from './plan-document-catalog';
import { emptyPlanData } from './mortgage-plan';

function data() {
  const plan = emptyPlanData();
  plan.ANALYSIS = { ...plan.ANALYSIS, household: 'SINGLE', employmentType: 'SALARIED' };
  return plan;
}

describe('רשימת המסמכים של התהליך', () => {
  it('תיק האישור העקרוני ידוע תמיד, ולכל מסמך מפתח ייחודי', () => {
    const requirements = planDocumentRequirements(data());
    expect(requirements.length).toBeGreaterThan(0);
    expect(requirements.every((item) => item.stage === 'APPLICATIONS')).toBe(true);
    const keys = requirements.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('מסמכי החתימה נוספים רק אחרי שהוגדרה בעלות הנכס', () => {
    const before = planDocumentRequirements(data());

    const withOwnership = data();
    withOwnership.SIGNING = {
      ...withOwnership.SIGNING,
      dealTypeId: 'self_build',
      scenarioId: 'build_tabu',
    };
    const after = planDocumentRequirements(withOwnership);

    expect(after.length).toBeGreaterThan(before.length);
    const signing = after.filter((item) => item.stage === 'SIGNING');
    expect(signing.length).toBe(6);
    expect(signing[0].key).toBe(signingUploadKey('build_tabu', 'plans_permit'));
    // הדגשים של המסמך נשמרים, כדי שיוצגו בחלון ההעלאה
    expect(signing[0].note).toBeTruthy();
  });

  it('מפתח מסמך חתימה כולל את התרחיש, כדי שתרחישים לא יתנגשו', () => {
    expect(signingUploadKey('lot_tabu', 'contract')).not.toBe(
      signingUploadKey('build_tabu', 'contract')
    );
  });
});
