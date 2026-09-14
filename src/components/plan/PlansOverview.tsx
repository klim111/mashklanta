'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Compass,
  Eye,
  Layers,
  Loader2,
  MapPin,
  Trash2,
} from 'lucide-react';
import { planCreatedLabel, planHeadline } from '@/lib/client-agenda';
import { PLAN_STAGES, planStageNumber } from '@/lib/mortgage-plan';
import type { PlanStageId } from '@/lib/mortgage-plan';
import { journeyStageFor, PLAN_JOURNEY_STAGES } from '@/data/platform/planStages';
import type { usePlans } from './usePlan';
import type { PlanView } from './usePlan';
import { formatDate, formatPercent, formatShekel, NumberField } from './ui';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { bankTone } from './stages/auction/pricedMixes';
import { DeletePlanDialog } from '@/components/dashboard/client/DeletePlanDialog';
import { PlanPeekDialog } from '@/components/dashboard/client/PlanPeekDialog';
import type { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';

function mixBelongsToPlan(mix: SavedMix, plan: PlanView): boolean {
  if (mix.planId && mix.planId === plan.id) return true;
  const mixAddr = (mix.mix.propertyAddress ?? '').trim().toLowerCase();
  const planAddr = (plan.propertyAddress ?? '').trim().toLowerCase();
  if (mixAddr && planAddr && mixAddr === planAddr) return true;
  return false;
}

/** תמהיל שנשמר בלי שיוך לנכס — מוצג בסוף הרשימה עד שמשייכים אותו */
export function isUnassociatedMix(mix: SavedMix): boolean {
  return !mix.planId && !(mix.mix.propertyAddress ?? '').trim();
}

/**
 * אזור המשכנתאות באזור האישי — הרשימה המלאה.
 *
 * כאן אין את שאלת "איפה אתם בתהליך": היא יושבת בתפריט הצד וזמינה מכל אזור,
 * וכאן המקום לרשימה עצמה. התהליכים והתמהילים מגיעים מהדאשבורד שמעליו ולא
 * נטענים כאן, כדי שהמספרים בסקירה ובפירוט יהיו אותם מספרים.
 */
export function PlansOverview({
  plansState,
  mixesState,
  advisorStages = {},
  onShowMix,
}: {
  plansState: ReturnType<typeof usePlans>;
  mixesState: ReturnType<typeof useSavedMixes>;
  /** השלבים שיועץ מטפל בהם, לכל תהליך */
  advisorStages?: Record<string, PlanStageId[]>;
  /** הצגת התמהיל של התהליך בשורת הפירוט שבסקירה */
  onShowMix?: (planId: string) => void;
}) {
  const { plans, ready, error, remove, patchDeal } = plansState;
  const { saved, ready: mixesReady, remove: removeMix } = mixesState;

  const active = plans.filter((plan) => plan.status === 'IN_PROGRESS');
  const completed = plans.filter((plan) => plan.status === 'COMPLETED');
  const unassigned = useMemo(() => saved.filter(isUnassociatedMix), [saved]);

  if (!ready || !mixesReady) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
      </div>
    );
  }

  const cardFor = (plan: PlanView, isCompleted: boolean) => (
    <MortgageCard
      key={plan.id}
      plan={plan}
      mixes={saved.filter((mix) => mixBelongsToPlan(mix, plan))}
      advisorStages={advisorStages[plan.id] ?? []}
      completed={isCompleted}
      onRemove={() => remove(plan.id)}
      onDeal={isCompleted ? undefined : (deal) => void patchDeal(plan.id, deal)}
      onShowMix={onShowMix ? () => onShowMix(plan.id) : undefined}
    />
  );

  return (
    <div dir="rtl" className="space-y-5">
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-[15px] font-bold text-rose-800">
          {error}
        </p>
      )}

      <Section
        icon={<Compass className="h-5 w-5 text-blue-600" />}
        title="משכנתאות בתהליך"
        count={active.length}
        empty="אין כרגע משכנתא פתוחה. פתחו תהליך חדש מ׳איפה אתם בתהליך׳ בתפריט הצד."
      >
        <AnimatePresence initial={false}>{active.map((plan) => cardFor(plan, false))}</AnimatePresence>
      </Section>

      <Section
        icon={<BadgeCheck className="h-5 w-5 text-emerald-600" />}
        title="משכנתאות שלקחתי"
        count={completed.length}
        empty="כאן יופיעו משכנתאות שחמשת השלבים בהן הסתיימו."
      >
        <AnimatePresence initial={false}>{completed.map((plan) => cardFor(plan, true))}</AnimatePresence>
      </Section>

      <Section
        icon={<Layers className="h-5 w-5 text-violet-600" />}
        title="תמהילים ללא שיוך לנכס"
        count={unassigned.length}
        empty="אין תמהילים כלליים. אפשר ליצור אותם בכלי תכנון המשכנתאות."
      >
        <UnassignedMixes mixes={unassigned} onDelete={removeMix} />
      </Section>
    </div>
  );
}

