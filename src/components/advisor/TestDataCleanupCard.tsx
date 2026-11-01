'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CleanupPreview, CleanupResult, CleanupSelection } from '@/lib/test-data-cleanup';
import { SectionCard } from './ui';

const CONFIRM_WORD = 'מחק';

type Group = keyof CleanupSelection;

const fmtDate = (value: string) => new Date(value).toLocaleDateString('he-IL');

function emptySelection(): CleanupSelection {
  return { userIds: [], leadIds: [], taskIds: [], signupDraftIds: [], pendingRegistrationIds: [], departedClientIds: [] };
}

/** בברירת מחדל נבחר הכל, חוץ ממשימות כלליות שלא שייכות לשום לקוח */
function defaultSelection(preview: CleanupPreview): CleanupSelection {
  return {
    userIds: preview.accounts.map((row) => row.userId),
    leadIds: preview.guestLeads.map((row) => row.id),
    taskIds: [],
    signupDraftIds: preview.signupDrafts.map((row) => row.id),
    pendingRegistrationIds: preview.pendingRegistrations.map((row) => row.id),
    departedClientIds: preview.departedClients.map((row) => row.id),
  };
}

function countsLine(counts: CleanupPreview['accounts'][number]['counts']): string {
  const parts: string[] = [];
  if (counts.plans) parts.push(`${counts.plans} תהליכים`);
  if (counts.serviceOrders) parts.push(`${counts.serviceOrders} בקשות ליווי`);
  if (counts.leads) parts.push(`${counts.leads} פניות`);
  if (counts.tasks) parts.push(`${counts.tasks} משימות`);
  if (counts.meetings) parts.push(`${counts.meetings} פגישות`);
  if (counts.mixes) parts.push(`${counts.mixes} תמהילים`);
  if (counts.documents) parts.push(`${counts.documents} מסמכים`);
  if (counts.messages) parts.push(`${counts.messages} הודעות`);
  if (counts.payments) parts.push(`${counts.payments} תשלומים`);
  return parts.length > 0 ? parts.join(' · ') : 'ללא נתונים נוספים';
}

/**
 * ניקוי נתוני הבדיקה: רשימה של מה יימחק ומה יישאר, גיבוי מלא להורדה, ומחיקה
 * רק אחרי הגיבוי ואחרי הקלדת מילת האישור. הלקוח GHASAN GLEB לא מופיע ברשימת
 * המחיקה ואי אפשר לבחור אותו.
 */
