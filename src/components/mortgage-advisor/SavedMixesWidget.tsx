'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookmarkCheck, ChevronLeft, PieChart } from 'lucide-react';
import { useSavedMixes } from './savedMixes';
import { stageMixForWorkspace } from './workspace/draft';
import { CompositionBar, formatShekel } from './workspace/primitives';

/**
 * תצוגה מקוצרת של התמהילים השמורים לדשבורד. כל תמהיל מוצג באותו אופן שבו הוא
 * מוצג בכל שאר המסכים — שם, הרכב והחזר חודשי — ולחיצה פותחת אותו בכלי התכנון.
 */
export function SavedMixesWidget({ limit = 4 }: { limit?: number }) {
  const router = useRouter();
  const { saved, ready } = useSavedMixes();

  const open = (id: string) => {
    const item = saved.find((s) => s.mix.id === id);
    if (!item) return;
    stageMixForWorkspace(item.mix);
    router.push('/mortgage-advisor');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BookmarkCheck className="w-5 h-5 text-emerald-600" />
          תמהילים שמורים
        </h3>
        {saved.length > 0 && (
          <Link href="/saved-mixes" className="text-xs text-blue-600 hover:underline">
            לכל התמהילים
          </Link>
        )}
      </div>

      {ready && saved.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm mb-3">עוד לא שמרתם תמהילים</p>
          <Link href="/mortgage-advisor" className="text-sm text-blue-600 hover:underline">
            פתח את כלי התכנון
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {saved.slice(0, limit).map((item) => (
            <button
              key={item.mix.id}
              type="button"
              onClick={() => open(item.mix.id)}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-right hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 truncate">
                    {item.mix.name}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {item.mix.propertyAddress?.trim()
                      ? `${item.mix.propertyAddress.trim()} · `
                      : ''}
                    {formatShekel(item.mix.totalAmount)} · {item.mix.tracks.length} מסלולים
                  </span>
                </span>
                <span className="text-left shrink-0">
                  <span className="block text-[10px] text-slate-400">החזר חודשי</span>
                  <span className="block text-sm font-bold text-blue-600">
                    {formatShekel(item.summary.monthlyPayment)}
                  </span>
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
              <span className="block mt-2">
                <CompositionBar tracks={item.mix.tracks} height={6} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
