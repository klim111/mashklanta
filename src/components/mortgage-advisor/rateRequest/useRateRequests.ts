'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { WorkspaceMix } from '../engine';
import type { RateRequestDetails, RateRequestDocument } from './document';
import { toSavedRateRequest } from './record';
import type { SavedRateRequest } from './record';

/**
 * בקשות הריביות נשמרות בחשבון, כדי שיהיו זמינות מכל מכשיר וגם ליועץ. מי שעדיין
 * לא התחבר שומר בדפדפן, ומה שנשמר שם עולה לחשבון בהתחברות הראשונה.
 */
const LOCAL_KEY = 'mashklanta:rate-requests';
const IMPORTED_KEY = 'mashklanta:rate-requests-imported';
const CHANGE_EVENT = 'mashklanta:rate-requests-changed';

interface StoredPayload {
  id: string;
  reference: string;
  createdAt: string;
  mix: WorkspaceMix;
  details: RateRequestDetails;
}

function payloadOf(document: RateRequestDocument, mix: WorkspaceMix): StoredPayload {
  return {
    id: document.id,
    reference: document.reference,
    createdAt: document.createdAt,
    mix,
    details: document.details,
  };
}

function readLocal(): SavedRateRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const saved = toSavedRateRequest(item);
      return saved ? [saved] : [];
    });
  } catch {
    return [];
  }
}

function writeLocal(items: SavedRateRequest[]) {
  if (typeof window === 'undefined') return;
  const payloads = items.map((item) => payloadOf(item.document, item.mix));
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(payloads));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function upsert(items: SavedRateRequest[], saved: SavedRateRequest): SavedRateRequest[] {
  const index = items.findIndex((item) => item.id === saved.id);
  if (index < 0) return [saved, ...items];
  const next = [...items];
  next[index] = { ...saved, recordId: saved.recordId ?? items[index].recordId };
  return next;
}

async function fetchRequests(): Promise<SavedRateRequest[]> {
  const response = await fetch('/api/rate-requests', { cache: 'no-store' });
  if (!response.ok) throw new Error(`failed to load rate requests: ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body)) return [];
  return body.flatMap((item) => {
    const saved = toSavedRateRequest(item);
    return saved ? [saved] : [];
  });
}

async function postRequest(payload: StoredPayload): Promise<SavedRateRequest | null> {
  const response = await fetch('/api/rate-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`failed to save rate request: ${response.status}`);
  return toSavedRateRequest(await response.json());
}

/** בקשות ששמורות בדפדפן עולות לחשבון בפעם הראשונה שמתחברים */
async function importLocalRequests(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(IMPORTED_KEY) === 'done') return;

  const local = readLocal();
  if (local.length === 0) {
    window.localStorage.setItem(IMPORTED_KEY, 'done');
    return;
  }

  try {
    for (const item of [...local].reverse()) {
      await postRequest(payloadOf(item.document, item.mix));
    }
  } catch {
    return;
  }

  window.localStorage.removeItem(LOCAL_KEY);
  window.localStorage.setItem(IMPORTED_KEY, 'done');
}

/** רשימת בקשות הריביות שהוגשו לבנקים, עם שמירה ומחיקה */
export function useRateRequests() {
  const { status } = useSession();
  const signedIn = status === 'authenticated';

  const [requests, setRequests] = useState<SavedRateRequest[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setRequests(readLocal());
      setReady(true);
      return;
    }
    try {
      setRequests(await fetchRequests());
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את הבקשות מהחשבון');
    } finally {
      setReady(true);
    }
  }, [signedIn]);

  const imported = useRef(false);
  useEffect(() => {
    if (status === 'loading') return;

    let cancelled = false;
    const load = async () => {
      if (signedIn && !imported.current) {
        imported.current = true;
        await importLocalRequests();
      }
      if (!cancelled) await refresh();
    };
    void load();

    const onChange = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [status, signedIn, refresh]);

  const save = useCallback(
    async (document: RateRequestDocument, mix: WorkspaceMix): Promise<SavedRateRequest> => {
      const payload = payloadOf(document, mix);
      const optimistic = toSavedRateRequest(payload);
      if (!optimistic) throw new Error('invalid rate request');

      setRequests((items) => upsert(items, optimistic));

      if (!signedIn) {
        writeLocal(upsert(readLocal(), optimistic));
        return optimistic;
      }

      try {
        const stored = await postRequest(payload);
        if (stored) setRequests((items) => upsert(items, stored));
        setError(null);
        return stored ?? optimistic;
      } catch {
        setError('הבקשה לא נשמרה בחשבון. בדקו את החיבור ונסו שוב.');
        return optimistic;
      }
    },
    [signedIn]
  );

  const remove = useCallback(
    async (id: string) => {
      const target = requests.find((item) => item.id === id);
      setRequests((items) => items.filter((item) => item.id !== id));

      if (!signedIn) {
        writeLocal(readLocal().filter((item) => item.id !== id));
        return;
      }

      if (!target?.recordId) return;
      try {
        await fetch(`/api/rate-requests/${target.recordId}`, { method: 'DELETE' });
      } catch {
        setError('המחיקה לא הושלמה בשרת');
      }
      await refresh();
    },
    [requests, signedIn, refresh]
  );

  return { requests, ready, error, signedIn, save, remove, refresh };
}
