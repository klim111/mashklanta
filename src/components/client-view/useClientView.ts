'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CLIENT_VIEW_EVENT, clientViewActive } from '@/lib/client-view';

/**
 * האם היועץ גולש עכשיו "כלקוח" (src/lib/client-view.ts). אצל לקוח או אורח
 * תמיד false.
 */
export function useClientView(): boolean {
  const { data: session } = useSession();
  const isAdvisor = session?.user?.role === 'ADVISOR';
  const [active, setActive] = useState(false);

  useEffect(() => {
    const read = () => setActive(clientViewActive());
    read();
    window.addEventListener(CLIENT_VIEW_EVENT, read);
    return () => window.removeEventListener(CLIENT_VIEW_EVENT, read);
  }, []);

  return isAdvisor && active;
}

/** לאן מוביל "האזור האישי": ליועץ — לאזור היועץ, אלא אם הוא גולש כלקוח */
export function usePersonalAreaHref(): string {
  const { data: session } = useSession();
  const clientView = useClientView();
  return session?.user?.role === 'ADVISOR' && !clientView ? '/advisor-dashboard' : '/dashboard';
}
