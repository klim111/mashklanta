"use client";

import React, { useState } from 'react';
import { User, Building, FileText, TrendingUp, Home } from 'lucide-react';
import AdvancedMortgageJourney from '@/components/ui/advanced-mortgage-journey';

// קטגוריות השלבים
const categories = [
  {
    id: 'preparation',
    name: 'הכנה ואפיון',
    description: 'איסוף מסמכים ומידע ראשוני',
    color: '#3B82F6',
    icon: <User className="w-4 h-4" />,
    steps: ['discovery', 'borrower_docs', 'equity_afford'],
    status: 'in_progress' as const,
    progress: 33
  },
  {
    id: 'planning',
    name: 'תכנון ובחירה',
    description: 'בניית תמהיל משכנתא ובחירת מסלולים',
    color: '#10B981',
    icon: <Building className="w-4 h-4" />,
    steps: ['mix_design', 'pre_approval'],
    status: 'pending' as const,
    progress: 0
  },
  {
    id: 'legal',
    name: 'בדיקות משפטיות',
    description: 'בדיקות נכס ושמאות',
    color: '#8B5CF6',
    icon: <FileText className="w-4 h-4" />,
    steps: ['legal_checks', 'pre_appraisal'],
    status: 'pending' as const,
    progress: 0
  },
  {
    id: 'negotiation',
    name: 'מו״מ ובחירה',
    description: 'סקר בנקים ומו״מ על תנאים',
    color: '#F59E0B',
    icon: <TrendingUp className="w-4 h-4" />,
    steps: ['bank_survey', 'neg_round1', 'neg_round2', 'bank_choice'],
    status: 'pending' as const,
    progress: 0
  },
  {
    id: 'finalization',
    name: 'סיום וחתימה',
    description: 'חתימת חוזה רכישה וסיום התהליך',
    color: '#10B981',
    icon: <Home className="w-4 h-4" />,
    steps: ['purchase_contract'],
    status: 'pending' as const,
    progress: 0
  }
];

