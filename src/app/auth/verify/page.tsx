'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Home, Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      if (!token || !email) {
        setStatus('error');
        setMessage('קישור האימות אינו תקין');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, email }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'כתובת המייל אומתה בהצלחה!');
          setTimeout(() => {
            router.push('/auth/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'אירעה שגיאה באימות המייל');
        }
      } catch (error) {
        setStatus('error');
        setMessage('אירעה שגיאה בתהליך האימות');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            {/* Status Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              {status === 'loading' && (
                <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
              )}
              {status === 'success' && (
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              )}
              {status === 'error' && (
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              )}
            </motion.div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'loading' && 'מאמת את כתובת המייל...'}
              {status === 'success' && 'אימות הושלם בהצלחה!'}
              {status === 'error' && 'אימות נכשל'}
            </h1>

            {/* Message */}
            <p className="text-gray-600 mb-8">{message}</p>

            {/* Actions */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm text-gray-500 mb-4">מעביר אותך לדף ההתחברות...</p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  המשך להתחברות
                </Link>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <Mail className="w-5 h-5" />
                  נסה להירשם שוב
                </Link>
                <p className="text-sm text-gray-500">
                  או{' '}
                  <Link href="/contact" className="text-purple-600 hover:text-purple-700">
                    צור קשר עם התמיכה
                  </Link>
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-800 transition-colors inline-flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            חזרה לדף הבית
          </Link>
        </div>
      </motion.div>
    </div>
  );
}