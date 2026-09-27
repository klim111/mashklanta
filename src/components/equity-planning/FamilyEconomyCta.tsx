'use client';

import { CalendarClock, Coins, HeartHandshake, PiggyBank } from 'lucide-react';
import type { AdvisorLeadContext } from '@/components/advisor/FamilyEconomyAdvisor';

/**
 * ההקשר של הפנייה ליועץ כלכלת המשפחה מתוך כלי תכנון ההוצאות.
 *
 * הטופס, הכפתור הצף והכרטיס הם אותם רכיבים שמשמשים את כלי ההלוואות
 * הצרכניות — כאן רק מנוסחות נקודות הערך ומשפט המקור לפי מה שהכלי הזה עושה,
 * כדי שהיועץ יראה מיד על מה מדובר.
 */

export const EQUITY_ADVISOR_POINTS: AdvisorLeadContext['points'] = [
  {
    icon: PiggyBank,
    text: 'עובר איתכם על ההון העצמי: כמה באמת צריך להביא, מאיפה לגייס את ההשלמה, ומה זה עושה לריבית שתקבלו',
  },
  {
    icon: Coins,
    text: 'מתאים את ההוצאות הנלוות לעסקה שלכם — מס רכישה, עו״ד, תיווך ושיפוץ — כדי שלא תגלו סכום בחודש הסגירה',
  },
  {
    icon: CalendarClock,
    text: 'בונה תזרים לפי מועדי התשלום: מתי כל סכום נדרש, ואיך להחזיק נזילות עד קבלת המפתח',
  },
];

export const EQUITY_ADVISOR_ORIGIN =
  'פנייה מכלי תכנון ההוצאות — הלקוח מבקש ליווי של יועץ כלכלת המשפחה: תכנון ההון העצמי, ההוצאות הנלוות לרכישה והתזרים עד קבלת המפתח.';

export const EQUITY_ADVISOR_CARD_TITLE = 'לא בטוחים איזה סכום להזין בכל שורה?';

export const EQUITY_ADVISOR_INTRO =
  'השאירו שם וטלפון, ויועץ יחזור אליכם עם קריאה ראשונה של התכנון שהזנתם כאן — כמה הון עצמי באמת צריך, אילו הוצאות נלוות רלוונטיות לעסקה שלכם, ומתי כל תשלום נדרש.';

export const EQUITY_ADVISOR_CONFIRMATION =
  'הבקשה מופיעה אצל יועצי משכלנתא כבקשת ליווי, יחד עם תמונת ההון העצמי וההוצאות שהזנתם כאן — כך שהשיחה מתחילה מהנתונים שלכם ולא מאפס. בינתיים אפשר להמשיך לעבוד בכלי.';

/** כפתור הפנייה שבכותרת הכלי — פותח את אותו טופס */
export function FamilyEconomyHeaderButton({ onContact }: { onContact: () => void }) {
  return (
    <button
      type="button"
      onClick={onContact}
      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-button font-black text-white ring-1 ring-inset ring-white/20 backdrop-blur transition-colors hover:bg-white/20"
    >
      <HeartHandshake className="h-4 w-4" />
      פנה ליועץ כלכלת המשפחה
    </button>
  );
}
