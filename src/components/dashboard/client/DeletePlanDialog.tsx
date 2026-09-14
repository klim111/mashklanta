'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { planHeadline } from '@/lib/client-agenda';
import type { PlanView } from '@/components/plan/usePlan';

/**
 * אישור מחיקת תהליך.
 *
 * המחיקה סופית ומוציאה את התהליך מבסיס הנתונים, ולכן היא נשאלת במפורש. מה
 * שנשאר הוא הפרופיל הפיננסי — הכנסות, הון עצמי, הלוואות וצפי — כדי שתהליך חדש
 * ייפתח עם אותם נתונים ולא יידרוש הזנה מחדש.
 *
 * שלב שהיועץ כבר עובד עליו בתשלום חוסם את המחיקה. במקרה כזה השרת מחזיר את
 * הסיבה, והיא מוצגת כאן במקום הצלחה.
 */
export function DeletePlanDialog({
  plan,
  open,
  onOpenChange,
  onDelete,
}: {
  plan: PlanView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** מחזיר הודעת שגיאה כשהמחיקה נדחתה, או null כשהצליחה */
  onDelete: () => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const failure = await onDelete();
      if (failure) setError(failure);
      else onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="justify-center text-center text-xl">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              למחוק את התהליך?
            </span>
          </DialogTitle>
          <DialogDescription className="text-center text-[15px]">
            {planHeadline(plan)}
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-[15px] leading-relaxed text-slate-700">
          המחיקה סופית: התהליך, השלבים שמילאתם בו ופרטי הנכס יימחקו.
          <br />
          <span className="font-black text-slate-900">
            הפרופיל הפיננסי שלכם נשמר — הכנסות, גילים, הון עצמי, הלוואות וצפי הכנסות — וייטען
            אוטומטית במשכנתא הבאה שתפתחו.
          </span>
        </p>

        {error && (
          <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] font-bold leading-relaxed text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-[15px] font-black text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            כן, מחקו את התהליך
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl border-2 border-slate-200 px-6 py-3 text-[15px] font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            ביטול
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
