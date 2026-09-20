'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
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

  return (
    <SessionProvider
      key={demo ? 'demo' : 'live'}
      session={demo ? demoSession() : undefined}
      refetchOnWindowFocus={!demo}
    >
      <DemoHost>{children}</DemoHost>
    </SessionProvider>
  );
}
