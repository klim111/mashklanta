'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { AuthLogo } from '@/components/auth/AuthPageParts';
import { HANDOFF_VERIFIER_KEY } from '@/lib/native-app/constants';

/** "/dashboard" וכדומה — רק נתיב באתר */
function localPath(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/dashboard';
}

/**
 * בתוך האפליקציה לנייד, אחרי שהכניסה עם Google הושלמה בדפדפן: מממש את הקוד
 * החד-פעמי עם הסוד ששמרנו לפני היציאה, ונכנס לאזור האישי.
 */
function CompleteAppLogin() {
  const params = useSearchParams();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get('code');
    const next = localPath(params.get('next'));
    let verifier: string | null = null;
    try {
      verifier = window.localStorage.getItem(HANDOFF_VERIFIER_KEY);
      window.localStorage.removeItem(HANDOFF_VERIFIER_KEY);
    } catch {
      verifier = null;
    }
    if (!code || !verifier || params.get('error')) {
      setFailed(true);
      return;
    }
    signIn('app-handoff', { code, verifier, redirect: false })
      .then((result) => {
        if (result?.ok && !result.error) window.location.replace(next);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [params]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-10 sm:items-center sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 text-center">
          <AuthLogo />
          {failed ? (
            <>
              <h1 className="text-title font-bold text-slate-900">ההתחברות לא הושלמה</h1>
              <p className="mt-2 flex items-start justify-center gap-2 text-slate-600">
                <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-red-600" />
                <span>אפשר לנסות שוב, או להתחבר עם מייל וסיסמה.</span>
              </p>
              <Link
                href="/auth/login"
                className="mt-6 inline-block w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                חזרה למסך ההתחברות
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-title font-bold text-slate-900">מתחברים…</h1>
              <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin text-blue-600" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppLoginCompletePage() {
  return (
    <Suspense fallback={null}>
      <CompleteAppLogin />
    </Suspense>
  );
}
