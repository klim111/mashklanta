'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CreditCard, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export interface OpenProcess {
  id: string;
  name: string;
}

/** הכתובת של מסך התשלום על תהליך נוסף. `back` — לאן חוזרים אחרי התשלום, במקום פתיחת התהליך מהדאשבורד */
export function extraProcessCheckoutHref(goal: 'NEW_MORTGAGE' | 'REFINANCE', back?: string): string {
  const params = new URLSearchParams({ next: 'plan', goal, extra: '1' });
  if (back) params.set('back', back);
  return `/dashboard/checkout?${params.toString()}`;
}

/**
 * "התשלום הוא עבור תהליך משכנתא אחד".
 *
 * לקוח שיש לו תהליך שעוד לא הסתיים ומנסה לפתוח עוד תהליך — משכנתא חדשה או
 * מיחזור — בוחר כאן: לשלם על תהליך נוסף, או למחוק את התהליך הקודם. תשלום
 * ששולם על התהליך שנמחק עובר לתהליך החדש עד סוף החודש שלו. המחיקה סופית,
 * ולכן היא נשאלת במפורש לפני שהיא מתבצעת.
 */
export function OneProcessNotice({
  open,
  onOpenChange,
  plans,
  goal,
  price,
  onPay,
  deletePlan,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** התהליכים הפתוחים, מהחדש לישן */
  plans: OpenProcess[];
  goal: 'NEW_MORTGAGE' | 'REFINANCE';
  price: number;
  onPay: () => void;
  /** מחזיר הודעת שגיאה כשהמחיקה נדחתה, או null כשהצליחה */
  deletePlan: (planId: string) => Promise<string | null>;
  /** התהליך נמחק — ממשיכים לפתיחת התהליך החדש */
  onDeleted: (planId: string) => void | Promise<void>;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmId(null);
    setError(null);
  }, [open]);

  const remove = async (planId: string) => {
    setBusy(true);
    setError(null);
    try {
      const failure = await deletePlan(planId);
      if (failure) {
        setError(failure);
        return;
      }
      setConfirmId(null);
      await onDeleted(planId);
    } finally {
      setBusy(false);
    }
  };

  const what = goal === 'REFINANCE' ? 'תהליך מיחזור' : 'תהליך משכנתא חדשה';
  const single = plans.length === 1 ? plans[0] : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent dir="rtl" className="max-w-lg rounded-3xl bg-white p-6">
        <DialogTitle className="flex items-center justify-center gap-2 text-center text-subtitle font-black text-slate-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          התשלום הוא עבור תהליך משכנתא אחד
        </DialogTitle>
        <DialogDescription className="text-center text-info leading-relaxed text-slate-600">
          {single ? (
            <>
              התהליך <span className="font-black text-slate-900">{single.name}</span> עוד לא הסתיים.
            </>
          ) : (
            'יש לכם תהליכים שעוד לא הסתיימו.'
          )}{' '}
          כדי לפתוח {what}, שלמו על תהליך נוסף או מחקו את התהליך הקודם.
        </DialogDescription>

        <button
          type="button"
          disabled={busy}
          onClick={onPay}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-button font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          <CreditCard className="h-4 w-4" />
          תשלום על תהליך נוסף · ₪{price}
        </button>

        <div className="space-y-2">
          <p className="text-center text-sm font-bold text-slate-500">או מחיקת התהליך הקודם</p>
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border-2 border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-black text-slate-900">{plan.name}</span>
                <Link
                  href={`/dashboard/plans/${plan.id}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm font-black text-blue-700 hover:bg-blue-50"
                >
                  המשך בתהליך
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    setConfirmId(confirmId === plan.id ? null : plan.id);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  מחיקה
                </button>
              </div>
              {confirmId === plan.id && (
                <div className="mt-3 space-y-3 rounded-xl bg-rose-50 p-3 text-sm leading-relaxed text-rose-900">
                  <p>
                    המחיקה סופית: התהליך, השלבים שמילאתם בו ופרטי הנכס יימחקו. הפרופיל הפיננסי נשמר ונטען בתהליך החדש.
                    תשלום ששולם על התהליך הזה עובר לתהליך החדש, עד סוף החודש שלו.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(plan.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 font-black text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      כן, מחקו ופתחו {what}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmId(null)}
                      className="rounded-xl border-2 border-rose-200 bg-white px-4 py-2 font-black text-rose-800 hover:bg-rose-100"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-info font-bold leading-relaxed text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => onOpenChange(false)}
          className="text-button rounded-2xl border-2 border-slate-200 px-5 py-2.5 font-black text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          סגירה
        </button>
      </DialogContent>
    </Dialog>
  );
}
