'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Clock, Copy, Loader2, Mail, RefreshCw, Trash2, UserX } from 'lucide-react';
import { EmptyState, SectionCard } from './ui';
import {
  DRAFT_FIELD_LABELS,
  type DraftField,
  type UnfinishedSignup,
  type UnfinishedStatus,
} from '@/lib/site-analytics';

const STATUS: Record<UnfinishedStatus, { label: string; className: string }> = {
  typing: { label: 'עזב באמצע ההקלדה', className: 'bg-amber-50 text-amber-800' },
  'awaiting-link': { label: 'לחץ "הירשם", לא אישר את המייל', className: 'bg-blue-50 text-blue-800' },
  'link-expired': { label: 'קישור האישור פג', className: 'bg-slate-100 text-slate-700' },
};

const SOURCE_LABELS: Record<string, string> = {
  register: 'עמוד ההרשמה',
  'guest-dialog': 'הרשמה מתוך כלי',
  google: 'הרשמה עם Google',
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function Field({ label, value, ltr }: { label: string; value: string | null; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      {value ? (
        <div dir={ltr ? 'ltr' : undefined} className={`truncate font-bold text-slate-900 ${ltr ? 'text-right' : ''}`}>
          {value}
        </div>
      ) : (
        <div className="text-sm text-slate-400">לא הוקלד</div>
      )}
    </div>
  );
}

/**
 * "הרשמות שלא הושלמו": מי שהתחיל להקליד פרטים בטופס ההרשמה ועזב, ומי ששלח
 * הרשמה ולא אישר את המייל — עם מה שנשמר עד איפה שהגיע. הסיסמה לא נשמרת אף פעם.
 */
export function UnfinishedSignupsPanel() {
  const [signups, setSignups] = useState<UnfinishedSignup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch('/api/advisor/signup-drafts', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const body = await response.json();
      setSignups(body.signups);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    setSignups((current) => current?.filter((signup) => signup.id !== id) ?? null);
    await fetch(`/api/advisor/signup-drafts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  };

  const copy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(email);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // הדפדפן חסם את ההעתקה — המייל גלוי על המסך בכל מקרה
    }
  };

  return (
    <SectionCard
      title={`הרשמות שלא הושלמו${signups ? ` (${signups.length})` : ''}`}
      icon={<UserX className="h-4 w-4 text-blue-600" />}
      action={
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          רענון
        </button>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        הפרטים נשמרים בזמן שהמבקר מקליד בטופס ההרשמה, גם אם לא לחץ &quot;הירשם&quot;. מי שסיים להירשם יורד
        מהרשימה מעצמו. הסיסמה לא נשמרת.
      </p>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">לא הצלחנו לטעון את הרשימה. נסו לרענן.</p>
      )}

      {!signups && loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {signups && signups.length === 0 && (
        <EmptyState
          icon={<UserX className="h-6 w-6" />}
          title="אין כרגע הרשמות שלא הושלמו"
          hint="כשמישהו יתחיל להקליד פרטים בטופס ההרשמה ויעזוב לפני הסוף, הוא יופיע כאן."
        />
      )}

      {signups && signups.length > 0 && (
        <ul className="space-y-3">
          {signups.map((signup) => {
            const status = STATUS[signup.status];
            const stoppedAt =
              signup.status === 'typing' && signup.lastField
                ? DRAFT_FIELD_LABELS[signup.lastField as DraftField]
                : null;
            return (
              <li key={signup.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-slate-500">{SOURCE_LABELS[signup.source] ?? signup.source}</span>
                    {stoppedAt && <span className="text-xs text-slate-500">· הקליד אחרון: {stoppedAt}</span>}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {formatWhen(signup.lastActivityAt)}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="שם מלא" value={signup.name} />
                  <Field label="שם משתמש" value={signup.username} ltr />
                  <Field label="מייל" value={signup.email} ltr />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    {signup.pageViews > 0
                      ? `ראה ${signup.pageViews} עמודים באתר ב-${signup.sessions} ביקורים`
                      : signup.sendCount > 1
                        ? `נשלחו ${signup.sendCount} מיילי אישור`
                        : ''}
                    {!signup.emailLooksValid && signup.email ? ' · המייל לא הוקלד עד הסוף' : ''}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {signup.email && signup.emailLooksValid && (
                      <>
                        <a
                          href={`mailto:${signup.email}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          <Mail className="h-4 w-4" />
                          שליחת מייל
                        </a>
                        <button
                          type="button"
                          onClick={() => copy(signup.email!)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Copy className="h-4 w-4" />
                          {copied === signup.email ? 'הועתק' : 'העתקת המייל'}
                        </button>
                      </>
                    )}
                    {signup.deletable && (
                      <button
                        type="button"
                        onClick={() => remove(signup.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        הסרה מהרשימה
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
