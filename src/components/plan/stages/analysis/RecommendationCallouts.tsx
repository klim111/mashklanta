'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertOctagon, AlertTriangle, Lightbulb } from 'lucide-react';
import { profileRecommendations } from '@/lib/profile-report';
import type { ProfileRecommendation, RecommendationTone } from '@/lib/profile-report';
import type { AnalysisData, ProfileScreen } from '@/lib/mortgage-plan';

const toneStyles: Record<
  RecommendationTone,
  { ring: string; icon: typeof Lightbulb; iconBox: string; title: string; text: string; badge: string }
> = {
  info: {
    ring: 'border-blue-200 bg-gradient-to-l from-blue-50 to-white',
    icon: Lightbulb,
    iconBox: 'bg-blue-600',
    title: 'text-blue-950',
    text: 'text-blue-900/80',
    badge: 'bg-blue-100 text-blue-700',
  },
  warning: {
    ring: 'border-amber-300 bg-gradient-to-l from-amber-50 to-white',
    icon: AlertTriangle,
    iconBox: 'bg-amber-500',
    title: 'text-amber-950',
    text: 'text-amber-900/80',
    badge: 'bg-amber-100 text-amber-800',
  },
  critical: {
    ring: 'border-rose-300 bg-gradient-to-l from-rose-50 to-white',
    icon: AlertOctagon,
    iconBox: 'bg-rose-600',
    title: 'text-rose-950',
    text: 'text-rose-900/80',
    badge: 'bg-rose-100 text-rose-700',
  },
};

const toneLabel: Record<RecommendationTone, string> = {
  info: 'המלצה',
  warning: 'שימו לב',
  critical: 'קריטי',
};

/** מה שכרטיס הערה מציג — המלצה מהפרופיל, או הערה של מסך שנבנתה במקום */
export type RecommendationNote = Pick<ProfileRecommendation, 'tone' | 'title' | 'body' | 'bullets'> & {
  id: string;
};

export function RecommendationCard({
  recommendation,
  compact = false,
}: {
  recommendation: RecommendationNote;
  compact?: boolean;
}) {
  const style = toneStyles[recommendation.tone];
  const Icon = style.icon;
  return (
    <div className={`rounded-2xl border p-4 text-right shadow-sm ${style.ring}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ${style.iconBox}`}>
          <Icon className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${style.badge}`}>
              {toneLabel[recommendation.tone]}
            </span>
            <h4 className={`text-sm font-black leading-snug ${style.title}`}>{recommendation.title}</h4>
          </div>
          <p className={`mt-1.5 leading-relaxed ${compact ? 'text-[12px]' : 'text-sm'} ${style.text}`}>
            {recommendation.body}
          </p>
          {recommendation.bullets && recommendation.bullets.length > 0 && (
            <ul className={`mt-2 space-y-1 leading-relaxed ${compact ? 'text-[11px]' : 'text-xs'} ${style.text}`}>
              {recommendation.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-1.5">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ההמלצות שצפות במסך הנוכחי, בסדר שבו הן נגזרות מהפרופיל. המלצות שמוצגות
 * כסימן קריאה ליד הנתון שלהן (`exclude`) אינן חוזרות כאן כשורה.
 */
export function RecommendationCallouts({
  profile,
  screen,
  exclude = [],
}: {
  profile: AnalysisData;
  screen: ProfileScreen;
  exclude?: string[];
}) {
  const items = profileRecommendations(profile).filter(
    (item) => item.screens.includes(screen) && !exclude.includes(item.id)
  );
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <RecommendationCard recommendation={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
