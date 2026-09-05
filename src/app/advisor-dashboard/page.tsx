'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { AdvisorConsole } from '@/components/advisor/AdvisorConsole';

/**
 * לוח הבקרה של היועץ. הדף עצמו רק שומר על ההרשאה — כל התוכן חי ב-AdvisorConsole,
 * כדי שאותו לוח יהיה ניתן להרכבה גם ממקומות אחרים.
 */
export default function AdvisorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/login');
    else if (session.user?.role !== 'ADVISOR') router.push('/dashboard');
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!session || session.user?.role !== 'ADVISOR') return null;

  return <AdvisorConsole />;
}
