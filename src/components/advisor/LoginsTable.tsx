'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Globe, LogIn, Monitor, Search, Smartphone, Tablet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { pageLabel } from '@/lib/site-analytics';
import type { LoginSession } from '@/lib/site-analytics';
import { EmptyState, SectionCard } from './ui';

export type LoginRow = LoginSession & { name: string | null; email: string | null; clientId: string | null };

const WHEN = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  day: 'numeric',
  month: 'numeric',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const TIME = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' });

const DEVICES: Record<string, { label: string; icon: typeof Monitor }> = {
  desktop: { label: 'מחשב', icon: Monitor },
  tablet: { label: 'טאבלט', icon: Tablet },
  phone: { label: 'טלפון', icon: Smartphone },
};

function minutes(seconds: number): string {
  if (seconds < 60) return `${seconds} שנ׳`;
  return `${Math.round(seconds / 60)} דק׳`;
}

/**
 * "מי התחבר": כל ביקור של משתמש מחובר בטווח שנבחר — מי, מתי, כמה עמודים,
 * מאיזו כתובת IP, מאיזה מכשיר, דפדפן ומערכת הפעלה, ומאיזו עיר. הפרטים נשמרים
 * מהגרסה הזו והלאה, ולכן בביקורים ישנים חלק מהעמודות ריקות.
 */
export function LoginsTable({ logins }: { logins: LoginRow[] }) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return logins;
    return logins.filter((login) =>
      [login.name ?? '', login.email ?? '', login.ip ?? ''].some((field) => field.toLowerCase().includes(term))
    );
  }, [logins, query]);
  const people = useMemo(() => new Set(logins.map((login) => login.userId)).size, [logins]);

  return (
    <SectionCard
      title={`מי התחבר (${people} משתמשים · ${logins.length} ביקורים)`}
      icon={<LogIn className="h-4 w-4 text-blue-600" />}
    >
      {logins.length === 0 ? (
        <EmptyState icon={<LogIn className="h-6 w-6" />} title="אין ביקורים של משתמשים מחוברים בטווח הזה" />
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי שם, מייל או IP"
              className="h-9 pr-9 text-info"
            />
          </div>
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-info">
              <thead className="border-b border-slate-200 text-2xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-bold">מי</th>
                  <th className="px-2 py-2 font-bold">מתי</th>
                  <th className="px-2 py-2 font-bold">עמודים</th>
                  <th className="px-2 py-2 font-bold">כתובת IP</th>
                  <th className="px-2 py-2 font-bold">מיקום</th>
                  <th className="px-2 py-2 font-bold">מכשיר</th>
                  <th className="px-4 py-2 font-bold">דפדפן ומערכת</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((login) => {
                  const device = login.device ? DEVICES[login.device] : null;
                  const DeviceIcon = device?.icon ?? Globe;
                  const who = login.name || login.email || 'משתמש';
                  return (
                    <tr key={login.sessionId} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2">
                        {login.clientId ? (
                          <Link
                            href={`/advisor-dashboard/client/${login.clientId}?tab=summary`}
                            className="font-bold text-slate-900 hover:text-blue-700"
                          >
                            {who}
                          </Link>
                        ) : (
                          <span className="font-bold text-slate-900">{who}</span>
                        )}
                        {login.email && login.name && (
                          <div dir="ltr" className="text-right text-2xs text-slate-500">
                            {login.email}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {WHEN.format(new Date(login.startedAt))}
                        {login.lastAt !== login.startedAt && (
                          <span className="text-2xs text-slate-500"> – {TIME.format(new Date(login.lastAt))}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {login.pages} · {minutes(login.seconds)}
                        <div className="text-2xs text-slate-500">נכנס ל{pageLabel(login.entryPath)}</div>
                      </td>
                      <td dir="ltr" className="px-2 py-2 text-right font-mono text-2xs text-slate-800">
                        {login.ip ?? '—'}
                      </td>
                      <td className="px-2 py-2 text-slate-700">{login.location ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <DeviceIcon className="h-4 w-4 text-slate-500" />
                          {device?.label ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {[login.browser, login.os].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-2xs text-slate-500">
            כתובת ה-IP, הדפדפן והמיקום נשמרים רק כשהמשתמש מחובר, מהגרסה הזו והלאה. המיקום משוער לפי כתובת ה-IP.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
