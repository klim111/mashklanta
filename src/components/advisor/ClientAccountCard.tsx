'use client';

import { useState } from 'react';
import { Copy, HeartHandshake, KeyRound, Loader2, Mail, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClientPaymentSettings as Settings } from '@/lib/granted-access-store';
import { SectionCard } from './ui';

const DATE = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * כפתור "שליחת פרטי כניסה": מייל ללקוח עם קישור לקביעת סיסמה לחשבון שבו כל מה
 * שהיועץ הזין בתיק (src/lib/client-invite.ts). אם המייל לא נשלח — הקישור מוצג
 * להעתקה.
 */
export function InviteButton({
  clientId,
  sentAt,
  label = 'שליחת פרטי כניסה',
  variant = 'default',
  onSent,
}: {
  clientId: string;
  sentAt?: string | null;
  label?: string;
  variant?: 'default' | 'outline';
  onSent?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setNotice(null);
    setError(null);
    setFallbackUrl(null);
    try {
      const response = await fetch(`/api/clients/${clientId}/invite`, { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? 'השליחה נכשלה. נסו שוב.');
        if (typeof body?.url === 'string') setFallbackUrl(body.url);
        return;
      }
      setNotice(`נשלח אל ${body.email}. הלקוח יבחר סיסמה ויראה באזור האישי את כל מה שהזנת.`);
      onSent?.();
    } catch {
      setError('השליחה נכשלה. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!fallbackUrl) return;
    try {
      await navigator.clipboard.writeText(fallbackUrl);
      setNotice('הקישור הועתק.');
    } catch {
      window.prompt('העתיקו את הקישור:', fallbackUrl);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={variant} onClick={send} disabled={busy}>
          {busy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Mail className="ml-1 h-4 w-4" />}
          {sentAt ? 'שליחה חוזרת של פרטי הכניסה' : label}
        </Button>
        {sentAt && !notice && <span className="text-2xs text-slate-500">נשלח לאחרונה ב-{DATE.format(new Date(sentAt))}</span>}
      </div>
      {error && <p className="text-info font-bold text-rose-700">{error}</p>}
      {fallbackUrl && (
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          <Copy className="ml-1 h-4 w-4" />
          העתקת הקישור לקביעת סיסמה
        </Button>
      )}
      {notice && <p className="text-info font-bold text-emerald-700">{notice}</p>}
    </div>
  );
}

/**
 * כרטיס "חשבון וסוג גישה" בטאב "תשלום והרשאה": פרטי הכניסה של הלקוח, והבחירה
 * בין לקוח בליווי ללקוח בתשלום לתקופה.
 */
export function ClientAccountCard({ settings, onChanged }: { settings: Settings; onChanged: () => Promise<void> }) {
  const { client, account, grant } = settings;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (selfPay: boolean) => {
    if (selfPay === account.selfPay) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${client.id}/paid-access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfPay }),
      });
      if (!response.ok) {
        setError('השינוי לא נשמר. נסו שוב.');
        return;
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const option = (selfPay: boolean, icon: React.ReactNode, title: string, text: string) => {
    const selected = account.selfPay === selfPay;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={busy}
        onClick={() => void choose(selfPay)}
        className={`flex flex-1 items-start gap-3 rounded-2xl border p-3 text-right transition-colors disabled:opacity-60 ${
          selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300'
        }`}
      >
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-900">{title}</span>
          <span className="block text-2xs text-slate-600">{text}</span>
        </span>
      </button>
    );
  };

  return (
    <SectionCard title="חשבון וסוג גישה" icon={<KeyRound className="h-4 w-4" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-1 text-xs font-black text-slate-700">כניסה לאזור האישי</h4>
          <p className="mb-3 text-info text-slate-600">
            {account.prospect
              ? account.invitedAt
                ? 'פרטי הכניסה נשלחו, והלקוח עוד לא בחר סיסמה. אפשר לשלוח שוב — הקישור הקודם יבוטל.'
                : 'הלקוח עוד לא נכנס. שלח לו פרטי כניסה: הוא יקבל במייל קישור לבחירת סיסמה, ובאזור האישי ימצא את כל מה שהזנת בתיק.'
              : account.canLogIn
                ? 'ללקוח יש כבר כניסה לאזור האישי. אם שכח את הסיסמה, אפשר לשלוח לו קישור לבחירת סיסמה חדשה.'
                : 'ללקוח עוד אין סיסמה. שלח לו קישור לבחירת סיסמה.'}
          </p>
          {client.email ? (
            <>
              <p className="mb-2 text-2xs text-slate-500">
                ישלח אל <span dir="ltr">{client.email}</span>
              </p>
              <InviteButton
                clientId={client.id}
                sentAt={account.invitedAt}
                label={account.canLogIn ? 'שליחת קישור לבחירת סיסמה' : 'שליחת פרטי כניסה'}
                onSent={() => void onChanged()}
              />
            </>
          ) : (
            <p className="text-info font-bold text-amber-700">אין לתיק מייל. הוסיפו מייל בפרטי הלקוח כדי לשלוח פרטי כניסה.</p>
          )}
        </div>

        <div>
          <h4 className="mb-1 text-xs font-black text-slate-700">סוג הגישה</h4>
          {account.selfRegistered ? (
            <p className="text-info text-slate-600">
              הלקוח נרשם לבד, ולכן הגישה שלו לפי התשלומים. סמן אותו כמשלם בטופס שלמטה כדי לפתוח לו גישה לתקופה.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row" role="radiogroup" aria-label="סוג הגישה">
                {option(
                  false,
                  <HeartHandshake className="h-5 w-5" />,
                  'לקוח בליווי',
                  'כל הכלים פתוחים בלי תשלום, עד שתסמן בתהליך שהליווי הסתיים.'
                )}
                {option(
                  true,
                  <Wallet className="h-5 w-5" />,
                  'לקוח בתשלום',
                  'הכלים פתוחים עד סוף התקופה שסימנת כמשלם. אחר כך הלקוח מתבקש לשלם מהאזור האישי, כמו לקוח שנרשם לבד.'
                )}
              </div>
              {account.selfPay && !grant?.active && (
                <p className="mt-2 text-info font-bold text-amber-700">
                  אין כרגע תקופה בתוקף, ולכן האזור האישי של הלקוח נעול עד שישלם. סמן אותו כמשלם בטופס שלמטה.
                </p>
              )}
            </>
          )}
          {error && <p className="mt-2 text-info font-bold text-rose-700">{error}</p>}
        </div>
      </div>
    </SectionCard>
  );
}
