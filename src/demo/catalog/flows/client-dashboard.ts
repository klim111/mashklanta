import type { DemoFlow } from '../../types';
import { DEMO_INPUTS } from '../../data/demo-data';
import { localDateTime } from './helpers';

const d = DEMO_INPUTS.dashboard;

/** הדגמת הדאשבורד של לקוח רשום: משימות, לוח שנה, פגישות, הוצאות והגדרות */
const flow: DemoFlow = {
  id: 'client-dashboard',
  title: 'הדאשבורד של לקוח רשום',
  description: 'משימות, לוח שנה, פגישות והוצאות',
  route: '/demo/dashboard',
  exitRoute: '/',
  initialState: { taskTitle: d.taskTitle, meetingTitle: d.meetingTitle, expenses: 9_500 },
  nextDemos: ['client-area', 'documents', 'plan-stages'],
  steps: [
    {
      id: 'intro',
      title: 'שלום, דנה',
      caption: 'זה הדאשבורד של לקוחה רשומה — משפחת לוי לדוגמה. הסקירה מרכזת מכל אזור את מה שחשוב עכשיו: התהליך, לוח השנה, המשימות והפעולה הבאה.',
      target: 'dash-heading',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'nav',
      title: 'חמישה אזורים',
      caption: 'התפריט מחלק את האזור האישי לסקירה, משימות ולוח שנה, תמהילים שמורים, כלים והגדרות. המספרים ליד כל אזור אומרים כמה דברים מחכים שם.',
      target: 'dash-nav-agenda',
      spotlight: { side: 'left' },
    },
    {
      id: 'mortgages',
      title: 'המשכנתאות שלי',
      caption: 'התהליך הפתוח: באיזה שלב הוא, מה הנכס, מה סכום המשכנתא וההחזר הצפוי — ולחיצה מובילה ישר לשולחן העבודה.',
      actions: [{ type: 'scroll', target: 'dash-mortgages-card' }],
      target: 'dash-mortgages-card',
      spotlight: { side: 'top' },
    },
    {
      id: 'calendar-card',
      title: 'לוח השנה המוקטן',
      caption: 'הלוח מסמן פגישות, מועדי הגשה ותאריכי יעד. לחיצה על יום פותחת אותו בלוח המלא.',
      actions: [{ type: 'scroll', target: 'dash-calendar-card' }],
      target: 'dash-calendar-card',
      spotlight: { side: 'top' },
    },
    {
      id: 'tasks-card',
      title: 'המשימות הבאות',
      caption: 'משימות שהגיעו מהתהליך (מסמכים שהבנק דורש), מהיועץ, או שהוספתם בעצמכם — ממוינות לפי דחיפות.',
      target: 'dash-tasks-card',
      spotlight: { side: 'top' },
    },
    {
      id: 'go-agenda',
      title: 'משימות ולוח שנה',
      caption: 'נעבור לאזור המשימות ולוח השנה — כאן מנהלים את היומיום של התהליך.',
      actions: [{ type: 'click', target: 'dash-nav-agenda' }],
      target: 'client-calendar',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'calendar-views',
      title: 'יום, שבוע, חודש',
      caption: 'הלוח המלא מוצג ביום, בשבוע או בחודש. נעבור לתצוגת שבוע כדי לראות את הפגישה הקרובה עם היועץ.',
      actions: [{ type: 'click', target: 'calendar-view-week' }],
      target: 'calendar-views',
      spotlight: { side: 'bottom' },
    },
    {
      id: 'add-task',
      title: 'הוספת משימה',
      caption: 'כל מה שצריך לזכור נכנס לכאן. לוחצים "הוסף משימה או פגישה" — ונרשום משימה: {{taskTitle}}.',
      actions: [
        { type: 'click', target: 'agenda-add' },
        { type: 'click', target: 'task-kind-TASK' },
        { type: 'type', target: 'task-title', value: d.taskTitle, key: 'taskTitle' },
        { type: 'type', target: 'task-when', value: localDateTime(2, 18), instant: true },
      ],
      target: 'task-submit',
      spotlight: { side: 'top' },
    },
    {
      id: 'save-task',
      title: 'המשימה נשמרה',
      caption: 'לוחצים לשמור — והמשימה מופיעה ביום שבחרנו, וגם ברשימת "המשימות הבאות" בסקירה. (בהדגמה היא נשמרת רק בדפדפן.)',
      actions: [{ type: 'click', target: 'task-submit' }],
      target: 'agenda-day-card',
      spotlight: { side: 'top' },
    },
    {
      id: 'add-meeting',
      title: 'קביעת פגישה',
      caption: 'אותו חלון משמש גם לפגישות: נבחר "פגישה", ניתן כותרת ומועד — והיא תופיע בלוח עם תזכורת.',
      actions: [
        { type: 'click', target: 'agenda-add' },
        { type: 'click', target: 'task-kind-MEETING' },
        { type: 'type', target: 'task-title', value: d.meetingTitle, key: 'meetingTitle' },
        { type: 'type', target: 'task-when', value: localDateTime(4, 11), instant: true },
        { type: 'click', target: 'task-submit' },
      ],
      target: 'client-calendar',
      spotlight: { side: 'bottom' },
      allowTryIt: true,
      tryItHint: 'הוסיפו משימה או פגישה משלכם, עברו בין תצוגות הלוח, סמנו משימה כבוצעה — הכול נשאר בדפדפן בלבד.',
    },
    {
      id: 'go-settings',
      title: 'הגדרות ופרופיל',
      caption: 'בהגדרות שומרים את פרטי הלווים, ההון העצמי וההוצאות החודשיות — הם נטענים כברירת מחדל לכל משכנתא חדשה.',
      actions: [{ type: 'click', target: 'dash-nav-settings' }],
      target: 'dash-settings',
      spotlight: { side: 'over' },
    },
    {
      id: 'expenses',
      title: 'מעקב אחרי הוצאות',
      caption: 'ההוצאות החודשיות הקבועות משפיעות ישירות על ההחזר שהבנק יאשר. נעדכן ל-{{expenses|money}} — וכלי ההיתכנות יתחשב בזה.',
      actions: [
        { type: 'scroll', target: 'settings-expenses' },
        { type: 'type', target: 'settings-expenses', value: 9_500, key: 'expenses' },
      ],
      target: 'settings-expenses',
      spotlight: { side: 'top' },
      allowTryIt: true,
      tryItHint: 'עדכנו הכנסה, הון עצמי או הוצאות — ולחצו לשמור. בהדגמה השמירה היא בזיכרון הדפדפן בלבד.',
    },
    {
      id: 'save-settings',
      title: 'שמירה',
      caption: 'שומרים — והפרופיל מעודכן בכל הכלים: ההיתכנות, התמהיל וההגשה לבנקים.',
      actions: [{ type: 'click', target: 'settings-save' }],
      target: 'settings-save',
      spotlight: { side: 'top' },
    },
    {
      id: 'end',
      title: 'חזרה לסקירה',
      caption: 'זה הדאשבורד: משימות, לוח שנה, פגישות והוצאות — הכול מסונכרן עם התהליך ועם היועץ. נחזור לסקירה.',
      actions: [{ type: 'click', target: 'dash-nav-overview' }],
      target: 'dash-heading',
      spotlight: { side: 'bottom' },
      duration: 5000,
    },
  ],
};

export default flow;
