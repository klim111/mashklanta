'use client';

import { useState } from 'react';
import { PieChart } from 'lucide-react';
import { compactShekel } from './theme';

export interface DonutSlice {
  id: string;
  name: string;
  total: number;
  hex: string;
}

/**
 * חלוקת ההון לפי קטגוריות — טבעת אחת עם מקרא. לחיצה על פלח או על שורת מקרא
 * מסננת את הטבלה לאותה קטגוריה, כך שהגרף הוא גם כלי ניווט ולא רק תצוגה.
 */
export function AllocationDonut({
  slices,
  selected,
  onSelect,
}: {
  slices: DonutSlice[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.total, 0);

  if (total <= 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <PieChart className="mx-auto mb-2 h-10 w-10 opacity-30" />
        <p className="text-sm font-semibold">הזינו סכומים בטבלה כדי לראות את חלוקת ההון</p>
      </div>
    );
  }

  let angle = 0;
  const paths = slices.map((slice) => {
    const share = (slice.total / total) * 360;
    const start = angle;
    const end = angle + share;
    angle = end;

    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((end - 90) * Math.PI) / 180;
    const x1 = 100 + 88 * Math.cos(startRad);
    const y1 = 100 + 88 * Math.sin(startRad);
    const x2 = 100 + 88 * Math.cos(endRad);
    const y2 = 100 + 88 * Math.sin(endRad);
    const largeArc = share > 180 ? 1 : 0;
    // פלח יחיד מכסה מעגל שלם — קשת אחת לא יכולה לצייר אותו
    const d =
      share >= 359.99
        ? 'M 100 12 A 88 88 0 1 1 99.99 12 Z'
        : `M 100 100 L ${x1} ${y1} A 88 88 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { slice, d, share };
  });

  const focus = hovered ?? selected;
  const focused = slices.find((slice) => slice.id === focus) ?? null;

  return (
    <div>
      <div className="relative mx-auto flex max-w-[240px] items-center justify-center">
        <svg viewBox="0 0 200 200" className="h-auto w-full">
          {paths.map(({ slice, d }) => {
            const active = focus === slice.id;
            return (
              <path
                key={slice.id}
                d={d}
                fill={slice.hex}
                opacity={focus && !active ? 0.45 : 1}
                className="cursor-pointer transition-all"
                style={{
                  transform: active ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: 'center',
                  filter: active ? 'drop-shadow(0 4px 8px rgba(15,23,42,0.25))' : 'none',
                }}
                onMouseEnter={() => setHovered(slice.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(selected === slice.id ? null : slice.id)}
              />
            );
          })}
          <circle cx="100" cy="100" r="54" fill="#ffffff" />
          <text x="100" y="94" textAnchor="middle" className="fill-slate-400 text-xs font-bold">
            {focused ? 'קטגוריה' : 'סה״כ'}
          </text>
          <text x="100" y="116" textAnchor="middle" className="fill-slate-900 text-xl font-black">
            {compactShekel(focused ? focused.total : total)}
          </text>
        </svg>
        {focused && (
          <div className="pointer-events-none absolute -top-1 right-1/2 translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1 text-2xs font-bold text-white shadow-lg">
            {focused.name} · {((focused.total / total) * 100).toFixed(0)}%
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {slices.map((slice) => {
          const active = focus === slice.id;
          return (
            <button
              key={slice.id}
              type="button"
              onMouseEnter={() => setHovered(slice.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(selected === slice.id ? null : slice.id)}
              className={`flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-right transition-colors ${
                active ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: slice.hex }}
                />
                <span className="truncate text-2xs font-semibold text-slate-700">{slice.name}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-1">
                <span className="text-2xs font-black text-slate-900">
                  {compactShekel(slice.total)}
                </span>
                <span className="text-2xs font-bold text-slate-400">
                  {((slice.total / total) * 100).toFixed(0)}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
