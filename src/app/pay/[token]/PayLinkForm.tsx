'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Lock, Receipt, ShieldCheck } from 'lucide-react';

interface PublicLink {
  title: string;
  description: string | null;
  amount: number;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  clientName: string | null;
  hasEmail: boolean;
}

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

function money(amount: number): string {
  return `₪${amount.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
}

/** פרטי התשלום וכפתור לעמוד התשלום המאובטח */
export function PayLinkForm({ token, link }: { token: string; link: PublicLink | null }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!link || link.status !== 'OPEN') {
    const paid = link?.status === 'PAID';
    return (
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        {paid && <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />}
        <h1 className="text-subtitle font-black text-slate-900">
          {paid ? 'התשלום בקישור הזה כבר בוצע' : 'הקישור אינו פעיל'}
        </h1>
        <p className="mt-2 text-info leading-relaxed text-slate-500">
          {paid ? 'אישור התשלום והחשבונית נשלחו במייל.' : 'אם קיבלתם את הקישור מהיועץ, בקשו ממנו קישור חדש.'}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-bold text-blue-600 hover:underline">
          לאתר משכלנתא
        </Link>
      </div>
    );
  }

  const needName = !link.clientName;
  const needEmail = !link.hasEmail;

  const pay = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
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
    <form onSubmit={pay} className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-l from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Receipt className="h-4 w-4" />
          {link.clientName ? `תשלום עבור ${link.clientName}` : 'תשלום למשכלנתא'}
        </div>
        <div className="mt-1 text-subtitle font-black">{link.title}</div>
        <div className="mt-1 text-4xl font-black">{money(link.amount)}</div>
      </div>
      <div className="space-y-4 p-6">
        {link.description && <p className="text-info leading-relaxed text-slate-600">{link.description}</p>}

        {(needName || needEmail) && (
          <div className="grid gap-3">
            {needName && (
              <label className="text-xs font-bold text-slate-600">
                שם מלא
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="name" required />
              </label>
            )}
            {needEmail && (
              <label className="text-xs font-bold text-slate-600">
                מייל לאישור ולחשבונית
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  dir="ltr"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            <label className="text-xs font-bold text-slate-600">
              טלפון <span className="font-normal text-slate-400">(רשות)</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-cta font-black text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
          לתשלום {money(link.amount)} בעמוד המאובטח
        </button>
        <p className="flex items-center justify-center gap-1.5 text-center text-2xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          התשלום מתבצע אצל HYP, חברת הסליקה של משכלנתא. פרטי הכרטיס לא עוברים דרכנו, וחשבונית נשלחת במייל.
        </p>
      </div>
    </form>
  );
}
