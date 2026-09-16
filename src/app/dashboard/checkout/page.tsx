'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PLATFORM_MONTHLY_PRICE } from '@/lib/service-flow';
import { formatCardNumber, formatExpiry, validateCheckout } from '@/lib/platform-access';
import type { CheckoutInput } from '@/lib/platform-access';
import { PricingModelStrip } from '@/components/service-flow/PricingModelStrip';
import { PLAN_JOURNEY_STAGES } from '@/data/platform/planStages';

type Field = keyof CheckoutInput;

const inputClass =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100';

function CheckoutBody() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();

  const [form, setForm] = useState<CheckoutInput>({
    holderName: '',
    email: '',
    phone: '',
    idNumber: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ last4: string } | null>(null);

  // פרטי החשבון ממלאים את הטופס, כמו בכל מסך תשלום — אפשר לשנות
  useEffect(() => {
    if (!session?.user) return;
    setForm((current) => ({
      ...current,
      holderName: current.holderName || session.user?.name || '',
      email: current.email || session.user?.email || '',
    }));
  }, [session]);

  const set = (field: Field, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateCheckout(form);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      const response = await fetch('/api/platform/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (body?.errors) setErrors(body.errors);
        setServerError(body?.error ?? 'התשלום נכשל. נסו שוב.');
        return;
      }
      setDone({ last4: body?.receipt?.last4 ?? '' });
      // מחיקת פרטי הכרטיס מהזיכרון מיד אחרי ההצלחה
      setForm((current) => ({ ...current, cardNumber: '', expiry: '', cvv: '' }));
    } catch {
      setServerError('התשלום נכשל. נסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  const next = params.get('next') === 'plan' ? '/dashboard?goal=NEW_MORTGAGE&service=SELF' : '/dashboard';

  const fieldClass = (field: Field) =>
    `${inputClass} ${errors[field] ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-blue-400'}`;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-slate-950">
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
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">רכישת גישה לפלטפורמה</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
            ₪{PLATFORM_MONTHLY_PRICE} לחודש, עד לסיום התהליך. כל חמשת השלבים וכל הכלים נפתחים מיד
            אחרי התשלום — ואם תבקשו ליווי בהמשך, מה ששילמתם מקוזז ממחיר הייעוץ.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl"
          >
            <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </span>
            <h2 className="text-2xl font-black text-slate-900">הגישה שלכם פעילה</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              התשלום בכרטיס שמסתיים ב-{done.last4} התקבל. מעכשיו כל חמשת השלבים וכל הכלים פתוחים
              בפניכם ללא הגבלה, וההזמנה שולמה עד לסיום התהליך.
            </p>
            <button
              type="button"
              onClick={() => router.push(next)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-blue-500 to-violet-600 px-7 py-3.5 text-base font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              לאזור האישי — התחילו לתכנן
              <ArrowLeft className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
            <form
              onSubmit={submit}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              autoComplete="on"
            >
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  פרטי הלקוח והתשלום
                </h2>
              </div>

              <div className="space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    שם מלא (כפי שמופיע על הכרטיס)
                    <input
                      value={form.holderName}
                      onChange={(event) => set('holderName', event.target.value)}
                      className={`mt-1 ${fieldClass('holderName')}`}
                      autoComplete="cc-name"
                    />
                    {errors.holderName && <FieldError text={errors.holderName} />}
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    אימייל לקבלה
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => set('email', event.target.value)}
                      className={`mt-1 ${fieldClass('email')}`}
                      dir="ltr"
                      autoComplete="email"
                    />
                    {errors.email && <FieldError text={errors.email} />}
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    טלפון <span className="font-normal text-slate-400">(רשות)</span>
                    <input
                      value={form.phone}
                      onChange={(event) => set('phone', event.target.value)}
                      className={`mt-1 ${fieldClass('phone')}`}
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                    {errors.phone && <FieldError text={errors.phone} />}
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    תעודת זהות <span className="font-normal text-slate-400">(רשות)</span>
                    <input
                      value={form.idNumber}
                      onChange={(event) => set('idNumber', event.target.value.replace(/\D/g, '').slice(0, 9))}
                      className={`mt-1 ${fieldClass('idNumber')}`}
                      dir="ltr"
                      inputMode="numeric"
                    />
                    {errors.idNumber && <FieldError text={errors.idNumber} />}
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="block text-xs font-bold text-slate-600">
                    מספר כרטיס אשראי
                    <input
                      value={form.cardNumber}
                      onChange={(event) => set('cardNumber', formatCardNumber(event.target.value))}
                      className={`mt-1 tracking-widest ${fieldClass('cardNumber')}`}
                      dir="ltr"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      autoComplete="cc-number"
                    />
                    {errors.cardNumber && <FieldError text={errors.cardNumber} />}
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-slate-600">
                      תוקף
                      <input
                        value={form.expiry}
                        onChange={(event) => set('expiry', formatExpiry(event.target.value))}
                        className={`mt-1 ${fieldClass('expiry')}`}
                        dir="ltr"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        autoComplete="cc-exp"
                      />
                      {errors.expiry && <FieldError text={errors.expiry} />}
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      3 ספרות בגב הכרטיס (CVV)
                      <input
                        value={form.cvv}
                        onChange={(event) => set('cvv', event.target.value.replace(/\D/g, '').slice(0, 4))}
                        className={`mt-1 ${fieldClass('cvv')}`}
                        dir="ltr"
                        inputMode="numeric"
                        placeholder="123"
                        autoComplete="cc-csc"
                      />
                      {errors.cvv && <FieldError text={errors.cvv} />}
                    </label>
                  </div>
                </div>

                {serverError && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    {serverError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-500 to-violet-600 px-6 py-3.5 text-base font-black text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                  שלמו ₪{PLATFORM_MONTHLY_PRICE} ופתחו את הגישה
                </button>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  פרטי הכרטיס אינם נשמרים במערכת — רק ארבע הספרות האחרונות, לקבלה.
                </p>
              </div>
            </form>

            <aside className="space-y-4 lg:sticky lg:top-6">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                <div className="bg-gradient-to-l from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 text-white">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Sparkles className="h-4 w-4" />
                    גישה מלאה לפלטפורמה
                  </div>
                  <div className="mt-1 text-4xl font-black">
                    ₪{PLATFORM_MONTHLY_PRICE}
                    <span className="text-base font-bold text-white/70"> / חודש</span>
                  </div>
                  <div className="text-sm text-white/80">עד לסיום התהליך · אפשר להפסיק בכל חודש</div>
                </div>
                <ul className="space-y-2 px-6 py-5">
                  {PLAN_JOURNEY_STAGES.map((stage, index) => (
                    <li key={stage.id} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${stage.gradient} text-[11px] font-black text-white`}
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

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-[11px] font-black text-slate-400">כך עובד התמחור</p>
                <PricingModelStrip compact className="!grid-cols-1" />
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function FieldError({ text }: { text: string }) {
  return <span className="mt-1 block text-[11px] font-bold text-rose-600">{text}</span>;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <CheckoutBody />
    </Suspense>
  );
}
