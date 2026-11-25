'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Check, Copy, ExternalLink, Loader2, Pause, Play, RefreshCw, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ApplicationView, OfficeAdminView } from '@/lib/advisor-applications';
import { SectionCard } from './ui';

const fmtDate = (value: string) => new Date(value).toLocaleDateString('he-IL');

const STATUS_LABEL: Record<ApplicationView['status'], string> = {
  PENDING: 'ממתינה לאישור',
  APPROVED: 'אושרה',
  REJECTED: 'נדחתה',
};

const STATUS_STYLE: Record<ApplicationView['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-slate-100 text-slate-600 border-slate-200',
};

/**
 * ניהול הפלטפורמה → יועצים ומשרדים: בקשות ההצטרפות של יועצים (אישור או דחייה),
 * ורשימת המשרדים עם השעיה. מנהל הפלטפורמה לא רואה כאן שום נתון של לקוחות —
 * רק כמה תיקים יש בכל משרד.
 */
export function AdvisorsAdminPanel() {
  const [applications, setApplications] = useState<ApplicationView[] | null>(null);
  const [offices, setOffices] = useState<OfficeAdminView[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/advisor/platform/advisors', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body) throw new Error(body?.error ?? 'הטעינה נכשלה');
      setApplications(body.applications);
      setOffices(body.offices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הטעינה נכשלה');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, action: 'approve' | 'reject', note?: string) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/advisor/platform/advisors/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'הפעולה נכשלה');
      setRejecting(null);
      setRejectNote('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה');
    } finally {
      setBusy(null);
    }
  }

  async function suspend(office: OfficeAdminView, suspended: boolean) {
    setBusy(office.id);
    setError(null);
    try {
      const response = await fetch(`/api/advisor/platform/offices/${encodeURIComponent(office.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'הפעולה נכשלה');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה');
    } finally {
      setBusy(null);
    }
  }

  function copyJoinLink() {
    const url = `${window.location.origin}/join`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  const pending = (applications ?? []).filter((row) => row.status === 'PENDING');
  const decided = (applications ?? []).filter((row) => row.status !== 'PENDING');

  return (
    <div className="space-y-4 text-right">
      <SectionCard
        title={`בקשות הצטרפות${pending.length ? ` (${pending.length} ממתינות)` : ''}`}
        icon={<UserPlus className="h-4 w-4 text-violet-600" />}
        action={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyJoinLink}>
              <Copy className="ml-1 h-4 w-4" />
              {copied ? 'הועתק' : 'קישור להצטרפות'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 p-4">
          <p className="text-sm text-slate-600">
            יועץ שממלא את הטופס בדף ההצטרפות מופיע כאן. רק אחרי שתאשרו, נפתחים לו חשבון ומשרד משלו, והוא מקבל מייל
            עם הקישור לכניסה. כל יועץ רואה רק את הלקוחות של המשרד שלו.
          </p>
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {applications && pending.length === 0 && (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">אין בקשות שממתינות לאישור.</p>
          )}
          {pending.map((row) => (
            <ApplicationCard key={row.id} row={row}>
              {rejecting === row.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={rejectNote}
                    onChange={(event) => setRejectNote(event.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="סיבה (לא חובה). אם תכתבו, היא תישלח ליועץ במייל"
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy === row.id}
                      onClick={() => void decide(row.id, 'reject', rejectNote)}
                    >
                      שליחת דחייה
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={busy === row.id} onClick={() => void decide(row.id, 'approve')}>
                    {busy === row.id ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Check className="ml-1 h-4 w-4" />}
                    אישור ופתיחת משרד
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy === row.id}
                    onClick={() => {
                      setRejecting(row.id);
                      setRejectNote('');
                    }}
                  >
                    <X className="ml-1 h-4 w-4" />
                    דחייה
                  </Button>
                </div>
              )}
            </ApplicationCard>
          ))}
          {decided.length > 0 && (
            <details className="rounded-xl border border-slate-100">
              <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-slate-600">
                בקשות שטופלו ({decided.length})
              </summary>
              <div className="space-y-2 p-3">
                {decided.map((row) => (
                  <ApplicationCard key={row.id} row={row} compact />
                ))}
              </div>
            </details>
          )}
        </div>
      </SectionCard>

      <SectionCard title={`משרדים (${offices.length})`} icon={<Building2 className="h-4 w-4 text-blue-600" />}>
        <div className="divide-y divide-slate-100">
          {offices.map((office) => (
            <div key={office.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{office.name}</span>
                  {office.platformOffice && (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">
                      המשרד שלך
                    </span>
                  )}
                  {office.suspended ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">מושעה</span>
                  ) : office.published ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">פעיל</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      הדף עוד לא הופעל
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {office.ownerName || 'ללא שם'} · {office.ownerEmail} · {office.clients} תיקים · נפתח {fmtDate(office.createdAt)}
                </div>
              </div>
              <div className="flex gap-2">
                {office.published && !office.suspended && (
                  <a
                    href={`/o/${office.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    לדף
                  </a>
                )}
                {!office.platformOffice && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy === office.id}
                    onClick={() => void suspend(office, !office.suspended)}
                  >
                    {office.suspended ? <Play className="ml-1 h-4 w-4" /> : <Pause className="ml-1 h-4 w-4" />}
                    {office.suspended ? 'החזרה לפעילות' : 'השעיה'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ApplicationCard({
  row,
  compact = false,
  children,
}: {
  row: ApplicationView;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold text-slate-900">
          {row.name} · {row.officeName}
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </span>
      </div>
      <div className="mt-1 text-sm text-slate-600" dir="auto">
        {row.email} · {row.phone}
        {row.licenseNumber ? ` · רישיון ${row.licenseNumber}` : ''}
        {row.website ? ` · ${row.website}` : ''}
      </div>
      {!compact && row.message && (
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{row.message}</p>
      )}
      <div className="mt-1 text-xs text-slate-400">
        נשלחה {fmtDate(row.createdAt)}
        {row.decidedAt ? ` · טופלה ${fmtDate(row.decidedAt)}` : ''}
        {row.decisionNote ? ` · ${row.decisionNote}` : ''}
      </div>
      {children}
    </div>
  );
}
