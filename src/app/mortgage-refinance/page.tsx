'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Target, Banknote, Clock } from 'lucide-react';
import type { MortgageMix } from '@/components/mortgage-advisor/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import NavBar from '@/components/ui/navbar';
import { ScenarioAnalysis } from '@/components/mortgage-advisor/ScenarioAnalysis';
import { MortgageDetailsModal } from '@/components/mortgage-advisor/MortgageDetailsModal';
import { RefinanceMortgageInput } from '@/components/mortgage-refinance/RefinanceMortgageInput';
import { calculateMortgageMix } from '@/components/mortgage-advisor/mortgageCalculations';

type RefinanceStep = 'tracks' | 'goal';

const EMPTY_MIX: MortgageMix = {
  id: 'refinance-current',
  name: 'המשכנתא הנוכחית',
  totalAmount: 0,
  tracks: [],
  createdAt: new Date(),
};

export default function MortgageRefinancePage() {
  const [currentMix, setCurrentMix] = useState<MortgageMix>(EMPTY_MIX);
  const [currentStep, setCurrentStep] = useState<RefinanceStep>('tracks');
  const [inputMethod, setInputMethod] = useState<'scan' | 'manual'>('manual');
  const [showScenarioAnalysis, setShowScenarioAnalysis] = useState<MortgageMix | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<MortgageMix | null>(null);
  const [perTrackRefinanceEnabled, setPerTrackRefinanceEnabled] = useState(false);
  const [mixSummaryRevealed, setMixSummaryRevealed] = useState(false);
  const [readyForGoal, setReadyForGoal] = useState(false);

  const totalTracksAmount = currentMix.tracks.reduce((sum, track) => sum + track.amount, 0);
  const isMixValid =
    !!currentMix.bank &&
    currentMix.tracks.length > 0 &&
    (perTrackRefinanceEnabled ||
      (currentMix.totalAmount > 0 && Math.abs(totalTracksAmount - currentMix.totalAmount) < 1000));

  const mixWithCalculations = (): MortgageMix => {
    if (currentMix.tracks.length === 0) return currentMix;
    const calc = calculateMortgageMix(currentMix);
    return {
      ...calc.mix,
      name: `המשכנתא הנוכחית${currentMix.bank ? ` - ${currentMix.bank}` : ''}`,
    };
  };

  const handleGoalSelect = (_goal: 'reduce-payment' | 'shorten-period') => {
    setShowScenarioAnalysis(mixWithCalculations());
  };

  const renderRefinanceGoalSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">מה המטרה שלך במיחזור?</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          בחר את הכיוון שמתאים לך ונמשיך לניתוח האפשרויות
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Card
            className="group cursor-pointer border border-gray-200 hover:border-purple-300 transition-all duration-300 bg-white shadow-xl hover:shadow-2xl min-h-[320px]"
            onClick={() => handleGoalSelect('reduce-payment')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Banknote className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                הקטנת תשלום חודשי
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                מציאת תנאים טובים יותר שיפחיתו את ההחזר החודשי תוך שמירה על תקופת המשכנתא
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
          <Card
            className="group cursor-pointer border border-gray-200 hover:border-orange-300 transition-all duration-300 bg-white shadow-xl hover:shadow-2xl min-h-[320px]"
            onClick={() => handleGoalSelect('shorten-period')}
          >
            <CardContent className="p-8 text-center h-full flex flex-col justify-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors">
                הקטנת סכום
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                קיצור תקופת המשכנתא להקטנת הסכום הכולל שישולם עד סיום ההלוואה
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="text-center mt-8">
        <Button
          variant="outline"
          onClick={() => {
            setMixSummaryRevealed(false);
            setReadyForGoal(false);
            setCurrentStep('tracks');
          }}
          className="px-6 py-3"
        >
          <ArrowLeft className="w-5 h-5 ml-2" />
          חזור לפרטי התמהיל
        </Button>
      </div>
    </motion.div>
  );

  const renderScanUpload = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">סריקת דוח יתרות לסילוק</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          העלה את דוח היתרות לסילוק של המשכנתא הנוכחית שלך
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 mb-6">
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">גרור קובץ לכאן או לחץ לבחירה</p>
          <Button variant="outline" className="px-6 py-3">
            בחר קובץ
          </Button>
        </div>

        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => setInputMethod('manual')} className="px-6 py-3">
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור להזנה ידנית
          </Button>
          <Button onClick={() => setInputMethod('manual')} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white">
            <Target className="w-5 h-5 ml-2" />
            המשך להזנת מסלולים
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderManualInput = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-6xl mx-auto"
    >
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">הזנת פרטי המשכנתא הנוכחית</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          הזן את נתוני המשכנתא והמסלולים כדי לחשב את אפשרויות המיחזור
        </p>
        <Button variant="link" className="mt-4 text-blue-600" onClick={() => setInputMethod('scan')}>
          <Upload className="w-4 h-4 ml-2" />
          העלאת דוח יתרות לסילוק במקום הזנה ידנית
        </Button>
      </div>

      <RefinanceMortgageInput
        mix={currentMix}
        onMixChange={setCurrentMix}
        perTrackRefinanceEnabled={perTrackRefinanceEnabled}
        onPerTrackRefinanceEnabledChange={setPerTrackRefinanceEnabled}
        onMixSummaryRevealedChange={(revealed) => {
          setMixSummaryRevealed(revealed);
          if (revealed) setReadyForGoal(true);
        }}
        readyForGoal={readyForGoal}
        onReadyForGoalChange={setReadyForGoal}
        onProceedToRefinanceOptions={() => setCurrentStep('goal')}
        onShowDetails={setShowDetailsModal}
        onAnalyzeScenarios={setShowScenarioAnalysis}
      />

      <div className="flex gap-4 justify-center mt-8">
        <Link href="/">
          <Button variant="outline" className="px-6 py-3">
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור לעמוד הבית
          </Button>
        </Link>
        {/* בזרימה הרגילה בחירת מטרת המיחזור מתבצעת בתוך תיבת המצב הנוכחי. הכפתור נשאר לזרימת מיחזור לכל מסלול. */}
        {perTrackRefinanceEnabled && (
          <Button
            onClick={() => setCurrentStep('goal')}
            disabled={!isMixValid || !readyForGoal}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Target className="w-5 h-5 ml-2" />
            המשך לבחירת מטרת המיחזור
          </Button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50">
      <div className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100">
        <NavBar />
      </div>

      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        {currentStep === 'goal' && renderRefinanceGoalSelection()}
        {currentStep === 'tracks' && inputMethod === 'scan' && renderScanUpload()}
        {currentStep === 'tracks' && inputMethod === 'manual' && renderManualInput()}
      </div>

      <MortgageDetailsModal
        mix={showDetailsModal}
        isOpen={!!showDetailsModal}
        onClose={() => setShowDetailsModal(null)}
      />

      {showScenarioAnalysis && (
        <ScenarioAnalysis baseMix={showScenarioAnalysis} onClose={() => setShowScenarioAnalysis(null)} />
      )}
    </div>
  );
}
