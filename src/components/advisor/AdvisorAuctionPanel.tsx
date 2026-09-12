'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { AuctionData, SignedMixChoice } from '@/lib/mortgage-plan';
import { usePlan } from '@/components/plan/usePlan';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { AuctionWorkspace } from '@/components/plan/stages/auction/AuctionWorkspace';
import { BroadcastMixDialog } from '@/components/plan/stages/auction/BroadcastMixDialog';
import { pricedMixesFor } from '@/components/plan/stages/auction/pricedMixes';
import type { PricedMix } from '@/components/plan/stages/auction/pricedMixes';
import { StagePanel } from '@/components/plan/stages/auction/ui';

/**
 * שלב התמחור אצל היועץ.
 *
 * זה בדיוק אותו מסך שהלקוח רואה — אותם אזורים, אותה תצוגה, אותה התנהגות —
 * ולכן הוא בנוי מאותו רכיב. ההבדל היחיד הוא שכל מה שהיועץ מזין נשמר תחילה
 * אצלו בלבד, ו"שדר תמהיל ללקוח" הוא מה שמעביר אותו אליו.
 */
export function AdvisorAuctionPanel({
  clientId,
  clientName,
  planId,
}: {
  clientId: string;
  clientName: string;
  planId: string | null;
}) {
  const { plan, ready: planReady, updateStage } = usePlan(planId ?? '');
  const { saved, ready: mixesReady, save, remove, share } = useSavedMixes({
    clientId,
    planId: planId ?? undefined,
  });
  const [broadcastTarget, setBroadcastTarget] = useState<PricedMix | null>(null);

  const finalMixKey = plan?.data.MIX.mixKey ?? null;
  const finalMix = useMemo(
    () => saved.find((item) => item.mix.id === finalMixKey) ?? null,
    [saved, finalMixKey]
  );

  const broadcastIds = useMemo(
    () => saved.filter((item) => item.sharedWithClient !== false).map((item) => item.mix.id),
    [saved]
  );

  if (!planId) {
    return (
      <StagePanel
        title="הלקוח עדיין לא פתח תהליך"
        description="שלב התמחור עובד על התמהיל הסופי של תהליך משכנתא. פתחו ללקוח תהליך, או בקשו ממנו לפתוח אחד, כדי לעבוד כאן."
      >
        <div />
      </StagePanel>
    );
  }

  if (!planReady || !mixesReady) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!finalMix) {
    return (
      <StagePanel
        title="עוד לא נבחר תמהיל סופי"
        description="שלב התמחור עובד על מבנה תמהיל אחד שננעל. בשלב בניית התמהיל, בשורת התמהיל שנבחר, לחצו על ׳בחר כתמהיל סופי׳."
      >
        <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {plan?.data.MIX.mixName
            ? `התמהיל "${plan.data.MIX.mixName}" נשמר, אך לא נמצא בתמהילים של הלקוח.`
            : 'לא נמצא תמהיל סופי לתהליך הזה.'}
        </div>
      </StagePanel>
    );
  }

  const auction = plan?.data.AUCTION;
  const signed = auction?.signedMix ?? null;

  const onSavePriced = async (quoted: WorkspaceMix) => {
    // שמירה בתוך תיק של לקוח היא טיוטה: היא נשארת אצל היועץ עד לשידור
    await save(quoted, { clientId, planId });
  };

  const onSelectForSigning = (mixId: string) => {
    if (!auction) return;
    const item = pricedMixesFor(saved, finalMix.mix.id).find((row) => row.mix.id === mixId);
    if (!item) return;

    const choice: SignedMixChoice = {
      mixKey: item.mix.id,
      mixRecordId: item.recordId ?? null,
      bank: item.bank,
      name: item.mix.name,
      monthlyPayment: item.summary.monthlyPayment,
      averageRate: item.summary.averageRate,
      totalInterest: item.summary.totalInterest,
      totalPaid: item.summary.totalPaid,
      months: item.summary.months,
      chosenAt: new Date().toISOString(),
    };
    const next: AuctionData = { ...auction, signedMix: choice };
    updateStage('AUCTION', next);
  };

  return (
    <>
      <AuctionWorkspace
        role="advisor"
        finalMix={finalMix}
        savedMixes={saved}
        signedMixKey={signed?.mixKey ?? null}
        onSelectForSigning={onSelectForSigning}
        onSavePriced={onSavePriced}
        onRemovePriced={(mixId) => void remove(mixId)}
        onBroadcast={setBroadcastTarget}
        broadcastIds={broadcastIds}
      />

      {broadcastTarget && (
        <BroadcastMixDialog
          open
          onOpenChange={(next) => {
            if (!next) setBroadcastTarget(null);
          }}
          item={broadcastTarget as SavedMix}
          bank={broadcastTarget.bank}
          baseline={finalMix.summary}
          baselineLabel="התמהיל הסופי כפי שתוכנן"
          clientName={clientName}
          onConfirm={() => share(broadcastTarget.mix.id)}
        />
      )}
    </>
  );
}
