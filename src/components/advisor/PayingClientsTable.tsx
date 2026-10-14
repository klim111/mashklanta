'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ChevronDown, ChevronLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/advisor-crm';
import { EmptyState, formatShekel } from './ui';
import type { AdvisorClient } from './useAdvisorClients';

/**
 * הלקוחות המשלמים, עם כל הפרטים: מתי נרשמו, כל תאריכי התשלום, ומתי פג המנוי
 * שעליו שילמו. שורה נפתחת מציגה את פירוט התשלומים, והשם מוביל לדף הלקוח.
 */
export function PayingClientsTable({
  clients,
  ready,
  query = '',
  onQueryChange,
}: {
  clients: AdvisorClient[];
  ready: boolean;
  query?: string;
  onQueryChange?: (value: string) => void;
}) {
  const [internalQuery, setInternalQuery] = useState('');
  const term = (onQueryChange ? query : internalQuery).trim().toLowerCase();
  const setQuery = onQueryChange ?? setInternalQuery;
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      clients
        .filter((client) =>
          term ? [client.name, client.email, client.phone ?? ''].some((field) => field.toLowerCase().includes(term)) : true
        )
        .sort((a, b) => (b.lastPaidAt ?? '').localeCompare(a.lastPaidAt ?? '')),
    [clients, term]
  );
  const now = Date.now();

  if (!ready) return <p className="py-8 text-center text-info text-slate-500">טוען לקוחות...</p>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={onQueryChange ? query : internalQuery}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש לפי שם, אימייל או טלפון"
          className="h-9 pr-9 text-info"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck className="h-6 w-6" />}
          title={clients.length === 0 ? 'עדיין אין לקוחות ששילמו' : 'אין לקוח שמתאים לחיפוש'}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-info">
            <thead>
              <tr className="border-b border-slate-200 text-right text-2xs text-slate-500">
                <th className="w-8 py-2" />
                <th className="py-2 font-semibold">לקוח</th>
                <th className="py-2 font-semibold">נרשם</th>
                <th className="py-2 font-semibold">תשלום ראשון</th>
                <th className="py-2 font-semibold">תשלום אחרון</th>
                <th className="py-2 font-semibold">תשלומים</th>
                <th className="py-2 font-semibold">המנוי פג</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((client) => {
                const payments = client.payments ?? [];
                const expanded = open === client.id;
                const active = client.accessEndsAt ? new Date(client.accessEndsAt).getTime() > now : false;
                const total = payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
                return (
                  <React.Fragment key={client.id}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : client.id)}
                          aria-expanded={expanded}
                          aria-label={`פירוט התשלומים של ${client.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                        >
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="py-2">
                        <Link
                          href={`/advisor-dashboard/client/${client.id}?tab=summary`}
                          className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-blue-700"
                        >
                          <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="truncate">{client.name}</span>
                        </Link>
                        <span dir="ltr" className="block text-right text-2xs text-slate-500">
                          {client.email}
                        </span>
                      </td>
                      <td className="py-2 text-slate-700">{client.registeredAt ? formatDate(client.registeredAt) : '—'}</td>
                      <td className="py-2 text-slate-700">{client.firstPaidAt ? formatDate(client.firstPaidAt) : '—'}</td>
                      <td className="py-2 text-slate-700">{client.lastPaidAt ? formatDate(client.lastPaidAt) : '—'}</td>
                      <td className="py-2 text-slate-700">
                        {payments.length} · {formatShekel(total)}
                      </td>
                      <td className="py-2">
                        {client.accessEndsAt ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                              active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {active ? 'בתוקף עד' : 'פג ב-'} {formatDate(client.accessEndsAt)}
                          </span>
                        ) : (
                          <span className="text-2xs text-slate-500">ללא מנוי חודשי</span>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <td />
                        <td colSpan={6} className="py-2">
                          <ul className="space-y-1">
                            {payments.map((payment, index) => (
                              <li key={`${payment.paidAt}-${index}`} className="flex flex-wrap gap-x-4 text-info">
                                <span className="font-semibold text-slate-900">{formatDate(payment.paidAt)}</span>
                                <span className="text-slate-700">{payment.title}</span>
                                <span className="text-slate-700">
                                  {payment.amount === null ? '—' : formatShekel(payment.amount)}
                                </span>
                                {payment.accessUntil && (
                                  <span className="text-slate-500">מנוי עד {formatDate(payment.accessUntil)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
