'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import {
  BadgePercent,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Coins,
  Loader2,
  Percent,
  Wallet,
} from 'lucide-react';
import { AMORTIZATION_TYPES, MORTGAGE_BANKS, TRACK_TYPES } from '../types';
import type { MortgageBank } from '../types';
import { computeMix, formatDuration } from '../engine';
import type { WorkspaceMix } from '../engine';
import { formatPercentage } from '../mortgageCalculations';
import { formatShekel, trackColor } from '../workspace/primitives';
import {
  buildQuotedMix,
  defaultQuoteName,
  isoToQuoteDate,
  missingQuoteRates,
  quoteDateToIso,
  uniqueQuoteName,
} from './quote';

interface BankQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** התמהיל שהוגש לבנק — המבנה שלו נשמר כמו שהוא */
  mix: WorkspaceMix;
  /** בקשת הריביות שממנה נפתחה ההזנה, אם נפתחה מבקשה שמורה */
  requestId?: string;
  /** שמות התמהילים הקיימים לאותו נכס, כדי שהשם החדש יהיה ייחודי */
  takenNames?: string[];
  /** שמירת התמהיל של הבנק בבסיס הנתונים */
  onSave: (quoted: WorkspaceMix) => Promise<void> | void;
  /** אחרי שמירה — למשל פתיחת התמהיל שהתקבל באזור העבודה */
  onOpenSaved?: (quoted: WorkspaceMix) => void;
}

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

/**
 * הזנת הריביות שהתקבלו מבנק.
 *
 * מבנה התמהיל מוצג לקריאה בלבד — מסלול, לוח סילוקין, תקופה, סכום ואחוז — ומה
 * שמוזן הוא הריבית שכל מסלול קיבל. השמירה יוצרת תמהיל חדש בבסיס הנתונים, עם
 * שם הבנק ותאריך קבלת ההצעה, כך שאפשר להזין ריביות לאותו תמהיל שוב ושוב.
 */
