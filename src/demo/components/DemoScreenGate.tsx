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

export function DemoScreenGate({ flowId, children }: { flowId: string; children: React.ReactNode }) {
  const request = useDemoRequest();
  /** כניסה ישירה בכתובת מתחילה את ההדגמה; יציאה מהדגמה שרצה כאן לא מתחילה אותה מחדש */
  const autoStart = useRef(request === null);

  useEffect(() => {
    if (!request && autoStart.current) {
      autoStart.current = false;
      demoStore.start(flowId, { returnTo: '/' });
    }
  }, [request, flowId]);

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
