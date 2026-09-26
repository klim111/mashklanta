import type { DemoFlow } from '../../types';
import { DEMO_INPUTS } from '../../data/demo-data';

const a = DEMO_INPUTS.affordability;
const e = DEMO_INPUTS.equity;

/**
 * סרטון התדמית של דף הבית — "מה זה משכלנתא? (סרטון)".
 *
 * זו אינה הדגמה שמוצגת למבקרים: היא התסריט שממנו מוקלט הסרטון שמתחת
 * לאנימציה בדף הבית (scripts/promo-video). הקצב מהיר בכוונה — כל כלי מוזן
 * בנתונים לדוגמה ומוצג מלא, בלי לעצור על פרטים. הכתוביות כאן הן הכתוביות
 * של הסרטון, והן קצרות כדי שייקראו בקצב של סרטון שיווקי.
 */
const flow: DemoFlow = {
  id: 'promo',
  title: 'מה זה משכלנתא? (סרטון)',
  description: 'סרטון התדמית של דף הבית',
  route: '/',
  exitRoute: '/',
  initialState: { ownCapital: a.ownCapital, monthlyIncome: a.monthlyIncome, age: a.age, propertyPrice: e.propertyPrice },
  steps: [
    // ─── דף הבית: גלילה זריזה עד נתוני השוק ───
    {
      id: 'home',
      title: 'משכלנתא',
      caption: 'משכלנתא: כל המשכנתא שלכם, בפלטפורמה אחת',
      duration: 1600,
    },
    {
      id: 'home-scroll',
      caption: 'כלים חינמיים, מסלולי ליווי ותמחור שקוף',
      actions: [
        { type: 'scroll', target: 'home-free-tools' },
        { type: 'wait', ms: 700 },
        { type: 'scroll', target: 'home-start' },
        { type: 'wait', ms: 600 },
        { type: 'scroll', target: 'home-pricing' },
        { type: 'wait', ms: 600 },
      ],
      duration: 200,
    },
    {
      id: 'home-market',
      caption: 'ריביות ונתוני שוק המשכנתאות, ישירות מבנק ישראל',
      actions: [{ type: 'scroll', target: 'home-market', block: 'start' }],
      duration: 2600,
    },

    // ─── כלי ההיתכנות ───
    {
      id: 'affordability',
      caption: 'כמה משכנתא אפשר לקבל? תשובה בדקה, לפי כללי בנק ישראל',
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
      duration: 1800,
    },
    {
      id: 'affordability-slider',
      caption: 'מזיזים תקופה והחזר, והתוצאה מתעדכנת מיד',
      actions: [{ type: 'slider', target: 'mp-term-slider', value: 25 * 12, key: 'termMonths' }],
      target: 'mp-results',
      duration: 1600,
    },

    // ─── תכנון הון עצמי ───
    {
      id: 'equity',
      caption: 'תכנון הון עצמי: כל הוצאה עד קבלת המפתח',
      route: '/equity-planning',
      actions: [
        { type: 'type', target: 'eq-price', value: e.propertyPrice, key: 'propertyPrice' },
        { type: 'click', target: 'eq-profile-first-home' },
        { type: 'click', target: 'eq-target-next' },
        { type: 'click', target: 'eq-target-day-15' },
        { type: 'click', target: 'eq-continue-expenses' },
      ],
      target: 'eq-expenses-table',
      duration: 1800,
    },
    {
      id: 'equity-timeline',
      caption: 'כל תשלום על לוח שנה, לפי תאריך',
      actions: [{ type: 'scroll', target: 'eq-timeline' }],
      target: 'eq-timeline',
      duration: 1500,
    },
    {
      id: 'equity-pie',
      caption: 'והמערכת מחלקת את ההון לפי קטגוריות',
      actions: [{ type: 'scroll', target: 'eq-pie-chart' }],
      target: 'eq-pie-chart',
      duration: 1600,
    },
    {
      id: 'equity-cashflow',
      caption: 'תזרים חודשי: כמה כסף צריך, ומתי',
      actions: [{ type: 'click', target: 'eq-continue-summary' }],
      target: 'eq-cashflow',
      duration: 1800,
    },

    // ─── בדיקת מיחזור: מוקלטת בנפרד כאורח (scripts/promo-video), כי בהדגמה המשתמש מחובר
    //     ומקבל את הכלי המלא. ההקלטה משתלבת כאן, לפני ההלוואות הצרכניות ───

    // ─── הלוואות צרכניות ───
    {
      id: 'loans',
      caption: 'הלוואות צרכניות: מה הן עושות להחזר ולמשכנתא',
      route: '/consumer-loans',
      actions: [
        { type: 'click', target: 'loans-add-first' },
        { type: 'type', target: 'loan-0-name', value: 'הלוואת רכב' },
        { type: 'type', target: 'loan-0-principal', value: 85_000 },
        { type: 'click', target: 'loans-add' },
        { type: 'type', target: 'loan-1-name', value: 'כרטיס אשראי' },
        { type: 'type', target: 'loan-1-principal', value: 24_000 },
        { type: 'slider', target: 'loan-1-apr', value: 16 },
        { type: 'click', target: 'loans-add' },
        { type: 'type', target: 'loan-2-name', value: 'הלוואה מהבנק' },
        { type: 'type', target: 'loan-2-principal', value: 60_000 },
      ],
      target: 'loans-dashboard',
      duration: 1800,
    },

    // ─── לרשומים: האזור האישי ───
    {
      id: 'dashboard',
      caption: 'נרשמתם? מכאן מנהלים את כל המשכנתא',
      route: '/demo/dashboard',
      target: 'dash-main',
      duration: 2200,
    },
    {
      id: 'dashboard-agenda',
      caption: 'משימות, לוח שנה ופגישות עם היועץ, במקום אחד',
      actions: [{ type: 'scroll', target: 'dash-calendar-card' }],
      target: 'dash-calendar-card',
      duration: 1600,
    },

    // ─── תהליך משכנתא חדשה ───
    {
      id: 'plan',
      caption: 'משכנתא חדשה: חמישה שלבים ברורים, מהפרופיל ועד החתימה',
      route: '/demo/plan',
      target: 'plan-stage-rail',
      duration: 1600,
    },
    {
      id: 'plan-analysis',
      caption: 'פרופיל פיננסי',
      actions: [
        { type: 'click', target: 'plan-stage-ANALYSIS' },
        { type: 'waitFor', target: 'plan-stage-intro-start', timeout: 5000, optional: true },
        { type: 'click', target: 'plan-stage-intro-start', optional: true },
      ],
      target: 'plan-stage-content',
      duration: 1100,
    },
    {
      id: 'plan-mix',
      caption: 'בניית תמהיל והשוואת חלופות',
      actions: [{ type: 'click', target: 'plan-stage-MIX' }],
      target: 'plan-stage-content',
      duration: 1300,
    },
    {
      id: 'plan-applications',
      caption: 'אישורים עקרוניים מכמה בנקים',
      actions: [
        { type: 'click', target: 'plan-stage-APPLICATIONS' },
        { type: 'waitFor', target: 'plan-stage-intro-start', timeout: 5000, optional: true },
        { type: 'click', target: 'plan-stage-intro-start', optional: true },
      ],
      target: 'plan-stage-content',
      duration: 1200,
    },
    {
      id: 'plan-auction',
      caption: 'מכרז ריביות בין הבנקים',
      actions: [
        { type: 'click', target: 'plan-stage-AUCTION' },
        { type: 'waitFor', target: 'plan-stage-intro-start', timeout: 5000, optional: true },
        { type: 'click', target: 'plan-stage-intro-start', optional: true },
      ],
      target: 'plan-stage-content',
      duration: 1300,
    },
    {
      id: 'plan-signing',
      caption: 'ועד החתימה בבנק',
      actions: [
        { type: 'click', target: 'plan-stage-SIGNING' },
        { type: 'waitFor', target: 'plan-stage-intro-start', timeout: 5000, optional: true },
        { type: 'click', target: 'plan-stage-intro-start', optional: true },
      ],
      target: 'plan-stage-content',
      duration: 1100,
    },

    // ─── תהליך מיחזור ───
    {
      id: 'refi-plan',
      caption: 'מיחזור משכנתא: אותו ליווי, מהתמהיל החדש ועד הבנק',
      route: '/demo/plan?plan=demo-refi',
      actions: [{ type: 'click', target: 'plan-stage-MIX', optional: true }],
      target: 'plan-stage-rail',
      duration: 2000,
    },

    // ─── תיק המסמכים, צ׳אט ומיילים ───
    {
      id: 'vault',
      caption: 'תיק מסמכים: כל האישורים וההגשות לבנקים, שמורים ומנותחים',
      route: '/demo/dashboard',
      actions: [{ type: 'click', target: 'vault-button' }],
      target: 'vault-dialog',
      duration: 2000,
    },
    {
      id: 'chat',
      caption: 'צ׳אט עם היועץ, מכל מסך',
      actions: [
        { type: 'key', key: 'Escape' },
        { type: 'click', target: 'dash-chat' },
      ],
      duration: 1800,
    },
    {
      id: 'emails',
      caption: 'והמיילים עם הבנקים, בתוך הפלטפורמה',
      actions: [{ type: 'click', target: 'conv-tab-emails' }],
      duration: 2000,
    },
    {
      id: 'end',
      caption: 'כל ההתכתבויות עם היועץ, הבנקים וכל המעורבים, וכל המסמכים וההגשות לבנקים, מנוהלים מהפלטפורמה',
      duration: 3200,
    },
  ],
};

export default flow;
