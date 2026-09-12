'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Coins,
  Loader2,
  Percent,
  Save,
  Wallet,
} from 'lucide-react';
import { AMORTIZATION_TYPES, MORTGAGE_BANKS, TRACK_TYPES } from '@/components/mortgage-advisor/types';
import type { MortgageBank } from '@/components/mortgage-advisor/types';
import { computeMix, formatDuration } from '@/components/mortgage-advisor/engine';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { trackRateBreakdown } from '@/components/mortgage-advisor/engine/market';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel, trackColor } from '@/components/mortgage-advisor/workspace/primitives';
import {
  buildQuotedMix,
  defaultQuoteName,
  isoToQuoteDate,
  quoteDateToIso,
  uniqueQuoteName,
} from '@/components/mortgage-advisor/bankQuote/quote';
import { AnchorSpreadRate } from '@/components/ui/anchor-spread-rate';
import { useMarketRates } from '@/hooks/use-market-rates';
import { bankTone } from './pricedMixes';

interface BankPricingPanelProps {
  /** התמהיל הסופי — המבנה שכל הבנקים מתמחרים, ואינו ניתן לשינוי כאן */
  mix: WorkspaceMix;
  /** שמות ההצעות שכבר נשמרו, כדי ששתי הצעות לא יקבלו אותו שם */
  takenNames: string[];
  /** שמירת ההצעה המתומחרת */
  onSave: (quoted: WorkspaceMix) => Promise<void> | void;
}

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

interface RateEntry {
  rate: number;
  spread: number | null;
  /** האם הריבית עודכנה בפועל, או שהיא עדיין ריבית התכנון */
  touched: boolean;
}

/**
 * הזנת הריביות שכל בנק נתן על התמהיל הסופי.
 *
 * מבנה התמהיל נעול: מסלולים, סכומים, תקופות ולוחות סילוקין הם מה שנבחר בשלב 3.
 * מה שמוזן כאן הוא הריבית לכל מסלול — מפורקת לעוגן ולמרווח, בדיוק כמו בפאנל
 * השליטה — ו"שמור הצעה" יוצרת תמהיל מתומחר על שם הבנק.
 */
