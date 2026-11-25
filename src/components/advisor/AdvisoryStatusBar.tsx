'use client';

import { useState } from 'react';
import { Flag, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { usePricing } from '@/components/pricing/PricingProvider';
import { setAdvisoryEnded } from './advisory-end';

/**
 * מצב הליווי בתהליך, בראש תיק הלקוח: כל עוד הליווי פעיל, ללקוח פתוחים כל הכלים
 * בלי הגבלת זמן. כשהיועץ מסמן שהליווי הסתיים, הלקוח מקבל הצעה להמשיך לבד
 * במחיר החודשי — במייל ובפלטפורמה.
 */
export function AdvisoryStatusBar({
  planId,
  advisory,
  onChanged,
}: {
  planId: string;
  advisory: { active: boolean; endedAt: string | null };
  onChanged: () => Promise<void> | void;
}) {
  const { platformPrice } = usePricing();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const change = async (ended: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await setAdvisoryEnded(planId, ended, platformPrice);
      if (!result) return;
      await onChanged();
      if (ended) {
        setMessage(
          result.emailed
            ? { tone: 'ok', text: 'הליווי סומן כהסתיים, והלקוח קיבל מייל עם ההצעה להמשך.' }
            : { tone: 'error', text: 'הליווי סומן כהסתיים, אבל המייל ללקוח לא נשלח. ההצעה תוצג לו בפלטפורמה.' },
        );
      }
    } catch {
      setMessage({ tone: 'error', text: 'הפעולה לא נשמרה. נסו שוב.' });
    } finally {
      setBusy(false);
    }
  };

  const endedOn = advisory.endedAt
    ? new Date(advisory.endedAt).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })
    : null;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${
        advisory.active ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          advisory.active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
        }`}
      >
        {advisory.active ? <ShieldCheck className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">
          {advisory.active ? 'ליווי פעיל בתהליך' : `הליווי בתהליך הסתיים${endedOn ? ` ב-${endedOn}` : ''}`}
        </div>
        <div className="text-xs leading-relaxed text-slate-600">
          {advisory.active
            ? 'ללקוח פתוחים כל הכלים בלי הגבלת זמן, עד שתסמנו שהליווי הסתיים.'
            : `הלקוח קיבל הצעה להמשיך לבד ב-₪${platformPrice} לחודש. כשהוא משלם, הכלים נפתחים לו לחודש.`}
        </div>
        {message && (
          <div className={`mt-1 text-xs font-bold ${message.tone === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {message.text}
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void change(advisory.active)}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-colors disabled:opacity-60 ${
          advisory.active
            ? 'bg-slate-900 text-white hover:bg-slate-700'
            : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
        }`}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : advisory.active ? (
          <Flag className="h-3.5 w-3.5" />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" />
        )}
        {advisory.active ? 'סיום הליווי בתהליך' : 'ביטול הסיום'}
      </button>
    </div>
  );
}
