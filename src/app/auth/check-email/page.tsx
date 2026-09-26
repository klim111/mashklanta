'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Home, Loader2 } from 'lucide-react';
import { CheckEmailPanel } from '@/components/auth/CheckEmailPanel';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const via = searchParams.get('via') === 'google' ? 'google' : 'password';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <CheckEmailPanel email={email} via={via} sendFailed={searchParams.get('error') === 'send'} />
          <p className="mt-6 border-t border-slate-200 pt-4 text-center text-info text-slate-600">
            טעיתם בכתובת?{' '}
            <Link href="/auth/register" className="font-semibold text-blue-600 hover:text-blue-700">
              הירשמו מחדש
            </Link>
          </p>
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
