'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Check, PenLine, ShieldCheck } from 'lucide-react';
import { NEW_PLAN_FLOW, SIGNING_CHECKS, winningOffer } from '@/lib/mortgage-plan';
import type { BankOffer, PlanData, PlanFlow, SigningData, SigningScreen } from '@/lib/mortgage-plan';
import { planStageMeta } from '@/data/platform/planStages';
import {
  DateField,
  Metric,
  NumberField,
  Panel,
  SelectField,
  formatPercent,
  formatShekel,
} from '../ui';
import { StageIntro } from '../StageIntro';
import { ScenarioPicker, resolveSelection } from './signing/ScenarioPicker';
import type { ScenarioSelection } from './signing/ScenarioPicker';
import { DocumentsChecklist } from './signing/DocumentsChecklist';
import { FinalTermsPanel } from './signing/FinalTermsPanel';

/** פער שאינו נובע מעיגול — סימן שמשהו בחוזה שונה ממה שסוכם */
const MONTHLY_TOLERANCE = 5;
const RATE_TOLERANCE = 0.01;

const reveal = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 },
};

/**
 * שלב 5 — ההכנה לחתימה על תיק המשכנתא והחתימה עצמה.
 *
 * בכניסה לשלב מוצג עמוד ההסבר — מסך אחד, כמו לפני כל שלב — ומיד "התחילו את
 * השלב". אחריו הלקוח בוחר את תרחיש הרכישה שלו — וממנו נגזרת רשימת המסמכים
 * שהבנק ידרוש. לצידה מוצג התמהיל המתומחר מהמכרז, שמולו מאמתים את הצעת המשכנתא
 * הסופית של הבנק.
 */
