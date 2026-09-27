/**
 * רשימת המסמכים שהלקוח צריך להעלות, במקום אחד.
 *
 * המסמכים מגיעים משלושה מקורות שונים — תיק האישור העקרוני לפי הרכב הלווים
 * ואופן ההעסקה, האישורים העקרוניים שהתקבלו מכל בנק, ומסמכי החתימה לפי תרחיש
 * הבעלות שנבחר — וכאן הם נאספים לרשימה אחת עם מפתח יציב לכל מסמך. המפתח הוא
 * מה שנשמר על הקובץ שהועלה, ולכן אותו מסמך מוצג כמוגש בכל מקום בפלטפורמה.
 *
 * הקובץ טהור: בלי React ובלי Prisma, כדי שאפשר יהיה לבדוק אותו ישירות.
 */

import { preApprovalDocumentGroups } from './mortgage-plan';
import type { PlanData, PlanStageId } from './mortgage-plan';
import { signingDealType, signingDocumentKey, signingScenario } from './signing-documents';

/** מסמך אחד שהלקוח צריך להעלות */
export interface DocumentRequirement {
  /** המפתח שנשמר על הקובץ — ייחודי בתוך התהליך */
  key: string;
  name: string;
  /** דגשים: מה צריך להופיע במסמך, כשהקטלוג יודע */
  note?: string;
  /** שם הקבוצה בתצוגה */
  group: string;
  stage: PlanStageId;
  /** מסמך שאינו נדרש מכל לקוח */
  optional?: boolean;
}

/** המפתח של מסמך חתימה — כולל את התרחיש, כדי שלא יתנגש בין תרחישים */
export function signingUploadKey(scenarioId: string, documentKey: string): string {
  return `signing:${signingDocumentKey(scenarioId, documentKey)}`;
}

/**
 * כל המסמכים שידועים לתהליך במצבו הנוכחי.
 *
 * תיק האישור העקרוני ידוע תמיד — הוא נגזר מהפרופיל. מסמכי החתימה נוספים רק
 * אחרי שהוגדרה בעלות הנכס, בפרופיל או בשלב החתימה.
 */
export function planDocumentRequirements(data: PlanData): DocumentRequirement[] {
  const requirements: DocumentRequirement[] = [];

  preApprovalDocumentGroups(data).forEach((group) => {
    group.documents.forEach((document) => {
      requirements.push({
        key: document.key,
        name: document.name,
        group: group.subtitle ? `${group.title} · ${group.subtitle}` : group.title,
        stage: 'APPLICATIONS',
        optional: document.required === false,
      });
    });
  });

  const deal = signingDealType(data.SIGNING.dealTypeId);
  const scenario = signingScenario(deal, data.SIGNING.scenarioId);
  if (deal && scenario) {
    scenario.documents.forEach((document) => {
      requirements.push({
        key: signingUploadKey(scenario.id, document.key),
        name: document.name,
        note: document.note,
        group: `מסמכי החתימה · ${deal.short}`,
        stage: 'SIGNING',
      });
    });
  }

  return requirements;
}

/**
 * מה נאסף בתיק מול מה שנדרש.
 *
 * הספירה היא של כל מה שהועלה בפועל, ולא רק של מסמכים שהקטלוג מכיר: אישור
 * עקרוני שנשמר משלב ההגשה, מסמך בכותרת חופשית, ומסמך שהמפתח שלו כבר אינו
 * ברשימה (למשל אחרי שינוי בפרופיל ששינה את רשימת המסמכים) — כולם נספרים.
 * בלי זה התיק היה מציג «0 מתוך N» גם כשיש בו קבצים.
 */
export function vaultCounts(
  requirements: readonly DocumentRequirement[],
  documents: readonly { key: string }[]
): { uploaded: number; total: number; extras: number } {
  const required = new Set(requirements.map((requirement) => requirement.key));
  const uploadedKeys = new Set(documents.map((document) => document.key));
  const filled = requirements.filter((requirement) => uploadedKeys.has(requirement.key)).length;
  const extras = [...uploadedKeys].filter((key) => !required.has(key)).length;
  return { uploaded: filled + extras, total: requirements.length + extras, extras };
}

/** האם המפתח שייך למסמכי החתימה של תרחיש כלשהו */
export function isSigningUploadKey(key: string): boolean {
  return key.startsWith('signing:');
}
