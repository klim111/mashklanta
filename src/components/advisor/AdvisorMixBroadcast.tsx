'use client';

import React, { useMemo, useState } from 'react';
import { Check, Radio } from 'lucide-react';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { BroadcastMixDialog } from '@/components/plan/stages/auction/BroadcastMixDialog';
import { StagePanel } from '@/components/plan/stages/auction/ui';

/**
 * שידור תמהילים ללקוח בשלב בניית התמהיל.
 *
 * כל מה שהיועץ שומר בכלי התכנון בתוך תיק של לקוח נשמר תחילה אצלו בלבד — הוא
 * צריך מקום לנסות חלופות בלי שהלקוח יראה כל טיוטה. הרשימה כאן מראה מה שמור
 * ומה כבר שודר, והשידור עובר דרך סיכום ואישור סופי.
 */
export function AdvisorMixBroadcast({
  clientId,
  clientName,
  planId,
}: {
  clientId: string;
  clientName: string;
  planId: string | null;
}) {
  const { saved, ready, share } = useSavedMixes({ clientId, planId: planId ?? undefined });
  const [target, setTarget] = useState<SavedMix | null>(null);

  const drafts = useMemo(
    () => saved.filter((item) => item.sharedWithClient === false),
    [saved]
  );
  const shared = useMemo(
    () => saved.filter((item) => item.sharedWithClient !== false && item.ownerIsAdvisor),
    [saved]
  );

  if (!ready || (drafts.length === 0 && shared.length === 0)) return null;

  return (
    <StagePanel
      title="שידור תמהילים ללקוח"
      description={`מה שתשמרו כאן נשמר אצלכם בלבד. ${clientName} יראה תמהיל רק אחרי שתשדרו אותו — כך אפשר לנסות חלופות בלי שכל טיוטה תגיע אליו.`}
    >
      <div className="space-y-2">
        {drafts.map((item) => (
          <BroadcastRow key={item.mix.id} item={item} onBroadcast={() => setTarget(item)} />
        ))}
        {shared.map((item) => (
          <BroadcastRow key={item.mix.id} item={item} sent />
        ))}
      </div>

      {target && (
        <BroadcastMixDialog
          open
          onOpenChange={(next) => {
            if (!next) setTarget(null);
          }}
          item={target}
          clientName={clientName}
          onConfirm={() => share(target.mix.id)}
        />
      )}
    </StagePanel>
  );
}

function BroadcastRow({
  item,
  sent = false,
  onBroadcast,
}: {
  item: SavedMix;
  sent?: boolean;
  onBroadcast?: () => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-3 rounded-2xl border-2 px-4 py-3 text-center ${
        sent ? 'border-emerald-200 bg-emerald-50/60' : 'border-violet-200 bg-violet-50/50'
      }`}
    >
      <span className="text-base font-black text-slate-900">{item.mix.name}</span>
      <span className="text-sm font-bold text-slate-600">
        {formatShekel(item.mix.totalAmount)} · החזר {formatShekel(item.summary.monthlyPayment)} ·{' '}
        {formatPercentage(item.summary.averageRate)}
      </span>

      {sent ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
          <Check className="h-3.5 w-3.5" />
          שודר ללקוח
        </span>
      ) : (
        <button
          type="button"
          onClick={onBroadcast}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-violet-700"
        >
          <Radio className="h-4 w-4" />
          שדר תמהיל ללקוח
        </button>
      )}
    </div>
  );
}
