'use client';

import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import { formatPercentage } from '@/components/mortgage-advisor/mortgageCalculations';
import { formatShekel } from '@/components/mortgage-advisor/workspace/primitives';
import { BroadcastMixDialog } from '@/components/plan/stages/auction/BroadcastMixDialog';
import { StagePanel } from '@/components/plan/stages/auction/ui';
import { refinanceMixFields } from '@/components/plan/stages/refinance/RefinanceMixStage';
import type { MixData } from '@/lib/mortgage-plan';

/**
 * שידור התמהיל למיחזור ללקוח.
 *
 * זה המקביל של `AdvisorMixBroadcast` בתהליך מיחזור: מה שהיועץ שומר בכלי
 * המיחזור נשאר טיוטה שלו. השידור עושה שני דברים יחד — התמהיל השמור נעשה גלוי
 * ללקוח, והטיוטה מחליפה את התמהיל למיחזור שהלקוח רואה בשלב שלו.
 */
export function AdvisorRefinanceBroadcast({
  clientId,
  clientName,
  planId,
  mix,
  onChange,
}: {
  clientId: string;
  clientName: string;
  planId: string;
  mix: MixData;
  onChange: (next: MixData) => void;
}) {
  const draft = mix.advisorRefinanceDraft ?? null;
  const { saved, share, refresh } = useSavedMixes({ clientId, planId });
  const [open, setOpen] = useState(false);
  const draftId = draft?.refinancedMix.id ?? null;
  const item = draftId ? (saved.find((row) => row.mix.id === draftId) ?? null) : null;

  // התמהיל נשמר מהכלי שמתחת, ולכן הרשימה כאן מתרעננת כשמגיעה טיוטה חדשה
  useEffect(() => {
    if (draftId && !item) void refresh();
  }, [draftId, item, refresh]);

  if (!draft) return null;

  const broadcast = async (): Promise<boolean> => {
    if (!(await share(draft.refinancedMix.id))) return false;
    onChange({
      ...refinanceMixFields(mix, { ...draft, mode: mix.refinance?.mode ?? null }, item?.recordId),
      refinancePending: false,
      advisorRefinanceDraft: null,
    });
    return true;
  };

  return (
    <StagePanel
      title="שידור התמהיל למיחזור ללקוח"
      description={`התמהיל ששמרתם למיחזור נשמר אצלכם בלבד. ${clientName} ימשיך לראות את התמהיל הקודם עד שתשדרו את הטיוטה.`}
    >
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border-2 border-violet-200 bg-violet-50/50 px-4 py-3 text-center">
        <span className="text-base font-black text-slate-900">{draft.refinancedMix.name || 'התמהיל למיחזור'}</span>
        <span className="text-sm font-bold text-slate-600">
          {formatShekel(draft.refinancedMix.totalAmount)} · החזר {formatShekel(draft.refinanced.monthlyPayment)} ·{' '}
          {formatPercentage(draft.refinanced.averageRate)}
        </span>
        <button
          type="button"
          disabled={!item}
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
        >
          <Radio className="h-4 w-4" />
          שדר תמהיל ללקוח
        </button>
      </div>

      {item && (
        <BroadcastMixDialog
          open={open}
          onOpenChange={setOpen}
          item={item}
          clientName={clientName}
          onConfirm={broadcast}
        />
      )}
    </StagePanel>
  );
}