// נתוני השלבים המעודכנים עם מיקומים ופעולות
const mortgageSteps = [
  {
    "id": "discovery",
    "order": 1,
    "title": "הכרת הלקוח ואפיון מטרה",
    "description": "שיחת אפיון קצרה, הגדרת מטרה ולו״ז",
    "category": "preparation",
    "appliesTo": ["all"],
    "durationAvgDays": 0.5,
    "durationRangeDays": [0.04, 1] as [number, number],
    "parallelizable": true,
    "dependsOn": [],
    "notes": "שיחת אפיון קצרה, הגדרת מטרה ולו״ז",
    "documents": [
      { "id": "doc-1", "name": "שאלון אפיון קצר", "optional": true }
    ],
    "requiresDocuments": false,
    "actions": [
      { "id": "action-1", "name": "שיחה עם יועץ משכנתא" },
      { "id": "action-2", "name": "הגדרת מטרות המשכנתא" },
      { "id": "action-3", "name": "קביעת לוח זמנים" }
    ],
    "status": "completed" as const,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "borrower_docs",
    "order": 2,
    "title": "איסוף מסמכי לווים",
    "description": "מסמכים בסיסיים לזיהוי והכנסות",
    "category": "preparation",
    "appliesTo": ["all"],
    "durationAvgDays": 2,
    "durationRangeDays": [0.5, 5] as [number, number],
    "parallelizable": true,
    "dependsOn": ["discovery"],
    "notes": "מסמכים בסיסיים לזיהוי והכנסות",
    "documents": [
      { "id": "doc-2", "name": "תעודת זהות + ספח לכל לווה/ערב" },
      { "id": "doc-3", "name": "דרכון (לתושבי חו״ל)", "optional": true },
      { "id": "doc-4", "name": "תלושי שכר 3–6 חודשים / אישור מעסיק" },
      { "id": "doc-5", "name": "דפי עו״ש 3–6 חודשים" },
      { "id": "doc-6", "name": "טופס 106 אחרון (שכירים)" },
      { "id": "doc-7", "name": "עצמאים: דוח שנתי + שומה, מקדמות, רו״ח חתום" },
      { "id": "doc-8", "name": "אישורי הלוואות קיימות/מסגרות אשראי" },
      { "id": "doc-9", "name": "מסמכי התחייבויות קבועות (לדוג׳ מזונות)", "optional": true },
      { "id": "doc-10", "name": "חוזי שכירות + אישורי הפקדה (הכנסה משכירות)", "optional": true },
      { "id": "doc-11", "name": "אישורי חסכונות/נכסים רלוונטיים", "optional": true }
    ],
    "actions": [
      { "id": "action-4", "name": "איסוף מסמכי זהות" },
      { "id": "action-5", "name": "איסוף מסמכי הכנסה" },
      { "id": "action-6", "name": "איסוף מסמכי בנק" },
      { "id": "action-7", "name": "איסוף מסמכי נכסים" }
    ],
    "status": "in_progress" as const,
    "requiresDocuments": true,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "equity_afford",
    "order": 3,
    "title": "תכנון הון עצמי ויכולת החזר",
    "description": "חישוב מסגרת רכישה ו-LTV, יעד החזר 25–30%",
    "category": "preparation",
    "appliesTo": ["all"],
    "durationAvgDays": 0.5,
    "durationRangeDays": [0.5, 1] as [number, number],
    "parallelizable": true,
    "dependsOn": ["borrower_docs"],
    "notes": "חישוב מסגרת רכישה ו-LTV, יעד החזר 25–30%",
    "documents": [
      { "id": "doc-12", "name": "אישורי יתרות חיסכון/פק״מ/קופות" },
      { "id": "doc-13", "name": "תצהיר מתנה + אישור העברה בנקאית", "optional": true },
      { "id": "doc-14", "name": "מסמך הלוואה משפחתית (סכום/תנאים)", "optional": true }
    ],
    "actions": [
      { "id": "action-8", "name": "חישוב הון עצמי זמין" },
      { "id": "action-9", "name": "חישוב יכולת החזר חודשית" },
      { "id": "action-10", "name": "קביעת מסגרת רכישה מקסימלית" }
    ],
    "status": "pending" as const,
    "requiresDocuments": true,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "mix_design",
    "order": 4,
    "title": "בניית תמהיל עקרוני",
    "description": "חלוקת מסלולים/תקופות ובדיקות רגישות",
    "category": "planning",
    "appliesTo": ["all"],
    "durationAvgDays": 0.75,
    "durationRangeDays": [0.5, 2] as [number, number],
    "parallelizable": true,
    "dependsOn": ["equity_afford"],
    "notes": "חלוקת מסלולים/תקופות ובדיקות רגישות",
    "documents": [],
    "actions": [
      { "id": "action-11", "name": "בחירת סוגי ריבית" },
      { "id": "action-12", "name": "חלוקת סכומים בין מסלולים" },
      { "id": "action-13", "name": "בדיקת רגישות לתנאי שוק" }
    ],
    "status": "pending" as const,
    "requiresDocuments": false,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "pre_approval",
    "order": 5,
    "title": "אישור עקרוני מהבנק",
    "description": "אונליין/מוקד: מהר; סניף/חריגים: ארוך יותר",
    "category": "planning",
    "appliesTo": ["all"],
    "durationAvgDays": 2,
    "durationRangeDays": [0.04, 7] as [number, number],
    "parallelizable": true,
    "dependsOn": ["borrower_docs"],
    "notes": "אונליין/מוקד: מהר; סניף/חריגים: ארוך יותר",
    "documents": [
      { "id": "doc-15", "name": "טופס בקשה פרסונלי לבנק" },
      { "id": "doc-16", "name": "מסמכי הכנסה וחשבונות (כמו שלב איסוף מסמכים)" }
    ],
    "actions": [
      { "id": "action-14", "name": "הגשת בקשה לבנק" },
      { "id": "action-15", "name": "מעקב אחר סטטוס הבקשה" },
      { "id": "action-16", "name": "קבלת אישור עקרוני" }
    ],
    "status": "pending" as const,
    "requiresDocuments": true,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "legal_checks",
    "order": 6,
    "title": "בדיקות נכס מוקדמות (עו״ד)",
    "description": "נסח, זכויות, שיעבודים, תשריט והיתרים",
    "category": "legal",
    "appliesTo": ["contractor", "secondhand", "pricebuyer"],
    "durationAvgDays": 3,
    "durationRangeDays": [2, 7] as [number, number],
    "parallelizable": true,
    "dependsOn": ["pre_approval"],
    "notes": "נסח, זכויות, שיעבודים, תשריט והיתרים",
    "documents": [
      { "id": "doc-17", "name": "נסח טאבו עדכני / אישור זכויות" },
      { "id": "doc-18", "name": "תשריט בית משותף", "optional": true },
      { "id": "doc-19", "name": "מסמכי ליווי/ערבות חוק מכר (בקבלן)", "optional": true },
      { "id": "doc-20", "name": "היתרי בנייה / טופס 4 (לפי הצורך)", "optional": true }
    ],
    "actions": [
      { "id": "action-17", "name": "בדיקת נסח טאבו" },
      { "id": "action-18", "name": "בדיקת זכויות בנכס" },
      { "id": "action-19", "name": "בדיקת שיעבודים קיימים" }
    ],
    "status": "pending" as const,
    "requiresDocuments": true,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "pre_appraisal",
    "order": 7,
    "title": "שמאות טרום־רכישה (רשות)",
    "description": "מאיץ החלטה ומקטין סיכון פערי שווי",
    "category": "legal",
    "appliesTo": ["secondhand", "pricebuyer", "contractor"],
    "durationAvgDays": 3,
    "durationRangeDays": [2, 5] as [number, number],
    "parallelizable": true,
    "dependsOn": ["legal_checks"],
    "notes": "מאיץ החלטה ומקטין סיכון פערי שווי",
    "documents": [
      { "id": "doc-21", "name": "כתובת/גוש-חלקה-תת חלקה" },
      { "id": "doc-22", "name": "נסח טאבו + תשריט" },
      { "id": "doc-23", "name": "תכניות/היתרים/מדידות (אם קיימים)", "optional": true },
      { "id": "doc-24", "name": "טיוטת חוזה/סיכום מסחרי (אם יש)", "optional": true }
    ],
    "actions": [
      { "id": "action-20", "name": "הזמנת שמאי" },
      { "id": "action-21", "name": "הכנת מסמכים לשמאי" },
      { "id": "action-22", "name": "קבלת דוח שמאות" }
    ],
    "status": "pending" as const,
    "requiresDocuments": true,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "bank_survey",
    "order": 8,
    "title": "סקר בנקים – איסוף הצעות",
    "description": "לפחות 4 בנקים; איחוד הנמוך בכל מסלול",
    "category": "negotiation",
    "appliesTo": ["all"],
    "durationAvgDays": 4,
    "durationRangeDays": [2, 7] as [number, number],
    "parallelizable": false,
    "dependsOn": ["mix_design", "pre_approval"],
    "notes": "לפחות 4 בנקים; איחוד הנמוך בכל מסלול",
    "documents": [
      { "id": "doc-25", "name": "טבלת הצעות מסודרת להשוואה", "optional": true }
    ],
    "actions": [
      { "id": "action-23", "name": "פנייה ל-4 בנקים לפחות" },
      { "id": "action-24", "name": "איסוף הצעות מכל הבנקים" },
      { "id": "action-25", "name": "השוואת הצעות בטבלה" }
    ],
    "status": "pending" as const,
    "requiresDocuments": false,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "neg_round1",
    "order": 9,
    "title": "מו״מ – סבב 1",
    "description": "הורדת מרווחים ראשונית",
    "category": "negotiation",
    "appliesTo": ["all"],
    "durationAvgDays": 1.5,
    "durationRangeDays": [1, 3] as [number, number],
    "parallelizable": false,
    "dependsOn": ["bank_survey"],
    "notes": "הורדת מרווחים ראשונית",
    "documents": [],
    "actions": [
      { "id": "action-26", "name": "הצגת הצעות מתחרות" },
      { "id": "action-27", "name": "בקשה להורדת מרווחים" },
      { "id": "action-28", "name": "מעקב אחר תגובות הבנקים" }
    ],
    "status": "pending" as const,
    "requiresDocuments": false,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "neg_round2",
    "order": 10,
    "title": "מו״מ – סבב 2 (מכרז אחרון)",
    "description": "T−7 לפתיחת תיק – נעילה",
    "category": "negotiation",
    "appliesTo": ["all"],
    "durationAvgDays": 1,
    "durationRangeDays": [0.5, 3] as [number, number],
    "parallelizable": false,
    "dependsOn": ["neg_round1"],
    "notes": "T−7 לפתיחת תיק – נעילה",
    "documents": [],
    "actions": [
      { "id": "action-29", "name": "הכרזה על מכרז אחרון" },
      { "id": "action-30", "name": "מתן זמן סופי לבנקים" },
      { "id": "action-31", "name": "איסוף הצעות סופיות" }
    ],
    "status": "pending" as const,
    "requiresDocuments": false,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "bank_choice",
    "order": 11,
    "title": "בחירת בנק ונעילה",
    "description": "קיבוע עוגנים/מרווחים ותמהיל סופי",
    "category": "negotiation",
    "appliesTo": ["all"],
    "durationAvgDays": 0,
    "durationRangeDays": [0, 1] as [number, number],
    "parallelizable": false,
    "dependsOn": ["neg_round2"],
    "notes": "קיבוע עוגנים/מרווחים ותמהיל סופי",
    "documents": [
      { "id": "doc-26", "name": "אישורים עקרוניים בתוקף" },
      { "id": "doc-27", "name": "סיכום תנאים סופי/דוא״ל בנק" }
    ],
    "actions": [
      { "id": "action-32", "name": "בחירת הבנק הטוב ביותר" },
      { "id": "action-33", "name": "נעילת תנאי המשכנתא" },
      { "id": "action-34", "name": "קבלת אישור סופי" }
    ],
    "status": "pending" as const,
    "requiresDocuments": true,
    "position": { x: 0, y: 0 }
  },
  {
    "id": "purchase_contract",
    "order": 12,
    "title": "חתימת חוזה רכישה",
    "description": "סיכום מסחרי ותנאי תשלום",
    "category": "finalization",
    "appliesTo": ["contractor", "secondhand", "pricebuyer"],
    "durationAvgDays": 2,
    "durationRangeDays": [1, 5] as [number, number],
    "parallelizable": true,
    "dependsOn": ["bank_choice"],
    "notes": "סיכום מסחרי ותנאי תשלום",
    "documents": [
      { "id": "doc-28", "name": "חוזה רכישה חתום + נספחי תשלומים" },
      { "id": "doc-29", "name": "פרטי ליווי/ערבות (בקבלן/מחיר למשתכן)", "optional": true },
      { "id": "doc-30", "name": "ייפוי כוח לעו״ד", "optional": true }
    ],
    "actions": [
      { "id": "action-35", "name": "סקירת חוזה הרכישה" },
      { "id": "action-36", "name": "חתימה על החוזה" },
      { "id": "action-37", "name": "העברת כספים למוכר" }
    ],
    "status": "pending" as const,
    "requiresDocuments": true,
    "position": { x: 0, y: 0 }
  }
];

export default function InteractiveMortgageJourneyPage() {
  const [currentStep, setCurrentStep] = useState<string>('borrower_docs');

  const handleStepUpdate = (step: any) => {
    console.log('Step updated:', step);
    // כאן תוכל להוסיף לוגיקה נוספת כמו שמירה במסד נתונים
  };

  const handleCategoryComplete = (category: any) => {
    console.log('Category completed:', category);
    // כאן תוכל להוסיף לוגיקה נוספת כמו מעבר לקטגוריה הבאה
  };

  return (
    <div className="min-h-screen">
      <AdvancedMortgageJourney 
        steps={mortgageSteps}
        categories={categories}
        onStepUpdate={handleStepUpdate}
        onCategoryUpdate={handleCategoryComplete}
      />
    </div>
  );
}
