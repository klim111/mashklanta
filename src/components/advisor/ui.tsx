'use client';

import React from 'react';
import { journeyStageFor } from '@/data/platform/planStages';
import type { PlanStageId } from '@/lib/advisor-crm';

/**
 * אבני הבניין של לוח הבקרה של היועץ.
 *
 * כותרות השלבים והצבעים שלהם נלקחים מ"איך זה עובד" דרך `journeyStageFor`, כדי
 * שהשלב ייראה אצל היועץ בדיוק כפי שהוא נראה אצל הלקוח.
 */

export function formatShekel(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}

export function stageLabel(stage: PlanStageId): string {
  return journeyStageFor(stage).shortTitle;
}

export function stageGradient(stage: PlanStageId): string {
  return journeyStageFor(stage).gradient;
}

export function StageIcon({ stage, className }: { stage: PlanStageId; className?: string }) {
  const Icon = journeyStageFor(stage).icon;
  return <Icon className={className} />;
}

/** תג השלב — אותו צבע ואותה כותרת שהלקוח רואה בתהליך שלו */
export function StageChip({
  stage,
  className = '',
}: {
  stage: PlanStageId;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-l ${stageGradient(
        stage
      )} px-2 py-0.5 text-[10px] font-black text-white ${className}`}
    >
      <StageIcon stage={stage} className="h-3 w-3" />
      {stageLabel(stage)}
    </span>
  );
}

export function SectionCard({
  title,
  icon,
  action,
  children,
  className = '',
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            {icon}
            {title}
          </h3>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ───────────────────────────── תאריך ושעה ─────────────────────────────

/**
 * ISO → הערך ש-`input[type=datetime-local]` מצפה לו (זמן מקומי, בלי אזור זמן).
 * ההמרה ידנית בכוונה: `toISOString` היה מזיז את השעה ל-UTC ומציג מועד שגוי.
 */
export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** הערך מהשדה חזרה ל-ISO, או null כשהשדה רוקן */
export function fromLocalInputValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ברירת מחדל להצעת פגישה: מחר בשעה עגולה */
export function defaultMeetingSlot(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toLocalInputValue(date.toISOString());
}
