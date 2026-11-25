'use client';

import type { MortgageMix } from '../types';
import { toWorkspaceMix } from '../engine';
import type { WorkspaceMix } from '../engine';

const LEGACY_KEY = 'mortgage-advisor-state';

/**
 * מסכי הכניסה לכלי (למשל /uniform-mixes) מעבירים תמהילים דרך מפתח האחסון הישן.
 * הפונקציה קוראת אותם, ממירה למודל של מסך העבודה ומנקה את המפתח כדי שהייבוא
 * יקרה פעם אחת בלבד ולא יידרוס עבודה קיימת בכל טעינה.
 */
export function consumeLegacyAdvisorMixes(): WorkspaceMix[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    window.localStorage.removeItem(LEGACY_KEY);

    const parsed = JSON.parse(raw) as { mixes?: MortgageMix[] };
    if (!Array.isArray(parsed?.mixes) || parsed.mixes.length === 0) return [];

    return parsed.mixes
      .filter((mix) => Array.isArray(mix?.tracks) && mix.tracks.length > 0)
      .map((mix, index) => {
        const converted = toWorkspaceMix(mix);
        return { ...converted, name: mix.name?.trim() || `סל אחיד ${index + 1}` };
      });
  } catch {
    window.localStorage.removeItem(LEGACY_KEY);
    return [];
  }
}
