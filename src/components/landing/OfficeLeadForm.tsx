'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Home, Loader2, Lock, RefreshCw, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LeadTopic } from '@/lib/advisor-lead-topics';
import { saveConsultPrefill } from '@/lib/consult-reasons';
import { CONTACTED_ADVISOR_EVENT, CONTACTED_ADVISOR_KEY } from '@/lib/contacted-advisor';
import { platformUrl } from './landingTools';

const GOALS: Array<{ topic: LeadTopic; label: string; hint: string; icon: LucideIcon }> = [
  { topic: 'HOME_NEW_MORTGAGE', label: 'לקחת משכנתא חדשה', hint: 'דירה ראשונה, משפרי דיור או השקעה', icon: Home },
  { topic: 'HOME_REFINANCE', label: 'לחסוך במשכנתא קיימת', hint: 'מיחזור המשכנתא שכבר יש לכם', icon: RefreshCw },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';

/**
 * טופס הפנייה ליועץ שבראש דף "משרד המשכנתאות הדיגיטלי": בוחרים מטרה (משכנתא
 * חדשה או מיחזור) ומשאירים פרטים. הפנייה נשלחת לאותו מסלול פניות של
 * הפלטפורמה, עם הנושא של "לקבל ייעוץ והכוונה" בעמוד הבית. לקוח מחובר לא
 * ממלא פרטים — הם נלקחים מהחשבון.
 */
export function OfficeLeadForm() {
  const { data: session, status } = useSession();
  const member = status === 'authenticated' && session?.user?.role !== 'ADVISOR' && Boolean(session?.user?.email);
  const [topic, setTopic] = useState<LeadTopic>('HOME_NEW_MORTGAGE');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!member) {
      if (name.trim().length < 2) return setError('נא להזין שם מלא');
      if (phone.replace(/\D/g, '').length < 9) return setError('נא להזין מספר טלפון תקין');
      if (!EMAIL_PATTERN.test(email.trim())) return setError('נא להזין כתובת מייל תקינה');
    }

    setBusy(true);
    try {
      const response = await fetch('/api/advisor-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          requestKind: 'GUIDANCE',
          sourcePath: window.location.pathname,
          notes: note.trim() || undefined,
          ...(member ? {} : { name: name.trim(), phone: phone.trim(), email: email.trim() }),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? 'שליחת הפנייה נכשלה. נסו שוב.');
        return;
      }
      try {
        window.localStorage.setItem(CONTACTED_ADVISOR_KEY, '1');
        window.dispatchEvent(new Event(CONTACTED_ADVISOR_EVENT));
      } catch {
        // דפדפן שחוסם אחסון מקומי — הפנייה עצמה כבר נשלחה
      }
      if (!member) saveConsultPrefill({ name: name.trim(), email: email.trim() });
      setSent(true);
    } catch {
      setError('שליחת הפנייה נכשלה. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden />
        </span>
        <p className="text-subtitle font-black text-slate-900">הפנייה התקבלה</p>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">
          יועץ משכנתאות של משכלנתא יחזור אליכם בהקדם. בינתיים אפשר לפתוח חשבון ולעקוב משם אחרי הפנייה ואחרי כל
          התהליך.
        </p>
        <a
          href={platformUrl(member ? '/dashboard' : '/auth/register?from=consult')}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-cta text-white shadow-lg transition-colors hover:bg-violet-700"
        >
          {member ? 'לאזור האישי' : 'פתיחת חשבון ומעקב אחרי הפנייה'}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-slate-700">מה תרצו לעשות?</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {GOALS.map((goal) => {
            const Icon = goal.icon;
            const active = goal.topic === topic;
            return (
              <label
                key={goal.topic}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                  active
                    ? 'border-violet-500 bg-violet-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-violet-300'
                }`}
              >
                <input
                  type="radio"
                  name="office-goal"
                  checked={active}
                  onChange={() => setTopic(goal.topic)}
                  className="sr-only"
                />
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className={`text-button font-black leading-tight ${active ? 'text-violet-900' : 'text-slate-800'}`}>
                  {goal.label}
                </span>
                <span className="hidden text-xs leading-snug text-slate-500 sm:block">{goal.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {!member && (
          <>
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
          </>
        )}
        <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
          כמה מילים על המצב שלכם <span className="font-normal text-slate-400">(רשות)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={`mt-1 min-h-[72px] ${inputClass}`}
            placeholder={
              topic === 'HOME_REFINANCE'
                ? 'למשל: יתרה של כ-800 אלף, נלקחה לפני 6 שנים'
                : 'למשל: מחפשים דירה ראשונה בסביבות 2 מיליון'
            }
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
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-cta text-white shadow-lg transition-colors hover:bg-violet-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
        שלחו ויועץ יחזור אליכם
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        הפנייה חינמית ואינה מחייבת.
      </p>
    </form>
  );
}
