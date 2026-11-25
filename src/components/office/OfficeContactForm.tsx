'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Home, Loader2, RefreshCw, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LeadTopic } from '@/lib/advisor-lead-topics';
import { saveConsultPrefill } from '@/lib/consult-reasons';
import { CONTACTED_ADVISOR_EVENT, CONTACTED_ADVISOR_KEY } from '@/lib/contacted-advisor';

const GOALS: Array<{ topic: LeadTopic; label: string; icon: LucideIcon }> = [
  { topic: 'HOME_NEW_MORTGAGE', label: 'משכנתא חדשה', icon: Home },
  { topic: 'HOME_REFINANCE', label: 'מיחזור משכנתא', icon: RefreshCw },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--office)]';

/**
 * "השאירו פרטים" בדף המשרד. הפנייה נשלחת לתיבת הפניות של היועץ של המשרד
 * (`office` בבקשה), ולא ליועץ של הפלטפורמה. לקוח מחובר לא ממלא פרטים — הם
 * נלקחים מהחשבון.
 */
export function OfficeContactForm({
  slug,
  advisorName,
  disabled = false,
}: {
  slug: string;
  advisorName: string;
  /** תצוגה מקדימה של משרד שעוד לא פעיל — הטופס מוצג אבל לא שולח */
  disabled?: boolean;
}) {
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
    if (disabled) return setError('זו תצוגה מקדימה. הטופס ישלח פניות אחרי שתפעילו את המשרד.');
    if (!member) {
      if (name.trim().length < 2) return setError('נא להזין שם מלא');
      if (phone.replace(/\D/g, '').length < 9) return setError('נא להזין מספר טלפון תקין');
      if (email.trim() && !EMAIL_PATTERN.test(email.trim())) return setError('כתובת המייל לא תקינה');
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
          office: slug,
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
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden />
        </span>
        <p className="text-center text-subtitle font-black text-slate-900">הפנייה התקבלה</p>
        <p className="max-w-sm text-center text-sm leading-relaxed text-slate-600">
          {advisorName} יחזור אליכם בהקדם. בינתיים אפשר לפתוח תיק אישי ולהתחיל להעלות מסמכים.
        </p>
        <a
          href={member ? '/dashboard' : `/auth/register?office=${encodeURIComponent(slug)}`}
          className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[var(--office)] px-6 py-3 text-cta text-white shadow-md transition-colors hover:bg-[var(--office-dark)]"
        >
          {member ? 'לאזור האישי' : 'פתיחת תיק אישי'}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-slate-700">במה אפשר לעזור?</legend>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((goal) => {
            const Icon = goal.icon;
            const active = goal.topic === topic;
            return (
              <label
                key={goal.topic}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-2 py-2.5 text-button font-black transition-colors ${
                  active
                    ? 'border-[var(--office)] bg-[var(--office-soft)] text-[var(--office-dark)]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="office-goal"
                  checked={active}
                  onChange={() => setTopic(goal.topic)}
                  className="sr-only"
                />
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {goal.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {!member && (
          <>
            <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
              שם מלא
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={`mt-1 ${inputClass}`}
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
              מייל <span className="font-normal text-slate-400">(רשות)</span>
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
          כמה מילים על המצב <span className="font-normal text-slate-400">(רשות)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={`mt-1 min-h-[64px] ${inputClass}`}
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
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--office)] px-6 py-3 text-cta text-white shadow-md transition-colors hover:bg-[var(--office-dark)] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
        שליחה
      </button>
      <p className="mt-2 text-center text-2xs text-slate-400">הפרטים מגיעים רק אל {advisorName}.</p>
    </form>
  );
}
