'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCheck,
  ChevronLeft,
  Inbox,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  PhoneCall,
  RotateCcw,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/advisor-crm';
import {
  GOAL_LABELS,
  GUIDANCE_STATUS_LABELS,
  SERVICE_LABELS,
} from '@/lib/service-flow';
import type { GuidanceRequestView, GuidanceStatus, ServiceType } from '@/lib/service-flow';
import { EmptyState, SectionCard } from './ui';

type Filter = 'open' | 'all';

const SERVICE_TONES: Record<ServiceType, string> = {
  SELF: 'bg-blue-100 text-blue-700',
  HYBRID: 'bg-violet-100 text-violet-700',
  FULL: 'bg-amber-100 text-amber-800',
  GUIDANCE: 'bg-emerald-100 text-emerald-700',
};

const STATUS_TONES: Record<GuidanceStatus, string> = {
  NEW: 'bg-rose-100 text-rose-700',
  CONTACTED: 'bg-sky-100 text-sky-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

/** בקשות הליווי, מהשרת. `all` מביא גם את אלה שטופלו */
export function useGuidanceRequests(filter: Filter) {
  const [requests, setRequests] = useState<GuidanceRequestView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/guidance-requests${filter === 'all' ? '?all=1' : ''}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = await response.json();
      setRequests(Array.isArray(body) ? body : []);
      setError(null);
    } catch {
      setError('לא הצלחנו לטעון את בקשות הליווי');
    } finally {
      setReady(true);
    }
  }, [filter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setStatus = useCallback(async (id: string, status: GuidanceStatus) => {
    const response = await fetch(`/api/guidance-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return false;
    const updated = (await response.json()) as GuidanceRequestView;
    setRequests((current) => current.map((item) => (item.id === id ? updated : item)));
    return true;
  }, []);

  return { requests, ready, error, refresh, setStatus };
}

/**
 * לשונית בקשות הליווי בלוח היועץ.
 *
 * כל בקשה מציגה את פרטי הלקוח, מה ביקש (מטרה וסוג שירות) וההערה שהוסיף, אם
 * הוסיף. לקוח רשום שכבר מלווה אצל היועץ מקבל קישור לדף הלקוח; אחרת אפשר לצרף
 * אותו כלקוח בלחיצה אחת — כי הוא כבר משתמש רשום.
 */
export function GuidanceRequestsPanel({
  onAddClient,
  onChanged,
}: {
  onAddClient: (input: { email: string; name?: string; phone?: string }) => Promise<string | null>;
  onChanged?: () => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<Filter>('open');
  const { requests, ready, error, refresh, setStatus } = useGuidanceRequests(filter);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      NEW: requests.filter((item) => item.status === 'NEW').length,
      CONTACTED: requests.filter((item) => item.status === 'CONTACTED').length,
    }),
    [requests]
  );

  const change = async (id: string, status: GuidanceStatus) => {
    setBusyId(id);
    setFailure(null);
    const ok = await setStatus(id, status);
    if (!ok) setFailure('עדכון הסטטוס נכשל');
    else await onChanged?.();
    setBusyId(null);
  };

  const attach = async (item: GuidanceRequestView) => {
    setBusyId(item.id);
    setFailure(null);
    const problem = await onAddClient({
      email: item.email,
      name: item.name,
      phone: item.phone ?? undefined,
    });
    if (problem) setFailure(problem);
    else {
      await refresh();
      await onChanged?.();
    }
    setBusyId(null);
  };

  return (
    <SectionCard
      icon={<Inbox className="h-4 w-4 text-violet-600" />}
      title={
        <>
          בקשות ליווי
          {counts.NEW > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
              {counts.NEW} חדשות
            </span>
          )}
        </>
      }
      action={
        <div className="flex gap-1">
          {(['open', 'all'] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                filter === option ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option === 'open' ? 'פתוחות' : 'כולל שטופלו'}
            </button>
          ))}
        </div>
      }
    >
      {error && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p>
      )}
      {failure && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{failure}</p>
      )}

      {!ready ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="אין בקשות ליווי פתוחות"
          hint="כשלקוח יבחר בליווי משולב, בליווי מלא או בייעוץ — מהאזור האישי או מעמוד הבית — הבקשה תופיע כאן עם הפרטים וההערה שלו."
        />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {requests.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-2xl border p-4 ${
                  item.status === 'NEW' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
                      {item.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900">{item.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_TONES[item.status]}`}>
                          {GUIDANCE_STATUS_LABELS[item.status]}
                        </span>
                        {item.userId ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                            <UserRound className="h-3 w-3" />
                            לקוח רשום
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                            אורח מעמוד הבית
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1 hover:text-slate-900">
                          <Mail className="h-3 w-3" />
                          {item.email}
                        </a>
                        {item.phone && (
                          <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1 hover:text-slate-900" dir="ltr">
                            <Phone className="h-3 w-3" />
                            {item.phone}
                          </a>
                        )}
                        <span>
                          {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white">
                      {GOAL_LABELS[item.goal].title}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${SERVICE_TONES[item.serviceType]}`}>
                      {SERVICE_LABELS[item.serviceType].title}
                    </span>
                  </div>
                </div>

                {item.note && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-sm leading-relaxed text-amber-950">
                    <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span className="whitespace-pre-line">{item.note}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="text-[11px] text-slate-400">
                    {item.handledByName && item.status !== 'NEW'
                      ? `בטיפול: ${item.handledByName}${item.handledAt ? ` · ${formatDate(item.handledAt)}` : ''}`
                      : 'עדיין לא נלקחה לטיפול'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.clientId ? (
                      <Link
                        href={`/advisor-dashboard/client/${item.clientId}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                      >
                        לדף הלקוח
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Link>
                    ) : item.userId ? (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void attach(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        צרפו כלקוח
                      </button>
                    ) : null}

                    {item.status === 'NEW' && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void change(item.id, 'CONTACTED')}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        יצרתי קשר
                      </button>
                    )}
                    {item.status !== 'CLOSED' && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void change(item.id, 'CLOSED')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        טופלה
                      </button>
                    )}
                    {item.status === 'CLOSED' && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void change(item.id, 'NEW')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        פתיחה מחדש
                      </button>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </SectionCard>
  );
}
