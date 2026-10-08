'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Home, KeyRound, Loader2, Mail, MailCheck } from 'lucide-react';

/** "שכחתי סיסמה": הלקוח מזין את המייל ומקבל קישור לבחירת סיסמה חדשה */
function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'לא הצלחנו לשלוח את הקישור. נסו שוב.');
        return;
      }
      setSentTo(email.trim().toLowerCase());
    } catch {
      setError('לא הצלחנו לשלוח את הקישור. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-10 sm:items-center sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
              {sentTo ? <MailCheck className="h-8 w-8 text-white" /> : <KeyRound className="h-8 w-8 text-white" />}
            </div>
            <h1 className="text-title font-bold text-slate-900">{sentTo ? 'בדקו את תיבת המייל' : 'שכחתי סיסמה'}</h1>
            <p className="mt-2 text-info text-slate-600">
              {sentTo
                ? 'אם קיים חשבון עם הכתובת הזו, שלחנו אליה קישור לבחירת סיסמה חדשה. הקישור תקף ל-60 דקות ולשימוש אחד.'
                : 'הזינו את כתובת המייל של החשבון, ונשלח אליה קישור לבחירת סיסמה חדשה.'}
            </p>
            {sentTo && (
              <p dir="ltr" className="mt-3 font-bold text-slate-900">
                {sentTo}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {sentTo ? (
            <div className="space-y-3 text-center text-sm text-slate-600">
              <p>לא הגיע? בדקו גם בתיקיית הספאם, או שלחו שוב בעוד דקה.</p>
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                שליחה שוב או לכתובת אחרת
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  כתובת מייל
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    dir="ltr"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 pl-12 text-right focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-button font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" />}
                שליחת קישור לבחירת סיסמה חדשה
              </button>
            </form>
          )}

          <p className="mt-6 border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
            נזכרתם?{' '}
            <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-700">
              חזרה להתחברות
            </Link>
          </p>
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <Home className="h-4 w-4" />
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
