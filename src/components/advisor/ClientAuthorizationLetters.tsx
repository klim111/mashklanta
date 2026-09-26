'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Eye, FileSignature, Loader2, Lock, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authorizationDocumentKey } from '@/lib/authorization-letters';
import type { AuthorizationLettersView } from '@/lib/authorization-letter-store';
import { PRE_APPROVAL_BANKS } from '@/components/plan/stages/preapproval/banks';
import { BankMark } from '@/components/plan/stages/preapproval/BankMark';
import { SectionCard } from './ui';

/** כל מופעי ההוק בעמוד מתרעננים יחד אחרי שליחה */
const CHANGE_EVENT = 'mashklanta:authorization-letters-changed';

function useAuthorizationLetters(clientId: string) {
  const [view, setView] = useState<AuthorizationLettersView | null>(null);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/authorization-letters`, { cache: 'no-store' });
      if (response.ok) setView((await response.json()) as AuthorizationLettersView);
    } catch {
      // בלי חיבור הלשונית פשוט נשארת ריקה
    } finally {
      setReady(true);
    }
  }, [clientId]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [refresh]);

  const send = useCallback(async (): Promise<boolean> => {
    setSending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/clients/${clientId}/authorization-letters`, { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage({ tone: 'error', text: body?.error ?? 'השליחה נכשלה. נסו שוב.' });
        return false;
      }
      setMessage({
        tone: 'ok',
        text: body?.alreadyOpen
          ? 'המשימה כבר פתוחה אצל הלקוח, ולא נשלחה פעם שנייה.'
          : 'המשימה נשלחה ללקוח. היא מופיעה אצלו ברשימת המשימות ובלוח השנה.',
      });
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return true;
    } catch {
      setMessage({ tone: 'error', text: 'השליחה נכשלה. נסו שוב.' });
      return false;
    } finally {
      setSending(false);
    }
  }, [clientId]);

  return { view, ready, sending, message, send };
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL');
}

/**
 * כפתור השליחה של המשימה "כתבי הסמכה ליועץ", עם חלון שמסביר מה הלקוח יקבל.
 * פעולת יועץ — ולכן בסגול.
 */
export function SendAuthorizationButton({
  clientId,
  clientName,
  className = '',
}: {
  clientId: string;
  clientName: string;
  className?: string;
}) {
  const { view, sending, message, send } = useAuthorizationLetters(clientId);
  const [open, setOpen] = useState(false);
  const pending = view?.request?.status === 'OPEN';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-button font-black text-white transition-colors hover:bg-violet-700 ${className}`}
      >
        <FileSignature className="h-4 w-4" />
        כתבי הסמכה ללקוח
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md text-right">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-right">
              <FileSignature className="h-5 w-5 text-violet-600" />
              שליחת כתבי הסמכה ל{clientName}
            </DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              הלקוח יקבל משימה שפותחת חלון עם הטפסים של כל הבנקים. הוא מוריד, חותם ומעלה כתב הסמכה לכל בנק
              שיבחר, וכל כתב חתום מופיע אצלכם בתיק המסמכים שלו, בלשונית &quot;כתבי הסמכה חתומים&quot;.
            </DialogDescription>
          </DialogHeader>

          {pending && view?.request && (
            <p dir="rtl" className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              משימה כזו כבר פתוחה אצל הלקוח מאז {formatDay(view.request.sentAt)}.
            </p>
          )}
          {message && (
            <p dir="rtl"
              role="status"
              className={`rounded-xl px-3.5 py-2.5 text-sm ${
                message.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}
            >
              {message.text}
            </p>
          )}

          <div dir="rtl" className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-button font-bold text-slate-600 hover:bg-slate-50"
            >
              {message?.tone === 'ok' ? 'סגירה' : 'ביטול'}
            </button>
            {message?.tone !== 'ok' && (
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || pending}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-button font-black text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                שליחה ללקוח
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * הלשונית "כתבי הסמכה חתומים" בתיק המסמכים של הלקוח: שורה לכל בנק, עם הכתב
 * החתום כשהלקוח העלה אותו, ומצב המשימה שנשלחה אליו.
 */
export function ClientAuthorizationLetters({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { view, ready } = useAuthorizationLetters(clientId);
  const letters = new Map((view?.letters ?? []).map((letter) => [letter.key, letter]));
  const signed = PRE_APPROVAL_BANKS.filter((info) => letters.has(authorizationDocumentKey(info.slug))).length;
  const request = view?.request ?? null;

  return (
    <SectionCard
      title="כתבי הסמכה חתומים"
      icon={<FileSignature className="h-4 w-4 text-violet-600" />}
      action={<SendAuthorizationButton clientId={clientId} clientName={clientName} />}
    >
      {!ready ? (
        <div dir="rtl" className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <div dir="rtl" className="space-y-3">
          <p dir="rtl" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            {request ? (
              request.status === 'OPEN' ? (
                <span dir="rtl" className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                  <Clock className="h-4 w-4" />
                  נשלח ללקוח ב-{formatDay(request.sentAt)}, ממתין להעלאה
                </span>
              ) : (
                <span dir="rtl" className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  הלקוח סיים להעלות
                  {request.completedAt ? ` ב-${formatDay(request.completedAt)}` : ''}
                </span>
              )
            ) : (
              <span>עוד לא נשלחה ללקוח בקשה לכתבי הסמכה.</span>
            )}
            <span dir="rtl" className="text-slate-400">·</span>
            <span>
              {signed} מתוך {PRE_APPROVAL_BANKS.length} בנקים
            </span>
            {view && !view.planId && (
              <span dir="rtl" className="text-2xs text-slate-500">ללקוח עדיין אין תהליך משכנתא, ולכן אי אפשר לשלוח עדיין.</span>
            )}
          </p>

          <div dir="rtl" className="space-y-2">
            {PRE_APPROVAL_BANKS.map((info) => {
              const letter = letters.get(authorizationDocumentKey(info.slug)) ?? null;
              return (
                <div dir="rtl"
                  key={info.slug}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    letter ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <BankMark info={info} size={32} />
                  <span dir="rtl" className="min-w-0 flex-1 text-right">
                    <span dir="rtl" className="block truncate text-sm font-black text-slate-900">{info.fullName}</span>
                    <span dir="rtl" className="block truncate text-2xs text-slate-500">
                      {letter ? `${letter.fileName} · ${formatDay(letter.uploadedAt)}` : 'לא הועלה כתב חתום'}
                    </span>
                  </span>
                  {letter ? (
                    <a
                      href={`/api/plans/${letter.planId}/documents/${letter.id}/content`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-2xs font-black text-white transition-colors hover:bg-slate-700"
                    >
                      <Eye className="h-3 w-3" />
                      צפייה
                    </a>
                  ) : (
                    <span dir="rtl" className="text-2xs font-bold text-slate-400">חסר</span>
                  )}
                </div>
              );
            })}
          </div>

          <p dir="rtl" className="flex items-center gap-1 text-2xs text-slate-400">
            <Lock className="h-3 w-3" />
            הכתבים נשמרים באחסון פרטי, והצפייה עוברת דרך בדיקה שאתם מלווים את הלקוח
          </p>
        </div>
      )}
    </SectionCard>
  );
}