/** אזור ברשימה: כותרת ממורכזת, מונה, ותוכן — או הודעה כשהוא ריק */
function Section({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-4 flex items-center justify-center gap-2 text-center text-xl font-black text-slate-900">
        {icon}
        {title}
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-slate-600">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="py-4 text-center text-[15px] text-slate-500">{empty}</p>
      ) : (
        <div className="grid gap-4">{children}</div>
      )}
    </section>
  );
}

/**
 * שורת משכנתא אחת.
 *
 * הכותרת היא הכתובת וגובה המשכנתא — לא "תכנון משכנתא" — ולצדה מועד הפתיחה
 * המדויק, כדי להבדיל בין שני תהליכים שנפתחו על אותו נכס. מתחת: מסלול חמשת
 * השלבים, הנתונים, והפעולות — כולן ממורכזות ובאותו גודל.
 */
function MortgageCard({
  plan,
  mixes,
  advisorStages,
  onRemove,
  onDeal,
  onShowMix,
  completed,
}: {
  plan: PlanView;
  mixes: SavedMix[];
  advisorStages: PlanStageId[];
  onRemove: () => Promise<string | null>;
  onDeal?: (deal: {
    propertyAddress?: string;
    propertyValue?: number | null;
    mortgageAmount?: number | null;
  }) => void;
  onShowMix?: () => void;
  completed?: boolean;
}) {
  const journey = journeyStageFor(plan.currentStage);
  const step = planStageNumber(plan.currentStage);
  const signedMix = plan.data.AUCTION.signedMix;
  const signedTone = bankTone(signedMix?.bank);
  const missingDeal = !plan.propertyAddress || !plan.propertyValue || !plan.mortgageAmount;

  const [peekOpen, setPeekOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showMixes, setShowMixes] = useState(false);
  const [address, setAddress] = useState(plan.propertyAddress ?? '');
  const [propertyValue, setPropertyValue] = useState<number | null>(plan.propertyValue);
  const [mortgageAmount, setMortgageAmount] = useState<number | null>(plan.mortgageAmount);

  const byStage = new Map(plan.stages.map((row) => [row.stage, row.status]));
  const saveDeal = () =>
    onDeal?.({ propertyAddress: address, propertyValue, mortgageAmount });

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`overflow-hidden rounded-3xl border-2 shadow-sm ${
        completed ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`h-1.5 w-full bg-gradient-to-l ${completed ? 'from-emerald-500 to-teal-500' : journey.gradient}`}
      />

      <div className="p-5">
        {/* כותרת: כתובת, סכום ומועד פתיחה */}
        <header className="text-center">
          <h3 className="flex flex-wrap items-center justify-center gap-2 text-xl font-black text-slate-900">
            <MapPin className="h-5 w-5 shrink-0 text-slate-400" />
            {planHeadline(plan)}
          </h3>
          <p className="mt-1 text-[15px] text-slate-500">{planCreatedLabel(plan.createdAt)}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {completed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1 text-sm font-black text-white">
                <BadgeCheck className="h-4 w-4" />
                לקחתי את המשכנתא
              </span>
            ) : (
              <span
                className={`rounded-full bg-gradient-to-l ${journey.gradient} px-3.5 py-1 text-sm font-black text-white`}
              >
                שלב {step} · {journey.shortTitle}
              </span>
            )}
            {advisorStages.includes(plan.currentStage) && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-700">
                היועץ מטפל בשלב
              </span>
            )}
            {plan.completedAt && (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">
                <CalendarCheck className="h-4 w-4" />
                הושלם ב-{formatDate(plan.completedAt)}
              </span>
            )}
          </div>
        </header>

        {/* מסלול חמשת השלבים */}
        {!completed && (
          <ol className="mt-5 grid grid-cols-5 gap-1">
            {PLAN_JOURNEY_STAGES.map((stage, index) => {
              const status = byStage.get(PLAN_STAGES[index]) ?? 'PENDING';
              const current = index + 1 === step;
              return (
                <li key={stage.id} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-black ${
                      status === 'COMPLETED'
                        ? 'bg-emerald-500 text-white'
                        : current
                          ? `bg-gradient-to-br ${stage.gradient} text-white ring-4 ring-white`
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {status === 'COMPLETED' ? <BadgeCheck className="h-4 w-4" /> : index + 1}
                  </span>
                  <span
                    className={`text-[13px] font-bold leading-tight ${current ? 'text-slate-900' : 'text-slate-500'}`}
                  >
                    {stage.shortTitle}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {/* פרטי הנכס — טופס קצר כשחסרים, ואחרת מספרים */}
        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3">
          {onDeal && missingDeal ? (
            <>
              <div className="sm:col-span-3">
                <span className="mb-1.5 flex items-center justify-center gap-1.5 text-sm font-black text-slate-600">
                  <MapPin className="h-4 w-4" />
                  השלימו את פרטי הנכס
                </span>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onBlur={saveDeal}
                  placeholder="כתובת הנכס"
                />
              </div>
              <NumberField label="עלות הנכס" value={propertyValue} onChange={setPropertyValue} suffix="₪" />
              <NumberField label="גובה המשכנתא" value={mortgageAmount} onChange={setMortgageAmount} suffix="₪" />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={saveDeal}
                  className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-black text-white hover:bg-slate-700"
                >
                  שמירת פרטי הנכס
                </button>
              </div>
            </>
          ) : (
            <>
              <Stat label="עלות הנכס" value={formatShekel(plan.propertyValue)} />
              <Stat label="גובה המשכנתא" value={formatShekel(plan.mortgageAmount)} />
              <Stat label="החזר חודשי" value={formatShekel(plan.monthlyPayment)} />
            </>
          )}
        </div>

        {/* המשכנתא שנבחרה בפועל */}
        {signedMix && (
          <Link
            href={`/dashboard/plans/${plan.id}?stage=SIGNING`}
            className={`mt-4 block rounded-2xl border-2 p-4 transition-all hover:shadow-md ${signedTone.border} ${signedTone.surface}`}
          >
            <div className="flex flex-wrap items-center justify-center gap-2 text-center">
              <span className="inline-flex items-center gap-1.5 text-[15px] font-black text-slate-900">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                המשכנתא שלי
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-black text-white"
                style={{ backgroundColor: signedTone.dot }}
              >
                <Building2 className="h-3.5 w-3.5" />
                בנק {signedMix.bank}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <Stat label="החזר חודשי" value={formatShekel(signedMix.monthlyPayment)} />
              <Stat label="ריבית ממוצעת" value={formatPercent(signedMix.averageRate, 2)} />
              <Stat label="סך ריבית" value={formatShekel(signedMix.totalInterest)} />
              <Stat label="סך תשלום" value={formatShekel(signedMix.totalPaid)} />
            </div>
          </Link>
        )}

        {/* פעולות — ממורכזות, באותו גודל */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={`/dashboard/plans/${plan.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[15px] font-black text-white transition-colors hover:bg-slate-700"
          >
            {completed ? 'לצפייה בתהליך' : 'המשיכו מהמקום שעצרתם'}
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setPeekOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-[15px] font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          >
            <Eye className="h-4 w-4" />
            להציץ בפרטים
          </button>
          <button
            type="button"
            onClick={() => setShowMixes((open) => !open)}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-[15px] font-black text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          >
            <Layers className="h-4 w-4" />
            {showMixes ? 'הסתרת התמהילים' : 'תמהילים שמורים'}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[13px]">{mixes.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            title="מחיקת התהליך"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-[15px] font-black text-slate-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
            מחיקה
          </button>
        </div>

        {showMixes && <MixList mixes={mixes} empty="עדיין אין תמהילים שמורים לנכס הזה." planId={plan.id} />}
      </div>

      <PlanPeekDialog
        plan={plan}
        mixes={mixes}
        advisorStages={advisorStages}
        open={peekOpen}
        onOpenChange={setPeekOpen}
        onShowMix={() => onShowMix?.()}
      />
      <DeletePlanDialog plan={plan} open={deleteOpen} onOpenChange={setDeleteOpen} onDelete={onRemove} />
    </motion.article>
  );
}

