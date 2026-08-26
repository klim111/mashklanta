'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Home as HomeIcon, RefreshCw, Target, TrendingUp, Calculator, Banknote, FileText, Upload, Pencil, RotateCcw, X as XIcon, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatMoneyFields, parseFormattedNumberInput } from '@/lib/currency';
import NavBar from '@/components/ui/navbar';
import EquityCalculator from '@/components/ui/equitycalc';
import MortgageTermsTable from '@/components/mortgage-application/MortgageTermsTable';
import { BorrowerTypeSelection } from '@/components/mortgage-planning/BorrowerTypeSelection';
import { CouplePersonalInfoForm } from '@/components/mortgage-planning/CouplePersonalInfoForm';
import { FormSubmitButton } from '@/components/mortgage-planning/FormSubmitButton';
import {
  fieldErrorClassName,
  fieldErrorsFromList,
  getExistingPropertyFormErrors,
  getIndividualFormErrors,
} from '@/lib/mortgage-planning-validation';
import { cn } from '@/lib/utils';
import {
  calculateMaxProperty,
  calculateHealthInsuranceMonthly,
  getAffordabilityInputs,
  getHealthInsuranceRatePer100k,
  defaultMortgagePlanningUserData,
  emptyBorrower,
  createEmptyLoan,
  type MortgagePlanningUserData,
} from '@/lib/mortgage-affordability';
import { migrateMortgagePlanningUserData, sumIndividualLoanPayments } from '@/lib/borrower-loans';
import { INTEREST_RATES } from '@/lib/interest-rates';
import { LoanManagementOffer } from '@/components/mortgage-planning/LoanManagementOffer';
import { BorrowerLoansSection } from '@/components/mortgage-planning/BorrowerLoansSection';

type UserData = MortgagePlanningUserData;

type EntryFlow = 'affordability' | 'existing' | 'refinance';

export type MortgagePlanningPayload = {
  userData: MortgagePlanningUserData;
  currentStep: string;
};

export type MortgagePlanningEmbed = {
  /** בתוך דשבורד התהליך — בלי נאבבר, והשמירה עולה גם לחשבון */
  embedded?: boolean;
  initialPayload?: MortgagePlanningPayload | null;
  onPersist?: (payload: MortgagePlanningPayload) => void;
  /** אחרי שמירת הפרופיל בתהליך — מעבר לשלב בניית התמהיל */
  onProfileReady?: () => void;
};

type PlanningStep =
  | 'property-type'
  | 'calculation-type'
  | 'borrower-type'
  | 'personal-info'
  | 'personal-info-couple'
  | 'existing-property'
  | 'reverse-mortgage'
  | 'offer-analysis'
  | 'results'
  | 'profile-complete';

const AFFORDABILITY_CALCULATION = 'תחשב מה אני יכול להרשות לעצמי';
const EXISTING_PROPERTY_CALCULATION = 'תחשב משכנתא לנכס קיים';

function parseEntryFlow(value: string | null): EntryFlow | null {
  if (value === 'affordability' || value === 'existing' || value === 'refinance') {
    return value;
  }
  return null;
}

/**
 * בתהליך התכנון מדלגים על כושר ההחזר, נכס קיים ובדיקת הצעה — אחרי סוג
 * העסקה עוברים ישר לפרופיל, ובסופו אין מסך תוצאות.
 */
function normalizeEmbeddedStep(step: string, data: UserData): PlanningStep {
  if (step === 'results' || step === 'profile-complete') return 'profile-complete';
  if (
    step === 'calculation-type' ||
    step === 'existing-property' ||
    step === 'offer-analysis' ||
    step === 'reverse-mortgage'
  ) {
    if (data.applicationType === 'couple') return 'personal-info-couple';
    if (
      data.applicationType === 'individual' &&
      (data.monthlyIncome || data.age || data.ownCapital)
    ) {
      return 'personal-info';
    }
    return 'borrower-type';
  }
  return (step as PlanningStep) || 'property-type';
}

