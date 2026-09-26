'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Loader2, Home, UserCheck, ChevronDown } from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { authErrorMessage } from '@/lib/auth-errors';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    const oauthError = authErrorMessage(searchParams.get('error'));
    if (oauthError) setError(oauthError);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setResendNotice('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setUnverified(result.error === 'EmailNotVerified');
        setError(authErrorMessage(result.error));
      } else {
        // Check user role and redirect accordingly
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        
        const callbackUrl = searchParams.get('callbackUrl');
        const safeCallback =
          callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : null;
        if (session?.user?.role === 'ADVISOR') {
          router.push('/advisor-dashboard');
        } else {
          router.push(safeCallback ?? '/dashboard');
        }
      }
    } catch (error) {
      setError('אירעה שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    setResendNotice('');
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend', email: email.trim() }),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => ({})) : {};
    setResendNotice(response?.ok ? 'שלחנו קישור חדש למייל.' : data.error || 'לא הצלחנו לשלוח קישור חדש.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <Home className="w-8 h-8 text-white" />
              </div>
            </Link>
            <h1 className="text-title font-bold text-slate-900">התחברות</h1>
            <p className="text-slate-600 mt-2">ברוכים השבים למשכלנתא</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                {error}
                {unverified && email.includes('@') && (
                  <>
                    {' '}
                    <button type="button" onClick={resendVerification} className="font-semibold underline">
                      שלחו לי את הקישור שוב
                    </button>
                  </>
                )}
                {resendNotice && <span className="mt-1 block">{resendNotice}</span>}
              </span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                שם משתמש או מייל
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-12 text-right border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="שם משתמש או your@email.com"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                סיסמה
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-12 text-right border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                שכחת סיסמה?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מתחבר...
                </>
              ) : (
                'התחבר'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">או</span>
            </div>
          </div>

          <GoogleAuthButton
            label="התחברות עם Google"
            callbackUrl={searchParams.get('callbackUrl') || '/dashboard'}
            autoStart={searchParams.get('google') === '1'}
          />

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-600">
              עדיין אין לך חשבון?{' '}
              <Link
                href="/auth/register"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                הירשם עכשיו
              </Link>
            </p>
          </div>

          {/* כניסה ליועצים — בתחתית החלון, ליועצים שכבר רשומים במערכת בלבד */}
          <AdvisorLogin />
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-slate-600 hover:text-slate-800 transition-colors inline-flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            חזרה לדף הבית
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * כניסת יועצים. אין כאן הרשמה: יועצים נוספים למערכת רק על ידי הנהלת האתר.
 * השרת בודק את התפקיד לפני שנוצרת התחברות, כך שחשבון לקוח לא נפתח מכאן.
 */
function AdvisorLogin() {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await signIn('credentials', {
        email: identifier,
        password,
        portal: 'advisor',
        redirect: false,
      });
      if (result?.error) {
        setError(authErrorMessage(result.error));
        return;
      }
      window.location.assign('/advisor-dashboard');
    } catch {
      setError('אירעה שגיאה בהתחברות');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 border-t border-slate-200 pt-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-2 text-button font-semibold text-violet-700 hover:text-violet-800"
      >
        <UserCheck className="h-4 w-4" />
        כניסה ליועצים
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="text-2xs text-slate-600">ליועצים שכבר רשומים במערכת בלבד.</p>
          {error && (
            <p className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}
          <input
            type="text"
            autoComplete="username"
            aria-label="שם משתמש או מייל של יועץ"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-right focus:border-transparent focus:ring-2 focus:ring-violet-500"
            placeholder="שם משתמש או מייל"
          />
          <input
            type="password"
            autoComplete="current-password"
            aria-label="סיסמת יועץ"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-right focus:border-transparent focus:ring-2 focus:ring-violet-500"
            placeholder="סיסמה"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-button font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            כניסה כיועץ
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">טוען...</p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}