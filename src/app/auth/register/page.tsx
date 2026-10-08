'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, CheckCircle, Loader2, Home } from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { authErrorMessage } from '@/lib/auth-errors';
import { PasswordField } from '@/components/auth/PasswordField';
import { EmailExistsNotice, useEmailExists } from '@/components/auth/EmailExistsNotice';
import { passwordProblem } from '@/lib/password-policy';
import { useSignupDraft } from '@/components/analytics/useSignupDraft';
import { SignupDraftNotice } from '@/components/analytics/SignupDraftNotice';
import { ConsultSentNotice } from '@/components/auth/ConsultSentNotice';

/** רק נתיב יחסי באתר — כדי שלא נפנה החוצה אחרי ההרשמה */
function safeCallbackUrl(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const emailStatus = useEmailExists(formData.email);
  // מה שהוקלד נשמר כבר עכשיו, כדי שהיועץ יראה גם הרשמה שלא הושלמה (בלי הסיסמה)
  const draft = useSignupDraft('register', {
    name: formData.name,
    email: formData.email,
  });
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));

  useEffect(() => {
    const oauthError = authErrorMessage(searchParams.get('error'));
    if (oauthError) setError(oauthError);
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateForm = () => {
    if (formData.name.length < 2) {
      setError('השם חייב להכיל לפחות 2 תווים');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('כתובת המייל אינה תקינה');
      return false;
    }
    if (emailStatus.exists) {
      setError('כבר קיים משתמש עם המייל הזה');
      return false;
    }
    const problem = passwordProblem(formData.password);
    if (problem) {
      setError(problem);
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          callbackUrl,
        }),
      });

      const payload = await response.text();
      let data: { error?: string; code?: string } = {};
      try {
        data = payload ? JSON.parse(payload) : {};
      } catch {
        data = { error: 'השרת לא החזיר תשובה תקינה. נסו שוב.' };
      }

      if (data.code === 'email-exists') {
        emailStatus.markExists();
        setError('כבר קיים משתמש עם המייל הזה');
      } else if (!response.ok) {
        setError(data.error || 'אירעה שגיאה בהרשמה');
      } else {
        /*
          החשבון עוד לא נפתח: הוא נוצר, והאזור האישי נפתח, רק אחרי שהלקוח
          יאשר את הקישור שנשלח אליו במייל. הבחירה שעשה בעמוד הבית שמורה עם
          ההרשמה וממתינה לו אחרי האישור.
        */
        draft.markSubmitted();
        setSuccess('שלחנו לכם מייל לאישור ההרשמה');
        router.push(`/auth/check-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`);
      }
    } catch (error) {
      setError('אירעה שגיאה בהרשמה');
    } finally {
      setIsLoading(false);
    }
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
            <Link href="/" className="inline-flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <Home className="w-8 h-8 text-white" />
              </div>
            </Link>
            <h1 className="text-title font-bold text-slate-900">הרשמה</h1>
            <p className="text-slate-600 mt-2">פתיחת חשבון לקוח במשכלנתא. נשלח לכם מייל לאישור הכתובת.</p>
          </div>

          {/* אחרי בקשת ליווי מ"היוועצו איתנו": הסבר, והשם והמייל מהבקשה כבר בטופס */}
          {searchParams.get('from') === 'consult' && (
            <ConsultSentNotice
              onPrefill={({ name, email }) =>
                setFormData((prev) => ({ ...prev, name: prev.name || name, email: prev.email || email }))
              }
            />
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                שם מלא
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pl-12 text-right border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="ישראל ישראלי"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                כתובת מייל
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pl-12 text-right border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="your@email.com"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
              {emailStatus.exists && <EmailExistsNotice email={formData.email} callbackUrl={callbackUrl} />}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                סיסמה
              </label>
              <PasswordField
                id="password"
                name="password"
                value={formData.password}
                onChange={(password) => setFormData((prev) => ({ ...prev, password }))}
                onUseSuggestion={(password) =>
                  setFormData((prev) => ({ ...prev, confirmPassword: password }))
                }
                required
                inputClassName="rounded-lg py-3 text-base"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                אימות סיסמה
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  dir="ltr"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pl-12 text-right border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="הקלד שוב את הסיסמה"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!success}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  נרשם...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  נשלח מייל לאישור
                </>
              ) : (
                'הירשם'
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="text-xs text-slate-500 text-center mt-6">
            בהרשמתך אתה מסכים ל
            <Link href="/terms" className="text-blue-600 hover:text-blue-700">
              תנאי השימוש
            </Link>
            {' '}ול
            <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
              מדיניות הפרטיות
            </Link>
          </p>
          <SignupDraftNotice className="mt-2 text-center" />

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">או</span>
            </div>
          </div>
          <div className="mb-6">
            <GoogleAuthButton
              label="הרשמה עם Google"
              callbackUrl={safeCallbackUrl(searchParams.get('callbackUrl')) ?? '/dashboard'}
            />
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-slate-600">
              כבר יש לך חשבון?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                התחבר
              </Link>
            </p>
            <p className="mt-2">
              <Link
                href={`/auth/forgot-password${formData.email.includes('@') ? `?email=${encodeURIComponent(formData.email.trim())}` : ''}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                שכחתי סיסמה
              </Link>
            </p>
          </div>
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

export default function RegisterPage() {
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
      <RegisterForm />
    </Suspense>
  );
}