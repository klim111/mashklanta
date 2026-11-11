'use client';

import React from 'react';
import { bankTone } from './pricedMixes';

/**
 * שורת מצב ההתמחרות: כמה הצעות התקבלו, מאילו בנקים, ומה הפער ביניהן בהחזר
 * החודשי ובסך הריבית.
 *
 * הפער הוא מה שההתמחרות שווה בפועל, ולכן עם הצעה אחת נאמר במפורש שאין עדיין
 * מה להשוות — במקום להציג אפס שנקרא כאילו כל הבנקים נתנו את אותו מחיר.
 */
export function OffersStatsRow({
  offers,
  banks,
  monthlyGap,
  interestGap,
  formatMoney,
  activeBank,
  onHoverBank,
  onSelectBank,
}: {
  offers: number;
  /** שמות הבנקים שתמחרו, ולא רק מספרם */
  banks: readonly string[];
  monthlyGap: number | null;
  interestGap: number | null;
  formatMoney: (value: number) => string;
  /** הבנק שההצעה שלו פתוחה כרגע בדאשבורד */
  activeBank?: string | null;
  /**
   * מעבר עכבר על שם בנק — הפסים של התמהיל שמעל מציגים את הריביות שלו. זו הדרך
   * לסרוק את ההצעות בלי ללחוץ ובלי לעזוב את המסך.
   */
  onHoverBank?: (bank: string | null) => void;
  onSelectBank?: (bank: string) => void;
}) {
  const single = 'יש כרגע הצעה אחת בלבד';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatBlock label="הצעות שהתקבלו" value={String(offers)} />

      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-3 text-center shadow-sm">
        <span className="text-xs font-bold text-slate-600">
          הבנקים שהציעו
          {onSelectBank && banks.length > 0 && (
            <span className="mr-1 font-medium text-slate-500">
              · העבירו עכבר לתצוגת הריביות
            </span>
          )}
        </span>
        {banks.length === 0 ? (
          <span className="mt-1 text-sm font-black text-slate-500">טרם התקבלו הצעות</span>
        ) : (
          <span
            className="mt-1 flex flex-wrap items-center justify-center gap-1"
            onMouseLeave={() => onHoverBank?.(null)}
          >
            {banks.map((bank) => {
              const tone = bankTone(bank);
              const active = activeBank === bank;

              return (
                <button
                  key={bank}
                  type="button"
                  disabled={!onSelectBank}
                  onMouseEnter={() => onHoverBank?.(bank)}
                  onFocus={() => onHoverBank?.(bank)}
                  onBlur={() => onHoverBank?.(null)}
                  onClick={() => onSelectBank?.(bank)}
                  title={onSelectBank ? `להצגת ההצעה של ${bank} בדאשבורד` : undefined}
                  style={{ backgroundColor: tone.dot }}
                  className={`rounded-full px-2.5 py-0.5 text-sm font-black text-white transition-transform ${
                    onSelectBank ? 'cursor-pointer hover:scale-105' : ''
                  } ${active ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                >
                  {bank}
                </button>
              );
            })}
          </span>
        )}
      </div>

      <StatBlock
        label="פער בין הזולה ליקרה בהחזר החודשי"
        value={monthlyGap === null ? single : formatMoney(monthlyGap)}
        muted={monthlyGap === null}
      />
      <StatBlock
        label="פער בין הזולה ליקרה בסך הריבית"
        value={interestGap === null ? single : formatMoney(interestGap)}
        muted={interestGap === null}
      />
    </div>
  );
}

function StatBlock({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-white p-3 text-center shadow-sm">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span
        className={`mt-1 font-black tabular-nums ${
          muted ? 'text-sm text-slate-500' : 'text-xl text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