function UnassignedMixes({
  mixes,
  onDelete,
}: {
  mixes: SavedMix[];
  onDelete: (mixId: string) => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const attach = async (mix: SavedMix, deal: { address: string; value: number | null; amount: number | null }) => {
    if (!mix.recordId) return;
    setBusyId(mix.recordId);
    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMixId: mix.recordId,
          propertyAddress: deal.address,
          propertyValue: deal.value,
          mortgageAmount: deal.amount,
        }),
      });
      if (!response.ok) throw new Error('failed');
      const plan = await response.json();
      router.push(`/dashboard/plans/${plan.id}`);
    } finally {
      setBusyId(null);
    }
  };

  if (mixes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          אין תמהילים כלליים. אפשר ליצור אותם ב{' '}
          <Link href="/dashboard/mix-planner" className="font-black text-blue-600">
            כלי תכנון המשכנתאות
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {mixes.map((mix) => (
        <UnassignedMixCard
          key={mix.mix.id}
          mix={mix}
          busy={busyId === mix.recordId}
          onAttach={(deal) => void attach(mix, deal)}
          onDelete={() => onDelete(mix.mix.id)}
        />
      ))}
    </div>
  );
}

function UnassignedMixCard({
  mix,
  busy,
  onAttach,
  onDelete,
}: {
  mix: SavedMix;
  busy: boolean;
  onAttach: (deal: { address: string; value: number | null; amount: number | null }) => void;
  onDelete: () => void;
}) {
  const [address, setAddress] = useState('');
  const [value, setValue] = useState<number | null>(mix.mix.propertyValue ?? null);
  const [amount, setAmount] = useState<number | null>(mix.mix.totalAmount || null);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">{mix.mix.name || 'תמהיל ללא שם'}</h3>
          <p className="mt-1 text-xs text-slate-500">תמהיל כללי · ממתין לשיוך לנכס</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/mix-planner?mix=${encodeURIComponent(mix.mix.id)}`}
            className="text-xs font-black text-blue-600"
          >
            פתיחה בכלי התכנון
          </Link>
          {/* תמהיל כללי אינו קשור לשום תהליך, ולכן אפשר למחוק אותו מכאן */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('למחוק את התמהיל הזה? הוא אינו משויך לנכס, והמחיקה סופית.')) {
                onDelete();
              }
            }}
            aria-label="מחיקת התמהיל"
            title="מחיקת התמהיל"
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="סכום" value={formatShekel(mix.mix.totalAmount)} />
        <Stat label="החזר" value={formatShekel(mix.summary.monthlyPayment)} />
        <Stat label="ריבית ממוצעת" value={`${mix.summary.averageRate.toFixed(2)}%`} />
      </div>
      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <AddressAutocomplete value={address} onChange={setAddress} placeholder="כתובת הנכס לשיוך" />
        </div>
        <NumberField label="עלות הנכס" value={value} onChange={setValue} suffix="₪" />
        <NumberField label="גובה המשכנתא" value={amount} onChange={setAmount} suffix="₪" />
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy || !address.trim()}
            onClick={() => onAttach({ address, value, amount })}
            className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white disabled:opacity-50"
          >
            {busy ? 'משייך…' : 'שייכו לנכס והפכו למשכנתא בתהליך'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MixList({ mixes, empty, planId }: { mixes: SavedMix[]; empty: string; planId: string }) {
  if (mixes.length === 0) {
    return <p className="mt-4 text-center text-[15px] text-slate-500">{empty}</p>;
  }
  return (
    <div className="mt-4 space-y-2">
      {mixes.map((mix) => (
        <MixRow key={mix.mix.id} mix={mix} planId={planId} />
      ))}
    </div>
  );
}

function MixRow({ mix, planId }: { mix: SavedMix; planId: string }) {
  return (
    <Link
      href={`/dashboard/plans/${planId}?stage=MIX&mix=${encodeURIComponent(mix.mix.id)}`}
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors hover:border-blue-300 ${
        mix.isFinal ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-black text-slate-900">
          {mix.mix.name || 'תמהיל ללא שם'}
          {mix.isFinal ? ' · סופי' : ''}
        </p>
        <p className="text-[13px] text-slate-500">
          החזר {formatShekel(mix.summary.monthlyPayment)} · ריבית {mix.summary.averageRate.toFixed(2)}%
        </p>
      </div>
      <span className="shrink-0 text-sm font-black text-blue-600">
        פתיחה בשלב {planStageNumber('MIX')}
      </span>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[13px] font-bold text-slate-500">{label}</div>
      <div className="text-lg font-black tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
