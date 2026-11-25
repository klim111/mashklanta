'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { authErrorMessage } from '@/lib/auth-errors';
import { authHref, safeCallbackPath } from '@/lib/auth-url';
import { AuthLogo, BackHomeLink } from '@/components/auth/AuthPageParts';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  // היעד שממנו הגיעו למסך — נשמר גם במעבר להרשמה ול"שכחתי סיסמה"
  // קישור כמו `/dashboard#chat` שנפתח בלי התחברות: המידלוור מעביר לכאן עם
  // callbackUrl=/dashboard, והדפדפן משאיר את ה-#chat בכתובת — מצרפים אותו בחזרה
  const [hash, setHash] = useState('');
  useEffect(() => setHash(window.location.hash), []);
  const requested = safeCallbackPath(searchParams.get('callbackUrl'));
  const callbackUrl = requested && !requested.includes('#') && hash ? `${requested}${hash}` : requested;

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
        
        if (session?.user?.role === 'ADVISOR') {
          router.push('/advisor-dashboard');
        } else {
          router.push(callbackUrl ?? '/dashboard');
        }
      }
    } catch (error) {
      setError('אירעה שגיאה בהתחברות. נסו שוב.');
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
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-10 sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <AuthLogo />
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
                כתובת מייל
              </label>
              <div className="relative">
                {/* type="text": לקוחות ותיקים עדיין יכולים להיכנס עם שם המשתמש הישן שלהם */}
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-12 text-right border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="your@email.com"
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
                href={authHref('/auth/forgot-password', callbackUrl, { email: email.includes('@') ? email.trim() : null })}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                שכחתם סיסמה?
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
                  מתחברים...
                </>
              ) : (
                'התחברות'
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
            callbackUrl={callbackUrl ?? '/dashboard'}
            autoStart={searchParams.get('google') === '1'}
          />

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-600">
              עדיין אין לכם חשבון?{' '}
              <Link
                href={authHref('/auth/register', callbackUrl)}
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                הירשמו עכשיו
              </Link>
            </p>
          </div>

        </div>

        <BackHomeLink />
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-10 sm:items-center sm:p-4">
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