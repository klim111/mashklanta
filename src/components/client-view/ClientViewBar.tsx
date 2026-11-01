'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { leaveClientView } from '@/lib/client-view';
import { useClientView } from './useClientView';

/**
 * הפס של היועץ בכל מסך מחוץ לאזור היועץ: כלי, עמוד באתר או האזור האישי.
 * מזכיר שהוא במצב יועץ — או, במצב "כלקוח" (src/lib/client-view.ts), שהוא
 * רואה את הפלטפורמה כמו לקוח רשום עם כל הכלים פתוחים — ומחזיר בלחיצה לדף
 * הבית של היועץ.
 */
const HIDDEN_PREFIXES = ['/advisor-dashboard', '/meeting/', '/auth', '/demo'];

export function ClientViewBar() {
  const { data: session } = useSession();
  const isAdvisor = session?.user?.role === 'ADVISOR';
  const clientView = useClientView();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const inAdvisorArea = pathname.startsWith('/advisor-dashboard');

  // החזרה לאזור היועץ — בכל דרך, גם בקישור — מסיימת את מצב "כלקוח"
  useEffect(() => {
    if (inAdvisorArea) leaveClientView();
  }, [inAdvisorArea]);

  if (!isAdvisor || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed left-1/2 top-2 z-[60] sm:bottom-4 sm:top-auto flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-violet-700 py-1.5 pl-1.5 pr-3 text-white shadow-xl shadow-violet-900/30 print:hidden"
    >
      <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 truncate text-xs font-bold sm:text-sm">
        {clientView ? 'מצב אדמין · צפייה כלקוח רשום' : 'מצב יועץ'}
        {clientView && (
          <span className="hidden font-semibold text-white/75 2xl:inline"> · כל הכלים פתוחים, לא נספר כביקור</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => {
          leaveClientView();
          router.push('/advisor-dashboard');
        }}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-violet-800 transition-colors hover:bg-violet-50"
      >
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        חזרה לאזור היועץ
      </button>
    </div>
  );
}
