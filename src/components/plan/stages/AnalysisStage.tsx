'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpLeft,
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Home,
  MapPin,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { DEAL_TYPES, MAX_LTV_PERCENT } from '@/components/mortgage-advisor/types';
import type { DealType } from '@/components/mortgage-advisor/types';
import { DEAL_TYPE_KEYS } from '@/components/mortgage-advisor/propertyContext';
import { planToolHref } from '@/data/platform/planStages';
import { defaultMortgagePlanningUserData } from '@/lib/mortgage-affordability';
import { startConsumerLoansImport } from '@/lib/consumer-loans-import';
import {
  EMPLOYMENT_LABELS,
  EMPLOYMENT_TYPES,
  analyzeProfile,
  clampDealMortgage,
  dealMaxLtv,
  dealMaxMortgage,
  ltvPercentOf,
  mortgageFromLtvPercent,
  mortgageFromProperty,
  profileLoanTotal,
  profileRequirements,
  sumProfileLoans,
} from '@/lib/mortgage-plan';
import type {
  AnalysisData,
  EmploymentType,
  FutureLumpSum,
  PlanData,
  ProfileIntent,
  ProfileLoan,
  ProfileScreen,
} from '@/lib/mortgage-plan';
import {
  EmptyHint,
  Metric,
  NumberField,
  Panel,
  SegmentedField,
  TextField,
  formatPercent,
  formatShekel,
} from '../ui';

const AFFORDABILITY_TOOL = '/mortgage-planning?flow=affordability';
const CONSUMER_LOANS_TOOL = '/consumer-loans';

/** השדות שאינם תלויים בנכס — כל עוד הם חסרים, אין טעם לפתוח את פרטי העסקה */
const PERSONAL_KEYS = [
  'income',
  'age',
  'employmentType',
  'partnerIncome',
  'partnerAge',
  'partnerEmploymentType',
  'equity',
];

function newLumpSum(): FutureLumpSum {
  return {
    id: `lump-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    label: '',
    amount: null,
    inYears: null,
  };
}

function newLoan(): ProfileLoan {
  return {
    id: `loan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    monthlyPayment: null,
  };
}

function syncedLoans(
  profile: AnalysisData,
  borrowerLoans: ProfileLoan[],
  partnerLoans: ProfileLoan[]
): Pick<AnalysisData, 'borrowerLoans' | 'partnerLoans' | 'existingLoans'> {
  const nextPartner = profile.household === 'COUPLE' ? partnerLoans : [];
  const total = sumProfileLoans(borrowerLoans) + sumProfileLoans(nextPartner);
  return {
    borrowerLoans,
    partnerLoans: nextPartner,
    existingLoans: total > 0 ? total : null,
  };
}

const reveal = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.32 },
};

/**
 * שלב 1 — הפרופיל הפיננסי.
 *
 * ארבעה מסכים אחד אחרי השני: איפה בתהליך, מי לוקח, הכנסות עתידיות, ואז הנכס
 * או בדיקת ההיתכנות. הכל נשמר תוך כדי הקלדה.
 */
