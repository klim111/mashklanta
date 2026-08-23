'use client';

import { useCallback, useEffect, useState } from 'react';
import { computeMix, sanitizeMix } from './engine';
import type { MixSummary, WorkspaceMix } from './engine';

const STORAGE_KEY = 'mashklanta:saved-mixes';
const CHANGE_EVENT = 'mashklanta:saved-mixes-changed';

export interface SavedMix {
  mix: WorkspaceMix;
  /** תמונת מצב של הסיכום בזמן השמירה, לתצוגה מהירה ברשימות */
  summary: MixSummary;
  savedAt: string;
}

/** האם הסיכום ששמור לצד התמהיל שלם, או שצריך לחשב אותו מחדש. */
function summaryIsUsable(summary: unknown): summary is MixSummary {
  if (!summary || typeof summary !== 'object') return false;
  const required: Array<keyof MixSummary> = [
    'monthlyPayment',
    'totalInterest',
    'totalPaid',
    'averageRate',
    'months',
    'costPerShekel',
  ];
  return required.every((key) => {
    const value = (summary as Record<string, unknown>)[key];
    return typeof value === 'number' && Number.isFinite(value);
  });
}

/**
 * תמהילים שנשמרו בגרסאות קודמות עלולים להכיל שדות חסרים או פגומים, ולכן כל
 * קריאה מהאחסון עוברת תיקון לפני שהיא מגיעה לתצוגה או לחישוב.
 */
function read(): SavedMix[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): SavedMix[] => {
      const mix = sanitizeMix(item?.mix);
      if (!mix) return [];
      const summary = summaryIsUsable(item?.summary) ? item.summary : computeMix(mix).summary;
      const savedAt = typeof item?.savedAt === 'string' ? item.savedAt : mix.updatedAt;
      return [{ mix, summary, savedAt }];
    });
  } catch {
    return [];
  }
}

function write(items: SavedMix[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * שמירת עותק על השרת היא "מיטב המאמץ": התמהילים נשמרים מקומית תמיד, וגם אם
 * המשתמש לא מחובר או שהשרת אינו זמין השמירה מצליחה ולא נאבד מידע.
 */
async function pushToServer(saved: SavedMix): Promise<void> {
  try {
    await fetch('/api/calculations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputsJson: { kind: 'mortgage-mix', mix: saved.mix },
        resultsJson: saved.summary,
      }),
    });
  } catch {
    // נשמר מקומית — אין צורך להפריע ליועץ
  }
}

export function listSavedMixes(): SavedMix[] {
  return read();
}

export function persistMix(mix: WorkspaceMix): SavedMix {
  const summary = computeMix(mix).summary;
  const saved: SavedMix = {
    mix: { ...mix, updatedAt: new Date().toISOString() },
    summary,
    savedAt: new Date().toISOString(),
  };

  const items = read();
  const index = items.findIndex((item) => item.mix.id === mix.id);
  if (index >= 0) items[index] = saved;
  else items.unshift(saved);

  write(items);
  void pushToServer(saved);
  return saved;
}

export function removeSavedMix(id: string) {
  write(read().filter((item) => item.mix.id !== id));
}

export function renameSavedMix(id: string, name: string) {
  write(
    read().map((item) =>
      item.mix.id === id ? { ...item, mix: { ...item.mix, name, updatedAt: new Date().toISOString() } } : item
    )
  );
}

/** רשימת התמהילים השמורים, מסונכרנת בין הטאבים ובין רכיבים באותו עמוד. */
export function useSavedMixes() {
  const [saved, setSaved] = useState<SavedMix[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setSaved(read()), []);

  useEffect(() => {
    refresh();
    setReady(true);
    const onChange = () => refresh();
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  const save = useCallback((mix: WorkspaceMix) => {
    const result = persistMix(mix);
    refresh();
    return result;
  }, [refresh]);

  const remove = useCallback((id: string) => {
    removeSavedMix(id);
    refresh();
  }, [refresh]);

  const rename = useCallback((id: string, name: string) => {
    renameSavedMix(id, name);
    refresh();
  }, [refresh]);

  return { saved, ready, save, remove, rename, refresh };
}
