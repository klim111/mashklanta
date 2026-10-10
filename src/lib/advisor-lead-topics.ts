/**
 * נושאי הפניות ליועץ — הכפתור שממנו נפתחה הפנייה. בקובץ נפרד, בלי גישה
 * לבסיס הנתונים, כדי שטפסים בדפדפן יוכלו להציג את התוויות.
 */
export type LeadTopic =
  | 'FOUND_PROPERTY_REJECTED'
  | 'FOUND_PROPERTY_DONT_KNOW'
  | 'FEASIBILITY'
  | 'EQUITY'
  | 'FULL_SERVICE'
  | 'NEW_MORTGAGE_HYBRID'
  | 'NEW_MORTGAGE_FULL'
  | 'REFINANCE_HYBRID'
  | 'REFINANCE_FULL'
  | 'ADVICE'
  | 'FAMILY_ECONOMY'
  | 'EXPERT_JOIN'
  | 'CONSULT_BANK_OFFER'
  | 'CONSULT_REFINANCE'
  | 'CONSULT_DECLINED'
  | 'CHAT'
  | 'HOME_NEW_MORTGAGE'
  | 'HOME_REFINANCE'
  | 'OTHER';

const LEAD_TOPICS: readonly LeadTopic[] = [
  'FOUND_PROPERTY_REJECTED',
  'FOUND_PROPERTY_DONT_KNOW',
  'FEASIBILITY',
  'EQUITY',
  'FULL_SERVICE',
  'NEW_MORTGAGE_HYBRID',
  'NEW_MORTGAGE_FULL',
  'REFINANCE_HYBRID',
  'REFINANCE_FULL',
  'ADVICE',
  'FAMILY_ECONOMY',
  'EXPERT_JOIN',
  'CONSULT_BANK_OFFER',
  'CONSULT_REFINANCE',
  'CONSULT_DECLINED',
  'CHAT',
  'HOME_NEW_MORTGAGE',
  'HOME_REFINANCE',
  'OTHER',
];

export const LEAD_TOPIC_LABELS: Record<LeadTopic, string> = {
  FOUND_PROPERTY_REJECTED: 'הבנק סירב לתת אישור עקרוני',
  FOUND_PROPERTY_DONT_KNOW: 'לא יודע/ת מהיכן להתחיל',
  FEASIBILITY: 'בדיקת היתכנות לרכישת נכס',
  EQUITY: 'עזרה בגיוס הון עצמי',
  FULL_SERVICE: 'מסלול בליווי יועץ משכלנתא',
  // "מה תרצו לעשות?" — המטרה וסוג השירות שהלקוח בחר
  NEW_MORTGAGE_HYBRID: 'משכנתא חדשה · ליווי משולב',
  NEW_MORTGAGE_FULL: 'משכנתא חדשה · מסלול בליווי',
  REFINANCE_HYBRID: 'מיחזור משכנתא · ליווי משולב',
  REFINANCE_FULL: 'מיחזור משכנתא · מסלול בליווי',
  ADVICE: 'ייעוץ והכוונה בנושא משכנתא',
  // פנייה ליועץ כלכלת המשפחה — מכלי ההלוואות הצרכניות ומכלי תכנון ההוצאות
  FAMILY_ECONOMY: 'ליווי כלכלת המשפחה · הלוואות, הון עצמי והוצאות',
  // "צרפו מומחה משכלנתא לתהליך" — מטאב אנשי הקשר באזור האישי
  EXPERT_JOIN: 'צירוף מומחה משכלנתא לתהליך',
  // "היוועצו איתנו" בסרגל העליון
  CONSULT_BANK_OFFER: 'בדיקת הצעה שהתקבלה מהבנק',
  CONSULT_REFINANCE: 'בדיקה אם כדאי למחזר',
  CONSULT_DECLINED: 'לא מאשרים משכנתא, בדיקה מה אפשר לעשות',
  // הלקוח סימן סוג פנייה בהודעה בצ׳אט עם היועץ
  CHAT: 'פנייה מהצ׳אט עם היועץ',
  // "לקבל ייעוץ והכוונה" בעמוד הבית
  HOME_NEW_MORTGAGE: 'ליווי בלקיחת משכנתא חדשה',
  HOME_REFINANCE: 'ליווי במיחזור או גרירה',
  OTHER: 'פנייה כללית',
};

export function parseLeadTopic(value: unknown): LeadTopic {
  return LEAD_TOPICS.includes(value as LeadTopic) ? (value as LeadTopic) : 'OTHER';
}
