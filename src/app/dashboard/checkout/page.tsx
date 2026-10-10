'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ChevronRight, CreditCard, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { usePricing } from '@/components/pricing/PricingProvider';
import { PricingModelStrip } from '@/components/service-flow/PricingModelStrip';
import { PlatformBillingNotes } from '@/components/service-flow/PlatformBillingNotes';
import { PLAN_JOURNEY_STAGES } from '@/data/platform/planStages';

function CheckoutBody() {
  const params = useSearchParams();
  /** חידוש הגישה לתהליך שהחודש שלו הסתיים */
  const renewPlanId = params.get('planId');
  /** תשלום על תהליך נוסף, כשיש כבר תהליך שעוד לא הסתיים — כל תשלום הוא עבור תהליך אחד */
  const extra = !renewPlanId && params.get('extra') === '1';
  /** חזרה לכלי שממנו הגיעו (למשל כלי המיחזור), במקום פתיחת התהליך מהדאשבורד */
  const backParam = params.get('back');
  const back = backParam && backParam.startsWith('/') && !backParam.startsWith('//') ? backParam : null;
  const { platformPrice } = usePricing();

  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
    לאן ממשיכים אחרי התשלום: חידוש — חזרה לתהליך שננעל; תהליך חדש — לדאשבורד
    עם המטרה שנבחרה, ומשם התהליך נפתח מיד בשלב הראשון.
  */
  const goalParam = params.get('goal');
  const goal = goalParam === 'REFINANCE' ? 'REFINANCE' : 'NEW_MORTGAGE';
  const next = renewPlanId
    ? `/dashboard/plans/${renewPlanId}`
    : back ?? (params.get('next') === 'plan' ? `/dashboard?goal=${goal}&service=SELF` : '/dashboard');

  /** מעבר לעמוד התשלום המאובטח של HYP — פרטי הכרטיס מוזנים שם, לא באתר */
  const pay = async () => {
    setBusy(true);
    setServerError(null);
    try {
      const response = await fetch('/api/platform/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnPath: next,
          ...(renewPlanId ? { planId: renewPlanId } : {}),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.redirectUrl !== 'string') {
        setServerError(body?.error ?? 'לא הצלחנו לפתוח את עמוד התשלום. נסו שוב.');
        setBusy(false);
        return;
      }
      window.location.assign(body.redirectUrl);
    } catch {
      setServerError('לא הצלחנו לפתוח את עמוד התשלום. נסו שוב.');
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-brand-dark">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/70 transition-colors hover:text-white"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            האזור האישי
          </Link>
          <h1 className="mt-3 text-title font-black text-white">
            {renewPlanId ? 'חבילת גישה נוספת' : extra ? 'תשלום על תהליך משכנתא נוסף' : 'מסלול עצמאי / היברידי'}
          </h1>
          <p className="mt-2 max-w-2xl text-info leading-relaxed text-white/70">
            {renewPlanId
              ? `חבילת גישה נוספת: ₪${platformPrice} לחודש נוסף. כל מה שהזנתם שמור, והכלים נפתחים מיד אחרי התשלום בדיוק איפה שעצרתם.`
              : extra
                ? `כל תשלום הוא עבור תהליך משכנתא אחד. ₪${platformPrice} לחודש לתהליך הנוסף, עם גישה מלאה לכל השלבים והכלים. התהליך הקיים נשאר כמו שהוא, עם הגישה ששולמה עליו.`
                : `₪${platformPrice} לחודש לתהליך משכנתא, עם גישה מלאה לכל השלבים והכלים. מתחילים לבד, ובכל שלב שצריך עזרה מעבירים את הטיפול ליועץ משכלנתא. מה ששילמתם מקוזז ממחיר הליווי.`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="flex items-center gap-2 text-subtitle font-black text-slate-900">
                <CreditCard className="h-4 w-4 text-blue-600" />
                תשלום מאובטח
              </h2>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-info leading-relaxed text-slate-600">
                <p>
                  התשלום מתבצע בעמוד התשלום המאובטח של HYP, חברת הסליקה של משכלנתא. פרטי הכרטיס מוזנים שם ולא עוברים דרך
                  האתר.
                </p>
                <p className="mt-2">
                  מיד אחרי התשלום תחזרו לכאן, הגישה תיפתח, ואישור עם חשבונית יישלח אליכם במייל. החודש נספר לפי החודש
                  הקלנדרי שבו שילמתם: 31 יום באוקטובר, 28 או 29 בפברואר.
                </p>
              </div>

              {serverError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {serverError}
                </p>
              )}

              <button
                type="button"
                onClick={pay}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3.5 text-cta font-black text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                לתשלום ₪{platformPrice} בעמוד המאובטח
              </button>
              <p className="flex items-center justify-center gap-1.5 text-2xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                פרטי הכרטיס לא נשמרים באתר. אין חיוב חוזר אוטומטי.
              </p>
              <p className="text-center text-2xs text-slate-400">
                בתשלום אתם מאשרים את{' '}
                <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                  תנאי השימוש
                </Link>{' '}
                ואת{' '}
                <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                  מדיניות הפרטיות
                </Link>
                .
              </p>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="bg-gradient-to-l from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Sparkles className="h-4 w-4" />
                  גישה מלאה לתהליך משכנתא
                </div>
                <div className="mt-1 text-4xl font-black">
                  ₪{platformPrice}
                  <span className="text-base font-bold text-white/70"> / חודש</span>
                </div>
                <div className="text-sm text-white/80">גישה מלאה לחודש · אין חיוב חוזר בלי אישור שלכם</div>
              </div>
              <ul className="space-y-2 px-6 py-5">
                {PLAN_JOURNEY_STAGES.map((stage, index) => (
                  <li key={stage.id} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${stage.gradient} text-2xs font-black text-white`}
                    >
                      {index + 1}
                    </span>
                    {stage.shortTitle}
                  </li>
                ))}
                <li className="flex items-center gap-2.5 border-t border-slate-100 pt-3 text-sm font-bold text-slate-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  כל הכלים והמחשבונים, ללא הגבלה
                </li>
              </ul>
            </div>

            <PlatformBillingNotes layout="stack" />

            {!renewPlanId && (
              <Link
                href="/dashboard/tour"
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-button font-bold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
              >
                רוצים להציץ קודם? סיור בכלי, בלי תשלום
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-2xs font-black text-slate-400">כך עובד התמחור</p>
              <PricingModelStrip compact className="!grid-cols-1" />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <CheckoutBody />
    </Suspense>
  );
}
