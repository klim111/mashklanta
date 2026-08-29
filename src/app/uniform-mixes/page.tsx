'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Calculator, Target, PieChart, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import NavBar from '@/components/ui/navbar';
import { MortgageMixCard } from '@/components/mortgage-advisor/MortgageMixCard';
import { MortgageDetailsModal } from '@/components/mortgage-advisor/MortgageDetailsModal';
import type { MortgageMix, MortgageTrack } from '@/components/mortgage-advisor/types';
import { formatMoneyFields, parseFormattedNumberInput } from '@/lib/currency';
import {
  calculateMaxProperty,
  getAffordabilityInputs,
  defaultMortgagePlanningUserData,
  type MortgagePlanningUserData,
} from '@/lib/mortgage-affordability';
import { migrateMortgagePlanningUserData } from '@/lib/borrower-loans';
import { INTEREST_RATES } from '@/lib/interest-rates';

type UserData = MortgagePlanningUserData;

/**
 * Selection carried over from the affordability results page slider.
 * When present, the uniform mixes are generated against the user's slider-chosen
 * property price (and loan amount / period) instead of recomputing the maximum
 * affordable property from scratch.
 */
type MortgagePlanningSelection = {
  source: 'affordability-slider';
  propertyPrice: number;
  loanAmount: number;
  loanPeriod: number;
  ownCapital: number;
  interestRate: number;
  timestamp: number;
};

/**
 * How long after being written a selection is still trusted as "fresh".
 * Selections older than this are ignored on read (e.g. a stale visit via NavBar
 * after the user changed their planning data without going through the slider).
 */
const SELECTION_STALE_THRESHOLD_MS = 30 * 60 * 1000;

function readPlanningSelection(): MortgagePlanningSelection | null {
  try {
    const raw = localStorage.getItem('mortgagePlanningSelection');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MortgagePlanningSelection>;
    if (
      parsed &&
      typeof parsed.loanAmount === 'number' &&
      Number.isFinite(parsed.loanAmount) &&
      parsed.loanAmount > 0 &&
      typeof parsed.loanPeriod === 'number' &&
      parsed.loanPeriod > 0
    ) {
      if (
        typeof parsed.timestamp === 'number' &&
        Date.now() - parsed.timestamp > SELECTION_STALE_THRESHOLD_MS
      ) {
        return null;
      }
      return parsed as MortgagePlanningSelection;
    }
  } catch (error) {
    console.error('Could not parse mortgage planning selection:', error);
  }
  return null;
}

