'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, MailCheck } from 'lucide-react';

/**
 * "בדקו את המייל" — מה שהלקוח רואה אחרי ההרשמה, עד שיאשר את הקישור.
 * משמש גם את עמוד /auth/check-email וגם את חלון ההרשמה שנפתח מתוך הכלים.
 */
export function CheckEmailPanel({
  email,
  via = 'password',
  sendFailed = false,
  ttlMinutes = 60,
}: {
  email: string;
  via?: 'google' | 'password';
  sendFailed?: boolean;
  ttlMinutes?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(sendFailed ? 'לא הצלחנו לשלוח את המייל. נסו לשלוח שוב.' : '');

  const resend = async () => {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', email }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setNotice('שלחנו קישור חדש. הקישור הקודם כבר לא יעבוד.');
      else setError(data.error || 'לא הצלחנו לשלוח קישור חדש.');
    } catch {
      setError('לא הצלחנו לשלוח קישור חדש. בדקו את החיבור.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <MailCheck className="h-8 w-8 text-blue-600" />
      </div>
      <div>
        <h2 className="text-subtitle font-bold text-slate-900">בדקו את תיבת המייל</h2>
        <p className="mt-2 text-info text-slate-600">
          {via === 'google' ? 'החשבון שלכם ב-Google עדיין לא רשום אצלנו. ' : ''}
          שלחנו קישור לאישור ההרשמה אל
        </p>
        {email && (
          <p className="mt-1 text-info font-semibold text-slate-900" dir="ltr">
            {email}
          </p>
        )}
      </div>
      <p className="rounded-xl bg-slate-50 p-4 text-info text-slate-600">
        החשבון ייפתח, והאזור האישי יהיה זמין, רק אחרי שתלחצו על הקישור. הקישור תקף ל-{ttlMinutes} דקות ולשימוש אחד.
        לא מוצאים? בדקו גם בתיקיית הספאם.
      </p>

      {notice && (
        <p className="flex items-center justify-center gap-2 text-info text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}
      {error && (
        <p className="flex items-center justify-center gap-2 text-info text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {email && (
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 text-button font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          שלחו לי את הקישור שוב
        </button>
      )}
    </div>
  );
}
