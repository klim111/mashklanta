'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LenderKind, LenderRate } from '@/lib/boi-consumer-credit';
import { EQUATOR_PAGE_URL } from '@/lib/boi-equator';
import { formatPeriod, useConsumerCredit } from './useConsumerCredit';

/**
 * סימן הקריאה שליד כל שדה ריבית בכלי ההלוואות: לחיצה עליו פותחת את הריביות
 * על הלוואות צרכניות לפי מוסד מממן, כפי שבנק ישראל מפרסם — לכל בנק, לכל חברת
 * כרטיסי אשראי — מאותו מקור שמזין את "קו המשווה" באתר בנק ישראל. לצד הריבית הממוצעת מוצגים הרבעון
 * הזול והרבעון היקר, כדי שהלקוח יראה איפה הריבית שלו עומדת.
 */

const KIND_TITLES: Record<LenderKind, string> = {
  bank: 'בנקים',
  card: 'חברות כרטיסי אשראי',
};

const pct = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}%`);

export function RateInfoButton({ label = 'ריביות להלוואות צרכניות לפי מוסד מממן' }: { label?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-black leading-none text-amber-700 ring-1 ring-amber-300 transition-colors hover:bg-amber-200"
        >
          !
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" align="start" className="w-[min(26rem,calc(100vw-1.5rem))] p-0 text-right">
        <LenderRatesTable />
      </PopoverContent>
    </Popover>
  );
}

export function LenderRatesTable({ compact = true }: { compact?: boolean }) {
  const state = useConsumerCredit();

  if (state.status === 'loading') {
    return <p className="p-3 text-xs text-slate-500">טוען את נתוני בנק ישראל…</p>;
  }
  if (state.status === 'error') {
    return (
      <p className="p-3 text-xs text-slate-500">
        נתוני בנק ישראל אינם זמינים כרגע. נסו שוב מאוחר יותר.
      </p>
    );
  }

  const { system, lenders, prime, source } = state.data;
  const groups = (Object.keys(KIND_TITLES) as LenderKind[])
    .map((kind) => ({ kind, rows: lenders.filter((item) => item.kind === kind) }))
    .filter((group) => group.rows.length > 0);

  return (
    <div className={compact ? 'max-h-[60vh] overflow-y-auto' : ''}>
      {compact && (
        <div className="border-b border-slate-100 px-3 py-2">
          <p className="text-xs font-black text-slate-900">
            ריביות על הלוואות צרכניות · {source === 'equator' ? 'קו המשווה של בנק ישראל' : 'בנק ישראל'}
          </p>
          <p className="text-2xs leading-relaxed text-slate-500">
            {system?.rate !== null && system?.rate !== undefined
              ? `ממוצע המערכת ב${formatPeriod(system.month)}: ${system.rate.toFixed(2)}%. `
              : ''}
            {prime ? `הפריים היום: ${prime.value.toFixed(2)}%.` : ''}
          </p>
        </div>
      )}

      <table className="w-full text-2xs">
        <thead className="sticky top-0 bg-slate-50 font-bold text-slate-500">
          <tr>
            <th className="px-2 py-1.5 text-right">מוסד מממן</th>
            <th className="px-2 py-1.5 text-right">ממוצע</th>
            <th className="px-2 py-1.5 text-right" title="25% מההלוואות ניתנו בריבית הזו או נמוכה ממנה">
              הזולות
            </th>
            <th className="px-2 py-1.5 text-right" title="25% מההלוואות ניתנו בריבית הזו או גבוהה ממנה">
              היקרות
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.kind}>
            <tr>
              <td colSpan={4} className="bg-white px-2 pb-0.5 pt-2 text-2xs font-black text-slate-400">
                {KIND_TITLES[group.kind]} · נכון ל{formatPeriod(latestOf(group.rows))}
              </td>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.entity} className="border-t border-slate-100">
                <td className="px-2 py-1 font-bold text-slate-800">{row.name}</td>
                <td className="px-2 py-1 font-black text-blue-700">{pct(row.average)}</td>
                <td className="whitespace-nowrap px-2 py-1 text-emerald-700">{row.low === null ? '—' : `עד ${pct(row.low)}`}</td>
                <td className="whitespace-nowrap px-2 py-1 text-rose-700">{row.high === null ? '—' : `מ-${pct(row.high)}`}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      <p className="border-t border-slate-100 px-3 py-2 text-2xs leading-relaxed text-slate-400">
        ממוצע = עוגן ממוצע + מרווח ממוצע בהלוואות צרכניות חדשות בריבית משתנה (פריים) למשקי בית.
        הזולות: הרבעון התחתון; היקרות: הרבעון העליון.{' '}
        {source === 'equator' ? (
          <>
            המקור:{' '}
            <a href={EQUATOR_PAGE_URL} target="_blank" rel="noreferrer" className="underline hover:text-slate-600">
              קו המשווה של בנק ישראל
            </a>
            .
          </>
        ) : (
          'לוח קו המשווה לא היה זמין, ולכן מוצגים נתוני מאגר הסדרות; החודש מצוין ליד כל קבוצה.'
        )}
      </p>
    </div>
  );
}

function latestOf(rows: LenderRate[]): string {
  return rows.map((row) => row.asOf).sort().at(-1) ?? '';
}
