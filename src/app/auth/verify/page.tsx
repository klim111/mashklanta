'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { AlertCircle, CheckCircle, Home, Loader2, Lock, MailCheck, ShieldCheck, XCircle } from 'lucide-react';
import { authErrorMessage } from '@/lib/auth-errors';

/**
 * אישור ההרשמה מהקישור שנשלח במייל.
 *
 * פתיחת הקישור לבדה לא מאשרת דבר — היא רק מציגה למי שייך החשבון. האישור
 * דורש לחיצה, כדי שמסנני דואר שפותחים קישורים מראש לא ינצלו את הקישור החד-פעמי,
 * ושבעל המייל יראה מה הוא מאשר. בדפדפן אחר מזה שנרשמו ממנו מתבקשת גם הסיסמה.
 */

type Summary =
  | {
      status: 'ok';
      maskedEmail: string;
      name: string | null;
      username: string | null;
      via: 'google' | 'password';
      createdAt: string;
      expiresAt: string;
      needsPassword: boolean;
      callbackUrl: string | null;
    }
  | { status: 'expired' }
  | { status: 'invalid' };

type View = 'loading' | 'ready' | 'confirming' | 'done' | 'cancelled' | 'expired' | 'invalid' | 'exists';

const timeFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' });

async function callVerify(body: Record<string, string>) {
  const response = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [view, setView] = useState<View>('loading');
  const [summary, setSummary] = useState<Extract<Summary, { status: 'ok' }> | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setView('invalid');
      return;
    }
    let cancelled = false;
    callVerify({ action: 'inspect', token })
      .then(({ data }) => {
        if (cancelled) return;
        const result = data as Summary;
        if (result.status === 'ok') {
          setSummary(result);
          setView('ready');
        } else {
          setView(result.status === 'expired' ? 'expired' : 'invalid');
        }
      })
      .catch(() => {
        if (!cancelled) setView('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!summary) return;
      setError('');
      setView('confirming');
      const result = await signIn('email-link', { token, password, redirect: false });
      if (result?.error) {
        const code = result.error;
        if (code === 'VerificationExpired') setView('expired');
        else if (code === 'VerificationInvalid') setView('invalid');
        else if (code === 'VerificationAccountExists') setView('exists');
        else {
          setError(authErrorMessage(code));
          setView('ready');
        }
        return;
      }
      setView('done');
      window.location.replace(summary.callbackUrl || '/dashboard');
    },
    [password, summary, token]
  );

  const cancel = async () => {
    setBusy(true);
    await callVerify({ action: 'cancel', token }).catch(() => null);
    setBusy(false);
    setView('cancelled');
  };

  const resend = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    const { ok, data } = await callVerify({ action: 'resend', token }).catch(() => ({ ok: false, data: {} as { error?: string } }));
    setBusy(false);
    if (ok) setNotice('אם ההרשמה עדיין ממתינה, שלחנו קישור חדש למייל. הקישור הזה כבר לא יעבוד.');
    else setError((data as { error?: string }).error || 'לא הצלחנו לשלוח קישור חדש.');
  };

  const icon = (() => {
    switch (view) {
      case 'loading':
      case 'confirming':
        return <Loader2 className="h-9 w-9 animate-spin text-blue-600" />;
      case 'done':
        return <CheckCircle className="h-9 w-9 text-green-600" />;
      case 'ready':
        return <ShieldCheck className="h-9 w-9 text-blue-600" />;
      case 'cancelled':
      case 'exists':
        return <MailCheck className="h-9 w-9 text-slate-600" />;
      default:
        return <XCircle className="h-9 w-9 text-red-600" />;
    }
  })();

  const title: Record<View, string> = {
    loading: 'בודקים את הקישור…',
    ready: 'אישור ההרשמה',
    confirming: 'פותחים את החשבון…',
    done: 'ההרשמה אושרה',
    cancelled: 'ההרשמה בוטלה',
    expired: 'פג תוקף הקישור',
    invalid: 'הקישור אינו תקף',
    exists: 'כבר יש חשבון עם המייל הזה',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">{icon}</div>
            <h1 className="text-title font-bold text-slate-900">{title[view]}</h1>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-info">{error}</span>
            </div>
          )}
          {notice && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-info">{notice}</span>
            </div>
          )}

          {(view === 'ready' || view === 'confirming') && summary && (
            <form onSubmit={confirm} className="space-y-5">
              <dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-info text-slate-700">
                {summary.name && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">שם</dt>
                    <dd className="font-semibold text-slate-900">{summary.name}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">מייל</dt>
                  <dd className="font-semibold text-slate-900" dir="ltr">{summary.maskedEmail}</dd>
                </div>
                {summary.username && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">שם משתמש</dt>
                    <dd className="font-semibold text-slate-900" dir="ltr">{summary.username}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{summary.via === 'google' ? 'נרשם דרך' : 'נרשם ב'}</dt>
                  <dd className="font-semibold text-slate-900">
                    {summary.via === 'google' ? 'Google' : timeFormat.format(new Date(summary.createdAt))}
                  </dd>
                </div>
              </dl>

              {summary.needsPassword && (
                <div>
                  <p className="mb-3 text-info text-slate-600">
                    הקישור נפתח בדפדפן אחר מזה שנרשמתם ממנו. כדי לוודא שזו ההרשמה שלכם, הקלידו את הסיסמה שבחרתם.
                  </p>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                    סיסמה
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 pl-12 text-right transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={view === 'confirming'}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-cta font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {view === 'confirming' ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                זה אני, אשרו את ההרשמה
              </button>

              <div className="border-t border-slate-200 pt-4 text-center">
                <p className="mb-2 text-info text-slate-600">לא אתם נרשמתם?</p>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy || view === 'confirming'}
                  className="text-button font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  בטלו את ההרשמה הזו
                </button>
              </div>
            </form>
          )}

          {view === 'done' && <p className="text-center text-info text-slate-600">מעבירים אתכם לאזור האישי…</p>}

          {view === 'cancelled' && (
            <p className="text-center text-info text-slate-600">
              ההרשמה נמחקה ולא נפתח חשבון. אין צורך לעשות דבר נוסף.
            </p>
          )}

          {view === 'expired' && (
            <div className="space-y-4 text-center">
              <p className="text-info text-slate-600">הקישור תקף לשעה בלבד. אפשר לשלוח קישור חדש לאותו מייל.</p>
              <button
                type="button"
                onClick={resend}
                disabled={busy || Boolean(notice)}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-button font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                שלחו לי קישור חדש
              </button>
            </div>
          )}

          {view === 'invalid' && (
            <div className="space-y-4 text-center">
              <p className="text-info text-slate-600">
                ייתכן שכבר השתמשתם בקישור, או שנשלח אחריו קישור חדש יותר. אם כבר אישרתם, פשוט התחברו.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/login" className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center text-button font-semibold text-white hover:bg-blue-700">
                  התחברות
                </Link>
                <Link href="/auth/register" className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-center text-button font-semibold text-slate-700 hover:bg-slate-50">
                  הרשמה מחדש
                </Link>
              </div>
            </div>
          )}

          {view === 'exists' && (
            <div className="space-y-4 text-center">
              <p className="text-info text-slate-600">החשבון כבר פתוח. התחברו אליו עם המייל או עם Google.</p>
              <Link href="/auth/login" className="block rounded-lg bg-blue-600 px-4 py-3 text-center text-button font-semibold text-white hover:bg-blue-700">
                התחברות
              </Link>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-slate-600 hover:text-slate-800 transition-colors inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
