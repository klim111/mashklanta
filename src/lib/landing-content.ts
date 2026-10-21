/**
 * הטקסטים של דפי הנחיתה — מה שהיועץ עורך בלשונית "דפי נחיתה" בלוח הבקרה.
 *
 * כל דף מוגדר כרשימת שדות. התוכן נשמר כמילון שטוח של מחרוזות לכל דף, כך
 * שהעורך אחיד לכל הדפים ושדה חדש שנוסף כאן מופיע בו מעצמו, עם ערך ברירת מחדל.
 * שדה מסוג `list` נשמר כמחרוזת אחת, פריט בכל שורה.
 *
 * בלי גישה לבסיס הנתונים, כדי שגם העורך בדפדפן יוכל להשתמש בהגדרות.
 */

export type LandingPageId = 'affordability' | 'refinance' | 'equity' | 'loans' | 'office';

export type LandingFieldKind = 'line' | 'text' | 'list';

export interface LandingField {
  key: string;
  label: string;
  kind: LandingFieldKind;
  /** כותרת קבוצה — השדה הראשון בכל קבוצה פותח אותה בעורך */
  group: string;
}

export interface LandingPageDef {
  id: LandingPageId;
  title: string;
  path: string;
  fields: LandingField[];
}

export type LandingPageContent = Record<string, string>;
export type LandingContent = Record<LandingPageId, LandingPageContent>;

const MAX_FIELD_LENGTH = 2000;

const TOOL_FIELDS: LandingField[] = [
  { key: 'name', label: 'שם הכלי (בכותרת העליונה ובכרטיסים)', kind: 'line', group: 'פתיחה' },
  { key: 'headline', label: 'כותרת ראשית', kind: 'line', group: 'פתיחה' },
  { key: 'subtitle', label: 'תיאור מתחת לכותרת', kind: 'text', group: 'פתיחה' },
  { key: 'highlights', label: 'נקודות בולטות (שורה לכל נקודה)', kind: 'list', group: 'פתיחה' },
  { key: 'consultLabel', label: 'כפתור הייעוץ', kind: 'line', group: 'פתיחה' },
  { key: 'communityTitle', label: 'כותרת אזור הקהילה', kind: 'line', group: 'קהילה ופלטפורמה' },
  { key: 'communityText', label: 'טקסט אזור הקהילה', kind: 'text', group: 'קהילה ופלטפורמה' },
  { key: 'metaTitle', label: 'כותרת בגוגל ובשיתוף', kind: 'line', group: 'גוגל ושיתוף ברשתות' },
  { key: 'metaDescription', label: 'תיאור בגוגל ובשיתוף', kind: 'text', group: 'גוגל ושיתוף ברשתות' },
];

const COMMUNITY_TITLE = 'הצטרפו לקהילת משכלנתא והגדילו את כוח קהילת הלקוחות מול הבנקים';
const TOOL_COMMUNITY_TEXT =
  'הכלי הזה הוא חלק קטן מהפלטפורמה. בפלטפורמה המלאה של משכלנתא בונים תמהיל, משווים אישורים עקרוניים מכל הבנקים ומנהלים את המשכנתא עד החתימה, עם שקיפות מלאה ויועץ לצידכם בכל שלב.';

