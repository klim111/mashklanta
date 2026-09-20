import type { DemoFlow } from '../../types';
import { DEMO_INPUTS } from '../../data/demo-data';
import { money, num } from './helpers';

const e = DEMO_INPUTS.equity;

/** הדגמת כלי תכנון ההון העצמי — מהמחיר ועד תזרים התשלומים */
const flow: DemoFlow = {
  id: 'equity',
  title: 'תכנון הון עצמי',
  description: 'ההוצאות הנלוות והתזרים עד המפתח',
  route: '/equity-planning',
  exitRoute: '/',
  initialState: { propertyPrice: e.propertyPrice },
  nextDemos: ['affordability', 'plan-stages', 'documents'],
  steps: [
    {
      id: 'intro',
      title: 'שלושה שלבים',
      caption: 'הכלי עובד בשלושה שלבים: הגדרות בסיס (נכס ומימון), ההוצאות לפי קטגוריות, וסיכום עם תזרים. נתחיל בבסיס.',
      target: 'eq-stepper',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'price',
      title: 'מחיר הנכס',
      caption: 'מחיר הנכס הוא הבסיס לכל החישובים — ממנו נגזרים ההון העצמי המינימלי, מס הרכישה ושכר הטרחה. נזין {{propertyPrice|money}}.',
      actions: [{ type: 'type', target: 'eq-price', value: e.propertyPrice, key: 'propertyPrice' }],
      target: 'eq-price',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'profile',
      title: 'פרופיל מימון',
      caption: 'פרופיל המימון קובע כמה הון עצמי חייבים להביא לפי בנק ישראל: דירה ראשונה 25%, חליפית 30%, להשקעה 50%.',
      actions: [{ type: 'click', target: 'eq-profile-first-home' }],
      target: 'eq-profile-first-home',
      spotlight: { side: 'top' },
    },
    {
      id: 'min-equity',
      title: 'הון עצמי מינימלי',
      caption: (state) => `הכרטיס מציג מיד את המינימום: 25% מ-${money(state.values.propertyPrice)} = ${money(num(state, 'propertyPrice') * 0.25)}. זה רק החלק של המקדמה — ההוצאות הנלוות מגיעות בשלב הבא.`,
      target: 'eq-min-equity',
      spotlight: { side: 'left' },
    },
    {
      id: 'calendar',
      title: 'תאריך היעד',
      caption: 'תאריך היעד לרכישה מפזר את התשלומים על ציר זמן: מה משלמים בחתימה, מה לפני המסירה ומה אחרי המפתח. נבחר תאריך בחודש הבא.',
      actions: [
        { type: 'click', target: 'eq-calendar-next' },
        { type: 'click', target: 'eq-calendar-day-15' },
      ],
      target: 'eq-calendar',
      spotlight: { side: 'left' },
    },
    {
      id: 'continue-expenses',
      title: 'לשלב ההוצאות',
      caption: 'ממשיכים להוצאות. הכלי ממלא מראש את כל הסעיפים המקובלים — מס רכישה, עו״ד, מתווך, שמאי, שיפוץ, הובלה — לפי מחיר הנכס.',
      actions: [{ type: 'click', target: 'eq-continue-expenses' }],
      target: 'eq-expenses-table',
      spotlight: { side: 'top' },
      duration: 5500,
    },
    {
      id: 'table',
      title: 'טבלת ההוצאות',
      caption:
        'כל קטגוריה נפתחת לסעיפים. ליד כל סעיף: הסכום (אחוז ממחיר הנכס, טווח או סכום קבוע), תאריך התשלום והסטטוס — שולם, מתוכנן או ממתין. לוחצים על סכום כדי לערוך אותו במקום.',
      target: 'eq-expenses-table',
      spotlight: { side: 'top' },
      duration: 7000,
    },
    {
      id: 'pie',
      title: 'חלוקת ההון',
      caption: 'העוגה מראה את המשקל של כל קטגוריה בסך ההון העצמי הנדרש — כמה מזה מקדמה, וכמה "כסף שלא רואים" כמו מסים ושכר טרחה.',
      actions: [{ type: 'scroll', target: 'eq-pie-chart' }],
      target: 'eq-pie-chart',
      spotlight: { side: 'left' },
      allowTryIt: true,
      tryItHint: 'פתחו קטגוריה, שנו סכום או סטטוס, הוסיפו סעיף — הסיכום והעוגה מתעדכנים מיד.',
    },
    {
      id: 'continue-summary',
      title: 'לסיכום',
      caption: 'עוברים לסיכום ולתזרים — כאן רואים את התמונה השלמה.',
      actions: [{ type: 'click', target: 'eq-continue-summary' }],
      target: 'eq-summary-cards',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'summary-expenses',
      title: 'סה״כ הוצאות נלוות',
      caption: 'הכרטיס הראשון: כל ההוצאות מעבר למקדמה, ואיזה אחוז הן ממחיר הנכס. הנקודות הצבעוניות מפרידות בין מה ששולם, מתוכנן וממתין.',
      target: 'eq-summary-expenses',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'summary-total',
      title: 'סה״כ הון עצמי נדרש',
      caption: 'המספר החשוב ביותר: המקדמה המינימלית ועוד כל ההוצאות הנלוות — זה הסכום שצריך להביא מהבית עד המפתח.',
      target: 'eq-summary-total',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'summary-cashflow',
      title: 'תזרים חודשי',
      caption: 'על פני כמה חודשים התשלומים נפרשים, ומה החודש העמוס ביותר — כדי לדעת מתי צריך שהכסף יהיה נזיל.',
      target: 'eq-summary-cashflow',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'breakdown',
      title: 'פירוט לפי קטגוריות',
      caption: 'הפירוט מראה כמה כל קטגוריה שוקלת, ומה כבר סגור. שימושי כשבודקים איפה אפשר לחסוך — למשל במתווך או בשיפוץ.',
      actions: [{ type: 'scroll', target: 'eq-category-breakdown' }],
      target: 'eq-category-breakdown',
      spotlight: { side: 'top' },
    },
    {
      id: 'timeline',
      title: 'ציר זמן התשלומים',
      caption: 'ציר הזמן מסדר את התשלומים לפי חודש: מה יוצא בחתימת החוזה, מה בתשלומי הביניים ומה ביום המסירה.',
      actions: [{ type: 'scroll', target: 'eq-timeline' }],
      target: 'eq-timeline',
      spotlight: { side: 'top' },
    },
    {
      id: 'export',
      title: 'ייצוא ושיתוף',
      caption: 'את התוכנית אפשר לייצא ל-PDF או ל-CSV — לשתף עם בן/בת הזוג, עם ההורים שעוזרים, או עם היועץ.',
      actions: [{ type: 'scroll', target: 'eq-export-pdf' }],
      target: 'eq-export-pdf',
      spotlight: { side: 'top' },
    },
    {
      id: 'next',
      title: 'הצעד הבא',
      caption: 'עכשיו, כשיודעים כמה כסף צריך להביא, בודקים בכלי ההיתכנות איזו משכנתא משלימה את המחיר — ופותחים תהליך עם חמשת השלבים.',
      target: 'eq-summary-cards',
      spotlight: { side: 'bottom' },
      duration: 5000,
    },
  ],
};

export default flow;
