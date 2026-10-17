/**
 * סוג הפנייה ליועץ — מה שהלקוח סימן בטופס: ליווי, פגישה, שאלה או הצעת מחיר.
 * הנושא (`LeadTopic`) אומר מאיפה בפלטפורמה הפנייה נשלחה; הסוג אומר מה הלקוח
 * מבקש. שניהם מופיעים ליועץ, במייל ובלשונית הפניות.
 */
export type RequestKind = 'GUIDANCE' | 'MEETING' | 'QUESTION' | 'QUOTE';

export const REQUEST_KINDS: readonly RequestKind[] = ['GUIDANCE', 'MEETING', 'QUESTION', 'QUOTE'];

export const REQUEST_KIND_LABELS: Record<RequestKind, string> = {
  GUIDANCE: 'בקשת ליווי',
  MEETING: 'בקשה לפגישה',
  QUESTION: 'שאלה ליועץ',
  QUOTE: 'בקשת הצעת מחיר',
};

/** התווית הקצרה לבחירה בטופס */
export const REQUEST_KIND_CHOICES: Record<RequestKind, string> = {
  GUIDANCE: 'ליווי',
  MEETING: 'פגישה',
  QUESTION: 'שאלה',
  QUOTE: 'הצעת מחיר',
};

export function parseRequestKind(value: unknown): RequestKind | null {
  return REQUEST_KINDS.includes(value as RequestKind) ? (value as RequestKind) : null;
}
