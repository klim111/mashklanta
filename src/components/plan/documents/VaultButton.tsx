'use client';

import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import type { PlanData, PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { DocumentVaultDialog, ProgressBar, useDocumentProgress } from './DocumentVaultDialog';
import { demoId } from '@/demo/demo-attr';

/**
 * הכפתור לתיק המסמכים — זמין בכל מסך ובכל שלב — עם פס ההתקדמות מתחתיו:
 * לכל התהליך, ובגרסה המלאה גם לכל שלב בנפרד.
 *
 * `header` יושב בראש שולחן העבודה על רקע כהה; `sidebar` בתפריט הצד של האזור
 * האישי; `compact` הוא כפתור צף קטן למסכים צרים.
 */
export function VaultButton({
  planId,
  data,
  stage = null,
  variant = 'header',
}: {
  planId: string;
  data: PlanData;
  stage?: PlanStageId | null;
  variant?: 'header' | 'sidebar' | 'compact';
}) {
  const [open, setOpen] = useState(false);
  const { progress } = useDocumentProgress(planId, data);
  const relevant = progress.stages.filter((row) => row.relevant);

  const dialog = (
    <DocumentVaultDialog open={open} onOpenChange={setOpen} planId={planId} data={data} stage={stage} />
  );

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          {...demoId('vault-button')}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-button font-black text-slate-900 shadow-lg ring-1 ring-slate-200 transition-transform hover:-translate-y-0.5"
        >
          <FolderOpen className="h-4 w-4 text-emerald-600" />
          תיק המסמכים
          <span className="rounded-full bg-slate-100 px-1.5 text-2xs text-slate-600">{progress.overall.percent}%</span>
        </button>
        {dialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
          {...demoId('vault-button')}
        className={`group w-full rounded-2xl p-3 text-right transition-colors ${
          variant === 'sidebar'
            ? 'bg-white/5 hover:bg-white/10'
            : 'bg-white/10 ring-1 ring-white/20 hover:bg-white/15'
        }`}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-black text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-200">
              <FolderOpen className="h-4 w-4" />
            </span>
            תיק המסמכים
          </span>
          <span className="text-sm font-black text-white/80">
            {progress.overall.done}/{progress.overall.total} · {progress.overall.percent}%
          </span>
        </span>
        <span className="mt-2 block">
          <ProgressBar percent={progress.overall.percent} tone="white" />
        </span>
        {variant === 'header' && relevant.length > 0 && (
          <span className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {relevant.map((row) => (
              <span key={row.stage} className="block">
                <span className="flex items-center justify-between text-2xs font-bold text-white/60">
                  <span className="truncate">{journeyStageFor(row.stage).shortTitle}</span>
                  <span>
                    {row.done}/{row.total}
                  </span>
                </span>
                <ProgressBar percent={row.percent} tone="white" size="sm" />
              </span>
            ))}
          </span>
        )}
      </button>
      {dialog}
    </>
  );
}