const OFFICE_FIELDS: LandingField[] = [
  { key: 'badge', label: 'תווית מעל הכותרת', kind: 'line', group: 'פתיחה' },
  { key: 'title', label: 'כותרת ראשית', kind: 'line', group: 'פתיחה' },
  { key: 'titleAccent', label: 'סוף הכותרת (בצבע)', kind: 'line', group: 'פתיחה' },
  { key: 'subtitle', label: 'תיאור מתחת לכותרת', kind: 'text', group: 'פתיחה' },
  { key: 'heroPoints', label: 'נקודות בולטות (שורה לכל נקודה)', kind: 'list', group: 'פתיחה' },
  { key: 'formTitle', label: 'כותרת הטופס', kind: 'line', group: 'טופס הפנייה' },
  { key: 'formSubtitle', label: 'הסבר מתחת לכותרת הטופס', kind: 'text', group: 'טופס הפנייה' },
  { key: 'newMortgageLabel', label: 'כפתור משכנתא חדשה', kind: 'line', group: 'טופס הפנייה' },
  { key: 'refinanceLabel', label: 'כפתור מיחזור', kind: 'line', group: 'טופס הפנייה' },
  { key: 'submitLabel', label: 'כפתור השליחה', kind: 'line', group: 'טופס הפנייה' },
  { key: 'featuresTitle', label: 'כותרת', kind: 'line', group: 'מה המשרד הדיגיטלי עושה' },
  { key: 'featuresSubtitle', label: 'תיאור', kind: 'text', group: 'מה המשרד הדיגיטלי עושה' },
  ...[1, 2, 3, 4, 5, 6].flatMap((n): LandingField[] => [
    { key: `feature${n}Title`, label: `כרטיס ${n} · כותרת`, kind: 'line', group: 'מה המשרד הדיגיטלי עושה' },
    { key: `feature${n}Text`, label: `כרטיס ${n} · טקסט`, kind: 'text', group: 'מה המשרד הדיגיטלי עושה' },
  ]),
  { key: 'stepsTitle', label: 'כותרת', kind: 'line', group: 'שלבי התהליך' },
  ...[1, 2, 3, 4].flatMap((n): LandingField[] => [
    { key: `step${n}Title`, label: `שלב ${n} · כותרת`, kind: 'line', group: 'שלבי התהליך' },
    { key: `step${n}Text`, label: `שלב ${n} · טקסט`, kind: 'text', group: 'שלבי התהליך' },
  ]),
  { key: 'stepsCta', label: 'הכפתור מתחת לשלבים', kind: 'line', group: 'שלבי התהליך' },
  { key: 'toolsTitle', label: 'כותרת', kind: 'line', group: 'הכלים החינמיים' },
  { key: 'toolsSubtitle', label: 'תיאור', kind: 'text', group: 'הכלים החינמיים' },
  { key: 'communityTitle', label: 'כותרת אזור הקהילה', kind: 'line', group: 'קהילה ופלטפורמה' },
  { key: 'communityText', label: 'טקסט אזור הקהילה', kind: 'text', group: 'קהילה ופלטפורמה' },
  { key: 'metaTitle', label: 'כותרת בגוגל ובשיתוף', kind: 'line', group: 'גוגל ושיתוף ברשתות' },
  { key: 'metaDescription', label: 'תיאור בגוגל ובשיתוף', kind: 'text', group: 'גוגל ושיתוף ברשתות' },
];

