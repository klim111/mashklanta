'use client';

/**
 * טופס פרטי הלקוח, בדף הלקוח באזור היועץ: הפקת קישור לטופס (העתקה או שליחה
 * במייל ללקוח), המצב שלו — נשלח, שודר — ומעבר לדוח המסכם.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardList, Copy, FileText, Link2, Loader2, Mail } from 'lucide-react';

interface IntakeView {
  caseId: string | null;
  requestedAt: string | null;
  submittedAt: string | null;
  registered: boolean;
  url: string;
  emailed?: boolean;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ClientIntakeCard({ clientId, clientEmail }: { clientId: string; clientEmail?: string | null }) {
  const [view, setView] = useState<IntakeView | null>(null);
  const [busy, setBusy] = useState<'link' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkShown, setLinkShown] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/intake-form`, { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setView((await res.json()) as IntakeView);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const produce = async (email: boolean) => {
    setBusy(email ? 'email' : 'link');
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/intake-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'הפקת הקישור נכשלה');
      setView(body as IntakeView);
      setLinkShown(true);
      if (email) {
        setNote(body.emailed ? `הקישור נשלח במייל ל-${clientEmail ?? 'לקוח'}` : 'שליחת המייל נכשלה — אפשר להעתיק את הקישור ולשלוח אותו בעצמכם');
      }
    } catch (err: any) {
      setError(err?.message ?? 'הפקת הקישור נכשלה');
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!view) return;
    try {
      await navigator.clipboard.writeText(view.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLinkShown(true);
    }
  };

  if (!view) return null;

  const status = view.submittedAt
    ? { text: `הלקוח שידר את הטופס ב-${when(view.submittedAt)}`, tone: 'bg-emerald-100 text-emerald-800' }
    : view.requestedAt
      ? { text: `הקישור הופק ב-${when(view.requestedAt)} · הלקוח עוד לא שידר`, tone: 'bg-amber-100 text-amber-800' }
      : { text: 'עוד לא הופק קישור ללקוח', tone: 'bg-slate-100 text-slate-600' };

  return (
    <section dir="rtl" className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-slate-900">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            טופס פרטי הלקוח
          </p>
          <p className="mt-1 text-sm text-slate-600">
            טופס אחד עם כל הפרטים: לווים והכנסות, הלוואה ונכס, מקורות מימון, חשבונות בנק וערבים.
          </p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${status.tone}`}>
            {status.text}
          </span>
        </div>
        <Link
          href={`/advisor-dashboard/client/${clientId}/client-details`}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
        >
          <FileText className="h-4 w-4" />
          צפייה בדוח המסכם
        </Link>
      </div>

      {view.registered ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void produce(false)}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-sm font-black text-blue-800 hover:border-blue-400 disabled:opacity-60"
          >
            {busy === 'link' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {view.requestedAt ? 'הפקת הקישור מחדש' : 'הפקת קישור לטופס'}
          </button>
          {clientEmail && (
            <button
              type="button"
              onClick={() => void produce(true)}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-sm font-black text-blue-800 hover:border-blue-400 disabled:opacity-60"
            >
              {busy === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              שליחת הקישור במייל ללקוח
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">אפשר לשלוח את הטופס אחרי שהלקוח יירשם לאתר.</p>
      )}

      {linkShown && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-white p-2.5">
          <code dir="ltr" className="min-w-0 flex-1 truncate text-sm text-slate-800">
            {view.url}
          </code>
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'הועתק' : 'העתקה'}
          </button>
          <p className="w-full text-xs text-slate-500">
            הקישור פותח ללקוח את הטופס ישר אחרי הכניסה לחשבון שלו.
          </p>
        </div>
      )}

      {note && <p className="mt-2 text-sm font-medium text-slate-700">{note}</p>}
      {error && <p className="mt-2 text-sm font-medium text-rose-700">{error}</p>}
    </section>
  );
}
