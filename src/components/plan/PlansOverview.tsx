'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Compass,
  FileText,
  Layers,
  Loader2,
  MapPin,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { stageIndex } from '@/lib/mortgage-plan';
import { journeyStageFor } from '@/data/platform/planStages';
import { isMortgageGoal, isServiceType } from '@/lib/service-flow';
import type { MortgageGoal, ServiceType } from '@/lib/service-flow';
import { usePlans } from './usePlan';
import type { PlanView } from './usePlan';
import { formatDate, formatShekel, NumberField } from './ui';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useSavedMixes } from '@/components/mortgage-advisor/savedMixes';
import type { SavedMix } from '@/components/mortgage-advisor/savedMixes';
import { ServiceChooser } from '@/components/service-flow/ServiceChooser';
import { GuidanceRequestDialog } from '@/components/service-flow/GuidanceRequestDialog';
import { usePlatformAccess } from '@/components/service-flow/usePlatformAccess';

type DashTab = 'mortgages' | 'unassigned';
type FlowGoal = 'NEW_MORTGAGE' | 'REFINANCE';

function planPlaceLabel(plan: PlanView): string {
  if (plan.propertyAddress) return plan.propertyAddress;
  if (plan.mortgageAmount) return `משכנתא ${formatShekel(plan.mortgageAmount)}`;
  return 'טרם הוזנו פרטי הנכס';
}

function mixBelongsToPlan(mix: SavedMix, plan: PlanView): boolean {
  if (mix.planId && mix.planId === plan.id) return true;
  const mixAddr = (mix.mix.propertyAddress ?? '').trim().toLowerCase();
  const planAddr = (plan.propertyAddress ?? '').trim().toLowerCase();
  if (mixAddr && planAddr && mixAddr === planAddr) return true;
  return false;
}

function isUnassociatedMix(mix: SavedMix): boolean {
  return !mix.planId && !(mix.mix.propertyAddress ?? '').trim();
}

/** `?goal=NEW_MORTGAGE&service=SELF` — המשך הבחירה שנעשתה בעמוד הבית או אחרי התשלום */
function readFlowQuery(): { goal: FlowGoal | null; service: ServiceType | null } {
  const params = new URLSearchParams(window.location.search);
  const goal = params.get('goal');
  const service = params.get('service');
  return {
    goal: goal === 'NEW_MORTGAGE' || goal === 'REFINANCE' ? goal : null,
    service: isServiceType(service) ? service : null,
  };
}

/**
 * דאשבורד המשכנתאות.
 *
 * כל עוד אין ללקוח משכנתא פעילה, המסך הוא "מה תרצו לעשות?" — הבחירה בין
 * משכנתא חדשה, מיחזור וייעוץ, ואחריה סוג השירות. מרגע שיש תהליך פתוח מוצגות
 * המשכנתאות עצמן, והבחירה זמינה מכפתור "משכנתא נוספת".
 */
