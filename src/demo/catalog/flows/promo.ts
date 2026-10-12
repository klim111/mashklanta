import type { DemoFlow } from '../../types';

/**
 * הבמה של סרטון התדמית בדף הבית ("צפו בהדגמה קצרה").
 *
 * זו אינה הדגמה שמוצגת למבקרים. המקליט (scripts/promo-video/record.mjs)
 * מפעיל אותה מושהית כדי לקבל את האזור האישי עם נתוני ההדגמה, ומזיז את
 * העכבר, ההקלדה והכתוביות בעצמו. כל צעד כאן הוא רק מסך פתיחה: המקליט קובע
 * את מספר הצעד ב-sessionStorage וטוען את המסך שלו, וההדגמה נשארת עליו.
 */
const flow: DemoFlow = {
  id: 'promo',
  title: 'מה זה משכלנתא? (סרטון)',
  description: 'הבמה של סרטון התדמית בדף הבית',
  route: '/demo/dashboard',
  exitRoute: '/',
  steps: [
    { id: 'equity', route: '/equity-planning', caption: ' ', duration: 0, pauseAfter: true },
    { id: 'dashboard', route: '/demo/dashboard', caption: ' ', duration: 0, pauseAfter: true },
    { id: 'plan', route: '/demo/plan', caption: ' ', duration: 0, pauseAfter: true },
  ],
};

export default flow;
