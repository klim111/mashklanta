'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, MessageSquareText, Send, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { GOAL_LABELS, SERVICE_LABELS, leadTopicFor } from '@/lib/service-flow';
import type { MortgageGoal, ServiceType } from '@/lib/service-flow';
import {
  CONTACTED_ADVISOR_EVENT,
  CONTACTED_ADVISOR_KEY,
} from '@/components/plan/advisor/AdvisorLeadDialog';

export interface GuidanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: MortgageGoal;
  serviceType: ServiceType;
  /**
   * אורח מזין את פרטיו; משתמש רשום שולח עם פרטי החשבון ויכול רק להוסיף
   * טלפון והערה.
   */
  mode: 'guest' | 'member';
  memberName?: string;
  memberEmail?: string;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

/**
 * בקשת ליווי ליועצים.
 *
 * אחרי השליחה מוצג מסך האישור — "היועץ קיבל את בקשתכם" — והבקשה מופיעה אצל
 * היועצים בלשונית בקשות הליווי, עם ההערה אם הלקוח בחר להוסיף אותה.
 */
export function GuidanceRequestDialog({
  open,
  onOpenChange,
  goal,
  serviceType,
  mode,
  memberName,
  memberEmail,
}: GuidanceRequestDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // כל פתיחה מתחילה נקי, כדי שבקשה שנייה לא תציג את האישור של הראשונה
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setError(null);
    setBusy(false);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/advisor-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: leadTopicFor(goal, serviceType),
          name: mode === 'guest' ? name : undefined,
          email: mode === 'guest' ? email : undefined,
          phone: phone || undefined,
          notes: note.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'שליחת הבקשה נכשלה. נסו שוב.');
        return;
      }
      // הדאשבורד מציג מסך פתיחה אחר אחרי הפנייה הראשונה ליועץ
      try {
        window.localStorage.setItem(CONTACTED_ADVISOR_KEY, '1');
        window.dispatchEvent(new Event(CONTACTED_ADVISOR_EVENT));
      } catch {
        // דפדפן שחוסם אחסון מקומי — הבקשה עצמה כבר נשלחה
      }
      setSent(true);
      setNote('');
    } catch {
      setError('שליחת הבקשה נכשלה. נסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg rounded-3xl border-0 bg-white p-0 shadow-2xl">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-8 py-10 text-center"
          >
            <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </span>
            <DialogTitle className="text-2xl font-black text-slate-900">
              היועץ קיבל את בקשתכם ויצור עמכם קשר בהקדם
            </DialogTitle>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              הבקשה ל{SERVICE_LABELS[serviceType].title} ({GOAL_LABELS[goal].title}) נרשמה אצל היועצים
              שלנו, עם ההערה שלכם אם הוספתם. בינתיים אפשר להמשיך לעבוד בפלטפורמה — כל מה שתזינו
              יעמוד לרשות היועץ.
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-700"
            >
              סגירה
            </button>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="p-6 md:p-8">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg">
                <MessageSquareText className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">
                  בקשת {SERVICE_LABELS[serviceType].title}
                </DialogTitle>
                <p className="mt-0.5 text-sm text-slate-500">
                  {GOAL_LABELS[goal].title} · יועץ יחזור אליכם בהקדם
                </p>
              </div>
            </div>

            {mode === 'member' ? (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-bold text-slate-900">הבקשה תישלח עם פרטי החשבון שלכם</p>
                  <p className="truncate text-xs text-slate-500">
                    {memberName || 'ללא שם'} · {memberEmail}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">
                  שם מלא
                  <input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={`mt-1 ${inputClass}`}
                    placeholder="איך לפנות אליכם"
                    autoComplete="name"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  אימייל
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={`mt-1 ${inputClass}`}
                    placeholder="name@example.com"
                    autoComplete="email"
                    dir="ltr"
                  />
                </label>
              </div>
            )}

            <label className="block text-xs font-bold text-slate-600">
              טלפון לחזרה <span className="font-normal text-slate-400">(רשות)</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={`mt-1 ${inputClass}`}
                placeholder="050-0000000"
                autoComplete="tel"
                dir="ltr"
                inputMode="tel"
              />
            </label>

            <label className="mt-3 block text-xs font-bold text-slate-600">
              הערה ליועץ <span className="font-normal text-slate-400">(רשות)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                maxLength={2000}
                className={`mt-1 resize-none ${inputClass}`}
                placeholder="מה חשוב שהיועץ ידע לפני השיחה — מצב, לוחות זמנים, שאלות פתוחות"
              />
            </label>

            {error && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                שליחת הבקשה ליועץ
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
