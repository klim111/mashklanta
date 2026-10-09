'use client';

import { CONTACTS_CHANGED_EVENT, notifyContactsChanged } from '@/components/contacts/useContacts';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AdvisorInboxRow,
  AttachmentFolder,
  ChatMessageView,
  ConversationContact,
  ConversationDocument,
  ConversationEmailView,
  ConversationSummary,
  OutgoingFileRef,
  RecipientRole,
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
    async (body: string, files: readonly OutgoingFileRef[] = []): Promise<boolean> => {
      const text = body.trim();
      if (!text && files.length === 0) return false;
      setSending(true);
      setError(null);
      try {
        const response = await fetch('/api/conversation/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text, files, clientUserId: clientUserId ?? undefined }),
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
  /** קבצים שצורפו — מוכנים לשליחה */
  files?: OutgoingFileRef[];
}

/**
 * מייל שמסך אחר מבקש לפתוח בתיבת המיילים — למשל "העבר לעורך דין" בשלב החתימה:
 * נושא ותוכן מוכנים, מסמכים מהתיק כבר מצורפים, וכשאין עדיין נמען מתאים —
 * טופס "נמען חדש" פתוח עם התפקיד שנבחר מראש.
 */
export interface ComposeRequest {
  to?: string[];
  subject: string;
  text: string;
  documents?: ConversationDocument[];
  addRecipientRole?: RecipientRole;
  /** נקרא אחרי שהמייל נשלח, עם הנמענים שנבחרו */
  onSent?: (to: string[]) => void;
}

export function useConversationEmails(clientUserId: string | null | undefined, enabled: boolean) {
  const [emails, setEmails] = useState<ConversationEmailView[]>([]);
  const [contacts, setContacts] = useState<ConversationContact[]>([]);
  const [folders, setFolders] = useState<AttachmentFolder[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmails([]);
    setContacts([]);
    setFolders([]);
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
      setFolders(Array.isArray(data.folders) ? data.folders : []);
      setReady(true);
    }
  }, [clientUserId]);

  usePolling(() => void refresh(), 20000, enabled);
  // איש קשר שנוסף בטאב "אנשי הקשר" או בשלב — מופיע מיד כנמען
  useEffect(() => {
    if (!enabled) return;
    const reload = () => void refresh();
    window.addEventListener(CONTACTS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(CONTACTS_CHANGED_EVENT, reload);
  }, [enabled, refresh]);

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

  /** שמירת קובץ מצורף בתיק המסמכים. מחזיר הודעת שגיאה, או null כשהצליח */
  const saveAttachment = useCallback(
    async (emailId: string, attachmentId: string, planId: string | null): Promise<string | null> => {
      try {
        const response = await fetch(
          `/api/conversation/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, clientUserId: clientUserId ?? undefined }),
          }
        );
        if (!response.ok) return await readError(response, 'השמירה בתיק נכשלה');
        const result: { planId: string } = await response.json();
        setEmails((current) =>
          current.map((email) =>
            email.id !== emailId
              ? email
              : {
                  ...email,
                  attachments: email.attachments.map((item) =>
                    item.id === attachmentId ? { ...item, savedToPlanId: result.planId } : item
                  ),
                }
          )
        );
        // תיק המסמכים ופסי ההתקדמות שפתוחים במסך מתעדכנים מיד
        window.dispatchEvent(new Event('mashklanta:plan-documents-changed'));
        return null;
      } catch {
        return 'השמירה בתיק נכשלה. בדקו את החיבור ונסו שוב';
      }
    },
    [clientUserId]
  );

  /**
   * החלטה על שולח לא מוכר (לקוח בלבד). אישור מכניס לשיחה את כל המיילים שלו
   * שממתינים, מחיקה מסירה אותם. מחזיר הודעת שגיאה, או null כשהצליח
   */
  const reviewSender = useCallback(
    async (emailId: string, decision: 'approve' | 'reject'): Promise<string | null> => {
      const from = emails.find((item) => item.id === emailId)?.fromAddress;
      try {
        const response = await fetch(`/api/conversation/emails/${encodeURIComponent(emailId)}/sender`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision }),
        });
        if (!response.ok) return await readError(response, 'הפעולה נכשלה');
        const matches = (item: ConversationEmailView) => item.held && item.fromAddress === from;
        setEmails((current) =>
          decision === 'approve'
            ? current.map((item) => (matches(item) ? { ...item, held: false, archived: false } : item))
            : current.map((item) => (matches(item) && !item.archived ? { ...item, archived: true } : item))
        );
        return null;
      } catch {
        return 'הפעולה נכשלה. בדקו את החיבור ונסו שוב';
      }
    },
    [emails]
  );

  /** מחיקה מהפיד לארכיון, או החזרה ממנו. מחזיר הודעת שגיאה, או null כשהצליח */
  const setArchived = useCallback(
    async (emailId: string, archived: boolean): Promise<string | null> => {
      try {
        const response = await fetch(`/api/conversation/emails/${encodeURIComponent(emailId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived, clientUserId: clientUserId ?? undefined }),
        });
        if (!response.ok) return await readError(response, 'הפעולה נכשלה');
        setEmails((current) => current.map((item) => (item.id === emailId ? { ...item, archived } : item)));
        return null;
      } catch {
        return 'הפעולה נכשלה. בדקו את החיבור ונסו שוב';
      }
    },
    [clientUserId]
  );

  /** מחיקה לגמרי מהארכיון (לקוח בלבד), עם גיבוי לתיבה הפרטית אם נבחר */
  const deleteForever = useCallback(async (emailId: string, backup: boolean): Promise<string | null> => {
    try {
      const response = await fetch(`/api/conversation/emails/${encodeURIComponent(emailId)}${backup ? '?backup=1' : ''}`, {
        method: 'DELETE',
      });
      if (!response.ok) return await readError(response, 'המחיקה נכשלה');
      setEmails((current) => current.filter((item) => item.id !== emailId));
      return null;
    } catch {
      return 'המחיקה נכשלה. בדקו את החיבור ונסו שוב';
    }
  }, []);

  /** נמען חדש עם תפקיד. מחזיר הודעת שגיאה, או null כשהצליח */
  const addRecipient = useCallback(
    async (input: { email: string; name: string; role: RecipientRole; bank?: string }): Promise<string | null> => {
      try {
        const response = await fetch('/api/conversation/recipients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...input, clientUserId: clientUserId ?? undefined }),
        });
        if (!response.ok) return await readError(response, 'הנמען לא נוסף');
        const contact: ConversationContact = await response.json();
        setContacts((current) => [...current, contact]);
        // הנמען הוא גם איש קשר — הטאב "אנשי הקשר" מתעדכן
        notifyContactsChanged();
        return null;
      } catch {
        return 'הנמען לא נוסף. בדקו את החיבור ונסו שוב';
      }
    },
    [clientUserId]
  );

  const removeRecipient = useCallback(
    async (recipientId: string): Promise<string | null> => {
      try {
        const response = await fetch(
          `/api/conversation/recipients/${encodeURIComponent(recipientId)}${query(clientUserId)}`,
          { method: 'DELETE' }
        );
        if (!response.ok) return await readError(response, 'הנמען לא הוסר');
        setContacts((current) => current.filter((item) => item.recipientId !== recipientId));
        notifyContactsChanged();
        return null;
      } catch {
        return 'הנמען לא הוסר. בדקו את החיבור ונסו שוב';
      }
    },
    [clientUserId]
  );

  return {
    addRecipient,
    removeRecipient,
    emails,
    contacts,
    folders,
    ready,
    sending,
    error,
    setError,
    send,
    refresh,
    saveAttachment,
    reviewSender,
    setArchived,
    deleteForever,
  };
}

/** הכתובת של קובץ מצורף — לצפייה, או להורדה עם `download` */
export function attachmentUrl(
  emailId: string,
  attachmentId: string,
  clientUserId?: string | null,
  download = false
): string {
  const params = new URLSearchParams();
  if (clientUserId) params.set('clientUserId', clientUserId);
  if (download) params.set('download', '1');
  const qs = params.toString();
  return `/api/conversation/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}${
    qs ? `?${qs}` : ''
  }`;
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

/** כתובת של קובץ שצורף להודעת צ'אט */
export function chatAttachmentUrl(
  messageId: string,
  attachmentId: string,
  clientUserId?: string | null,
  download = false
): string {
  const params = new URLSearchParams();
  if (clientUserId) params.set('clientUserId', clientUserId);
  if (download) params.set('download', '1');
  const qs = params.toString();
  return `/api/conversation/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}${
    qs ? `?${qs}` : ''
  }`;
}