export function BankQuoteDialog({
  open,
  onOpenChange,
  mix,
  requestId,
  takenNames = [],
  onSave,
  onOpenSaved,
}: BankQuoteDialogProps) {
  const [bank, setBank] = useState<MortgageBank | null>(null);
  const [receivedAt, setReceivedAt] = useState(() => isoToQuoteDate(new Date().toISOString()));
  const [rates, setRates] = useState<Record<string, number | null>>({});
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<WorkspaceMix | null>(null);

  // כל פתיחה מתחילה נקייה — הזנה חדשה היא הצעה חדשה
  useEffect(() => {
    if (!open) return;
    setBank(null);
    setReceivedAt(isoToQuoteDate(new Date().toISOString()));
    setRates({});
    setName('');
    setNameTouched(false);
    setNotes('');
    setSaved(null);
  }, [open, mix.id]);

  // השם נגזר מהבנק ומהתאריך, עד שהמשתמש כותב שם משלו
  useEffect(() => {
    if (nameTouched || !bank) return;
    const base = defaultQuoteName(mix, bank, quoteDateToIso(receivedAt));
    setName(uniqueQuoteName(base, takenNames));
    // takenNames משתנה בכל רינדור של ההורה, ולכן אינו בתלויות
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, receivedAt, nameTouched, mix]);

  const filledRates = useMemo(() => {
    const entries: Record<string, number> = {};
    for (const track of mix.tracks) {
      const value = rates[track.id];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        entries[track.id] = value;
      }
    }
    return entries;
  }, [rates, mix.tracks]);

  const missing = missingQuoteRates(mix, filledRates);
  const ready = Boolean(bank) && missing === 0;

  /** תצוגה מקדימה של ההצעה — מה התמהיל שווה בריביות שהוזנו */
  const preview = useMemo(() => {
    if (!ready || !bank) return null;
    const candidate = buildQuotedMix({
      source: mix,
      bank,
      receivedAt,
      rates: filledRates,
      name,
      notes,
      requestId,
    });
    return { mix: candidate, summary: computeMix(candidate).summary };
  }, [ready, bank, mix, receivedAt, filledRates, name, notes, requestId]);

  const onConfirm = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await onSave(preview.mix);
      setSaved(preview.mix);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="flex max-h-[94vh] max-w-4xl flex-col gap-3">
        <DialogHeader className="shrink-0 pr-7">
          <DialogTitle className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-emerald-600" />
            הזנת הריביות שהתקבלו מהבנק
          </DialogTitle>
          <DialogDescription>
            מבנה התמהיל נשמר בדיוק כפי שהוגש — מסלולים, סכומים, תקופות ולוחות סילוקין. הזינו את
            הריבית שכל מסלול קיבל, ותישמר הצעה נפרדת על שם הבנק ותאריך קבלתה.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pl-1">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                <Building2 className="h-3.5 w-3.5" />
                הבנק שהחזיר את הריביות
              </span>
              {MORTGAGE_BANKS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBank(option)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    bank === option
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                  }`}
                >
                  {option}
                </button>
              ))}
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
                  placeholder="נבחר בחירת הבנק והתאריך"
                  onChange={(event) => {
                    setNameTouched(true);
                    setName(event.target.value);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100 text-[10px] text-slate-600">
                  <th className="px-2 py-2 font-bold">המסלול</th>
                  <th className="px-2 py-2 font-bold">לוח סילוקין</th>
                  <th className="px-2 py-2 font-bold">תקופה</th>
                  <th className="px-2 py-2 font-bold">סכום</th>
                  <th className="px-2 py-2 font-bold">% מהתמהיל</th>
                  <th className="w-32 bg-emerald-50 px-2 py-2 font-bold text-emerald-900">
                    ריבית שהתקבלה
                  </th>
                </tr>
              </thead>
              <tbody>
                {mix.tracks.map((track) => {
                  const months = Math.max(1, Math.round(track.years * 12));
                  const value = rates[track.id];
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
                      <td className="px-2 py-2 text-slate-600">{track.percentage.toFixed(1)}%</td>
                      <td className="bg-emerald-50/60 px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <NumericInput
                            value={value ?? null}
                            onChange={(next) =>
                              setRates((current) => ({ ...current, [track.id]: next }))
                            }
                            max={20}
                            placeholder="0.00"
                            aria-label={`ריבית שהתקבלה למסלול ${TRACK_TYPES[track.type]}`}
                            className="w-full rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          />
                          <Percent className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                        </div>
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

          {preview ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:grid-cols-4">
              <QuoteStat
                icon={<Wallet className="h-3 w-3" />}
                label="החזר חודשי בהצעה"
                value={formatShekel(preview.summary.monthlyPayment)}
                emphasized
              />
              <QuoteStat
                icon={<Banknote className="h-3 w-3" />}
                label="סך ריבית"
                value={formatShekel(preview.summary.totalInterest)}
              />
              <QuoteStat
                icon={<Coins className="h-3 w-3" />}
                label="סך תשלום"
                value={formatShekel(preview.summary.totalPaid)}
              />
              <QuoteStat
                icon={<Percent className="h-3 w-3" />}
                label="ריבית ממוצעת"
                value={formatPercentage(preview.summary.averageRate)}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
              {!bank
                ? 'בחרו את הבנק שהחזיר את ההצעה.'
                : `נותרו ${missing} מסלולים בלי ריבית. ההצעה נשמרת רק כשכל המסלולים תומחרו.`}
            </p>
          )}
        </div>

        <div className="shrink-0 space-y-2">
          {saved && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              ההצעה נשמרה כתמהיל &quot;{saved.name}&quot;.
              {onOpenSaved && (
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    onOpenSaved(saved);
                    onOpenChange(false);
                  }}
                >
                  פתחו אותה באזור העבודה
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-10 w-full text-xs sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              סגירה
            </Button>
            <Button
              className="h-10 w-full bg-emerald-600 text-xs hover:bg-emerald-700 sm:w-auto"
              onClick={onConfirm}
              disabled={!ready || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
              ) : (
                <BadgePercent className="h-4 w-4 ml-1.5" />
              )}
              {saved ? 'שמירת הצעה נוספת' : 'שמור את ההצעה כתמהיל'}
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-400 sm:text-right">
            כל שמירה יוצרת תמהיל נפרד, כך שאפשר להזין לאותו תמהיל ריביות מכמה בנקים ובכמה סבבים.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuoteStat({
  icon,
  label,
  value,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-2">
      <p className="flex items-center gap-1 text-[10px] text-slate-500">
        {icon}
        {label}
      </p>
      <p
        className={`font-bold leading-tight ${
          emphasized ? 'text-base text-emerald-700' : 'text-sm text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
