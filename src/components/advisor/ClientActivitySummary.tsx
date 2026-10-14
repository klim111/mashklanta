'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Eye,
  FolderOpen,
  Loader2,
  Mail,
  Send,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { daysUntil } from '@/lib/process-access';
import { PAYMENT_KIND_LABELS } from '@/lib/client-billing';
import type { ClientActivity } from '@/lib/client-activity';
import { EmptyState, SectionCard, StageChip, formatShekel } from './ui';

const DATE = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const fmt = (iso: string | null | undefined, withTime = false) =>
  iso ? (withTime ? DATE_TIME : DATE).format(new Date(iso)) : '—';

const PLAN_STATUS: Record<string, string> = {
  IN_PROGRESS: 'פעיל',
  COMPLETED: 'הסתיים',
  ARCHIVED: 'בארכיון',
};

/**
 * טאב "סיכום פעילות" בדף הלקוח: מתי נרשם, מתי שילם ועד מתי הגישה בתשלום,
 * הפרטים שלו, התהליכים שפתח, ושליחת מייל אליו ישירות מכאן.
 */
export function ClientActivitySummary({
  activity,
  ready,
  error,
}: {
  activity: ClientActivity | null;
  ready: boolean;
  error: string | null;
}) {
  if (!ready) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }
  if (error || !activity) {
    return (
      <p className="flex items-center justify-center gap-1 py-10 text-info text-red-600">
        <AlertTriangle className="h-4 w-4" />
        {error ?? 'לא הצלחנו לטעון את סיכום הפעילות'}
      </p>
    );
  }

  const { billing } = activity;
  const accessLeft = billing.accessEndsAt ? daysUntil(billing.accessEndsAt) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          icon={<UserPlus className="h-5 w-5" />}
          tone="blue"
          label="נרשם"
          value={fmt(activity.registeredAt)}
          hint={activity.selfRegistered ? 'נרשם לבד' : 'לקוח בליווי'}
        />
        <SummaryTile
          icon={<BadgeCheck className="h-5 w-5" />}
          tone={billing.paid ? 'emerald' : 'slate'}
          label="שילם"
          value={billing.paid ? fmt(billing.lastPaidAt) : 'עדיין לא שילם'}
          hint={
            billing.paid
              ? `${billing.payments.length} תשלומים · ${formatShekel(billing.totalPaid)} בסך הכול`
              : 'אין תשלום רשום'
          }
        />
        <SummaryTile
          icon={<CalendarClock className="h-5 w-5" />}
          tone={billing.accessActive ? 'emerald' : billing.accessEndsAt ? 'rose' : 'slate'}
          label="הגישה בתשלום"
          value={billing.accessEndsAt ? `עד ${fmt(billing.accessEndsAt)}` : 'אין חבילת גישה'}
          hint={
            billing.accessEndsAt
              ? billing.accessActive
                ? `נשארו ${accessLeft} ימים`
                : 'הגישה הסתיימה'
              : activity.selfRegistered
                ? 'לא נרכשה חבילה חודשית'
                : 'בליווי — הכלים פתוחים עד סיום הליווי'
          }
        />
        <SummaryTile
          icon={<Eye className="h-5 w-5" />}
          tone="violet"
          label="נראה לאחרונה באתר"
          value={activity.lastSeenAt ? fmt(activity.lastSeenAt, true) : 'אין נתון'}
          hint={activity.visitDays > 0 ? `ביקר ב-${activity.visitDays} ימים שונים` : 'אין ביקורים מחוברים'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="הפרטים שלו" icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />}>
          <dl className="grid gap-x-4 gap-y-2 text-info sm:grid-cols-2">
            <Detail label="שם" value={activity.name} />
            <Detail label="מייל" value={activity.accountEmail ?? activity.email} ltr />
            <Detail label="טלפון" value={activity.phone} ltr />
            <Detail label="פתח חשבון" value={fmt(activity.registeredAt, true)} />
            <Detail label="אישר את המייל" value={activity.emailVerifiedAt ? fmt(activity.emailVerifiedAt, true) : 'לא אושר'} />
            <Detail label="נוסף לרשימה שלך" value={fmt(activity.linkedAt, true)} />
            <Detail label="תשלום ראשון" value={fmt(billing.firstPaidAt, true)} />
            <Detail label="תשלום אחרון" value={fmt(billing.lastPaidAt, true)} />
            <Detail label="הודעות בצ'אט ממנו" value={String(activity.counts.chatFromClient)} />
            <Detail label="מיילים ממנו" value={String(activity.counts.emailsFromClient)} />
          </dl>
        </SectionCard>

        <EmailComposer activity={activity} />
      </div>

      <SectionCard title="תשלומים" icon={<CreditCard className="h-4 w-4 text-emerald-600" />}>
        {billing.payments.length === 0 ? (
          <EmptyState icon={<CreditCard className="h-6 w-6" />} title="עדיין אין תשלומים" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-info">
              <thead>
                <tr className="border-b border-slate-100 text-right text-2xs text-slate-500">
                  <th className="py-2 font-semibold">תאריך</th>
                  <th className="py-2 font-semibold">על מה</th>
                  <th className="py-2 font-semibold">סכום</th>
                  <th className="py-2 font-semibold">הגישה עד</th>
                </tr>
              </thead>
              <tbody>
                {billing.payments.map((payment, index) => (
                  <tr key={`${payment.kind}-${payment.paidAt}-${index}`} className="border-b border-slate-50">
                    <td className="py-2 text-slate-700">{fmt(payment.paidAt, true)}</td>
                    <td className="py-2 font-semibold text-slate-900">
                      {payment.title}
                      {payment.title !== PAYMENT_KIND_LABELS[payment.kind] && (
                        <span className="mr-1 text-2xs font-normal text-slate-500">
                          · {PAYMENT_KIND_LABELS[payment.kind]}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-slate-900">{payment.amount === null ? '—' : formatShekel(payment.amount)}</td>
                    <td className="py-2 text-slate-700">{fmt(payment.accessUntil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="התהליכים שפתח" icon={<FolderOpen className="h-4 w-4 text-violet-600" />}>
        {activity.plans.length === 0 ? (
          <EmptyState icon={<FolderOpen className="h-6 w-6" />} title="הלקוח עדיין לא פתח תהליך" />
        ) : (
          <ul className="space-y-2">
            {activity.plans.map((plan) => (
              <li
                key={plan.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3 text-info"
              >
                <span className="min-w-0 flex-1 truncate font-bold text-slate-900">{plan.name}</span>
                <StageChip stage={plan.currentStage} />
                <span className="text-2xs text-slate-500">
                  נפתח {fmt(plan.createdAt)} · עודכן {fmt(plan.updatedAt)}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-700">
                  {PLAN_STATUS[plan.status] ?? plan.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

const TILE_TONES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-500',
};

function SummaryTile({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TILE_TONES;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TILE_TONES[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xs font-semibold text-slate-500">{label}</p>
        <p className="text-info font-black text-slate-900">{value}</p>
        <p className="text-2xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function Detail({ label, value, ltr }: { label: string; value: string | null | undefined; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs text-slate-500">{label}</dt>
      <dd dir={ltr ? 'ltr' : undefined} className={`truncate font-bold text-slate-900 ${ltr ? 'text-right' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

/**
 * מייל ללקוח מתוך הסיכום. הוא יוצא דרך השיחה עם הלקוח, כך שהוא נשמר בטאב
 * המיילים ותשובה ממנו חוזרת לאותה שיחה.
 */
function EmailComposer({ activity }: { activity: ClientActivity }) {
  const to = activity.accountEmail ?? activity.email;
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !text.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/conversation/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientUserId: activity.userId, to: [to], subject, text }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setResult({ ok: false, message: body?.error ?? 'המייל לא נשלח. נסו שוב.' });
      } else {
        setSubject('');
        setText('');
        setResult({ ok: true, message: 'המייל נשלח ונשמר בשיחה עם הלקוח' });
      }
    } catch {
      setResult({ ok: false, message: 'המייל לא נשלח. נסו שוב.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="שליחת מייל ללקוח" icon={<Mail className="h-4 w-4 text-violet-600" />}>
      <form onSubmit={send} className="space-y-2">
        <p className="text-2xs text-slate-500">
          אל: <span dir="ltr">{to}</span>
        </p>
        <Input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="נושא"
          className="h-10 text-info"
          required
        />
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="תוכן המייל"
          aria-label="תוכן המייל"
          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
        {result && (
          <p className={`text-2xs font-semibold ${result.ok ? 'text-emerald-700' : 'text-red-600'}`}>{result.message}</p>
        )}
        <Button type="submit" className="text-button" disabled={busy || !subject.trim() || !text.trim()}>
          {busy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Send className="ml-1 h-4 w-4" />}
          שליחה
        </Button>
      </form>
    </SectionCard>
  );
}
