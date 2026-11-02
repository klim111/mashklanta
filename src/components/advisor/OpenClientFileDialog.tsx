'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';

/** פתיחת תיק לקוח מתעניין בשרת. מחזיר את מזהה הכרטיס, או זורק עם הודעה בעברית */
export async function openClientFile(input: {
  name: string;
  phone?: string;
  email?: string;
  note?: string;
}): Promise<{ id: string; created: boolean }> {
  const response = await fetch('/api/advisor/prospects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => null);
  const body = await response?.json().catch(() => null);
  if (!response?.ok || typeof body?.id !== 'string') {
    throw new Error(body?.error ?? 'לא הצלחנו לפתוח את התיק. נסו שוב');
  }
  return { id: body.id, created: body.created !== false };
}

/**
 * "פתח תיק לקוח" — לקוח מתעניין שעדיין לא נרשם (src/lib/prospect-client.ts).
 *
 * נפתח מתוך פגישה ומכל מקום אחר באזור היועץ (למשל מהמשימות). הלקוח מופיע מיד
 * ברשימת הלקוחות. בלי `onOpened` — אחרי הפתיחה עוברים לכרטיס הלקוח, שבו
 * בוחרים משכנתא חדשה, מיחזור או ליווי כלכלת המשפחה.
 */
export function OpenClientFileDialog({
  open,
  onOpenChange,
  defaultName = '',
  defaultPhone = '',
  defaultEmail = '',
  note,
  onOpened,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
  /** הערה שנשמרת בתיק, למשל מאיזו פגישה או משימה הוא נפתח */
  note?: string;
  onOpened?: (clientId: string, created: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setPhone(defaultPhone);
    setEmail(defaultEmail);
    setError(null);
  }, [open, defaultName, defaultPhone, defaultEmail]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('נדרש שם ללקוח');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await openClientFile({ name: name.trim(), phone: phone.trim(), email: email.trim(), note });
      onOpenChange(false);
      if (onOpened) onOpened(result.id, result.created);
      else router.push(`/advisor-dashboard/client/${result.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'לא הצלחנו לפתוח את התיק');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md text-right">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <FolderPlus className="h-5 w-5 text-emerald-600" />
            פתיחת תיק לקוח
          </DialogTitle>
          <DialogDescription className="text-right">
            הלקוח נפתח כמתעניין שעדיין לא נרשם, ומופיע ברשימת הלקוחות שלך. כל מה שתזינו בכלים נשמר בתיק. אחר כך שולחים לו מדף הלקוח
            פרטי כניסה, והוא יראה את כל זה באזור האישי שלו.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-bold text-slate-700">
            שם מלא
            <input className={`${inputClass} mt-1`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            טלפון
            <input
              className={`${inputClass} mt-1`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              dir="ltr"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            מייל <span className="font-normal text-slate-500">(לפיו התיק יעבור ללקוח כשיירשם)</span>
            <input
              className={`${inputClass} mt-1`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              dir="ltr"
            />
          </label>
          {error && <p className="rounded-xl bg-rose-50 p-2.5 text-sm font-bold text-rose-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            פתיחת התיק
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
