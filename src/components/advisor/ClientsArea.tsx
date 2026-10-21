'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, UserCheck, UserMinus, UserX } from 'lucide-react';
import { ClientList } from './ClientList';
import { UnfinishedSignupsPanel } from './UnfinishedSignupsPanel';
import { PayingClientsTable } from './PayingClientsTable';
import type { PayingClientRow } from './PayingClientsTable';
import type { AdvisorClient } from './useAdvisorClients';
import { useLiveVersion } from '@/hooks/useLiveRefresh';

export type ClientGroup = 'unfinished' | 'registered' | 'paying' | 'departed';

const GROUPS: Array<{ id: ClientGroup; label: string; hint: string; icon: typeof UserCheck }> = [
  { id: 'unfinished', label: 'נכנסו ולא נרשמו', hint: 'התחילו להירשם ולא סיימו', icon: UserX },
  { id: 'registered', label: 'רשומים', hint: 'כל מי שפתח חשבון', icon: UserCheck },
  { id: 'paying', label: 'משלמים', hint: 'שילמו על גישה, קישור או ליווי', icon: BadgeCheck },
  { id: 'departed', label: 'לקוחות שעזבו', hint: 'הסירו את החשבון · רשומות התשלום נשמרו', icon: UserMinus },
];

/** לקוחות משלמים שהסירו את החשבון — נשמרו מהם רק רשומות התשלום */
function useDepartedClients(): { rows: PayingClientRow[]; ready: boolean } {
  const version = useLiveVersion();
  const [rows, setRows] = useState<PayingClientRow[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/advisor/departed-clients', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled || !Array.isArray(body?.clients)) return;
        setRows(
          body.clients.map((client: PayingClientRow & { email: string | null }) => ({
            ...client,
            email: client.email ?? '',
          }))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);
  return { rows, ready };
}

/** כמה הרשמות לא הושלמו — לתג שעל הלשונית, בלי לטעון את כל הרשימה מראש */
function useUnfinishedCount(): number | null {
  const version = useLiveVersion();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/advisor/signup-drafts', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && Array.isArray(body?.signups)) setCount(body.signups.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [version]);
  return count;
}

/**
 * אזור הלקוחות בלוח היועץ: ארבע קבוצות — מי שנכנס ולא השלים הרשמה, הרשומים,
 * המשלמים, ולקוחות משלמים שהסירו את החשבון — עם תאריכי הרישום, התשלומים ופקיעת המנוי. ליד כל לקוח ששילם
 * מופיע הסימן "שילם", ובחירה בלקוח פותחת את דף הלקוח עם השלבים, סיכום
 * הפעילות ולוח הבקרה שלו.
 */
export function ClientsArea({
  clients,
  ready,
  error,
  onAddClient,
  onScheduleMeeting,
  query,
  onQueryChange,
}: {
  clients: AdvisorClient[];
  ready: boolean;
  error?: string | null;
  onAddClient: (input: { email: string; name?: string; phone?: string }) => Promise<string | null>;
  onScheduleMeeting?: (client: AdvisorClient) => void;
  query?: string;
  onQueryChange?: (value: string) => void;
}) {
  const [group, setGroup] = useState<ClientGroup>('registered');
  const unfinished = useUnfinishedCount();
  const departed = useDepartedClients();
  const paying = useMemo(() => clients.filter((client) => client.paid), [clients]);

  const counts: Record<ClientGroup, number | null> = {
    unfinished,
    registered: ready ? clients.length : null,
    paying: ready ? paying.length : null,
    departed: departed.ready ? departed.rows.length : null,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="קבוצות לקוחות">
        {GROUPS.map((item) => {
          const Icon = item.icon;
          const active = group === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setGroup(item.id)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-right transition-colors ${
                active
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  item.id === 'paying'
                    ? 'bg-emerald-100 text-emerald-700'
                    : item.id === 'unfinished'
                      ? 'bg-amber-100 text-amber-700'
                      : item.id === 'departed'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-blue-100 text-blue-700'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-info font-bold text-slate-900">{item.label}</span>
                <span className="block truncate text-2xs text-slate-500">{item.hint}</span>
              </span>
              <span className="text-subtitle text-slate-900">{counts[item.id] ?? '—'}</span>
            </button>
          );
        })}
      </div>

      {group === 'unfinished' ? (
        <UnfinishedSignupsPanel />
      ) : group === 'departed' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <PayingClientsTable
            clients={departed.rows}
            ready={departed.ready}
            query={query}
            onQueryChange={onQueryChange}
            departed
          />
        </div>
      ) : group === 'paying' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <PayingClientsTable clients={paying} ready={ready} query={query} onQueryChange={onQueryChange} />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ClientList
            clients={clients}
            ready={ready}
            error={error}
            onAddClient={onAddClient}
            onScheduleMeeting={onScheduleMeeting}
            query={query}
            onQueryChange={onQueryChange}
          />
        </div>
      )}
    </div>
  );
}
