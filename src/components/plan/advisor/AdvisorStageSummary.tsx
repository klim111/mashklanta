'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, UserCheck } from 'lucide-react';
import type { PlanData, PlanStageId, PlanStageStatus } from '@/lib/mortgage-plan';
import { stageSnapshot } from '@/lib/plan-stage-snapshot';
import { journeyStageFor } from '@/data/platform/planStages';

interface AdvisorStageSummaryProps {
  stage: PlanStageId;
  data: PlanData;
  status: PlanStageStatus;
  /** שם היועץ שמבצע את השלב, כשידוע */
  advisorName?: string | null;
  /** האם הפירוט המלא פתוח כרגע */
  detailsOpen: boolean;
  onToggleDetails: () => void;
}

/**
 * התצוגה של שלב שיועץ מבצע.
 *
 * במקום הכלים והטפסים של השלב — דאשבורד אחד פשוט: מה קורה בשלב, ואיפה הוא
 * עומד בארבעה מספרים. מי שרוצה לראות הכול לוחץ "ראה פרטים", והשלב המלא נפתח
 * מתחת, בדיוק כפי שהוא.
 */
export function AdvisorStageSummary({
  stage,
  data,
  status,
  advisorName,
  detailsOpen,
  onToggleDetails,
}: AdvisorStageSummaryProps) {
  const journey = journeyStageFor(stage);
  const snapshot = stageSnapshot(stage, data, status);
  const Icon = journey.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm"
    >
      <div className={`h-1.5 w-full bg-gradient-to-l ${journey.gradient}`} />

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${journey.gradient} shadow-lg`}
          >
            <Icon className="h-6 w-6 text-white" />
          </span>

          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-black text-violet-700">
              <UserCheck className="h-3 w-3" />
              {advisorName ? `היועץ ${advisorName} מבצע עבורכם` : 'היועץ מבצע את השלב עבורכם'}
            </span>
            <h3 className="mt-1 text-lg font-black text-slate-900">{snapshot.headline}</h3>
            <p className="text-xs text-slate-500">
              {journey.title} · {journey.duration}
            </p>
          </div>

          {status === 'COMPLETED' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-700">
              הושלם
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-800">
              <Clock className="h-3 w-3" />
              בביצוע
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snapshot.items.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-center">
              <div className="text-[11px] font-bold text-slate-500">{item.label}</div>
              <div className="mt-0.5 text-lg font-black tabular-nums text-slate-900">
                {item.value ?? '—'}
              </div>
              {item.note && <div className="text-[10px] text-slate-400">{item.note}</div>}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            {journey.valueHeadline} — {journey.tagline}
          </p>
          <button
            type="button"
            onClick={onToggleDetails}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            {detailsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {detailsOpen ? 'הסתר פרטים' : 'ראה פרטים'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
