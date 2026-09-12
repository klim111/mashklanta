import {
  BookOpen,
  PieChart,
  Route,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

export interface LearnCard {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  highlights?: string[];
  gradient: string;
  icon: LucideIcon;
}

export interface LearnTopic {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  cards: LearnCard[];
}

export const learnTopics: LearnTopic[] = [
  {
    id: 'intro',
    title: 'מהי משכנתא?',
    subtitle: 'יסודות ההלוואה לרכישת דירה',
    icon: BookOpen,
    gradient: 'from-blue-500 to-indigo-600',
    cards: [
      {
        id: 'intro-1',
        title: 'הלוואה ארוכת טווח',
        subtitle: 'הבסיס',
        body: 'משכנתא היא הלוואה לטווח ארוך (עד 30 שנה) לרכישת נכס, כאשר הנכס משמש בטוחה. ההחזר החודשי מורכב מקרן וריבית.',
        highlights: ['עד 30 שנה', 'הנכס כבטוחה', 'קרן + ריבית'],
        gradient: 'from-blue-600 to-indigo-700',
        icon: BookOpen,
      },
      {
        id: 'intro-2',
        title: 'יחס מימון (LTV)',
        subtitle: 'כמה הבנק מממן',
        body: 'הבנק מממן עד אחוז מסוים מערך הנכס. ככל שההון העצמי גבוה יותר — התנאים עשויים להיות טובים יותר.',
        highlights: ['עד ~75% מימון', 'הון עצמי מפחית סיכון', 'משפיע על ריבית'],
        gradient: 'from-indigo-600 to-violet-700',
        icon: BookOpen,
      },
      {
        id: 'intro-3',
        title: 'לוח סילוקין',
        subtitle: 'איך משלמים',
        body: 'שפיצר — תשלום קבוע; קרן שווה — ירידה בתשלום; בלון — תשלום נמוך וקרן גדולה בסוף. הבחירה משפיעה על תזרים המזומנים.',
        highlights: ['שפיצר — הכי נפוץ', 'קרן שווה — ירידה חודשית', 'בלון — לתזרים מיוחד'],
        gradient: 'from-violet-600 to-purple-700',
        icon: BookOpen,
      },
    ],
  },
  {
    id: 'mix',
    title: 'מהו תמהיל משכנתא?',
    subtitle: 'חלוקה חכמה בין מסלולים',
    icon: PieChart,
    gradient: 'from-emerald-500 to-teal-600',
    cards: [
      {
        id: 'mix-1',
        title: 'פיזור סיכונים',
        subtitle: 'לא להניח הכל על כרטיס אחד',
        body: 'תמהיל טוב מפזר את ההלוואה בין מסלולים שונים — קבועים, משתנים, צמודים ולא צמודים — כדי לאזן בין יציבות לחיסכון.',
        highlights: ['הפחתת תלות בריבית אחת', 'הגנה מאינפלציה', 'גמישות לשינויי שוק'],
        gradient: 'from-emerald-600 to-green-700',
        icon: PieChart,
      },
      {
        id: 'mix-2',
        title: 'התאמה אישית',
        subtitle: 'לפי פרופיל',
        body: 'גיל, הכנסה, יציבות תעסוקתית, סבילות לסיכון ותכניות עתידיות קובעים את אחוזי החלוקה בין המסלולים.',
        highlights: ['משפחה צעירה ≠ מתקרבים לפרישה', 'הכנסה במט"ח — שיקול מיוחד', 'תזרים חודשי'],
        gradient: 'from-teal-600 to-cyan-700',
        icon: PieChart,
      },
      {
        id: 'mix-3',
        title: 'אופטימיזציה',
        subtitle: 'חיסכון לאורך זמן',
        body: 'המטרה: מזער עלות כוללת (ריבית + עמלות) תוך שמירה על החזר חודשי סביר. כלים דיגיטליים מאפשרים לבדוק אלפי שילובים.',
        highlights: ['סימולציות', 'ניתוח רגישות', 'השוואת בנקים'],
        gradient: 'from-cyan-600 to-blue-700',
        icon: PieChart,
      },
    ],
  },
  {
    id: 'journey',
    title: 'מסע לקיחת משכנתא',
    subtitle: 'מהחלום למפתח',
    icon: Route,
    gradient: 'from-orange-500 to-amber-600',
    cards: [
      {
        id: 'journey-1',
        title: 'הכנה ותכנון',
        subtitle: 'שלב 1',
        body: 'בדיקת יכולת החזר, איסוף מסמכים, הערכת שווי נכס והבנת מסלולי הריבית — לפני פנייה לבנק.',
        highlights: ['תקציב ריאלי', 'אישור עקרוני', 'יועץ משכנתא'],
        gradient: 'from-orange-600 to-amber-700',
        icon: Route,
      },
      {
        id: 'journey-2',
        title: 'השוואה ומשא ומתן',
        subtitle: 'שלב 2',
        body: 'קבלת הצעות ממספר בנקים, בניית תמהיל, השוואת ריבית אפקטיבית ועמלות — ומשא ומתן על התנאים.',
        highlights: ['לפחות 3–4 בנקים', 'תמהיל מותאם', 'עמלות נסתרות'],
        gradient: 'from-amber-600 to-yellow-700',
        icon: Route,
      },
      {
        id: 'journey-3',
        title: 'חתימה וניהול',
        subtitle: 'שלב 3',
        body: 'חתימה על הסכם, רישום משכנתא, קבלת מפתח — ולאחר מכן מעקב: מיחזור, פירעון מוקדם ועדכון תמהיל לפי השוק.',
        highlights: ['ביטוחים', 'רישום בטאבו', 'מעקב שוטף'],
        gradient: 'from-yellow-600 to-orange-700',
        icon: Route,
      },
    ],
  },
  {
    id: 'tips',
    title: 'טיפים ללמידה חכמה',
    subtitle: 'כלים לקבלת החלטות',
    icon: Lightbulb,
    gradient: 'from-purple-500 to-fuchsia-600',
    cards: [
      {
        id: 'tips-1',
        title: 'הבינו את המסלול',
        subtitle: 'לפני החתימה',
        body: 'כל מסלול מתנהג אחרת בשינויי ריבית, אינפלציה או שער מט"ח. קראו את תנאי העוגן, תדירות העדכון ועמלת הפירעון.',
        highlights: ['שאלו על עוגן', 'בדקו תחנות', 'עמלות'],
        gradient: 'from-purple-600 to-fuchsia-700',
        icon: Lightbulb,
      },
      {
        id: 'tips-2',
        title: 'סימולציות',
        subtitle: 'בדקו תרחישים',
        body: 'הריצו תרחישי עליית ריבית, אינפלציה גבוהה וירידת שער — כדי לדעת מה קורה להחזר בעוד 5 ו-10 שנים.',
        highlights: ['הלם ריבית', 'אינפלציה', 'מט"ח'],
        gradient: 'from-fuchsia-600 to-pink-700',
        icon: Lightbulb,
      },
      {
        id: 'tips-3',
        title: 'ליווי מקצועי',
        subtitle: 'לא לבד',
        body: 'שילוב של כלים דיגיטליים ויועץ מנוסה עוזר לתרגם נתונים להחלטה — במיוחד בתמהילים מורכבים.',
        highlights: ['AI + אדם', 'הסברים פשוטים', 'מעקב לאורך זמן'],
        gradient: 'from-pink-600 to-rose-700',
        icon: Lightbulb,
      },
    ],
  },
];
