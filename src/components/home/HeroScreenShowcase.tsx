'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DemoWindow } from '@/components/demo/DemoKit';
import { DEMO_SCREENS } from '@/components/demo/DemoScreens';
import type { DemoScreenId } from '@/components/demo/DemoScreens';

/**
 * הסליידים של המסכים האמיתיים בראש עמוד הבית.
 *
 * במקום איור, מה שמתחלף כאן הוא הממשק עצמו: האזור האישי של הלקוח וחמשת מסכי
 * השלבים, אחד אחרי השני, עם משפט אחד שמסביר מה רואים ומה היתרון. אותם מסכים
 * בדיוק נפתחים בנגן ההדגמה שמתחת, במסלול המלא.
 */

const SHOWCASE: { screen: DemoScreenId; title: string; hint: string }[] = [
  {
    screen: 'dashboard',
    title: 'האזור האישי שלכם',
    hint: 'כל המשכנתא במסך אחד — שלב נוכחי, מסמכים, משימות ולוח שנה',
  },
  {
    screen: 'stage-analysis',
    title: 'שלב 1 · פרופיל פיננסי',
    hint: 'מה שהבנק יבדוק — אתם רואים לפניו, עם מגבלות בנק ישראל',
  },
  {
    screen: 'stage-mix',
    title: 'שלב 2 · בניית תמהיל',
    hint: 'אותם כלים שהיועצים עובדים איתם, מול הסלים האחידים',
  },
  {
    screen: 'stage-applications',
    title: 'שלב 3 · אישור עקרוני',
    hint: 'תיק מסמכים דיגיטלי, בחירת בנק והריביות שהתקבלו',
  },
  {
    screen: 'stage-auction',
    title: 'שלב 4 · מכרז ריביות',
    hint: 'כל הצעה מושווית לתמהיל שבניתם — ההפרש בשקלים',
  },
  {
    screen: 'stage-signing',
    title: 'שלב 5 · חתימה בבנק',
    hint: 'בדיקה שכל תנאי באישור הסופי תואם למה שסוכם במכרז',
  },
];

const ROTATE_MS = 3200;

export function HeroScreenShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % SHOWCASE.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const item = SHOWCASE[index];
  const screen = DEMO_SCREENS[item.screen];

  return (
    <div dir="rtl" className="w-full max-w-2xl px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.screen}
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ duration: 0.45 }}
        >
          <DemoWindow url={screen.url} className="ring-1 ring-slate-900/5">
            {screen.render()}
          </DemoWindow>

          <div className="mt-2 text-center">
            <p className="text-lg font-black text-slate-900 md:text-xl">{item.title}</p>
            <p className="mt-0.5 text-sm text-slate-600 md:text-sm">{item.hint}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {SHOWCASE.map((entry, entryIndex) => (
          <span
            key={entry.screen}
            className={`h-1.5 rounded-full transition-all ${
              entryIndex === index ? 'w-6 bg-slate-900' : 'w-1.5 bg-slate-400/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