export function PlansOverview() {
  const router = useRouter();
  const { data: session } = useSession();
  const { plans, ready, error, start, remove, patchDeal } = usePlans();
  const { saved, ready: mixesReady, remove: removeMix } = useSavedMixes();
  const { access, ready: accessReady } = usePlatformAccess();
  const [starting, setStarting] = useState(false);
  const [tab, setTab] = useState<DashTab>('mortgages');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [initialGoal, setInitialGoal] = useState<FlowGoal | null>(null);
  const [request, setRequest] = useState<{ goal: MortgageGoal; service: ServiceType } | null>(null);
  const queryHandled = useRef(false);

  const active = plans.filter((plan) => plan.status === 'IN_PROGRESS');
  const completed = plans.filter((plan) => plan.status === 'COMPLETED');
  const unassigned = useMemo(() => saved.filter(isUnassociatedMix), [saved]);

  const startPlan = async () => {
    setStarting(true);
    try {
      const plan = await start();
      router.push(`/dashboard/plans/${plan.id}`);
    } catch {
      // השגיאה מוצגת דרך usePlans
    } finally {
      setStarting(false);
    }
  };

  /** המסלול העצמאי: עם גישה — הכלי המלא; בלעדיה — הסיור שמסתיים בהצעה */
  const onSelf = (goal: FlowGoal) => {
    if (goal === 'REFINANCE') {
      router.push('/mortgage-refinance');
      return;
    }
    if (access.active) void startPlan();
    else router.push('/dashboard/tour');
  };

  const onAdvisor = (goal: MortgageGoal, service: ServiceType) => {
    if (isMortgageGoal(goal)) setRequest({ goal, service });
  };

  // המשך אוטומטי של בחירה שנעשתה לפני ההתחברות או לפני התשלום
  useEffect(() => {
    if (!ready || !accessReady || queryHandled.current) return;
    queryHandled.current = true;
    const { goal, service } = readFlowQuery();
    if (!goal) return;
    setChooserOpen(true);
    setInitialGoal(goal);
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    if (service === 'SELF') onSelf(goal);
    else if (service && service !== 'GUIDANCE') setRequest({ goal, service });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, accessReady]);

  const loading = !ready || !mixesReady || !accessReady;
  const showChooser = !loading && (active.length === 0 || chooserOpen);

  return (
    <div dir="rtl" className="space-y-6">
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : showChooser ? (
        <>
          <ChooserCard
            hasAccess={access.active}
            initialGoal={initialGoal}
            busy={starting}
            onSelf={onSelf}
            onAdvisor={onAdvisor}
            onClose={active.length > 0 ? () => setChooserOpen(false) : undefined}
          />

          {completed.length > 0 && (
            <CompletedSection plans={completed} saved={saved} />
          )}

          {unassigned.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle
                icon={<Layers className="h-4 w-4 text-blue-600" />}
                title="תמהילים שיצרתי ללא שיוך לנכס"
                count={unassigned.length}
              />
              <UnassignedMixes mixes={unassigned} onDelete={removeMix} />
            </section>
          )}
        </>
      ) : (
        <>
          <ActiveBar
            hasAccess={access.active}
            onAnother={() => {
              setInitialGoal(null);
              setChooserOpen(true);
            }}
            onRequest={() => setRequest({ goal: 'NEW_MORTGAGE', service: 'HYBRID' })}
          />

          {/* שלב האישור העקרוני — איסוף פרטי הבקשה, נשמר אוטומטית */}
          <Link
            href="/principal-approval"
            className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-l from-indigo-50/80 to-white p-5 transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[15px] font-bold text-slate-900">אישור עקרוני — פרטי הבקשה</p>
                <p className="text-[13px] text-slate-500">
                  פרטי הלווים והערבים, הכנסות, חשבונות בנק ומקורות מימון — עם דוח מסכם להורדה
                </p>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-indigo-600 transition-transform group-hover:-translate-x-1">
              להזנת הפרטים ←
            </span>
          </Link>

          <div className="flex flex-wrap gap-2">
            <TabChip
              active={tab === 'mortgages'}
              onClick={() => setTab('mortgages')}
              label="המשכנתאות שלי"
              count={plans.length}
            />
            <TabChip
              active={tab === 'unassigned'}
              onClick={() => setTab('unassigned')}
              label="תמהילים שיצרתי ללא שיוך לנכס"
              count={unassigned.length}
            />
          </div>

          {tab === 'unassigned' ? (
            <UnassignedMixes mixes={unassigned} onDelete={removeMix} />
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <SectionTitle
                  icon={<Compass className="h-4 w-4 text-blue-600" />}
                  title="משכנתאות בתהליך"
                  count={active.length}
                />
                <div className="grid gap-4">
                  <AnimatePresence initial={false}>
                    {active.map((plan) => (
                      <MortgageCard
                        key={plan.id}
                        plan={plan}
                        mixes={saved.filter((mix) => mixBelongsToPlan(mix, plan))}
                        onRemove={() => void remove(plan.id)}
                        onDeal={(deal) => void patchDeal(plan.id, deal)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>

              <CompletedSection plans={completed} saved={saved} />
            </>
          )}
        </>
      )}

      {request && (
        <GuidanceRequestDialog
          open
          onOpenChange={(open) => {
            if (!open) setRequest(null);
          }}
          goal={request.goal}
          serviceType={request.service}
          mode="member"
          memberName={session?.user?.name ?? undefined}
          memberEmail={session?.user?.email ?? undefined}
        />
      )}
    </div>
  );
}

/** "מה תרצו לעשות?" בתוך כרטיס כהה, כמו ראש הדאשבורד */
function ChooserCard({
  hasAccess,
  initialGoal,
  busy,
  onSelf,
  onAdvisor,
  onClose,
}: {
  hasAccess: boolean;
  initialGoal: FlowGoal | null;
  busy: boolean;
  onSelf: (goal: FlowGoal) => void;
  onAdvisor: (goal: MortgageGoal, service: ServiceType) => void;
  onClose?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-xl md:p-10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="חזרה למשכנתאות שלי"
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
          למשכנתאות שלי
        </button>
      )}

      <div className="relative">
        {hasAccess && (
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black text-emerald-200 ring-1 ring-emerald-300/40">
              <BadgeCheck className="h-3.5 w-3.5" />
              הגישה המלאה לפלטפורמה פעילה — כל חמשת השלבים פתוחים
            </span>
          </div>
        )}
        <ServiceChooser
          tone="dark"
          hasAccess={hasAccess}
          initialGoal={initialGoal}
          busy={busy}
          onSelf={onSelf}
          onAdvisor={onAdvisor}
        />
      </div>
    </motion.div>
  );
}

