'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReturnTarget {
  href: string;
  label: string;
}

/**
 * לאן חוזרים מכלי או ממסך משני. סדר העדיפויות זהה בכל האתר:
 * מי שהגיע מתהליך (?fromPlan) חוזר לתהליך ולשלב שממנו יצא (?fromStage),
 * לקוח מחובר חוזר לאזור האישי, ואורח חוזר לדף הבית.
 */
export function returnTargetFor(options: {
  fromPlan?: string | null;
  fromStage?: string | null;
  signedIn: boolean;
}): ReturnTarget {
  const { fromPlan, fromStage, signedIn } = options;
  if (fromPlan && /^[\w-]+$/.test(fromPlan)) {
    const stage = fromStage && /^[A-Z_]+$/.test(fromStage) ? `?stage=${fromStage}` : '';
    return { href: `/dashboard/plans/${fromPlan}${stage}`, label: 'חזרה לתהליך' };
  }
  if (signedIn) return { href: '/dashboard', label: 'חזרה לאזור האישי' };
  return { href: '/', label: 'חזרה לדף הבית' };
}

export function useReturnTarget(): ReturnTarget {
  const searchParams = useSearchParams();
  const { status } = useSession();
  return returnTargetFor({
    fromPlan: searchParams?.get('fromPlan'),
    fromStage: searchParams?.get('fromStage'),
    signedIn: status === 'authenticated',
  });
}

/**
 * קישור החזרה האחיד: חץ ימינה (אחורה בעברית) ואז הטקסט, בראש העמוד מימין.
 * `tone="light"` לרקע כהה.
 */
export function ReturnLink({
  target,
  tone = 'dark',
  className,
}: {
  target?: ReturnTarget;
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const fallback = useReturnTarget();
  const { href, label } = target ?? fallback;
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 text-button font-bold transition-colors',
        tone === 'light' ? 'text-white/80 hover:text-white' : 'text-blue-700 hover:text-blue-900',
        className
      )}
    >
      <ChevronRight className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
