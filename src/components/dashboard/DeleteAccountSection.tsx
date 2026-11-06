'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface AccountInfo {
  confirmValue: string;
  hasPassword: boolean;
  canDelete: boolean;
}

/**
 * הסרת החשבון מההגדרות. לפני המחיקה הלקוח מאשר שהבין שהכל נמחק, מקליד את המייל
 * של החשבון, ובחשבון עם סיסמה — גם את הסיסמה.
 */
export function DeleteAccountSection() {
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/account', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setInfo(body))
      .catch(() => setInfo(null));
  }, []);

  if (!info?.canDelete) return null;

  const reset = () => {
    setUnderstood(false);
    setConfirm('');
    setPassword('');
    setError(null);
  };

  const typedMatches = confirm.trim().toLowerCase() === info.confirmValue.toLowerCase();
  const ready = understood && typedMatches && (!info.hasPassword || password.length > 0);

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'הסרת החשבון נכשלה');
      await signOut({ callbackUrl: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הסרת החשבון נכשלה');
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm md:p-8">
      <h3 className="font-black text-slate-900">הסרת החשבון</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
        הסרת החשבון מוחקת מהפלטפורמה את כל המידע שלכם: הפרטים והפרופיל, התהליכים והתמהילים, המסמכים
        והקבצים שהעליתם, השיחות והמיילים עם היועץ והמשימות. רק רשומות התשלומים נשמרות, לצורכי הנהלת חשבונות. אי אפשר לשחזר את המידע אחרי
        המחיקה. אפשר להירשם שוב בעתיד עם אותו מייל, כחשבון חדש.
      </p>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-5 py-2.5 text-button font-black text-rose-700 hover:bg-rose-50"
      >
        <Trash2 className="h-4 w-4" />
        הסרת החשבון
      </button>

      <Dialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl bg-white p-7 text-right">
          <span className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
            <AlertTriangle className="h-7 w-7 text-rose-600" />
          </span>
          <DialogTitle className="text-center text-subtitle font-black text-slate-900">
            להסיר את החשבון לצמיתות?
          </DialogTitle>
          <DialogDescription className="text-info leading-relaxed text-slate-600">
            כל המידע שלכם יימחק מהפלטפורמה, כולל כל המסמכים והקבצים וכל הרשומות שקשורות לחשבון. היועץ
            לא יראה יותר את התיק שלכם. הפעולה סופית ואין אפשרות לשחזר.
          </DialogDescription>

          <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-800">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-rose-600"
            />
            הבנתי שכל המידע והמסמכים שלי יימחקו ולא ניתן יהיה לשחזר אותם
          </label>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              לאישור, הקלידו את {info.confirmValue.includes('@') ? 'כתובת המייל' : 'שם הכניסה'} של החשבון:{' '}
              <span dir="ltr" className="font-black text-slate-900">
                {info.confirmValue}
              </span>
            </label>
            <input
              dir="ltr"
              type="text"
              autoComplete="off"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
            />
          </div>

          {info.hasPassword && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">הסיסמה של החשבון</label>
              <input
                dir="ltr"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
          )}

          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => void remove()}
              disabled={!ready || deleting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-button font-black text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              מחיקת החשבון וכל המידע
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={deleting}
              className="flex-1 rounded-xl border border-slate-200 px-5 py-2.5 text-button font-black text-slate-700 hover:bg-slate-50"
            >
              ביטול
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
