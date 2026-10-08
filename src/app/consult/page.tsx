'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react';
import NavBar from '@/components/ui/navbar';
import Footer from '@/components/ui/footer';
import {
  CONSULT_REASONS,
  consultReason,
  saveConsultPrefill,
  type ConsultReason,
} from '@/lib/consult-reasons';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-violet-500';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * עמוד בקשת ליווי — היעד של "היוועצו איתנו" בסרגל העליון.
 *
 * הבקשה נשלחת ליועץ כבקשת ליווי, עם הסיבה שנבחרה ועם העמוד שממנו נשלחה. אורח
 * עובר אחר כך להרשמה, עם השם והמייל כבר ממולאים; משתמש מחובר נשאר כאן ורואה אישור.
 */
function ConsultForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);

  const [reason, setReason] = useState<ConsultReason>(
    consultReason(params.get('reason'))?.id ?? 'bank-offer'
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // בחירה מהתפריט כשהעמוד כבר פתוח מחליפה את הסיבה
  useEffect(() => {
    const fromUrl = consultReason(params.get('reason'));
    if (fromUrl) setReason(fromUrl.id);
  }, [params]);

  useEffect(() => {
    if (!session?.user) return;
    setName((current) => current || session.user?.name || '');
    setEmail((current) => current || session.user?.email || '');
  }, [session]);

  const selected = consultReason(reason) ?? CONSULT_REASONS[0];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('נא להזין שם מלא');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      setError('נא להזין מספר טלפון תקין');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('נא להזין כתובת מייל תקינה');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/advisor-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selected.topic,
          requestKind: 'GUIDANCE',
          sourcePath: `/consult/${selected.id}`,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: note.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'שליחת הבקשה נכשלה. נסו שוב.');
        return;
      }
      if (signedIn) {
        setSent(true);
        return;
      }
      saveConsultPrefill({ name: name.trim(), email: email.trim() });
      router.push('/auth/register?from=consult');
    } catch {
      setError('שליחת הבקשה נכשלה. בדקו את החיבור ונסו שוב.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-xl sm:p-10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-title font-black text-slate-900">הבקשה נשלחה ליועץ</h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-600">
          יועץ משכלנתא יחזור אליכם בהקדם. אפשר להמשיך לכתוב לו גם מהצ׳אט באזור האישי.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-cta text-white shadow-lg transition-colors hover:bg-blue-700 sm:w-auto"
        >
          לאזור האישי
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8 md:p-10" noValidate>
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-800">
          <MessageCircle className="h-3.5 w-3.5" />
          בקשת ליווי
        </span>
        <h1 className="mt-3 text-title font-black text-slate-900">היוועצו עם יועץ משכלנתא</h1>
        <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-slate-600">
          ספרו לנו במה לעזור והשאירו פרטים. הבקשה מגיעה ישירות ליועץ, והוא יחזור אליכם.
        </p>
      </div>

      <fieldset className="mt-8">
        <legend className="mb-3 text-sm font-bold text-slate-700">במה נעזור?</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {CONSULT_REASONS.map((option) => {
            const Icon = option.icon;
            const active = option.id === reason;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-all md:flex-col ${
                  active
                    ? 'border-violet-500 bg-violet-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-violet-300'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={option.id}
                  checked={active}
                  onChange={() => setReason(option.id)}
                  className="sr-only"
                />
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold leading-snug text-slate-900">{option.label}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-500">{option.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
          שם מלא
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`mt-1.5 ${inputClass}`}
            placeholder="ישראל ישראלי"
            autoComplete="name"
            required
          />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          טלפון
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={`mt-1.5 text-right ${inputClass}`}
            placeholder="050-0000000"
            autoComplete="tel"
            inputMode="tel"
            dir="ltr"
            required
          />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          מייל
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`mt-1.5 text-right ${inputClass}`}
            placeholder="name@example.com"
            autoComplete="email"
            dir="ltr"
            required
          />
        </label>
        <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
          כמה מילים ליועץ <span className="font-normal text-slate-400">(רשות)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={`mt-1.5 min-h-[96px] ${inputClass}`}
            placeholder="למשל: קיבלנו אישור עקרוני מבנק לאומי ורוצים לדעת אם הריביות טובות"
            maxLength={1500}
          />
        </label>
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-cta text-white shadow-lg transition-colors hover:bg-violet-700 disabled:opacity-60"
      >
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        שליחת הבקשה ליועץ
      </button>
      {!signedIn && (
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">
          אחרי השליחה תוכלו לפתוח חשבון בפלטפורמה, לנהל בה את התהליך ולדבר עם היועץ.
        </p>
      )}
    </form>
  );
}

export default function ConsultPage() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="relative z-50 border-b border-slate-100 bg-white/98 shadow-sm backdrop-blur-sm">
        <NavBar />
      </div>
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-14">
        <Suspense fallback={null}>
          <ConsultForm />
        </Suspense>
      </main>
      <div className="bg-slate-900 text-white">
        <Footer />
      </div>
    </div>
  );
}
