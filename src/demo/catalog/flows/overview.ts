import type { DemoFlow } from '../../types';
import { DEMO_INPUTS } from '../../data/demo-data';

const a = DEMO_INPUTS.affordability;

/**
 * "מה זה משכלנתא?" — הסיור הקצר מדף הבית.
 * מציג את הפלטפורמה, היכולות המרכזיות ואיך עוברים בתהליך — בלי להעמיק בכל כלי.
 */
const flow: DemoFlow = {
  id: 'overview',
  title: 'מה זה משכלנתא?',
  description: 'סיור קצר בפלטפורמה',
  route: '/',
  exitRoute: '/',
  initialState: { ownCapital: a.ownCapital, monthlyIncome: a.monthlyIncome, age: a.age },
  nextDemos: ['affordability', 'equity', 'plan-stages', 'client-dashboard'],
  steps: [
    {
      id: 'welcome',
      title: 'ברוכים הבאים',
      caption:
        'משכלנתא מלווה אתכם מהשאלה "כמה אפשר להרשות לעצמנו?" ועד החתימה בבנק. בשלוש הדקות הקרובות נעבור יחד על הכלים המרכזיים — הכול על נתונים לדוגמה.',
      target: 'home-hero-title',
      spotlight: { side: 'bottom' },
      duration: 6500,
    },
    {
      id: 'nav',
      title: 'הכול פתוח',
      caption: 'בסרגל העליון: תכנון הון עצמי, הלוואות צרכניות, כלי היועצים ומרכז הלמידה — כלים שעובדים גם בלי הרשמה.',
      target: 'nav-links',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'free-tools',
      title: 'הכלים החינמיים',
      caption:
        'מתחילים בתמונת המצב: מה אפשר להרשות לעצמנו, האם כדאי למחזר, כמה הון עצמי באמת צריך להביא, ואיך ההלוואות הקיימות משפיעות על המשכנתא.',
      actions: [{ type: 'scroll', target: 'home-free-tools' }],
      target: 'home-free-tools',
      spotlight: { side: 'top' },
    },
    {
      id: 'start',
      title: 'מה תרצו לעשות?',
      caption: 'כשמבינים את המצב בוחרים מטרה — משכנתא חדשה, מיחזור או ייעוץ — וכמה ליווי רוצים בדרך: לבד, ליווי משולב או ליווי מלא.',
      actions: [{ type: 'scroll', target: 'home-start' }],
      target: 'home-start',
      spotlight: { side: 'top' },
    },
    {
      id: 'pricing',
      title: 'תמחור שקוף',
      caption: 'משלמים רק על מה שלקחתם: גישה חודשית לפלטפורמה, ליווי לפי שלב, או ליווי מלא — ותמיד המחיר הנמוך.',
      actions: [{ type: 'scroll', target: 'home-pricing' }],
      target: 'home-pricing',
      spotlight: { side: 'top' },
    },
    {
      id: 'affordability',
      title: 'כלי ההיתכנות',
      caption:
        'ככה נראה כלי בפעולה: בוחרים סוג נכס ולווה, מזינים הון עצמי של {{ownCapital|money}}, הכנסה של {{monthlyIncome|money}} וגיל — והכלי מחשב את שווי הנכס המקסימלי לפי כללי בנק ישראל.',
      route: '/mortgage-planning?flow=affordability',
      actions: [
        { type: 'click', target: 'mp-property-0' },
        { type: 'click', target: 'mp-borrower-individual' },
        { type: 'type', target: 'mp-own-capital', value: a.ownCapital, key: 'ownCapital' },
        { type: 'type', target: 'mp-age', value: a.age, key: 'age' },
        { type: 'type', target: 'mp-income', value: a.monthlyIncome, key: 'monthlyIncome' },
        { type: 'click', target: 'mp-loans-no' },
        { type: 'click', target: 'mp-submit' },
      ],
      target: 'mp-max-property',
      spotlight: { side: 'bottom' },
      allowTryIt: true,
      tryItHint: 'שנו את ההון העצמי, ההכנסה או התקופה בסליידרים — התוצאות מתעדכנות מיד.',
    },
    {
      id: 'sliders',
      title: 'משחקים עם המספרים',
      caption: 'כל סליידר משנה את התמונה: תקופה, החזר חודשי ואחוז מימון — והתוצאות מחושבות מחדש באותו רגע.',
      actions: [{ type: 'slider', target: 'mp-term-slider', value: a.years * 12, key: 'termMonths' }],
      target: 'mp-term-card',
      spotlight: { side: 'top' },
    },
    {
      id: 'plan',
      title: 'חמשת השלבים',
      caption:
        'נרשמתם? כל משכנתא הופכת לתהליך של חמישה שלבים: ניתוח, תמהיל, אישור עקרוני, מכרז בנקים וחתימה — עם המסמכים והמשימות של כל שלב.',
      route: '/demo/plan',
      target: 'plan-stage-rail',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'plan-mix',
      title: 'שלב התמהיל',
      caption: 'בשלב התמהיל בונים את המסלולים, משווים חלופות ובוחרים את התמהיל הסופי שיישלח לבנקים לתמחור.',
      actions: [{ type: 'click', target: 'plan-stage-MIX' }],
      target: 'plan-stage-title',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'dashboard',
      title: 'האזור האישי',
      caption: 'האזור האישי מרכז הכול: המשכנתאות בתהליך, המשימות, לוח השנה, הפגישות עם היועץ, התמהילים השמורים ותיק המסמכים.',
      route: '/demo/dashboard',
      target: 'dash-main',
      spotlight: { side: 'over' },
    },
    {
      id: 'agenda',
      title: 'לא מפספסים כלום',
      caption: 'לוח השנה והמשימות מזכירים מה צריך להביא, עד מתי, ולמי — ומראים את הפגישות הבאות עם היועץ.',
      actions: [{ type: 'scroll', target: 'dash-calendar-card' }],
      target: 'dash-calendar-card',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'end',
      title: 'זה משכלנתא בקצרה',
      caption: 'רוצים לראות כלי לעומק? בחרו אחת מהדגמות הכלים — או פתחו את הכלים בעצמכם, בחינם.',
      target: 'dash-quick-actions',
      spotlight: { side: 'top' },
      duration: 5000,
    },
  ],
};

export default flow;
