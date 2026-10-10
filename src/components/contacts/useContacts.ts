'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ContactView, ContactsPayload } from '@/lib/contact-roles';
import type { RecipientRole } from '@/lib/conversation';

export interface ContactInput {
  role: RecipientRole;
  name?: string;
  email?: string;
  phone?: string;
  bank?: string;
}

export const CONTACTS_CHANGED_EVENT = 'mashklanta:contacts-changed';
const EVENT = CONTACTS_CHANGED_EVENT;

/**
 * אנשי הקשר של הלקוח, מכל מקום בפלטפורמה: הטאב "אנשי הקשר", השלבים בתהליך
 * (למשל עורך הדין בשלב 5) ותיבת המיילים. שינוי בכל אחד מהם מודיע לשאר.
 * יועץ מעביר `clientUserId`.
 */
export function useContacts(clientUserId?: string | null) {
  const [data, setData] = useState<ContactsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qs = clientUserId ? `?clientUserId=${encodeURIComponent(clientUserId)}` : '';

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/contacts${qs}`);
      if (!response.ok) throw new Error(String(response.status));
      setData((await response.json()) as ContactsPayload);
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את אנשי הקשר');
    }
  }, [qs]);

  useEffect(() => {
    void load();
    const reload = () => void load();
    window.addEventListener(EVENT, reload);
    return () => window.removeEventListener(EVENT, reload);
  }, [load]);

  const changed = () => window.dispatchEvent(new Event(EVENT));

  /** שמירה — חדש או עדכון. מחזיר הודעת שגיאה, או null כשהצליח */
  const save = useCallback(
    async (input: ContactInput, id?: string): Promise<string | null> => {
      const response = await fetch(id ? `/api/contacts/${encodeURIComponent(id)}` : '/api/contacts', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, clientUserId: clientUserId ?? undefined }),
      }).catch(() => null);
      if (!response) return 'אין חיבור. נסו שוב';
      if (!response.ok) return ((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'השמירה נכשלה';
      changed();
      return null;
    },
    [clientUserId]
  );

  const remove = useCallback(
    async (id: string): Promise<string | null> => {
      const response = await fetch(`/api/contacts/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' }).catch(() => null);
      if (!response?.ok) return 'המחיקה נכשלה';
      changed();
      return null;
    },
    [qs]
  );

  /** "צרפו מומחה משכלנתא לתהליך" */
  const requestExpert = useCallback(async (): Promise<string | null> => {
    const response = await fetch('/api/contacts/expert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath: window.location.pathname }),
    }).catch(() => null);
    if (!response) return 'אין חיבור. נסו שוב';
    if (!response.ok) return ((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'הפנייה לא נשלחה';
    changed();
    return null;
  }, []);

  return {
    ready: data !== null,
    error,
    contacts: data?.contacts ?? ([] as ContactView[]),
    advisor: data?.advisor ?? null,
    expertRequestedAt: data?.expertRequestedAt ?? null,
    save,
    remove,
    requestExpert,
    reload: load,
  };
}

/** להודיע לכל מי שמציג אנשי קשר שהרשימה השתנתה — למשל אחרי נמען חדש בתיבת המיילים */
export function notifyContactsChanged() {
  window.dispatchEvent(new Event(EVENT));
}
