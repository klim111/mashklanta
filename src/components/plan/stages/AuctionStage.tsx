'use client';

import { useMemo } from 'react';
import { AlertCircle, BadgePercent, Loader2, Pencil } from 'lucide-react';
import type { AuctionData, AuctionMode, PlanData, SignedMixChoice } from '@/lib/mortgage-plan';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { AuctionModeChoice } from './auction/AuctionModeChoice';
import { AuctionWorkspace } from './auction/AuctionWorkspace';
import { bankTone, pricedMixesFor } from './auction/pricedMixes';
import { PanelBadge, StagePanel, StageStat } from './auction/ui';
import { formatPercent, formatShekel } from '../ui';

/**
 * שלב 4 — תמחור התמהיל הסופי מול הבנקים.
 *
 * השלב נפתח בשאלה אחת: יועץ או לבד. עד שנענית, לא מוצג במסך שום דבר אחר —
 * שתי הדרכים נראות אחרת לגמרי, ואין טעם להראות כלים שאולי לא ישמשו.
 * אחרי הבחירה נפתח מסך התמחור: התמהיל הסופי, ההצעות שהתקבלו עליו, וההשוואה
 * ביניהן.
 */
export function AuctionStage({
  data,
  onChange,
  planId,
  onRequestAdvisor,
  advisorRun = false,
}: {
  data: PlanData;
  onChange: (next: AuctionData) => void;
  planId: string;
  /** פתיחת מסך הזמנת הליווי — מנוהל ברמת התהליך, כי הוא נוגע לכל השלבים */
  onRequestAdvisor?: () => void;
  /**
   * הלקוח כבר שילם על ליווי בשלב הזה. אז אין מה לשאול אותו איך לעבור אותו —
   * הוא בליווי, גם אם ההזמנה נעשתה מכפתור הליווי שבכותרת ולא ממסך הבחירה.
   */
  advisorRun?: boolean;
}) {
  const value = data.AUCTION;
  const finalMixKey = data.MIX.mixKey;
  const { saved, ready, save, remove } = useSavedMixes({ planId });

  const finalMix = useMemo(
    () => saved.find((item) => item.mix.id === finalMixKey) ?? null,
    [saved, finalMixKey]
  );

  const signed = value.signedMix;

  const setMode = (mode: AuctionMode) => onChange({ ...value, mode });

  const onSavePriced = async (quoted: WorkspaceMix) => {
    await save(quoted, { planId });
  };

  const onRemovePriced = async (mixId: string) => {
    if (!window.confirm('למחוק את ההצעה הזו?')) return;
    if (signed?.mixKey === mixId) onChange({ ...value, signedMix: null });
    await remove(mixId);
  };

  const onSelectForSigning = (mixId: string) => {
    const item = pricedMixesFor(saved, finalMixKey).find((row) => row.mix.id === mixId);
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
    onChange({ ...value, signedMix: choice });
  };

  /*
    הבחירה נשאלת לפני כל טעינה של נתונים: היא אינה תלויה בתמהילים, והצגת
    ספינר לפניה רק מעכבת את השאלה היחידה שבאמת נשאלת כאן.
  */
  const mode = advisorRun ? 'advisor' : value.mode;

  if (!mode) {
    return (
      <AuctionModeChoice
        onChooseAdvisor={() => {
          setMode('advisor');
          onRequestAdvisor?.();
        }}
        onChooseSelf={() => setMode('self')}
      />
    );
  }

  if (!ready) {
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
        description="שלב התמחור עובד על מבנה תמהיל אחד שננעל. חזרו לשלב בניית התמהיל, ובשורת התמהיל שבחרתם לחצו על ׳בחר כתמהיל סופי׳."
      >
        <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {data.MIX.mixName
            ? `התמהיל "${data.MIX.mixName}" נשמר, אך לא נמצא באזור התמהילים של הנכס.`
            : 'לא נמצא תמהיל שמור לנכס הזה.'}
        </div>
      </StagePanel>
    );
  }

  const signedTone = bankTone(signed?.bank);

  return (
    <div className="space-y-5">
      <ModeBanner
        mode={mode}
        onChange={advisorRun ? undefined : () => onChange({ ...value, mode: null })}
      />

      <AuctionWorkspace
        role={mode === 'advisor' ? 'advised' : 'self'}
        finalMix={finalMix}
        savedMixes={saved}
        signedMixKey={signed?.mixKey ?? null}
        onSelectForSigning={onSelectForSigning}
        onSavePriced={mode === 'self' ? onSavePriced : undefined}
        onRemovePriced={mode === 'self' ? (mixId) => void onRemovePriced(mixId) : undefined}
      />

      {signed && (
        <StagePanel
          tone="accent"
          badge={<PanelBadge tone="emerald">נבחר לחתימה</PanelBadge>}
          title="המשכנתא שלי"
          description="זו ההצעה שנבחרה לחתימה. היא מופיעה גם באזור האישי, ומולה מאומתים מסמכי הבנק בשלב החתימה."
        >
          <div className={`rounded-2xl border-2 p-4 text-center ${signedTone.border} ${signedTone.surface}`}>
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white"
                style={{ backgroundColor: signedTone.dot }}
              >
                <BadgePercent className="h-3.5 w-3.5" />
                בנק {signed.bank}
              </span>
              <span className="text-base font-black text-slate-900">{signed.name}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StageStat label="החזר חודשי" value={formatShekel(signed.monthlyPayment)} tone="good" />
              <StageStat label="סך ריבית" value={formatShekel(signed.totalInterest)} />
              <StageStat label="סך תשלום" value={formatShekel(signed.totalPaid)} />
              <StageStat label="ריבית ממוצעת" value={formatPercent(signed.averageRate, 2)} />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-600">
              אפשר לשנות את הבחירה כל עוד לא נחתם — בחרו הצעה אחרת בהשוואה שלמעלה.
            </p>
          </div>
        </StagePanel>
      )}
    </div>
  );
}

/** באיזו דרך נבחר לעבור את השלב, עם אפשרות לחזור ולשנות */
function ModeBanner({ mode, onChange }: { mode: AuctionMode; onChange?: () => void }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-center ${
        mode === 'advisor' ? 'border-violet-300 bg-violet-50' : 'border-blue-200 bg-blue-50'
      }`}
    >
      <span className="text-sm font-black text-slate-800">
        {mode === 'advisor'
          ? 'היועץ מנהל עבורכם את מכרז הריביות'
          : 'אתם מנהלים את מכרז הריביות בעצמכם'}
      </span>
      {onChange && (
        <button
          type="button"
          onClick={onChange}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          שינוי הבחירה
        </button>
      )}
    </div>
  );
}
