/**
 * העדפות הנגישות של המבקר.
 *
 * נשמרות בדפדפן (localStorage) ומוחלות כמחלקות על אלמנט ה-html, כך שכל מסך
 * באתר — מחובר או לא — מקבל אותן בלי לגעת בקוד של המסך עצמו. הסגנונות עצמם
 * נמצאים ב-globals.css תחת "תפריט נגישות".
 */
export type A11yPrefs = {
  /** 0 = רגיל, 1-3 = הגדלה הדרגתית של כל הטקסט */
  textScale: number;
  contrast: boolean;
  invert: boolean;
  grayscale: boolean;
  links: boolean;
  readableFont: boolean;
  spacing: boolean;
  stopMotion: boolean;
  bigCursor: boolean;
};

export const DEFAULT_PREFS: A11yPrefs = {
  textScale: 0,
  contrast: false,
  invert: false,
  grayscale: false,
  links: false,
  readableFont: false,
  spacing: false,
  stopMotion: false,
  bigCursor: false,
};

export const MAX_TEXT_SCALE = 3;
export const STORAGE_KEY = 'mashkalanta-a11y';

/** שם המחלקה על ה-html לכל העדפה בוליאנית */
export const PREF_CLASSES: Record<Exclude<keyof A11yPrefs, 'textScale'>, string> = {
  contrast: 'a11y-contrast',
  invert: 'a11y-invert',
  grayscale: 'a11y-grayscale',
  links: 'a11y-links',
  readableFont: 'a11y-readable',
  spacing: 'a11y-spacing',
  stopMotion: 'a11y-stop-motion',
  bigCursor: 'a11y-big-cursor',
};

/**
 * קוד שרץ ב-head לפני הציור הראשון, כדי שהעדפות שמורות לא "יהבהבו" בטעינה.
 * חייב להיות עצמאי לגמרי (הוא לא עובר דרך הבנדלר).
 */
export const A11Y_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)})||'{}');var c=${JSON.stringify(
  PREF_CLASSES,
)};var r=document.documentElement;for(var k in c){if(p[k])r.classList.add(c[k]);}if(p.textScale>0&&p.textScale<=${MAX_TEXT_SCALE})r.classList.add('a11y-text-'+p.textScale);}catch(e){}})();`;
