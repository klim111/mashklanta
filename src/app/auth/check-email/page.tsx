'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { CheckEmailPanel } from '@/components/auth/CheckEmailPanel';
import { BackHomeLink } from '@/components/auth/AuthPageParts';
import { authHref, safeCallbackPath } from '@/lib/auth-url';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const via = searchParams.get('via') === 'google' ? 'google' : 'password';
  const callbackUrl = safeCallbackPath(searchParams.get('callbackUrl'));

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-10 sm:items-center sm:p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <CheckEmailPanel email={email} via={via} sendFailed={searchParams.get('error') === 'send'} homeLogo />
          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-center text-info text-slate-600">
            <p>
              כבר אישרתם את ההרשמה?{' '}
              <Link
                href={authHref('/auth/login', callbackUrl, { email: email.includes('@') ? email : null })}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                התחברו
              </Link>
            </p>
            <p>
              טעיתם בכתובת?{' '}
              <Link href={authHref('/auth/register', callbackUrl)} className="font-semibold text-blue-600 hover:text-blue-700">
                הירשמו מחדש
              </Link>
            </p>
          </div>
        </div>
        <BackHomeLink />
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
