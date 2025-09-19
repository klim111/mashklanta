'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, PieChart, Calculator, TrendingUp, Target } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import NavBar from '@/components/ui/navbar';
import { MortgageMixCard } from '@/components/mortgage-advisor/MortgageMixCard';
import { MortgageDetailsModal } from '@/components/mortgage-advisor/MortgageDetailsModal';
import type { MortgageMix, MortgageTrack } from '@/components/mortgage-advisor/types';

interface UserData {
  propertyType: string;
  calculationType: string;
  ownCapital: string;
  age: string;
  monthlyIncome: string;
  hasLoans: boolean;
  monthlyLoanPayment: string;
  propertyPrice: string;
  wantsLoanManagement: boolean;
  currentPropertyPrice: string;
  hasCurrentMortgage: boolean;
  remainingMortgageAmount: string;
  isOver55: boolean;
}

export default function UniformMixes() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [uniformMixes, setUniformMixes] = useState<MortgageMix[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState<MortgageMix | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load data from localStorage
    const savedData = localStorage.getItem('mortgagePlanningData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setUserData(parsedData.userData);
        generateUniformMixes(parsedData.userData);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const generateUniformMixes = (data: UserData) => {
    if (!data) return;

    // Calculate loan amount and optimal loan period
    let loanAmount = 0;
    let optimalYears = 30; // Default to 30 years
    
    if (data.calculationType === 'תחשב מה אני יכול להרשות לעצמי') {
      // Use calculated max property price
      const results = calculateMaxProperty(data);
      loanAmount = results.maxLoanAmount;
      // Calculate max loan period based on age - minimum between age limit and 30 years
      const age = parseInt(data.age) || 0;
      if (age > 0) {
        const maxLoanPeriodByAge = Math.min(30, Math.max(1, 80 - age));
        optimalYears = Math.min(maxLoanPeriodByAge, 30);
      } else {
        optimalYears = 30;
      }
    } else if (data.calculationType === 'תחשב משכנתא לנכס קיים') {
      const propertyPrice = parseFloat(data.propertyPrice) || 0;
      const ownCapital = parseFloat(data.ownCapital) || 0;
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
      const currentPropertyPrice = parseFloat(data.currentPropertyPrice) || 0;
      const remainingMortgage = parseFloat(data.remainingMortgageAmount) || 0;
      const ownedValue = currentPropertyPrice - remainingMortgage;
      loanAmount = ownedValue * 0.6; // 60% for reverse mortgage
      // For reverse mortgage, maximum 30 years
      optimalYears = 30;
    }

    if (loanAmount <= 0) return;

    const mixes: MortgageMix[] = [];

    // תמהיל 1: 100% ריבית קבועה לא צמודה (5%)
    const mix1: MortgageMix = {
      id: 'uniform-mix-1',
      name: 'תמהיל אחיד 1 - ריבית קבועה',
      totalAmount: loanAmount,
      tracks: [{
        id: 'track-1-1',
        name: 'ריבית קבועה לא צמודה',
        type: 'fixed',
        amount: loanAmount,
        percentage: 100,
        interestRate: 5.0,
        years: optimalYears
      }],
      createdAt: new Date(),
      notes: '100% של המשכנתא בריבית קבועה לא צמודה'
    };

    // תמהיל 2: 50% ריבית קבועה + 50% פריים
    const mix2: MortgageMix = {
      id: 'uniform-mix-2',
      name: 'תמהיל אחיד 2 - קבועה + פריים',
      totalAmount: loanAmount,
      tracks: [
        {
          id: 'track-2-1',
          name: 'ריבית קבועה לא צמודה',
          type: 'fixed',
          amount: loanAmount * 0.5,
          percentage: 50,
          interestRate: 5.0,
          years: optimalYears
        },
        {
          id: 'track-2-2',
          name: 'ריבית פריים',
          type: 'prime',
          amount: loanAmount * 0.5,
          percentage: 50,
          interestRate: 5.7,
          years: optimalYears
        }
      ],
      createdAt: new Date(),
      notes: '50% ריבית קבועה לא צמודה ו-50% ריבית פריים'
    };

    // תמהיל 3: שליש-שליש-שליש
    const mix3: MortgageMix = {
      id: 'uniform-mix-3',
      name: 'תמהיל אחיד 3 - מגוון מלא',
      totalAmount: loanAmount,
      tracks: [
        {
          id: 'track-3-1',
          name: 'ריבית קבועה לא צמודה',
          type: 'fixed',
          amount: loanAmount * (1/3),
          percentage: 33.33,
          interestRate: 5.0,
          years: optimalYears
        },
        {
          id: 'track-3-2',
          name: 'ריבית פריים',
          type: 'prime',
          amount: loanAmount * (1/3),
          percentage: 33.33,
          interestRate: 5.7,
          years: optimalYears
        },
        {
          id: 'track-3-3',
          name: 'ריבית משתנה צמודה מדד',
          type: 'madad',
          amount: loanAmount * (1/3),
          percentage: 33.34,
          interestRate: 6.0,
          years: optimalYears
        }
      ],
      createdAt: new Date(),
      notes: 'שליש ריבית קבועה, שליש פריים ושליש משתנה צמודה מדד'
    };

    mixes.push(mix1, mix2, mix3);
    setUniformMixes(mixes);
  };

  // Copy of calculation function from mortgage-planning
  const calculateMaxProperty = (data: UserData) => {
    const income = parseFloat(data.monthlyIncome) || 0;
    const loanPayment = parseFloat(data.monthlyLoanPayment) || 0;
    const ownCapital = parseFloat(data.ownCapital) || 0;
    const age = parseInt(data.age) || 0;

    const maxMonthlyPayment = (income - loanPayment) * 0.4;
    const maxLoanPeriod = Math.min(30, Math.max(1, 80 - age));
    
    let maxLTVRatio = 0.5;
    switch (data.propertyType) {
      case 'דירה ראשונה':
        maxLTVRatio = 0.75;
        break;
      case 'דירה חליפית':
        maxLTVRatio = 0.7;
        break;
      case 'דירה להשקעה':
        maxLTVRatio = 0.5;
        break;
    }

    const annualRate = 0.052;
    const monthlyRate = annualRate / 12;
    const numPayments = maxLoanPeriod * 12;
    
    let maxLoanFromPayment = 0;
    if (monthlyRate > 0 && numPayments > 0) {
      maxLoanFromPayment = maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate);
    } else {
      maxLoanFromPayment = maxMonthlyPayment * numPayments;
    }
    
    const maxPropertyFromPayment = maxLoanFromPayment + ownCapital;
    let maxPropertyFromLTV = 0;
    if (ownCapital > 0) {
      maxPropertyFromLTV = ownCapital / (1 - maxLTVRatio);
    }
    
    let actualPropertyPrice = Math.min(maxPropertyFromPayment, maxPropertyFromLTV);
    let actualLoanAmount = actualPropertyPrice - ownCapital;
    
    return {
      maxPropertyPrice: Math.floor(actualPropertyPrice),
      maxLoanAmount: Math.floor(actualLoanAmount)
    };
  };

  const showDetails = (mix: MortgageMix) => {
    setShowDetailsModal(mix);
  };

  const handleContinueToAdvisor = () => {
    // Save uniform mixes to localStorage for mortgage advisor
    const existingAdvisorData = localStorage.getItem('mortgageAdvisorData');
    let advisorData: { mixes: MortgageMix[], selectedForComparison: any[], activeTab: string } = { mixes: [], selectedForComparison: [], activeTab: 'builder' };
    
    if (existingAdvisorData) {
      try {
        advisorData = JSON.parse(existingAdvisorData);
      } catch (error) {
        console.error('Error parsing advisor data:', error);
      }
    }

    // Add uniform mixes to advisor data
    uniformMixes.forEach(mix => {
      const existingIndex = advisorData.mixes.findIndex((m: MortgageMix) => m.id === mix.id);
      if (existingIndex >= 0) {
        advisorData.mixes[existingIndex] = mix;
      } else {
        advisorData.mixes.push(mix);
      }
    });

    localStorage.setItem('mortgageAdvisorData', JSON.stringify(advisorData));
    
    // Navigate to mortgage advisor
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
        
        <div className="container mx-auto px-6 py-12">
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
      
      <div className="container mx-auto px-6 py-12">
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
                3 תמהילי משכנתא מומלצים המותאמים לנתונים שלך
              </p>
              <p className="text-lg text-gray-500">
                תמהילים סטנדרטיים שנבנו על פי השיטות המקובלות בשוק
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">הנתונים שלך</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">סוג נכס:</span>
                    <div className="font-medium">{userData.propertyType}</div>
                  </div>
                  {userData.propertyPrice && (
                    <div>
                      <span className="text-gray-600">מחיר נכס:</span>
                      <div className="font-medium">₪{parseFloat(userData.propertyPrice).toLocaleString()}</div>
                    </div>
                  )}
                  {userData.ownCapital && (
                    <div>
                      <span className="text-gray-600">הון עצמי:</span>
                      <div className="font-medium">₪{parseFloat(userData.ownCapital).toLocaleString()}</div>
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

          {/* Uniform Mixes Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {uniformMixes.map((mix, index) => (
              <motion.div
                key={mix.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + (index * 0.1) }}
              >
                <MortgageMixCard
                  mix={mix}
                  onUpdate={() => {}} // Read-only display
                  onDelete={() => {}} // Read-only display
                  onDuplicate={() => {}} // Will be handled in advisor
                  onShowDetails={showDetails}
                  onAnalyzeScenarios={() => {}} // Will be handled in advisor
                />
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center space-y-6"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-blue-900 mb-3">
                מה הלאה?
              </h3>
              <p className="text-blue-800 mb-4">
                התמהילים האחידים הם נקודת התחלה מצוינת. תוכל להעביר אותם ליועץ המשכנתא שלנו לעיבוד נוסף, השוואות ואופטימיזציה
              </p>
              {uniformMixes.length > 0 && (
                <div className="bg-white/80 border border-blue-300 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-700">
                    <strong>תקופת הפירעון ({uniformMixes[0].tracks[0].years} שנים)</strong> חושבה לפי המינימום בין: 
                    התקופה המקסימלית לפי גילך (80 - גיל) או 30 שנה - מקסימום 30 שנה בכל מקרה
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/custom-mix-builder">
                  <Button
                    size="lg"
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Target className="w-5 h-5 ml-2" />
                    בנה תמהיל מותאם אישית בשבילך
                  </Button>
                </Link>
                
                <Button
                  onClick={handleContinueToAdvisor}
                  size="lg"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Calculator className="w-5 h-5 ml-2" />
                  העבר ליועץ המשכנתא
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

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 text-center">
                <PieChart className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">תמהיל 1</h4>
                <p className="text-sm text-gray-600">100% ריבית קבועה לא צמודה - יציבות מקסימלית</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 text-center">
                <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">תמהיל 2</h4>
                <p className="text-sm text-gray-600">50% קבועה + 50% פריים - איזון בין יציבות לגמישות</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 text-center">
                <Calculator className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">תמהיל 3</h4>
                <p className="text-sm text-gray-600">מגוון מלא - פיזור סיכונים מקסימלי</p>
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
