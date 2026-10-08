import type { LeadTopic } from '@/lib/advisor-lead-topics';
import { FileSearch, RefreshCw, ShieldAlert, type LucideIcon } from 'lucide-react';

/**
 * "היוועצו איתנו" בסרגל העליון — הסיבות שמהן אפשר לפתוח בקשת ליווי.
 *
 * כל סיבה מובילה לאותו עמוד בקשה (/consult?reason=…), והבקשה מגיעה ליועץ כבקשת ליווי
 * עם הסיבה שנבחרה, כדי שיידע מאיזו נקודה הלקוח הגיע.
 */
export type ConsultReason = 'bank-offer' | 'refinance' | 'declined';

export interface ConsultReasonInfo {
  id: ConsultReason;
  /** הטקסט בתפריט ובכרטיס הבחירה */
  label: string;
  /** שורת הסבר קצרה מתחת לכרטיס */
  hint: string;
  /** נושא הפנייה אצל היועץ */
  topic: LeadTopic;
  icon: LucideIcon;
}

export const CONSULT_REASONS: readonly ConsultReasonInfo[] = [
  {
    id: 'bank-offer',
    label: 'בדקו הצעה שקיבלתי מהבנק',
    hint: 'קיבלתם אישור עקרוני או הצעת ריביות? נבדוק אם היא טובה ומה אפשר לשפר',
    topic: 'CONSULT_BANK_OFFER',
    icon: FileSearch,
  },
  {
    id: 'refinance',
    label: 'בדקו אם שווה לי למחזר',
    hint: 'נבדוק את המשכנתא הקיימת ונגיד לכם אם מיחזור יחסוך לכם כסף',
    topic: 'CONSULT_REFINANCE',
    icon: RefreshCw,
  },
  {
    id: 'declined',
    label: 'לא מאשרים לי משכנתא, תבדקו אם יש מה לעשות',
    hint: 'הבנק סירב או מציע פחות ממה שצריך? נבדוק מה אפשר לעשות',
    topic: 'CONSULT_DECLINED',
    icon: ShieldAlert,
  },
];

export function consultReason(value: string | null | undefined): ConsultReasonInfo | null {
  return CONSULT_REASONS.find((reason) => reason.id === value) ?? null;
}

export function consultHref(reason: ConsultReason): string {
  return `/consult?reason=${reason}`;
}

/**
 * אחרי שליחת הבקשה אורח עובר להרשמה. השם והמייל עוברים דרך sessionStorage ולא בכתובת,
 * כדי שלא יישמרו בהיסטוריה ובסטטיסטיקת הביקורים.
 */
export const CONSULT_PREFILL_KEY = 'mashkalanta:consult-prefill';

export interface ConsultPrefill {
  name: string;
  email: string;
}

export function saveConsultPrefill(prefill: ConsultPrefill) {
  try {
    sessionStorage.setItem(CONSULT_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    // דפדפן בלי sessionStorage: ההרשמה פשוט תיפתח ריקה
  }
}

export function readConsultPrefill(): ConsultPrefill | null {
  try {
    const raw = sessionStorage.getItem(CONSULT_PREFILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsultPrefill>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
    };
  } catch {
    return null;
  }
}