export function AnalysisStage({
  data,
  onChange,
  planId,
}: {
  data: PlanData;
  onChange: (next: AnalysisData) => void;
  planId: string;
}) {
  const profile = data.ANALYSIS;
  const patch = (next: Partial<AnalysisData>) => onChange({ ...profile, ...next });
  const go = (profileScreen: ProfileScreen) => patch({ profileScreen });

  const couple = profile.household === 'COUPLE';
  const analysis = analyzeProfile(profile);
  const requirements = profileRequirements(profile);
  const personalDone = requirements
    .filter((item) => PERSONAL_KEYS.includes(item.key))
    .every((item) => item.ok);

  const screen: ProfileScreen = !profile.intent ? 'intent' : profile.profileScreen || 'borrowers';

  return (
    <div className="space-y-5">
      {screen !== 'intent' && (
        <ScreenRail
          current={screen}
          intent={profile.intent}
          personalDone={personalDone}
          onSelect={go}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {screen === 'intent' && (
          <motion.div key="intent" {...reveal}>
            <IntentChoice
              value={profile.intent}
              onSelect={(intent) => patch({ intent, profileScreen: 'borrowers' })}
            />
          </motion.div>
        )}

        {screen === 'borrowers' && (
          <motion.div key="borrowers" {...reveal} className="space-y-5">
            <Panel
              title="מי לוקח את המשכנתא"
              description="ההכנסות, הגילים, אופן ההעסקה וההלוואות הקיימות הם מה שהבנק בוחן קודם כול. הנתונים נשמרים אוטומטית."
            >
              <div className="max-w-xs">
                <SegmentedField
                  name="household"
                  label="הרכב הלווים"
                  value={profile.household}
                  options={[
                    { value: 'SINGLE', label: 'לווה יחיד' },
                    { value: 'COUPLE', label: 'זוג' },
                  ]}
                  onChange={(household) =>
                    patch({
                      household,
                      partnerIncome: household === 'COUPLE' ? profile.partnerIncome : null,
                      partnerAge: household === 'COUPLE' ? profile.partnerAge : null,
                      partnerEmploymentType:
                        household === 'COUPLE' ? profile.partnerEmploymentType : null,
                      ...syncedLoans(
                        { ...profile, household },
                        profile.borrowerLoans,
                        household === 'COUPLE' ? profile.partnerLoans : []
                      ),
                    })
                  }
                />
              </div>

              <div className={`mt-5 grid gap-4 ${couple ? 'lg:grid-cols-2' : ''}`}>
                <BorrowerBasicsCard
                  title={couple ? 'לווה 1' : 'הפרטים שלי'}
                  age={profile.age}
                  income={profile.income}
                  onAge={(age) => patch({ age })}
                  onIncome={(income) => patch({ income })}
                />
                {couple && (
                  <BorrowerBasicsCard
                    title="לווה 2"
                    age={profile.partnerAge}
                    income={profile.partnerIncome}
                    onAge={(partnerAge) => patch({ partnerAge })}
                    onIncome={(partnerIncome) => patch({ partnerIncome })}
                  />
                )}
              </div>

              <div className="mt-5 max-w-sm">
                <NumberField
                  label="הון עצמי פנוי לעסקה"
                  hint="חיסכון, מתנה מההורים, תמורה ממכירת נכס — כל מה שייכנס לעסקה מחוץ למשכנתא."
                  value={profile.equity}
                  onChange={(equity) => patch({ equity })}
                  suffix="₪"
                  placeholder="500,000"
                />
              </div>

              <div className={`mt-5 grid gap-4 ${couple ? 'lg:grid-cols-2' : ''}`}>
                <BorrowerWorkCard
                  title={couple ? 'לווה 1' : undefined}
                  employment={profile.employmentType}
                  loans={profile.borrowerLoans}
                  onEmployment={(employmentType) => patch({ employmentType })}
                  onLoansChange={(borrowerLoans) =>
                    patch(syncedLoans(profile, borrowerLoans, profile.partnerLoans))
                  }
                />
                {couple && (
                  <BorrowerWorkCard
                    title="לווה 2"
                    employment={profile.partnerEmploymentType}
                    loans={profile.partnerLoans}
                    onEmployment={(partnerEmploymentType) => patch({ partnerEmploymentType })}
                    onLoansChange={(partnerLoans) =>
                      patch(syncedLoans(profile, profile.borrowerLoans, partnerLoans))
                    }
                  />
                )}
              </div>

              {(profile.employmentType === 'SELF_EMPLOYED' ||
                profile.partnerEmploymentType === 'SELF_EMPLOYED') && (
                <p className="mt-4 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <Briefcase className="mt-0.5 h-4 w-4 shrink-0" />
                  לעצמאי נדרשים גם שומת מס, דוח רווח והפסד ואישור על תשלום מקדמות. כדאי להתחיל
                  לאסוף אותם כבר עכשיו — הם לוקחים הכי הרבה זמן.
                </p>
              )}

              {profileLoanTotal(profile) > 0 && (
                <ConsumerLoansOffer profile={profile} planId={planId} />
              )}

              {analysis.totalIncome > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="הכנסה חודשית מוכרת"
                    value={formatShekel(analysis.totalIncome)}
                    note={couple ? 'שני הלווים יחד' : undefined}
                  />
                  <Metric
                    label="החזר חודשי מרבי"
                    value={formatShekel(analysis.maxMonthlyPayment)}
                    note="לפי מגבלת יחס ההחזר של בנק ישראל"
                    tone="good"
                  />
                  <Metric
                    label="החזר על הלוואות קיימות"
                    value={formatShekel(profile.existingLoans ?? 0)}
                    note="מוריד מההכנסה לפני חישוב המשכנתא"
                    tone={(profile.existingLoans ?? 0) > 0 ? 'warn' : 'default'}
                  />
                </div>
              )}
            </Panel>

            <ScreenFooter
              backLabel="איפה אתם בתהליך"
              onBack={() => go('intent')}
              nextLabel="המשך לצפי הכנסות עתידיות"
              onNext={() => go('future')}
              nextDisabled={!personalDone}
              nextHint={
                personalDone
                  ? undefined
                  : `כדי להמשיך חסר: ${requirements
                      .filter((item) => PERSONAL_KEYS.includes(item.key) && !item.ok)
                      .map((item) => item.label)
                      .join(', ')}`
              }
            />
          </motion.div>
        )}

        {screen === 'future' && (
          <motion.div key="future" {...reveal} className="space-y-5">
            <FutureIncomePanel profile={profile} patch={patch} />
            <ScreenFooter
              backLabel="מי לוקח את המשכנתא"
              onBack={() => go('borrowers')}
              nextLabel={
                profile.intent === 'FEASIBILITY' ? 'המשך לבדיקת היתכנות' : 'המשך לפרטי הנכס'
              }
              onNext={() => go('deal')}
            />
          </motion.div>
        )}

        {screen === 'deal' && (
          <motion.div key="deal" {...reveal} className="space-y-5">
            {profile.intent === 'FEASIBILITY' ? (
              <FeasibilityPanel
                planId={planId}
                onFoundProperty={() => patch({ intent: 'HAS_PROPERTY' })}
              />
            ) : (
              <PropertyPanel profile={profile} patch={patch} />
            )}
            <ScreenFooter
              backLabel="צפי להכנסות עתידיות"
              onBack={() => go('future')}
              nextLabel={null}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScreenRail({
  current,
  intent,
  personalDone,
  onSelect,
}: {
  current: ProfileScreen;
  intent: ProfileIntent | null;
  personalDone: boolean;
  onSelect: (screen: ProfileScreen) => void;
}) {
  const items: Array<{ id: ProfileScreen; label: string; unlocked: boolean }> = [
    { id: 'intent', label: 'איפה בתהליך', unlocked: true },
    { id: 'borrowers', label: 'מי לוקח', unlocked: Boolean(intent) },
    { id: 'future', label: 'הכנסות עתידיות', unlocked: personalDone },
    {
      id: 'deal',
      label: intent === 'FEASIBILITY' ? 'היתכנות' : 'הנכס והעסקה',
      unlocked: personalDone,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => {
        const active = item.id === current;
        return (
          <button
            key={item.id}
            type="button"
            disabled={!item.unlocked}
            onClick={() => item.unlocked && onSelect(item.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              active
                ? 'bg-slate-900 text-white shadow-md'
                : item.unlocked
                  ? 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'
                  : 'cursor-not-allowed bg-slate-100 text-slate-300'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
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

function ScreenFooter({
  backLabel,
  onBack,
  nextLabel,
  onNext,
  nextDisabled,
  nextHint,
}: {
  backLabel: string;
  onBack: () => void;
  nextLabel: string | null;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextHint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
      >
        <ChevronRight className="h-4 w-4" />
        {backLabel}
      </button>
      {nextLabel && onNext && (
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all ${
              nextDisabled
                ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                : 'bg-slate-900 hover:bg-slate-700'
            }`}
          >
            {nextLabel}
            <ArrowLeft className="h-4 w-4" />
          </button>
          {nextHint && <span className="max-w-xs text-[11px] text-slate-400">{nextHint}</span>}
        </div>
      )}
    </div>
  );
}

/** השאלה הראשונה — גדולה במרכז המסך עד שנבחרת תשובה */
function IntentChoice({
  value,
  onSelect,
}: {
  value: ProfileIntent | null;
  onSelect: (intent: ProfileIntent) => void;
}) {
  const options: Array<{
    id: ProfileIntent;
    title: string;
    description: string;
    icon: typeof Home;
    gradient: string;
  }> = [
    {
      id: 'HAS_PROPERTY',
      title: 'מצאתי נכס שאני מעוניין לרכוש',
      description: 'יש מחיר ועסקה על השולחן — נבנה פרופיל, נגיש בקשה לאישור עקרוני ונתקדם לתמהיל.',
      icon: Home,
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      id: 'FEASIBILITY',
      title: 'אני מעוניין לבדוק היתכנות',
      description: 'עוד לא נבחר נכס. נחשב לאיזה מחיר אפשר לכוון, ונחזור לכאן כשתדעו על מה מגישים.',
      icon: Search,
      gradient: 'from-violet-600 to-fuchsia-600',
    },
  ];

  return (
    <div className="flex min-h-[min(68vh,640px)] flex-col items-center justify-center px-2 py-6">
      <p className="mb-2 text-xs font-black tracking-wide text-slate-400">שאלה ראשונה</p>
      <h3 className="text-center text-3xl font-black text-slate-900 md:text-5xl">
        איפה אתם בתהליך?
      </h3>
      <p className="mt-3 mb-10 max-w-lg text-center text-base leading-relaxed text-slate-500">
        שאלה אחת שקובעת את המשך הדרך. אפשר לשנות אותה בכל רגע.
      </p>
      <div className="grid w-full max-w-3xl gap-5 md:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`group relative overflow-hidden rounded-3xl border-2 p-7 text-right transition-all ${
                selected
                  ? 'border-slate-900 bg-slate-900 shadow-2xl'
                  : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl'
              }`}
            >
              <div
                className={`pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${option.gradient} opacity-25 blur-2xl transition-opacity group-hover:opacity-50`}
              />
              <div className="relative">
                <span
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${option.gradient} shadow-lg`}
                >
                  <Icon className="h-7 w-7 text-white" />
                </span>
                <div className="flex items-center gap-2">
                  <h4
                    className={`text-lg font-black leading-snug md:text-xl ${
                      selected ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {option.title}
                  </h4>
                  {selected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400">
                      <Check className="h-3 w-3 text-slate-900" />
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    selected ? 'text-white/70' : 'text-slate-500'
                  }`}
                >
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BorrowerBasicsCard({
  title,
  age,
  income,
  onAge,
  onIncome,
}: {
  title: string;
  age: number | null;
  income: number | null;
  onAge: (value: number | null) => void;
  onIncome: (value: number | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900">
          <User className="h-4 w-4 text-white" />
        </span>
        <h4 className="text-sm font-black text-slate-900">{title}</h4>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="הכנסה חודשית נטו"
          value={income}
          onChange={onIncome}
          suffix="₪"
          placeholder="15,000"
        />
        <NumberField label="גיל" value={age} onChange={onAge} max={90} placeholder="35" />
      </div>
    </div>
  );
}

function BorrowerWorkCard({
  title,
  employment,
  loans,
  onEmployment,
  onLoansChange,
}: {
  title?: string;
  employment: EmploymentType | null;
  loans: ProfileLoan[];
  onEmployment: (value: EmploymentType) => void;
  onLoansChange: (loans: ProfileLoan[]) => void;
}) {
  const hasLoans = loans.length > 0;
  const canAddAnother = hasLoans && loans.every((loan) => (loan.monthlyPayment ?? 0) > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-4 shadow-sm">
      {title && (
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900">
            <User className="h-4 w-4 text-white" />
          </span>
          <h4 className="text-sm font-black text-slate-900">{title}</h4>
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-xs font-bold text-slate-600">אופן ההעסקה</span>
        <div className="flex gap-2">
          {EMPLOYMENT_TYPES.map((type) => {
            const selected = employment === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onEmployment(type)}
                className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                }`}
              >
                {EMPLOYMENT_LABELS[type]}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
          קובע אילו מסמכים הבנק ידרוש בשלב האישור העקרוני.
        </p>
      </div>

      <div className="mt-5">
        <span className="mb-2 block text-xs font-bold text-slate-600">
          הלוואות עם תקופת פירעון מעל 18 חודשים?
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onLoansChange(hasLoans ? loans : [newLoan()])}
            className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
              hasLoans
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
            }`}
          >
            כן
          </button>
          <button
            type="button"
            onClick={() => onLoansChange([])}
            className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
              !hasLoans
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
            }`}
          >
            לא
          </button>
        </div>
      </div>

      {hasLoans && (
        <div className="mt-3 space-y-2.5">
          {loans.map((loan, index) => (
            <div key={loan.id} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <NumberField
                  label={loans.length > 1 ? `הלוואה ${index + 1} — החזר חודשי` : 'החזר חודשי'}
                  value={loan.monthlyPayment}
                  onChange={(monthlyPayment) =>
                    onLoansChange(
                      loans.map((item) => (item.id === loan.id ? { ...item, monthlyPayment } : item))
                    )
                  }
                  suffix="₪"
                  placeholder="2,500"
                />
              </div>
              {loans.length > 1 && (
                <button
                  type="button"
                  onClick={() => onLoansChange(loans.filter((item) => item.id !== loan.id))}
                  aria-label="מחיקת הלוואה"
                  className="mb-1 rounded-lg p-2.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {canAddAnother && (
            <button
              type="button"
              onClick={() => onLoansChange([...loans, newLoan()])}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900"
            >
              <Plus className="h-3.5 w-3.5" />
              הוסף הלוואה נוספת
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function toPlanningLoans(loans: ProfileLoan[]) {
  return loans
    .filter((loan) => (loan.monthlyPayment ?? 0) > 0)
    .map((loan) => ({
      id: loan.id,
      monthlyPayment: String(loan.monthlyPayment),
      isBullet: false,
    }));
}

/** הפניה לכלי תכנון ההלוואות הצרכניות, עם ייבוא ההלוואות שכבר הוזנו */
function ConsumerLoansOffer({ profile, planId }: { profile: AnalysisData; planId: string }) {
  const href = planToolHref(CONSUMER_LOANS_TOOL, planId);
  const couple = profile.household === 'COUPLE';

  const goToPlanner = () => {
    const planning = defaultMortgagePlanningUserData();
    if (couple) {
      planning.applicationType = 'couple';
      planning.borrower1.loans = toPlanningLoans(profile.borrowerLoans);
      planning.borrower2.loans = toPlanningLoans(profile.partnerLoans);
    } else {
      planning.applicationType = 'individual';
      planning.loans = toPlanningLoans(profile.borrowerLoans);
      planning.hasLoans = planning.loans.length > 0;
    }
    startConsumerLoansImport(planning);
    window.location.href = `${href}${href.includes('?') ? '&' : '?'}import=planning`;
  };

  return (
    <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 shadow-md">
          <CreditCard className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-slate-900">
            {couple
              ? 'רוצים שמשכלנתא תעזור לכם עם ההלוואות?'
              : 'רוצה שמשכלנתא תעזור לך עם ההלוואות?'}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            איחוד, סגירה מוקדמת או מיחזור לפני הפנייה לבנק מגדילים את יכולת ההחזר שיאשרו לכם.
            ההלוואות שכבר הזנתם יעברו לכלי.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goToPlanner}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-orange-600 to-amber-600 px-4 py-2 text-xs font-black text-white shadow-md transition-all hover:brightness-110"
            >
              {couple ? 'עזרו לנו עם ההלוואות שלנו' : 'עזרו לי עם ההלוואות שלי'}
              <ArrowUpLeft className="h-3.5 w-3.5" />
            </button>
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-slate-900 hover:text-slate-900"
            >
              לכלי תכנון הלוואות צרכניות
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** פרטי הנכס והעסקה — מחיר הנכס קובע את סכום המשכנתא בתוך תקרת סוג העסקה */
function PropertyPanel({
  profile,
  patch,
}: {
  profile: AnalysisData;
  patch: (next: Partial<AnalysisData>) => void;
}) {
  const analysis = analyzeProfile(profile);
  const propertyValue = profile.propertyValue ?? 0;
  const dealType = profile.dealType ?? 'first_home';
  const maxLtv = dealMaxLtv(dealType);
  const maxMortgage = dealMaxMortgage(propertyValue, dealType);
  const mortgage = profile.mortgageAmount;
  const ltvValue = propertyValue > 0 ? ltvPercentOf(propertyValue, mortgage ?? 0) : null;
  const leftoverEquity = propertyValue > 0 ? Math.max(0, propertyValue - (mortgage ?? 0)) : 0;

  const setPropertyValue = (value: number | null) => {
    const nextPrice = value ?? 0;
    patch({
      propertyValue: value,
      mortgageAmount: mortgageFromProperty(nextPrice, profile.equity, dealType),
    });
  };

  const setDealType = (next: DealType) => {
    patch({
      dealType: next,
      mortgageAmount:
        propertyValue > 0 ? dealMaxMortgage(propertyValue, next) : profile.mortgageAmount,
    });
  };

  const setLtv = (ltv: number | null) => {
    if (ltv === null) {
      patch({ mortgageAmount: null });
      return;
    }
    patch({
      mortgageAmount: mortgageFromLtvPercent(propertyValue, ltv, dealType),
    });
  };

  const setMortgage = (value: number | null) => {
    if (value === null) {
      patch({ mortgageAmount: null });
      return;
    }
    patch({
      mortgageAmount: clampDealMortgage(value, propertyValue, dealType),
    });
  };

  return (
    <Panel
      title="הנכס והעסקה"
      description="מחיר הנכס ממלא את סכום המשכנתא. סוג העסקה קובע את תקרת המימון, ואפשר לבחור אחוז נמוך יותר או לערוך את הסכום ידנית בתוך התקרה."
    >
      <div className="space-y-5">
        <NumberField
          label="מחיר הנכס"
          value={profile.propertyValue}
          onChange={setPropertyValue}
          suffix="₪"
          placeholder="2,000,000"
        />

        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-600">סוג העסקה</span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {DEAL_TYPE_KEYS.map((key: DealType) => {
              const selected = profile.dealType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDealType(key)}
                  className={`rounded-2xl border-2 px-4 py-3 text-right transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <span
                    className={`block text-sm font-black ${
                      selected ? 'text-blue-700' : 'text-slate-700'
                    }`}
                  >
                    {DEAL_TYPES[key]}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-bold text-slate-400">
                    מימון עד {MAX_LTV_PERCENT[key]}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="אחוז מימון"
            hint={`אפשר לבחור אחוז נמוך יותר מתקרת ${DEAL_TYPES[dealType]}. לא ניתן לחרוג מ-${maxLtv}%.`}
            value={ltvValue}
            onChange={setLtv}
            suffix="%"
            max={maxLtv}
            placeholder={String(maxLtv)}
          />
          <NumberField
            label="סכום המשכנתא"
            hint={`נחתך אוטומטית לתקרה של ${formatShekel(maxMortgage)} לפי סוג העסקה.`}
            value={mortgage}
            onChange={setMortgage}
            suffix="₪"
            max={maxMortgage > 0 ? maxMortgage : undefined}
            placeholder={maxMortgage ? maxMortgage.toLocaleString('he-IL') : '1,500,000'}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              תקופת המשכנתא המבוקשת
            </span>
            <div className="flex gap-2">
              {[15, 20, 25, 30].map((years) => {
                const selected = profile.years === years;
                return (
                  <button
                    key={years}
                    type="button"
                    onClick={() => patch({ years })}
                    className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    {years}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              להערכת ההחזר בלבד — בתמהיל עצמו לכל מסלול תקופה משלו.
            </p>
          </div>

          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              כתובת הנכס (לא חובה)
            </span>
            <AddressAutocomplete
              className="h-[42px] rounded-xl border-slate-200"
              placeholder="התחילו להקליד רחוב או עיר"
              value={profile.propertyAddress}
              onChange={(propertyAddress) => patch({ propertyAddress })}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              תמהילים לאותה כתובת מקובצים ומושווים יחד באזור האישי. בלי כתובת הם מקובצים לפי סכום
              המשכנתא.
            </p>
          </div>
        </div>

        {propertyValue > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="הון עצמי בעסקה"
              value={formatShekel(leftoverEquity)}
              note={
                profile.equity !== null
                  ? `הוצהר בפרופיל ${formatShekel(profile.equity)}`
                  : 'מחיר הנכס פחות המשכנתא'
              }
              tone={analysis.equityGap > 0 ? 'warn' : 'good'}
            />
            <Metric
              label="אחוז מימון"
              value={formatPercent(analysis.ltv)}
              note={`תקרה ${maxLtv}%`}
              tone={analysis.ltvOk ? 'good' : 'bad'}
            />
            <Metric
              label={`מימון מרבי ל${DEAL_TYPES[dealType]}`}
              value={formatShekel(maxMortgage)}
            />
            <Metric
              label="החזר חודשי משוער"
              value={formatShekel(analysis.estimatedMonthlyPayment)}
              note={
                analysis.repaymentRatio !== null
                  ? `יחס החזר ${formatPercent(analysis.repaymentRatio)}`
                  : undefined
              }
              tone={analysis.ratioOk ? 'default' : 'warn'}
            />
          </div>
        )}

        {analysis.equityGap > 0 && (
          <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            לפי ההון העצמי שהוצהר חסרים {formatShekel(analysis.equityGap)} כדי לעמוד בתקרת המימון.
            אפשר להגדיל את ההון או להקטין את סכום המשכנתא.
          </p>
        )}

        {!analysis.ratioOk && (
          <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            יחס ההחזר המשוער חורג מהמקובל בבנקים. אפשר להאריך את התקופה, להקטין את סכום המשכנתא
            או לסגור הלוואות קיימות לפני ההגשה.
          </p>
        )}
      </div>
    </Panel>
  );
}

/** מי שעדיין בודק היתכנות — יוצא לכלי המתאים וחוזר לכאן עם נכס */
function FeasibilityPanel({
  planId,
  onFoundProperty,
}: {
  planId: string;
  onFoundProperty: () => void;
}) {
  return (
    <Panel
      title="בדיקת היתכנות לפני שבוחרים נכס"
      description="התהליך מחכה לכם כאן. ברגע שתדעו לאיזה מחיר נכס אפשר לכוון — חזרו וסמנו שמצאתם נכס."
    >
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-l from-violet-50 to-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-slate-900">
              היעזרו בכלי בדיקת ההיתכנות של משכלנתא
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              הכלי מחשב מההכנסות, ההון העצמי וההלוואות הקיימות שלכם את מחיר הנכס המרבי ואת ההחזר
              החודשי שתוכלו לעמוד בו. הפרופיל שמילאתם כאן כבר שמור — אחרי שתקבלו החלטה, חזרו לכאן
              והמשיכו בתהליך לקיחת המשכנתא מהנקודה שבה עצרתם.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={planToolHref(AFFORDABILITY_TOOL, planId)}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:brightness-110"
              >
                לכלי «מה אני יכול להרשות לעצמי»
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={onFoundProperty}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-black text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900"
              >
                <MapPin className="h-4 w-4" />
                מצאתי נכס — נמשיך בתהליך
              </button>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/**
 * צפי ההכנסות העתידיות אינו נדרש לבנק, אבל הוא זה שמאפשר לבנות תמהיל חכם:
 * סכום חד-פעמי הופך לפירעון מוקדם מתוכנן, והכנסה שגדלה מרחיבה את תקציב ההחזר.
 */
function FutureIncomePanel({
  profile,
  patch,
}: {
  profile: AnalysisData;
  patch: (next: Partial<AnalysisData>) => void;
}) {
  const updateLumpSum = (id: string, next: Partial<FutureLumpSum>) =>
    patch({
      futureLumpSums: profile.futureLumpSums.map((item) =>
        item.id === id ? { ...item, ...next } : item
      ),
    });

  return (
    <Panel
      title="צפי להכנסות עתידיות"
      description="כסף שצפוי להיכנס בהמשך — קרן השתלמות, מענק, ירושה או מכירת נכס — נכנס לתכנון התמהיל כפירעון מוקדם, וכך חוסך ריבית במקום לשכב בעו״ש."
      action={
        <button
          type="button"
          onClick={() => patch({ futureLumpSums: [...profile.futureLumpSums, newLumpSum()] })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black text-white transition-colors hover:bg-slate-700"
        >
          <Plus className="h-3.5 w-3.5" />
          הוספת הכנסה צפויה
        </button>
      }
    >
      {profile.futureLumpSums.length === 0 ? (
        <EmptyHint>
          אין לכם הכנסה חד-פעמית צפויה? אפשר לדלג. אם כן — הוסיפו אותה כאן, גם אם התאריך עוד לא
          מדויק.
        </EmptyHint>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {profile.futureLumpSums.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                  <TextField
                    label="מקור ההכנסה"
                    value={item.label}
                    onChange={(label) => updateLumpSum(item.id, { label })}
                    placeholder="קרן השתלמות, מענק, ירושה…"
                  />
                  <NumberField
                    label="סכום"
                    value={item.amount}
                    onChange={(amount) => updateLumpSum(item.id, { amount })}
                    suffix="₪"
                    placeholder="150,000"
                  />
                  <NumberField
                    label="בעוד"
                    value={item.inYears}
                    onChange={(inYears) => updateLumpSum(item.id, { inYears })}
                    suffix="שנים"
                    max={30}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        futureLumpSums: profile.futureLumpSums.filter(
                          (entry) => entry.id !== item.id
                        ),
                      })
                    }
                    aria-label="מחיקת ההכנסה הצפויה"
                    className="mb-1 rounded-lg p-2.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h4 className="text-sm font-black text-slate-900">צפי להגדלת ההכנסה הפנויה</h4>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          סיום הלוואה, קידום בעבודה או חזרה של בן/בת הזוג לעבודה מלאה מגדילים את תקציב ההחזר. אם זה
          צפוי — נתכנן תמהיל שמנצל את זה במקום החזר קבוע ונמוך לאורך כל התקופה.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="תוספת חודשית צפויה"
            value={profile.futureMonthlyIncrease}
            onChange={(futureMonthlyIncrease) => patch({ futureMonthlyIncrease })}
            suffix="₪"
            placeholder="1,500"
          />
          <NumberField
            label="בעוד כמה שנים"
            value={profile.futureMonthlyIncreaseInYears}
            onChange={(futureMonthlyIncreaseInYears) => patch({ futureMonthlyIncreaseInYears })}
            suffix="שנים"
            max={30}
          />
        </div>
      </div>
    </Panel>
  );
}
