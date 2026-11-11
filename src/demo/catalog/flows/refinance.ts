import type { DemoFlow } from '../../types';
import { DEMO_INPUTS } from '../../data/demo-data';

const r = DEMO_INPUTS.refinance;

/** הדגמת כלי המיחזור — מהזנת המשכנתא הקיימת ועד פאנל השליטה והחיסכון */
const flow: DemoFlow = {
  id: 'refinance',
  title: 'מיחזור משכנתא',
  description: 'האם כדאי למחזר',
  route: '/mortgage-refinance',
  exitRoute: '/',
  initialState: { totalAmount: r.totalAmount, currentRate: 5.9, refiRate: 4.3 },
  nextDemos: ['scenarios', 'affordability', 'client-dashboard'],
  steps: [
    {
      id: 'intro',
      title: 'המשכנתא הקיימת',
      caption: 'כדי לבדוק מיחזור מזינים את המשכנתא כפי שהיא היום: הבנק, סכום הקרן שנותר, והמסלולים. אפשר גם להעלות דוח יתרות לסילוק — הכלי סורק אותו.',
      target: 'refi-bank',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'bank',
      title: 'הבנק',
      caption: 'הבנק שבו המשכנתא היום. זה חשוב לחישוב עמלת הפירעון המוקדם ולהשוואת הריביות שלכם מול ממוצע השוק.',
      actions: [{ type: 'select', target: 'refi-bank', option: 'לאומי', key: 'bank' }],
      target: 'refi-bank',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'total',
      title: 'יתרת הקרן',
      caption: 'סכום הקרן שנותר בכל המסלולים יחד — מופיע בדוח היתרות לסילוק. נזין {{totalAmount|money}}.',
      actions: [{ type: 'type', target: 'refi-total', value: r.totalAmount, key: 'totalAmount' }],
      target: 'refi-total',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'add-track',
      title: 'המסלולים',
      caption: 'מוסיפים את המסלולים אחד-אחד. המסלול נפתח לעריכה: סוג, לוח סילוקין, ריבית, סכום ותאריך התשלום האחרון — ממנו נגזר כמה זמן באמת נותר.',
      actions: [{ type: 'click', target: 'refi-add-track' }],
      target: 'refi-track-0',
      spotlight: { side: 'top' },
    },
    {
      id: 'rate',
      title: 'הריבית של היום',
      caption: 'הריבית הנוכחית במסלול — נניח קבועה לא צמודה של {{currentRate}}%. אם היא גבוהה מממוצע השוק, הכלי יסמן זאת כהזדמנות.',
      actions: [
        { type: 'type', target: 'track-rate', value: 5.9, key: 'currentRate', instant: true },
        { type: 'click', target: 'track-save' },
      ],
      target: 'refi-track-0',
      spotlight: { side: 'top' },
    },
    {
      id: 'summarize',
      title: 'סיכום המצב',
      caption: 'כשכל הסכום משובץ למסלולים לוחצים "סכם משכנתא נוכחית" — ומקבלים ניתוח של ההחזר, סך הריבית שנותר לשלם והסיכון בכל מסלול.',
      actions: [{ type: 'click', target: 'refi-summarize' }],
      target: 'refi-risk-title',
      spotlight: { side: 'bottom' },
      duration: 6000,
    },
    {
      id: 'goal',
      title: 'מה המטרה?',
      caption: 'שתי מטרות אפשריות: להקטין את ההחזר החודשי (גם על חשבון הארכת תקופה), או להוזיל את הריבית ולקצר. הבחירה מכוונת את ההמלצות בכל מסלול.',
      actions: [{ type: 'scroll', target: 'refi-panel' }, { type: 'click', target: 'refi-goal-reduce_payment' }],
      target: 'refi-goal-reduce_payment',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'scope',
      title: 'כל המשכנתא או מסלול בודד',
      caption: 'ממחזרים את כל המשכנתא — או רק מסלול אחד יקר. במיחזור חלקי משאירים את המסלולים הטובים במקום.',
      target: 'refi-scope-whole',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'new-rate',
      title: 'הריבית החדשה',
      caption: 'בפאנל השליטה מזיזים את הריבית לזו שהבנק מציע היום — {{refiRate}}% — והדאשבורד שמתחת מציג מיד את ההחזר החדש, החיסכון הכולל, ועמלת הפירעון.',
      actions: [{ type: 'slider', target: 'refi-rate-0', value: 4.3, key: 'refiRate' }],
      target: 'refi-track-panel-0',
      spotlight: { side: 'top' },
      allowTryIt: true,
      tryItHint: 'שנו ריבית, תקופה או סוג מסלול, החליפו מטרה — וראו בדאשבורד מתי המיחזור משתלם ומתי לא.',
    },
    {
      id: 'results',
      title: 'דאשבורד התוצאות',
      caption: 'שורת "המצב הנוכחי" מול "אחרי המיחזור": ההחזר החודשי, סך הריבית, והחיסכון נטו אחרי העמלות. הצ׳יפ למעלה אומר אם המטרה הושגה.',
      actions: [{ type: 'scroll', target: 'refi-results' }],
      target: 'refi-results',
      spotlight: { side: 'top' },
      duration: 7000,
    },
    {
      id: 'end',
      title: 'ומה עכשיו?',
      caption: 'משתלם? שומרים את התרחיש, פותחים תהליך מיחזור עם חמשת השלבים — ומגישים לבנקים בקשה לתמחור על התמהיל החדש.',
      target: 'refi-results',
      spotlight: { side: 'top' },
      duration: 5000,
    },
  ],
};

export default flow;
