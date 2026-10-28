'use client';

/**
 * שער למסכי ההדגמה שדורשים חשבון (האזור האישי, שולחן העבודה של התהליך).
 *
 * המסכים האלה חיים תחת /demo כי המסלולים האמיתיים חסומים למי שאינו מחובר.
 * הם מוצגים רק כשארגז החול פעיל — אחרת מציעים להתחיל את ההדגמה המתאימה.
 */

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { demoStore, useDemoRequest } from '../store';
import { readEditFlag } from '@/components/site-content/editFlag';

export function DemoScreenGate({ flowId, children }: { flowId: string; children: React.ReactNode }) {
  const request = useDemoRequest();
  /** כניסה ישירה בכתובת מתחילה את ההדגמה; יציאה מהדגמה שרצה כאן לא מתחילה אותה מחדש */
  const autoStart = useRef(true);

  useEffect(() => {
    if (!autoStart.current) return;
    autoStart.current = false;
    // בהידרציה request עדיין null (תמונת השרת), ולכן בודקים את הבקשה השמורה בדפדפן —
    // אחרת הדגמה שכבר רצה (למשל במת ההקלטה) מוחלפת בהדגמה של המסך
    // יועץ שעורך את תוכן המסך (src/components/site-content) — ההדגמה לא מתחילה לרוץ מעצמה
    if (!demoStore.getSnapshot()) demoStore.start(flowId, { returnTo: '/', autoplay: !readEditFlag() });
  }, [flowId]);

  if (!request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500" dir="rtl">
        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
        פותחים את ההדגמה…
      </div>
    );
  }
  return <>{children}</>;
}
