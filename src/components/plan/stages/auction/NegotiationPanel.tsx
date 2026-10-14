'use client';

import React, { useState } from 'react';
import { BadgePercent, Ban, Check, Copy, Handshake, Mail, PencilLine, RotateCcw, Trophy } from 'lucide-react';
import { TRACK_TYPES } from '@/components/mortgage-advisor/types';
import type { AuctionNegotiation } from '@/lib/mortgage-plan';
import type { MortgageBank } from '@/components/mortgage-advisor/types';
import { ApprovalDocButton } from './ApprovalDocButton';
import type { BankApprovalAccess } from './ApprovalDocButton';
import {
  awaitingBanks,
  cheapestByWeightedRate,
  everyoneDeclined,
  latestOfBank,
  latestOffers,
  negotiationBanks,
  negotiationEmail,
  weightedRateOf,
} from './negotiation';
import { bankTone } from './pricedMixes';
import type { PricedMix } from './pricedMixes';
import { PanelBadge, StagePanel } from './ui';

export interface BankerContact {
  name: string;
  email: string;
}

/**
 * סבבי המיקוח.
 *
 * אחרי שהוזנו ריביות, הכלי מציג את ההצעה הזולה לפי הריבית הכוללת המשוקללת
 * ומנחה לשלוח אותה לשאר הבנקים. ליד כל בנק — הזנת הריביות המעודכנות שחזרו ממנו,
 * שליחת ההצעה הזולה לבנקאי, והאישור העקרוני שלו. הסבב חוזר עד "אף בנק לא מוכן
 * לרדת בריביות"; אז מוצג הבנק עם ההצעה הזולה, ואפשר להעלות אישור עקרוני משופר
 * שפותח סבב נוסף.
 */
