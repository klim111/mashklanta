'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { usePricing } from '@/components/pricing/PricingProvider';

/**
 * אישור החידוש ומעבר לעמוד התשלום של HYP. `afterAdvisory` — הקישור הגיע מהמייל
 * על סיום הליווי, וזו הצעה להמשיך לבד ולא חידוש.
 */
export function RenewConfirm({ token, afterAdvisory = false }: { token: string | null; afterAdvisory?: boolean }) {
  const { platformPrice } = usePricing();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <h1 className="text-subtitle font-black text-slate-900">הקישור לחידוש פג</h1>
        <p className="mt-2 text-info leading-relaxed text-slate-500">
          אפשר לחדש את הגישה מהאזור האישי, אחרי שמתחברים.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 text-cta font-black text-white shadow-lg hover:bg-blue-700"
        >
          לאזור האישי
        </Link>
      </div>
    );
  }

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.redirectUrl !== 'string') {
        setError(body?.error ?? 'לא הצלחנו לפתוח את עמוד התשלום. נסו שוב.');
        setBusy(false);
        return;
      }
      window.location.assign(body.redirectUrl);
    } catch {
      setError('לא הצלחנו לפתוח את עמוד התשלום. נסו שוב.');
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-l from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
        <div className="flex items-center gap-2 text-sm font-bold">
          <RefreshCw className="h-4 w-4" />
          {afterAdvisory ? 'ממשיכים לעבוד בפלטפורמה' : 'חידוש הגישה לחודש נוסף'}
        </div>
        <div className="mt-1 text-4xl font-black">
          ₪{platformPrice}
          <span className="text-base font-bold text-white/70"> / חודש</span>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <p className="text-info leading-relaxed text-slate-600">
          {afterAdvisory
            ? 'הליווי בתהליך הסתיים, וכל מה שהזנתם שמור. בהמשך במסלול העצמאי כל השלבים והכלים פתוחים לכם לחודש.'
            : 'בחידוש כל השלבים והכלים נשארים פתוחים לחודש נוסף, וכל מה שהזנתם נשמר.'}{' '}
          התשלום מתבצע בעמוד התשלום המאובטח של HYP, ואין חיוב חוזר אוטומטי.
        </p>
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
        )}
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-cta font-black text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
          {afterAdvisory ? 'אני מאשר/ת המשך · לתשלום' : 'אני מאשר/ת חידוש · לתשלום'}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-2xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          {afterAdvisory ? 'לא רוצים להמשיך? אין צורך לעשות דבר.' : 'לא רוצים לחדש? אין צורך לעשות דבר.'}
        </p>
      </div>
    </div>
  );
}
