'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Users, Heart, GraduationCap, Briefcase, Banknote, Baby, TrendingUp, AlertTriangle, Shield, Target, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import NavBar from '@/components/ui/navbar';

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

interface PersonalProfile {
  // Personal info
  maritalStatus: string;
  numChildren: number;
  education: string;
  
  // Financial info
  employmentYears: number;
  hasAllowances: boolean;
  allowanceAmount: string;
  expectsLumpSum: boolean;
  expectedLumpSum: string;
  lumpSumTimeframe: string;
  
  // Future plans
  plansFamilyExpansion: boolean;
  expectedNewChildren: number;
  familyExpansionTimeframe: string;
  
  // Risk tolerance questions
  prioritizeStability: number; // 1-10 scale
  comfortableWithRateChanges: number; // 1-10 scale
  planningHorizon: string; // short/medium/long
}

interface RiskProfile {
  monthlySensitivity: number; // 0-100
  futureFlexibility: number; // 0-100
  riskTolerance: number; // 0-100
}

export default function CustomMixBuilder() {
  const [currentStep, setCurrentStep] = useState<'personal' | 'financial' | 'future' | 'risk' | 'dashboard'>('personal');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<PersonalProfile>({
    maritalStatus: '',
    numChildren: 0,
    education: '',
    employmentYears: 0,
    hasAllowances: false,
    allowanceAmount: '',
    expectsLumpSum: false,
    expectedLumpSum: '',
    lumpSumTimeframe: '',
    plansFamilyExpansion: false,
    expectedNewChildren: 0,
    familyExpansionTimeframe: '',
    prioritizeStability: 5,
    comfortableWithRateChanges: 5,
    planningHorizon: 'medium'
  });
  
  const [riskProfile, setRiskProfile] = useState<RiskProfile>({
    monthlySensitivity: 50,
    futureFlexibility: 50,
    riskTolerance: 50
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load data from localStorage
    const savedData = localStorage.getItem('mortgagePlanningData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setUserData(parsedData.userData);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Calculate risk profile when profile changes
    calculateRiskProfile();
  }, [profile, userData]);

  const calculateRiskProfile = () => {
    if (!userData) return;

    // Calculate monthly sensitivity
    const monthlyIncome = parseFloat(userData.monthlyIncome) || 0;
    const monthlyLoanPayment = parseFloat(userData.monthlyLoanPayment) || 0;
    const allowanceAmount = profile.hasAllowances ? parseFloat(profile.allowanceAmount) || 0 : 0;
    
    const totalIncome = monthlyIncome + allowanceAmount;
    const freeIncome = totalIncome - monthlyLoanPayment;
    
    // Calculate estimated mortgage payment (rough estimate)
    const propertyPrice = parseFloat(userData.propertyPrice) || 0;
    const ownCapital = parseFloat(userData.ownCapital) || 0;
    const loanAmount = propertyPrice - ownCapital;
    const estimatedMonthlyPayment = loanAmount * 0.005; // Rough estimate 0.5% per month
    
    const incomeToPaymentRatio = estimatedMonthlyPayment > 0 ? (freeIncome / estimatedMonthlyPayment) : 1;
    const monthlySensitivity = Math.max(0, Math.min(100, 100 - (incomeToPaymentRatio * 20)));

    // Calculate future flexibility
    const age = parseInt(userData.age) || 30;
    const youngAge = Math.max(0, (50 - age) / 50 * 30); // Younger = more flexible
    const childrenFactor = Math.max(0, (5 - profile.numChildren) / 5 * 20); // Fewer children = more flexible
    const lumpSumFactor = profile.expectsLumpSum ? 25 : 0;
    const expansionPenalty = profile.plansFamilyExpansion ? -15 : 0;
    const employmentStability = Math.min(20, profile.employmentYears * 2); // More years = more stable
    
    const futureFlexibility = Math.max(0, Math.min(100, 
      youngAge + childrenFactor + lumpSumFactor + expansionPenalty + employmentStability
    ));

    // Calculate risk tolerance (combination of the above + personal preferences)
    const stabilityPreference = (10 - profile.prioritizeStability) * 5; // Higher stability preference = lower risk
    const rateComfort = profile.comfortableWithRateChanges * 5;
    const horizonFactor = profile.planningHorizon === 'long' ? 20 : 
                         profile.planningHorizon === 'medium' ? 10 : 0;
    
    const baseRiskTolerance = (futureFlexibility * 0.4) + (100 - monthlySensitivity) * 0.3;
    const adjustedRiskTolerance = Math.max(0, Math.min(100, 
      baseRiskTolerance + stabilityPreference + rateComfort + horizonFactor - 50
    ));

    setRiskProfile({
      monthlySensitivity: Math.round(monthlySensitivity),
      futureFlexibility: Math.round(futureFlexibility),
      riskTolerance: Math.round(adjustedRiskTolerance)
    });
  };

  const updateProfile = (updates: Partial<PersonalProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const renderPersonalStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">בוא נכיר אותך יותר לעומק</h2>
        <p className="text-lg text-gray-600">פרטים אישיים שיעזרו לנו לבנות עבורך תמהיל מושלם</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              מצב משפחתי
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={profile.maritalStatus} onValueChange={(value) => updateProfile({ maritalStatus: value })}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מצב משפחתי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">רווק/ה</SelectItem>
                <SelectItem value="married">נשוי/ה</SelectItem>
                <SelectItem value="divorced">גרוש/ה</SelectItem>
                <SelectItem value="widowed">אלמן/ה</SelectItem>
              </SelectContent>
            </Select>

            <div>
              <Label className="text-base font-medium mb-3 block">מספר ילדים</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[profile.numChildren]}
                  onValueChange={(value) => updateProfile({ numChildren: value[0] })}
                  max={10}
                  step={1}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-blue-600 min-w-[2rem] text-center">
                  {profile.numChildren}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              רקע השכלתי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={profile.education} onValueChange={(value) => updateProfile({ education: value })}>
              <SelectTrigger>
                <SelectValue placeholder="בחר רמת השכלה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high-school">תיכון</SelectItem>
                <SelectItem value="practical">הכשרה מקצועית</SelectItem>
                <SelectItem value="bachelor">תואר ראשון</SelectItem>
                <SelectItem value="master">תואר שני</SelectItem>
                <SelectItem value="doctorate">תואר שלישי</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Link href="/uniform-mixes">
            <Button variant="outline" className="px-6 py-3">
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזור לתמהילים אחידים
            </Button>
          </Link>
          <Button
            onClick={() => setCurrentStep('financial')}
            disabled={!profile.maritalStatus || !profile.education}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            המשך
            <ArrowRight className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderFinancialStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">מצבך הכלכלי המפורט</h2>
        <p className="text-lg text-gray-600">פרטים נוספים על ההכנסות והיציבות הכלכלית שלך</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              וותק תעסוקתי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="employmentYears" className="text-base font-medium mb-2 block">
                כמה שנים אתה עובד אצל המעסיק הנוכחי?
              </Label>
              <Input
                id="employmentYears"
                type="number"
                value={profile.employmentYears}
                onChange={(e) => updateProfile({ employmentYears: parseInt(e.target.value) || 0 })}
                placeholder="מספר שנים"
                className="text-right"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              הכנסות נוספות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-base font-medium">האם יש לך קצבאות או הכנסות נוספות?</Label>
              <div className="flex gap-2">
                <Button
                  variant={profile.hasAllowances ? "default" : "outline"}
                  onClick={() => updateProfile({ hasAllowances: true })}
                  size="sm"
                >
                  כן
                </Button>
                <Button
                  variant={!profile.hasAllowances ? "default" : "outline"}
                  onClick={() => updateProfile({ hasAllowances: false })}
                  size="sm"
                >
                  לא
                </Button>
              </div>
            </div>

            {profile.hasAllowances && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <Label htmlFor="allowanceAmount" className="text-base font-medium mb-2 block">
                  סכום הקצבאות/הכנסות נוספות חודשיות
                </Label>
                <Input
                  id="allowanceAmount"
                  type="number"
                  value={profile.allowanceAmount}
                  onChange={(e) => updateProfile({ allowanceAmount: e.target.value })}
                  placeholder="₪"
                  className="text-right"
                />
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              תחזית כלכלית
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-base font-medium">האם אתה צופה סכום חד-פעמי בעתיד?</Label>
              <div className="flex gap-2">
                <Button
                  variant={profile.expectsLumpSum ? "default" : "outline"}
                  onClick={() => updateProfile({ expectsLumpSum: true })}
                  size="sm"
                >
                  כן
                </Button>
                <Button
                  variant={!profile.expectsLumpSum ? "default" : "outline"}
                  onClick={() => updateProfile({ expectsLumpSum: false })}
                  size="sm"
                >
                  לא
                </Button>
              </div>
            </div>

            {profile.expectsLumpSum && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="expectedLumpSum" className="text-base font-medium mb-2 block">
                    סכום משוער
                  </Label>
                  <Input
                    id="expectedLumpSum"
                    type="number"
                    value={profile.expectedLumpSum}
                    onChange={(e) => updateProfile({ expectedLumpSum: e.target.value })}
                    placeholder="₪"
                    className="text-right"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium mb-2 block">מתי אתה צופה לקבל את הסכום?</Label>
                  <Select value={profile.lumpSumTimeframe} onValueChange={(value) => updateProfile({ lumpSumTimeframe: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מסגרת זמן" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2-years">1-2 שנים</SelectItem>
                      <SelectItem value="3-5-years">3-5 שנים</SelectItem>
                      <SelectItem value="5-10-years">5-10 שנים</SelectItem>
                      <SelectItem value="10-plus-years">מעל 10 שנים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('personal')}
            className="px-6 py-3"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            חזור
          </Button>
          <Button
            onClick={() => setCurrentStep('future')}
            disabled={profile.employmentYears === 0}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            המשך
            <ArrowRight className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderFutureStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">תוכניות לעתיד</h2>
        <p className="text-lg text-gray-600">שינויים צפויים שישפיעו על המשכנתא שלך</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="w-5 h-5" />
              הרחבת המשפחה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-base font-medium">האם יש תוכניות להרחבת המשפחה?</Label>
              <div className="flex gap-2">
                <Button
                  variant={profile.plansFamilyExpansion ? "default" : "outline"}
                  onClick={() => updateProfile({ plansFamilyExpansion: true })}
                  size="sm"
                >
                  כן
                </Button>
                <Button
                  variant={!profile.plansFamilyExpansion ? "default" : "outline"}
                  onClick={() => updateProfile({ plansFamilyExpansion: false })}
                  size="sm"
                >
                  לא
                </Button>
              </div>
            </div>

            {profile.plansFamilyExpansion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-base font-medium mb-3 block">כמה ילדים נוספים מתוכננים?</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[profile.expectedNewChildren]}
                      onValueChange={(value) => updateProfile({ expectedNewChildren: value[0] })}
                      max={5}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-2xl font-bold text-green-600 min-w-[2rem] text-center">
                      {profile.expectedNewChildren}
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium mb-2 block">באיזה מסגרת זמן?</Label>
                  <Select value={profile.familyExpansionTimeframe} onValueChange={(value) => updateProfile({ familyExpansionTimeframe: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מסגרת זמן" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2-years">1-2 שנים</SelectItem>
                      <SelectItem value="3-5-years">3-5 שנים</SelectItem>
                      <SelectItem value="5-10-years">5-10 שנים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('financial')}
            className="px-6 py-3"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            חזור
          </Button>
          <Button
            onClick={() => setCurrentStep('risk')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            המשך
            <ArrowRight className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderRiskStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">העדפות אישיות</h2>
        <p className="text-lg text-gray-600">איך אתה מרגיש לגבי סיכונים ויציבות פיננסית</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              יציבות מול חיסכון
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-base font-medium mb-4 block">
                עד כמה חשוב לך שהתשלום החודשי יישאר קבוע?
              </Label>
              <div className="space-y-4">
                <Slider
                  value={[profile.prioritizeStability]}
                  onValueChange={(value) => updateProfile({ prioritizeStability: value[0] })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>מוכן לסיכון (חיסכון אפשרי)</span>
                  <span className="font-bold text-lg text-blue-600">{profile.prioritizeStability}</span>
                  <span>יציבות מקסימלית</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              נוחות עם שינויים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-base font-medium mb-4 block">
                עד כמה אתה נוח עם שינויים בריביות?
              </Label>
              <div className="space-y-4">
                <Slider
                  value={[profile.comfortableWithRateChanges]}
                  onValueChange={(value) => updateProfile({ comfortableWithRateChanges: value[0] })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>מעדיף קביעות</span>
                  <span className="font-bold text-lg text-green-600">{profile.comfortableWithRateChanges}</span>
                  <span>נוח עם שינויים</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              אופק תכנון
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={profile.planningHorizon} onValueChange={(value) => updateProfile({ planningHorizon: value })}>
              <SelectTrigger>
                <SelectValue placeholder="בחר אופק תכנון" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">קצר טווח (עד 5 שנים)</SelectItem>
                <SelectItem value="medium">בינוני (5-15 שנים)</SelectItem>
                <SelectItem value="long">ארוך טווח (מעל 15 שנים)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep('future')}
            className="px-6 py-3"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            חזור
          </Button>
          <Button
            onClick={() => setCurrentStep('dashboard')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            הצג את הפרופיל שלי
            <BarChart3 className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderDashboard = () => {
    if (!userData) return null;

    const propertyPrice = parseFloat(userData.propertyPrice) || 0;
    const ownCapital = parseFloat(userData.ownCapital) || 0;
    const loanAmount = propertyPrice - ownCapital;
    const ltvRatio = propertyPrice > 0 ? ((loanAmount / propertyPrice) * 100) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header Summary */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">הפרופיל הפיננסי שלך</h1>
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">סוג נכס</div>
                <div className="font-bold text-lg">{userData.propertyType}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">סכום משכנתא</div>
                <div className="font-bold text-lg text-blue-600">₪{loanAmount.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">אחוז מימון</div>
                <div className="font-bold text-lg text-purple-600">{ltvRatio.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">גיל</div>
                <div className="font-bold text-lg">{userData.age} שנים</div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Profile Dashboard */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Monthly Sensitivity */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                רגישות לעלייה בהחזר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="text-4xl font-bold text-orange-600 mb-2">
                  {riskProfile.monthlySensitivity}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${riskProfile.monthlySensitivity}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {riskProfile.monthlySensitivity < 30 ? 'רגישות נמוכה - מרווח נוח' :
                   riskProfile.monthlySensitivity < 70 ? 'רגישות בינונית - זהירות מומלצת' :
                   'רגישות גבוהה - דרוש ביטחון מקסימלי'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Future Flexibility */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                גמישות עתידית
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {riskProfile.futureFlexibility}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${riskProfile.futureFlexibility}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {riskProfile.futureFlexibility < 30 ? 'גמישות נמוכה - מצב קשיח' :
                   riskProfile.futureFlexibility < 70 ? 'גמישות בינונית - אפשרויות מוגבלות' :
                   'גמישות גבוהה - מרחב תמרון רחב'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Risk Tolerance */}
          <Card className="relative overflow-hidden border-2 border-blue-300 bg-blue-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                סיבולת סיכונים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {riskProfile.riskTolerance}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${riskProfile.riskTolerance}%` }}
                  />
                </div>
                <p className="text-sm text-blue-800 font-medium">
                  {riskProfile.riskTolerance < 30 ? 'שמרני - העדפה ליציבות מקסימלית' :
                   riskProfile.riskTolerance < 70 ? 'מאוזן - שילוב של יציבות וחיסכון' :
                   'אגרסיבי - מוכן לסיכון תמורת חיסכון'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personal Profile Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>סיכום הפרופיל האישי</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">פרטים אישיים</h4>
                <div className="space-y-1 text-sm">
                  <div>מצב משפחתי: <span className="font-medium">{profile.maritalStatus}</span></div>
                  <div>מספר ילדים: <span className="font-medium">{profile.numChildren}</span></div>
                  <div>השכלה: <span className="font-medium">{profile.education}</span></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">מצב תעסוקתי</h4>
                <div className="space-y-1 text-sm">
                  <div>ותק: <span className="font-medium">{profile.employmentYears} שנים</span></div>
                  <div>הכנסות נוספות: <span className="font-medium">{profile.hasAllowances ? `₪${parseFloat(profile.allowanceAmount || '0').toLocaleString()}` : 'אין'}</span></div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">תוכניות עתיד</h4>
                <div className="space-y-1 text-sm">
                  <div>הרחבת משפחה: <span className="font-medium">{profile.plansFamilyExpansion ? `כן (${profile.expectedNewChildren} ילדים)` : 'לא'}</span></div>
                  <div>סכום חד-פעמי: <span className="font-medium">{profile.expectsLumpSum ? `₪${parseFloat(profile.expectedLumpSum || '0').toLocaleString()}` : 'לא צפוי'}</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-green-900 mb-3">
              הפרופיל שלך מוכן!
            </h3>
            <p className="text-green-800 mb-6">
              על בסיס הפרופיל שלך, נוכל כעת לבנות עבורך תמהיל משכנתא מותאם במדויק לצרכים ולסיבולת הסיכונים שלך
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Target className="w-5 h-5 ml-2" />
                בנה תמהיל מותאם אישית
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCurrentStep('risk')}
                className="px-8 py-4 text-lg border-2 border-gray-300 hover:border-gray-400"
              >
                <ArrowLeft className="w-5 h-5 ml-2" />
                ערוך העדפות
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען כלי בניית תמהיל מותאם אישית...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
        <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
          <NavBar />
        </div>
        
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">לא נמצאו נתונים</h1>
            <p className="text-lg text-gray-600 mb-8">
              כדי לבנות תמהיל מותאם אישית, תחילה עליך לעבור דרך כלי תכנון המשכנתא
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
        {currentStep === 'personal' && renderPersonalStep()}
        {currentStep === 'financial' && renderFinancialStep()}
        {currentStep === 'future' && renderFutureStep()}
        {currentStep === 'risk' && renderRiskStep()}
        {currentStep === 'dashboard' && renderDashboard()}
      </div>
    </div>
  );
}
