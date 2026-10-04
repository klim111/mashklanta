'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Clock,
  Globe,
  Loader2,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Tablet,
  UserPlus,
  Users,
} from 'lucide-react';
import { EmptyState, SectionCard } from './ui';
import type { VisitSummary } from '@/lib/site-analytics';

type AnalyticsResponse = {
  days: number;
  truncated: boolean;
  liveVisitors: number;
  funnel: { startedSignup: number; submittedSignup: number; newClients: number };
  summary: VisitSummary;
};

const RANGES = [
  { days: 1, label: 'היום' },
  { days: 7, label: '7 ימים' },
  { days: 30, label: '30 ימים' },
  { days: 90, label: '90 ימים' },
];

const DEVICE_LABELS: Record<string, { label: string; icon: typeof Monitor }> = {
  desktop: { label: 'מחשב', icon: Monitor },
  tablet: { label: 'טאבלט', icon: Tablet },
  phone: { label: 'טלפון', icon: Smartphone },
  unknown: { label: 'לא ידוע', icon: Globe },
};

/** 75 → "1:15 דק׳", 20 → "20 שנ׳" */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} שנ׳`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, '0')} דק׳`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, '0')} שע׳`;
}

function shortDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${Number(date)}.${Number(month)}`;
}

function Tile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <span className="text-blue-600">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** צפיות ליום — סדרה אחת, עמודה לכל יום, והמספר המדויק במעבר עכבר */
function DailyChart({ days }: { days: VisitSummary['days'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((day) => day.views));
  const labelEvery = days.length > 45 ? 14 : days.length > 14 ? 7 : 1;
  const shown = hover !== null ? days[hover] : null;

  return (
    <div>
      <div className="mb-2 h-5 text-xs text-slate-600">
        {shown ? (
          <>
            <span className="font-bold text-slate-900">{shortDay(shown.day)}</span> ·{' '}
            {shown.views.toLocaleString('he-IL')} צפיות · {shown.visitors.toLocaleString('he-IL')} מבקרים
          </>
        ) : (
          'העבירו את העכבר על יום כדי לראות את המספרים'
        )}
      </div>
      {/* ציר הזמן נקרא משמאל לימין, גם בעמוד בעברית */}
      <div dir="ltr" className="flex h-40 items-end gap-[2px] border-b border-slate-200" onMouseLeave={() => setHover(null)}>
        {days.map((day, index) => (
          <div
            key={day.day}
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(index)}
            aria-label={`${shortDay(day.day)}: ${day.views} צפיות`}
          >
            <div
              className={`w-full rounded-t ${hover === index ? 'bg-blue-800' : 'bg-blue-600'}`}
              style={{ height: day.views ? `${Math.max(2, (day.views / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div dir="ltr" className="mt-1 flex gap-[2px] text-[11px] text-slate-500">
        {days.map((day, index) => (
          <div key={day.day} className="flex-1 overflow-visible whitespace-nowrap text-center">
            {index % labelEvery === 0 ? shortDay(day.day) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareList({
  rows,
  total,
  render,
}: {
  rows: Array<{ key: string; count: number }>;
  total: number;
  render: (key: string) => React.ReactNode;
}) {
  if (!rows.length) return <p className="py-4 text-center text-xs text-slate-500">אין עדיין נתונים</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const share = total ? Math.round((row.count / total) * 100) : 0;
        return (
          <li key={row.key}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-800">{render(row.key)}</span>
              <span className="shrink-0 text-xs text-slate-600">
                {row.count.toLocaleString('he-IL')} · {share}%
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * דאשבורד הביקורים באתר: כמה נכנסו, לאילו עמודים, כמה זמן נשארו, מאיפה הגיעו
 * ובאיזה מכשיר — ומשפך ההרשמה. הנתונים נאספים בפלטפורמה עצמה, בלי שירות חיצוני.
 */
export function SiteAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/advisor/site-analytics?days=${days}`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => setDays(range.days)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                days === range.days
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {data.liveVisitors} באתר עכשיו
            </span>
          )}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            רענון
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">לא הצלחנו לטעון את נתוני הביקורים. נסו לרענן.</p>
      )}

      {!summary && loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {summary && summary.views === 0 && (
        <SectionCard>
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="עוד אין ביקורים בטווח הזה"
            hint="הספירה מתחילה מרגע שהגרסה הזו עולה לאתר. הגלישה שלכם כיועץ לא נספרת."
          />
        </SectionCard>
      )}

      {summary && summary.views > 0 && data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              icon={<Users className="h-4 w-4" />}
              label="מבקרים"
              value={summary.visitors.toLocaleString('he-IL')}
              hint={`${summary.signedInVisitors.toLocaleString('he-IL')} מהם מחוברים`}
            />
            <Tile
              icon={<MousePointerClick className="h-4 w-4" />}
              label="צפיות בעמודים"
              value={summary.views.toLocaleString('he-IL')}
              hint={`${summary.pagesPerSession} עמודים לביקור בממוצע`}
            />
            <Tile
              icon={<Clock className="h-4 w-4" />}
              label="זמן ממוצע בביקור"
              value={formatSeconds(summary.avgSessionSeconds)}
              hint={`${formatSeconds(summary.avgViewSeconds)} בממוצע לעמוד`}
            />
            <Tile
              icon={<Activity className="h-4 w-4" />}
              label="יצאו אחרי עמוד אחד"
              value={`${summary.bounceRate}%`}
              hint={`מתוך ${summary.sessions.toLocaleString('he-IL')} ביקורים`}
            />
          </div>

          <SectionCard title="צפיות ליום" icon={<BarChart3 className="h-4 w-4 text-blue-600" />}>
            <DailyChart days={summary.days} />
          </SectionCard>

          <SectionCard title="משפך ההרשמה" icon={<UserPlus className="h-4 w-4 text-blue-600" />}>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              {[
                { label: 'מבקרים', value: summary.visitors },
                { label: 'התחילו להקליד הרשמה', value: data.funnel.startedSignup },
                { label: 'לחצו "הירשם"', value: data.funnel.submittedSignup },
                { label: 'חשבונות לקוח חדשים', value: data.funnel.newClients },
              ].map((step) => (
                <div key={step.label} className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xl font-black text-slate-900">{step.value.toLocaleString('he-IL')}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{step.label}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="לפי עמוד" icon={<Globe className="h-4 w-4 text-blue-600" />}>
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-bold">עמוד</th>
                    <th className="px-2 py-2 font-bold">צפיות</th>
                    <th className="px-2 py-2 font-bold">מבקרים</th>
                    <th className="px-2 py-2 font-bold">זמן ממוצע</th>
                    <th className="px-2 py-2 font-bold">זמן כולל</th>
                    <th className="px-2 py-2 font-bold">נכנסו דרכו</th>
                    <th className="px-4 py-2 font-bold">יצאו ממנו</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.pages.map((page) => (
                    <tr key={page.path} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2">
                        <div className="font-bold text-slate-900">{page.label}</div>
                        {page.label !== page.path && (
                          <div dir="ltr" className="text-right text-xs text-slate-500">
                            {page.path}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 font-bold text-slate-900">{page.views.toLocaleString('he-IL')}</td>
                      <td className="px-2 py-2 text-slate-700">{page.visitors.toLocaleString('he-IL')}</td>
                      <td className="px-2 py-2 text-slate-700">{formatSeconds(page.avgSeconds)}</td>
                      <td className="px-2 py-2 text-slate-700">{formatSeconds(page.totalSeconds)}</td>
                      <td className="px-2 py-2 text-slate-700">{page.entries.toLocaleString('he-IL')}</td>
                      <td className="px-4 py-2 text-slate-700">{page.exits.toLocaleString('he-IL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="מאיפה הגיעו" icon={<Globe className="h-4 w-4 text-blue-600" />}>
              <ShareList
                rows={summary.referrers}
                total={summary.sessions}
                render={(key) => (key === 'כניסה ישירה' ? key : <span dir="ltr">{key}</span>)}
              />
            </SectionCard>
            <SectionCard title="מכשירים" icon={<Monitor className="h-4 w-4 text-blue-600" />}>
              <ShareList
                rows={summary.devices}
                total={summary.sessions}
                render={(key) => {
                  const device = DEVICE_LABELS[key] ?? DEVICE_LABELS.unknown;
                  const Icon = device.icon;
                  return (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-slate-500" />
                      {device.label}
                    </span>
                  );
                }}
              />
            </SectionCard>
          </div>

          <p className="text-xs text-slate-500">
            זמן השהייה נספר רק כשהעמוד גלוי על המסך, עד חצי שעה לצפייה. הגלישה שלכם כיועץ, רובוטים של מנועי
            חיפוש וההדגמה לא נספרים.
            {data.truncated && ' בטווח הזה יש יותר מ-100,000 צפיות, והסיכום מתבסס על האחרונות שבהן.'}
          </p>
        </>
      )}
    </div>
  );
}
