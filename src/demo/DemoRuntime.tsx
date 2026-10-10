'use client';

/**
 * זמן הריצה של ההדגמה — נטען בעצלות רק כשהדגמה פעילה.
 *
 * מתקין את ארגז החול (API מדומה, אחסון מבודד) לפני שהמסך מתחת מתרנדר, מריץ
 * את המנוע ומצייר את השכבה (סמן, כתוביות, פקדים). ביציאה — הכול מתפרק
 * והאתר חוזר להתנהג כרגיל.
 */

import { useEffect } from 'react';
import { DEMO_CATALOG } from './catalog';
import { DemoEngineProvider } from './engine/DemoEngineProvider';
import { disposeSandbox, ensureSandbox } from './sandbox';
import { demoStore } from './store';
import type { DemoRequest } from './store';
import { DemoOverlay } from './ui/DemoOverlay';
import './ui/demo.css';

export default function DemoRuntime({ request, children }: { request: DemoRequest; children: React.ReactNode }) {
  // ארגז החול חייב להיות מותקן לפני שהמסך שמתחת מבצע את הקריאה הראשונה —
  // יחיד לכל הדף, ולכן רינדור חוזר לא מערים ארגז על ארגז
  if (typeof window !== 'undefined') ensureSandbox({ onSignOut: () => demoStore.stop() });

  useEffect(() => {
    ensureSandbox({ onSignOut: () => demoStore.stop() });
    document.body.classList.add('mk-demo-active');
    return () => {
      document.body.classList.remove('mk-demo-active');
      disposeSandbox();
    };
  }, []);

  return (
    <DemoEngineProvider key={request.flowId} request={request} catalog={DEMO_CATALOG}>
      {children}
      <DemoOverlay />
    </DemoEngineProvider>
  );
}
