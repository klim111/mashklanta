'use client';

/**
 * הכפתור שמתחת לאנימציה בדף הבית: מפעיל את ההדגמה הקצרה של הפלטפורמה.
 *
 * ההדגמה מחליפה את האנימציה — הקרוסלה נעצרת, וההדגמה מתחילה כאן, בדף הבית
 * עצמו, ומשם ממשיכה לכלים. הקובץ אינו טוען את המנוע — רק מסמן בחנות שהדגמה
 * התבקשה, והמארח בשורש טוען את השאר.
 */

import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';
import { demoStore } from '../store';
import { demoId } from '../demo-attr';

export function HeroDemoButton({ className = '' }: { className?: string }) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className={className}>
      <button
        type="button"
        onClick={() => demoStore.start('overview', { returnTo: '/' })}
        className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 px-7 py-3.5 text-cta font-black text-white shadow-xl shadow-blue-600/25 transition-all hover:shadow-2xl md:w-auto"
        {...demoId('home-demo-button')}
      >
        <PlayCircle className="h-6 w-6 transition-transform group-hover:scale-110" />
        <span>צפו בהדגמה קצרה: מה זה משכלנתא?</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-2xs font-bold">3 דק׳</span>
      </button>
    </motion.div>
  );
}
