'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { computeMix } from './engine';
import type { WorkspaceMix } from './engine';
import { toSavedMix } from './mixRecord';
import type { SavedMix } from './mixRecord';

export type { SavedMix } from './mixRecord';

/**
 * התמהילים נשמרים בבסיס הנתונים, ולכן הם זמינים בכל מכשיר ומשותפים בין הלקוח
 * ליועץ שלו. אחסון הדפדפן נשאר רק עבור מי שעדיין לא התחבר, ומה שנשמר בו מיובא
 * לחשבון בפעם הראשונה שמתחברים.
 */
const LOCAL_KEY = 'mashklanta:saved-mixes';
const IMPORTED_KEY = 'mashklanta:saved-mixes-imported';
const CHANGE_EVENT = 'mashklanta:saved-mixes-changed';

function readLocal(): SavedMix[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const saved = toSavedMix(item);
      return saved ? [saved] : [];
    });
  } catch {
    return [];
  }
}

function writeLocal(items: SavedMix[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function snapshot(mix: WorkspaceMix): SavedMix {
  return {
    mix: { ...mix, updatedAt: new Date().toISOString() },
    summary: computeMix(mix).summary,
    savedAt: new Date().toISOString(),
  };
}

function upsert(items: SavedMix[], saved: SavedMix): SavedMix[] {
  const index = items.findIndex((item) => item.mix.id === saved.mix.id);
  if (index < 0) return [saved, ...items];
  const next = [...items];
  next[index] = { ...saved, recordId: saved.recordId ?? items[index].recordId };
  return next;
}

async function fetchMixes(clientId?: string): Promise<SavedMix[]> {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
  const response = await fetch(`/api/mixes${query}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`failed to load mixes: ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body)) return [];
  return body.flatMap((item) => {
    const saved = toSavedMix(item);
    return saved ? [saved] : [];
  });
}

async function postMix(
  mix: WorkspaceMix,
  extras?: { clientId?: string | null; planId?: string | null }
): Promise<SavedMix | null> {
  const payload: Record<string, unknown> = { mix };
  if (extras?.clientId !== undefined) payload.clientId = extras.clientId;
  if (extras?.planId !== undefined) payload.planId = extras.planId;
  const response = await fetch('/api/mixes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`failed to save mix: ${response.status}`);
  return toSavedMix(await response.json());
}

/**
 * תמהילים ששמורים בדפדפן מגרסה קודמת עוברים לחשבון בפעם הראשונה שמתחברים,
 * ואז נמחקים מהדפדפן כדי שלא יישארו שני מקורות אמת.
 */
async function importLocalMixes(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.localStorage.getItem(IMPORTED_KEY) === 'done') return false;

  const local = readLocal();
  if (local.length === 0) {
    window.localStorage.setItem(IMPORTED_KEY, 'done');
    return false;
  }

  try {
    // הישן נשמר אחרון כדי שהחדש יופיע בראש הרשימה
    for (const item of [...local].reverse()) {
      await postMix(item.mix);
    }
  } catch {
    return false;
  }

  window.localStorage.removeItem(LOCAL_KEY);
  window.localStorage.setItem(IMPORTED_KEY, 'done');
  return true;
}

interface UseSavedMixesOptions {
  /** הצגת התמהילים של לקוח מסוים במקום כל התמהילים של המשתמש */
  clientId?: string;
  /** שיוך שמירות חדשות לתהליך משכנתא */
  planId?: string;
}

/**
 * רשימת התמהילים השמורים. מחוברים — מבסיס הנתונים; לא מחוברים — מהדפדפן, עם
 * סימון ברור שהשמירה עדיין מקומית.
 */
export function useSavedMixes(options: UseSavedMixesOptions = {}) {
  const { clientId, planId } = options;
  const { status } = useSession();
  const signedIn = status === 'authenticated';

  const [saved, setSaved] = useState<SavedMix[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setSaved(readLocal());
      setReady(true);
      return;
    }
    try {
      setSaved(await fetchMixes(clientId));
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את התמהילים מהחשבון');
    } finally {
      setReady(true);
    }
  }, [signedIn, clientId]);

  const imported = useRef(false);
  useEffect(() => {
    if (status === 'loading') return;

    let cancelled = false;
    const load = async () => {
      if (signedIn && !imported.current) {
        imported.current = true;
        await importLocalMixes();
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
    async (mix: WorkspaceMix, targetClientId?: string | null): Promise<SavedMix> => {
      const optimistic = snapshot(mix);
      // התצוגה מתעדכנת מיד, והשרת מחזיר אחר כך את הרשומה עם המזהה שלה
      setSaved((items) => upsert(items, optimistic));

      if (!signedIn) {
        writeLocal(upsert(readLocal(), optimistic));
        return optimistic;
      }

      try {
        const stored = await postMix(mix, {
          clientId: targetClientId ?? clientId,
          planId,
        });
        if (stored) setSaved((items) => upsert(items, stored));
        setError(null);
        return stored ?? optimistic;
      } catch {
        setError('התמהיל לא נשמר בחשבון. בדקו את החיבור ונסו שוב.');
        return optimistic;
      }
    },
    [signedIn, clientId, planId]
  );

  const recordIdOf = useCallback(
    (mixId: string) => saved.find((item) => item.mix.id === mixId)?.recordId,
    [saved]
  );

  const remove = useCallback(
    async (mixId: string) => {
      setSaved((items) => items.filter((item) => item.mix.id !== mixId));

      if (!signedIn) {
        writeLocal(readLocal().filter((item) => item.mix.id !== mixId));
        return;
      }

      const recordId = recordIdOf(mixId);
      if (!recordId) return;
      try {
        await fetch(`/api/mixes/${recordId}`, { method: 'DELETE' });
      } catch {
        setError('המחיקה לא הושלמה בשרת');
      }
      await refresh();
    },
    [signedIn, recordIdOf, refresh]
  );

  const rename = useCallback(
    async (mixId: string, name: string) => {
      setSaved((items) =>
        items.map((item) =>
          item.mix.id === mixId ? { ...item, mix: { ...item.mix, name } } : item
        )
      );

      if (!signedIn) {
        writeLocal(
          readLocal().map((item) =>
            item.mix.id === mixId
              ? { ...item, mix: { ...item.mix, name, updatedAt: new Date().toISOString() } }
              : item
          )
        );
        return;
      }

      const recordId = recordIdOf(mixId);
      if (!recordId) return;
      try {
        await fetch(`/api/mixes/${recordId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
      } catch {
        setError('שינוי השם לא נשמר בשרת');
      }
    },
    [signedIn, recordIdOf]
  );

  /** שיוך תמהיל קיים ללקוח, או ניתוק השיוך */
  const assign = useCallback(
    async (mixId: string, targetClientId: string | null) => {
      if (!signedIn) return;
      const recordId = recordIdOf(mixId);
      if (!recordId) return;
      await fetch(`/api/mixes/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: targetClientId }),
      });
      await refresh();
    },
    [signedIn, recordIdOf, refresh]
  );

  return { saved, ready, error, signedIn, save, remove, rename, assign, refresh };
}
