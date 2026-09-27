import type { DemoFlow } from '../../types';

/**
 * סרטון השיווק (scripts/marketing-video). אין כאן תסריט: כל צעד רק פותח מסך
 * של ארגז החול ונעצר, וההקלטה עצמה מפעילה את המסך. הצעד שמתאים למסך נבחר
 * לפני כל טעינה, כדי שההדגמה לא תנווט למסך אחר.
 */
const HOLD = 3_600_000;

const flow: DemoFlow = {
  id: 'marketing',
  title: 'סרטון שיווק',
  description: 'המסכים של סרטון השיווק',
  route: '/demo/dashboard',
  exitRoute: '/',
  steps: [
    { id: 'dashboard', caption: ' ', route: '/demo/dashboard', duration: HOLD },
    { id: 'plan', caption: ' ', route: '/demo/plan', duration: HOLD },
    { id: 'refi', caption: ' ', route: '/demo/plan?plan=demo-refi', duration: HOLD },
    { id: 'letters', caption: ' ', route: '/demo/authorization-letters', duration: HOLD },
    { id: 'completed', caption: ' ', route: '/demo/completed', duration: HOLD },
  ],
};

export default flow;
