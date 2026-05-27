import {
  TrendingUp,
  Lock,
  Link2,
  RefreshCw,
  Layers,
  BarChart2,
  Globe,
  Award,
  Home,
  type LucideIcon,
} from 'lucide-react';

export interface InterestTrackCard {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  advantages: string[];
  risks: string[];
  icon: LucideIcon;
  gradient: string;
  accent: string;
  tag?: string;
}

export const interestTracks: InterestTrackCard[] = [
  {
    id: 'prime',
    title: 'פריים (Prime)',
    shortTitle: 'פריים',
    description:
      'מסלול המבוסס על ריבית בנק ישראל בתוספת מרווח קבוע של 1.5%. הריבית משתנה בכל פעם שבנק ישראל משנה את הריבית במשק.',
    advantages: [
      'גמישות מקסימלית — פטור מעמלת פירעון מוקדם (למעט עמלה תפעולית)',
      'הקרן אינה צמודה למדד — החוב אינו "מתנפח" מאינפלציה',
    ],
    risks: [
      'חשיפה גבוהה לשינויי ריבית',
      'עלייה בריבית בנק ישראל מובילה לעלייה מיידית וחדה בהחזר החודשי',
    ],
    icon: TrendingUp,
    gradient: 'from-blue-600 via-blue-700 to-indigo-800',
    accent: 'blue',
    tag: 'משתנה',
  },
  {
    id: 'kalatz',
    title: 'ריבית קבועה לא צמודה (קל"צ)',
    shortTitle: 'קל"צ',
    description:
      'הריבית והקרן נקבעות מראש ואינן משתנות לכל אורך חיי ההלוואה, ללא תלות במדד או בשינויי ריבית במשק.',
    advantages: [
      'יציבות וביטחון מלאים — ידוע בדיוק ההחזר החודשי עד הסוף',
      'תכנון כלכלי מדויק לטווח ארוך',
    ],
    risks: [
      'ריבית התחלתית לרוב גבוהה יותר ממסלולים אחרים',
      'סיכון לעמלת פירעון מוקדם משמעותית אם הריבית במשק תרד',
    ],
    icon: Lock,
    gradient: 'from-emerald-600 via-green-700 to-teal-800',
    accent: 'emerald',
    tag: 'קבוע',
  },
  {
    id: 'katz',
    title: 'ריבית קבועה צמודה (ק"צ)',
    shortTitle: 'ק"צ',
    description:
      'הריבית נשארת קבועה, אך יתרת הקרן וההחזר החודשי צמודים למדד המחירים לצרכן.',
    advantages: [
      'החזר חודשי התחלתי נמוך יחסית למסלול הלא צמוד',
      'מקל על תזרים המזומנים בשנים הראשונות',
    ],
    risks: [
      'עליית המדד גורמת לגידול ביתרת החוב ובהחזר החודשי',
      'באינפלציה — הקרן עלולה לעלות למרות תשלומים שוטפים',
    ],
    icon: Link2,
    gradient: 'from-violet-600 via-purple-700 to-fuchsia-800',
    accent: 'violet',
    tag: 'צמוד מדד',
  },
  {
    id: 'malatz',
    title: 'ריבית משתנה לא צמודה (מל"צ)',
    shortTitle: 'מל"צ',
    description:
      'הריבית קבועה לפרקי זמן ידועים מראש (לרוב כל 5 שנים) ומתעדכנת בתחנות לפי עוגן חיצוני (כמו אג"ח ממשלתי), ללא הצמדה למדד.',
    advantages: [
      'משלב הגנה מפני אינפלציה עם תחנות יציאה ללא עמלת פירעון מוקדם',
      'עמלה, אם קיימת — מחושבת רק עד התחנה הקרובה',
    ],
    risks: ['הריבית עלולה לעלות משמעותית בתחנת העדכון'],
    icon: RefreshCw,
    gradient: 'from-cyan-600 via-sky-700 to-blue-800',
    accent: 'cyan',
    tag: 'תחנות',
  },
  {
    id: 'matz',
    title: 'ריבית משתנה צמודה (מ"צ)',
    shortTitle: 'מ"צ',
    description:
      'בדומה למל"צ, הריבית משתנה בתחנות (לרוב כל 5 שנים), אך הקרן צמודה למדד המחירים לצרכן.',
    advantages: ['ריבית התחלתית נמוכה מאוד — החזר התחלתי מינימלי'],
    risks: ['חוסר יציבות כפול — משינויי המדד ומעדכון הריבית בתחנות'],
    icon: Layers,
    gradient: 'from-amber-600 via-orange-700 to-red-800',
    accent: 'amber',
    tag: 'תחנות + מדד',
  },
  {
    id: 'makam',
    title: 'מסלול מק"מ (מלווה קצר מועד)',
    shortTitle: 'מק"מ',
    description:
      'הריבית מבוססת על תשואת אג"ח ממשלתי קצר שמונפק ע"י בנק ישראל ומתעדכנת פעם בשנה בלבד.',
    advantages: [
      'אינו צמוד למדד',
      'יציבות גדולה יותר מפריים — התשלום משתנה רק אחת לשנה',
    ],
    risks: [
      'מושפע ישירות מהמדיניות המוניטרית',
      'צפוי לעלות כאשר ריבית בנק ישראל עולה',
    ],
    icon: BarChart2,
    gradient: 'from-teal-600 via-emerald-700 to-green-800',
    accent: 'teal',
    tag: 'שנתי',
  },
  {
    id: 'fx',
    title: 'מסלול מט"ח (דולר/יורו)',
    shortTitle: 'מט"ח',
    description:
      'הקרן והריבית צמודות לשער החליפין (לרוב דולר או יורו) ומתבססות על עוגנים בינלאומיים כמו SOFR או EURIBOR.',
    advantages: [
      'מתאים לבעלי הכנסה במטבע זר',
      'כלי לגידור טבעי של סיכוני שער החליפין',
    ],
    risks: [
      'חשיפה לתנודתיות גבוהה בשער המטבע',
      'שינויים חדים בשער עלולים להזניק את יתרת החוב וההחזר במונחים שקליים',
    ],
    icon: Globe,
    gradient: 'from-slate-600 via-slate-700 to-zinc-800',
    accent: 'slate',
    tag: 'מט"ח',
  },
  {
    id: 'zakaot',
    title: 'מסלול זכאות (משרד הבינוי והשיכון)',
    shortTitle: 'זכאות',
    description:
      'הלוואה מסובסדת לזכאים במסלול קבועה צמודה (ק"צ) על פי ניקוד מצטבר.',
    advantages: [
      'ריבית מועדפת (0.5% מתחת לממוצעת, תקרה 3%)',
      'פטור מלא מעמלות פירעון מוקדם והנחה בעלויות שמאות',
    ],
    risks: ['המסלול צמוד למדד — ההחזר עשוי לעלות לאורך זמן'],
    icon: Award,
    gradient: 'from-rose-600 via-pink-700 to-red-800',
    accent: 'rose',
    tag: 'מסובסד',
  },
  {
    id: 'reverse',
    title: 'משכנתא הפוכה (לבני 55+)',
    shortTitle: 'הפוכה',
    description:
      'הלוואה כנגד נכס קיים לגיל השלישי, ללא ביטוח חיים או הוכחת הכנסה.',
    advantages: [
      'אפשרות ללא החזר חודשי שוטף — הריבית נצברת לקרן',
      'נזילות כספית ללא פגיעה בהכנסה הפנויה',
    ],
    risks: [
      'ריביות גבוהות יותר ממשכנתא רגילה',
      'החוב לבנק גדל בהתמדה בשל צבירת ריבית דריבית',
    ],
    icon: Home,
    gradient: 'from-indigo-600 via-indigo-700 to-purple-800',
    accent: 'indigo',
    tag: '55+',
  },
];
