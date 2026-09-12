'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PLAN_STAGES } from '@/lib/mortgage-plan';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import {
  ADVISOR_STAGE_PRICE,
  formatOrderPrice,
  quoteOrder,
  toggleStage,
} from '@/lib/advisor-orders';
import type { AdvisorOrder } from '@/lib/advisor-orders';
import { PLATFORM_MONTHLY_PRICE } from '@/data/platform/pricing';
import type { PaymentDetails } from './useAdvisorOrders';

type Step = 'stages' | 'payment' | 'done';

interface AdvisorOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** השלב שממנו נלחץ הכפתור — הוא מסומן מראש */
  stage: PlanStageId;
  /** השלבים שכבר שולמו, ולכן אינם ניתנים להזמנה שוב */
  alreadyOrdered: readonly PlanStageId[];
  onRequest: (stages: PlanStageId[]) => Promise<AdvisorOrder | null>;
  onPay: (orderId: string, details: PaymentDetails) => Promise<boolean>;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10';

/**
 * הזמנת ליווי יועץ לשלבים, ותשלום עליה.
 *
 * המסך הראשון הוא בחירת השלבים — כל צירוף אפשרי, לפי אותו מחירון שמופיע בעמוד
 * התמחור לגולשים שאינם רשומים. המסך השני הוא הזנת פרטי התשלום ואישור התנאים,
 * כנהוג בעסקים אונליין. רק אחרי שהתשלום עבר עוברים השלבים לידי היועץ.
 */
