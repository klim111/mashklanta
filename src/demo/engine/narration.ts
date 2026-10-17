/**
 * קריינות — הממשק שדרכו ההדגמה "מדברת".
 *
 * היום הקריינות היא הכתוביות בלבד. הממשק מוכן לקריינות קולית עתידית: מימוש
 * שמשתמש ב-Web Speech API או בקבצי שמע מוקלטים יכול להירשם כאן, ומנוע ההדגמה
 * יחכה לו לפני שיעבור לצעד הבא.
 */

export interface NarrationAdapter {
  /** הקראת טקסט. מחזירה הבטחה שנפתרת כשהקריינות הסתיימה (או מיד, בכתוביות בלבד) */
  speak: (text: string, options?: { stepId: string; lang?: string }) => Promise<void>;
  cancel: () => void;
  /** האם הקריינות מוסיפה זמן מעבר לכתובית — כדי שהמנוע לא יקצר צעד באמצע דיבור */
  readonly audible: boolean;
}

/** ברירת המחדל: כתוביות בלבד, בלי קול */
export const captionsOnlyNarration: NarrationAdapter = {
  audible: false,
  speak: async () => undefined,
  cancel: () => undefined,
};

/**
 * קריינות דפדפן (Web Speech API) — מוכנה, אך אינה מופעלת כברירת מחדל.
 * כדי להפעיל: להעביר `narration={browserSpeechNarration()}` ל-DemoEngineProvider.
 */
export function browserSpeechNarration(lang = 'he-IL'): NarrationAdapter {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  if (!supported) return captionsOnlyNarration;
  return {
    audible: true,
    speak: (text, options) =>
      new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options?.lang ?? lang;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }),
    cancel: () => window.speechSynthesis.cancel(),
  };
}
