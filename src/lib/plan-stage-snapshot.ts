/**
 * תמונת המצב של שלב — שורה אחת של מספרים לכל שלב.
 *
 * כשיועץ מבצע שלב עבור הלקוח, אין טעם להציג ללקוח את כל הכלים והטפסים של אותו
 * שלב: הוא לא עובד בהם. מה שכן צריך להיות מולו הוא מה נעשה בשלב ואיפה הוא
 * עומד — וזה בדיוק מה שהמודול הזה מייצר. הפירוט המלא נשאר זמין מאחורי כפתור.
 */

import { analyzeProfile, SIGNING_CHECKS, winningOffer } from './mortgage-plan';
import type { PlanData, PlanStageId, PlanStageStatus } from './mortgage-plan';

export interface SnapshotItem {
  label: string;
  /** המספר או הטקסט. null — עדיין אין נתון */
  value: string | null;
  note?: string;
}

export interface StageSnapshot {
  /** משפט אחד שאומר איפה השלב עומד */
  headline: string;
  items: SnapshotItem[];
}

function shekel(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}

function percent(value: number | null | undefined, digits = 1): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(digits)}%`;
}

function date(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('he-IL');
}

/** תמונת המצב של השלב לפי הנתונים שנאספו בו עד כה */
export function stageSnapshot(
  stage: PlanStageId,
  data: PlanData,
  status: PlanStageStatus = 'IN_PROGRESS'
): StageSnapshot {
  const done = status === 'COMPLETED';

  switch (stage) {
    case 'ANALYSIS': {
      const analysis = analyzeProfile(data.ANALYSIS);
      return {
        headline: done
          ? 'הפרופיל הפיננסי נבנה ואושר'
          : analysis.hasInputs
            ? 'היועץ בונה את הפרופיל הפיננסי מול הנתונים שהוזנו'
            : 'היועץ אוסף את נתוני הפרופיל הפיננסי',
        items: [
          { label: 'הכנסה פנויה', value: shekel(analysis.disposableIncome) },
          {
            label: 'תקרת החזר',
            value: shekel(analysis.maxMonthlyPayment),
            note: 'לפי יחס החזר של 40%',
          },
          { label: 'הון עצמי נדרש', value: shekel(analysis.requiredEquity) },
          {
            label: 'משכנתא נדרשת',
            value: shekel(analysis.requiredLoan),
            note: analysis.ltv === null ? undefined : `מימון ${percent(analysis.ltv, 0)}`,
          },
        ],
      };
    }

    case 'APPLICATIONS': {
      const preApproval = data.APPLICATIONS;
      const collected = Object.values(preApproval.documents).filter(Boolean).length;
      return {
        headline: preApproval.approved
          ? `האישור העקרוני התקבל מבנק ${preApproval.bank ?? ''}`.trim()
          : preApproval.bank
            ? `הבקשה בטיפול מול בנק ${preApproval.bank}`
            : 'היועץ מכין את התיק לקראת ההגשה',
        items: [
          { label: 'הבנק המטפל', value: preApproval.bank },
          { label: 'מסמכים שנאספו', value: String(collected) },
          { label: 'סכום מאושר', value: shekel(preApproval.approvedAmount) },
          { label: 'תוקף האישור', value: date(preApproval.validUntil) },
        ],
      };
    }

    case 'MIX': {
      const mix = data.MIX;
      return {
        headline: mix.finalLocked
          ? 'התמהיל הסופי נבחר ונעול'
          : mix.mixKey
            ? 'היועץ בונה ומשווה תמהילים עבורכם'
            : 'היועץ מתחיל בבניית התמהיל',
        items: [
          { label: 'התמהיל', value: mix.mixName },
          { label: 'סכום', value: shekel(mix.totalAmount) },
          { label: 'החזר חודשי', value: shekel(mix.monthlyPayment) },
          { label: 'ריבית ממוצעת', value: percent(mix.averageRate, 2) },
        ],
      };
    }

    case 'AUCTION': {
      const signed = data.AUCTION.signedMix;
      const manual = winningOffer(data.AUCTION);
      const bank = signed?.bank ?? manual?.bank ?? null;
      return {
        headline: signed
          ? `נבחרה ההצעה של בנק ${signed.bank}`
          : manual
            ? `ההצעה הזוכה: בנק ${manual.bank}`
            : 'היועץ מתמחר את התמהיל מול הבנקים',
        items: [
          { label: 'הבנק שנבחר', value: bank },
          {
            label: 'החזר חודשי',
            value: shekel(signed?.monthlyPayment ?? manual?.monthlyPayment ?? null),
          },
          { label: 'ריבית ממוצעת', value: percent(signed?.averageRate ?? manual?.averageRate, 2) },
          { label: 'סך תשלום', value: shekel(signed?.totalPaid ?? manual?.totalPaid ?? null) },
        ],
      };
    }

    case 'SIGNING': {
      const signing = data.SIGNING;
      const checks = SIGNING_CHECKS.filter((check) => signing.checklist[check.key]).length;
      return {
        headline: done
          ? 'המשכנתא נחתמה'
          : signing.bank
            ? `בדרך לחתימה בבנק ${signing.bank}`
            : 'היועץ מאמת את תנאי החוזה לפני החתימה',
        items: [
          { label: 'הבנק', value: signing.bank },
          { label: 'תאריך חתימה', value: date(signing.signingDate) },
          { label: 'החזר חודשי בחוזה', value: shekel(signing.finalMonthlyPayment) },
          {
            label: 'בדיקות שהושלמו',
            value: `${checks} מתוך ${SIGNING_CHECKS.length}`,
          },
        ],
      };
    }
  }
}
