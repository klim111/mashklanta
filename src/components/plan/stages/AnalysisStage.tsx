'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpLeft,
  Briefcase,
  Banknote,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  CreditCard,
  MapPin,
  Plus,
  Trash2,
  HeartHandshake,
  TrendingUp,
  User,
} from 'lucide-react';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { DEAL_TYPES, MAX_LTV_PERCENT, MORTGAGE_BANKS } from '@/components/mortgage-advisor/types';
import type { DealType } from '@/components/mortgage-advisor/types';
import { DEAL_TYPE_KEYS, clampCombinedLtv, dealTypeForCombinedLtv } from '@/components/mortgage-advisor/propertyContext';
import { TermMonthsSlider } from '@/components/mortgage-advisor/workspace/primitives';
import { planToolHref } from '@/data/platform/planStages';
import { defaultMortgagePlanningUserData } from '@/lib/mortgage-affordability';
import { startConsumerLoansImport } from '@/lib/consumer-loans-import';
import {
  EMPLOYMENT_LABELS,
  EMPLOYMENT_TYPES,
  NEW_PLAN_FLOW,
  analyzeProfile,
  borrowerLabels,
  dealMaxLtv,
  dealMaxMortgage,
  profileRequirements,
  requestedMortgage,
  sumProfileLoans,
} from '@/lib/mortgage-plan';
import type {
  AnalysisData,
  EmploymentType,
  FutureLumpSum,
  PlanData,
  PlanFlow,
  ProfileIntent,
  ProfileLoan,
  ProfileScreen,
  SigningData,
} from '@/lib/mortgage-plan';
import {
  Metric,
  NumberField,
  Panel,
  SegmentedField,
  TextField,
  formatPercent,
  formatShekel,
} from '../ui';
import { NumericInput } from '@/components/ui/numeric-input';
import { pickProfileFromAnalysis } from '@/lib/client-profile';
import { profileRecommendations } from '@/lib/profile-report';
import { StageIntro } from '../StageIntro';
import { ProfileReportPanel } from './analysis/ProfileReportPanel';
import { OwnershipRow } from './analysis/OwnershipRow';
import { NotesAlert } from './analysis/NotesAlert';
import { IncomeCalculatorDialog } from './analysis/IncomeCalculatorDialog';
import { DocumentsScreen } from './analysis/DocumentsScreen';
import { RecommendationCallouts } from './analysis/RecommendationCallouts';
import type { RecommendationNote } from './analysis/RecommendationCallouts';
import { AdvisorLeadDialog } from '../advisor/AdvisorLeadDialog';

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
 * עמוד ההסבר על השלב, ואחריו המסכים אחד אחרי השני: הנכס והעסקה, מי לוקח,
 * הכנסות עתידיות, תיק המסמכים והדוח הסופי. הכל נשמר תוך כדי הקלדה, וההמלצות
 * צפות במסך שבו הנתון הרלוונטי מוזן. סרגל התת-שלבים מלווה את כל המסכים, וכל
 * תת-שלב פתוח בו בכל רגע. הפנייה ליועץ היא הכפתור הצף של שולחן העבודה.
 */