export function AdvisorOrderDialog({
  open,
  onOpenChange,
  stage,
  alreadyOrdered,
  onRequest,
  onPay,
}: AdvisorOrderDialogProps) {
  const [step, setStep] = useState<Step>('stages');
  const [selected, setSelected] = useState<PlanStageId[]>([]);
  const [order, setOrder] = useState<AdvisorOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // פרטי התשלום
  const [payerName, setPayerName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [terms, setTerms] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('stages');
    setSelected(alreadyOrdered.includes(stage) ? [] : [stage]);
    setOrder(null);
    setFailed(null);
    setTerms(false);
    setCardNumber('');
    setExpiry('');
    setCvv('');
    // alreadyOrdered משתנה בכל רינדור של ההורה, ולכן אינו בתלויות
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage]);

  const quote = useMemo(() => quoteOrder(selected), [selected]);

  const digits = cardNumber.replace(/\D/g, '');
  const paymentReady =
    payerName.trim().length > 1 &&
    digits.length >= 14 &&
    /^\d{2}\s*\/\s*\d{2}$/.test(expiry.trim()) &&
    /^\d{3,4}$/.test(cvv.trim()) &&
    terms;

  const goToPayment = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    setFailed(null);
    try {
      const created = await onRequest(selected);
      if (!created) {
        setFailed('הבקשה לא נשמרה. נסו שוב.');
        return;
      }
      setOrder(created);
      setStep('payment');
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = async () => {
    if (!order || !paymentReady) return;
    setBusy(true);
    setFailed(null);
    try {
      const ok = await onPay(order.id, {
        payerName: payerName.trim(),
        cardLast4: digits.slice(-4),
      });
      if (!ok) {
        setFailed('התשלום לא הושלם. בדקו את הפרטים ונסו שוב.');
        return;
      }
      setStep('done');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="flex max-h-[94vh] max-w-3xl flex-col gap-3">
        <DialogHeader className="shrink-0 pr-7">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            {step === 'stages'
              ? 'תנו ליועץ משכלנתא לעשות לכם את העבודה'
              : step === 'payment'
                ? 'פרטי התשלום'
                : 'הבקשה נשלחה ליועץ'}
          </DialogTitle>
          <DialogDescription>
            {step === 'stages'
              ? 'בחרו אילו שלבים היועץ יבצע עבורכם. אפשר שלב אחד, כמה שלבים או את כולם — ומה שלא תבחרו נשאר אצלכם, עם כל הכלים.'
              : step === 'payment'
                ? 'התשלום מאובטח. פרטי הכרטיס אינם נשמרים אצלנו — נרשמות רק ארבע הספרות האחרונות, לזיהוי החיוב.'
                : order?.advisorName
                  ? `${order.advisorName} קיבל/ה את הבקשה ויחזור/תחזור אליכם.`
                  : 'הבקשה נרשמה ומשויכת ליועץ. הוא יצור איתכם קשר בהקדם.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pl-1">
          {step === 'stages' && (
            <StageChooser
              selected={selected}
              alreadyOrdered={alreadyOrdered}
              onToggle={(item) => setSelected((current) => toggleStage(current, item))}
              onSelectAll={() =>
                setSelected(PLAN_STAGES.filter((item) => !alreadyOrdered.includes(item)))
              }
            />
          )}

          {step === 'payment' && order && (
            <div className="space-y-3">
              <OrderSummary stages={order.stages} amount={order.amount} />

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-bold text-slate-600">שם בעל הכרטיס</span>
                  <input
                    className={inputClass}
                    value={payerName}
                    onChange={(event) => setPayerName(event.target.value)}
                    placeholder="כפי שמופיע על הכרטיס"
                    autoComplete="cc-name"
                  />
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                    <CreditCard className="h-3.5 w-3.5" />
                    מספר כרטיס
                  </span>
                  <input
                    className={inputClass}
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                    placeholder="0000 0000 0000 0000"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600">תוקף</span>
                  <input
                    className={inputClass}
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                    placeholder="MM/YY"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600">CVV</span>
                  <input
                    className={inputClass}
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvv}
                    onChange={(event) => setCvv(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                  />
                </label>
              </div>

              <TermsBox accepted={terms} onChange={setTerms} amount={order.amount} />

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                התשלום מועבר בתקן מאובטח. פרטי הכרטיס אינם נשמרים בפלטפורמה.
              </p>
            </div>
          )}

          {step === 'done' && order && (
            <div className="space-y-3 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <BadgeCheck className="h-8 w-8 text-emerald-600" />
              </span>
              <p className="text-sm font-black text-slate-900">
                {order.advisorName
                  ? `התשלום התקבל, והבקשה נפתחה אצל היועץ ${order.advisorName}.`
                  : 'התשלום התקבל. הבקשה ממתינה לשיוך ליועץ שילווה אתכם.'}
              </p>
              <p className="text-xs text-slate-500">
                השלבים שהזמנתם מוצגים מעכשיו כסיכום קצר, עם כפתור ״ראה פרטים״ לכל מה שמאחוריו.
                אתם ממשיכים לעבוד רגיל בכל שאר השלבים.
              </p>
              <OrderSummary stages={order.stages} amount={order.amount} />
            </div>
          )}

          {failed && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              {failed}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          {step === 'stages' && (
            <>
              <div className="text-sm">
                <span className="font-black text-slate-900">{formatOrderPrice(quote.total)}</span>
                {quote.saving > 0 && (
                  <span className="mr-2 text-[11px] font-bold text-emerald-700">
                    חיסכון {formatOrderPrice(quote.saving)} בחבילה המלאה
                  </span>
                )}
                <span className="mr-2 text-[11px] text-slate-500">
                  כולל גישה מלאה לפלטפורמה ({formatOrderPrice(PLATFORM_MONTHLY_PRICE)} לחודש) ללא
                  תוספת
                </span>
              </div>
              <button
                type="button"
                disabled={selected.length === 0 || busy}
                onClick={() => void goToPayment()}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-black text-white transition-all ${
                  selected.length > 0 && !busy
                    ? 'bg-violet-600 shadow-sm hover:bg-violet-700'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400'
                }`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                עבור לתשלום
                <ArrowLeft className="h-4 w-4" />
              </button>
            </>
          )}

          {step === 'payment' && order && (
            <>
              <button
                type="button"
                onClick={() => setStep('stages')}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowRight className="h-4 w-4" />
                חזרה לבחירת השלבים
              </button>
              <button
                type="button"
                disabled={!paymentReady || busy}
                onClick={() => void confirmPayment()}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-black text-white transition-all ${
                  paymentReady && !busy
                    ? 'bg-emerald-600 shadow-sm hover:bg-emerald-700'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400'
                }`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                אשרו ושלמו {formatOrderPrice(order.amount)}
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mr-auto rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-700"
            >
              חזרה לתהליך
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StageChooser({
  selected,
  alreadyOrdered,
  onToggle,
  onSelectAll,
}: {
  selected: readonly PlanStageId[];
  alreadyOrdered: readonly PlanStageId[];
  onToggle: (stage: PlanStageId) => void;
  onSelectAll: () => void;
}) {
  const open = PLAN_STAGES.filter((stage) => !alreadyOrdered.includes(stage));
  const allSelected = open.length > 0 && open.every((stage) => selected.includes(stage));

  return (
    <div className="space-y-2">
      {open.length > 1 && (
        <button
          type="button"
          onClick={onSelectAll}
          disabled={allSelected}
          className={`w-full rounded-2xl border-2 border-dashed px-4 py-2.5 text-xs font-black transition-colors ${
            allSelected
              ? 'border-violet-300 bg-violet-50 text-violet-700'
              : 'border-slate-300 text-slate-600 hover:border-violet-400 hover:text-violet-700'
          }`}
        >
          {allSelected ? 'כל השלבים נבחרו — ליווי מלא' : 'בחרו את כל השלבים — ליווי מלא בהנחה'}
        </button>
      )}

      {PLAN_STAGES.map((stage) => {
        const journey = journeyStageFor(stage);
        const Icon = journey.icon;
        const done = alreadyOrdered.includes(stage);
        const active = selected.includes(stage);

        return (
          <button
            key={stage}
            type="button"
            disabled={done}
            onClick={() => onToggle(stage)}
            aria-pressed={active}
            className={`w-full overflow-hidden rounded-2xl border-2 text-right transition-all ${
              done
                ? 'cursor-default border-emerald-200 bg-emerald-50/60'
                : active
                  ? 'border-violet-400 bg-violet-50/60 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className={`h-1 w-full bg-gradient-to-l ${journey.gradient}`} />
            <div className="grid gap-3 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${journey.gradient} shadow`}
              >
                <Icon className="h-5 w-5 text-white" />
              </span>

              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500">
                  שלב {journey.number} · {journey.duration}
                </div>
                <div className="text-sm font-black text-slate-900">{journey.title}</div>
                <p className="text-[11px] leading-snug text-slate-600">
                  {journey.valueHeadline} — {journey.tagline}
                </p>
              </div>

              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                <div className="text-left">
                  <div className="text-lg font-black text-slate-900">
                    {formatOrderPrice(ADVISOR_STAGE_PRICE[stage])}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {done ? 'כבר הוזמן' : 'עם יועץ'}
                  </div>
                </div>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    done
                      ? 'border-emerald-500 bg-emerald-500'
                      : active
                        ? 'border-violet-600 bg-violet-600'
                        : 'border-slate-300'
                  }`}
                >
                  {(active || done) && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function OrderSummary({ stages, amount }: { stages: PlanStageId[]; amount: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 text-[11px] font-black text-slate-500">מה הזמנתם</div>
      <ul className="space-y-1">
        {stages.map((stage) => {
          const journey = journeyStageFor(stage);
          return (
            <li key={stage} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800">
                שלב {journey.number} · {journey.title}
              </span>
              <span className="tabular-nums text-slate-600">
                {formatOrderPrice(ADVISOR_STAGE_PRICE[stage])}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
        <span className="font-black text-slate-900">סך הכול לתשלום</span>
        <span className="font-black tabular-nums text-slate-900">{formatOrderPrice(amount)}</span>
      </div>
    </div>
  );
}

function TermsBox({
  accepted,
  onChange,
  amount,
}: {
  accepted: boolean;
  onChange: (value: boolean) => void;
  amount: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 text-[11px] font-black text-slate-600">תנאי ההתקשרות</div>
      <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
        <p>
          הליווי ניתן על ידי יועץ משכנתאות מורשה מטעם הפלטפורמה, ומתייחס לשלבים שנבחרו בלבד.
          שלבים שלא הוזמנו נשארים באחריות הלקוח.
        </p>
        <p>
          התשלום בסך {formatOrderPrice(amount)} הוא חד-פעמי עבור השלבים שנבחרו, וכולל את הגישה
          המלאה לפלטפורמה עד לקבלת המשכנתא, ללא תשלום חודשי נוסף.
        </p>
        <p>
          היועץ פועל לטובת הלקוח מול הבנקים, אך אינו ערב לתוצאה: אישור המשכנתא, גובהה והריביות
          שייקבעו נתונים להחלטת הבנק בלבד.
        </p>
        <p>
          ביטול העסקה אפשרי עד תחילת ביצוע השלב, בהתאם לחוק הגנת הצרכן. לאחר תחילת הביצוע יחויב
          הלקוח בחלק היחסי של השלב שבוצע.
        </p>
        <p>
          הנתונים שהוזנו בתהליך ייחשפו ליועץ שמלווה אתכם לצורך ביצוע השלבים שהוזמנו, ולא יועברו
          לצד שלישי אחר.
        </p>
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
        <span className="text-xs font-semibold text-slate-700">
          קראתי ואני מאשר/ת את תנאי ההתקשרות ואת מדיניות הפרטיות
        </span>
      </label>
    </div>
  );
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
