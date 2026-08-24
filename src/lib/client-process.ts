/**
 * שלבי ליווי הלקוח וקטלוג המסמכים של כל שלב.
 *
 * הקטלוג הוא מקור האמת היחיד לרשימת המסמכים: כשלקוח מגיע לשלב, נוצרות עבורו
 * רשומות מסמך מהקטלוג של אותו שלב, ומכאן ואילך הסטטוס מנוהל ברשומה עצמה.
 * הקובץ טהור מכוונה — הוא נטען גם בשרת וגם בדפדפן, ולכן אינו מייבא את Prisma.
 */

export const CLIENT_STAGES = [
  'INTAKE',
  'DOCUMENTS',
  'PLANNING',
  'BANK_SUBMISSION',
  'APPROVAL',
  'NEGOTIATION',
  'SIGNING',
  'FUNDING',
  'COMPLETED',
] as const;

export type ClientStage = (typeof CLIENT_STAGES)[number];

export const STAGE_LABELS: Record<ClientStage, string> = {
  INTAKE: 'היכרות ואיסוף נתונים',
  DOCUMENTS: 'איסוף מסמכים',
  PLANNING: 'תכנון תמהיל',
  BANK_SUBMISSION: 'הגשה לבנקים',
  APPROVAL: 'אישור עקרוני',
  NEGOTIATION: 'משא ומתן על הריביות',
  SIGNING: 'חתימת מסמכי המשכנתא',
  FUNDING: 'ביצוע והעברת כספים',
  COMPLETED: 'התהליך הושלם',
};

export const DOCUMENT_STATUSES = ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
export type ClientDocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_STATUS_LABELS: Record<ClientDocumentStatus, string> = {
  PENDING: 'טרם הוגש',
  SUBMITTED: 'הוגש',
  APPROVED: 'אושר',
  REJECTED: 'נדחה',
};

export interface StageDocument {
  key: string;
  name: string;
  /** מסמך שאינו נדרש מכל לקוח — למשל שומה או אישור רו"ח לעצמאי */
  required?: boolean;
}

export const STAGE_DOCUMENTS: Record<ClientStage, StageDocument[]> = {
  INTAKE: [
    { key: 'id_card', name: 'תעודת זהות + ספח של כל הלווים' },
    { key: 'household_declaration', name: 'הצהרת הכנסות והוצאות של משק הבית' },
  ],
  DOCUMENTS: [
    { key: 'payslips', name: '3 תלושי שכר אחרונים' },
    { key: 'bank_statements', name: 'תדפיסי עובר ושב ל-3 החודשים האחרונים' },
    { key: 'self_employed_tax', name: 'שומת מס ואישור רו"ח (לעצמאים)', required: false },
    { key: 'loans_report', name: 'דוח ריכוז יתרות הלוואות' },
    { key: 'equity_proof', name: 'אסמכתאות למקורות ההון העצמי' },
  ],
  PLANNING: [
    { key: 'purchase_agreement', name: 'חוזה רכישה או זיכרון דברים' },
    { key: 'property_rights', name: 'נסח טאבו או אישור זכויות' },
    { key: 'appraisal', name: 'שמאות מקרקעין', required: false },
  ],
  BANK_SUBMISSION: [
    { key: 'application_form', name: 'טופס בקשה למשכנתא חתום' },
    { key: 'confidentiality_waiver', name: 'ויתור סודיות ואישור לבדיקת נתוני אשראי' },
  ],
  APPROVAL: [{ key: 'approval_letter', name: 'אישור עקרוני מהבנק' }],
  NEGOTIATION: [{ key: 'bank_offers', name: 'הצעות ריבית מהבנקים' }],
  SIGNING: [
    { key: 'mortgage_documents', name: 'מסמכי המשכנתא חתומים' },
    { key: 'life_insurance', name: 'פוליסת ביטוח חיים' },
    { key: 'property_insurance', name: 'פוליסת ביטוח מבנה' },
    { key: 'lien_registration', name: 'רישום הערת אזהרה או משכון' },
  ],
  FUNDING: [
    { key: 'transfer_confirmation', name: 'אישור העברת כספים מהבנק' },
    { key: 'seller_receipt', name: 'קבלה מהמוכר על קבלת התשלום' },
  ],
  COMPLETED: [],
};

export function stageIndex(stage: ClientStage): number {
  const index = CLIENT_STAGES.indexOf(stage);
  return index < 0 ? 0 : index;
}

/** ההתקדמות באחוזים לפי מיקום השלב ברצף */
export function stageProgress(stage: ClientStage): number {
  return Math.round((stageIndex(stage) / (CLIENT_STAGES.length - 1)) * 100);
}

/**
 * המסמכים שכבר נפתחו ללקוח: של השלב הנוכחי ושל כל השלבים שלפניו, כדי שמסמך
 * שנשאר פתוח משלב קודם לא ייעלם מהרשימה.
 */
export function documentsUpToStage(
  stage: ClientStage
): Array<StageDocument & { stage: ClientStage }> {
  const limit = stageIndex(stage);
  return CLIENT_STAGES.slice(0, limit + 1).flatMap((current) =>
    STAGE_DOCUMENTS[current].map((doc) => ({ ...doc, stage: current }))
  );
}
