'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, HeartHandshake, Home, Loader2, MessageSquareText, RefreshCw, Send, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { LeadTopic } from '@/lib/advisor-lead-topics';
import { saveConsultPrefill } from '@/lib/consult-reasons';

const OPTIONS: Array<{ topic: LeadTopic; label: string; icon: LucideIcon }> = [
  { topic: 'HOME_NEW_MORTGAGE', label: 'ליווי בלקיחת משכנתא חדשה', icon: Home },
  { topic: 'HOME_REFINANCE', label: 'ליווי במיחזור / גרירה', icon: RefreshCw },
  { topic: 'FAMILY_ECONOMY', label: 'עזרה בכלכלת המשפחה', icon: Wallet },
  { topic: 'FOUND_PROPERTY_DONT_KNOW', label: 'לא יודע/ת ממה להתחיל', icon: Compass },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "לקבל ייעוץ והכוונה" בעמוד הבית, לאורח: במה לעזור, פרטי קשר והסבר רשות.
 * הפנייה מגיעה ליועץ כבקשת ליווי מדף הבית, ואחריה האורח עובר להרשמה כדי לעקוב
 * אחרי סטטוס הפנייה — עם השם והמייל כבר ממולאים.
 */
export function GuestAdviceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [topic, setTopic] = useState<LeadTopic>('HOME_NEW_MORTGAGE');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError('נא להזין שם מלא');
    if (phone.replace(/\D/g, '').length < 9) return setError('נא להזין מספר טלפון תקין');
    if (!EMAIL_PATTERN.test(email.trim())) return setError('נא להזין כתובת מייל תקינה');

    setBusy(true);
    try {
      const response = await fetch('/api/advisor-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          requestKind: 'GUIDANCE',
          sourcePath: '/',
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: note.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? 'שליחת הפנייה נכשלה. נסו שוב.');
        return;
      }
      saveConsultPrefill({ name: name.trim(), email: email.trim() });
      router.push('/auth/register?from=consult');
    } catch {
      setError('שליחת הפנייה נכשלה. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92svh] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-0 shadow-2xl">
        <form onSubmit={submit} className="p-5 text-right sm:p-8" noValidate>
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-subtitle font-black text-slate-900">לקבל ייעוץ והכוונה</DialogTitle>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                ספרו במה לעזור והשאירו פרטים. יועץ משכלנתא יחזור אליכם.
              </p>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-700">במה נעזור?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = option.topic === topic;
                return (
                  <label
                    key={option.topic}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors ${
                      active ? 'border-violet-500 bg-violet-50 text-violet-900' : 'border-slate-200 text-slate-700 hover:border-violet-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="advice-topic"
                      checked={active}
                      onChange={() => setTopic(option.topic)}
                      className="sr-only"
                    />
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-violet-600' : 'text-slate-400'}`} />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
              שם מלא
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={`mt-1 ${inputClass}`}
                placeholder="ישראל ישראלי"
                autoComplete="name"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              טלפון
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={`mt-1 text-right ${inputClass}`}
                placeholder="050-0000000"
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              מייל
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`mt-1 text-right ${inputClass}`}
                placeholder="name@example.com"
                autoComplete="email"
                dir="ltr"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
              הסבר על הפנייה <span className="font-normal text-slate-400">(רשות)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={`mt-1 min-h-[84px] ${inputClass}`}
                placeholder="כמה מילים על המצב שלכם ובמה תרצו עזרה"
                maxLength={1500}
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-cta text-white shadow-lg transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            שליחת הפנייה ליועץ
          </button>
          <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-sm leading-relaxed text-slate-500">
            <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            אחרי השליחה תוכלו להירשם למשכלנתא ולעקוב אחרי סטטוס הפנייה.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
