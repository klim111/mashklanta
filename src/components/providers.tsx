'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { attachNumericCaretFix } from '@/lib/caret';

export function Providers({ children }: { children: React.ReactNode }) {
  // בכל שדה מספרי בפלטפורמה הסמן נכנס בסוף הערך, כדי שמחיקה תעבוד מיד
  useEffect(() => attachNumericCaretFix(), []);

  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
