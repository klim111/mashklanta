'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, UserCheck, UserX } from 'lucide-react';
import { ClientList } from './ClientList';
import { UnfinishedSignupsPanel } from './UnfinishedSignupsPanel';
import type { AdvisorClient } from './useAdvisorClients';

export type ClientGroup = 'unfinished' | 'registered' | 'paying';

const GROUPS: Array<{ id: ClientGroup; label: string; hint: string; icon: typeof UserCheck }> = [
  { id: 'unfinished', label: 'נכנסו ולא נרשמו', hint: 'התחילו להירשם ולא סיימו', icon: UserX },
  { id: 'registered', label: 'רשומים', hint: 'כל מי שפתח חשבון', icon: UserCheck },
  { id: 'paying', label: 'משלמים', hint: 'שילמו על גישה, קישור או ליווי', icon: BadgeCheck },
];

/** כמה הרשמות לא הושלמו — לתג שעל הלשונית, בלי לטעון את כל הרשימה מראש */
function useUnfinishedCount(): number | null {
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
  }, []);
  return count;
}

/**
 * אזור הלקוחות בלוח היועץ: שלוש קבוצות — מי שנכנס ולא השלים הרשמה, הרשומים,
 * והמשלמים. ליד כל לקוח ששילם מופיע הסימן "שילם", ובחירה בלקוח פותחת את דף
 * הלקוח עם השלבים, סיכום הפעילות ולוח הבקרה שלו.
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
  const paying = useMemo(() => clients.filter((client) => client.paid), [clients]);

  const counts: Record<ClientGroup, number | null> = {
    unfinished,
    registered: ready ? clients.length : null,
    paying: ready ? paying.length : null,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="קבוצות לקוחות">
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
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <ClientList
            clients={group === 'paying' ? paying : clients}
            ready={ready}
            error={error}
            onAddClient={onAddClient}
            onScheduleMeeting={onScheduleMeeting}
            query={query}
            onQueryChange={onQueryChange}
            emptyHint={group === 'paying' ? 'עדיין אין לקוחות ששילמו.' : undefined}
          />
        </div>
      )}
    </div>
  );
}
