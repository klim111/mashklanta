'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AdvisorInboxRow,
  ChatMessageView,
  ConversationContact,
  ConversationEmailView,
  ConversationSummary,
} from '@/lib/conversation';

/**
 * הנתונים של חלון ההתכתבות. אין כאן חיבור קבוע לשרת — הרשימות מתרעננות
 * במרווחים קבועים כל עוד החלון פתוח, ומספר ההודעות שממתינות נבדק לאט יותר
 * גם כשהוא סגור. יועץ מעביר `clientUserId`; לקוח משאיר ריק ומקבל את השיחה שלו.
 */

function query(clientUserId?: string | null): string {
  return clientUserId ? `?clientUserId=${encodeURIComponent(clientUserId)}` : '';
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

/** מריץ את `tick` מיד וכל `ms`, רק כשהלשונית גלויה */
function usePolling(tick: () => void, ms: number, enabled: boolean) {
  const saved = useRef(tick);
  saved.current = tick;
  useEffect(() => {
    if (!enabled) return;
    saved.current();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') saved.current();
    }, ms);
    const onVisible = () => document.visibilityState === 'visible' && saved.current();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms, enabled]);
}

export function useConversationSummary(clientUserId: string | null | undefined, enabled = true, ms = 30000) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const refresh = useCallback(async () => {
    const response = await fetch(`/api/conversation/summary${query(clientUserId)}`).catch(() => null);
    if (response?.ok) setSummary(await response.json());
  }, [clientUserId]);
  usePolling(() => void refresh(), ms, enabled);
  return { summary, refresh };
}

export function useChat(clientUserId: string | null | undefined, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages([]);
    setReady(false);
  }, [clientUserId]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/conversation/messages${query(clientUserId)}`).catch(() => null);
    if (response?.ok) {
      setMessages(await response.json());
      setReady(true);
    }
  }, [clientUserId]);

  usePolling(() => void refresh(), 8000, enabled);

  const send = useCallback(
    async (body: string): Promise<boolean> => {
      const text = body.trim();
      if (!text) return false;
      setSending(true);
      setError(null);
      try {
        const response = await fetch('/api/conversation/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text, clientUserId: clientUserId ?? undefined }),
        });
        if (!response.ok) {
          setError(await readError(response, 'ההודעה לא נשלחה'));
          return false;
        }
        const message: ChatMessageView = await response.json();
        setMessages((current) => [...current, message]);
        return true;
      } catch {
        setError('ההודעה לא נשלחה. בדקו את החיבור ונסו שוב');
        return false;
      } finally {
        setSending(false);
      }
    },
    [clientUserId]
  );

  return { messages, ready, sending, error, send, refresh };
}

export interface EmailDraft {
  to: string[];
  subject: string;
  text: string;
}

export function useConversationEmails(clientUserId: string | null | undefined, enabled: boolean) {
  const [emails, setEmails] = useState<ConversationEmailView[]>([]);
  const [contacts, setContacts] = useState<ConversationContact[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmails([]);
    setContacts([]);
    setReady(false);
  }, [clientUserId]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/conversation/emails${query(clientUserId)}`).catch(() => null);
    if (response?.ok) {
      const data = await response.json();
      // מייל שכבר הוצג כחדש נשאר מודגש עד שהחלון נסגר, גם אחרי הרענון הבא
      setEmails((current) => {
        const unread = new Set(current.filter((item) => item.unread).map((item) => item.id));
        return (data.emails as ConversationEmailView[]).map((item) =>
          unread.has(item.id) ? { ...item, unread: true } : item
        );
      });
      setContacts(data.contacts);
      setReady(true);
    }
  }, [clientUserId]);

  usePolling(() => void refresh(), 20000, enabled);

  const send = useCallback(
    async (draft: EmailDraft): Promise<boolean> => {
      setSending(true);
      setError(null);
      try {
        const response = await fetch('/api/conversation/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...draft, clientUserId: clientUserId ?? undefined }),
        });
        if (!response.ok) {
          setError(await readError(response, 'המייל לא נשלח'));
          return false;
        }
        const email: ConversationEmailView = await response.json();
        setEmails((current) => [email, ...current]);
        return true;
      } catch {
        setError('המייל לא נשלח. בדקו את החיבור ונסו שוב');
        return false;
      } finally {
        setSending(false);
      }
    },
    [clientUserId]
  );

  return { emails, contacts, ready, sending, error, setError, send, refresh };
}

export function useAdvisorInbox(enabled: boolean, ms: number) {
  const [rows, setRows] = useState<AdvisorInboxRow[]>([]);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch('/api/conversation/inbox').catch(() => null);
    if (response?.ok) {
      setRows(await response.json());
      setReady(true);
    }
  }, []);
  usePolling(() => void refresh(), ms, enabled);
  return { rows, ready, refresh };
}