export function BankPricingPanel({ mix, takenNames, onSave }: BankPricingPanelProps) {
  const { snapshot: marketRates, refresh: refreshMarketRates } = useMarketRates();
  const [bank, setBank] = useState<MortgageBank | null>(null);
  const [receivedAt, setReceivedAt] = useState(() => isoToQuoteDate(new Date().toISOString()));
  const [entries, setEntries] = useState<Record<string, RateEntry>>({});
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  /*
    ההזנה מתחילה מריביות התכנון של התמהיל הסופי, ולא משדות ריקים: ברוב
    ההצעות רק חלק מהמסלולים זזים, ומי שמזין רואה מיד מה הבנק שיפר ומה לא.
    מסלול שלא נגעו בו מסומן, כדי שלא תישמר הצעה שהיא בעצם התכנון.
  */
  const reset = useMemo(
    () => () => {
      const next: Record<string, RateEntry> = {};
      for (const track of mix.tracks) {
        const breakdown = trackRateBreakdown(track, marketRates);
        next[track.id] = { rate: track.interestRate, spread: breakdown.spread, touched: false };
      }
      setEntries(next);
    },
    [mix.tracks, marketRates]
  );

  useEffect(() => {
    reset();
  }, [reset]);

  // השם נגזר מהבנק ומהתאריך, עד שנכתב שם ידני
  useEffect(() => {
    if (nameTouched || !bank) return;
    setName(uniqueQuoteName(defaultQuoteName(mix, bank, quoteDateToIso(receivedAt)), takenNames));
    // takenNames משתנה בכל רינדור של ההורה, ולכן אינו בתלויות
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, receivedAt, nameTouched, mix]);

  const rates = useMemo(() => {
    const map: Record<string, number> = {};
    for (const track of mix.tracks) {
      const entry = entries[track.id];
      if (entry && Number.isFinite(entry.rate) && entry.rate > 0) map[track.id] = entry.rate;
    }
    return map;
  }, [entries, mix.tracks]);

  const untouched = mix.tracks.filter((track) => !entries[track.id]?.touched).length;
  const ready = Boolean(bank) && Object.keys(rates).length === mix.tracks.length;

  const preview = useMemo(() => {
    if (!ready || !bank) return null;
    const candidate = buildQuotedMix({
      source: mix,
      bank,
      receivedAt,
      rates,
      name,
      notes,
    });
    // המרווח שהוזן נשמר על המסלול, כדי שעדכון עוגן בבנק ישראל יגלגל את ההצעה
    candidate.tracks = candidate.tracks.map((track) => {
      const entry = entries[track.id];
      return entry && entry.spread !== null ? { ...track, rateSpread: entry.spread } : track;
    });
    return { mix: candidate, summary: computeMix(candidate).summary };
  }, [ready, bank, mix, receivedAt, rates, name, notes, entries]);

  const planned = useMemo(() => computeMix(mix).summary, [mix]);

  const onConfirm = async () => {
    if (!preview || !bank) return;
    setSaving(true);
    try {
      await onSave(preview.mix);
      setJustSaved(bank);
      setBank(null);
      setNameTouched(false);
      setName('');
      setNotes('');
      reset();
    } finally {
      setSaving(false);
    }
  };

  const tone = bankTone(bank);

  return (
    <div className="space-y-3">
      <div className={`space-y-2 rounded-2xl border p-3 ${tone.border} ${tone.surface}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
            <Building2 className="h-3.5 w-3.5" />
            הבנק שהחזיר את הריביות
          </span>
          {MORTGAGE_BANKS.map((option) => {
            const optionTone = bankTone(option);
            const active = bank === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setBank(option);
                  setJustSaved(null);
                }}
                style={active ? { backgroundColor: optionTone.dot, borderColor: optionTone.dot } : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  active
                    ? 'text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? '#fff' : optionTone.dot }}
                />
                {option}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
              <CalendarDays className="h-3 w-3" />
              תאריך קבלת הריביות
            </span>
            <input
              type="date"
              className={fieldClass}
              value={receivedAt}
              onChange={(event) => setReceivedAt(event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-500">שם ההצעה</span>
            <input
              className={fieldClass}
              value={name}
              placeholder="נקבע לפי הבנק והתאריך"
              onChange={(event) => {
                setNameTouched(true);
                setName(event.target.value);
              }}
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[640px] text-right text-xs">
          <thead>
            <tr className="bg-slate-100 text-[10px] text-slate-600">
              <th className="px-2 py-2 font-bold">המסלול</th>
              <th className="px-2 py-2 font-bold">לוח סילוקין</th>
              <th className="px-2 py-2 font-bold">תקופה</th>
              <th className="px-2 py-2 font-bold">סכום</th>
              <th className="px-2 py-2 font-bold">בתכנון</th>
              <th className="w-[260px] bg-emerald-50 px-2 py-2 font-bold text-emerald-900">
                הריבית שהבנק נתן — עוגן + מרווח
              </th>
            </tr>
          </thead>
          <tbody>
            {mix.tracks.map((track) => {
              const months = Math.max(1, Math.round(track.years * 12));
              const entry = entries[track.id];
              const breakdown = trackRateBreakdown(track, marketRates);
              const rate = entry?.rate ?? track.interestRate;
              const delta = rate - track.interestRate;

              return (
                <tr key={track.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: trackColor(track.type) }}
                      />
                      {TRACK_TYPES[track.type]}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-600">
                    {AMORTIZATION_TYPES[track.amortizationType || 'spitzer']}
                  </td>
                  <td className="px-2 py-2 text-slate-600">{formatDuration(months)}</td>
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    {formatShekel(track.amount)}
                  </td>
                  <td className="px-2 py-2 text-slate-500">
                    {formatPercentage(track.interestRate)}
                    {entry?.touched && Math.abs(delta) > 0.001 && (
                      <span
                        className={`mr-1 font-bold ${delta < 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {delta < 0 ? '−' : '+'}
                        {Math.abs(delta).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="bg-emerald-50/60 px-2 py-1.5">
                    <AnchorSpreadRate
                      compact
                      anchor={breakdown.anchor}
                      spread={entry?.spread ?? breakdown.spread}
                      rate={rate}
                      rateLabel="ריבית שהתקבלה"
                      onRefreshAnchor={refreshMarketRates}
                      onChange={(next) =>
                        setEntries((current) => ({
                          ...current,
                          [track.id]: {
                            rate: next.rate,
                            spread: next.spread ?? current[track.id]?.spread ?? null,
                            touched: true,
                          },
                        }))
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] font-semibold text-slate-500">
          הערות מההצעה (רשות) — עמלות, תוקף ההצעה, תנאים
        </span>
        <input
          className={fieldClass}
          value={notes}
          placeholder='לדוגמה: "ההצעה בתוקף ל-14 יום, ללא עמלת פתיחת תיק"'
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {preview && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 sm:grid-cols-4">
          <PricingStat
            icon={<Wallet className="h-3 w-3" />}
            label="החזר חודשי בהצעה"
            value={formatShekel(preview.summary.monthlyPayment)}
            delta={preview.summary.monthlyPayment - planned.monthlyPayment}
            emphasized
          />
          <PricingStat
            icon={<Coins className="h-3 w-3" />}
            label="סך ריבית"
            value={formatShekel(preview.summary.totalInterest)}
            delta={preview.summary.totalInterest - planned.totalInterest}
          />
          <PricingStat
            icon={<Coins className="h-3 w-3" />}
            label="סך תשלום"
            value={formatShekel(preview.summary.totalPaid)}
            delta={preview.summary.totalPaid - planned.totalPaid}
          />
          <PricingStat
            icon={<Percent className="h-3 w-3" />}
            label="ריבית ממוצעת"
            value={formatPercentage(preview.summary.averageRate)}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">
          {!bank ? (
            'בחרו את הבנק שהחזיר את הריביות'
          ) : untouched > 0 ? (
            <span className="font-semibold text-amber-700">
              {untouched} מסלולים עדיין בריבית התכנון — עדכנו למה שהבנק נתן
            </span>
          ) : (
            'כל המסלולים תומחרו'
          )}
          {justSaved && (
            <span className="mr-2 inline-flex items-center gap-1 font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ההצעה של {justSaved} נשמרה
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!preview || saving}
          onClick={() => void onConfirm()}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all ${
            preview && !saving
              ? 'bg-emerald-600 shadow-sm hover:bg-emerald-700'
              : 'cursor-not-allowed bg-slate-200 text-slate-400'
          }`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          שמור הצעה
        </button>
      </div>
    </div>
  );
}

function PricingStat({
  icon,
  label,
  value,
  delta,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number;
  emphasized?: boolean;
}) {
  const meaningful = typeof delta === 'number' && Math.abs(delta) >= 1;

  return (
    <div>
      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-800">
        {icon}
        {label}
      </span>
      <span
        className={`block font-black text-slate-900 ${emphasized ? 'text-base' : 'text-sm'}`}
      >
        {value}
      </span>
      {meaningful && (
        <span
          className={`block text-[10px] font-bold ${delta! < 0 ? 'text-emerald-700' : 'text-rose-600'}`}
        >
          {delta! < 0 ? 'זול מהתכנון ב' : 'יקר מהתכנון ב'}
          {formatShekel(Math.abs(delta!))}
        </span>
      )}
    </div>
  );
}
