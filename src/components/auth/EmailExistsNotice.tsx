'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * בודק, חצי שנייה אחרי שהלקוח הפסיק להקליד, אם כבר קיים משתמש עם המייל.
 * `markExists` מאפשר לסמן זאת גם מתשובת השרת בשליחת הטופס.
 */
export function useEmailExists(email: string) {
  const value = email.trim().toLowerCase();
  const [existsFor, setExistsFor] = useState<string | null>(null);

  useEffect(() => {
    if (!EMAIL_PATTERN.test(value)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/email-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: value }),
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (body?.exists) setExistsFor(value);
        else setExistsFor((current) => (current === value ? null : current));
      } catch {
        // בדיקה מקדימה בלבד — השרת בודק שוב בשליחת הטופס
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return {
    exists: existsFor !== null && existsFor === value,
    markExists: () => setExistsFor(value),
  };
}

/** "כבר קיים משתמש עם המייל הזה" — עם כניסה ובחירת סיסמה חדשה */
export function EmailExistsNotice({ email, callbackUrl }: { email: string; callbackUrl?: string | null }) {
  const value = email.trim().toLowerCase();
  const login = new URLSearchParams({ email: value });
  if (callbackUrl) login.set('callbackUrl', callbackUrl);

  return (
    <div
      role="alert"
      className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
    >
      <p className="flex items-start gap-2 font-bold">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        כבר קיים משתמש עם המייל הזה.
      </p>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 ps-6">
        <Link href={`/auth/login?${login.toString()}`} className="font-bold text-blue-700 hover:underline">
          כניסה לחשבון
        </Link>
        <Link
          href={`/auth/forgot-password?email=${encodeURIComponent(value)}`}
          className="font-bold text-blue-700 hover:underline"
        >
          שכחתי סיסמה
        </Link>
      </p>
    </div>
  );
}
