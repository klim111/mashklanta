"use client";

import React, { useState } from 'react';
import MortgageJourneyMap from '@/components/ui/mortgage-journey-map';

// נתוני השלבים שסיפקת
const mortgageSteps = [
  {
    "id": "discovery",
    "order": 1,
    "title": "הכרת הלקוח ואפיון מטרה",
    "appliesTo": ["all"],
    "durationAvgDays": 0.5,
    "durationRangeDays": [0.04, 1] as [number, number],
    "parallelizable": true,
    "dependsOn": [],
    "notes": "שיחת אפיון קצרה, הגדרת מטרה ולו״ז",
    "documents": [
      { "name": "שאלון אפיון קצר", "optional": true }
    ],
    "status": "completed" as const
  },
  {
    "id": "borrower_docs",
    "order": 2,
    "title": "איסוף מסמכי לווים",
    "appliesTo": ["all"],
    "durationAvgDays": 2,
    "durationRangeDays": [0.5, 5] as [number, number],
    "parallelizable": true,
    "dependsOn": ["discovery"],
    "notes": "מסמכים בסיסיים לזיהוי והכנסות",
    "documents": [
      { "name": "תעודת זהות + ספח לכל לווה/ערב" },
      { "name": "דרכון (לתושבי חו״ל)", "optional": true },
      { "name": "תלושי שכר 3–6 חודשים / אישור מעסיק" },
      { "name": "דפי עו״ש 3–6 חודשים" },
      { "name": "טופס 106 אחרון (שכירים)" },
      { "name": "עצמאים: דוח שנתי + שומה, מקדמות, רו״ח חתום" },
      { "name": "אישורי הלוואות קיימות/מסגרות אשראי" },
      { "name": "מסמכי התחייבויות קבועות (לדוג׳ מזונות)", "optional": true },
      { "name": "חוזי שכירות + אישורי הפקדה (הכנסה משכירות)", "optional": true },
      { "name": "אישורי חסכונות/נכסים רלוונטיים", "optional": true }
    ],
    "status": "in_progress" as const
  },
  {
    "id": "equity_afford",
    "order": 3,
    "title": "תכנון הון עצמי ויכולת החזר",
    "appliesTo": ["all"],
    "durationAvgDays": 0.5,
    "durationRangeDays": [0.5, 1] as [number, number],
    "parallelizable": true,
    "dependsOn": ["borrower_docs"],
    "notes": "חישוב מסגרת רכישה ו-LTV, יעד החזר 25–30%",
    "documents": [
      { "name": "אישורי יתרות חיסכון/פק״מ/קופות" },
      { "name": "תצהיר מתנה + אישור העברה בנקאית", "optional": true },
      { "name": "מסמך הלוואה משפחתית (סכום/תנאים)", "optional": true }
    ],
    "status": "pending" as const
  },
  {
    "id": "mix_design",
    "order": 4,
    "title": "בניית תמהיל עקרוני",
    "appliesTo": ["all"],
    "durationAvgDays": 0.75,
    "durationRangeDays": [0.5, 2] as [number, number],
    "parallelizable": true,
    "dependsOn": ["equity_afford"],
    "notes": "חלוקת מסלולים/תקופות ובדיקות רגישות",
    "documents": [],
    "status": "pending" as const
  },
  {
    "id": "pre_approval",
    "order": 5,
    "title": "אישור עקרוני מהבנק",
    "appliesTo": ["all"],
    "durationAvgDays": 2,
    "durationRangeDays": [0.04, 7] as [number, number],
    "parallelizable": true,
    "dependsOn": ["borrower_docs"],
    "notes": "אונליין/מוקד: מהר; סניף/חריגים: ארוך יותר",
    "documents": [
      { "name": "טופס בקשה פרסונלי לבנק" },
      { "name": "מסמכי הכנסה וחשבונות (כמו שלב איסוף מסמכים)" }
    ],
    "status": "pending" as const
  },
  {
    "id": "legal_checks",
    "order": 6,
    "title": "בדיקות נכס מוקדמות (עו״ד)",
    "appliesTo": ["contractor", "secondhand", "pricebuyer"],
    "durationAvgDays": 3,
    "durationRangeDays": [2, 7] as [number, number],
    "parallelizable": true,
    "dependsOn": ["pre_approval"],
    "notes": "נסח, זכויות, שיעבודים, תשריט והיתרים",
    "documents": [
      { "name": "נסח טאבו עדכני / אישור זכויות" },
      { "name": "תשריט בית משותף", "optional": true },
      { "name": "מסמכי ליווי/ערבות חוק מכר (בקבלן)", "optional": true },
      { "name": "היתרי בנייה / טופס 4 (לפי הצורך)", "optional": true }
    ],
    "status": "pending" as const
  },
  {
    "id": "pre_appraisal",
    "order": 7,
    "title": "שמאות טרום־רכישה (רשות)",
    "appliesTo": ["secondhand", "pricebuyer", "contractor"],
    "durationAvgDays": 3,
    "durationRangeDays": [2, 5] as [number, number],
    "parallelizable": true,
    "dependsOn": ["legal_checks"],
    "notes": "מאיץ החלטה ומקטין סיכון פערי שווי",
    "documents": [
      { "name": "כתובת/גוש-חלקה-תת חלקה" },
      { "name": "נסח טאבו + תשריט" },
      { "name": "תכניות/היתרים/מדידות (אם קיימים)", "optional": true },
      { "name": "טיוטת חוזה/סיכום מסחרי (אם יש)", "optional": true }
    ],
    "status": "pending" as const
  },
  {
    "id": "bank_survey",
    "order": 8,
    "title": "סקר בנקים – איסוף הצעות",
    "appliesTo": ["all"],
    "durationAvgDays": 4,
    "durationRangeDays": [2, 7] as [number, number],
    "parallelizable": false,
    "dependsOn": ["mix_design", "pre_approval"],
    "notes": "לפחות 4 בנקים; איחוד הנמוך בכל מסלול",
    "documents": [
      { "name": "טבלת הצעות מסודרת להשוואה", "optional": true }
    ],
    "status": "pending" as const
  },
  {
    "id": "neg_round1",
    "order": 9,
    "title": "מו״מ – סבב 1",
    "appliesTo": ["all"],
    "durationAvgDays": 1.5,
    "durationRangeDays": [1, 3] as [number, number],
    "parallelizable": false,
    "dependsOn": ["bank_survey"],
    "notes": "הורדת מרווחים ראשונית",
    "documents": [],
    "status": "pending" as const
  },
  {
    "id": "neg_round2",
    "order": 10,
    "title": "מו״מ – סבב 2 (מכרז אחרון)",
    "appliesTo": ["all"],
    "durationAvgDays": 1,
    "durationRangeDays": [0.5, 3] as [number, number],
    "parallelizable": false,
    "dependsOn": ["neg_round1"],
    "notes": "T−7 לפתיחת תיק – נעילה",
    "documents": [],
    "status": "pending" as const
  },
  {
    "id": "bank_choice",
    "order": 11,
    "title": "בחירת בנק ונעילה",
    "appliesTo": ["all"],
    "durationAvgDays": 0,
    "durationRangeDays": [0, 1] as [number, number],
    "parallelizable": false,
    "dependsOn": ["neg_round2"],
    "notes": "קיבוע עוגנים/מרווחים ותמהיל סופי",
    "documents": [
      { "name": "אישורים עקרוניים בתוקף" },
      { "name": "סיכום תנאים סופי/דוא״ל בנק" }
    ],
    "status": "pending" as const
  },
  {
    "id": "purchase_contract",
    "order": 12,
    "title": "חתימת חוזה רכישה",
    "appliesTo": ["contractor", "secondhand", "pricebuyer"],
    "durationAvgDays": 2,
    "durationRangeDays": [1, 5] as [number, number],
    "parallelizable": true,
    "dependsOn": ["bank_choice"],
    "notes": "סיכום מסחרי ותנאי תשלום",
    "documents": [
      { "name": "חוזה רכישה חתום + נספחי תשלומים" },
      { "name": "פרטי ליווי/ערבות (בקבלן/מחיר למשתכן)", "optional": true },
      { "name": "ייפוי כוח לעו״ד", "optional": true }
    ],
    "status": "pending" as const
  }
];

export default function MortgageJourneyPage() {
  const [currentStep, setCurrentStep] = useState<string>('borrower_docs');

  const handleStepClick = (step: any) => {
    console.log('Selected step:', step);
    // כאן תוכל להוסיף לוגיקה נוספת כמו פתיחת מודל או עדכון מצב
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <MortgageJourneyMap 
        steps={mortgageSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />
    </div>
  );
}
