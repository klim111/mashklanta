'use client';

import { motion } from 'framer-motion';
import { BadgePercent, Coins, KeyRound, Route, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PRICING_PRINCIPLES } from '@/lib/service-flow';

const ICONS: Record<string, LucideIcon> = {
  platform: KeyRound,
  credit: Coins,
  included: BadgePercent,
  freedom: Route,
  lowest: Scale,
};

/**
 * חמשת עקרונות התמחור, בנוסח אחד לכל המערכת.
 *
 * `compact` מציג אותם כשורת תגים — לדאשבורד ולמסכי הביניים; בלי `compact` הם
 * כרטיסים מלאים לעמודי השיווק. `tone` מתאים את הצבעים לרקע כהה או בהיר.
 */
export function PricingModelStrip({
  tone = 'light',
  compact = false,
  className = '',
}: {
  tone?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
}) {
  const dark = tone === 'dark';

  if (compact) {
    return (
      <ul dir="rtl" className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-5 ${className}`}>
        {PRICING_PRINCIPLES.map((item) => {
          const Icon = ICONS[item.id] ?? Scale;
          return (
            <li
              key={item.id}
              className={`flex items-start gap-2 rounded-2xl px-3 py-2.5 text-[12px] leading-snug ${
                dark
                  ? 'bg-white/10 text-white/85 ring-1 ring-white/15'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200'
              }`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-cyan-200' : 'text-blue-600'}`} />
              <span className="font-bold">{item.title}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div dir="rtl" className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-5 ${className}`}>
      {PRICING_PRINCIPLES.map((item, index) => {
        const Icon = ICONS[item.id] ?? Scale;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.06 }}
            className={`flex flex-col rounded-2xl p-5 ${
              dark
                ? 'border border-white/15 bg-white/5 text-white backdrop-blur'
                : 'border border-slate-200 bg-white text-slate-900 shadow-md'
            }`}
          >
            <span
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                dark ? 'bg-white/15 text-cyan-200' : 'bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow'
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className={`mb-1 text-[11px] font-black ${dark ? 'text-white/50' : 'text-slate-400'}`}>
              עיקרון {index + 1}
            </span>
            <h3 className="text-sm font-black leading-snug">{item.title}</h3>
            <p className={`mt-2 text-xs leading-relaxed ${dark ? 'text-white/70' : 'text-slate-600'}`}>
              {item.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
