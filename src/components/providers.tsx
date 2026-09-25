'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { MotionConfig } from 'framer-motion';
import { useA11yPrefs } from '@/components/a11y/a11yStore';
import { attachNumericCaretFix } from '@/lib/caret';
import { useDemoRequest } from '@/demo/store';
import { demoSession } from '@/demo/data/demo-session';
import { DemoHost } from '@/demo/DemoHost';

export function Providers({ children }: { children: React.ReactNode }) {
  // בכל שדה מספרי בפלטפורמה הסמן נכנס בסוף הערך, כדי שמחיקה תעבוד מיד
  useEffect(() => attachNumericCaretFix(), []);

  /**
   * בזמן הדגמה ה-session הוא הפרסונה הבדויה: הספק מורכב מחדש עם session קבוע,
   * ולא פונה לשרת — וכל מסך "מחובר" רואה את משפחת ההדגמה במקום משתמש אמיתי.
   */
  const demo = useDemoRequest();

  // "עצירת אנימציות" בתפריט הנגישות עוצרת גם את האנימציות של framer-motion
  const { stopMotion } = useA11yPrefs();

  return (
    <SessionProvider
      key={demo ? 'demo' : 'live'}
      session={demo ? demoSession() : undefined}
      refetchOnWindowFocus={!demo}
    >
      <MotionConfig reducedMotion={stopMotion ? 'always' : 'user'}>
        <DemoHost>{children}</DemoHost>
      </MotionConfig>
    </SessionProvider>
  );
}
