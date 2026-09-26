'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Home, KeyRound, Loader2 } from 'lucide-react';
import { PasswordField } from '@/components/auth/PasswordField';
import { passwordProblem } from '@/lib/password-policy';

export function ResetPasswordForm({ token, initiallyValid }: { token: string; initiallyValid: boolean }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(!initiallyValid);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (body?.expired) setExpired(true);
        setError(body?.error ?? 'לא הצלחנו לעדכן את הסיסמה. נסו שוב.');
        return;
      }
      setDone(true);
    } catch {
      setError('לא הצלחנו לעדכן את הסיסמה. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
              {done ? <CheckCircle className="h-8 w-8 text-white" /> : <KeyRound className="h-8 w-8 text-white" />}
            </div>
            <h1 className="text-title font-bold text-slate-900">
              {done ? 'הסיסמה עודכנה' : expired ? 'הקישור אינו תקף' : 'בחירת סיסמה חדשה'}
            </h1>
            <p className="mt-2 text-info text-slate-600">
              {done
                ? 'מעכשיו נכנסים עם הסיסמה החדשה. הסיסמה הקודמת כבר לא פעילה.'
                : expired
                  ? 'הקישור כבר שומש או שפג תוקפו (הוא תקף ל-60 דקות). בקשו קישור חדש.'
                  : 'הסיסמה החדשה תחליף את הסיסמה הקודמת של החשבון.'}
            </p>
          </div>

          {error && !expired && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {done ? (
            <Link
              href="/auth/login"
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-button font-semibold text-white hover:bg-blue-700"
            >
              להתחברות
            </Link>
          ) : expired ? (
            <Link
              href="/auth/forgot-password"
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-button font-semibold text-white hover:bg-blue-700"
            >
              שליחת קישור חדש
            </Link>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  סיסמה חדשה
                </label>
                <PasswordField
                  id="password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  onUseSuggestion={setConfirm}
                  required
                  inputClassName="rounded-lg py-3 text-base"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="mb-2 block text-sm font-medium text-slate-700">
                  אימות הסיסמה החדשה
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  dir="ltr"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-right focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="הקלידו שוב את הסיסמה"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-button font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" />}
                שמירת הסיסמה החדשה
              </button>
            </form>
          )}
        </div>
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <Home className="h-4 w-4" />
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