export function MortgagePlanningContent({
  embedded = false,
  initialPayload = null,
  onPersist,
  onProfileReady,
}: MortgagePlanningEmbed = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** הגעה מתוך תהליך תכנון — מציגים דרך חזרה אליו במקום להשאיר את הלקוח תלוי באוויר */
  const returnPlanId = embedded ? null : searchParams.get('fromPlan');
  const [currentStep, setCurrentStep] = useState<PlanningStep>('property-type');
  const [entryFlow, setEntryFlow] = useState<EntryFlow | null>(null);
  const [userData, setUserData] = useState<UserData>(defaultMortgagePlanningUserData());
  const [showEquityCalculator, setShowEquityCalculator] = useState(false);
  const [showCapitalWarning, setShowCapitalWarning] = useState(false);
  const [analyzedTerms, setAnalyzedTerms] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [personalInfoFieldErrors, setPersonalInfoFieldErrors] = useState<Record<string, boolean>>({});
  const [existingPropertyFieldErrors, setExistingPropertyFieldErrors] = useState<Record<string, boolean>>({});
  // Whether to deduct insurance costs from disposable income when computing max monthly payment.
  // Default: include insurance (per product requirement). User can toggle this off in the results view.
  const [includeInsurance, setIncludeInsurance] = useState(true);
  // User-overridden loan period (years) from the results-view slider. When null, the calculated
  // results.maxLoanPeriod is used as the effective period.
  const [selectedLoanPeriod, setSelectedLoanPeriod] = useState<number | null>(null);
  // User-overridden loan amount, controlled by the LTV / loan-amount / monthly-payment sliders
  // in the results view. When null, the calculated results.maxLoanAmount is used.
  const [selectedLoanAmount, setSelectedLoanAmount] = useState<number | null>(null);
  // User-overridden annual interest rate (as a percentage, e.g. 4.85). When null, the default
  // קל"צ rate from the central rates file is used. Allows users to plug in a personal bank quote
  // and see all results recalculate accordingly.
  const [userInterestRateOverride, setUserInterestRateOverride] = useState<number | null>(null);
  // Whether the inline rate-editor popover (next to the displayed rate) is open.
  const [isRateEditorOpen, setIsRateEditorOpen] = useState(false);
  // Local draft value for the rate input while the popover is open.
  const [rateEditorDraft, setRateEditorDraft] = useState<string>('');
  // Validation error message for the rate input (e.g. when out of range).
  const [rateEditorError, setRateEditorError] = useState<string>('');
  // Ref used to close the popover when the user clicks outside it.
  const rateEditorRef = useRef<HTMLDivElement | null>(null);

  const persistRef = useRef(onPersist);
  persistRef.current = onPersist;
  const profileReadyRef = useRef(onProfileReady);
  profileReadyRef.current = onProfileReady;
  const initialRef = useRef(initialPayload);
  const [hydrated, setHydrated] = useState(false);

  // Entry flow from home page (?flow=affordability|existing|refinance)
  useEffect(() => {
    setEntryFlow(parseEntryFlow(searchParams.get('flow')));
  }, [searchParams]);

  // Load data from localStorage on component mount — or from the תהליך, כשמוטמע
  useEffect(() => {
    const flowFromUrl = parseEntryFlow(searchParams.get('flow'));
    const payload = initialRef.current;

    if (payload?.userData) {
      try {
        const migrated = migrateMortgagePlanningUserData({
          ...defaultMortgagePlanningUserData(),
          ...payload.userData,
        });
        setUserData(
          formatMoneyFields(migrated as unknown as Record<string, unknown>) as unknown as MortgagePlanningUserData
        );
        let step = payload.currentStep || 'property-type';
        if (flowFromUrl && step === 'calculation-type') {
          step = 'property-type';
        }
        if (embedded) {
          step = normalizeEmbeddedStep(step, migrated as UserData);
        }
        setCurrentStep(step as PlanningStep);
      } catch (error) {
        console.error('Error loading plan planning data:', error);
      }
      setHydrated(true);
      return;
    }

    if (embedded) {
      setHydrated(true);
      return;
    }

    const savedData = localStorage.getItem('mortgagePlanningData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        const migrated = migrateMortgagePlanningUserData({
          ...defaultMortgagePlanningUserData(),
          ...parsedData.userData,
        });
        setUserData(formatMoneyFields(migrated as unknown as Record<string, unknown>) as unknown as MortgagePlanningUserData);
        let step = parsedData.currentStep || 'property-type';
        if (flowFromUrl && step === 'calculation-type') {
          step = 'property-type';
        }
        setCurrentStep(step as PlanningStep);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
    setHydrated(true);
  }, [searchParams, embedded]);

  // Load analyzed terms if available
  useEffect(() => {
    try {
      const termsData = localStorage.getItem('analyzedMortgageTerms');
      const textData = localStorage.getItem('extractedText');

      if (termsData) {
        setAnalyzedTerms(JSON.parse(termsData));
      }
      if (textData) {
        setExtractedText(textData);
      }
    } catch (error) {
      console.error('Error loading analyzed data:', error);
    }
  }, []);

  // Close the rate-editor popover on outside-click or Escape key for a natural popover UX.
  useEffect(() => {
    if (!isRateEditorOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rateEditorRef.current && target && !rateEditorRef.current.contains(target)) {
        setIsRateEditorOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsRateEditorOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isRateEditorOpen]);

  // Save data to localStorage whenever userData or currentStep changes
  useEffect(() => {
    if (!hydrated) return;
    if (!embedded) {
      localStorage.setItem('mortgagePlanningData', JSON.stringify({ userData, currentStep }));
    }
    persistRef.current?.({ userData, currentStep });
  }, [userData, currentStep, hydrated, embedded]);

  // Check capital sufficiency when property price or own capital changes
  useEffect(() => {
    if (currentStep === 'existing-property' && userData.propertyPrice && userData.ownCapital && userData.propertyType) {
      const propertyPrice = parseFormattedNumberInput(userData.propertyPrice);
      const ownCapital = parseFormattedNumberInput(userData.ownCapital);
      
      if (!isNaN(propertyPrice) && !isNaN(ownCapital) && propertyPrice > 0 && ownCapital > 0) {
        const capitalCheck = checkCapitalSufficiency(propertyPrice, ownCapital, userData.propertyType);
        setShowCapitalWarning(!capitalCheck.isSufficient);
      } else {
        setShowCapitalWarning(false);
      }
    }
  }, [userData.propertyPrice, userData.ownCapital, userData.propertyType, currentStep]);

  const clearSavedData = () => {
    localStorage.removeItem('mortgagePlanningData');
    setUserData(defaultMortgagePlanningUserData());
    setCurrentStep('property-type');
  };

  const goBackFromCalculationFlow = () => {
    setCurrentStep(embedded || entryFlow ? 'property-type' : 'calculation-type');
  };

  // Function to check if own capital is sufficient
  const checkCapitalSufficiency = (propertyPrice: number, ownCapital: number, propertyType: string) => {
    const ltvLimits = {
      'דירה ראשונה': 0.75,
      'דירה חליפית': 0.70,
      'דירה להשקעה': 0.50,
      'משכנתא לכל מטרה': 0.50
    };
    
    const maxLTV = ltvLimits[propertyType as keyof typeof ltvLimits] || 0.50;
    const requiredCapital = propertyPrice * (1 - maxLTV);
    
    return {
      isSufficient: ownCapital >= requiredCapital,
      requiredCapital,
      maxLTV: maxLTV * 100
    };
  };

  const handlePropertyTypeSelect = (type: string) => {
    const nextUserData = { ...userData, propertyType: type };

    // בתהליך התכנון אחרי סוג העסקה עוברים ישר לפרופיל, בלי שלוש אופציות החישוב
    if (embedded) {
      setUserData({ ...nextUserData, calculationType: AFFORDABILITY_CALCULATION });
      setCurrentStep('borrower-type');
      return;
    }

    if (type === 'משכנתא לכל מטרה') {
      setUserData(nextUserData);
      setCurrentStep('reverse-mortgage');
      return;
    }

    if (entryFlow === 'affordability') {
      setUserData({ ...nextUserData, calculationType: AFFORDABILITY_CALCULATION });
      setCurrentStep('borrower-type');
      return;
    }

    if (entryFlow === 'existing') {
      setUserData({ ...nextUserData, calculationType: EXISTING_PROPERTY_CALCULATION });
      setCurrentStep('existing-property');
      return;
    }

    if (entryFlow === 'refinance') {
      setUserData(nextUserData);
      router.push('/mortgage-refinance');
      return;
    }

    setUserData(nextUserData);
    setCurrentStep('calculation-type');
  };

  const handleCalculationTypeSelect = (type: string) => {
    setUserData({ ...userData, calculationType: type });
    if (type === 'תחשב מה אני יכול להרשות לעצמי') {
      setCurrentStep('borrower-type');
    } else {
      setCurrentStep('existing-property');
    }
  };

  const handleBorrowerTypeSelect = (type: 'individual' | 'couple') => {
    setUserData({
      ...userData,
      applicationType: type,
      borrower1: type === 'couple' ? emptyBorrower() : userData.borrower1,
      borrower2: type === 'couple' ? emptyBorrower() : userData.borrower2,
    });
    setCurrentStep(type === 'couple' ? 'personal-info-couple' : 'personal-info');
  };

  const renderPropertyTypeSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <div className="mb-6 flex justify-between items-center w-full max-w-4xl">
          {!embedded && (
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowRight className="w-4 h-4 mr-2" />
              חזור לעמוד הבית
            </Button>
          </Link>
          )}
          {(userData.propertyType || userData.calculationType || userData.ownCapital) && (
            <Button variant="outline" size="sm" onClick={clearSavedData} className="mb-4">
              <RefreshCw className="w-4 h-4 ml-2" />
              התחל מחדש
            </Button>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          כלי תכנון המשכנתא
        </h1>
        <p className="text-xl text-gray-600 mb-4">
          שילווה אותכם צעד אחר צעד למשכנתא הטובה ביותר בעבורך
        </p>
        <p className="text-lg text-gray-500">
          כן כן ממש כמו יועץ משכנתא אישי מבוסס בינה מלאכותית ואלגוריתמים כלכליים מתקדמים
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[
          { type: 'דירה ראשונה', icon: HomeIcon, color: 'blue', description: 'רכישת הדירה הראשונה שלך עם התנאים הטובים ביותר' },
          { type: 'דירה חליפית', icon: RefreshCw, color: 'green', description: 'מעבר לדירה חדשה עם מיחזור המשכנתא הקיימת' },
          { type: 'דירה להשקעה', icon: TrendingUp, color: 'purple', description: 'רכישת נכס להשקעה עם תשואה מקסימלית' },
          { type: 'משכנתא לכל מטרה', icon: Target, color: 'orange', description: 'משכנתא למטרות שונות - עסק, שיפוץ, או כל צורך אחר' }
        ].map((item, index) => (
          <motion.div
            key={item.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group cursor-pointer"
            onClick={() => handlePropertyTypeSelect(item.type)}
          >
            <Card className="h-full border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white shadow-lg hover:shadow-xl min-h-[280px]">
              <CardContent className="p-6 text-center h-full flex flex-col justify-between">
                <div>
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg ${
                    item.color === 'blue' ? 'bg-gradient-to-br from-blue-600 to-blue-700' :
                    item.color === 'green' ? 'bg-gradient-to-br from-green-600 to-green-700' :
                    item.color === 'purple' ? 'bg-gradient-to-br from-purple-600 to-purple-700' :
                    'bg-gradient-to-br from-orange-600 to-orange-700'
                  }`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`text-xl font-bold text-gray-900 mb-3 transition-colors ${
                    item.color === 'blue' ? 'group-hover:text-blue-600' :
                    item.color === 'green' ? 'group-hover:text-green-600' :
                    item.color === 'purple' ? 'group-hover:text-purple-600' :
                    'group-hover:text-orange-600'
                  }`}>
                    {item.type}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderCalculationTypeSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          איך תרצה להתחיל?
        </h2>
        <p className="text-lg text-gray-600">
          בחר את הדרך המתאימה לך ביותר
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          className="group cursor-pointer"
          onClick={() => handleCalculationTypeSelect('תחשב מה אני יכול להרשות לעצמי')}
        >
          <Card className="h-full border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white shadow-lg hover:shadow-xl min-h-[400px]">
            <CardContent className="p-8 text-center h-full flex flex-col justify-between">
              <div>
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Calculator className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  תחשב מה אני יכול להרשות לעצמי
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  הכלי ינתח את נתוני הלקוח ויחשב את ערך הנכס המקסימלי שהלקוח יכול להרשות לעצמו ומשם ימשיך תהליך תכנון המשכנתא
                </p>
              </div>
              <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700 font-semibold">
                <span>התחל כאן</span>
                <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          className="group cursor-pointer"
          onClick={() => handleCalculationTypeSelect('תחשב משכנתא לנכס קיים')}
        >
          <Card className="h-full border border-gray-200 hover:border-green-300 transition-all duration-300 bg-white shadow-lg hover:shadow-xl min-h-[400px]">
            <CardContent className="p-8 text-center h-full flex flex-col justify-between">
              <div>
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Banknote className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors">
                  תחשב משכנתא לנכס קיים
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  אתם מכירים את מחיר הנכס ומשכלנתא לוקחת אותכם צעד אחר צעד עד קבלת המשכנתא המשתלמת ביותר עבורכם
                </p>
              </div>
              <div className="flex items-center justify-center text-green-600 group-hover:text-green-700 font-semibold">
                <span>התחל כאן</span>
                <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          className="group cursor-pointer"
          onClick={() => setCurrentStep('offer-analysis')}
        >
          <Card className="h-full border border-gray-200 hover:border-purple-300 transition-all duration-300 bg-white shadow-lg hover:shadow-xl min-h-[400px]">
            <CardContent className="p-8 text-center h-full flex flex-col justify-between">
              <div>
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                  תבדוק הצעה שקיבלתי
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  מנתח את ההצעה שקיבלת בבנק ובודק אפשרויות שיפור התנאים
                </p>
              </div>
              <div className="flex items-center justify-center text-purple-600 group-hover:text-purple-700 font-semibold">
                <span>בדוק הצעה</span>
                <ArrowLeft className="w-5 h-5 ml-2 group-hover:-translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="text-center mt-8">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('property-type')}
          className="px-6 py-3"
        >
          <ArrowRight className="w-5 h-5 mr-2" />
          חזור
        </Button>
      </div>
    </motion.div>
  );

  const renderOfferAnalysisStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          בדיקת הצעת בנק
        </h2>
        <p className="text-lg text-gray-600">
          העלה מסמך הצעה מהבנק או הזן ידנית כדי שננתח ונבדוק שיפורים
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload card */}
        <Card className="border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-8 text-center flex flex-col h-full justify-between">
            <div>
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">העלה הצעת בנק</h3>
              <p className="text-gray-600 mb-6">תמוך בתמונות או PDF של מסמך ההצעה</p>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    id="bank-offer-upload"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        setIsAnalyzing(true);
                        const reader = new FileReader();
                        reader.onload = async () => {
                          try {
                            const imageData = String(reader.result);
                            localStorage.setItem('uploadedBankOffer', imageData);

                            // Send to API for analysis with OpenAI
                            const response = await fetch('/api/analyze-image', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ 
                                imageData, 
                                useOpenAI: true,
                                documentType: 'bank_offer' // This is a bank offer document
                              }),
                            });

                            if (response.ok) {
                              const result = await response.json();
                              setAnalyzedTerms(result.mortgageTerms);
                              setExtractedText(result.extractedText);
                              localStorage.setItem('analyzedMortgageTerms', JSON.stringify(result.mortgageTerms));
                              localStorage.setItem('extractedText', result.extractedText);
                              
                              // Show parsing method and confidence if available
                              if (result.parsingMethod === 'openai' && result.mortgageTerms.confidence) {
                                console.log(`Document parsed with OpenAI (confidence: ${result.mortgageTerms.confidence}%)`);
                              }
                            } else {
                              console.error('Error analyzing image:', await response.text());
                              alert('שגיאה בניתוח התמונה. נסה שוב.');
                            }
                          } catch (err) {
                            console.error('שגיאה בעיבוד התמונה:', err);
                            alert('שגיאה בעיבוד התמונה. נסה שוב.');
                          } finally {
                            setIsAnalyzing(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label 
                    htmlFor="bank-offer-upload"
                    className="cursor-pointer inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    onClick={() => console.log('Bank offer upload label clicked')}
                  >
                    בחר קובץ
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual entry card */}
        <Card className="border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-8 text-center flex flex-col h-full justify-between">
            <div>
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Calculator className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">הזנה ידנית</h3>
              <p className="text-gray-600 mb-6">פתח את כלי היועצים לבניית תמהיל והשוואת תנאים</p>
              <Button
                onClick={() => {
                  try {
                    localStorage.setItem('advisorEntryMode', 'manual-offer');
                  } catch (err) {}
                  window.location.href = '/mortgage-advisor';
                }}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white"
              >
                עבור לכלי היועצים
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Display analyzed mortgage terms if available */}
      {isAnalyzing && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            מנתח את התמונה...
          </div>
        </div>
      )}

      {analyzedTerms && (
        <div className="mt-8">
          <MortgageTermsTable terms={analyzedTerms} extractedText={extractedText} />
        </div>
      )}

      <div className="text-center mt-10">
        <Button
          variant="outline"
          onClick={goBackFromCalculationFlow}
          className="px-6 py-3"
        >
          <ArrowRight className="w-5 h-5 mr-2" />
          חזור
        </Button>
      </div>
    </motion.div>
  );

  const renderPersonalInfoForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          {embedded ? 'פרופיל הלקוח' : 'בוא נכיר'}
        </h2>
        <p className="text-lg text-gray-600">
          {embedded
            ? 'הכנסות, הון עצמי והלוואות — הפרטים האלה ישמשו לבניית התמהיל בשלב הבא'
            : 'כמה פרטים כדי שנוכל לחשב בדיוק מה אתה יכול להרשות לעצמך'}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="ownCapital" className="text-right block mb-2 text-lg font-medium">
            מה הוא ההון העצמי שלך?
          </Label>
          <FormattedNumberInput
            id="ownCapital"
            placeholder="₪"
            value={userData.ownCapital}
            onValueChange={(value) => setUserData({ ...userData, ownCapital: value })}
            className={cn(
              'text-right text-lg p-4 max-w-sm mx-auto',
              personalInfoFieldErrors.ownCapital && fieldErrorClassName
            )}
          />
        </div>

        <div>
          <Label htmlFor="age" className="text-right block mb-2 text-lg font-medium">
            מה הוא גילך?
          </Label>
          <Input
            id="age"
            type="number"
            placeholder="גיל"
            value={userData.age}
            onChange={(e) => setUserData({ ...userData, age: e.target.value })}
            className={cn(
              'text-right text-lg p-4 max-w-sm mx-auto',
              personalInfoFieldErrors.age && fieldErrorClassName
            )}
          />
        </div>

        <div>
          <Label htmlFor="monthlyIncome" className="text-right block mb-2 text-lg font-medium">
            מה ההכנסה החודשית שלך?
          </Label>
          <FormattedNumberInput
            id="monthlyIncome"
            placeholder="₪"
            value={userData.monthlyIncome}
            onValueChange={(value) => setUserData({ ...userData, monthlyIncome: value })}
            className={cn(
              'text-right text-lg p-4 max-w-sm mx-auto',
              personalInfoFieldErrors.monthlyIncome && fieldErrorClassName
            )}
          />
        </div>

        <div>
          <Label className="text-right block mb-4 text-lg font-medium">
            האם יש לך הלוואות שתקופת הפירעון שלהן מעל 18 חודשים?
          </Label>
          <div className="flex gap-4 justify-center">
            <Button
              variant={userData.loans.length > 0 ? "default" : "outline"}
              onClick={() =>
                setUserData({ ...userData, hasLoans: true, loans: [createEmptyLoan()] })
              }
              className="px-8 py-3"
            >
              כן
            </Button>
            <Button
              variant={userData.loans.length === 0 ? "default" : "outline"}
              onClick={() =>
                setUserData({
                  ...userData,
                  hasLoans: false,
                  loans: [],
                  monthlyLoanPayment: '',
                })
              }
              className="px-8 py-3"
            >
              לא
            </Button>
          </div>
        </div>

        {userData.loans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="space-y-4 max-w-sm mx-auto"
          >
            <BorrowerLoansSection
              loans={userData.loans}
              fieldKeyPrefix="individual"
              fieldErrors={personalInfoFieldErrors}
              onLoansChange={(loans) =>
                setUserData({ ...userData, loans, hasLoans: loans.length > 0 })
              }
            />

            <LoanManagementOffer
              userData={userData}
              mode="individual"
              planningStep="personal-info"
              onUserDataChange={setUserData}
            />
          </motion.div>
        )}

        <div className="flex gap-4 justify-center pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('borrower-type')}
            className="px-6 py-3"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            חזור
          </Button>
          <FormSubmitButton
            label={embedded ? 'שמירת הפרופיל' : 'הצג אפשרויות משכנתא'}
            errors={getIndividualFormErrors(userData)}
            onInvalidAttempt={() =>
              setPersonalInfoFieldErrors(fieldErrorsFromList(getIndividualFormErrors(userData)))
            }
            onValidClick={() => setCurrentStep(embedded ? 'profile-complete' : 'results')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          />
        </div>
      </div>
    </motion.div>
  );

  const renderExistingPropertyForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          פרטי הנכס
        </h2>
        <p className="text-lg text-gray-600">
          ספר לנו על הנכס שאתה מעוניין לרכוש
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="propertyPrice" className="text-right block mb-2 text-lg font-medium">
            מחיר הנכס
          </Label>
          <FormattedNumberInput
            id="propertyPrice"
            placeholder="₪"
            value={userData.propertyPrice}
            onValueChange={(value) => setUserData({ ...userData, propertyPrice: value })}
            className={cn(
              'text-right text-lg p-4 max-w-sm mx-auto',
              existingPropertyFieldErrors.propertyPrice && fieldErrorClassName
            )}
          />
        </div>

        <div>
          <Label htmlFor="ownCapitalExisting" className="text-right block mb-2 text-lg font-medium">
            ההון העצמי שלך
          </Label>
          <div className="flex gap-2 max-w-md mx-auto">
            <FormattedNumberInput
              id="ownCapitalExisting"
              placeholder="₪"
              value={userData.ownCapital}
              onValueChange={(value) => setUserData({ ...userData, ownCapital: value })}
              className={cn(
                'text-right text-lg p-4 flex-1',
                existingPropertyFieldErrors.ownCapitalExisting && fieldErrorClassName
              )}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEquityCalculator(true)}
                className="px-4 py-3 whitespace-nowrap text-sm"
              >
                מחשבון הון עצמי
              </Button>
              <Link href="/equity-planning">
                <Button
                  className="px-4 py-3 whitespace-nowrap text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  תכנון מתקדם
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Capital Warning */}
          {showCapitalWarning && userData.propertyPrice && userData.ownCapital && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 max-w-md mx-auto"
            >
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-orange-800 font-medium text-sm mb-2">
                      ההון העצמי שמוזן אינו מספיק לפי הגבלות בנק ישראל
                    </p>
                    <p className="text-orange-700 text-sm mb-3">
                      פנה ליועץ משכלנתא לבדיקת אפשרויות מימון להגדלת ההון העצמי
                    </p>
                    
                    {(() => {
                      const propertyPrice = parseFormattedNumberInput(userData.propertyPrice);
                      const ownCapital = parseFormattedNumberInput(userData.ownCapital);
                      const capitalCheck = checkCapitalSufficiency(propertyPrice, ownCapital, userData.propertyType);
                      
                      const ltvExplanations = {
                        'דירה ראשונה': '25% מערך הנכס',
                        'דירה חליפית': '30% מערך הנכס', 
                        'דירה להשקעה': '50% מערך הנכס',
                        'משכנתא לכל מטרה': '50% מערך הנכס'
                      };
                      
                      return (
                        <div className="text-xs text-orange-700 space-y-1 mb-3">
                          <p className="font-medium">
                            עבור {userData.propertyType}, ההון העצמי הנדרש הוא {ltvExplanations[userData.propertyType as keyof typeof ltvExplanations]}
                          </p>
                          <p>
                            ההון העצמי המינימלי הנדרש: <span className="font-semibold">₪{capitalCheck.requiredCapital.toLocaleString()}</span>
                          </p>
                          <p>
                            ההון העצמי שלך: ₪{ownCapital.toLocaleString()}
                          </p>
                          <p className="text-red-600 font-medium">
                            חסר: ₪{(capitalCheck.requiredCapital - ownCapital).toLocaleString()}
                          </p>
                        </div>
                      );
                    })()}
                    
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-sm py-2 shadow-md hover:shadow-lg transition-all duration-300 mt-3"
                      onClick={() => {
                        // Here you can add logic to contact advisor
                        alert('יועץ משכלנתא ייצור איתך קשר בקרוב!');
                      }}
                    >
                      <Target className="w-4 h-4 ml-2" />
                      פנה ליועץ משכלנתא
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex gap-4 justify-center pt-6">
          <Button
            variant="outline"
            onClick={goBackFromCalculationFlow}
            className="px-6 py-3"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            חזור
          </Button>
          <FormSubmitButton
            label="הצג אפשרויות משכנתא"
            errors={getExistingPropertyFormErrors(userData)}
            onInvalidAttempt={() =>
              setExistingPropertyFieldErrors(
                fieldErrorsFromList(getExistingPropertyFormErrors(userData))
              )
            }
            onValidClick={() => setCurrentStep('results')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          />
        </div>
      </div>
    </motion.div>
  );

  const renderReverseMortgageForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-lg mx-auto"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          משכנתא לכל מטרה
        </h2>
        <p className="text-lg text-gray-600">
          ספר לנו על הנכס שבבעלותך כדי לחשב כמה הלוואה אתה יכול לקבל
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="currentPropertyPrice" className="text-right block mb-2 text-lg font-medium">
            מחיר הנכס שבבעלותך
          </Label>
          <Input
            id="currentPropertyPrice"
            type="number"
            placeholder="₪"
            value={userData.currentPropertyPrice}
            onChange={(e) => setUserData({ ...userData, currentPropertyPrice: e.target.value })}
            className="text-right text-lg p-4 max-w-sm mx-auto"
          />
        </div>

        <div>
          <Label className="text-right block mb-4 text-lg font-medium">
            האם יש לך משכנתא על הנכס?
          </Label>
          <div className="flex gap-4 justify-center">
            <Button
              variant={userData.hasCurrentMortgage ? "default" : "outline"}
              onClick={() => setUserData({ ...userData, hasCurrentMortgage: true })}
              className="px-8 py-3"
            >
              כן
            </Button>
            <Button
              variant={!userData.hasCurrentMortgage ? "default" : "outline"}
              onClick={() => setUserData({ ...userData, hasCurrentMortgage: false })}
              className="px-8 py-3"
            >
              לא
            </Button>
          </div>
        </div>

        {userData.hasCurrentMortgage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="remainingMortgageAmount" className="text-right block mb-2 text-lg font-medium">
                מה סכום המשכנתא שנותרה?
              </Label>
              <Input
                id="remainingMortgageAmount"
                type="number"
                placeholder="₪"
                value={userData.remainingMortgageAmount}
                onChange={(e) => setUserData({ ...userData, remainingMortgageAmount: e.target.value })}
                className="text-right text-lg p-4 max-w-sm mx-auto"
              />
            </div>
          </motion.div>
        )}

        <div>
          <Label className="text-right block mb-4 text-lg font-medium">
            האם אתה מעל גיל 55?
          </Label>
          <div className="flex gap-4 justify-center">
            <Button
              variant={userData.isOver55 ? "default" : "outline"}
              onClick={() => setUserData({ ...userData, isOver55: true })}
              className="px-8 py-3"
            >
              כן
            </Button>
            <Button
              variant={!userData.isOver55 ? "default" : "outline"}
              onClick={() => setUserData({ ...userData, isOver55: false })}
              className="px-8 py-3"
            >
              לא
            </Button>
          </div>
        </div>

        {/* Reverse Mortgage Eligibility Check */}
        {userData.isOver55 && userData.currentPropertyPrice && (
          (() => {
            const currentPropertyPrice = parseFloat(userData.currentPropertyPrice) || 0;
            const remainingMortgage = parseFloat(userData.remainingMortgageAmount) || 0;
            const ownedValue = currentPropertyPrice - remainingMortgage;
            const isEligible = ownedValue >= 1000000;
            
            return isEligible ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-green-50 border border-green-200 rounded-lg p-6 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-green-800">
                    אתה זכאי למשכנתא הפוכה!
                  </h3>
                  <div className="relative group cursor-pointer">
                    <div className="w-6 h-6 bg-green-100 hover:bg-green-200 rounded-full flex items-center justify-center transition-colors duration-200">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute right-0 top-8 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900 mb-3">יתרונות משכנתא הפוכה:</p>
                        <div className="text-gray-700 space-y-2 text-right">
                          <p>• <span className="font-medium">אחוז מימון גבוה יותר:</span> עד 60% מערך הנכס שבבעלותך (לעומת 50% במשכנתא לכל מטרה)</p>
                          <p>• <span className="font-medium">אין עמלות פירעון מוקדם:</span> חיסכון משמעותי בעמלות</p>
                          <p>• <span className="font-medium">החזר חודשי גמיש:</span> נקבע על ידי הלקוח - יכול להיות הריבית בלבד</p>
                          <p>• <span className="font-medium">גמישות מקסימלית:</span> התאמה מלאה לצרכים שלך</p>
                        </div>
                      </div>
                      <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                    </div>
                  </div>
                </div>
                <p className="text-green-700 mb-4">
                  ערך הנכס שבבעלותך: ₪{ownedValue.toLocaleString()}
                </p>
                <Button
                  onClick={() => {
                    // Navigate to reverse mortgage calculation
                    setCurrentStep('results');
                  }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Target className="w-5 h-5 ml-2" />
                  בדוק משכנתא הפוכה
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center"
              >
                <h3 className="text-xl font-bold text-orange-800 mb-3">
                  לא זכאי למשכנתא הפוכה
                </h3>
                <p className="text-orange-700 mb-2">
                  ערך הנכס שבבעלותך: ₪{ownedValue.toLocaleString()}
                </p>
                <p className="text-orange-600 text-sm">
                  נדרש ערך נכס של לפחות ₪1,000,000 למשכנתא הפוכה
                </p>
              </motion.div>
            );
          })()
        )}

        <div className="flex gap-4 justify-center pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('property-type')}
            className="px-6 py-3"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            חזור
          </Button>
          <Button
            onClick={() => {
              setCurrentStep('results');
            }}
            disabled={!userData.currentPropertyPrice}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            כמה הלוואת משכנתא הפוכה אני יכול לקבל
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderResults = () => {
    // Handle reverse mortgage calculation
    if (userData.propertyType === 'משכנתא לכל מטרה') {
      const currentPropertyPrice = parseFloat(userData.currentPropertyPrice) || 0;
      const remainingMortgage = parseFloat(userData.remainingMortgageAmount) || 0;
      const ownedValue = currentPropertyPrice - remainingMortgage;
      const reverseMortgageAmount = ownedValue * 0.6; // 60% of owned value
      
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              משכנתא לכל מטרה - התוצאות שלך
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 inline-block shadow-sm">
              <h3 className="text-xl font-bold text-blue-800 mb-2">
                חישוב משכנתא הפוכה
              </h3>
              <p className="text-blue-700 font-medium">
                עד 60% מערך הנכס שבבעלותך
              </p>
              <p className="text-blue-600 text-sm mt-1">
                מחיר נכס: ₪{currentPropertyPrice.toLocaleString()} | יתרת משכנתא: ₪{remainingMortgage.toLocaleString()}
              </p>
            </div>
            <p className="text-lg text-gray-600">
              בהתבסס על הנכס שבבעלותך, הנה כמה הלוואה אתה יכול לקבל
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[160px] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">מחיר הנכס</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">
                  ₪{currentPropertyPrice.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">ערך הנכס הנוכחי</p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[160px] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">יתרת משכנתא</h3>
                <p className="text-3xl font-bold text-red-600 mb-2">
                  ₪{remainingMortgage.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {userData.hasCurrentMortgage ? 'סכום שנותר לתשלום' : 'אין משכנתא קיימת'}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[160px] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">ערך בבעלותך</h3>
                <p className="text-3xl font-bold text-green-600 mb-2">
                  ₪{ownedValue.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">מחיר נכס פחות יתרת משכנתא</p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[160px] flex flex-col justify-center bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
                <h3 className="text-xl font-bold text-purple-900 mb-4">משכנתא הפוכה אפשרית</h3>
                <p className="text-3xl font-bold text-purple-600 mb-2">
                  ₪{reverseMortgageAmount.toLocaleString()}
                </p>
                <p className="text-sm text-purple-700 font-medium">עד 60% מערך הנכס שבבעלותך</p>
              </Card>
            </motion.div>
          </div>

          <div className="text-center space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-3">חשוב לדעת</h3>
              <div className="text-sm text-yellow-700 space-y-2 text-right">
                <p>• הסכום מחושב על בסיס ערך הנכס שבבעלותך בפועל</p>
                <p>• התנאים הסופיים ייקבעו בהתאם לגילך ולמצב הבריאותי</p>
                <p>• מומלץ להתייעץ עם יועץ משכלנתא לקבלת פרטים נוספים</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('reverse-mortgage')}
                className="px-6 py-3"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                חזור
              </Button>
              {!embedded && (
              <Link href="/uniform-mixes">
                <Button
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Target className="w-5 h-5 ml-2" />
                  בוא המשך לתכנון המשכנתא
                </Button>
              </Link>
              )}
              <Button
                onClick={() => {
                  alert('יועץ משכלנתא ייצור איתך קשר בקרוב לפרטים נוספים!');
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Target className="w-5 h-5 ml-2" />
                פנה ליועץ משכלנתא
              </Button>
            </div>
          </div>
        </motion.div>
      );
    }
    
    if (userData.calculationType === 'תחשב מה אני יכול להרשות לעצמי') {
      const results = calculateMaxProperty(userData, {
        includeInsurance,
        interestRateOverride: userInterestRateOverride ?? undefined,
        // Use the user-selected loan period from the slider so the max property / loan
        // values shrink for shorter periods (and grow for longer ones, up to the bank max).
        loanPeriodOverride: selectedLoanPeriod ?? undefined,
      });
      const aggregated = getAffordabilityInputs(userData);
      const defaultRate = INTEREST_RATES.fixed_unlinked;
      const isRateOverridden = userInterestRateOverride !== null;

      // Open the rate-editor popover, pre-filling the input with the currently-effective rate.
      const openRateEditor = () => {
        setRateEditorDraft(results.interestRate.toFixed(2));
        setRateEditorError('');
        setIsRateEditorOpen(true);
      };

      // Validate the draft and persist it as the new override; closes the popover on success.
      const submitRateEditor = () => {
        const normalized = rateEditorDraft.trim().replace(',', '.');
        const value = Number(normalized);
        if (!Number.isFinite(value) || value <= 0) {
          setRateEditorError('יש להזין ערך מספרי גדול מ-0');
          return;
        }
        if (value > 20) {
          setRateEditorError('ערך גבוה מדי - יש להזין ריבית שנתית באחוזים (לדוגמה: 4.85)');
          return;
        }
        setUserInterestRateOverride(Math.round(value * 100) / 100);
        setIsRateEditorOpen(false);
      };

      // Clear the override and fall back to the central default rate.
      const resetRateEditor = () => {
        setUserInterestRateOverride(null);
        setIsRateEditorOpen(false);
      };
      const isCouple = userData.applicationType === 'couple';

      // Effective loan period: user override from slider, else the bank-allowed maximum.
      const effectiveLoanPeriod = selectedLoanPeriod ?? results.maxLoanPeriod;

      // Effective loan amount: user override from any of the three sliders below,
      // else the calculated maximum. All other displayed values derive from this.
      const effectiveLoanAmount = Math.max(
        0,
        selectedLoanAmount ?? results.maxLoanAmount
      );
      const effectivePropertyPrice = aggregated.ownCapital + effectiveLoanAmount;
      const effectiveLTV =
        effectivePropertyPrice > 0
          ? (effectiveLoanAmount / effectivePropertyPrice) * 100
          : 0;

      // Bank-of-Israel maximum LTV per property type.
      const maxLTVByPropertyType: Record<string, number> = {
        'דירה ראשונה': 75,
        'דירה חליפית': 70,
        'דירה להשקעה': 50,
        'משכנתא לכל מטרה': 50,
      };
      const maxLTVPct = maxLTVByPropertyType[userData.propertyType] ?? 50;

      // PMT-based monthly payment for the (variable) loan amount at the chosen period.
      const calcMonthlyPmt = (principal: number, annualRate: number, years: number) => {
        if (principal <= 0 || years <= 0) return 0;
        const r = annualRate / 12;
        const n = years * 12;
        if (r === 0) return principal / n;
        return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      };
      const displayMonthlyPayment = Math.floor(
        calcMonthlyPmt(effectiveLoanAmount, results.interestRate / 100, effectiveLoanPeriod)
      );

      // Insurance breakdown.
      // - Property insurance is fixed (it depends on apartment area and reinstatement value, not the loan).
      // - Health/life insurance scales linearly with the insured loan amount.
      const propertyInsuranceMonthly = results.includesInsurance
        ? results.propertyInsuranceMonthly
        : 0;
      const healthInsuranceRatePer100k = results.includesInsurance
        ? getHealthInsuranceRatePer100k(aggregated.age)
        : 0;
      const effectiveHealthInsuranceMonthly = results.includesInsurance
        ? Math.round(calculateHealthInsuranceMonthly(effectiveLoanAmount, aggregated.age))
        : 0;
      const effectiveTotalInsuranceMonthly =
        propertyInsuranceMonthly + effectiveHealthInsuranceMonthly;
      const displayTotalMonthly = displayMonthlyPayment + effectiveTotalInsuranceMonthly;

      // Bank-of-Israel limit violations (used to color values red and explain the breach).
      const exceedsMaxPayment = displayMonthlyPayment > results.maxMonthlyPayment;
      const exceedsMaxLoan = effectiveLoanAmount > results.maxLoanAmount + 0.5;
      const exceedsMaxLTV = effectiveLTV > maxLTVPct + 0.05;
      const anyLimitBreached = exceedsMaxPayment || exceedsMaxLoan || exceedsMaxLTV;

      // Annuity factor at the current rate and period (used by the payment slider to map a chosen
      // monthly payment back to a loan amount).
      const monthlyInterestRate = results.interestRate / 100 / 12;
      const numPaymentsCount = effectiveLoanPeriod * 12;
      const annuityFactor =
        monthlyInterestRate > 0 && numPaymentsCount > 0
          ? (1 - Math.pow(1 + monthlyInterestRate, -numPaymentsCount)) / monthlyInterestRate
          : numPaymentsCount;

      // Slider handlers — every slider funnels into selectedLoanAmount so all values stay in sync.
      const handleLTVSliderChange = (newPct: number) => {
        if (aggregated.ownCapital <= 0) return;
        const newLtvRatio = Math.min(0.99, Math.max(0, newPct / 100));
        const newLoan = (aggregated.ownCapital * newLtvRatio) / (1 - newLtvRatio);
        setSelectedLoanAmount(Math.max(0, Math.round(newLoan)));
      };
      const handleLoanAmountSliderChange = (newLoan: number) => {
        setSelectedLoanAmount(Math.max(0, Math.round(newLoan)));
      };
      // The payment slider operates on the TOTAL monthly payment (bank installment + health/life
      // insurance + property insurance) — i.e. the same figure that the Bank-of-Israel 40% rule
      // applies to. Given a desired total T, solve for the loan L such that:
      //   T = L / annuityFactor + L × healthRate / 100,000 + propertyInsurance
      // ⇒ L = (T − propertyInsurance) / (1/annuityFactor + healthRate / 100,000)
      const handleMonthlyPaymentSliderChange = (newTotal: number) => {
        if (annuityFactor <= 0) return;
        const denominator =
          1 / annuityFactor + healthInsuranceRatePer100k / 100_000;
        if (denominator <= 0) return;
        const bankAndHealth = Math.max(0, newTotal - propertyInsuranceMonthly);
        const newLoan = bankAndHealth / denominator;
        setSelectedLoanAmount(Math.max(0, Math.round(newLoan)));
      };

      // Slider upper bounds (per the user's requirements).
      const ltvSliderMax = maxLTVPct;
      const loanSliderMax = Math.max(0, results.maxLoanAmount);
      // The payment slider's natural max is the maximum TOTAL monthly payment that can actually
      // be reached given ALL Bank-of-Israel constraints (the 40% income rule AND the LTV cap).
      // It is computed as the total payment when the loan equals results.maxLoanAmount — i.e. the
      // upper-bound loan we already enforce on the loan-amount slider. This guarantees the user
      // cannot drag the payment slider to a value that would push the property price above its
      // calculated maximum.
      const maxBankPaymentAtMaxLoan = Math.floor(
        calcMonthlyPmt(
          results.maxLoanAmount,
          results.interestRate / 100,
          effectiveLoanPeriod
        )
      );
      const paymentSliderMax = Math.max(
        0,
        maxBankPaymentAtMaxLoan + results.totalInsuranceMonthly
      );
      // Step sizes that feel natural for each domain.
      const loanSliderStep = Math.max(1000, Math.round(loanSliderMax / 500 / 1000) * 1000);
      const paymentSliderStep = Math.max(50, Math.round(paymentSliderMax / 500 / 50) * 50);

      // Slider values clamped into their visual range. When a derived value exceeds the slider's
      // upper bound (only the LTV slider can drive this), the thumb sits at the maximum and a red
      // overflow value is displayed beside it.
      const ltvSliderValue = Math.min(ltvSliderMax, Math.max(0, effectiveLTV));
      const loanSliderValue = Math.min(loanSliderMax, effectiveLoanAmount);
      const paymentSliderValue = Math.min(paymentSliderMax, displayTotalMonthly);

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              התוצאות שלך
            </h2>
            <p className="text-sm md:text-base text-gray-700 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span className="font-bold">הנתונים שלך:</span>
              <span>
                גיל <span className="font-semibold">{aggregated.age || '—'}</span>
                {isCouple ? ' (הלווה הצעיר)' : ''}
              </span>
              <span className="text-gray-400">|</span>
              <span>
                הון עצמי{' '}
                <span className="font-semibold">
                  ₪{aggregated.ownCapital.toLocaleString()}
                </span>
              </span>
              <span className="text-gray-400">|</span>
              <span>
                הכנסה פנויה{' '}
                <span className="font-semibold">
                  ₪{aggregated.disposableIncome.toLocaleString()}
                </span>
              </span>
            </p>
            {isCouple && (
              <p className="text-xs text-green-700 mt-1">
                חישוב משוקלל לזוג — הכנסה משותפת ופיזור סיכון בין שני הלווים
              </p>
            )}
          </div>

          {/* Simulation rate note — sits above the row of result cards.
              The rate is clickable: opens an inline editor that lets the user plug in a
              personal bank quote; all downstream results recalculate accordingly. The number
              of years is bound to the loan-period slider so it stays in sync. */}
          <div className="text-center mb-3 text-xs text-gray-600 flex items-center justify-center gap-1.5 flex-wrap">
            <span>
              הסימולציה מחושבת לפי ריבית קבוע לא צמודה (קל&quot;ץ){' '}
              {isRateOverridden ? 'שהזנת' : 'משוערת'} של{' '}
              <span ref={rateEditorRef} className="relative inline-block align-middle">
                <button
                  type="button"
                  onClick={() => (isRateEditorOpen ? setIsRateEditorOpen(false) : openRateEditor())}
                  className={cn(
                    'font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed transition-colors duration-150 cursor-pointer',
                    isRateOverridden
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                  )}
                  title="לחץ כדי להזין את הריבית שקיבלת מהבנק"
                  aria-haspopup="dialog"
                  aria-expanded={isRateEditorOpen}
                >
                  {results.interestRate.toFixed(2)}%
                  <Pencil className="w-3 h-3 opacity-70" aria-hidden="true" />
                </button>

                <AnimatePresence>
                  {isRateEditorOpen && (
                    <motion.div
                      role="dialog"
                      aria-label="עריכת ריבית הסימולציה"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-40 top-full mt-2 left-1/2 -translate-x-1/2 w-[20rem] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-right text-gray-800 font-normal"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">
                            הזן את הריבית שקיבלת מהבנק
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            כל החישובים יתעדכנו אוטומטית לפי הריבית שתזין
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsRateEditorOpen(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label="סגור"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="relative mt-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          autoFocus
                          value={rateEditorDraft}
                          onChange={(event) => {
                            setRateEditorDraft(event.target.value);
                            if (rateEditorError) setRateEditorError('');
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              submitRateEditor();
                            }
                          }}
                          placeholder="לדוגמה: 4.85"
                          className="pr-8 text-right font-semibold text-base"
                          aria-invalid={Boolean(rateEditorError)}
                          aria-describedby={rateEditorError ? 'rate-editor-error' : undefined}
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 text-sm pointer-events-none">
                          %
                        </span>
                      </div>

                      {rateEditorError && (
                        <p
                          id="rate-editor-error"
                          className="text-xs text-red-600 mt-1.5"
                          role="alert"
                        >
                          {rateEditorError}
                        </p>
                      )}

                      <div className="flex flex-col gap-2 mt-3">
                        <Button
                          type="button"
                          size="sm"
                          onClick={submitRateEditor}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          שמור וחשב מחדש
                        </Button>
                        {isRateOverridden && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={resetRateEditor}
                            className="w-full text-gray-700 border-gray-300 hover:bg-gray-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
                            חזור לריבית המשוערת ({defaultRate.toFixed(2)}%)
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </span>{' '}
              ל-<span className="font-semibold">{effectiveLoanPeriod}</span> שנים
            </span>
            <span className="relative group inline-block align-middle cursor-pointer">
              <span className="w-4 h-4 bg-gray-200 hover:bg-gray-300 rounded-full inline-flex items-center justify-center transition-colors duration-200 align-middle">
                <svg
                  className="w-3 h-3 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="absolute left-1/2 -translate-x-1/2 top-6 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-30 text-sm text-gray-700 font-normal text-right whitespace-normal">
                לחיצה על הריבית מאפשרת להזין את ההצעה שקיבלת מהבנק - כל החישובים יתעדכנו בהתאם.
                הריבית המשוערת נועדה לסימולציה בלבד; הריביות הסופיות כפופות להיסטוריית האשראי של
                הלקוח, לאופן בניית התמהיל, אחוז המימון, תקופת המשכנתא ולתוצאות תהליך המיקוח מול
                הגופים הממנים.
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45" />
              </span>
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 lg:grid-flow-row-dense gap-3 mb-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {effectivePropertyPrice >= results.maxPropertyPrice && !exceedsMaxLoan && !exceedsMaxLTV
                        ? 'מחיר נכס מקסימלי'
                        : 'מחיר הנכס'}
                    </h3>
                    <div className="relative group cursor-pointer">
                      <div className="w-5 h-5 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors duration-200">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="absolute right-0 top-7 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10">
                        <div className="text-xs text-right">
                          <p className="font-semibold text-gray-900 mb-1">איך זה מחושב?</p>
                          <p className="text-gray-700 mb-1">
                            מחיר הנכס נגזר מההון העצמי שלך ומאחוז המימון שתבחר —
                            מחיר נכס = הון עצמי ÷ (1 - אחוז מימון).
                          </p>
                          <p className="text-blue-600 font-medium">
                            הזזת הסליידר תשנה את כל הערכים בעמוד בהתאם.
                          </p>
                        </div>
                        <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                      </div>
                    </div>
                  </div>

                  <p className="text-2xl font-bold text-blue-600 mb-1">
                    ₪{effectivePropertyPrice.toLocaleString()}
                  </p>

                  <p className="text-gray-600 text-xs mb-2">
                    אחוז מימון מקסימלי מותר ל
                    {userData.propertyType ? userData.propertyType : 'נכס'}:{' '}
                    <span className="font-semibold text-gray-800">{maxLTVPct}%</span>
                  </p>

                  <div className="mb-1">
                    <div className="flex justify-between items-baseline mb-2.5">
                      <span className="text-xs text-gray-700">
                        אחוז מימון נבחר:{' '}
                        <span className="font-semibold text-blue-700">
                          {effectiveLTV.toFixed(1)}%
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">עד {maxLTVPct}%</span>
                    </div>
                    <div dir="ltr">
                      <Slider
                        dir="ltr"
                        value={[ltvSliderValue]}
                        onValueChange={([v]) => handleLTVSliderChange(v)}
                        min={0}
                        max={ltvSliderMax}
                        step={0.5}
                        disabled={aggregated.ownCapital <= 0}
                      />
                      <div
                        className="flex justify-between text-xs text-gray-500 mt-1"
                        dir="ltr"
                      >
                        <span>0%</span>
                        <span>{maxLTVPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card
                className={`p-4 hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between ${
                  exceedsMaxLoan ? 'border-2 border-red-300 bg-red-50/30' : ''
                }`}
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {effectiveLoanAmount >= loanSliderMax && !exceedsMaxLoan
                      ? 'סכום משכנתא מקסימלי'
                      : 'סכום משכנתא'}
                  </h3>
                  <p
                    className={`text-2xl font-bold mb-1 ${
                      exceedsMaxLoan ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    ₪{effectiveLoanAmount.toLocaleString()}
                  </p>
                  {(() => {
                    const totalPaid = displayMonthlyPayment * 12 * effectiveLoanPeriod;
                    const totalInterest = Math.max(0, totalPaid - effectiveLoanAmount);
                    return (
                      <div className="space-y-0.5 text-xs mb-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            לאורך {effectiveLoanPeriod} שנים ישולמו
                          </span>
                          <span className="font-semibold text-gray-900">
                            ₪{Math.round(totalPaid).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">מתוכם תשלום עבור הריביות</span>
                          <span className="font-semibold text-gray-900">
                            ₪{Math.round(totalInterest).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mb-1">
                    <div className="flex justify-between items-baseline mb-2.5">
                      <span className="text-xs text-gray-700">סכום משכנתא נבחר</span>
                      <span className="text-xs text-gray-500">
                        עד ₪{loanSliderMax.toLocaleString()}
                      </span>
                    </div>
                    <div dir="ltr">
                      <Slider
                        dir="ltr"
                        value={[loanSliderValue]}
                        onValueChange={([v]) => handleLoanAmountSliderChange(v)}
                        min={0}
                        max={loanSliderMax}
                        step={loanSliderStep}
                        disabled={loanSliderMax <= 0}
                      />
                      <div
                        className="flex justify-between text-xs text-gray-500 mt-1"
                        dir="ltr"
                      >
                        <span>₪0</span>
                        <span>₪{loanSliderMax.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {exceedsMaxLoan && (
                  <div className="mt-3 flex items-start gap-2 bg-red-100 border border-red-300 rounded-md p-2">
                    <svg
                      className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-red-800 leading-snug">
                      חרגת ממגבלת בנק ישראל — סכום המשכנתא חורג מהמותר ביחס להחזר חודשי
                      (לא יותר מ-40% מההכנסה הפנויה).
                      <span className="block text-red-700 mt-0.5">
                        סכום מקסימלי מאושר: ₪{results.maxLoanAmount.toLocaleString()}
                      </span>
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card
                className={`p-4 hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between ${
                  exceedsMaxPayment ? 'border-2 border-red-300 bg-red-50/30' : ''
                }`}
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">החזר חודשי צפוי</h3>
                  {results.includesInsurance ? (
                    <>
                      <p
                        className={`text-2xl font-bold mb-1 ${
                          exceedsMaxPayment ? 'text-red-600' : 'text-purple-600'
                        }`}
                      >
                        ₪{displayTotalMonthly.toLocaleString()}
                      </p>
                      <div className="space-y-0.5 text-xs mb-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">החזר על חשבון לבנק</span>
                          <span
                            className={`font-medium ${
                              exceedsMaxPayment ? 'text-red-700' : 'text-gray-900'
                            }`}
                          >
                            ₪{displayMonthlyPayment.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">תשלום עבור ביטוחים</span>
                          <span className="font-medium text-gray-900">
                            ₪{effectiveTotalInsuranceMonthly.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-0.5 mt-0.5">
                          <span className="font-semibold text-gray-700">סה״כ חודשי</span>
                          <span
                            className={`font-bold ${
                              exceedsMaxPayment ? 'text-red-600' : 'text-purple-600'
                            }`}
                          >
                            ₪{displayTotalMonthly.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p
                      className={`text-2xl font-bold mb-1 ${
                        exceedsMaxPayment ? 'text-red-600' : 'text-purple-600'
                      }`}
                    >
                      ₪{displayMonthlyPayment.toLocaleString()}
                    </p>
                  )}

                  <div className="mb-1">
                    <div className="flex justify-between items-baseline mb-2.5">
                      <span className="text-xs text-gray-700">
                        החזר חודשי נבחר:{' '}
                        <span
                          className={`font-semibold ${
                            exceedsMaxPayment ? 'text-red-700' : 'text-purple-700'
                          }`}
                        >
                          ₪{displayTotalMonthly.toLocaleString()}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">
                        עד ₪{paymentSliderMax.toLocaleString()}
                      </span>
                    </div>
                    <div dir="ltr">
                      <Slider
                        dir="ltr"
                        value={[paymentSliderValue]}
                        onValueChange={([v]) => handleMonthlyPaymentSliderChange(v)}
                        min={0}
                        max={paymentSliderMax}
                        step={paymentSliderStep}
                        disabled={paymentSliderMax <= 0}
                      />
                      <div
                        className="flex justify-between text-xs text-gray-500 mt-1"
                        dir="ltr"
                      >
                        <span>₪0</span>
                        <span>₪{paymentSliderMax.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      מקסימום לפי בנק ישראל: 40% מההכנסה הפנויה
                    </p>
                    <div className="mt-1.5 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIncludeInsurance((prev) => !prev)}
                        className={`whitespace-nowrap text-xs h-6 px-2 ${
                          results.includesInsurance
                            ? 'border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {results.includesInsurance
                          ? 'התעלם מעלויות הביטוח'
                          : 'כלול עלויות ביטוחים'}
                      </Button>
                      <div className="relative group inline-block align-middle cursor-pointer">
                        <span className="w-5 h-5 bg-indigo-100 hover:bg-indigo-200 rounded-full inline-flex items-center justify-center transition-colors duration-200">
                          <svg className="w-3.5 h-3.5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-7 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-20 text-sm text-gray-700 font-normal text-right whitespace-normal">
                          {results.includesInsurance ? (
                            <>
                              <span className="block font-medium text-indigo-800 mb-1">
                                ההחזר החודשי המקסימלי חושב בהתחשב בעלויות הביטוח
                              </span>
                              <span className="block text-xs text-indigo-600">
                                לפי שטח דירה של {results.apartmentAreaSqm} מ״ר וערך כינון ממוצע של
                                ₪{results.reinstatementCostPerSqm.toLocaleString()} למטר.
                              </span>
                            </>
                          ) : (
                            <span className="block font-medium text-gray-700">
                              ההחזר החודשי המקסימלי חושב ללא עלויות ביטוח
                            </span>
                          )}
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {exceedsMaxPayment ? (
                  <div className="mt-3 flex items-start gap-2 bg-red-100 border border-red-300 rounded-md p-2">
                    <svg
                      className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-red-800 leading-snug">
                      חרגת ממגבלת בנק ישראל — יחס ההחזר החודשי לא יעלה על 40% מההכנסה הפנויה.
                      <span className="block text-red-700 mt-0.5">
                        החזר חודשי מקסימלי מאושר: ₪{results.maxMonthlyPayment.toLocaleString()}
                      </span>
                    </p>
                  </div>
                ) : null}
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="md:col-span-2 lg:col-span-3"
            >
              <Card className="p-3 hover:shadow-lg transition-shadow duration-300">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                  <div className="md:w-1/4 md:flex-shrink-0 flex items-baseline gap-2">
                    <h3 className="text-lg font-bold text-gray-900">תקופת משכנתא:</h3>
                    <p className="text-xl font-bold text-orange-600">
                      {effectiveLoanPeriod} שנים
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div dir="ltr">
                      <Slider
                        dir="ltr"
                        value={[effectiveLoanPeriod]}
                        onValueChange={([v]) => setSelectedLoanPeriod(v)}
                        min={5}
                        max={30}
                        step={1}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-0.5" dir="ltr">
                        <span>5</span>
                        <span>30</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">
                      התקופה המקסימלית שהבנק יאשר:{' '}
                      <span className="font-semibold">{results.maxLoanPeriod} שנים</span>
                      {isCouple ? ' (לפי גיל הלווה הצעיר)' : ' (80 פחות גילך)'}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="md:col-span-2 lg:col-span-3"
            >
              <Card className="p-4 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {isCouple ? 'סיכום נתונים מצרפיים' : 'סיכום פרטים'}
                </h3>
                {(() => {
                  const loanCount = isCouple
                    ? (userData.borrower1.loans?.length || 0) + (userData.borrower2.loans?.length || 0)
                    : (userData.loans?.length || 0);
                  const loansLabel =
                    (isCouple ? 'סה״כ הלוואות קיימות' : 'הלוואות קיימות') +
                    (loanCount > 1 ? ` (${loanCount})` : '');
                  const remainingAfterMortgage =
                    aggregated.disposableIncome -
                    displayMonthlyPayment -
                    effectiveTotalInsuranceMonthly;
                  const totalPaidOverPeriod =
                    displayMonthlyPayment * 12 * effectiveLoanPeriod;
                  const totalInterestOverPeriod = Math.max(
                    0,
                    totalPaidOverPeriod - effectiveLoanAmount
                  );
                  return (
                    <>
                      {/* Top row — inputs with vertical separators and a light tinted background
                          (mirrors the data line under "התוצאות שלך"). */}
                      <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                        <span>
                          <span className="font-semibold">
                            {isCouple ? 'הון עצמי משפחתי:' : 'ההון העצמי שלך:'}
                          </span>{' '}
                          ₪{parseFormattedNumberInput(userData.ownCapital).toLocaleString()}
                        </span>
                        <span className="text-gray-400" aria-hidden="true">|</span>
                        <span>
                          <span className="font-semibold">
                            {isCouple ? 'סה״כ הכנסה חודשית:' : 'הכנסה חודשית:'}
                          </span>{' '}
                          ₪{aggregated.income.toLocaleString()}
                        </span>
                        <span className="text-gray-400" aria-hidden="true">|</span>
                        <span>
                          <span className="font-semibold">{loansLabel}:</span>{' '}
                          ₪{aggregated.loanPayment.toLocaleString()}
                        </span>
                      </div>

                      {/* Second row — computed ratios + disposable income, styled like the
                          first row but in an indigo tint so the two pill-rows feel related yet distinct. */}
                      <div className="bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2 mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                        <span>
                          <span className="font-semibold">אחוז מימון נבחר:</span>{' '}
                          <span className={exceedsMaxLTV ? 'text-red-600 font-semibold' : ''}>
                            {effectiveLTV.toFixed(1)}%
                          </span>
                        </span>
                        <span className="text-gray-400" aria-hidden="true">|</span>
                        <span>
                          <span className="font-semibold">יחס החזר מההכנסה הפנויה:</span>{' '}
                          {aggregated.disposableIncome > 0 ? (
                            <span className={exceedsMaxPayment ? 'text-red-600 font-semibold' : ''}>
                              {Math.round((displayMonthlyPayment / aggregated.disposableIncome) * 1000) / 10}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </span>
                        <span className="text-gray-400" aria-hidden="true">|</span>
                        <span>
                          <span className="font-semibold">
                            {isCouple
                              ? 'יש לכם כסף פנוי בלי משכנתא:'
                              : 'יש לך כסף פנוי בלי משכנתא:'}
                          </span>{' '}
                          ₪{aggregated.disposableIncome.toLocaleString()}
                        </span>
                      </div>

                      {/* Third row — bottom-line outcomes: money left after the mortgage,
                          total paid over the loan period, and the interest portion of that total.
                          Same pill shape as the rows above, in an emerald tint for distinction. */}
                      <div className="bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                        <span>
                          <span className="font-semibold">
                            {isCouple
                              ? 'נשאר לכם לאחר תשלומי המשכנתא:'
                              : 'נשאר לך לאחר תשלומי המשכנתא:'}
                          </span>{' '}
                          <span
                            className={
                              remainingAfterMortgage < 0 ? 'text-red-600 font-semibold' : ''
                            }
                          >
                            ₪{Math.round(remainingAfterMortgage).toLocaleString()}
                          </span>
                        </span>
                        <span className="text-gray-400" aria-hidden="true">|</span>
                        <span>
                          <span className="font-semibold">
                            לאורך {effectiveLoanPeriod} שנים ישולמו:
                          </span>{' '}
                          ₪{Math.round(totalPaidOverPeriod).toLocaleString()}
                        </span>
                        <span className="text-gray-400" aria-hidden="true">|</span>
                        <span>
                          <span className="font-semibold">מתוכם עבור הריביות:</span>{' '}
                          ₪{Math.round(totalInterestOverPeriod).toLocaleString()}
                        </span>
                      </div>
                    </>
                  );
                })()}

                {anyLimitBreached && (
                  <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3">
                    <svg
                      className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm text-red-800 leading-snug">
                      <p className="font-semibold mb-1">חרגת ממגבלות בנק ישראל</p>
                      <ul className="list-disc pr-5 space-y-0.5">
                        {exceedsMaxLTV && (
                          <li>
                            אחוז המימון ({effectiveLTV.toFixed(1)}%) חורג מהמקסימום המותר לנכס
                            מסוג {userData.propertyType} ({maxLTVPct}%).
                          </li>
                        )}
                        {exceedsMaxPayment && (
                          <li>
                            ההחזר החודשי חורג מ-40% מההכנסה הפנויה (מקסימום מאושר: ₪
                            {results.maxMonthlyPayment.toLocaleString()}).
                          </li>
                        )}
                        {exceedsMaxLoan && !exceedsMaxPayment && (
                          <li>
                            סכום המשכנתא חורג מהסכום המקסימלי המאושר (₪
                            {results.maxLoanAmount.toLocaleString()}).
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>

          {!results.isCapitalSufficient && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-2">
                  <h3 className="text-xs font-medium text-orange-800">
                    שים לב - יידרש הון עצמי נוסף
                  </h3>
                  <p className="text-xs text-orange-700 mt-0.5">
                    ההון העצמי הנוכחי שלך (₪{parseFormattedNumberInput(userData.ownCapital).toLocaleString()}){' '}
                    אינו מספיק. יידרש הון עצמי של ₪{results.ownCapitalUsed.toLocaleString()}.
                  </p>
                </div>
              </div>
            </motion.div>
          )}


          <div className="text-center">
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentStep(isCouple ? 'personal-info-couple' : 'personal-info')
                }
                className="px-4 py-2 h-9"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                חזור לעריכה
              </Button>
              {!embedded && (
              <Link
                href="/uniform-mixes"
                onClick={() => {
                  // Persist the slider-driven selection so the uniform-mixes screen can
                  // generate the mixes against the property price the user actually chose
                  // here (rather than recomputing the calculated maximum from scratch).
                  try {
                    localStorage.setItem(
                      'mortgagePlanningSelection',
                      JSON.stringify({
                        source: 'affordability-slider',
                        propertyPrice: effectivePropertyPrice,
                        loanAmount: effectiveLoanAmount,
                        loanPeriod: effectiveLoanPeriod,
                        ownCapital: aggregated.ownCapital,
                        interestRate: results.interestRate,
                        timestamp: Date.now(),
                      })
                    );
                  } catch (error) {
                    console.error('Could not persist mortgage planning selection:', error);
                  }
                }}
              >
                <Button
                  size="sm"
                  className="px-5 py-2 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  בוא המשך לתכנון המשכנתא
                  <ArrowLeft className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              )}
            </div>
          </div>
        </motion.div>
      );
    } else {
      // Results for existing property
      const propertyPrice = parseFormattedNumberInput(userData.propertyPrice);
      const ownCapital = parseFormattedNumberInput(userData.ownCapital);
      const loanAmount = propertyPrice - ownCapital;
      const ltv = propertyPrice > 0 ? (loanAmount / propertyPrice) * 100 : 0;

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              סיכום הנכס שלך
            </h2>
            <p className="text-lg text-gray-600">
              הנה הפרטים של המשכנתא שתצטרך
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[140px] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">מחיר הנכס</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">
                  ₪{propertyPrice.toLocaleString()}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[140px] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">הון עצמי</h3>
                <p className="text-3xl font-bold text-green-600 mb-2">
                  ₪{ownCapital.toLocaleString()}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[140px] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">סכום משכנתא</h3>
                <p className="text-3xl font-bold text-purple-600 mb-2">
                  ₪{loanAmount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">אחוז מימון: {ltv.toFixed(1)}%</p>
              </Card>
            </motion.div>
          </div>

          <div className="text-center space-y-4">
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('existing-property')}
                className="px-6 py-3"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                חזור לעריכה
              </Button>
              {!embedded && (
              <Link href="/uniform-mixes">
                <Button
                  size="lg"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg"
                >
                  בוא המשך לתכנון המשכנתא
                  <ArrowLeft className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              )}
            </div>
          </div>
        </motion.div>
      );
    }
  };

  const renderProfileComplete = () => {
    const inputs = getAffordabilityInputs(userData);
    const income = inputs.income;
    const equity = inputs.ownCapital;
    const shekel = (value: number) => `₪${Math.round(value).toLocaleString('he-IL')}`;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto text-center"
      >
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">הפרופיל נשמר</h2>
        <p className="text-lg text-gray-600 mb-8">
          פרטי הלקוח מוכנים. בשלב הבא תזינו את כתובת הנכס, המחיר וסכום המשכנתא ותבנו תמהיל מאפס.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm mb-8">
          <dl className="space-y-3 text-sm">
            {userData.propertyType && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">סוג העסקה</dt>
                <dd className="font-bold text-slate-900">{userData.propertyType}</dd>
              </div>
            )}
            {income > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">הכנסה חודשית</dt>
                <dd className="font-bold text-slate-900">{shekel(income)}</dd>
              </div>
            )}
            {equity > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">הון עצמי</dt>
                <dd className="font-bold text-slate-900">{shekel(equity)}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              setCurrentStep(
                userData.applicationType === 'couple' ? 'personal-info-couple' : 'personal-info'
              )
            }
            className="px-6 py-3"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            חזרה לעריכה
          </Button>
          <Button
            onClick={() => {
              persistRef.current?.({ userData, currentStep: 'profile-complete' });
              profileReadyRef.current?.();
            }}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            המשך לבניית תמהיל
            <ArrowLeft className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50'}>
      {!embedded && (
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <NavBar />
      </div>
      )}
      
      <div
        className={`container mx-auto px-6 ${
          currentStep === 'results' ? 'py-3' : embedded ? 'py-4' : 'py-12'
        }`}
      >
        {returnPlanId && (
          <div
            dir="rtl"
            className="mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-white/90 px-5 py-4 shadow-sm"
          >
            <p className="text-sm text-slate-700">
              <span className="font-black text-slate-900">בדיקת היתכנות עבור תהליך המשכנתא שלכם.</span>{' '}
              הפרופיל שמילאתם שמור — כשתדעו לאיזה נכס לכוון, חזרו לתהליך והמשיכו מהנקודה שבה
              עצרתם.
            </p>
            <Link
              href={`/dashboard/plans/${returnPlanId}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-700"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה לתהליך
            </Link>
          </div>
        )}

        {currentStep === 'property-type' && renderPropertyTypeSelection()}
        {currentStep === 'calculation-type' && renderCalculationTypeSelection()}
        {currentStep === 'borrower-type' && (
          <BorrowerTypeSelection
            onSelect={handleBorrowerTypeSelect}
            onBack={goBackFromCalculationFlow}
          />
        )}
        {currentStep === 'personal-info' && renderPersonalInfoForm()}
        {currentStep === 'personal-info-couple' && (
          <CouplePersonalInfoForm
            userData={userData}
            onUserDataChange={setUserData}
            onBack={() => setCurrentStep('borrower-type')}
            onContinue={() => setCurrentStep(embedded ? 'profile-complete' : 'results')}
            continueLabel={embedded ? 'שמירת הפרופיל' : undefined}
            subtitle={
              embedded
                ? 'הכנסות, הון עצמי והלוואות של שני הלווים — הפרופיל ישמש לבניית התמהיל בשלב הבא'
                : undefined
            }
          />
        )}
        {currentStep === 'existing-property' && renderExistingPropertyForm()}
        {currentStep === 'reverse-mortgage' && renderReverseMortgageForm()}
        {currentStep === 'offer-analysis' && renderOfferAnalysisStep()}
        {currentStep === 'results' && renderResults()}
        {currentStep === 'profile-complete' && renderProfileComplete()}
      </div>

      {/* Equity Calculator Modal */}
      {showEquityCalculator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEquityCalculator(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">מחשבון הון עצמי</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEquityCalculator(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>
              <EquityCalculator />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

