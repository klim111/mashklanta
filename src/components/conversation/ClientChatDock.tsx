'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { ConversationSummary } from '@/lib/conversation';
import { ConversationWindow } from './ConversationWindow';
import { useConversationSummary } from './useConversation';

type DockMode = 'bar' | 'open';

interface ClientConversationApi {
  /** הלקוח מחובר והמסך הנוכחי מציג את ההתכתבות */
  enabled: boolean;
  mode: DockMode;
  /** הודעות צ'אט ומיילים שהלקוח עוד לא קרא */
  unread: number;
  summary: ConversationSummary | null;
  open: () => void;
  toggle: () => void;
  registerSlot: (element: HTMLElement) => () => void;
}

const ClientConversationContext = createContext<ClientConversationApi | null>(null);

/** מסכים שאין בהם התכתבות: אזור היועץ (גם advisor-dashboard), ההתחברות ושיחת הווידאו */
const HIDDEN_PREFIXES = ['/advisor', '/auth', '/video-call'];

/**
 * ההתכתבות עם היועץ, בכל מסכי הלקוח המחובר.
 *
 * הספק יושב בשורש האפליקציה ומחזיק מצב אחד לכל המסכים: שורה מוקטנת שתמיד
 * גלויה בפינה הימנית התחתונה, או חלון מלא. מסך שיש לו עמודת כפתורים צפים
 * (תיק המסמכים, חזרה לדאשבורד) מסמן בה מקום עם `ConversationDockSlot`, והשורה
 * נכנסת לשם — כך השלושה אינם עולים זה על זה. במסך בלי עמודה כזו השורה יושבת
 * בפינה בעצמה.
 */
export function ClientConversationProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname() || '/';
  const enabled =
    status === 'authenticated' &&
    session?.user?.role !== 'ADVISOR' &&
    !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const [mode, setMode] = useState<DockMode>('bar');
  const [slots, setSlots] = useState<HTMLElement[]>([]);
  const { summary, refresh } = useConversationSummary(null, enabled, mode === 'open' ? 10000 : 20000);
  const unread = (summary?.unreadChat ?? 0) + (summary?.unreadEmails ?? 0);

  // אחרי קריאה בחלון המלא המספרים מתאפסים — מרעננים כשהחלון מוקטן
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (mode === 'bar' && enabled) void refresh();
  }, [mode, enabled, refresh]);

  const registerSlot = useCallback((element: HTMLElement) => {
    setSlots((current) => [...current, element]);
    return () => setSlots((current) => current.filter((item) => item !== element));
  }, []);

  const slot = slots[slots.length - 1] ?? null;

  /*
    החלון המלא נפתח מעל העמודה שבה השורה יושבת — כך בדאשבורד הוא לא מכסה את
    תפריט הצד. במסך צר החלון תופס את כל המסך, ואין הזזה
  */
  const [offset, setOffset] = useState(0);
  const openWindow = useCallback(() => {
    const rect = slots[slots.length - 1]?.parentElement?.getBoundingClientRect();
    setOffset(rect && window.innerWidth >= 640 ? Math.max(16, Math.round(window.innerWidth - rect.right)) : 0);
    setMode('open');
  }, [slots]);

  const api = useMemo<ClientConversationApi>(
    () => ({
      enabled,
      mode,
      unread,
      summary,
      open: openWindow,
      toggle: () => (mode === 'open' ? setMode('bar') : openWindow()),
      registerSlot,
    }),
    [enabled, mode, unread, summary, registerSlot, openWindow]
  );

  const dock = enabled ? (
    <ConversationWindow
      role="CLIENT"
      side="right"
      docked
      title={summary?.advisorName ? `התכתבות עם ${summary.advisorName}` : 'התכתבות עם היועץ'}
      subtitle={summary?.advisorName ? 'היועץ המלווה שלכם' : 'יועצי משכלנתא יענו כאן'}
      mode={mode}
      onMode={(next) => (next === 'open' ? openWindow() : setMode('bar'))}
      offset={offset}
      unreadChat={mode === 'open' ? 0 : summary?.unreadChat}
      unreadEmails={summary?.unreadEmails}
      mailboxAddress={summary?.mailboxAddress ?? null}
      receivesEmail={summary?.receivesEmail ?? false}
    />
  ) : null;

  return (
    <ClientConversationContext.Provider value={api}>
      {children}
      {dock &&
        (mode === 'open' ? (
          dock
        ) : slot ? (
          createPortal(dock, slot)
        ) : (
          <div className="fixed bottom-5 right-5 z-40 print:hidden">{dock}</div>
        ))}
    </ClientConversationContext.Provider>
  );
}

export function useClientConversation(): ClientConversationApi | null {
  return useContext(ClientConversationContext);
}

/**
 * המקום של שורת ההתכתבות בעמודת הכפתורים הצפים של המסך. `contents` — כשאין
 * התכתבות (יועץ, אורח) הוא לא תופס מקום ולא מוסיף רווח בעמודה.
 */
export function ConversationDockSlot() {
  const api = useClientConversation();
  const registerSlot = api?.registerSlot;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!registerSlot || !ref.current) return;
    return registerSlot(ref.current);
  }, [registerSlot]);
  return <div ref={ref} className="contents" />;
}
