import type { DemoFlow } from '../../types';

/** הדגמת ניתוח תרחישים ותמהילים — פאנל השליטה, הגרפים וההשוואה בכלי היועצים */
const flow: DemoFlow = {
  id: 'scenarios',
  title: 'ניתוח תרחישים ותמהילים',
  description: 'פאנל השליטה של התמהיל',
  route: '/mortgage-advisor',
  exitRoute: '/',
  initialState: { track0Months: 300 },
  nextDemos: ['refinance', 'plan-stages', 'affordability'],
  steps: [
    {
      id: 'intro',
      title: 'כל התמהילים של הנכס',
      caption: 'שולחן העבודה מרכז את כל התמהילים של הנכס: זה שבעבודה למעלה, והתמהילים השמורים — שלכם ושל היועץ — מתחתיו. נתונים לדוגמה של משפחת לוי.',
      target: 'ws-mix-list',
      spotlight: { side: 'bottom' },
      duration: 6000,
    },
    {
      id: 'open-saved',
      title: 'פותחים תמהיל שמור',
      caption: '"טען תמהיל" פותח את רשימת התמהילים השמורים, ותמהיל שנבחר נכנס לאזור העבודה. התמהיל שבעבודה מוצג בראש הרשימה — כל המסלולים והפרמטרים שלו פתוחים לשינוי, והדאשבורד מתעדכן מיד.',
      actions: [
        // רשימת התמהילים השמורים נפתחת מהכפתור "טען תמהיל"; אם היא כבר פתוחה — הלחיצה מדלגת
        { type: 'click', target: 'ws-others-toggle', optional: true },
        { type: 'click', target: 'ws-saved-mix-0', optional: true },
        // חלופה כשהתמהילים השמורים שייכים לנכס אחר: בורר התמהילים השמורים
        { type: 'click', target: 'ws-load-saved', optional: true },
        { type: 'click', target: 'ws-picker-mix-0', optional: true },
      ],
      target: 'ws-active-mix',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'track-row',
      title: 'מסלול = שורה',
      caption: 'כל מסלול הוא שורה אחת: לוח סילוקין, סוג מסלול, ריבית (עוגן + מרווח), תקופה וסכום. הריבית הממוצעת וה-IRR של המסלול מוצגים לצדו.',
      actions: [{ type: 'scroll', target: 'ws-track-0' }],
      target: 'ws-track-0',
      spotlight: { side: 'bottom' },
      duration: 7000,
    },
    {
      id: 'term',
      title: 'תרחיש: מאריכים תקופה',
      caption: 'נאריך את המסלול הראשון ל-{{track0Months|months}}: ההחזר החודשי יורד, אבל סך הריבית לאורך חיי המשכנתא עולה — הדאשבורד מציג את ההפרש מול התמהיל כפי שנפתח.',
      actions: [{ type: 'slider', target: 'ws-track-0-term', value: 300, key: 'track0Months' }],
      target: 'ws-track-0-term',
      spotlight: { side: 'top' },
      allowTryIt: true,
      tryItHint: 'שנו סוג מסלול, ריבית, תקופה או סכום בכל שורה — והשוו את "לפני" ו"אחרי" בדאשבורד שמתחת.',
    },
    {
      id: 'amount',
      title: 'תרחיש: מזיזים סכומים',
      caption: 'הסכום של כל מסלול נשלט בסליידר — מה שמורידים ממסלול אחד צריך לשבץ באחר. בנק ישראל דורש לפחות שליש בריבית קבועה, והפאנל מזכיר אם חסר.',
      target: 'ws-track-0-amount',
      spotlight: { side: 'top' },
      duration: 6000,
    },
    {
      id: 'charts',
      title: 'הניתוח הגרפי',
      caption: 'מתחת לפאנל — הגרפים: ההחזר לאורך השנים, חלוקת קרן וריבית, ורגישות לעליית ריבית ומדד. לחיצה על מסלול מציגה אותו לבד.',
      actions: [{ type: 'scroll', target: 'ws-analysis' }, { type: 'click', target: 'ws-tab-charts', optional: true }],
      target: 'ws-analysis',
      spotlight: { side: 'top' },
      duration: 6000,
    },
    {
      id: 'comparison',
      title: 'השוואה בין תמהילים',
      caption: 'לשונית ההשוואה מציבה תמהילים זה מול זה: החזר, עלות כוללת, IRR וסיכון. מסמנים בווי אילו תמהילים להשוות — ומקבלים טבלה וגרפים.',
      actions: [{ type: 'click', target: 'ws-tab-comparison', optional: true }],
      target: 'ws-tab-comparison',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'prepay',
      title: 'תרחישי עתיד',
      caption: '"פרעון מוקדם" בודק מה קורה אם תפרעו סכום בעוד כמה שנים, ו"לוח החזרים" פורש את כל התשלומים. כך בוחנים תרחישים לפני שחותמים.',
      actions: [{ type: 'click', target: 'ws-tab-charts', optional: true }, { type: 'scroll', target: 'ws-prepay' }],
      target: 'ws-prepay',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'end',
      title: 'לבחור ולשמור',
      caption: 'כשמרוצים — שומרים את התמהיל, מסמנים אותו כסופי בשלב התמהיל של התהליך, ושולחים אותו לבנקים לתמחור.',
      target: 'ws-mix-list',
      spotlight: { side: 'bottom' },
      duration: 5000,
    },
  ],
};

export default flow;
