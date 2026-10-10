'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CHAT_TITLE } from '@/lib/conversation';
import type { ConversationSummary } from '@/lib/conversation';
import { ClientActionsMenu } from '@/components/actions/ClientActionsMenu';
import { ConversationWindow } from './ConversationWindow';
import { useConversationSummary } from './useConversation';
import type { ComposeRequest } from './useConversation';

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
  /**
   * מסך שמחזיק את הצ׳אט בתוך תפריט משלו (כפתור הפעולות של שלבי המשכנתא):
   * עיגול הפעולות הכללי לא מוצג, והחלון המלא נפתח מעל התפריט של המסך
   */
  registerActionsHost: () => () => void;
  /** פתיחת החלון בטאב המיילים, עם מייל מוכן לשליחה */
  compose: (request: ComposeRequest) => void;
}

const ClientConversationContext = createContext<ClientConversationApi | null>(null);

/** מסכים שאין בהם התכתבות: אזור היועץ (גם advisor-dashboard), ההתחברות ושיחת הווידאו */
const HIDDEN_PREFIXES = ['/advisor', '/auth', '/video-call'];

/**
 * הצ׳אט עם נציג משכלנתא, בכל מסכי הלקוח המחובר.
 *
 * הספק יושב בשורש האפליקציה ומחזיק מצב אחד לכל המסכים. הכניסה לצ׳אט היא עיגול
 * הפעולות הכחול בפינה הימנית התחתונה (`ClientActionsMenu`) — אותו עיגול כמו
 * בשלבי המשכנתא, עם הוספת משימה, תיק המסמכים והחזרה לדאשבורד — והחלון המלא
 * נפתח מעליו. מסך שיש לו עמודת כפתורים צפים משלו (הדאשבורד, שבו תפריט הצד
 * תופס את הקצה) מסמן בה מקום עם `ConversationDockSlot`, והעיגול נכנס לשם.
 * בשלבי המשכנתא העיגול של השלב מחזיק את הצ׳אט (`registerActionsHost`).
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

  const [actionsHosts, setActionsHosts] = useState(0);
  const registerActionsHost = useCallback(() => {
    setActionsHosts((count) => count + 1);
    return () => setActionsHosts((count) => count - 1);
  }, []);
  const inActionsMenu = actionsHosts > 0;

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

  const [composeRequest, setComposeRequest] = useState<ComposeRequest | null>(null);
  const compose = useCallback(
    (request: ComposeRequest) => {
      setComposeRequest(request);
      openWindow();
    },
    [openWindow]
  );

  const toggle = useCallback(() => (mode === 'open' ? setMode('bar') : openWindow()), [mode, openWindow]);

  const api = useMemo<ClientConversationApi>(
    () => ({
      enabled,
      mode,
      unread,
      summary,
      open: openWindow,
      toggle,
      registerSlot,
      registerActionsHost,
      compose,
    }),
    [enabled, mode, unread, summary, registerSlot, registerActionsHost, openWindow, toggle, compose]
  );

  const dock = enabled ? (
    <ConversationWindow
      role="CLIENT"
      side="right"
      docked
      title={CHAT_TITLE}
      subtitle="נציג משכלנתא יענה לכם כאן"
      mode={mode}
      onMode={(next) => (next === 'open' ? openWindow() : setMode('bar'))}
      offset={offset}
      anchor="above-actions"
      unreadChat={mode === 'open' ? 0 : summary?.unreadChat}
      unreadEmails={summary?.unreadEmails}
      mailboxAddress={summary?.mailboxAddress ?? null}
      receivesEmail={summary?.receivesEmail ?? false}
      composeRequest={composeRequest}
      onComposeTaken={() => setComposeRequest(null)}
    />
  ) : null;

  // עיגול הפעולות — חוץ משלבי המשכנתא, שבהם יש עיגול משלהם
  const menu =
    enabled && !inActionsMenu ? (
      <ClientActionsMenu unread={unread} chatOpen={mode === 'open'} onToggleChat={toggle} inline={Boolean(slot)} />
    ) : null;

  return (
    <ClientConversationContext.Provider value={api}>
      {children}
      {enabled && mode === 'open' && dock}
      {menu && (slot ? createPortal(menu, slot) : menu)}
    </ClientConversationContext.Provider>
  );
}

export function useClientConversation(): ClientConversationApi | null {
  return useContext(ClientConversationContext);
}

/**
 * המקום של עיגול הפעולות בעמודת הכפתורים הצפים של המסך. `contents` — כשאין
 * צ׳אט (יועץ, אורח) הוא לא תופס מקום ולא מוסיף רווח בעמודה.
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
