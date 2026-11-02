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
import { frameMode, useFrameMode } from '@/components/frame-mode/frameMode';

export function DemoScreenGate({ flowId, children }: { flowId: string; children: React.ReactNode }) {
  /**
   * חלון ההדגמה של פגישה (ביקור וירטואלי או הכלים של האורח): ארגז החול כבר
   * מותקן בחלון, והמסך מוצג חופשי, בלי הדגמה מודרכת שרצה עליו
   */
  const frame = useFrameMode();
  const sandboxed = frame?.kind === 'visit' || frame?.kind === 'guest';
  const request = useDemoRequest();
  /** כניסה ישירה בכתובת מתחילה את ההדגמה; יציאה מהדגמה שרצה כאן לא מתחילה אותה מחדש */
  const autoStart = useRef(true);

  useEffect(() => {
    const inFrame = frameMode()?.kind === 'visit' || frameMode()?.kind === 'guest';
    if (!autoStart.current || inFrame) return;
    autoStart.current = false;
    // בהידרציה request עדיין null (תמונת השרת), ולכן בודקים את הבקשה השמורה בדפדפן —
    // אחרת הדגמה שכבר רצה (למשל במת ההקלטה) מוחלפת בהדגמה של המסך
    // יועץ שעורך את תוכן המסך (src/components/site-content) — ההדגמה לא מתחילה לרוץ מעצמה
    if (!demoStore.getSnapshot()) demoStore.start(flowId, { returnTo: '/', autoplay: !readEditFlag() });
  }, [flowId, sandboxed]);

  if (sandboxed) return <>{children}</>;
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
