'use client';

/**
 * זמן הריצה של ההדגמה — נטען בעצלות רק כשהדגמה פעילה.
 *
 * מתקין את ארגז החול (API מדומה, אחסון מבודד) לפני שהמסך מתחת מתרנדר, מריץ
 * את המנוע ומצייר את השכבה (סמן, כתוביות, פקדים). ביציאה — הכול מתפרק
 * והאתר חוזר להתנהג כרגיל.
 */

import { useEffect, useRef } from 'react';
import { DEMO_CATALOG } from './catalog';
import { DemoEngineProvider } from './engine/DemoEngineProvider';
import { createSandbox } from './sandbox';
import type { DemoSandbox } from './sandbox';
import { demoStore } from './store';
import type { DemoRequest } from './store';
import { DemoOverlay } from './ui/DemoOverlay';
import './ui/demo.css';

export default function DemoRuntime({ request, children }: { request: DemoRequest; children: React.ReactNode }) {
  const sandbox = useRef<DemoSandbox | null>(null);

  // ארגז החול חייב להיות מותקן לפני שהמסך שמתחת מבצע את הקריאה הראשונה
  if (typeof window !== 'undefined' && !sandbox.current) {
    sandbox.current = createSandbox({ onSignOut: () => demoStore.stop() });
  }

  useEffect(() => {
    if (!sandbox.current) sandbox.current = createSandbox({ onSignOut: () => demoStore.stop() });
    document.body.classList.add('mk-demo-active');
    return () => {
      document.body.classList.remove('mk-demo-active');
      sandbox.current?.dispose();
      sandbox.current = null;
    };
  }, []);

  return (
    <DemoEngineProvider key={request.flowId} request={request} catalog={DEMO_CATALOG}>
      {children}
      <DemoOverlay />
    </DemoEngineProvider>
  );
}
