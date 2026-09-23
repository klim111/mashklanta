import { CalendarCheck, HandCoins, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PLATFORM_BILLING_NOTES } from '@/lib/service-flow';

const ICONS: Record<string, LucideIcon> = {
  'no-auto': ShieldCheck,
  range: HandCoins,
  period: CalendarCheck,
};

/**
 * מה חשוב לדעת על החיוב במסלול העצמאי: אין חיוב חוזר בלי אישור, טווח העלות
 * הכוללת בתהליך טיפוסי, ותקופה שנפתחה היא סכום קבוע.
 *
 * `row` — שלושה כרטיסים בשורה, לעמודי השיווק. `stack` — רשימה צפופה, לצד מסך
 * התשלום. ה-`dir` על כל טקסט עוקף את המירכוז הגלובלי (globals.css), כדי
 * שהטקסט ייושר לימין ליד האייקון.
 */
export function PlatformBillingNotes({
  tone = 'light',
  layout = 'row',
  className = '',
}: {
  tone?: 'light' | 'dark';
  layout?: 'row' | 'stack';
  className?: string;
}) {
  const dark = tone === 'dark';
  const card = dark
    ? 'border border-white/15 bg-white/5 text-white backdrop-blur'
    : 'border border-slate-200 bg-white text-slate-900';

  return (
    <ul
      dir="rtl"
      className={`grid gap-3 ${layout === 'row' ? 'md:grid-cols-3' : ''} ${className}`}
    >
      {PLATFORM_BILLING_NOTES.map((note) => {
        const Icon = ICONS[note.id] ?? ShieldCheck;
        return (
          <li key={note.id} className={`flex items-start gap-3 rounded-2xl p-4 text-start ${card}`}>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                dark ? 'bg-white/15 text-cyan-200' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span dir="rtl" className="min-w-0 flex-1 text-start">
              <span dir="rtl" className="text-info block font-black leading-snug">{note.title}</span>
              <span dir="rtl" className={`mt-1 block text-sm leading-relaxed ${dark ? 'text-white/75' : 'text-slate-600'}`}>
                {note.description}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
