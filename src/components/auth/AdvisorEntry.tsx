'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AlertCircle, Loader2, Lock, Mail, MailCheck, ShieldCheck } from 'lucide-react';
import { authErrorMessage } from '@/lib/auth-errors';
import { ADVISOR_FRESH_KEY, ADVISOR_TAB_KEY } from '@/lib/advisor-session';
import { passwordProblem } from '@/lib/password-policy';
import { PasswordField } from '@/components/auth/PasswordField';

/**
 * הכניסה הנסתרת של היועץ. אין אליה קישור מאף מקום באתר. העמוד לא מגלה דבר:
 * כל מייל שמוקלד מקבל אותה תשובה, והקישור נשלח רק לתיבה של היועץ. אחרי
 * הקישור נדרשת גם סיסמה.
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

/** אחרי שגיאות אלה אין טעם להמשיך עם הקישור הזה — צריך לבקש חדש */
const LINK_DEAD = new Set(['AdvisorLinkInvalid', 'AdvisorLinkExpired', 'AdvisorLinkOtherBrowser', 'AdvisorPasswordLocked']);

/**
 * אישור הקישור מהמייל, ואחריו הסיסמה. פתיחת הקישור לבדה לא מכניסה ולא
 * מנצלת אותו — הכניסה דורשת את הסיסמה (ובכניסה הראשונה, בחירה שלה), כך
 * שגם מסנני דואר שפותחים קישורים מראש לא ינצלו את הקישור החד-פעמי.
 */
function AdvisorVerifyContent() {
  const token = useSearchParams().get('token') ?? '';
  const [step, setStep] = useState<'loading' | 'password' | 'create' | 'dead'>(token ? 'loading' : 'dead');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(token ? '' : authErrorMessage('AdvisorLinkInvalid'));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch('/api/auth/advisor-access/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.ok && (body?.step === 'password' || body?.step === 'create')) {
          setStep(body.step);
          return;
        }
        setStep('dead');
        setError(body?.code ? authErrorMessage(body.code) : body?.error ?? authErrorMessage('AdvisorLinkInvalid'));
      })
      .catch(() => {
        if (cancelled) return;
        setStep('dead');
        setError('לא הצלחנו לבדוק את הקישור. בדקו את החיבור ורעננו את העמוד.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (step === 'create') {
      const problem = passwordProblem(password);
      if (problem) return setError(problem);
      if (password !== confirmPassword) return setError('הסיסמאות אינן זהות.');
    }
    setBusy(true);
    // הלשונית הזו היא היחידה שבה הכניסה תקפה (src/lib/advisor-session.ts)
    const markTab = (on: boolean) => {
      try {
        if (on) {
          window.sessionStorage.setItem(ADVISOR_TAB_KEY, '1');
          window.sessionStorage.setItem(ADVISOR_FRESH_KEY, '1');
        } else {
          window.sessionStorage.removeItem(ADVISOR_TAB_KEY);
          window.sessionStorage.removeItem(ADVISOR_FRESH_KEY);
        }
      } catch {
        // בלי sessionStorage הכניסה תתנתק מיד, כמו בכל ביקור חדש
      }
    };
    markTab(true);
    try {
      const result = await signIn('advisor-link', {
        token,
        ...(step === 'create' ? { newPassword: password } : { password }),
        redirect: false,
      });
      if (result?.error) {
        markTab(false);
        setError(authErrorMessage(result.error));
        if (LINK_DEAD.has(result.error)) setStep('dead');
        setPassword('');
        return;
      }
      window.location.assign('/advisor-dashboard');
    } catch {
      markTab(false);
      setError('אירעה שגיאה בכניסה. נסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form onSubmit={confirm} className="space-y-4 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-violet-600" />
        <p className="text-subtitle font-bold text-slate-900">כניסה לאזור היועץ</p>
        {step === 'create' && (
          <p className="text-sm text-slate-600">
            זו הכניסה הראשונה. בחר סיסמה — מעכשיו היא תידרש בכל כניסה, אחרי הקישור במייל.
          </p>
        )}
        {error && (
          <p className="flex items-start gap-2 text-right text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {step === 'loading' && <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" />}
        {step === 'password' && (
          <div className="relative">
            <input
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              dir="ltr"
              aria-label="סיסמה"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 pl-12 text-right focus:border-transparent focus:ring-2 focus:ring-violet-500"
              placeholder="סיסמה"
            />
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
        )}
        {step === 'create' && (
          <div className="space-y-3 text-right">
            <PasswordField
              value={password}
              onChange={setPassword}
              onUseSuggestion={setConfirmPassword}
              required
              placeholder="סיסמה חדשה"
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              dir="ltr"
              aria-label="אימות הסיסמה"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-right text-sm focus:border-transparent focus:ring-2 focus:ring-violet-500"
              placeholder="הקלד שוב את הסיסמה"
            />
          </div>
        )}
        {(step === 'password' || step === 'create') && (
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-button font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            {step === 'create' ? 'שמירת הסיסמה וכניסה' : 'כניסה'}
          </button>
        )}
      </form>
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
