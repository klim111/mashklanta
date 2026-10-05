'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AlertCircle, Loader2, Mail, MailCheck, ShieldCheck } from 'lucide-react';
import { authErrorMessage } from '@/lib/auth-errors';

/**
 * הכניסה הנסתרת של היועץ. אין אליה קישור מאף מקום באתר. העמוד לא מגלה דבר:
 * כל מייל שמוקלד מקבל אותה תשובה, והקישור נשלח רק לתיבה של היועץ.
 */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">{children}</div>
    </div>
  );
}

export function AdvisorEntryRequest() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/advisor-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'לא הצלחנו לשלוח. נסו שוב.');
        return;
      }
      setSent(true);
    } catch {
      setError('לא הצלחנו לשלוח. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      {sent ? (
        <div className="space-y-3 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-violet-600" />
          <p className="text-subtitle font-bold text-slate-900">בדקו את המייל</p>
          <p className="text-sm text-slate-600">
            אם הכתובת נכונה, נשלח אליה קישור כניסה ל-15 דקות. פתחו אותו בדפדפן הזה.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-sm font-semibold text-violet-700 hover:text-violet-800"
          >
            שליחה שוב
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-center text-subtitle font-bold text-slate-900">כניסה</p>
          {error && (
            <p className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}
          <div className="relative">
            <input
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              aria-label="כתובת מייל"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 pl-12 text-right focus:border-transparent focus:ring-2 focus:ring-violet-500"
              placeholder="your@email.com"
            />
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-button font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            שליחת קישור כניסה
          </button>
        </form>
      )}
    </Shell>
  );
}

/**
 * אישור הקישור מהמייל. פתיחת הקישור לבדה לא מכניסה — הכניסה דורשת לחיצה,
 * כדי שמסנני דואר שפותחים קישורים מראש לא ינצלו את הקישור החד-פעמי.
 */
function AdvisorVerifyContent() {
  const token = useSearchParams().get('token') ?? '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(token ? '' : authErrorMessage('AdvisorLinkInvalid'));

  const confirm = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await signIn('advisor-link', { token, redirect: false });
      if (result?.error) {
        setError(authErrorMessage(result.error));
        return;
      }
      window.location.assign('/advisor-dashboard');
    } catch {
      setError('אירעה שגיאה בכניסה. נסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-4 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-violet-600" />
        <p className="text-subtitle font-bold text-slate-900">כניסה לאזור היועץ</p>
        {error && (
          <p className="flex items-start gap-2 text-right text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {token && (
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-button font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            כניסה
          </button>
        )}
      </div>
    </Shell>
  );
}

export function AdvisorEntryVerify() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      }
    >
      <AdvisorVerifyContent />
    </Suspense>
  );
}
