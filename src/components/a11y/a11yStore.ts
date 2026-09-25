'use client';

import { useSyncExternalStore } from 'react';

import {
  DEFAULT_PREFS,
  MAX_TEXT_SCALE,
  PREF_CLASSES,
  STORAGE_KEY,
  type A11yPrefs,
} from './a11yConfig';

const listeners = new Set<() => void>();
let current: A11yPrefs | null = null;

function read(): A11yPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    // מצב גלישה פרטית או אחסון חסום — ממשיכים עם ברירת המחדל
  }
  return DEFAULT_PREFS;
}

function apply(prefs: A11yPrefs) {
  const root = document.documentElement;
  for (const [key, cls] of Object.entries(PREF_CLASSES)) {
    root.classList.toggle(cls, Boolean(prefs[key as keyof typeof PREF_CLASSES]));
  }
  for (let i = 1; i <= MAX_TEXT_SCALE; i++) {
    root.classList.toggle(`a11y-text-${i}`, prefs.textScale === i);
  }
}

function getSnapshot(): A11yPrefs {
  if (!current) current = read();
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setA11yPrefs(next: A11yPrefs) {
  current = next;
  apply(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ההעדפה תחול עד רענון הדף גם בלי שמירה
  }
  listeners.forEach((listener) => listener());
}

export function useA11yPrefs(): A11yPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PREFS);
}
