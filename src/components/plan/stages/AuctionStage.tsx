'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Gavel, Plus, Trash2, TrendingDown } from 'lucide-react';
import { PLAN_BANKS, UNIFORM_BASKETS, bestBasket, uniformBasket, winningOffer } from '@/lib/mortgage-plan';
import type { AuctionData, BankOffer, PlanData } from '@/lib/mortgage-plan';
import { EmptyHint, Metric, Panel, formatPercent, formatShekel } from '../ui';
import { NumericInput } from '@/components/ui/numeric-input';

function newOffer(bank: string, round: number): BankOffer {
  return {
    id: `offer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    bank,
    round,
    monthlyPayment: null,
    averageRate: null,
    totalPaid: null,
    note: '',
  };
}

const cellInput =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

export function AuctionStage({
  data,
  onChange,
}: {
  data: PlanData;
  onChange: (next: AuctionData) => void;
}) {
  const value = data.AUCTION;
  const winner = winningOffer(value);
  const preApproval = data.APPLICATIONS;

  /** הבנק שנתן את האישור העקרוני פותח את הרשימה — הוא כבר בתוך המשחק */
  const suggestions = preApproval.bank
    ? [preApproval.bank, ...PLAN_BANKS.filter((bank) => bank !== preApproval.bank)]
    : PLAN_BANKS;

  const addOffer = (bank: string) => {
    const round = value.offers.filter((offer) => offer.bank === bank).length + 1;
    onChange({ ...value, offers: [...value.offers, newOffer(bank, round)] });
  };

  const updateOffer = (id: string, patch: Partial<BankOffer>) =>
    onChange({
      ...value,
      offers: value.offers.map((offer) => (offer.id === id ? { ...offer, ...patch } : offer)),
    });

  const removeOffer = (id: string) =>
    onChange({
      ...value,
      offers: value.offers.filter((offer) => offer.id !== id),
      winnerOfferId: value.winnerOfferId === id ? null : value.winnerOfferId,
    });

  const comparable = value.offers.filter((offer) => (offer.totalPaid ?? 0) > 0);
  const cheapest =
    comparable.length > 0
      ? comparable.reduce((best, offer) =>
          (offer.totalPaid ?? 0) < (best.totalPaid ?? 0) ? offer : best
        )
      : null;
  const priciest =
    comparable.length > 0
      ? comparable.reduce((worst, offer) =>
          (offer.totalPaid ?? 0) > (worst.totalPaid ?? 0) ? offer : worst
        )
      : null;
  const spread =
    cheapest && priciest ? (priciest.totalPaid ?? 0) - (cheapest.totalPaid ?? 0) : 0;

  /** הרף להתמחרות הוא הסל הזול מבין הסלים שקיבלתם באישור העקרוני */
  const benchmark = bestBasket(preApproval);
  const benchmarkName = benchmark ? uniformBasket(benchmark.basketId)?.shortName ?? null : null;
  const plannedMonthly = benchmark?.monthlyPayment ?? data.MIX.monthlyPayment;

  return (
    <div className="space-y-5">
      {benchmark && (
        <Panel
          title="הרף שקיבלתם באישור העקרוני"
          description="כל בנק מתמחר על אותם שלושה סלים אחידים, ולכן זו ההשוואה היחידה שהיא באמת השוואה. כל הצעה חדשה נמדדת מול הסל הזול שכבר יש לכם."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="הבנק המאשר" value={preApproval.bank ?? '—'} />
            <Metric label="הסל הזול" value={benchmarkName ?? '—'} />
            <Metric label="החזר חודשי" value={formatShekel(benchmark.monthlyPayment)} />
            <Metric label="סך התשלומים" value={formatShekel(benchmark.totalPaid)} />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            {preApproval.baskets.filter((basket) => basket.monthlyPayment !== null).length} מתוך{' '}
            {UNIFORM_BASKETS.length} סלים מלאים. בקשו מכל בנק לתמחר את שלושתם.
          </p>
        </Panel>
      )}

      <Panel
        title="ההצעות שקיבלתם"
        description="הזינו כל הצעה מכל בנק, כולל סבבים חוזרים. ההשוואה נעשית לפי סך התשלומים — המספר היחיד שאומר כמה המשכנתא באמת עולה."
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Metric label="הצעות שהוזנו" value={String(value.offers.length)} />
          <Metric
            label="פער בין ההצעה הזולה ליקרה"
            value={spread > 0 ? formatShekel(spread) : '—'}
            note={spread > 0 ? 'זה מה שההתמחרות שווה לכם' : 'הזינו לפחות שתי הצעות'}
            tone={spread > 0 ? 'good' : 'default'}
          />
          <Metric
            label="ההצעה הזוכה"
            value={winner ? winner.bank : 'טרם נבחרה'}
            note={winner ? `החזר ${formatShekel(winner.monthlyPayment)}` : undefined}
            tone={winner ? 'good' : 'warn'}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">הוספת הצעה מ:</span>
          {suggestions.map((bank) => (
            <button
              key={bank}
              type="button"
              onClick={() => addOffer(bank)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:text-amber-700 hover:shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              {bank}
            </button>
          ))}
        </div>

        {value.offers.length === 0 ? (
          <EmptyHint>
            עדיין אין הצעות. כשבנק חוזר עם ריביות — הוסיפו אותו כאן. עם שלוש הצעות ומעלה
            ההתמחרות מתחילה לעבוד לטובתכם.
          </EmptyHint>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {value.offers.map((offer) => {
                const isWinner = offer.id === value.winnerOfferId;
                const isCheapest = cheapest?.id === offer.id;

                return (
                  <motion.div
                    key={offer.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`rounded-2xl border-2 p-4 shadow-sm transition-colors ${
                      isWinner ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <Gavel className="h-4 w-4 text-amber-600" />
                        {offer.bank}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                        סבב {offer.round}
                      </span>
                      {isCheapest && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
                          <TrendingDown className="h-3 w-3" />
                          העלות הנמוכה ביותר
                        </span>
                      )}

                      <div className="mr-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              ...value,
                              winnerOfferId: isWinner ? null : offer.id,
                            })
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition-all ${
                            isWinner
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
                          }`}
                        >
                          <Crown className="h-3.5 w-3.5" />
                          {isWinner ? 'ההצעה הזוכה' : 'בחרו כזוכה'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeOffer(offer.id)}
                          aria-label="מחיקת ההצעה"
                          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold text-slate-500">
                          החזר חודשי
                        </span>
                        <NumericInput
                          integer
                          className={cellInput}
                          value={offer.monthlyPayment}
                          onChange={(monthlyPayment) => updateOffer(offer.id, { monthlyPayment })}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold text-slate-500">
                          ריבית ממוצעת משוקללת
                        </span>
                        <NumericInput
                          className={cellInput}
                          value={offer.averageRate}
                          onChange={(averageRate) => updateOffer(offer.id, { averageRate })}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold text-slate-500">
                          סך התשלומים לאורך התקופה
                        </span>
                        <NumericInput
                          integer
                          className={cellInput}
                          value={offer.totalPaid}
                          onChange={(totalPaid) => updateOffer(offer.id, { totalPaid })}
                        />
                      </label>
                    </div>

                    <input
                      value={offer.note}
                      onChange={(event) => updateOffer(offer.id, { note: event.target.value })}
                      placeholder="מה ביקשתם לשפר? איזה מסלול היה היקר בהצעה?"
                      className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                    {plannedMonthly !== null && offer.monthlyPayment !== null && (
                      <p className="mt-2 text-[11px] text-slate-500">
                        {benchmark
                          ? `מול ${benchmarkName} של האישור העקרוני`
                          : 'מול התמהיל שתכננתם'}{' '}
                        ({formatShekel(plannedMonthly)}):{' '}
                        <span
                          className={
                            offer.monthlyPayment <= plannedMonthly
                              ? 'font-bold text-emerald-600'
                              : 'font-bold text-rose-600'
                          }
                        >
                          {offer.monthlyPayment <= plannedMonthly ? 'זול יותר ב' : 'יקר יותר ב'}
                          {formatShekel(Math.abs(offer.monthlyPayment - plannedMonthly))} בחודש
                        </span>
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Panel>

      {winner && (
        <Panel
          title="ההצעה שתעבור לחתימה"
          description="התנאים האלה הם מה שתאמתו מול מסמכי הבנק בשלב הבא."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="הבנק" value={winner.bank} tone="good" />
            <Metric label="החזר חודשי" value={formatShekel(winner.monthlyPayment)} />
            <Metric label="ריבית ממוצעת" value={formatPercent(winner.averageRate, 2)} />
            <Metric label="סך התשלומים" value={formatShekel(winner.totalPaid)} />
          </div>
          {spread > 0 && cheapest && winner.id !== cheapest.id && (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              שימו לב: ההצעה של {cheapest.bank} זולה יותר ב-
              {formatShekel((winner.totalPaid ?? 0) - (cheapest.totalPaid ?? 0))} בסך התשלומים.
              אם בחרתם אחרת — כדאי שתהיה לכך סיבה שאתם יכולים לנמק.
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
