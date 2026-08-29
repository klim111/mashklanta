'use client';

import { PROFILE_FIELD_LABELS } from '@/lib/client-profile';
import type { ProfileAnalysisKey } from '@/lib/client-profile';

export function ProfileSyncDialog({
  keys,
  onAccept,
  onDecline,
}: {
  keys: ProfileAnalysisKey[];
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (keys.length === 0) return null;
  const labels = keys.map((key) => PROFILE_FIELD_LABELS[key] || key);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <div
        dir="rtl"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="profile-sync-title"
      >
        <h3 id="profile-sync-title" className="text-lg font-black text-slate-900">
          לעדכן גם בפרופיל ההגדרות?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          שיניתם {labels.join(', ')} במשכנתא הזו. אם תעדכנו את ההגדרות, הערך החדש ייטען גם
          במשכנתאות הבאות. אם לא — השינוי יישמר רק לתהליך הזה.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-700"
          >
            כן, עדכנו גם בהגדרות
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            לא, רק למשכנתא הזו
          </button>
        </div>
      </div>
    </div>
  );
}
