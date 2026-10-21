'use client';

import { AlarmClock, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RATE_VALIDITY_DAYS,
  daysLeftLabel,
  formatDay,
  rateValidityTone,
} from '@/lib/rate-validity';
import type { RateValidityRow, RateValidityTone } from '@/lib/rate-validity';

/**
 * שעון תוקף הריביות — אותו רכיב בשלבים, בכרטיס הבנק באישור העקרוני ובחלון
 * שנפתח מהדאשבורד, כדי שהלקוח יראה בכל מקום את אותה ספירה ובאותם צבעים.
 */

const TONES: Record<RateValidityTone, { card: string; clock: string; text: string; bar: string }> = {
  ok: {
    card: 'border-slate-200 bg-white',
    clock: 'bg-blue-600 text-white',
    text: 'text-slate-900',
    bar: 'bg-blue-600',
  },
  soon: {
    card: 'border-amber-200 bg-amber-50',
    clock: 'bg-amber-500 text-white',
    text: 'text-amber-900',
    bar: 'bg-amber-500',
  },
  urgent: {
    card: 'border-rose-200 bg-rose-50',
    clock: 'bg-rose-600 text-white',
    text: 'text-rose-900',
    bar: 'bg-rose-600',
  },
  expired: {
    card: 'border-slate-200 bg-slate-100',
    clock: 'bg-slate-400 text-white',
    text: 'text-slate-500',
    bar: 'bg-slate-300',
  },
};

/** ספירה של בנק אחד: השעון, כמה ימים נשארו ועד מתי */
export function RateCountdown({ row, compact = false }: { row: RateValidityRow; compact?: boolean }) {
  const tone = TONES[rateValidityTone(row.daysLeft)];
  const left = Math.max(0, Math.min(RATE_VALIDITY_DAYS, row.daysLeft + 1));
  const width = Math.round((left / (RATE_VALIDITY_DAYS + 1)) * 100);

  return (
    <div className={`rounded-2xl border-2 ${tone.card} ${compact ? 'px-3 py-2' : 'p-3.5'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex shrink-0 flex-col items-center justify-center rounded-xl font-black leading-none ${tone.clock} ${
            compact ? 'h-10 w-10' : 'h-12 w-12'
          }`}
        >
          {row.daysLeft >= 0 ? (
            <>
              <span className={compact ? 'text-info' : 'text-subtitle'}>{row.daysLeft}</span>
              <span className="text-2xs font-bold opacity-90">ימים</span>
            </>
          ) : (
            <AlarmClock className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-1.5 text-info font-black leading-tight ${tone.text}`}>
            <span className="truncate">בנק {row.bank}</span>
            {row.final && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-2xs font-black text-white">
                <Star className="h-3 w-3" />
                נבחר סופית
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-600">
            {daysLeftLabel(row.daysLeft)} · בתוקף עד {formatDay(row.expiresOn)}
          </p>
          {!compact && (
            <p className="text-2xs font-bold text-slate-400">האישור התקבל ב-{formatDay(row.receivedAt)}</p>
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${width}%` }} />
        </div>
      )}
    </div>
  );
}

/**
 * פס הספירה שמעל תוכן השלב — מהאישור העקרוני ועד החתימה. הבנק שנבחר סופית
 * במכרז ראשון, כי הוא זה שהמשכנתא תיחתם מולו.
 */
export function RateValidityStrip({ rows }: { rows: RateValidityRow[] }) {
  if (rows.length === 0) return null;
  const ordered = [...rows].sort((a, b) => Number(b.final) - Number(a.final) || a.daysLeft - b.daysLeft);

  return (
    <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <AlarmClock className="h-5 w-5 text-blue-600" />
        <h3 className="text-info font-black text-slate-900">תוקף הריביות באישורים העקרוניים</h3>
        <span className="text-sm font-medium text-slate-500">
          הריביות שמורות {RATE_VALIDITY_DAYS} ימים מיום קבלת האישור. עד אז צריך להשלים את המשכנתא.
        </span>
      </header>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((row) => (
          <RateCountdown key={row.bank} row={row} compact />
        ))}
      </div>
    </section>
  );
}

/** החלון שנפתח מכפתור "תוקף ריביות" בסיכום המשכנתא בדאשבורד */
export function RateValidityDialog({
  rows,
  title,
  open,
  onOpenChange,
}: {
  rows: RateValidityRow[];
  /** שם התהליך */
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ordered = [...rows].sort((a, b) => Number(b.final) - Number(a.final) || a.daysLeft - b.daysLeft);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="justify-center text-center text-subtitle">
            <span className="inline-flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-blue-600" />
              תוקף הריביות
            </span>
          </DialogTitle>
          <DialogDescription className="text-center text-info">
            {title} · הריביות בכל אישור עקרוני שמורות {RATE_VALIDITY_DAYS} ימים מיום קבלתו.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {ordered.map((row) => (
            <RateCountdown key={row.bank} row={row} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