/** כשיש כבר משכנתא בתהליך — שורת פעולות במקום מסך הבחירה */
function ActiveBar({
  hasAccess,
  onAnother,
  onRequest,
}: {
  hasAccess: boolean;
  onAnother: () => void;
  onRequest: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 shadow-xl md:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-violet-600/25 blur-3xl" />
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            {hasAccess ? 'גישה מלאה · חמישה שלבים · הכל נשמר בחשבון' : 'חמישה שלבים · הכל נשמר בחשבון'}
          </span>
          <h2 className="mt-2 text-xl font-black text-white md:text-2xl">המשכנתאות שלי</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/60">
            בכל שלב אפשר לבחור מחדש — להמשיך לבד, לבקש ליווי לשלב אחד או ליווי מלא. מה ששולם על
            הפלטפורמה מקוזז, ותמיד תשלמו את המחיר הנמוך.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRequest}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-white/20"
          >
            <MessageSquareText className="h-4 w-4" />
            בקשת ליווי מיועץ
          </button>
          <button
            type="button"
            onClick={onAnother}
            className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-blue-500 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <Plus className="h-4 w-4" />
            משכנתא נוספת
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletedSection({ plans, saved }: { plans: PlanView[]; saved: SavedMix[] }) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm md:p-6">
      <SectionTitle
        icon={<BadgeCheck className="h-4 w-4 text-emerald-600" />}
        title="משכנתאות שלקחתי"
        count={plans.length}
      />
      {plans.length === 0 ? (
        <p className="text-sm text-emerald-800/70">כאן יופיעו משכנתאות שחמשת השלבים בהן הסתיימו.</p>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence initial={false}>
            {plans.map((plan) => (
              <MortgageCard
                key={plan.id}
                plan={plan}
                mixes={saved.filter((mix) => mixBelongsToPlan(mix, plan))}
                completed
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function TabChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${
        active ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'
      }`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </button>
  );
}

function SectionTitle({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-base font-black text-slate-900">
      {icon}
      {title}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
        {count}
      </span>
    </h2>
  );
}

function MortgageCard({
  plan,
  mixes,
  onRemove,
  onDeal,
  completed,
}: {
  plan: PlanView;
  mixes: SavedMix[];
  onRemove?: () => void;
  onDeal?: (deal: {
    propertyAddress?: string;
    propertyValue?: number | null;
    mortgageAmount?: number | null;
  }) => void;
  completed?: boolean;
}) {
  const journey = journeyStageFor(plan.currentStage);
  const step = stageIndex(plan.currentStage) + 1;
  const signing = plan.data.SIGNING;
  const missingDeal = !plan.propertyAddress || !plan.propertyValue || !plan.mortgageAmount;
  const [showMixes, setShowMixes] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const [address, setAddress] = useState(plan.propertyAddress ?? '');
  const [propertyValue, setPropertyValue] = useState<number | null>(plan.propertyValue);
  const [mortgageAmount, setMortgageAmount] = useState<number | null>(plan.mortgageAmount);
  const finalMix =
    mixes.find(
      (mix) => mix.isFinal || (mix.mix.id === plan.data.MIX.mixKey && plan.data.MIX.isFinal)
    ) ??
    (plan.data.MIX.isFinal
      ? mixes.find((mix) => mix.mix.id === plan.data.MIX.mixKey)
      : undefined);

  const saveDeal = () => {
    onDeal?.({
      propertyAddress: address,
      propertyValue,
      mortgageAmount,
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`relative overflow-hidden rounded-3xl border shadow-sm ${
        completed
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-l ${completed ? 'from-emerald-500 to-teal-500' : journey.gradient}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-slate-900">
              {plan.propertyAddress || plan.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">{planPlaceLabel(plan)}</p>
          </div>
          {completed ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black text-white">
              <BadgeCheck className="h-3.5 w-3.5" />
              לקחתי
            </span>
          ) : (
            <span
              className={`shrink-0 rounded-full bg-gradient-to-l ${journey.gradient} px-3 py-1 text-[11px] font-black text-white`}
            >
              שלב {step} · {journey.shortTitle}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              פרטי הנכס
            </span>
            {onDeal && missingDeal ? (
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onBlur={saveDeal}
                placeholder="כתובת הנכס"
              />
            ) : (
              <p className="text-sm font-black text-slate-900">{plan.propertyAddress || 'טרם הוזנה כתובת'}</p>
            )}
          </div>
          {onDeal && missingDeal ? (
            <>
              <NumberField
                label="עלות הנכס"
                value={propertyValue}
                onChange={setPropertyValue}
                suffix="₪"
              />
              <NumberField
                label="גובה המשכנתא"
                value={mortgageAmount}
                onChange={setMortgageAmount}
                suffix="₪"
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={saveDeal}
                  className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white"
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

        {!completed && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">התקדמות</span>
              <span className="text-slate-700">{plan.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-l ${journey.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${plan.progress}%` }}
                transition={{ type: 'spring', stiffness: 110, damping: 22 }}
              />
            </div>
          </div>
        )}

        {completed && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-emerald-800">
            {signing.bank && (
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Building2 className="h-3.5 w-3.5" />
                {signing.bank}
              </span>
            )}
            {plan.completedAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" />
                הושלם ב-{formatDate(plan.completedAt)}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/plans/${plan.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
          >
            {completed ? 'לצפייה בתהליך' : 'המשיכו מהמקום שעצרתם'}
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setShowMixes((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            <Layers className="h-3.5 w-3.5" />
            {showMixes ? 'הסתרת תמהילים שמורים' : 'הצג תמהילים שמורים לנכס זה'}
            <span className="rounded-full bg-slate-100 px-1.5 text-[10px]">{mixes.length}</span>
          </button>
          {finalMix && (
            <button
              type="button"
              onClick={() => setShowFinal((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800"
            >
              הצג את התמהיל הסופי שנבחר
            </button>
          )}
        </div>

        {showMixes && (
          <MixList
            mixes={mixes}
            empty="עדיין אין תמהילים שמורים לנכס הזה."
            planId={plan.id}
          />
        )}

        {showFinal && finalMix && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-black text-emerald-800">התמהיל הסופי שנבחר</p>
            <MixRow mix={finalMix} planId={plan.id} highlight />
          </div>
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('להסיר את התהליך מהאזור האישי? ההיסטוריה נשמרת, אבל הוא לא יוצג יותר ברשימה.')) {
              onRemove();
            }
          }}
          aria-label="הסרת התהליך"
          className="absolute bottom-4 left-4 rounded-lg p-2 text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </motion.div>
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
    return <p className="mt-4 text-sm text-slate-500">{empty}</p>;
  }
  return (
    <div className="mt-4 space-y-2">
      {mixes.map((mix) => (
        <MixRow key={mix.mix.id} mix={mix} planId={planId} />
      ))}
    </div>
  );
}

function MixRow({ mix, planId, highlight }: { mix: SavedMix; planId: string; highlight?: boolean }) {
  return (
    <Link
      href={`/dashboard/plans/${planId}?stage=MIX&mix=${encodeURIComponent(mix.mix.id)}`}
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors hover:border-blue-300 ${
        highlight ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-900">
          {mix.mix.name || 'תמהיל ללא שם'}
          {mix.isFinal ? ' · סופי' : ''}
        </p>
        <p className="text-[11px] text-slate-500">
          החזר {formatShekel(mix.summary.monthlyPayment)} · ריבית {mix.summary.averageRate.toFixed(2)}%
        </p>
      </div>
      <span className="shrink-0 text-xs font-black text-blue-600">פתיחה בשלב 3</span>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-400">{label}</div>
      <div className="text-sm font-black tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