export function NegotiationPanel({
  priced,
  approvedBanks,
  negotiation,
  onChange,
  onEnterRates,
  onDecline,
  approvals,
  bankers,
  onEmail,
  formatRate,
}: {
  priced: PricedMix[];
  approvedBanks: readonly string[];
  negotiation: AuctionNegotiation;
  onChange: (next: AuctionNegotiation) => void;
  /** פתיחת טבלת הריביות של הבנק, להזנת הריביות המעודכנות */
  onEnterRates: (bank: MortgageBank) => void;
  /** הבנק ענה שאינו משפר — ההצעה האחרונה שלו היא הטובה ביותר שלו */
  onDecline: (bank: string) => void;
  approvals?: BankApprovalAccess;
  /** הבנקאי של כל בנק, כפי שהוזן בשלב האישור העקרוני */
  bankers: Record<string, BankerContact>;
  /** פתיחת מייל בכלי ההתכתבויות; ריק — אין כלי, ומעתיקים את הנוסח */
  onEmail?: ((to: string, subject: string, text: string) => void) | null;
  formatRate: (value: number) => string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  // המיקוח נעשה על ההצעה האחרונה של כל בנק — מה שהוא מציע עכשיו
  const cheapest = cheapestByWeightedRate(latestOffers(priced));
  if (!cheapest) return null;

  const ended = Boolean(negotiation.endedAt);
  const banks = negotiationBanks(approvedBanks, priced);
  const others = banks.filter((bank) => bank !== cheapest.bank);
  const single = banks.length <= 1;
  const awaiting = awaitingBanks(negotiation, priced);
  const allDeclined = everyoneDeclined(negotiation, priced);
  const cheapestRate = weightedRateOf(cheapest);

  const send = (bank: string) => {
    const banker = bankers[bank];
    const email = negotiationEmail(cheapest, { bank, bankerName: banker?.name });
    if (banker?.email && onEmail) {
      onEmail(banker.email, email.subject, email.text);
      return;
    }
    void navigator.clipboard?.writeText(`${email.subject}\n\n${email.text}`).then(() => {
      setCopied(bank);
      window.setTimeout(() => setCopied((current) => (current === bank ? null : current)), 2500);
    });
  };

  return (
    <StagePanel
      tone="accent"
      badge={
        <PanelBadge tone={ended ? 'emerald' : 'violet'}>
          <Handshake className="h-3.5 w-3.5" />
          {ended ? 'המיקוח הסתיים' : `סבב מיקוח ${negotiation.round}`}
        </PanelBadge>
      }
      title={ended ? `ההצעה הזולה ביותר: ${cheapest.bank}` : 'המיקוח על הריביות'}
      description={
        ended
          ? 'זו ההצעה הזולה לפי הריבית הכוללת המשוקללת, וההשוואה מול שאר ההצעות מופיעה למטה. אם בנק נתן לכם אישור עקרוני משופר, העלו אותו ליד הבנק והזינו את הריביות שבו — הכלי יחשב מחדש את ההצעה הזולה.'
          : single
            ? 'הכלי מחשב את הריבית הכוללת המשוקללת של ההצעה. בקשו מהבנק לשפר אותה, והזינו כאן את הריביות המעודכנות שיחזרו ממנו.'
            : 'הכלי מוצא את ההצעה הזולה לפי הריבית הכוללת המשוקללת. קחו אותה ושלחו לשאר הבנקים לצורך מיקוח, והזינו כאן את הריביות המעודכנות שכל בנק מחזיר.'
      }
    >
      <div className="space-y-4">
        {/* ההצעה הזולה */}
        <div
          className={`flex flex-wrap items-center justify-center gap-3 rounded-2xl border-2 p-4 text-center ${bankTone(cheapest.bank).border} ${bankTone(cheapest.bank).surface}`}
        >
          <Trophy className="h-6 w-6 shrink-0 text-amber-500" />
          <div>
            <p className="text-info font-black text-slate-900">
              {single ? `ההצעה של ${cheapest.bank}` : `ההצעה הזולה ביותר — ${cheapest.bank}`}
            </p>
            <p className="text-sm font-bold text-slate-600">
              ריבית כוללת משוקללת <span className="font-black text-slate-900">{formatRate(cheapestRate)}</span>
            </p>
          </div>
        </div>

        {!ended && !single && (
          <p className="text-center text-sm font-black text-violet-900">
            קחו את ההצעה של {cheapest.bank} ושלחו אותה ל{others.join(', ')} — ובקשו מהם לרדת בריביות.
          </p>
        )}

        {/* הבנקים */}
        <div className="grid gap-2 md:grid-cols-2">
          {banks.map((bank) => {
            const latest = latestOfBank(priced, bank);
            const isCheapest = bank === cheapest.bank;
            const tone = bankTone(bank);
            const response = negotiation.responses[bank];
            const answered = response?.round === negotiation.round ? response.kind : null;
            const waiting = !ended && awaiting.includes(bank);
            return (
              <div
                key={bank}
                className={`space-y-2 rounded-2xl border-2 bg-white p-3 ${
                  isCheapest ? tone.border : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone.dot }} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-black text-slate-900">
                      {bank}
                      {isCheapest && !single && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-black text-amber-800">
                          הזולה ביותר
                        </span>
                      )}
                      {answered === 'DECLINED' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-black text-slate-700">
                          ללא שיפור
                        </span>
                      )}
                      {answered === 'UPDATED' && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-black text-emerald-800">
                          שיפר בסבב {negotiation.round}
                        </span>
                      )}
                      {waiting && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-2xs font-black text-violet-800">
                          ממתין לתשובה
                        </span>
                      )}
                    </p>
                    <p className="text-2xs font-bold text-slate-500">
                      {latest ? `ריבית כוללת משוקללת ${formatRate(weightedRateOf(latest))}` : 'עוד לא הוזנו ריביות'}
                    </p>
                  </div>
                  {approvals && <ApprovalDocButton bank={bank} access={approvals} improved={ended} labeled={ended} />}
                </div>

                {/* הריביות של הסבב הקודם — מה שהבנק מתבקש לשפר */}
                {latest && (
                  <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                    <p className="text-2xs font-black text-slate-600">
                      {answered === 'UPDATED'
                        ? 'הריביות המעודכנות'
                        : answered === 'DECLINED'
                          ? `ההצעה הטובה ביותר של ${bank}`
                          : 'הריביות מהסבב הקודם'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {latest.mix.tracks.map((track) => (
                        <span key={track.id} className="text-2xs font-bold text-slate-700">
                          {TRACK_TYPES[track.type] ?? track.name}{' '}
                          <span className="font-black text-slate-900">{formatRate(track.interestRate)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!ended && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!isCheapest && (
                      <button
                        type="button"
                        onClick={() => send(bank)}
                        className="inline-flex items-center gap-1 rounded-xl border-2 border-violet-200 bg-violet-50 px-2.5 py-1.5 text-2xs font-black text-violet-800 hover:bg-violet-100"
                      >
                        {copied === bank ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : bankers[bank]?.email && onEmail ? (
                          <Mail className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copied === bank
                          ? 'הנוסח הועתק'
                          : bankers[bank]?.email && onEmail
                            ? 'שליחת ההצעה לבנקאי'
                            : 'העתקת ההצעה לשליחה'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEnterRates(bank as MortgageBank)}
                      className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-2xs font-black text-white hover:bg-blue-700"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      {latest ? 'הזינו ריביות מעודכנות מהבנק' : 'הזינו ריביות מהבנק'}
                    </button>
                    {latest && waiting && (
                      <button
                        type="button"
                        onClick={() => onDecline(bank)}
                        className="inline-flex items-center gap-1 rounded-xl border-2 border-slate-200 bg-white px-2.5 py-1.5 text-2xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        ללא שיפור
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allDeclined && !ended && (
          <p className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm font-black text-slate-800">
            {single
              ? 'הבנק ענה שאינו משפר. ההצעה האחרונה שלו היא הטובה ביותר — סמנו שהמיקוח הסתיים.'
              : 'כל הבנקים ענו שאינם משפרים. ההצעה האחרונה של כל בנק היא הטובה ביותר שלו — סמנו שהמיקוח הסתיים.'}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {ended ? (
            <button
              type="button"
              onClick={() => onChange({ ...negotiation, round: negotiation.round + 1, endedAt: null })}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              חזרה למיקוח
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onChange({ ...negotiation, endedAt: new Date().toISOString() })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              <BadgePercent className="h-4 w-4" />
              {single ? 'הבנק לא מוכן לרדת בריביות' : 'אף בנק לא מוכן לרדת בריביות'}
            </button>
          )}
        </div>
      </div>
    </StagePanel>
  );
}
