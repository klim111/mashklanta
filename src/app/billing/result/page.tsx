'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { safeCallbackUrl } from '@/lib/safe-path';

/**
 * לכאן הלקוח מגיע אחרי עמוד התשלום של HYP (דרך `/api/payments/hyp/return`,
 * שכבר רשם את התשלום אם אומת). העמוד פתוח גם בלי התחברות, כי חידוש מהקישור
 * שבמייל לא מחייב להתחבר.
 */
function ResultBody() {
  const params = useSearchParams();
  const status = params.get('status');
  const renewal = params.get('renewal') === '1';
  const next = safeCallbackUrl(params.get('next')) ?? '/dashboard';
  /** תשלום בקישור תשלום של היועץ — לא קשור לגישה לפלטפורמה */
  const link = params.get('link');
  const linkPath = link && /^[A-Za-z0-9_-]{10,64}$/.test(link) ? `/pay/${link}` : null;

  const view =
    status === 'paid'
      ? {
          icon: <CheckCircle2 className="h-10 w-10 text-emerald-600" />,
          ring: 'border-emerald-200',
          badge: 'bg-emerald-100',
          title: linkPath ? 'התשלום התקבל, תודה!' : renewal ? 'הגישה חודשה' : 'התשלום התקבל, הגישה שלכם פעילה',
          text: linkPath
            ? 'אישור התשלום והחשבונית נשלחו אליכם במייל.'
            : 'כל השלבים וכל הכלים פתוחים בפניכם לחודש. אישור התשלום והחשבונית נשלחו אליכם במייל.',
          cta: linkPath ? 'לאתר משכלנתא' : renewal ? 'חזרה לתהליך' : 'ממשיכים',
          href: linkPath ? '/' : next,
        }
      : status === 'failed'
        ? {
            icon: <XCircle className="h-10 w-10 text-rose-600" />,
            ring: 'border-rose-200',
            badge: 'bg-rose-100',
            title: 'התשלום לא בוצע',
            text: 'העסקה לא אושרה ולא חויבתם. אפשר לנסות שוב, גם בכרטיס אחר.',
            cta: 'לנסות שוב',
            href: linkPath ?? '/dashboard/checkout',
          }
        : {
            icon: <Clock className="h-10 w-10 text-amber-600" />,
            ring: 'border-amber-200',
            badge: 'bg-amber-100',
            title: 'לא הצלחנו לאשר את התשלום',
            text: 'לא קיבלנו אישור על התשלום ממערכת הסליקה. אם חויבתם, פנו אלינו ונסדר את זה מיד. אם לא, אפשר לנסות שוב.',
            cta: linkPath ? 'חזרה לעמוד התשלום' : 'לאזור האישי',
            href: linkPath ?? '/dashboard',
          };

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className={`w-full max-w-xl rounded-3xl border ${view.ring} bg-white p-8 text-center shadow-xl`}>
        <span className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full ${view.badge}`}>
          {view.icon}
        </span>
        <h1 className="text-subtitle font-black text-slate-900">{view.title}</h1>
        <p className="mt-2 text-info leading-relaxed text-slate-500">{view.text}</p>
        <Link
          href={view.href}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 text-cta font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
        >
          {view.cta}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function BillingResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ResultBody />
    </Suspense>
  );
}
