'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Home as HomeIcon, RefreshCw, Target, TrendingUp, Calculator, Banknote, FileText, Upload } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NavBar from '@/components/ui/navbar';
import EquityCalculator from '@/components/ui/equitycalc';

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
  // New fields for reverse mortgage
  currentPropertyPrice: string;
  hasCurrentMortgage: boolean;
  remainingMortgageAmount: string;
  isOver55: boolean;
}

export default function MortgagePlanning() {
  const [currentStep, setCurrentStep] = useState<'property-type' | 'calculation-type' | 'personal-info' | 'existing-property' | 'reverse-mortgage' | 'offer-analysis' | 'results'>('property-type');
  const [userData, setUserData] = useState<UserData>({
    propertyType: '',
    calculationType: '',
    ownCapital: '',
    age: '',
    monthlyIncome: '',
    hasLoans: false,
    monthlyLoanPayment: '',
    propertyPrice: '',
    wantsLoanManagement: false,
    currentPropertyPrice: '',
    hasCurrentMortgage: false,
    remainingMortgageAmount: '',
    isOver55: false
  });
  const [showEquityCalculator, setShowEquityCalculator] = useState(false);
  const [showCapitalWarning, setShowCapitalWarning] = useState(false);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('mortgagePlanningData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setUserData(parsedData.userData || userData);
        setCurrentStep(parsedData.currentStep || 'property-type');
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever userData or currentStep changes
  useEffect(() => {
    const dataToSave = {
      userData,
      currentStep
    };
    localStorage.setItem('mortgagePlanningData', JSON.stringify(dataToSave));
  }, [userData, currentStep]);

  // Check capital sufficiency when property price or own capital changes
  useEffect(() => {
    if (currentStep === 'existing-property' && userData.propertyPrice && userData.ownCapital && userData.propertyType) {
      const propertyPrice = parseFloat(userData.propertyPrice);
      const ownCapital = parseFloat(userData.ownCapital);
      
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
    setUserData({
      propertyType: '',
      calculationType: '',
      ownCapital: '',
      age: '',
      monthlyIncome: '',
      hasLoans: false,
      monthlyLoanPayment: '',
      propertyPrice: '',
      wantsLoanManagement: false,
      currentPropertyPrice: '',
      hasCurrentMortgage: false,
      remainingMortgageAmount: '',
      isOver55: false
    });
    setCurrentStep('property-type');
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
    setUserData({ ...userData, propertyType: type });
    if (type === 'משכנתא לכל מטרה') {
      // Handle special case for "any purpose" - go directly to reverse mortgage form
      setCurrentStep('reverse-mortgage');
    } else {
      setCurrentStep('calculation-type');
    }
  };

  const handleCalculationTypeSelect = (type: string) => {
    setUserData({ ...userData, calculationType: type });
    if (type === 'תחשב מה אני יכול להרשות לעצמי') {
      setCurrentStep('personal-info');
    } else {
      setCurrentStep('existing-property');
    }
  };

  const calculateMaxProperty = () => {
    const income = parseFloat(userData.monthlyIncome) || 0;
    const loanPayment = parseFloat(userData.monthlyLoanPayment) || 0;
    const ownCapital = parseFloat(userData.ownCapital) || 0;
    const age = parseInt(userData.age) || 0;

    // Calculate max monthly payment (40% of net income after loan payments)
    const maxMonthlyPayment = (income - loanPayment) * 0.4;
    
    // Calculate max loan period (80 - age, max 30 years)
    const maxLoanPeriod = Math.min(30, Math.max(1, 80 - age));
    
    // Get max LTV based on property type
    let maxLTVRatio = 0.5; // Default for investment
    switch (userData.propertyType) {
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

    // Use current average interest rate of 5.2%
    const annualRate = 0.052;
    const monthlyRate = annualRate / 12;
    const numPayments = maxLoanPeriod * 12;
    
    // Calculate max loan amount based on monthly payment capability
    let maxLoanFromPayment = 0;
    if (monthlyRate > 0 && numPayments > 0) {
      maxLoanFromPayment = maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate);
    } else {
      maxLoanFromPayment = maxMonthlyPayment * numPayments;
    }
    
    // Calculate max property price based on payment capability
    const maxPropertyFromPayment = maxLoanFromPayment + ownCapital;
    
    // Calculate max property price based on LTV constraint
    let maxPropertyFromLTV = 0;
    if (ownCapital > 0) {
      // If we have own capital, max property = ownCapital / (1 - LTV)
      maxPropertyFromLTV = ownCapital / (1 - maxLTVRatio);
    } else {
      // If no own capital, we can't buy anything (need at least 25% for first home, 30% for replacement, 50% for investment)
      maxPropertyFromLTV = 0;
    }
    
    // Take the smaller of the two constraints
    let actualPropertyPrice = Math.min(maxPropertyFromPayment, maxPropertyFromLTV);
    let actualLoanAmount = actualPropertyPrice - ownCapital;
    let actualLTV = actualPropertyPrice > 0 ? (actualLoanAmount / actualPropertyPrice) * 100 : 0;
    
    // Determine which constraint was limiting
    let limitingFactor = '';
    if (maxPropertyFromPayment < maxPropertyFromLTV) {
      limitingFactor = 'payment'; // Limited by monthly payment capability
    } else {
      limitingFactor = 'ltv'; // Limited by LTV constraint
    }
    
    // Validate that we have sufficient capital
    const requiredCapital = actualPropertyPrice - actualLoanAmount;
    const isCapitalSufficient = ownCapital >= requiredCapital;
    
    // Calculate the actual monthly payment for the final loan amount
    let actualMonthlyPayment = 0;
    if (monthlyRate > 0 && numPayments > 0 && actualLoanAmount > 0) {
      actualMonthlyPayment = actualLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    }
    
    return {
      maxPropertyPrice: Math.floor(actualPropertyPrice),
      maxLoanAmount: Math.floor(actualLoanAmount),
      maxMonthlyPayment: Math.floor(maxMonthlyPayment),
      actualMonthlyPayment: Math.floor(actualMonthlyPayment),
      maxLTV: Math.round(actualLTV * 10) / 10,
      maxLoanPeriod,
      ownCapitalUsed: Math.floor(requiredCapital),
      hasValidResult: actualPropertyPrice > 0 && actualLoanAmount > 0,
      isCapitalSufficient,
      limitingFactor,
      interestRate: annualRate * 100,
      warnings: []
    };
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
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזור לעמוד הבית
            </Button>
          </Link>
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
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
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
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
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
                <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
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
          <ArrowLeft className="w-5 h-5 ml-2" />
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
                <label className="cursor-pointer inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  בחר קובץ
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            localStorage.setItem('uploadedBankOffer', String(reader.result));
                            alert('הקובץ נטען. ננתח את ההצעה במסך כלי היועצים.');
                            window.location.href = '/mortgage-advisor';
                          } catch (err) {
                            console.error('שגיאה בשמירת הקובץ:', err);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
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

      <div className="text-center mt-10">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('calculation-type')}
          className="px-6 py-3"
        >
          <ArrowLeft className="w-5 h-5 ml-2" />
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
          בוא נכיר
        </h2>
        <p className="text-lg text-gray-600">
          כמה פרטים כדי שנוכל לחשב בדיוק מה אתה יכול להרשות לעצמך
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="ownCapital" className="text-right block mb-2 text-lg font-medium">
            מה הוא ההון העצמי שלך?
          </Label>
          <Input
            id="ownCapital"
            type="number"
            placeholder="₪"
            value={userData.ownCapital}
            onChange={(e) => setUserData({ ...userData, ownCapital: e.target.value })}
            className="text-right text-lg p-4 max-w-sm mx-auto"
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
            className="text-right text-lg p-4 max-w-sm mx-auto"
          />
        </div>

        <div>
          <Label htmlFor="monthlyIncome" className="text-right block mb-2 text-lg font-medium">
            מה ההכנסה החודשית שלך?
          </Label>
          <Input
            id="monthlyIncome"
            type="number"
            placeholder="₪"
            value={userData.monthlyIncome}
            onChange={(e) => setUserData({ ...userData, monthlyIncome: e.target.value })}
            className="text-right text-lg p-4 max-w-sm mx-auto"
          />
        </div>

        <div>
          <Label className="text-right block mb-4 text-lg font-medium">
            האם יש לך הלוואות שתקופת הפירעון שלהן מעל 18 חודשים?
          </Label>
          <div className="flex gap-4 justify-center">
            <Button
              variant={userData.hasLoans ? "default" : "outline"}
              onClick={() => setUserData({ ...userData, hasLoans: true })}
              className="px-8 py-3"
            >
              כן
            </Button>
            <Button
              variant={!userData.hasLoans ? "default" : "outline"}
              onClick={() => setUserData({ ...userData, hasLoans: false })}
              className="px-8 py-3"
            >
              לא
            </Button>
          </div>
        </div>

        {userData.hasLoans && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="monthlyLoanPayment" className="text-right block mb-2 text-lg font-medium">
                מה גובה ההחזר החודשי?
              </Label>
              <Input
                id="monthlyLoanPayment"
                type="number"
                placeholder="₪"
                value={userData.monthlyLoanPayment}
                onChange={(e) => setUserData({ ...userData, monthlyLoanPayment: e.target.value })}
                className="text-right text-lg p-4 max-w-sm mx-auto"
              />
            </div>

            <div className="text-center">
              <p className="text-gray-600 mb-4">רוצה שמשכלנתא תעזור לך עם ההלוואות?</p>
              <p className="text-sm text-gray-500 mb-4">(לאחד, לקחת הלוואה משתלמת יותר במקום?)</p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant={userData.wantsLoanManagement ? "default" : "outline"}
                  onClick={() => {
                    setUserData({ ...userData, wantsLoanManagement: true });
                    // Redirect to consumer loans page
                    window.location.href = '/consumer-loans';
                  }}
                  className="px-6 py-2"
                >
                  עזרו לי עם ההלוואות שלי
                </Button>
                <Button
                  variant={!userData.wantsLoanManagement ? "default" : "outline"}
                  onClick={() => setUserData({ ...userData, wantsLoanManagement: false })}
                  className="px-6 py-2"
                >
                  לא, תודה
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex gap-4 justify-center pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('calculation-type')}
            className="px-6 py-3"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור
          </Button>
          <Button
            onClick={() => setCurrentStep('results')}
            disabled={!userData.ownCapital || !userData.age || !userData.monthlyIncome}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            הצג אפשרויות משכנתא
          </Button>
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
          <Input
            id="propertyPrice"
            type="number"
            placeholder="₪"
            value={userData.propertyPrice}
            onChange={(e) => setUserData({ ...userData, propertyPrice: e.target.value })}
            className="text-right text-lg p-4 max-w-sm mx-auto"
          />
        </div>

        <div>
          <Label htmlFor="ownCapitalExisting" className="text-right block mb-2 text-lg font-medium">
            ההון העצמי שלך
          </Label>
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              id="ownCapitalExisting"
              type="number"
              placeholder="₪"
              value={userData.ownCapital}
              onChange={(e) => setUserData({ ...userData, ownCapital: e.target.value })}
              className="text-right text-lg p-4 flex-1"
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
                      const propertyPrice = parseFloat(userData.propertyPrice);
                      const ownCapital = parseFloat(userData.ownCapital);
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
            onClick={() => setCurrentStep('calculation-type')}
            className="px-6 py-3"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור
          </Button>
          <Button
            onClick={() => setCurrentStep('results')}
            disabled={!userData.propertyPrice || !userData.ownCapital}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            הצג אפשרויות משכנתא
          </Button>
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
            <ArrowLeft className="w-5 h-5 ml-2" />
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
                <ArrowLeft className="w-5 h-5 ml-2" />
                חזור
              </Button>
              <Link href="/uniform-mixes">
                <Button
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Target className="w-5 h-5 ml-2" />
                  בוא המשך לתכנון המשכנתא
                </Button>
              </Link>
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
      const results = calculateMaxProperty();
      
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              התוצאות שלך
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 inline-block shadow-sm">
              <h3 className="text-xl font-bold text-blue-800 mb-2">
                חישוב עבור {userData.propertyType}
              </h3>
              <p className="text-blue-700 font-medium">
                {userData.propertyType === 'דירה ראשונה' && 'עם 75% מימון מקסימלי'}
                {userData.propertyType === 'דירה חליפית' && 'עם 70% מימון מקסימלי'}
                {userData.propertyType === 'דירה להשקעה' && 'עם 50% מימון מקסימלי'}
                {userData.propertyType === 'משכנתא לכל מטרה' && 'עם 50% מימון מקסימלי'}
              </p>
              <p className="text-blue-600 text-sm mt-1">
                תקופת משכנתא מקסימלית: {results.maxLoanPeriod} שנים (80 - גילך) | ריבית ממוצעת: {results.interestRate}%
              </p>
            </div>
            <p className="text-lg text-gray-600">
              בהתבסס על הנתונים שהזנת, הנה מה שאתה יכול להרשות לעצמך
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[160px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">מחיר נכס מקסימלי</h3>
                    {results.limitingFactor === 'payment' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.5 }}
                        className="relative group cursor-pointer"
                      >
                        <div className="w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors duration-200">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        
                        {/* Tooltip on hover */}
                        <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                          <div className="text-sm">
                            <p className="font-semibold text-gray-900 mb-2">למה הסכום הזה?</p>
                            <p className="text-gray-700 mb-2">
                              המחיר מוגבל לפי יכולת ההחזר החודשי שלך (₪{results.maxMonthlyPayment.toLocaleString()}) 
                              בריבית של {results.interestRate}%.
                            </p>
                            <p className="text-blue-600 font-medium">
                              שיפור בריביות יכול להגדיל את הסכום!
                            </p>
                          </div>
                          <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  <p className="text-3xl font-bold text-blue-600 mb-4">
                    ₪{results.maxPropertyPrice.toLocaleString()}
                  </p>
                  
                  <p className="text-gray-600 text-sm mb-4">זה המחיר המקסימלי של נכס שאתה יכול להרשות לעצמך</p>
                  
                  {results.limitingFactor === 'payment' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.4, delay: 0.6 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-800 font-medium mb-2">
                          המחיר מוגבל לפי החזר חודשי מקסימלי
                        </p>
                        <p className="text-xs text-blue-700">
                          החזר מקסימלי: ₪{results.maxMonthlyPayment.toLocaleString()} | ריבית: {results.interestRate}% | תקופה: {results.maxLoanPeriod} שנים
                        </p>
                      </div>
                      <Link href="/uniform-mixes">
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm py-2 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <Target className="w-4 h-4 ml-2" />
                          בוא המשך לתכנון המשכנתא
                        </Button>
                      </Link>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[160px] flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">סכום משכנתא מקסימלי</h3>
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    ₪{results.maxLoanAmount.toLocaleString()}
                  </p>
                </div>
                <p className="text-gray-600 text-sm">זה הסכום המקסימלי שתוכל לקחת במשכנתא</p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[160px] flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">החזר חודשי בפועל</h3>
                  <p className="text-3xl font-bold text-purple-600 mb-2">
                    ₪{results.actualMonthlyPayment.toLocaleString()}
                  </p>
                </div>
                <p className="text-gray-600 text-sm">ההחזר החודשי בפועל עבור המשכנתא המחושבת</p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300 min-h-[160px] flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">תקופת משכנתא מקסימלית</h3>
                  <p className="text-3xl font-bold text-orange-600 mb-2">
                    {results.maxLoanPeriod} שנים
                  </p>
                </div>
                <p className="text-gray-600 text-sm">תקופת המשכנתא המקסימלית לפי גילך</p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="md:col-span-2"
            >
              <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4">פרטים נוספים</h3>
                <div className="space-y-3">
                  <p><span className="font-semibold">אחוז מימון בפועל:</span> {results.maxLTV}%</p>
                  <p><span className="font-semibold">ההון העצמי שלך:</span> ₪{parseFloat(userData.ownCapital).toLocaleString()}</p>
                  <p><span className="font-semibold">הכנסה חודשית:</span> ₪{parseFloat(userData.monthlyIncome).toLocaleString()}</p>
                  {parseFloat(userData.monthlyLoanPayment || '0') > 0 && (
                    <p><span className="font-semibold">החזר הלוואות קיימות:</span> ₪{parseFloat(userData.monthlyLoanPayment).toLocaleString()}</p>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Explanation of calculation basis */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className={`border rounded-lg p-4 mb-6 ${
              results.limitingFactor === 'payment' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {results.limitingFactor === 'payment' ? (
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="mr-3">
                <h3 className={`text-sm font-medium ${
                  results.limitingFactor === 'payment' ? 'text-blue-800' : 'text-green-800'
                }`}>
                  {results.limitingFactor === 'payment' 
                    ? 'המחיר חושב לפי מגבלת ההחזר החודשי' 
                    : 'המחיר חושב לפי מגבלת אחוז המימון'}
                </h3>
                <div className={`mt-2 text-sm ${
                  results.limitingFactor === 'payment' ? 'text-blue-700' : 'text-green-700'
                }`}>
                  {results.limitingFactor === 'payment' ? (
                    <p>
                      המחיר המקסימלי נקבע לפי יכולת ההחזר החודשי שלך (₪{results.maxMonthlyPayment.toLocaleString()}) 
                      בריבית ממוצעת של {results.interestRate}% לתקופה של {results.maxLoanPeriod} שנים.
                    </p>
                  ) : (
                    <p>
                      המחיר המקסימלי נקבע לפי ההון העצמי שלך ואחוז המימון המקסימלי 
                      עבור {userData.propertyType} ({results.maxLTV}% מימון).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>


          {!results.isCapitalSufficient && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <h3 className="text-sm font-medium text-orange-800">
                    שים לב - יידרש הון עצמי נוסף
                  </h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>
                      ההון העצמי הנוכחי שלך (₪{parseFloat(userData.ownCapital).toLocaleString()}) 
                      אינו מספיק. יידרש הון עצמי של ₪{results.ownCapitalUsed.toLocaleString()}.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}


          <div className="text-center space-y-4">
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('personal-info')}
                className="px-6 py-3"
              >
                <ArrowLeft className="w-5 h-5 ml-2" />
                חזור לעריכה
              </Button>
              <Link href="/uniform-mixes">
                <Button
                  size="lg"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg"
                >
                  בוא המשך לתכנון המשכנתא
                  <ArrowRight className="w-5 h-5 mr-2" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      );
    } else {
      // Results for existing property
      const propertyPrice = parseFloat(userData.propertyPrice) || 0;
      const ownCapital = parseFloat(userData.ownCapital) || 0;
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
                <ArrowLeft className="w-5 h-5 ml-2" />
                חזור לעריכה
              </Button>
              <Link href="/uniform-mixes">
                <Button
                  size="lg"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg"
                >
                  בוא המשך לתכנון המשכנתא
                  <ArrowRight className="w-5 h-5 mr-2" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      {/* Navigation */}
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <NavBar />
      </div>
      
      <div className="container mx-auto px-6 py-12">
        {currentStep === 'property-type' && renderPropertyTypeSelection()}
        {currentStep === 'calculation-type' && renderCalculationTypeSelection()}
        {currentStep === 'personal-info' && renderPersonalInfoForm()}
        {currentStep === 'existing-property' && renderExistingPropertyForm()}
        {currentStep === 'reverse-mortgage' && renderReverseMortgageForm()}
        {currentStep === 'results' && renderResults()}
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
