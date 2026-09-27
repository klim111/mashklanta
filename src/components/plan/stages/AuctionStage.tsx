'use client';

import { useEffect, useMemo } from 'react';
import { AlertCircle, BadgePercent, Loader2 } from 'lucide-react';
import { banksWithPreApproval } from '@/lib/mortgage-plan';
import type { AuctionData, PlanData, RefinanceMixData, SignedMixChoice } from '@/lib/mortgage-plan';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { WorkspaceMix } from '@/components/mortgage-advisor/engine';
import { AuctionWorkspace } from './auction/AuctionWorkspace';
import { bankTone, pricedMixesFor, winningPricedMix } from './auction/pricedMixes';
import { PanelBadge, StagePanel, StageStat } from './auction/ui';
import { RefinanceOfferComparison } from './refinance/RefinanceOfferComparison';
import { formatPercent, formatShekel } from '../ui';

/**
 * שלב 4 — תמחור התמהיל הסופי מול הבנקים.
 *
 * לפני השלב מוצג עמוד ההסבר, ומיד אחריו מסך התמחור: התמהיל הסופי, ההצעות
 * שהתקבלו עליו, וההשוואה ביניהן. אין שאלה אם לתמחר לבד או עם יועץ — כשיועץ
 * מטפל בשלב (`advisorRun`), ההצעות נכנסות מהמסך שלו.
 */
export function AuctionStage({
  data,
  onChange,
  planId,
  advisorRun = false,
  banks,
  refinance = null,
}: {
  data: PlanData;
  onChange: (next: AuctionData) => void;
  planId: string;
  /** השלב מטופל על ידי יועץ (בקשת ליווי) — אז מוצג מסך הליווי במקום העצמי */
  advisorRun?: boolean;
  /**
   * הבנקים שנפתחים לתמחור, במקום אלה שנתנו אישור עקרוני. במיחזור פנימי זה
   * הבנק שבו המשכנתא מנוהלת.
   */
  banks?: readonly string[];
  /** בתהליך מיחזור — ההצעה מושווית גם מול המשכנתא המקורית */
  refinance?: RefinanceMixData | null;
}) {
  /*
    מיחזור פנימי מתנהל מול בנק אחד: אין מכרז, אין "הצעה זולה ביותר" ואין בנקים
    נוספים לפתוח. מה שיש הוא הצעה אחת, והשאלה היחידה היא איך היא נראית מול
    המשכנתא הקיימת — ולכן זה גם מה שהכותרות אומרות.
  */
  const internal = refinance?.mode === 'INTERNAL';
  const auctionCopy = internal
    ? {
        pricingTitle: 'הזנת ריביות שהתקבלו מהבנק',
        pricingDescription:
          'לחצו על הבנק והזינו את הריבית שהוא נקב לכל מסלול בתמהיל למיחזור. אחרי השמירה ההשוואה מול המשכנתא הנוכחית מתעדכנת מיד.',
        featuredTitle: 'השוואה בין ההצעה של הבנק לבין המשכנתא הנוכחית',
        featuredDescription:
          'התמהיל, המספרים והגרפים של ההצעה שהתקבלה מהבנק על התמהיל שבניתם למיחזור.',
        offerBadge: { label: 'הצעת המיחזור של הבנק', everyOffer: true },
        signLabel: {
          badge: 'ההצעה שאושרה למיחזור',
          button: 'אשרו את ההצעה הזו כמיחזור',
          confirm:
            'לאשר את ההצעה הזו כמיחזור שייחתם? היא תופיע באזור האישי כמשכנתא שלכם לאחר המיחזור.',
        },
      }
    : undefined;
  const value = data.AUCTION;
  const finalMixKey = data.MIX.mixKey;
  const { saved, ready, save, remove, refresh } = useSavedMixes({ planId });

  const finalMix = useMemo(
    () => saved.find((item) => item.mix.id === finalMixKey) ?? null,
    [saved, finalMixKey]
  );

  const signed = value.signedMix;

  /*
    בליווי, ההצעות נכנסות מהמסך של היועץ ולא מכאן. רענון תקופתי הוא מה שגורם
    להן להופיע אצל הלקוח מיד אחרי השידור, בלי שיצטרך לטעון את הדף מחדש.
  */
  const advised = advisorRun;
  useEffect(() => {
    if (!advised) return;
    const timer = window.setInterval(() => void refresh(), 15_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [advised, refresh]);

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

  /* התפקיד נקבע לפי מי מטפל בשלב: בליווי — advised, אחרת — self */
  const role: 'advised' | 'self' = advisorRun ? 'advised' : 'self';

  /* הבנקים שנתנו אישור עקרוני בשלב הקודם — רק מהם אפשר לבקש תמחור בפועל */
  const approvedBanks = banks && banks.length > 0 ? banks : banksWithPreApproval(data);

  /* במיחזור: ההצעה שנבחרה, ואם עוד לא נבחרה — הזולה ביותר, מול המשכנתא המקורית */
  const priced = pricedMixesFor(saved, finalMixKey);
  const comparedOffer =
    (signed ? priced.find((item) => item.mix.id === signed.mixKey) : null) ?? winningPricedMix(priced) ?? null;

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
        title="השלימו מילוי פרטים בשלב «בניית תמהיל»"
        description="שלב התמחור עובד על מבנה תמהיל אחד שננעל. בשלב בניית התמהיל, בשורת התמהיל שבחרתם, לחצו על ׳בחר כתמהיל סופי׳ — והתמחור ייפתח כאן עליו."
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
      <AuctionWorkspace
        role={role}
        finalMix={finalMix}
        savedMixes={saved}
        signedMixKey={signed?.mixKey ?? null}
        onSelectForSigning={onSelectForSigning}
        onSavePriced={onSavePriced}
        onRemovePriced={role === 'self' ? (mixId) => void onRemovePriced(mixId) : undefined}
        approvedBanks={approvedBanks}
        lockBanks={internal}
        copy={auctionCopy}
        allowSelfEntry
      />

      {refinance && (
        <RefinanceOfferComparison
          refinance={refinance}
          offer={comparedOffer}
          offerBank={comparedOffer?.bank ?? null}
        />
      )}

      {signed && (
        <StagePanel
          tone="accent"
          badge={<PanelBadge tone="emerald">{refinance ? 'ההצעה שאושרה' : 'נבחר לחתימה'}</PanelBadge>}
          title={refinance ? 'המיחזור שאושר' : 'המשכנתא שלי'}
          description={
            refinance
              ? 'זו ההצעה שאישרתם למיחזור. היא מופיעה גם באזור האישי כמשכנתא שלכם לאחר המיחזור.'
              : 'זו ההצעה שנבחרה לחתימה. היא מופיעה גם באזור האישי, ומולה מאומתים מסמכי הבנק בשלב החתימה.'
          }
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
