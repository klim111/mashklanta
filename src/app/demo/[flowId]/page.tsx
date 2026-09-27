'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { demoById } from '@/demo/catalog';
import { demoStore } from '@/demo/store';

/**
 * כניסה ישירה להדגמה בכתובת: /demo/equity, /demo/affordability וכו׳.
 * ההדגמה מתחילה, והמנוע מנווט למסך הראשון שלה.
 */
export default function DemoFlowPage() {
  const params = useParams<{ flowId: string }>();
  const router = useRouter();
  const entry = demoById(params.flowId);

  useEffect(() => {
    if (!entry) {
      router.replace('/demo');
      return;
    }
    demoStore.start(entry.id, { returnTo: '/demo' });
  }, [entry, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500" dir="rtl">
      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
      {entry ? `מתחילים: ${entry.title}` : 'ההדגמה לא נמצאה'}
    </div>
  );
}