export function SigningStage({
  data,
  planId,
  onChange,
  flow = NEW_PLAN_FLOW,
}: {
  data: PlanData;
  planId: string;
  onChange: (next: SigningData) => void;
  /** סוג התהליך — לכותרות של עמוד ההסבר ולהפניה לשלב המכרז */
  flow?: PlanFlow;
}) {
  const value = data.SIGNING;
  const signed = data.AUCTION.signedMix;
  /*
    התנאים שאותם מאמתים מול החוזה הם של התמהיל המתומחר שנבחר לחתימה. כשעדיין
    לא נבחר אחד — למשל בתהליך ישן שבו ההצעות הוזנו ידנית — נשארת ההצעה הזוכה
    מהרשימה הידנית.
  */
  const winner: BankOffer | null = signed
    ? {
        id: signed.mixKey,
        bank: signed.bank,
        round: 1,
        monthlyPayment: signed.monthlyPayment,
        averageRate: signed.averageRate,
        totalPaid: signed.totalPaid,
        note: signed.name,
      }
    : winningOffer(data.AUCTION);
  const { deal, registry, scenario } = resolveSelection(value);

  const preApprovalBank = data.APPLICATIONS.bank;
  const bankOptions = Array.from(
    new Set([
      ...(signed ? [signed.bank] : []),
      ...data.AUCTION.offers.map((offer) => offer.bank),
      ...(preApprovalBank ? [preApprovalBank] : []),
    ])
  ).map((bank) => ({ value: bank, label: bank }));

  const set = <K extends keyof SigningData>(key: K, next: SigningData[K]) =>
    onChange({ ...value, [key]: next });

  const go = (screen: SigningScreen) => set('screen', screen);

  const selectScenario = (next: ScenarioSelection) =>
    onChange({ ...value, ...next });

  const toggleDocument = (key: string) => {
    const documents = { ...value.documents };
    if (documents[key]) delete documents[key];
    else documents[key] = true;
    onChange({ ...value, documents });
  };

  const toggleCheck = (key: string) => {
    const checklist = { ...value.checklist };
    if (checklist[key]) delete checklist[key];
    else checklist[key] = true;
    onChange({ ...value, checklist });
  };

  /** אימוץ התנאים שזכו במכרז, כדי שהאימות ייעשה מול מספרים ולא מהזיכרון */
  const pullFromWinner = () => {
    if (!winner) return;
    onChange({
      ...value,
      bank: winner.bank,
      finalMonthlyPayment: winner.monthlyPayment,
      finalAverageRate: winner.averageRate,
      finalAmount: value.finalAmount ?? data.MIX.totalAmount,
    });
  };

  const pullFromFinalMix = () => {
    const mix = data.MIX;
    if (!mix.isFinal) return;
    onChange({
      ...value,
      finalMonthlyPayment: mix.monthlyPayment,
      finalAverageRate: mix.averageRate,
      finalAmount: mix.totalAmount,
    });
  };

  const monthlyGap =
    winner?.monthlyPayment != null && value.finalMonthlyPayment != null
      ? value.finalMonthlyPayment - winner.monthlyPayment
      : null;
  const rateGap =
    winner?.averageRate != null && value.finalAverageRate != null
      ? value.finalAverageRate - winner.averageRate
      : null;

  const drifted =
    (monthlyGap !== null && Math.abs(monthlyGap) > MONTHLY_TOLERANCE) ||
    (rateGap !== null && Math.abs(rateGap) > RATE_TOLERANCE);

  const done = SIGNING_CHECKS.filter((check) => value.checklist[check.key]).length;

  const screen = value.screen || 'overview';

  return (
    <div className="space-y-5">
      <ScreenRail current={screen} dealLabel={scenario ? deal?.short ?? null : null} onSelect={go} />

      <AnimatePresence mode="wait" initial={false}>
        {screen === 'overview' ? (
          <motion.div key="overview" {...reveal}>
            <StageIntro stage="SIGNING" flow={flow} onStart={() => go('documents')} />
          </motion.div>
        ) : screen === 'documents' ? (
          <motion.div key="documents" {...reveal} className="space-y-5">
            <ScenarioPicker
              value={{
                dealTypeId: value.dealTypeId,
                registryId: value.registryId,
                scenarioId: value.scenarioId,
              }}
              onChange={selectScenario}
            />

            {deal && scenario && (
              <>
                <DocumentsChecklist
                  deal={deal}
                  registry={registry}
                  scenario={scenario}
                  collected={value.documents}
                  onToggle={toggleDocument}
                />
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => go('verify')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-button font-black text-white transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    להשוואת ההצעה הסופית
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key="verify" {...reveal} className="space-y-5">
            <FinalTermsPanel data={data} planId={planId} />

            <Panel
        title="התנאים שנחתמו בפועל"
        description="העתיקו מהאישור הסופי של הבנק את מה שכתוב בו — לא את מה שסוכם בטלפון. כאן מתגלים הפערים."
        action={
          <div className="flex flex-wrap gap-2">
            {data.MIX.isFinal && (
              <button
                type="button"
                onClick={pullFromFinalMix}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 transition-colors hover:bg-slate-50"
              >
                טענו את התמהיל הסופי
              </button>
            )}
            {winner && (
              <button
                type="button"
                onClick={pullFromWinner}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-blue-700"
              >
                {signed ? 'טענו את התמהיל שנבחר לחתימה' : 'טענו את תנאי ההצעה הזוכה'}
              </button>
            )}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="הבנק שאיתו נחתם"
            value={value.bank}
            options={
              bankOptions.length > 0 ? bankOptions : [{ value: 'אחר', label: 'בנק אחר' }]
            }
            onChange={(next) => set('bank', next)}
          />
          <DateField
            label="תאריך החתימה"
            value={value.signingDate}
            onChange={(next) => set('signingDate', next)}
          />
          <NumberField
            label="סכום המשכנתא בחוזה"
            value={value.finalAmount}
            onChange={(next) => set('finalAmount', next)}
            suffix="₪"
          />
          <NumberField
            label="החזר חודשי ראשון"
            value={value.finalMonthlyPayment}
            onChange={(next) => set('finalMonthlyPayment', next)}
            suffix="₪"
          />
          <NumberField
            label="ריבית ממוצעת משוקללת"
            value={value.finalAverageRate}
            onChange={(next) => set('finalAverageRate', next)}
            suffix="%"
            integer={false}
          />
        </div>

        {/* בלי הצעה שנבחרה במכרז אין מול מה לאמת — השדות נשארים ריקים עם הפניה */}
        {!winner && (
          <p className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-info leading-relaxed text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <span className="font-black">
                השלימו מילוי פרטים בשלב «{planStageMeta('AUCTION', flow).shortTitle}».
              </span>{' '}
              כשתבחרו שם את ההצעה שהולכים איתה לחתימה, היא תופיע כאן להשוואה מול החוזה.
            </span>
          </p>
        )}

        {winner && (
          <div className="mt-5">
            <div className="mb-3 text-xs font-black text-slate-600">
              {signed ? `מול ההצעה של בנק ${signed.bank} שנבחרה לחתימה` : 'מול מה שסוכם במכרז'}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                label={signed ? 'החזר חודשי בהצעה שנבחרה' : 'החזר חודשי במכרז'}
                value={formatShekel(winner.monthlyPayment)}
                note={
                  monthlyGap === null
                    ? undefined
                    : Math.abs(monthlyGap) <= MONTHLY_TOLERANCE
                      ? 'תואם למה שנחתם'
                      : `פער של ${formatShekel(Math.abs(monthlyGap))} ${monthlyGap > 0 ? 'לרעתכם' : 'לטובתכם'}`
                }
                tone={
                  monthlyGap === null
                    ? 'default'
                    : Math.abs(monthlyGap) <= MONTHLY_TOLERANCE
                      ? 'good'
                      : monthlyGap > 0
                        ? 'bad'
                        : 'warn'
                }
              />
              <Metric
                label="ריבית במכרז"
                value={formatPercent(winner.averageRate, 2)}
                note={
                  rateGap === null
                    ? undefined
                    : Math.abs(rateGap) <= RATE_TOLERANCE
                      ? 'תואמת למה שנחתם'
                      : `פער של ${Math.abs(rateGap).toFixed(2)} נקודות אחוז`
                }
                tone={
                  rateGap === null
                    ? 'default'
                    : Math.abs(rateGap) <= RATE_TOLERANCE
                      ? 'good'
                      : 'bad'
                }
              />
              <Metric
                label="התמהיל שתכננתם"
                value={formatShekel(data.MIX.monthlyPayment)}
                note={data.MIX.mixName ?? undefined}
              />
            </div>

            {drifted && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  התנאים בחוזה שונים ממה שסוכם במכרז. עצרו לפני החתימה, בקשו הסבר בכתב וודאו
                  שהמסמך מתוקן — אחרי החתימה אין דרך חזרה.
                </span>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="צ׳ק־ליסט לפני החתימה"
        description="עברו על כל סעיף מול המסמך עצמו. סגירת השלב דורשת שכל הבדיקות יאומתו."
        action={
          <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white">
            {done} / {SIGNING_CHECKS.length}
          </span>
        }
      >
        <div className="space-y-2">
          {SIGNING_CHECKS.map((check, index) => {
            const checked = Boolean(value.checklist[check.key]);
            return (
              <motion.button
                key={check.key}
                type="button"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => toggleCheck(check.key)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-right transition-all ${
                  checked
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </span>
                <span
                  className={`flex-1 text-sm font-semibold ${
                    checked ? 'text-emerald-900' : 'text-slate-800'
                  }`}
                >
                  {check.label}
                </span>
                {checked ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <PenLine className="h-4 w-4 shrink-0 text-slate-300" />
                )}
              </motion.button>
            );
          })}
        </div>
      </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ניווט בין תת-המסכים של השלב, כמו בפרופיל הפיננסי */
function ScreenRail({
  current,
  dealLabel,
  onSelect,
}: {
  current: SigningScreen;
  /** סוג העסקה שנבחר, כשכבר נבחר תרחיש */
  dealLabel: string | null;
  onSelect: (screen: SigningScreen) => void;
}) {
  const items: Array<{ id: SigningScreen; label: string }> = [
    { id: 'overview', label: 'על השלב' },
    { id: 'documents', label: dealLabel ? `המסמכים · ${dealLabel}` : 'מסמכי התיק' },
    { id: 'verify', label: 'אימות ההצעה והחתימה' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => {
        const active = item.id === current;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              active
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-2xs ${
                active ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {index + 1}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
