'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { KnownDetails } from '@/lib/known-details';

/**
 * הפרטים שהלקוח כבר הזין בפלטפורמה (src/lib/known-details.ts). לאורח אין
 * פרטים ידועים — `details` נשאר null, ו-`ready` עובר ל-true מיד.
 */
export function useKnownDetails(): { details: KnownDetails | null; ready: boolean } {
  const { status } = useSession();
  const [state, setState] = useState<{ details: KnownDetails | null; ready: boolean }>({
    details: null,
    ready: false,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      setState({ details: null, ready: true });
      return;
    }
    let cancelled = false;
    fetch('/api/known-details', { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<KnownDetails>) : null))
      .catch(() => null)
      .then((details) => {
        if (!cancelled) setState({ details, ready: true });
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return state;
}