export default function UniformMixes() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [uniformMixes, setUniformMixes] = useState<MortgageMix[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState<MortgageMix | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // The slider-driven selection carried over from the results screen, if any.
  const [selection, setSelection] = useState<MortgagePlanningSelection | null>(null);

  useEffect(() => {
    // Read the affordability-results slider selection (if the user clicked through from there).
    // We deliberately do NOT remove the value from localStorage here: React StrictMode runs
    // useEffect twice in development, and removing it on the first run would cause the second
    // run (and the generateUniformMixes call inside it) to fall back to the default maximum
    // loan amount, overwriting the correct slider-driven mixes. Staleness is instead handled
    // by the timestamp check inside `readPlanningSelection`.
    const savedSelection = readPlanningSelection();
    if (savedSelection) {
      setSelection(savedSelection);
    }

    // Load form data from localStorage
    const savedData = localStorage.getItem('mortgagePlanningData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        const migrated = migrateMortgagePlanningUserData({
          ...defaultMortgagePlanningUserData(),
          ...parsedData.userData,
        });
        const formattedUserData = formatMoneyFields(migrated as unknown as Record<string, unknown>) as unknown as MortgagePlanningUserData;
        setUserData(formattedUserData);
        generateUniformMixes(formattedUserData, savedSelection);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const generateUniformMixes = (
    data: UserData,
    override: MortgagePlanningSelection | null = null
  ) => {
    if (!data) return;

    // Calculate loan amount and optimal loan period.
    let loanAmount = 0;
    let optimalYears = 30; // Default to 30 years

    if (override) {
      // The user came from the affordability results screen and picked a specific property
      // price via the slider - honor that selection instead of recomputing the maximum.
      loanAmount = override.loanAmount;
      optimalYears = override.loanPeriod;
    } else if (data.calculationType === 'תחשב מה אני יכול להרשות לעצמי') {
      // Fall back to the calculated maximum (user did not pass through the results slider).
      const results = calculateMaxProperty(data);
      loanAmount = results.maxLoanAmount;
      optimalYears = results.maxLoanPeriod;
    } else if (data.calculationType === 'תחשב משכנתא לנכס קיים') {
      const propertyPrice = parseFormattedNumberInput(data.propertyPrice);
      const ownCapital = parseFormattedNumberInput(data.ownCapital);
      loanAmount = propertyPrice - ownCapital;
      // For existing property, use age-based calculation - minimum between age limit and 30 years
      const age = parseInt(data.age) || 0;
      if (age > 0) {
        const maxLoanPeriodByAge = Math.min(30, Math.max(1, 80 - age));
        optimalYears = Math.min(maxLoanPeriodByAge, 30);
      } else {
        optimalYears = 30;
      }
    } else if (data.propertyType === 'משכנתא לכל מטרה') {
      const currentPropertyPrice = parseFormattedNumberInput(data.currentPropertyPrice);
      const remainingMortgage = parseFormattedNumberInput(data.remainingMortgageAmount);
      const ownedValue = currentPropertyPrice - remainingMortgage;
      loanAmount = ownedValue * 0.6; // 60% for reverse mortgage
      optimalYears = 30;
    }

    if (loanAmount <= 0) return;

    const mixes: MortgageMix[] = [];

    const mix1: MortgageMix = {
      id: 'uniform-mix-1',
      name: '',
      totalAmount: loanAmount,
      tracks: [{
        id: 'track-1-1',
        name: 'ריבית קבועה לא צמודה',
        type: 'fixed_unlinked',
        amount: loanAmount,
        percentage: 100,
        interestRate: INTEREST_RATES.fixed_unlinked,
        years: optimalYears
      }],
      createdAt: new Date(),
      notes: '100% של המשכנתא בריבית קבועה לא צמודה'
    };

    const mix2: MortgageMix = {
      id: 'uniform-mix-2',
      name: '',
      totalAmount: loanAmount,
      tracks: [
        {
          id: 'track-2-1',
          name: 'ריבית קבועה לא צמודה',
          type: 'fixed_unlinked',
          amount: loanAmount * 0.5,
          percentage: 50,
          interestRate: INTEREST_RATES.fixed_unlinked,
          years: optimalYears
        },
        {
          id: 'track-2-2',
          name: 'ריבית פריים',
          type: 'prime',
          amount: loanAmount * 0.5,
          percentage: 50,
          interestRate: INTEREST_RATES.prime,
          years: optimalYears
        }
      ],
      createdAt: new Date(),
      notes: '50% ריבית קבועה לא צמודה ו-50% ריבית פריים'
    };

    const mix3: MortgageMix = {
      id: 'uniform-mix-3',
      name: '',
      totalAmount: loanAmount,
      tracks: [
        {
          id: 'track-3-1',
          name: 'ריבית קבועה לא צמודה',
          type: 'fixed_unlinked',
          amount: loanAmount * (1/3),
          percentage: 33.33,
          interestRate: INTEREST_RATES.fixed_unlinked,
          years: optimalYears
        },
        {
          id: 'track-3-2',
          name: 'ריבית פריים',
          type: 'prime',
          amount: loanAmount * (1/3),
          percentage: 33.33,
          interestRate: INTEREST_RATES.prime,
          years: optimalYears
        },
        {
          id: 'track-3-3',
          name: 'משתנה לא צמודה כל 5 שנים',
          type: 'variable_unlinked',
          amount: loanAmount * (1/3),
          percentage: 33.34,
          interestRate: INTEREST_RATES.variable_unlinked_5y,
          variablePeriod: 5,
          years: optimalYears
        }
      ],
      createdAt: new Date(),
      notes: 'שליש ריבית קבועה לא צמודה (קל"צ), שליש פריים ושליש משתנה לא צמודה כל 5 שנים'
    };

    mixes.push(mix1, mix2, mix3);
    setUniformMixes(mixes);
  };

  const showDetails = (mix: MortgageMix) => {
    setShowDetailsModal(mix);
  };

  // Handoff key read once by the advisor workspace on load, then cleared.
  // MUST stay in sync with `LEGACY_KEY` in `src/components/mortgage-advisor/workspace/legacy.ts`.
  const ADVISOR_STORAGE_KEY = 'mortgage-advisor-state';

  const handleContinueToAdvisor = () => {
    // Save uniform mixes to localStorage so the mortgage-advisor screen finds them on mount.
    const existingAdvisorData = localStorage.getItem(ADVISOR_STORAGE_KEY);
    let advisorData: { mixes: MortgageMix[]; selectedForComparison: string[]; activeTab: string } = {
      mixes: [],
      selectedForComparison: [],
      activeTab: 'builder',
    };

    if (existingAdvisorData) {
      try {
        const parsed = JSON.parse(existingAdvisorData);
        if (parsed && Array.isArray(parsed.mixes)) {
          advisorData = {
            mixes: parsed.mixes,
            selectedForComparison: Array.isArray(parsed.selectedForComparison) ? parsed.selectedForComparison : [],
            activeTab: parsed.activeTab ?? 'builder',
          };
        }
      } catch (error) {
        console.error('Error parsing advisor data:', error);
      }
    }

    // Merge the uniform mixes into the advisor state (update if id already exists, else append).
    uniformMixes.forEach(mix => {
      const existingIndex = advisorData.mixes.findIndex((m: MortgageMix) => m.id === mix.id);
      if (existingIndex >= 0) {
        advisorData.mixes[existingIndex] = mix;
      } else {
        advisorData.mixes.push(mix);
      }
    });

    localStorage.setItem(ADVISOR_STORAGE_KEY, JSON.stringify(advisorData));

    window.location.href = '/mortgage-advisor';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען תמהילים אחידים...</p>
        </div>
      </div>
    );
  }

  if (!userData || uniformMixes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
        <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
          <NavBar />
        </div>
        
        <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">לא נמצאו נתונים</h1>
            <p className="text-lg text-gray-600 mb-8">
              כדי לראות תמהילים אחידים, תחילה עליך לעבור דרך כלי תכנון המשכנתא
            </p>
            <Link href="/mortgage-planning">
              <Button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white">
                <ArrowRight className="w-5 h-5 mr-2" />
                התחל תכנון משכנתא
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      {/* Navigation */}
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <NavBar />
      </div>
      
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="mb-6 flex justify-between items-center w-full">
              <Link href="/mortgage-planning">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 ml-2" />
                  חזור לתכנון המשכנתא
                </Button>
              </Link>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                סלים אחידים
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                הסלים האחידים הם 3 תמהילי משכנתא שהבנק מחויב להציג ללקוח על פי הנחיית בנק ישראל
              </p>
              <p className="text-lg text-gray-500">
                התמהילים מוצגים להמחשה והשוואה בלבד — לבניית תמהיל משתלם ומותאם אישית עבורך באמצעות כלי בניית התמהילים של משכלנתא או בעזרת מומחה משכלנתא
              </p>
            </motion.div>

            {/* User Data Summary */}
            {userData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 mb-8 inline-block shadow-lg"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {userData.applicationType === 'couple' ? 'הנתונים המצרפיים שלכם' : 'הנתונים שלך'}
                </h3>
                {selection && (
                  <p className="text-xs text-emerald-700 mb-3 -mt-2">
                    התמהילים מותאמים למחיר הנכס שבחרת בסליידר במסך התוצאות
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">סוג נכס:</span>
                    <div className="font-medium">{userData.propertyType}</div>
                  </div>
                  {(selection?.propertyPrice || userData.propertyPrice) && (
                    <div>
                      <span className="text-gray-600">מחיר נכס:</span>
                      <div className="font-medium">
                        ₪{(
                          selection?.propertyPrice ??
                          parseFormattedNumberInput(userData.propertyPrice)
                        ).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {(selection?.ownCapital || userData.ownCapital) && (
                    <div>
                      <span className="text-gray-600">הון עצמי:</span>
                      <div className="font-medium">
                        ₪{(
                          selection?.ownCapital ??
                          parseFormattedNumberInput(userData.ownCapital)
                        ).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {uniformMixes.length > 0 && (
                    <div>
                      <span className="text-gray-600">סכום משכנתא:</span>
                      <div className="font-medium text-blue-600">₪{uniformMixes[0].totalAmount.toLocaleString()}</div>
                    </div>
                  )}
                  {uniformMixes.length > 0 && (
                    <div>
                      <span className="text-gray-600">תקופת פירעון:</span>
                      <div className="font-medium text-purple-600">{uniformMixes[0].tracks[0].years} שנים</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Uniform Mixes Grid.
              The page is rendered RTL, so the first DOM child lands in the rightmost column.
              The "Build custom mix" CTA below is placed first so it sits to the RIGHT of the
              rightmost uniform mix on the screen. */}
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">סלים אחידים</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {uniformMixes.map((mix, index) => {
              const headerConfig =
                index === 0
                  ? {
                      Icon: PieChart,
                      iconClassName: 'text-blue-600',
                      title: 'תמהיל 1',
                      description: '100% ריבית קבועה לא צמודה - יציבות מקסימלית',
                    }
                  : index === 1
                    ? {
                        Icon: TrendingUp,
                        iconClassName: 'text-green-600',
                        title: 'תמהיל 2',
                        description: '50% קבועה + 50% פריים - איזון בין יציבות לגמישות',
                      }
                    : {
                        Icon: Calculator,
                        iconClassName: 'text-purple-600',
                        title: 'תמהיל 3',
                        description: '33% קל"צ + 33% פריים + 33% משתנה לא צמודה כל 5 שנים',
                      };

              return (
                <motion.div
                  key={mix.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + (index * 0.1) }}
                  className="space-y-4"
                >
                  <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 text-center">
                    <headerConfig.Icon className={`w-12 h-12 mx-auto mb-4 ${headerConfig.iconClassName}`} />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{headerConfig.title}</h4>
                    <p className="text-sm text-gray-600">{headerConfig.description}</p>
                  </div>

                  <MortgageMixCard
                    mix={mix}
                    onUpdate={() => {}} // Read-only display
                    onDelete={() => {}} // Read-only display
                    onDuplicate={() => {}} // Will be handled in advisor
                    onShowDetails={showDetails}
                    onAnalyzeScenarios={() => {}} // Will be handled in advisor
                    hideManagementButtons={true}
                    showSummaryHeader={true}
                  />
                </motion.div>
              );
            })}
          </div>

          <div className="text-center mb-8">
            <Link href="/custom-mix-builder">
              <Button
                size="lg"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Target className="w-5 h-5 ml-2" />
                הוסף תמהיל מותאם אישית
              </Button>
            </Link>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center space-y-6"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleContinueToAdvisor}
                  size="lg"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={uniformMixes.length === 0}
                >
                  <Calculator className="w-5 h-5 ml-2" />
                  העזר במומחה משכלנתא
                </Button>
                
                <Link href="/mortgage-planning">
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 py-4 text-lg border-2 border-gray-300 hover:border-gray-400"
                  >
                    <ArrowLeft className="w-5 h-5 ml-2" />
                    חזור לתכנון
                  </Button>
                </Link>
              </div>
            </div>

          </motion.div>
        </motion.div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <MortgageDetailsModal
          mix={showDetailsModal}
          isOpen={true}
          onClose={() => setShowDetailsModal(null)}
        />
      )}
    </div>
  );
}
