import type { DemoFlow, DemoState } from '../../types';
import { DEMO_INPUTS } from '../../data/demo-data';
import { money, num } from './helpers';

const a = DEMO_INPUTS.affordability;

/** הדגמת כלי "מה אני יכול להרשות לעצמי" — מהשדה הראשון ועד פירוש התוצאות */
const flow: DemoFlow = {
  id: 'affordability',
  title: 'מה אני יכול להרשות לעצמי',
  description: 'כלי ההיתכנות',
  route: '/mortgage-planning?flow=affordability',
  exitRoute: '/',
  initialState: { ownCapital: a.ownCapital, monthlyIncome: a.monthlyIncome, age: a.age, termMonths: a.years * 12, ltv: 70 },
  nextDemos: ['equity', 'plan-stages', 'scenarios'],
  steps: [
    {
      id: 'intro',
      title: 'סוג הנכס',
      caption:
        'הכלי מתחיל בסוג העסקה, כי הוא קובע את אחוז המימון המקסימלי לפי בנק ישראל: דירה ראשונה עד 75%, דירה חליפית עד 70%, דירה להשקעה עד 50%.',
      target: 'mp-property-0',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'property',
      title: 'דירה ראשונה',
      caption: 'נבחר "דירה ראשונה" — התרחיש הנפוץ, עם אחוז המימון הגבוה ביותר.',
      actions: [{ type: 'click', target: 'mp-property-0' }],
      target: 'mp-borrower-individual',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'borrower',
      title: 'יחיד או זוג',
      caption: 'לזוג הבנקים לרוב נותנים ריביות טובות יותר, וההכנסות מצטרפות. כאן נמשיך כלווה יחיד כדי שיהיה פשוט.',
      actions: [{ type: 'click', target: 'mp-borrower-individual' }],
      target: 'mp-own-capital',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'capital',
      title: 'הון עצמי',
      caption:
        'ההון העצמי הוא הכסף הפנוי לעסקה — חסכונות, עזרה מהמשפחה, מכירת נכס. הוא קובע את תקרת המחיר יחד עם אחוז המימון. נזין {{ownCapital|money}}.',
      actions: [{ type: 'type', target: 'mp-own-capital', value: a.ownCapital, key: 'ownCapital' }],
      target: 'mp-own-capital',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'age',
      title: 'גיל',
      caption: 'הגיל קובע את התקופה המקסימלית: הבנק מאשר משכנתא עד גיל 80 בערך, ולכן לווה בן {{age}} יכול לפרוש עד 30 שנה.',
      actions: [{ type: 'type', target: 'mp-age', value: a.age, key: 'age' }],
      target: 'mp-age',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'income',
      title: 'הכנסה חודשית',
      caption: 'ההכנסה נטו קובעת את ההחזר החודשי המקסימלי: בנק ישראל מגביל ל-40% מההכנסה הפנויה. הכנסה של {{monthlyIncome|money}} מאפשרת החזר של עד ' + '{{maxPayment|money}}.',
      actions: [
        { type: 'type', target: 'mp-income', value: a.monthlyIncome, key: 'monthlyIncome' },
        { type: 'setState', key: 'maxPayment', value: (state: DemoState) => Math.round(num(state, 'monthlyIncome') * 0.4) },
      ],
      target: 'mp-income',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'loans',
      title: 'הלוואות קיימות',
      caption: 'הלוואות עם יותר מ-18 חודשים לפירעון מקטינות את ההכנסה הפנויה — ולכן את ההחזר שהבנק יאשר. בהדגמה אין הלוואות.',
      actions: [{ type: 'click', target: 'mp-loans-no' }],
      target: 'mp-loans-no',
      spotlight: { side: 'top' },
    },
    {
      id: 'submit',
      title: 'חישוב',
      caption: 'לוחצים "הצג אפשרויות משכנתא" — הכלי מחשב את המשכנתא המקסימלית משני הכיוונים: לפי ההחזר ולפי אחוז המימון, ולוקח את הנמוך.',
      actions: [{ type: 'click', target: 'mp-submit' }],
      target: 'mp-max-property',
      spotlight: { side: 'bottom' },
      duration: 4500,
    },
    {
      id: 'max-property',
      title: 'שווי הנכס המקסימלי',
      caption: (state) =>
        `זו התוצאה המרכזית: המחיר הגבוה ביותר שאפשר לכוון אליו עם הון עצמי של ${money(state.values.ownCapital)} והכנסה של ${money(state.values.monthlyIncome)}. מתחתיו — אחוז המימון שנבחר, ואפשר להוריד אותו כדי לקחת פחות משכנתא.`,
      target: 'mp-max-property',
      spotlight: { side: 'bottom' },
      duration: 7000,
    },
    {
      id: 'ltv',
      title: 'אחוז מימון',
      caption: 'הסליידר מוריד את אחוז המימון ל-{{ltv|pct}}: הנכס שאפשר לקנות קטן, אבל גם המשכנתא וההחזר. נוח למי שרוצה מרווח ביטחון.',
      actions: [{ type: 'slider', target: 'mp-ltv-slider', value: 70, key: 'ltv' }],
      target: 'mp-ltv-slider',
      spotlight: { side: 'top' },
    },
    {
      id: 'loan-slider',
      title: 'סכום המשכנתא',
      caption: 'הכרטיס השני מציג את המשכנתא עצמה: סכום, סך התשלומים ומתוכם הריבית. גם כאן אפשר להקטין את הסכום בסליידר.',
      actions: [{ type: 'scroll', target: 'mp-loan-slider' }],
      target: 'mp-loan-slider',
      spotlight: { side: 'top' },
    },
    {
      id: 'payment-slider',
      title: 'החזר חודשי',
      caption: 'הכרטיס השלישי — ההחזר החודשי. הקו האדום הוא 40% מההכנסה הפנויה; מעבר לו הבנק לא יאשר.',
      actions: [{ type: 'scroll', target: 'mp-payment-slider' }],
      target: 'mp-payment-slider',
      spotlight: { side: 'top' },
    },
    {
      id: 'term',
      title: 'תקופת המשכנתא',
      caption: 'התקופה משפיעה הכי הרבה על ההחזר: נאריך ל-{{termMonths|months}} — ההחזר יורד, אבל סך הריבית לאורך השנים עולה. התקופה המקסימלית נגזרת מהגיל.',
      actions: [{ type: 'slider', target: 'mp-term-slider', value: a.years * 12, key: 'termMonths' }],
      target: 'mp-term-card',
      spotlight: { side: 'top' },
      allowTryIt: true,
      tryItHint: 'גררו את הסליידרים של אחוז המימון, הסכום, ההחזר והתקופה — וראו איך המספרים בכרטיסים מגיבים.',
    },
    {
      id: 'results',
      title: 'קוראים את התוצאות',
      caption: (state) =>
        `עם התקופה של ${Math.round(num(state, 'termMonths') / 12)} שנים ואחוז מימון של ${Math.round(num(state, 'ltv') * 10) / 10}% הכלי מציג את המבנה השלם: מחיר נכס, משכנתא, החזר וסך ריבית — הכול לפי הערכים שבחרתם.`,
      actions: [{ type: 'scroll', target: 'mp-results' }],
      target: 'mp-results',
      spotlight: { side: 'over' },
      duration: 6500,
    },
    {
      id: 'next',
      title: 'ומה הלאה?',
      caption: 'מכאן ממשיכים לתכנון ההון העצמי (כמה כסף באמת צריך להביא) או פותחים תהליך מלא עם חמשת השלבים ובניית התמהיל.',
      target: 'mp-results',
      spotlight: { side: 'over' },
      duration: 5000,
    },
  ],
};

export default flow;