export const LANDING_PAGES: LandingPageDef[] = [
  { id: 'office', title: 'משרד משכנתאות דיגיטלי', path: '/digital-office', fields: OFFICE_FIELDS },
  { id: 'affordability', title: 'כמה משכנתא אפשר לקבל', path: '/afford', fields: TOOL_FIELDS },
  { id: 'refinance', title: 'בדיקת מיחזור', path: '/refinance-check', fields: TOOL_FIELDS },
  { id: 'equity', title: 'תכנון הון עצמי', path: '/equity', fields: TOOL_FIELDS },
  { id: 'loans', title: 'ניתוח הלוואות', path: '/loans', fields: TOOL_FIELDS },
];

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  affordability: {
    name: 'כמה משכנתא אפשר לקבל',
    headline: 'כמה דירה אתם באמת יכולים להרשות לעצמכם?',
    subtitle:
      'מזינים הכנסות, הון עצמי והתחייבויות, ומקבלים את שווי הנכס המקסימלי ואת ההחזר החודשי, לפי מגבלות בנק ישראל ולפי הריביות של החודש.',
    highlights: ['לפי מגבלות בנק ישראל', 'ריביות עדכניות מהשוק', 'תוצאה תוך דקות'].join('\n'),
    consultLabel: 'ייעוץ משכנתאות',
    communityTitle: COMMUNITY_TITLE,
    communityText: TOOL_COMMUNITY_TEXT,
    metaTitle: 'מחשבון כמה משכנתא אפשר לקבל | משכלנתא',
    metaDescription:
      'מחשבון חינמי לשווי הנכס המקסימלי שאפשר לקנות: לפי הכנסות, הון עצמי והתחייבויות, עם מגבלות בנק ישראל וריביות עדכניות. בלי הרשמה.',
  },
  refinance: {
    name: 'בדיקת מיחזור משכנתא',
    headline: 'האם המשכנתא שלכם עולה לכם יותר מדי?',
    subtitle:
      'בוחרים מטרה, מזינים את המסלולים של המשכנתא הקיימת, והמערכת בודקת מול ממוצעי הריביות של בנק ישראל אם יש מקום לחסוך.',
    highlights: ['השוואה לממוצעי בנק ישראל', 'בלי לשלוח מסמכים', 'רואים את החיסכון מיד'].join('\n'),
    consultLabel: 'ייעוץ משכנתאות',
    communityTitle: COMMUNITY_TITLE,
    communityText: TOOL_COMMUNITY_TEXT,
    metaTitle: 'בדיקת מיחזור משכנתא בחינם | משכלנתא',
    metaDescription:
      'בודקים בחינם אם כדאי למחזר את המשכנתא: מזינים את המסלולים הקיימים ומשווים לממוצעי הריביות של בנק ישראל. בלי הרשמה ובלי מסמכים.',
  },
  equity: {
    name: 'תכנון הון עצמי',
    headline: 'כמה כסף צריך להביא עד שמקבלים את המפתח?',
    subtitle:
      'מקדמה, מס רכישה, עורך דין, תיווך ושיפוץ, כל ההוצאות של קניית הדירה על ציר זמן אחד, כדי לדעת מראש מתי צריך כל שקל.',
    highlights: ['כל ההוצאות עד המפתח בטבלה אחת', 'תזרים לפי חודשים', 'ייצוא ושיתוף של התכנון'].join('\n'),
    consultLabel: 'ייעוץ משכנתאות',
    communityTitle: COMMUNITY_TITLE,
    communityText: TOOL_COMMUNITY_TEXT,
    metaTitle: 'מחשבון הון עצמי ומס רכישה לקניית דירה | משכלנתא',
    metaDescription:
      'מתכננים את ההון העצמי לקניית דירה: מקדמה, מס רכישה, עו״ד, תיווך ושיפוץ בטבלה אחת, עם תזרים לפי חודשים. כלי חינמי, בלי הרשמה.',
  },
  loans: {
    name: 'ניתוח הלוואות',
    headline: 'כל ההלוואות שלכם במקום אחד, ומה אפשר לחסוך',
    subtitle:
      'ממפים את ההלוואות הקיימות ורואים מיד את ההחזר החודשי, את הריבית עד הסוף, ואת מה שאיחוד או פירעון מוקדם יכולים לחסוך למשפחה.',
    highlights: ['יחס החזר מההכנסה', 'תרחישי איחוד ופירעון מוקדם', 'השוואה לריביות בשוק'].join('\n'),
    consultLabel: 'ייעוץ כלכלת המשפחה',
    communityTitle: COMMUNITY_TITLE,
    communityText: TOOL_COMMUNITY_TEXT,
    metaTitle: 'מחשבון הלוואות, איחוד הלוואות ופירעון מוקדם | משכלנתא',
    metaDescription:
      'מרכזים את כל ההלוואות במקום אחד: החזר חודשי, ריבית עד הסוף, יחס החזר מההכנסה ותרחישי איחוד ופירעון מוקדם. כלי חינמי של משכלנתא.',
  },
  office: {
    badge: 'משרד ייעוץ משכנתאות דיגיטלי',
    title: 'כל תהליך המשכנתא,',
    titleAccent: 'במשרד אחד דיגיטלי',
    subtitle:
      'יועץ משכנתאות אישי, ואיתו כל מי שהעסקה צריכה: הבנקים, עורך הדין, השמאי והבנקאי. הכול מתנהל ישירות מהפלטפורמה של משכלנתא, מהבקשה הראשונה ועד החתימה בבנק.',
    heroPoints: [
      'יועץ משכנתאות אישי שמלווה אתכם עד החתימה',
      'הבנקים, עורך הדין והשמאי מנוהלים מאותו מסך',
      'בלי לרוץ בין סניפים ובלי לאבד מסמכים בדרך',
    ].join('\n'),
    formTitle: 'דברו עם יועץ משכנתאות',
    formSubtitle: 'השאירו פרטים, ויועץ של משכלנתא יחזור אליכם ויפתח איתכם את התיק.',
    newMortgageLabel: 'לקחת משכנתא חדשה',
    refinanceLabel: 'לחסוך במשכנתא קיימת',
    submitLabel: 'שלחו ויועץ יחזור אליכם',
    featuresTitle: 'משרד משכנתאות שלם, בלי ללכת למשרד',
    featuresSubtitle:
      'כל מה שמשרד ייעוץ משכנתאות עושה בשבילכם, ועוד שקיפות מלאה: אתם רואים כל צעד, כל מסמך וכל הצעה.',
    feature1Title: 'מול כל הבנקים במקביל',
    feature1Text:
      'הבקשות לאישור עקרוני יוצאות לכמה בנקים מהפלטפורמה, וההצעות שחוזרות מושוות זו לצד זו במכרז ריביות.',
    feature2Title: 'עורך דין, שמאי ובנקאי באותו מקום',
    feature2Text:
      'כל אנשי המקצוע של העסקה מרוכזים באנשי הקשר. המיילים אליהם יוצאים מהפלטפורמה ונשמרים בתיק שלכם.',
    feature3Title: 'יועץ אישי בצ׳אט ובווידאו',
    feature3Text: 'שואלים בצ׳אט ונפגשים עם היועץ בשיחת וידאו מתוך הפלטפורמה, בלי לקבוע פגישה במשרד.',
    feature4Title: 'תיק מסמכים דיגיטלי',
    feature4Text:
      'תלושים, דפי בנק, אישורים וחוזים בתיקייה אחת מסודרת לפי קטגוריות, מוכנים לשליחה לבנק בלחיצה.',
    feature5Title: 'תמהיל שקוף, מסלול אחר מסלול',
    feature5Text:
      'רואים כל מסלול, כל ריבית וכל תרחיש, ומבינים בדיוק מה ההחזר החודשי ומה העלות הכוללת לאורך השנים.',
    feature6Title: 'משא ומתן בשבילכם',
    feature6Text: 'היועץ מנהל את סבבי המכרז מול הבנקאים, וכל ריבית משופרת שמגיעה נכנסת ישר להשוואה.',
    stepsTitle: 'מהפנייה ועד החתימה',
    step1Title: 'משאירים פרטים',
    step1Text: 'בוחרים משכנתא חדשה או מיחזור, ויועץ חוזר אליכם.',
    step2Title: 'בונים את התיק',
    step2Text: 'פרופיל פיננסי, מסמכים ותמהיל, הכול בפלטפורמה.',
    step3Title: 'יוצאים לבנקים',
    step3Text: 'הגשה לכמה בנקים ומכרז ריביות שהיועץ מנהל.',
    step4Title: 'חותמים',
    step4Text: 'עורך הדין, השמאי והבנקאי מתואמים מאותו מקום.',
    stepsCta: 'מתחילים בשיחה עם יועץ',
    toolsTitle: 'רוצים לבדוק לבד קודם?',
    toolsSubtitle: 'הכלים החינמיים של משכלנתא עושים את התכנון והבדיקה המקדימה, עוד לפני השיחה עם היועץ.',
    communityTitle: COMMUNITY_TITLE,
    communityText:
      'בפלטפורמה המלאה מנהלים את כל המשכנתא בעצמכם או עם יועץ: בונים תמהיל, משווים אישורים עקרוניים מכל הבנקים ומגיעים לחתימה עם שקיפות מלאה.',
    metaTitle: 'משרד ייעוץ משכנתאות דיגיטלי | משכלנתא',
    metaDescription:
      'כל תהליך המשכנתא במשרד אחד דיגיטלי: יועץ משכנתאות אישי, הגשה לכמה בנקים ומכרז ריביות, ועבודה מול עורך הדין, השמאי והבנקאי ישירות מהפלטפורמה. משכנתא חדשה או מיחזור.',
  },
};

/**
 * תוכן שמור → תוכן מלא: רק השדות המוכרים, רק מחרוזות, ושדה ריק או חסר חוזר
 * לברירת המחדל — כך שדף נחיתה לעולם לא מוצג עם כותרת ריקה.
 */
export function normalizeLandingContent(raw: unknown): LandingContent {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result = {} as LandingContent;
  for (const page of LANDING_PAGES) {
    const saved = source[page.id] && typeof source[page.id] === 'object' ? (source[page.id] as Record<string, unknown>) : {};
    const defaults = DEFAULT_LANDING_CONTENT[page.id];
    const content: LandingPageContent = {};
    for (const field of page.fields) {
      const value = saved[field.key];
      const text = typeof value === 'string' ? value.slice(0, MAX_FIELD_LENGTH).trim() : '';
      content[field.key] = text || defaults[field.key] || '';
    }
    result[page.id] = content;
  }
  return result;
}

/** שדה רשימה → הפריטים שלו, בלי שורות ריקות */
export function listItems(value: string | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
