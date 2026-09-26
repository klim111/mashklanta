'use client';

/**
 * המארח של ההדגמה — יושב בשורש האפליקציה ואינו טוען דבר עד שמתחילים הדגמה.
 *
 * כשהחנות מדווחת על הדגמה פעילה, זמן הריצה נטען בעצלות ועוטף את הדף. כך
 * ההדגמה שורדת ניווט בין מסכים (השורש נשאר מורכב), והאתר הרגיל אינו משלם
 * על driver.js, הסמן והצעדים.
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useDemoRequest } from './store';

const DemoRuntime = dynamic(() => import('./DemoRuntime'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500" dir="rtl">
      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
      מכינים את ההדגמה…
    </div>
  ),
});

export function DemoHost({ children }: { children: React.ReactNode }) {
  const request = useDemoRequest();
  if (!request) return <>{children}</>;
  return <DemoRuntime request={request}>{children}</DemoRuntime>;
}