export function TestDataCleanupCard() {
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [selection, setSelection] = useState<CleanupSelection>(emptySelection);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'backup' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupToken, setBackupToken] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<CleanupResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/advisor/test-data-cleanup', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body) throw new Error(body?.error ?? 'הטעינה נכשלה');
      setPreview(body);
      setSelection(defaultSelection(body));
      setBackupToken(null);
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הטעינה נכשלה');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (group: Group, id: string) => {
    setBackupToken(null);
    setSelection((current) => {
      const set = new Set(current[group]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...current, [group]: [...set] };
    });
  };

  const total = useMemo(
    () => Object.values(selection).reduce((sum, ids: string[]) => sum + ids.length, 0),
    [selection]
  );

  const downloadBackup = async () => {
    setBusy('backup');
    setError(null);
    try {
      const response = await fetch('/api/advisor/test-data-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup', selection }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'הגיבוי נכשל');
      }
      const token = response.headers.get('X-Cleanup-Token');
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'mashkalanta-test-data-backup.json';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setBackupToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הגיבוי נכשל');
    } finally {
      setBusy(null);
    }
  };

  const runDelete = async () => {
    if (!backupToken || confirm.trim() !== CONFIRM_WORD) return;
    setBusy('delete');
    setError(null);
    try {
      const response = await fetch('/api/advisor/test-data-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', selection, token: backupToken, confirm }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body) throw new Error(body?.error ?? 'המחיקה נכשלה');
      setResult(body);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'המחיקה נכשלה');
    } finally {
      setBusy(null);
    }
  };

  const checkbox = (group: Group, id: string) => (
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
      checked={selection[group].includes(id)}
      onChange={() => toggle(group, id)}
    />
  );

  const listSection = (
    title: string,
    group: Group,
    rows: Array<{ id: string; primary: string; secondary: string }>,
    hint?: string
  ) =>
    rows.length === 0 ? null : (
      <div className="space-y-1.5">
        <div className="text-xs font-black text-slate-700">
          {title} ({selection[group].length}/{rows.length} נבחרו)
        </div>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
        {rows.map((row) => (
          <label
            key={row.id}
            className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-sm hover:bg-slate-50"
          >
            {checkbox(group, row.id)}
            <span className="min-w-0">
              <span className="block font-semibold text-slate-800">{row.primary}</span>
              <span className="block text-[11px] text-slate-500">{row.secondary}</span>
            </span>
          </label>
        ))}
      </div>
    );

  return (
    <SectionCard
      title="ניקוי נתוני בדיקה"
      icon={<Trash2 className="h-4 w-4 text-red-600" />}
      action={
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`ml-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          רענון
        </Button>
      }
    >
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        מחיקת הלקוחות, התהליכים והפניות שנפתחו לצורכי בדיקה. הלקוח GHASAN GLEB וכל מה שקשור אליו נשמרים ואי
        אפשר לבחור אותם. לפני המחיקה חובה להוריד גיבוי של הבחירה. המחיקה אינה הפיכה מתוך המערכת.
      </p>

      {!preview && loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}

      {preview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              נשמר — לא יימחק
            </div>
            {!preview.protectedFound && (
              <p className="text-xs font-bold text-red-700">
                הלקוח GHASAN GLEB לא נמצא במסד, ולכן המחיקה חסומה.
              </p>
            )}
            {preview.keep.accounts.map((row) => (
              <div key={row.userId} className="text-sm text-emerald-900">
                <span className="font-bold">{row.name}</span>
                {row.email && <span className="text-xs"> · {row.email}</span>}
                <div className="text-[11px] text-emerald-700">{countsLine(row.counts)}</div>
              </div>
            ))}
            {preview.keep.leads.length > 0 && (
              <div className="mt-1 text-[11px] text-emerald-700">
                פניות ובקשות ליווי שנשמרות: {preview.keep.leads.map((lead) => lead.topic).join(', ')}
              </div>
            )}
            {preview.keep.tasks.length > 0 && (
              <div className="mt-1 text-[11px] text-emerald-700">
                משימות שנשמרות: {preview.keep.tasks.map((task) => task.title).join(', ')}
              </div>
            )}
          </div>

          {listSection(
            'חשבונות לקוח לבדיקה — נמחקים עם כל התהליכים, המשימות, הפניות, בקשות הליווי, השיחות והתשלומים שלהם',
            'userIds',
            preview.accounts.map((row) => ({
              id: row.userId,
              primary: `${row.name}${row.email ? ` · ${row.email}` : ''}`,
              secondary: `נפתח ${fmtDate(row.createdAt)} · ${countsLine(row.counts)}`,
            }))
          )}
          {listSection(
            'פניות של אורחים',
            'leadIds',
            preview.guestLeads.map((row) => ({
              id: row.id,
              primary: `${row.name} · ${row.email}`,
              secondary: `${row.topic} · ${fmtDate(row.createdAt)}`,
            }))
          )}
          {listSection(
            'הרשמות שלא הושלמו',
            'signupDraftIds',
            preview.signupDrafts.map((row) => ({
              id: row.id,
              primary: row.name || row.email || 'ללא שם',
              secondary: `${row.email ?? ''} · ${fmtDate(row.createdAt)}`,
            }))
          )}
          {listSection(
            'הרשמות שממתינות לאימות מייל',
            'pendingRegistrationIds',
            preview.pendingRegistrations.map((row) => ({
              id: row.id,
              primary: row.name || row.email || 'ללא שם',
              secondary: `${row.email ?? ''} · ${fmtDate(row.createdAt)}`,
            }))
          )}
          {listSection(
            'לקוחות שעזבו',
            'departedClientIds',
            preview.departedClients.map((row) => ({
              id: row.id,
              primary: row.name,
              secondary: `${row.email ?? ''} · ${fmtDate(row.createdAt)}`,
            }))
          )}
          {listSection(
            'משימות כלליות שלא שייכות לשום לקוח',
            'taskIds',
            preview.generalTasks.map((row) => ({
              id: row.id,
              primary: row.title,
              secondary: `${row.status} · ${fmtDate(row.createdAt)}`,
            })),
            'לא נבחרות מראש. סמנו רק אם גם הן היו לבדיקה.'
          )}

          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="text-xs font-black text-red-800">נבחרו למחיקה: {total} רשומות</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs"
                onClick={() => void downloadBackup()}
                disabled={busy !== null || total === 0 || !preview.protectedFound}
              >
                {busy === 'backup' ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Download className="ml-1 h-4 w-4" />}
                1. הורדת גיבוי
              </Button>
              {backupToken && <span className="text-xs font-bold text-emerald-700">הגיבוי ירד</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder={`2. הקלידו "${CONFIRM_WORD}"`}
                className="h-9 w-40 text-sm"
                disabled={!backupToken}
              />
              <Button
                size="sm"
                className="h-9 bg-red-600 text-xs text-white hover:bg-red-700"
                onClick={() => void runDelete()}
                disabled={busy !== null || !backupToken || confirm.trim() !== CONFIRM_WORD}
              >
                {busy === 'delete' ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Trash2 className="ml-1 h-4 w-4" />}
                3. מחיקה
              </Button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          נמחקו {result.deletedAccounts} חשבונות, {result.deletedLeads} פניות, {result.deletedTasks} משימות,{' '}
          {result.deletedSignupDrafts + result.deletedPendingRegistrations} הרשמות ו-{result.deletedDepartedClients}{' '}
          רשומות עזיבה.
          {result.failures.length > 0 && (
            <div className="mt-1 text-red-700">
              {result.failures.length} חשבונות לא נמחקו: {result.failures.map((item) => item.error).join('; ')}
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </SectionCard>
  );
}