export function AnalysisStage({
  data,
  onChange,
  planId,
  planName,
  onChangeSigning,
  refinance = false,
  flow = NEW_PLAN_FLOW,
}: {
  data: PlanData;
  onChange: (next: AnalysisData) => void;
  planId: string;
  /**
   * תהליך מיחזור. הנכס כבר בבעלות הלקוח והמשכנתא כבר קיימת, ולכן אין שאלה על
   * הון עצמי — והיעדרו אינו חוסם את המעבר לתת-השלב הבא.
   */
  refinance?: boolean;
  /** סוג התהליך — לכותרות של עמוד ההסבר */
  flow?: PlanFlow;
  /** הגדרת בעלות הנכס נשמרת על שלב החתימה, שהוא מקור האמת שלה */
  onChangeSigning?: (next: SigningData) => void;
  /** שם התהליך — מופיע בכותרת דוח הפרופיל שמורידים */
  planName?: string;
}) {
  const profile = data.ANALYSIS;
  const profileSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * כל הזנה נשמרת אוטומטית — גם בתהליך עצמו וגם בפרופיל של הלקוח.
   *
   * הפרופיל הוא אותם נתונים בדיוק (הכנסות, גילים, הון עצמי, הלוואות וצפי), ולכן
   * אין מה לשאול עליו: מה שהוזן כאן הוא המצב הנכון, והוא נשמר בשקט אחרי הפוגה
   * קצרה בהקלדה. כך גם משכנתא חדשה תיפתח עם הנתונים המעודכנים.
   */
  const patch = (next: Partial<AnalysisData>) => {
    const merged = { ...profile, ...next };
    onChange(merged);

    if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
    profileSaveTimer.current = setTimeout(() => {
      void fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pickProfileFromAnalysis(merged)),
      }).catch(() => undefined);
    }, 900);
  };

  useEffect(
    () => () => {
      if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
    },
    []
  );

  const go = (profileScreen: ProfileScreen) => patch({ profileScreen });

  const couple = profile.household === 'COUPLE';
  /* השמות שהוזנו — מחליפים את «לווה 1» ו«לווה 2» בכל מסכי השלב */
  const names = borrowerLabels(profile);
  const analysis = analyzeProfile(profile);
  const requirements = profileRequirements(profile, { requireEquity: !refinance });
  const personalDone = requirements
    .filter((item) => PERSONAL_KEYS.includes(item.key))
    .every((item) => item.ok);

  const screen: ProfileScreen = profile.profileScreen || 'overview';
  /*
    ההערות שמוצגות כסימן קריאה ליד הנתון שהן מתייחסות אליו, במקום שורה מתחת
    למודול. מתי הן מופיעות ומה כתוב בהן — בדיוק כמו קודם.
  */
  const recommendations = profileRecommendations(profile);
  const noteById = (id: string) => recommendations.filter((item) => item.id === id);

  /* טופס פנייה ליועץ — נפתח מכפתור גיוס ההון העצמי כשההון חסר */
  const [equityHelpOpen, setEquityHelpOpen] = useState(false);
  const onEquityHelp = () => setEquityHelpOpen(true);

  /*
    התהליך נפתח תמיד סביב נכס קונקרטי (בדיקת היתכנות נעשית מהאזור האישי בכלי
    נפרד). לכן אם עוד לא נקבעה נקודת פתיחה — נקבע אותה כאן, כדי שהשלב ייסגר
    והדוח ייפתח בלי לשאול שוב.
  */
  useEffect(() => {
    if (!profile.intent) patch({ intent: 'HAS_PROPERTY' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.intent]);

  return (
    <div className="space-y-5">
      <ScreenRail current={screen} intent={profile.intent} onSelect={go} />

      <AnimatePresence mode="wait" initial={false}>
        {screen === 'overview' && (
          <motion.div key="overview" {...reveal}>
            <StageIntro stage="ANALYSIS" flow={flow} onStart={() => go('deal')} />
          </motion.div>
        )}

        {screen === 'borrowers' && (
          <motion.div key="borrowers" {...reveal} className="space-y-5">
            <Panel
              centered
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
                      bankAccountMode: household === 'COUPLE' ? profile.bankAccountMode : null,
                      partnerPrimaryBank: household === 'COUPLE' ? profile.partnerPrimaryBank : null,
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
                  title={couple ? names.first : names.hasFirst ? names.first : 'הפרטים שלי'}
                  firstName={profile.firstName}
                  lastName={profile.lastName}
                  age={profile.age}
                  income={profile.income}
                  bank={profile.primaryBank}
                  onFirstName={(firstName) => patch({ firstName })}
                  onLastName={(lastName) => patch({ lastName })}
                  onAge={(age) => patch({ age })}
                  onIncome={(income) => patch({ income })}
                  onBank={(primaryBank) => patch({ primaryBank })}
                  showBank={!couple || profile.bankAccountMode !== 'JOINT'}
                  bankNotes={noteById('primary-bank')}
                />
                {couple && (
                  <BorrowerBasicsCard
                    title={names.second}
                    firstName={profile.partnerFirstName}
                    lastName={profile.partnerLastName}
                    age={profile.partnerAge}
                    income={profile.partnerIncome}
                    bank={profile.partnerPrimaryBank}
                    onFirstName={(partnerFirstName) => patch({ partnerFirstName })}
                    onLastName={(partnerLastName) => patch({ partnerLastName })}
                    onAge={(partnerAge) => patch({ partnerAge })}
                    onIncome={(partnerIncome) => patch({ partnerIncome })}
                    onBank={(partnerPrimaryBank) => patch({ partnerPrimaryBank })}
                    showBank={profile.bankAccountMode !== 'JOINT'}
                    bankNotes={noteById('primary-bank')}
                  />
                )}
              </div>

              {/* חשבון משותף: הבנק מוצג פעם אחת, כבלוק המשתרע על פני שני הלווים */}
              {couple && profile.bankAccountMode === 'JOINT' && (
                <div className="mt-4 rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4">
                  <BankChooser
                    title="הבנק של החשבון המשותף"
                    bank={profile.primaryBank}
                    onBank={(bank) => patch({ primaryBank: bank, partnerPrimaryBank: bank })}
                    notes={noteById('primary-bank')}
                  />
                </div>
              )}

              {/*
                השאלה על ניהול החשבון מופיעה רק כששני הלווים בחרו את אותו בנק —
                אחרת אין בכלל אפשרות לחשבון משותף.
              */}
              {couple &&
                ((Boolean(profile.primaryBank) &&
                  profile.primaryBank === profile.partnerPrimaryBank) ||
                  profile.bankAccountMode === 'JOINT') && (
                <div className="mt-5 max-w-lg">
                  <span className="mb-2 block text-xs font-bold text-slate-600">
                    מנהלים חשבון בנק משותף או כל אחד בנפרד?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          bankAccountMode: 'JOINT',
                          partnerPrimaryBank: profile.primaryBank ?? profile.partnerPrimaryBank,
                          primaryBank: profile.primaryBank ?? profile.partnerPrimaryBank,
                        })
                      }
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
                        profile.bankAccountMode === 'JOINT'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      חשבון משותף
                    </button>
                    <button
                      type="button"
                      onClick={() => patch({ bankAccountMode: 'SEPARATE' })}
                      className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
                        profile.bankAccountMode === 'SEPARATE'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      כל אחד בנפרד
                    </button>
                  </div>
                  <p className="mt-1.5 text-2xs leading-relaxed text-slate-400">
                    קובע אם תדפיס עובר ושב, אישור ניהול חשבון ודוח יתרות יופיעו כמסמכים משותפים או
                    לכל לווה בנפרד.
                  </p>
                </div>
              )}


              <div className={`mt-5 grid gap-4 ${couple ? 'lg:grid-cols-2' : ''}`}>
                <BorrowerWorkCard
                  title={couple ? names.first : undefined}
                  employment={profile.employmentType}
                  loans={
                    couple ? profile.borrowerLoans.filter((loan) => !loan.shared) : profile.borrowerLoans
                  }
                  hasLoans={profile.borrowerLoans.length > 0}
                  allowShared={couple}
                  onEmployment={(employmentType) => patch({ employmentType })}
                  onLoansChange={(next) =>
                    patch(
                      syncedLoans(
                        profile,
                        next.length === 0
                          ? []
                          : [...profile.borrowerLoans.filter((loan) => loan.shared), ...next],
                        profile.partnerLoans
                      )
                    )
                  }
                  onToggleShared={(loan, shared) =>
                    patch(
                      syncedLoans(
                        profile,
                        profile.borrowerLoans.map((item) =>
                          item.id === loan.id ? { ...item, shared } : item
                        ),
                        profile.partnerLoans
                      )
                    )
                  }
                />
                {couple && (
                  <BorrowerWorkCard
                    title={names.second}
                    employment={profile.partnerEmploymentType}
                    loans={profile.partnerLoans.filter((loan) => !loan.shared)}
                    hasLoans={profile.partnerLoans.length > 0}
                    allowShared
                    onEmployment={(partnerEmploymentType) => patch({ partnerEmploymentType })}
                    onLoansChange={(next) =>
                      patch(
                        syncedLoans(
                          profile,
                          profile.borrowerLoans,
                          next.length === 0
                            ? []
                            : [...profile.partnerLoans.filter((loan) => loan.shared), ...next]
                        )
                      )
                    }
                    onToggleShared={(loan, shared) =>
                      patch(
                        syncedLoans(
                          profile,
                          profile.borrowerLoans,
                          profile.partnerLoans.map((item) =>
                            item.id === loan.id ? { ...item, shared } : item
                          )
                        )
                      )
                    }
                  />
                )}
              </div>

              {couple &&
                [...profile.borrowerLoans, ...profile.partnerLoans].some((loan) => loan.shared) && (
                  <div className="mt-4 space-y-2.5 rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4">
                    <p className="text-xs font-black text-blue-900">הלוואות משותפות</p>
                    {[...profile.borrowerLoans, ...profile.partnerLoans]
                      .filter((loan) => loan.shared)
                      .map((loan, index, list) => (
                        <SharedLoanRow
                          key={loan.id}
                          loan={loan}
                          index={index}
                          count={list.length}
                          onChange={(monthlyPayment) => {
                            patch(
                              syncedLoans(
                                profile,
                                profile.borrowerLoans.map((item) =>
                                  item.id === loan.id ? { ...item, monthlyPayment } : item
                                ),
                                profile.partnerLoans.map((item) =>
                                  item.id === loan.id ? { ...item, monthlyPayment } : item
                                )
                              )
                            );
                          }}
                          onRemainingChange={(remainingMonths) => {
                            patch(
                              syncedLoans(
                                profile,
                                profile.borrowerLoans.map((item) =>
                                  item.id === loan.id ? { ...item, remainingMonths } : item
                                ),
                                profile.partnerLoans.map((item) =>
                                  item.id === loan.id ? { ...item, remainingMonths } : item
                                )
                              )
                            );
                          }}
                          onUnshare={() => {
                            patch(
                              syncedLoans(
                                profile,
                                profile.borrowerLoans.map((item) =>
                                  item.id === loan.id ? { ...item, shared: false } : item
                                ),
                                profile.partnerLoans.map((item) =>
                                  item.id === loan.id ? { ...item, shared: false } : item
                                )
                              )
                            );
                          }}
                          onRemove={() => {
                            patch(
                              syncedLoans(
                                profile,
                                profile.borrowerLoans.filter((item) => item.id !== loan.id),
                                profile.partnerLoans.filter((item) => item.id !== loan.id)
                              )
                            );
                          }}
                        />
                      ))}
                  </div>
                )}

              {(profile.employmentType === 'SELF_EMPLOYED' ||
                profile.partnerEmploymentType === 'SELF_EMPLOYED') && (
                <p className="mt-4 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <Briefcase className="mt-0.5 h-4 w-4 shrink-0" />
                  לעצמאי נדרשים גם שומת מס, דוח רווח והפסד ואישור על תשלום מקדמות. כדאי להתחיל
                  לאסוף אותם כבר עכשיו — הם לוקחים הכי הרבה זמן.
                </p>
              )}

              {(profile.borrowerLoans.length > 0 || profile.partnerLoans.length > 0) && (
                <ConsumerLoansOffer profile={profile} planId={planId} />
              )}

              {analysis.totalIncome > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="הכנסה חודשית מוכרת"
                    value={formatShekel(analysis.totalIncome)}
                    note={couple ? 'שני הלווים יחד' : undefined}
                  />
                  {/* הערת יחס ההחזר המשוער — סימן קריאה על תיבת ההחזר, ולא שורה מתחת */}
                  <div className="relative">
                    <Metric
                      label="החזר חודשי מרבי"
                      value={formatShekel(analysis.maxMonthlyPayment)}
                      note="לפי מגבלת יחס ההחזר של בנק ישראל"
                      tone="good"
                    />
                    <NotesAlert
                      notes={noteById('repayment-ratio')}
                      title="הערה על יחס ההחזר המשוער"
                      className="absolute left-3 top-3"
                    />
                  </div>
                  <Metric
                    label="החזר על הלוואות קיימות"
                    value={formatShekel(profile.existingLoans ?? 0)}
                    note="מוריד מההכנסה לפני חישוב המשכנתא"
                    tone={(profile.existingLoans ?? 0) > 0 ? 'warn' : 'default'}
                  />
                </div>
              )}
            </Panel>

            <RecommendationCallouts
              profile={profile}
              screen="borrowers"
              exclude={['repayment-ratio', 'primary-bank']}
            />

            <ScreenFooter
              backLabel="הנכס והעסקה"
              onBack={() => go('deal')}
              nextLabel="המשך לצפי הכנסות עתידיות"
              onNext={() => go('future')}
              nextHint={
                personalDone
                  ? undefined
                  : `עוד חסר: ${requirements
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
            <RecommendationCallouts profile={profile} screen="future" />
            <ScreenFooter
              backLabel="מי לוקח את המשכנתא"
              onBack={() => go('borrowers')}
              nextLabel="המשך לתיק המסמכים"
              onNext={() => go('documents')}
            />
          </motion.div>
        )}

        {screen === 'documents' && (
          <motion.div key="documents" {...reveal} className="space-y-5">
            <DocumentsScreen data={data} planId={planId} patch={patch} />
            <ScreenFooter
              backLabel="צפי להכנסות עתידיות"
              onBack={() => go('future')}
              nextLabel={
                profile.documentsMode && profile.documentsMode !== 'UPLOAD' ? 'לדוח הפרופיל' : null
              }
              onNext={() => go('report')}
            />
          </motion.div>
        )}

        {screen === 'deal' && (
          <motion.div key="deal" {...reveal} className="space-y-5">
            <PropertyPanel
              profile={profile}
              patch={patch}
              onNeedEquityHelp={onEquityHelp}
              refinance={refinance}
              notes={recommendations.filter((item) => item.screens.includes('deal'))}
              ownership={
                onChangeSigning ? (
                  <OwnershipRow signing={data.SIGNING} onChange={onChangeSigning} />
                ) : null
              }
            />

            <ScreenFooter
              backLabel="על השלב"
              onBack={() => go('overview')}
              nextLabel="המשך למי לוקח את המשכנתא"
              onNext={() => go('borrowers')}
            />
          </motion.div>
        )}

        {screen === 'report' && (
          <motion.div key="report" {...reveal} className="space-y-5">
            <ProfileReportPanel data={data} planName={planName} />
            <ScreenFooter backLabel="תיק המסמכים" onBack={() => go('documents')} nextLabel={null} />
          </motion.div>
        )}
      </AnimatePresence>

      <AdvisorLeadDialog open={equityHelpOpen} onOpenChange={setEquityHelpOpen} topic="EQUITY" />
    </div>
  );
}

/**
 * סרגל התת-שלבים. כל תת-שלב פתוח בכל רגע, כמו השלבים עצמם: מה שעוד חסר מוצג
 * ריק בתת-השלב שנשען עליו, והלקוח משלים בסדר שהוא בוחר.
 */
function ScreenRail({
  current,
  intent,
  onSelect,
}: {
  current: ProfileScreen;
  intent: ProfileIntent | null;
  onSelect: (screen: ProfileScreen) => void;
}) {
  // הסדר כאן הוא סדר התת-שלבים בפועל (PROFILE_SCREENS), ולא סדר אחר
  const items: Array<{ id: ProfileScreen; label: string; unlocked: boolean }> = [
    { id: 'overview', label: 'על השלב', unlocked: true },
    {
      id: 'deal',
      label: intent === 'FEASIBILITY' ? 'היתכנות' : 'הנכס והעסקה',
      unlocked: true,
    },
    { id: 'borrowers', label: 'מי לוקח', unlocked: true },
    { id: 'future', label: 'הכנסות עתידיות', unlocked: true },
    { id: 'documents', label: 'מסמכים', unlocked: true },
    { id: 'report', label: 'דוח הפרופיל', unlocked: true },
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
        className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-button font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
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
          {nextHint && <span className="max-w-xs text-2xs text-slate-400">{nextHint}</span>}
        </div>
      )}
    </div>
  );
}

/** השאלה הראשונה — גדולה במרכז המסך עד שנבחרת תשובה */
function BorrowerBasicsCard({
  title,
  firstName,
  lastName,
  age,
  income,
  bank,
  onFirstName,
  onLastName,
  onAge,
  onIncome,
  onBank,
  showBank = true,
  bankNotes = [],
}: {
  title: string;
  firstName: string;
  lastName: string;
  age: number | null;
  income: number | null;
  bank: string | null;
  onFirstName: (value: string) => void;
  onLastName: (value: string) => void;
  onAge: (value: number | null) => void;
  onIncome: (value: number | null) => void;
  onBank: (value: string | null) => void;
  /** בחשבון משותף הבנק מוצג בבלוק נפרד המשותף לשני הלווים, ולא בכרטיס */
  showBank?: boolean;
  /** ההמלצה לכלול את הבנק של החשבון בבקשה — סימן קריאה ליד בורר הבנק */
  bankNotes?: RecommendationNote[];
}) {
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900">
          <User className="h-4 w-4 text-white" />
        </span>
        <h4 className="text-base font-black text-slate-900">{title}</h4>
      </div>

      {/* השם מחליף את «לווה 1» בכל מקום שבו הלווה מוצג — לכן הוא נשאל ראשון */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <TextField label="שם פרטי" value={firstName} onChange={onFirstName} placeholder="ישראל" />
        <TextField label="שם משפחה" value={lastName} onChange={onLastName} placeholder="ישראלי" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <NumberField
            label="הכנסה חודשית נטו"
            value={income}
            onChange={onIncome}
            suffix="₪"
            placeholder="15,000"
          />
          {/*
            הבנק עובד על ממוצע שלושה חודשים ולא על המשכורת האחרונה, ורוב
            הלקוחות מזינים כאן את האחרונה. הכפתור עושה את החישוב במקומם.
          */}
          <button
            type="button"
            onClick={() => setCalculatorOpen(true)}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-800 transition-colors hover:bg-blue-100"
          >
            <Calculator className="h-3.5 w-3.5" />
            עזרו לי לחשב את ההכנסה הפנויה
          </button>
        </div>
        <NumberField label="גיל" value={age} onChange={onAge} max={90} placeholder="35" />
      </div>

      <IncomeCalculatorDialog
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        borrowerLabel={title}
        onApply={onIncome}
      />

      {showBank && (
        <div className="mt-4 text-center">
          <BankChooser bank={bank} onBank={onBank} notes={bank ? bankNotes : []} />
        </div>
      )}
    </div>
  );
}

/** בורר הבנק של החשבון הראשי — משמש בכרטיס לווה יחיד ובבלוק המשותף לזוג */
function BankChooser({
  bank,
  onBank,
  title = 'הבנק של החשבון הראשי',
  notes = [],
}: {
  bank: string | null;
  onBank: (value: string | null) => void;
  title?: string;
  /** ההמלצה לכלול את הבנק בבקשה לאישור עקרוני — נפתחת מסימן הקריאה */
  notes?: RecommendationNote[];
}) {
  return (
    <div className="text-center">
      <span className="mb-1.5 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700">
        <Building2 className="h-4 w-4 text-slate-400" />
        {title}
        <NotesAlert notes={notes} title="הערה על הבנק של החשבון" className="mr-1" />
      </span>
      <p className="mb-2 text-xs leading-relaxed text-slate-500">
        החשבון שאליו מועברת ההכנסה העיקרית בכל חודש. יוצע כברירת מחדל באישור העקרוני.
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {MORTGAGE_BANKS.map((item) => {
          const selected = bank === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onBank(selected ? null : item)}
              className={`rounded-full border px-2.5 py-1 text-2xs font-bold transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BorrowerWorkCard({
  title,
  employment,
  loans,
  hasLoans: declaredHasLoans,
  allowShared = false,
  onEmployment,
  onLoansChange,
  onToggleShared,
}: {
  title?: string;
  employment: EmploymentType | null;
  loans: ProfileLoan[];
  hasLoans?: boolean;
  allowShared?: boolean;
  onEmployment: (value: EmploymentType) => void;
  onLoansChange: (loans: ProfileLoan[]) => void;
  onToggleShared?: (loan: ProfileLoan, shared: boolean) => void;
}) {
  const hasLoans = declaredHasLoans ?? loans.length > 0;
  const canAddAnother = hasLoans && (loans.length === 0 || loans.every((loan) => (loan.monthlyPayment ?? 0) > 0));

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
        <p className="mt-1.5 text-2xs leading-relaxed text-slate-400">
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
            <div key={loan.id} className="space-y-1.5">
              <div className="flex items-end gap-2">
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
                  <NumberField
                    label="חודשים שנותרו"
                    hint="הלוואה שמסתיימת בתוך פחות מחמש שנים משחררת החזר חודשי — ואז נמליץ על מסלול גרייס בתמהיל עד לסיומה."
                    value={loan.remainingMonths ?? null}
                    onChange={(remainingMonths) =>
                      onLoansChange(
                        loans.map((item) => (item.id === loan.id ? { ...item, remainingMonths } : item))
                      )
                    }
                    suffix="חודשים"
                    max={360}
                    placeholder="36"
                  />
                </div>
                {(loans.length > 1 || allowShared) && (
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
              {allowShared && onToggleShared && (
                <label className="flex cursor-pointer items-center gap-2 text-2xs font-bold text-slate-500">
                  <input
                    type="checkbox"
                    checked={Boolean(loan.shared)}
                    onChange={(event) => onToggleShared(loan, event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                  />
                  הלוואה משותפת לשני הלווים
                </label>
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

function SharedLoanRow({
  loan,
  index,
  count,
  onChange,
  onRemainingChange,
  onUnshare,
  onRemove,
}: {
  loan: ProfileLoan;
  index: number;
  count: number;
  onChange: (monthlyPayment: number | null) => void;
  onRemainingChange: (remainingMonths: number | null) => void;
  onUnshare: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-blue-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <NumberField
            label={count > 1 ? `הלוואה משותפת ${index + 1} — החזר חודשי` : 'החזר חודשי משותף'}
            value={loan.monthlyPayment}
            onChange={onChange}
            suffix="₪"
            placeholder="2,500"
          />
          <NumberField
            label="חודשים שנותרו"
            value={loan.remainingMonths ?? null}
            onChange={onRemainingChange}
            suffix="חודשים"
            max={360}
            placeholder="36"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="מחיקת הלוואה משותפת"
          className="mb-1 rounded-lg p-2.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-2xs font-bold text-blue-800">
        <input
          type="checkbox"
          checked
          onChange={() => onUnshare()}
          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
        />
        הלוואה משותפת — מוצגת על פני שני הלווים
      </label>
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
              ? 'תנו למשכלנתא לעזור לכם עם ההלוואות הצרכניות שלכם'
              : 'תן למשכלנתא לעזור לך עם ההלוואות הצרכניות שלך'}
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
              לכלי תכנון ההלוואות הצרכניות
              <ArrowUpLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * פרטי הנכס והעסקה — כתובת, מחיר, סוג עסקה, בעלות הנכס ורישום הזכויות, ואז
 * ההון העצמי שממנו נגזרות המשכנתא ואחוז המימון.
 */
function PropertyPanel({
  profile,
  patch,
  onNeedEquityHelp,
  refinance = false,
  notes,
  ownership,
}: {
  profile: AnalysisData;
  patch: (next: Partial<AnalysisData>) => void;
  /** נפתח כשההון העצמי הזמין נמוך מהנדרש — טופס פנייה לגיוס הון */
  onNeedEquityHelp: () => void;
  /** במיחזור אין הון עצמי לעסקה, ולכן אזור ההון העצמי אינו מוצג */
  refinance?: boolean;
  /** ההערות של המסך (יחס החזר, יחס מימון קרוב לתקרה) — נפתחות מסימן הקריאה */
  notes: RecommendationNote[];
  /** שורת בעלות הנכס ורישום הזכויות, מתחת לשורת סוג העסקה */
  ownership: ReactNode;
}) {
  const analysis = analyzeProfile(profile);
  const dealType = profile.dealType;
  const propertyValue = profile.propertyValue ?? 0;
  const maxLtv = dealType ? dealMaxLtv(dealType) : null;
  const combined = profile.targetLtvPercent !== null && profile.targetLtvPercent > 0;

  const computedMortgage = requestedMortgage(
    propertyValue,
    profile.equity,
    dealType,
    profile.targetLtvPercent
  );
  const leftoverEquity = propertyValue > 0 ? Math.max(0, propertyValue - (computedMortgage ?? 0)) : 0;

  /*
    ההון העצמי המינימלי הנדרש הוא מחיר הנכס פחות המשכנתא המרבית שהבנק ייתן:
    במצב משולב לפי האחוז שהוזן, אחרת לפי תקרת סוג העסקה. מתחתיו הלקוח מזין
    את ההון הזמין, ואם הוא נמוך מהנדרש — מוצעת עזרה בגיוס הון.
  */
  const maxMortgage = combined
    ? Math.round(propertyValue * ((profile.targetLtvPercent ?? 0) / 100))
    : dealType
      ? dealMaxMortgage(propertyValue, dealType)
      : 0;
  const requiredEquity = propertyValue > 0 ? Math.max(0, propertyValue - maxMortgage) : 0;
  const availableEquity = profile.equity ?? 0;
  const equityShort = propertyValue > 0 && availableEquity > 0 && availableEquity < requiredEquity;
  const equityEntered = profile.equity !== null && profile.equity > 0;

  const applyPropertyValue = (
    value: number | null,
    nextDeal: DealType | null,
    nextLtv: number | null = profile.targetLtvPercent
  ) => {
    patch({
      dealType: nextDeal,
      propertyValue: value,
      targetLtvPercent: nextLtv,
      mortgageAmount: requestedMortgage(value ?? 0, profile.equity, nextDeal, nextLtv),
    });
  };

  const applyEquity = (equity: number | null) => {
    patch({
      equity,
      mortgageAmount:
        propertyValue > 0
          ? requestedMortgage(propertyValue, equity, dealType, profile.targetLtvPercent)
          : profile.mortgageAmount,
    });
  };

  /*
    ההערות של המסך, כולל חריגת יחס ההחזר, נאספות לחלון צף שנפתח מסימן קריאה
    במודול ההון העצמי — באותם תנאים שבהם הופיעו קודם כשורות מתחת למודול.
  */
  const ratioExceeded = !refinance && !analysis.ratioOk && propertyValue > 0 && equityEntered;
  const importantNotes: RecommendationNote[] = ratioExceeded
    ? [
        ...notes,
        {
          id: 'ratio-exceeded',
          tone: 'warning',
          title: 'יחס ההחזר המשוער חורג מהמקובל בבנקים',
          body: 'אפשר להאריך את התקופה, להקטין את מחיר הנכס או לסגור הלוואות קיימות לפני ההגשה.',
        },
      ]
    : notes;
  const notesButton = (
    <NotesAlert notes={importantNotes} label="הערות חשובות" className="mx-auto" />
  );
  const equityBoxShown = !refinance && Boolean(dealType) && propertyValue > 0;
  const refinanceBoxShown = refinance && propertyValue > 0;

  const applyCombinedLtv = (raw: number | null) => {
    if (raw === null || raw <= 0) {
      applyPropertyValue(profile.propertyValue, profile.dealType, null);
      return;
    }
    const percent = clampCombinedLtv(raw);
    const nextDeal = dealTypeForCombinedLtv(percent, profile.dealType);
    applyPropertyValue(profile.propertyValue, nextDeal, percent);
  };

  return (
    <Panel
      centered
      title="הנכס והעסקה"
      description="הכתובת, מחיר הנכס וסוג העסקה. אחרי המחיר וסוג העסקה נראה מה ההון העצמי המינימלי הנדרש, ותזינו את ההון הזמין לכם."
    >
      <div className="space-y-6">
        <div className="mx-auto max-w-xl text-center">
          <span className="mb-1.5 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700">
            <MapPin className="h-4 w-4 text-slate-400" />
            כתובת הנכס
          </span>
          <AddressAutocomplete
            className="h-[42px] rounded-xl border-slate-200"
            placeholder="התחילו להקליד רחוב או עיר"
            value={profile.propertyAddress}
            onChange={(propertyAddress) => patch({ propertyAddress })}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            תמהילים לאותה כתובת מקובצים ומושווים יחד באזור האישי. בלי כתובת הם מקובצים לפי סכום
            המשכנתא.
          </p>
        </div>

        {/* מחיר הנכס — מתחת לכתובת ובאותו עיצוב, לפני סוג העסקה */}
        <div className="mx-auto max-w-xl text-center">
          <span className="mb-1.5 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700">
            <Banknote className="h-4 w-4 text-slate-400" />
            מחיר הנכס
          </span>
          <div className="mx-auto w-56">
            <NumberField
              label=""
              value={profile.propertyValue}
              onChange={(value) => applyPropertyValue(value, profile.dealType)}
              suffix="₪"
              placeholder="2,000,000"
            />
          </div>
        </div>

        <div>
          <span className="mb-2 block text-center text-base font-black text-slate-800">
            סוג העסקה
          </span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {DEAL_TYPE_KEYS.map((key: DealType) => {
              const selected = !combined && profile.dealType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPropertyValue(profile.propertyValue, key, null)}
                  className={`rounded-2xl border-2 px-4 py-3 text-center transition-all ${
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
                  <span className="mt-0.5 block text-xs font-bold text-slate-500">
                    מימון עד {MAX_LTV_PERCENT[key]}%
                  </span>
                </button>
              );
            })}

            {/*
              המצב המשולב הוא סוג עסקה נוסף בשורה, ולא טופס שתופס שורה שלמה:
              לחיצה עליו בוחרת אותו ופותחת בתוכו שדה לאחוז המימון.
            */}
            <CombinedLtvOption
              active={combined}
              percent={profile.targetLtvPercent}
              onChange={applyCombinedLtv}
            />
          </div>

          {combined && propertyValue > 0 && (
            <p className="mt-2 text-center text-sm font-bold text-blue-800">
              מימון {profile.targetLtvPercent}% · משכנתא {formatShekel(computedMortgage)} · הון עצמי
              בעסקה {formatShekel(leftoverEquity)}
            </p>
          )}
        </div>

        {ownership}

        {/*
          במיחזור אין הון עצמי לעסקה: הסכום הממוחזר הוא יתרת המשכנתא הקיימת,
          והוא נקבע בכלי המיחזור. במקום אזור ההון העצמי מוצג מה שהבנק כן בוחן.
        */}
        {refinanceBoxShown && (
          <div className="mx-auto max-w-xl space-y-1 rounded-3xl border-2 border-slate-200 bg-slate-50/60 p-5 text-center">
            {importantNotes.length > 0 && <div className="mb-2 flex justify-center">{notesButton}</div>}
            <p className="text-sm font-black text-slate-800">במיחזור אין צורך בהון עצמי</p>
            <p className="text-xs font-medium leading-relaxed text-slate-600">
              הנכס כבר בבעלותכם, והסכום שממוחזר הוא יתרת המשכנתא הקיימת כפי שהזנתם בכלי המיחזור.
              מה שהבנק בוחן כאן הוא ההכנסות, ההתחייבויות ושווי הנכס מול יתרת ההלוואה.
            </p>
          </div>
        )}

        {/* ההון העצמי — נדרש מול זמין, אחרי שנקבע מחיר הנכס */}
        {equityBoxShown && (
          <div className="mx-auto max-w-xl space-y-3 rounded-3xl border-2 border-slate-200 bg-slate-50/60 p-5 text-center">
            {importantNotes.length > 0 && <div className="flex justify-center">{notesButton}</div>}
            <div>
              <span className="block text-sm font-bold text-slate-600">הון עצמי מינימלי נדרש</span>
              <span className="mt-0.5 block text-2xl font-black tabular-nums text-slate-900">
                {formatShekel(requiredEquity)}
              </span>
              <span className="mt-0.5 block text-xs font-medium text-slate-500">
                {combined
                  ? `לפי מימון ${profile.targetLtvPercent}% שהוזן`
                  : `מחיר הנכס פחות מימון של עד ${maxLtv}%`}
              </span>
            </div>

            <div className="mx-auto w-64">
              <NumberField
                emphasis
                label="הון עצמי זמין"
                value={profile.equity}
                onChange={applyEquity}
                suffix="₪"
                placeholder="500,000"
              />
            </div>

            {equityShort ? (
              <div className="space-y-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-center">
                <p className="flex items-center justify-center gap-2 text-sm font-black text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  חסרים {formatShekel(requiredEquity - availableEquity)} כדי לעמוד בתקרת המימון
                </p>
                <p className="text-xs font-medium leading-relaxed text-amber-800">
                  אפשר להגדיל את ההון העצמי, להקטין את מחיר הנכס — או לקבל עזרה מיועץ בגיוס הון.
                </p>
                <button
                  type="button"
                  onClick={onNeedEquityHelp}
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-button font-black text-white transition-colors hover:bg-violet-700"
                >
                  <HeartHandshake className="h-4 w-4" />
                  קבלו עזרה מיועצי משכלנתא לגייס הון עצמי
                </button>
              </div>
            ) : equityEntered ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="סכום המשכנתא" value={formatShekel(computedMortgage)} />
                <Metric
                  label="אחוז מימון"
                  value={formatPercent(analysis.ltv)}
                  note={maxLtv !== null ? `תקרה ${maxLtv}%` : undefined}
                  tone={analysis.ltvOk ? 'good' : 'bad'}
                />
                <Metric label="החזר חודשי משוער" value={formatShekel(analysis.estimatedMonthlyPayment)} />
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-500">
                הזינו את ההון העצמי הזמין כדי לחשב את אחוז המימון ואת ההחזר המשוער.
              </p>
            )}
          </div>
        )}

        {dealType && (
          <div>
            <TermMonthsSlider
              label="תקופת המשכנתא המבוקשת"
              years={profile.years}
              onChange={(years) => patch({ years })}
            />
            <p className="mt-1.5 text-center text-2xs text-slate-400">
              להערכת ההחזר בלבד — בתמהיל עצמו לכל מסלול תקופה משלו. אפשר לבחור כל מספר חודשים בין 48
              ל-360.
            </p>
          </div>
        )}

        {/* הערות שאין עדיין מודול להציג בו את הסימן — למשל לפני שהוזן מחיר */}
        {!equityBoxShown && !refinanceBoxShown && importantNotes.length > 0 && (
          <div className="flex justify-center">{notesButton}</div>
        )}
      </div>
    </Panel>
  );
}

/**
 * מצב משולב — אחוז מימון שנקבע ידנית.
 *
 * הוא יושב בשורת סוגי העסקה ככרטיס נוסף, ונבחר בדיוק כמוהם. שדה האחוז נפתח
 * רק בלחיצה ומתחיל ריק: אחוז שמופיע מעצמו הופך לברירת מחדל שקטה, ומי שלא שם
 * לב אליה מקבל חישוב שלא ביקש.
 */
function CombinedLtvOption({
  active,
  percent,
  onChange,
}: {
  active: boolean;
  percent: number | null;
  onChange: (value: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const showField = active || open;

  return (
    <div
      className={`rounded-2xl border-2 px-4 py-3 text-center transition-all ${
        active
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full"
        aria-expanded={showField}
      >
        <span className={`block text-sm font-black ${active ? 'text-blue-700' : 'text-slate-700'}`}>
          מצב משולב
        </span>
        <span className="mt-0.5 block text-xs font-bold text-slate-500">
          {active ? `מימון ${percent}%` : showField ? 'הזינו אחוז' : 'לחצו להזנת אחוז'}
        </span>
      </button>

      {showField && (
        <div className="mt-2 flex items-center justify-center gap-1">
          <NumericInput
            autoFocus={open && !active}
            value={percent}
            onChange={(value) => {
              onChange(value);
              if (value === null) setOpen(true);
            }}
            max={75}
            placeholder="—"
            aria-label="אחוז מימון"
            title="כל אחוז עד 75, בתוך מגבלות בנק ישראל"
            className={`w-16 rounded-lg border-2 bg-white px-1.5 py-1 text-center text-base font-black text-slate-900 outline-none transition-all focus:border-blue-500 ${
              active ? 'border-blue-300' : 'border-slate-200'
            }`}
          />
          <span className="text-sm font-black text-slate-500">%</span>
        </div>
      )}
    </div>
  );
}

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

  const addLumpSum = () =>
    patch({ futureLumpSums: [...profile.futureLumpSums, newLumpSum()] });

  /*
    השאלה פותחת את המסך: רק מי שעונה "כן" רואה את שתי האפשרויות — סכום חד-פעמי
    וצפי להגדלת ההכנסה הפנויה. תהליך ישן שכבר הוזנו בו סכומים לפני שהשאלה
    נשאלה כאן נפתח כאילו נענה "כן", כדי שהסכומים לא ייעלמו מהעין.
  */
  const hasFutureData =
    profile.futureLumpSums.length > 0 ||
    (profile.futureMonthlyIncrease ?? 0) > 0 ||
    (profile.futureMonthlyIncreaseInYears ?? 0) > 0;
  const answer = profile.expectsIncomeIncrease ?? (hasFutureData ? true : null);

  const answerNo = () => {
    if (
      hasFutureData &&
      !window.confirm('הסכומים העתידיים שהזנתם יימחקו מהפרופיל. להמשיך?')
    ) {
      return;
    }
    patch({
      expectsIncomeIncrease: false,
      futureLumpSums: [],
      futureMonthlyIncrease: null,
      futureMonthlyIncreaseInYears: null,
    });
  };

  return (
    <Panel
      centered
      title="צפי להכנסות עתידיות"
      description="כסף שצפוי להיכנס בהמשך, והכנסה שצפויה לגדול, משנים את התמהיל שכדאי לבנות. שניהם נכנסים לתכנון בשלב הבא — ולכן שווה להזין אותם כאן, גם אם המועד עוד לא מדויק."
    >
      <div className="space-y-5">
        <div className="mx-auto max-w-xl text-center">
          <span className="mb-2 flex items-center justify-center gap-1.5 text-base font-black text-slate-800">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            האם צפויה הגדלה בהכנסה הפנויה?
          </span>
          <p className="mb-3 text-sm leading-relaxed text-slate-500">
            סכום חד-פעמי שייכנס (קרן השתלמות, מענק, ירושה) או הכנסה חודשית שתגדל (סיום הלוואה,
            קידום, חזרה לעבודה מלאה).
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => patch({ expectsIncomeIncrease: true })}
              className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-button font-bold transition-all ${
                answer === true
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              כן, צפויה הגדלה
            </button>
            <button
              type="button"
              onClick={answerNo}
              className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-button font-bold transition-all ${
                answer === false
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              לא צפויה
            </button>
          </div>
        </div>

        {answer === true && (
          <>
        {/* כסף חד-פעמי — אזור בצבע אחד, כי הוא הופך לפירעון מוקדם */}
        <section className="rounded-3xl border-2 border-blue-200 bg-blue-50/40 p-5">
          <header className="mb-4 text-center">
            <h4 className="flex items-center justify-center gap-2 text-lg font-black text-blue-900">
              <Banknote className="h-5 w-5" />
              סכום חד-פעמי שצפוי להיכנס
            </h4>
            <p className="mx-auto mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
              קרן השתלמות, מענק, ירושה או תמורה ממכירת נכס. כסף כזה שווה הרבה יותר כפירעון מוקדם
              של מסלול יקר מאשר בעו״ש.
            </p>
          </header>

          {profile.futureLumpSums.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-blue-200 bg-white/70 px-5 py-6 text-center text-sm font-semibold leading-relaxed text-slate-600">
              אין לכם הכנסה חד-פעמית צפויה? אפשר לדלג. אם כן — הוסיפו אותה כאן.
            </p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {profile.futureLumpSums.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl border-2 border-blue-200 bg-white p-4 shadow-sm"
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

          {/* הכפתור יושב מתחת לשורות, כי הוא מוסיף את הבאה בתור */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={addLumpSum}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-blue-300 bg-white px-5 py-2.5 text-button font-black text-blue-800 transition-colors hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              הוספת הכנסה צפויה
            </button>
          </div>
        </section>

        {/* גידול בהכנסה החודשית — אזור בצבע אחר, כי הוא משנה תקציב ולא יתרה */}
        <section className="rounded-3xl border-2 border-emerald-200 bg-emerald-50/40 p-5">
          <header className="mb-4 text-center">
            <h4 className="flex items-center justify-center gap-2 text-lg font-black text-emerald-900">
              <TrendingUp className="h-5 w-5" />
              צפי להגדלת ההכנסה החודשית
            </h4>
            <p className="mx-auto mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
              סיום הלוואה, קידום בעבודה או חזרה של בן/בת הזוג לעבודה מלאה מגדילים את תקציב ההחזר.
              אם זה צפוי — נתכנן תמהיל שמנצל את זה, במקום החזר נמוך וקבוע לאורך כל התקופה.
            </p>
          </header>

          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
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
          {(profile.futureMonthlyIncrease ?? 0) > 0 &&
            (profile.futureMonthlyIncreaseInYears ?? 0) <= 0 && (
              <p className="mt-2 text-center text-2xs text-slate-400">
                הזינו בעוד כמה שנים צפויה העלייה — לפי זה ייקבע אורך מסלול הגרייס המומלץ.
              </p>
            )}
        </section>
          </>
        )}
      </div>
    </Panel>
  );
}
