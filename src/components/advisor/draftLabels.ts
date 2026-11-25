import type { PlanStageId } from '@/lib/mortgage-plan';

/**
 * שמות השדות כפי שהיועץ מכיר אותם מהעמוד — להודעות "הלקוח שינה" ו"ממתין
 * לשידור". שדה בלי שם כאן מוצג בשם הקבוצה שלו או כ"פרט נוסף".
 */
const LABELS: Record<string, string> = {
  intent: 'מטרת התהליך',
  household: 'הרכב משק הבית',
  bankAccountMode: 'חשבון הבנק',
  firstName: 'שם פרטי',
  lastName: 'שם משפחה',
  partnerFirstName: 'שם בן/בת הזוג',
  partnerLastName: 'שם משפחה של בן/בת הזוג',
  age: 'גיל',
  partnerAge: 'גיל בן/בת הזוג',
  income: 'הכנסה',
  partnerIncome: 'הכנסת בן/בת הזוג',
  employmentType: 'סוג תעסוקה',
  partnerEmploymentType: 'סוג תעסוקה של בן/בת הזוג',
  expenses: 'הוצאות',
  borrowerLoans: 'הלוואות',
  partnerLoans: 'הלוואות של בן/בת הזוג',
  existingLoans: 'החזרי הלוואות',
  equity: 'הון עצמי',
  dealType: 'סוג העסקה',
  propertyValue: 'שווי הנכס',
  mortgageAmount: 'גובה המשכנתא',
  targetLtvPercent: 'אחוז מימון',
  primaryBank: 'הבנק העיקרי',
  partnerPrimaryBank: 'הבנק של בן/בת הזוג',
  propertyAddress: 'כתובת הנכס',
  years: 'תקופת המשכנתא',
  futureLumpSums: 'סכומים צפויים',
  futureMonthlyIncrease: 'עלייה צפויה בהכנסה',
  futureMonthlyIncreaseInYears: 'מועד העלייה בהכנסה',
  expectsIncomeIncrease: 'צפי לעלייה בהכנסה',
  documentsMode: 'אופן הגשת המסמכים',
  planning: 'נתוני כלי היכולת',
  mixKey: 'התמהיל שנבחר',
  mixName: 'שם התמהיל',
  isFinal: 'תמהיל סופי',
  finalLocked: 'נעילת התמהיל',
  notes: 'הערות',
  note: 'הערה',
  refinance: 'התמהיל למיחזור',
  bank: 'הבנק',
  submittedAt: 'מועד ההגשה',
  documents: 'מסמכים',
  approved: 'אישור עקרוני',
  approvedAmount: 'הסכום שאושר',
  approvedAt: 'מועד האישור',
  validUntil: 'תוקף האישור',
  baskets: 'סלי הריבית',
  bankApprovals: 'אישורי הבנקים',
  mode: 'אופן התמחור',
  offers: 'הצעות הבנקים',
  winnerOfferId: 'ההצעה הזוכה',
  signedMix: 'התמהיל לחתימה',
  negotiation: 'משא ומתן',
  signingDate: 'מועד החתימה',
  finalAmount: 'הסכום הסופי',
  finalMonthlyPayment: 'ההחזר הסופי',
  finalAverageRate: 'הריבית הסופית',
  checklist: 'רשימת הבדיקה',
  dealTypeId: 'תרחיש הרכישה',
  registryId: 'רישום הזכויות',
  scenarioId: 'התרחיש',
  bankFile: 'פתיחת התיק בבנק',
  paymentSchedule: 'פעימות התשלום',
  contractAnswer: 'חתימה על חוזה',
  collateral: 'טופס הבטחונות',
  tiyulim: 'טופס טיולים',
  visits: 'ההגעות לסניף',
  tracker: 'המשכנתא שלי',
};

export function fieldLabel(_stage: PlanStageId, path: string): string {
  return LABELS[path] ?? LABELS[path.split('.')[0]] ?? 'פרט נוסף';
}

/** שמות השדות, בלי כפילויות */
export function fieldLabels(stage: PlanStageId, paths: string[]): string[] {
  return Array.from(new Set(paths.map((path) => fieldLabel(stage, path))));
}
