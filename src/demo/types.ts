/**
 * מנוע ההדגמה — הטיפוסים המשותפים.
 *
 * הדגמה (`DemoFlow`) היא רצף צעדים (`DemoStep`). כל צעד יכול לנווט למסך, להריץ
 * פעולות על הממשק האמיתי (`DemoAction`: הקלדה, לחיצה, הזזת סליידר...), להאיר
 * רכיב ולהציג כתובית. הצעדים מתייחסים לרכיבים דרך `data-demo-id` יציב, ולא
 * דרך סלקטורים של CSS.
 */

import type { LucideIcon } from 'lucide-react';

/** מצב ההדגמה: ניגון אוטומטי, השהיה, שליטת המשתמש ("נסו בעצמכם"), חזרה מהתנסות וסיום */
export type DemoStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'user-control'
  | 'resumed'
  | 'completed';

/** ערכי ההדגמה — הנתונים שהוקלדו לכלי, כולל מה שהמשתמש שינה בהתנסות */
export interface DemoState {
  values: Record<string, unknown>;
  /** מפתחות שהמשתמש שינה בעצמו — ההדגמה לא דורסת אותם */
  userSet: string[];
}

/** ערך קבוע, או פונקציה שמחשבת אותו מהמצב הנוכחי (למשל אחרי התנסות) */
export type DemoValue<T> = T | ((state: DemoState) => T);

/** טקסט קבוע או תבנית עם `{{key|money}}` שמתמלאת מהמצב, או פונקציה */
export type DemoText = string | ((state: DemoState) => string);

export type SpotlightSide = 'top' | 'bottom' | 'left' | 'right' | 'over';
export type SpotlightAlign = 'start' | 'center' | 'end';

export type DemoAction =
  /** ניווט לכתובת (בתוך האפליקציה) והמתנה שהמסך ייטען */
  | { type: 'navigate'; to: string }
  /** המתנה קבועה */
  | { type: 'wait'; ms: number }
  /** המתנה עד שרכיב מופיע במסך */
  | { type: 'waitFor'; target: string; timeout?: number; optional?: boolean }
  /** גלילה אל רכיב */
  | { type: 'scroll'; target: string; block?: ScrollLogicalPosition }
  /** הזזת הסמן הווירטואלי אל רכיב, בלי לחיצה */
  | { type: 'move'; target: string }
  /** לחיצה על רכיב — כפתור, קישור, כרטיס, לשונית */
  | { type: 'click'; target: string; optional?: boolean }
  /** הקלדת ערך לשדה. `key` שומר את הערך במצב ההדגמה ומאפשר למשתמש לדרוס אותו */
  | {
      type: 'type';
      target: string;
      value: DemoValue<string | number>;
      key?: string;
      clear?: boolean;
      /** הקלדה מיידית (למשל תאריך) במקום תו אחרי תו */
      instant?: boolean;
      /** להקליד גם אם המשתמש כבר שינה את הערך בהתנסות */
      force?: boolean;
    }
  /** הזזת סליידר לערך */
  | { type: 'slider'; target: string; value: DemoValue<number>; key?: string; force?: boolean }
  /** בחירת אפשרות בתפריט בחירה (Radix Select או select רגיל) לפי הטקסט שלה */
  | { type: 'select'; target: string; option: string; key?: string; force?: boolean }
  /** הארה של רכיב עם הסבר קצר, בלי לעבור צעד */
  | { type: 'highlight'; target: string; text?: DemoText; side?: SpotlightSide; hold?: number }
  /** החלפת הכתובית באמצע צעד */
  | { type: 'caption'; text: DemoText }
  /** לחיצת מקש — למשל Escape לסגירת חלון */
  | { type: 'key'; key: string; target?: string }
  /** עדכון ערך במצב ההדגמה (למשל תוצאה שחושבה) */
  | { type: 'setState'; key: string; value: DemoValue<unknown> };

export interface DemoStep {
  id: string;
  /** כותרת קצרה — מוצגת בחלונית ההארה */
  title?: DemoText;
  /** הכתובית — מוצגת בסרגל התחתון, מסונכרנת עם הפעולות */
  caption: DemoText;
  /** טקסט לקריינות קולית (ברירת המחדל — הכתובית). התשתית מוכנה לקריינות עתידית */
  narration?: DemoText;
  /** הסבר קצר בחלונית שליד הרכיב המואר */
  tooltip?: DemoText;
  /** המסך שבו הצעד מתרחש. אם חסר — ממשיכים במסך של הצעד הקודם */
  route?: string;
  /** הפעולות שהצעד מבצע, לפי הסדר */
  actions?: DemoAction[];
  /** הרכיב שמואר אחרי הפעולות */
  target?: string;
  spotlight?: { side?: SpotlightSide; align?: SpotlightAlign; padding?: number };
  /** כמה זמן להשאיר את הצעד על המסך אחרי הפעולות (ברירת מחדל — לפי אורך הכתובית) */
  duration?: number;
  /** האם מציעים בצעד הזה "עצרו ונסו בעצמכם" */
  allowTryIt?: boolean;
  /** רמז שמוצג במצב ההתנסות */
  tryItHint?: DemoText;
  /** לעצור אחרי הצעד ולחכות ללחיצה על "הבא" */
  pauseAfter?: boolean;
}

export type DemoCategory = 'overview' | 'planning' | 'mix' | 'process' | 'client';

export interface DemoFlow {
  id: string;
  title: string;
  description: string;
  /** המסך שבו ההדגמה מתחילה */
  route: string;
  /** לאן חוזרים ביציאה מההדגמה */
  exitRoute?: string;
  /** הערכים ההתחלתיים של ההדגמה (מרוכזים ב-demo-data) */
  initialState?: Record<string, unknown>;
  steps: DemoStep[];
  /** מה מציעים בסיום — הדגמות המשך */
  nextDemos?: string[];
}

/** רשומה בקטלוג — מה שדף הבית ומסך /demo מציגים, בלי לטעון את הצעדים עצמם */
export interface DemoCatalogEntry {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  route: string;
  category: DemoCategory;
  order: number;
  /** משך משוער לתצוגה */
  minutes: number;
  /** האם מוצג בכרטיסי דף הבית */
  featured?: boolean;
  /** טעינה עצלה של הצעדים — כדי שדף הבית לא יטען את כל ההדגמות */
  load: () => Promise<{ default: DemoFlow }>;
}
