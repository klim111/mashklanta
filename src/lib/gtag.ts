/**
 * Google Analytics 4 של משכלנתא.
 *
 * מזהה המדידה אינו סוד (הוא מופיע בכל עמוד), ולכן יש לו ברירת מחדל בקוד.
 * אפשר להחליף אותו ב-Vercel דרך NEXT_PUBLIC_GA_MEASUREMENT_ID, ומחרוזת ריקה
 * שם מכבה את המדידה. פרמטרי UTM שבכתובת נקלטים ב-GA4 בלי קוד נוסף.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-L7F40ZPQDZ';

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** שליחת אירוע ל-GA4. בלי מזהה, לפני שהתג נטען או אצל היועץ — לא קורה כלום */
export function trackEvent(name: string, params: GtagParams = {}) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, params);
  } catch {
    // מדידה שנכשלה לא אמורה להפריע לגלישה
  }
}
