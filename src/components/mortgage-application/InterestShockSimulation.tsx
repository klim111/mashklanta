'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Shield, RotateCcw, Zap } from 'lucide-react';

interface MortgageData {
  loanAmount: number;
  currentRate: number;
  monthlyPayment: number;
  remainingYears: number;
  trackType: 'prime' | 'variable' | 'fixed' | 'indexLinked';
}

interface ShockScenario {
  id: string;
  label: string;
  increase: number;
  description: string;
  color: string;
  severity: 'low' | 'medium' | 'high';
}

const shockScenarios: ShockScenario[] = [
  {
    id: 'mild',
    label: '+0.5%',
    increase: 0.5,
    description: 'עלייה מתונה',
    color: 'from-yellow-400 to-orange-500',
    severity: 'low'
  },
  {
    id: 'moderate',
    label: '+1.0%',
    increase: 1.0,
    description: 'עלייה בינונית',
    color: 'from-orange-500 to-red-500',
    severity: 'medium'
  },
  {
    id: 'severe',
    label: '+2.0%',
    increase: 2.0,
    description: 'עלייה חדה',
    color: 'from-red-500 to-red-700',
    severity: 'high'
  },
  {
    id: 'extreme',
    label: '+3.0%',
    increase: 3.0,
    description: 'עלייה קיצונית',
    color: 'from-red-700 to-red-900',
    severity: 'high'
  }
];

interface InterestShockSimulationProps {
  mortgageData: MortgageData;
  onClose?: () => void;
}

export function InterestShockSimulation({ 
  mortgageData, 
  onClose 
}: InterestShockSimulationProps) {
  const [activeScenario, setActiveScenario] = useState<ShockScenario | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'shock' | 'result'>('idle');

  const calculateShockImpact = (scenario: ShockScenario) => {
    const { loanAmount, currentRate, remainingYears, trackType } = mortgageData;
    
    // Only variable rate tracks are affected by interest shocks
    const isAffected = trackType === 'prime' || trackType === 'variable';
    
    if (!isAffected) {
      return {
        newRate: currentRate,
        newMonthlyPayment: mortgageData.monthlyPayment,
        monthlyIncrease: 0,
        yearlyIncrease: 0,
        totalIncrease: 0,
        isAffected: false
      };
    }

    const newRate = currentRate + scenario.increase;
    const monthlyRate = newRate / 100 / 12;
    const numPayments = remainingYears * 12;
    
    const newMonthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const monthlyIncrease = newMonthlyPayment - mortgageData.monthlyPayment;
    const yearlyIncrease = monthlyIncrease * 12;
    const totalIncrease = monthlyIncrease * numPayments;

    return {
      newRate,
      newMonthlyPayment,
      monthlyIncrease,
      yearlyIncrease,
      totalIncrease,
      isAffected: true
    };
  };

  const runSimulation = (scenario: ShockScenario) => {
    setIsSimulating(true);
    setAnimationPhase('shock');
    
    // Shock animation
    setTimeout(() => {
      setActiveScenario(scenario);
      setAnimationPhase('result');
    }, 1000);
    
    // Complete simulation
    setTimeout(() => {
      setIsSimulating(false);
    }, 1500);
  };

  const resetSimulation = () => {
    setActiveScenario(null);
    setAnimationPhase('idle');
    setIsSimulating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const trackTypeLabels = {
    prime: 'פריים',
    variable: 'משתנה',
    fixed: 'קבועה',
    indexLinked: 'צמוד מדד'
  };

  const currentImpact = activeScenario ? calculateShockImpact(activeScenario) : null;

  return (
    <motion.div
      className="max-w-4xl mx-auto p-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-red-600 rounded-full flex items-center justify-center">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          סימולציית הלם ריבית
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          בדקו איך עלייה בריבית תשפיע על ההחזר החודשי שלכם
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Current Mortgage Info */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            המשכנתא הנוכחית
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-600">סכום הלוואה:</span>
              <span className="font-semibold">{formatCurrency(mortgageData.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ריבית נוכחית:</span>
              <span className="font-semibold">{mortgageData.currentRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">החזר חודשי:</span>
              <span className="font-semibold">{formatCurrency(mortgageData.monthlyPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">סוג מסלול:</span>
              <span className="font-semibold">{trackTypeLabels[mortgageData.trackType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">שנים נותרות:</span>
              <span className="font-semibold">{mortgageData.remainingYears}</span>
            </div>
          </div>

          {/* Protection Status */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              {mortgageData.trackType === 'fixed' ? (
                <Shield className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <span className="font-medium text-slate-800">
                {mortgageData.trackType === 'fixed' ? 'מוגן מהלם ריבית' : 'חשוף להלם ריבית'}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {mortgageData.trackType === 'fixed' 
                ? 'המסלול הקבוע שלכם מוגן מעליות ריבית'
                : 'המסלול שלכם עלול להיפגע מעליות ריבית'
              }
            </p>
          </div>
        </motion.div>

        {/* Simulation Controls */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              תרחישי עלייה
            </h3>
            
            <div className="space-y-3">
              {shockScenarios.map((scenario) => (
                <motion.button
                  key={scenario.id}
                  onClick={() => runSimulation(scenario)}
                  disabled={isSimulating}
                  className={`
                    w-full p-4 rounded-xl text-right transition-all
                    ${activeScenario?.id === scenario.id
                      ? `bg-gradient-to-r ${scenario.color} text-white shadow-lg`
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }
                    ${isSimulating ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                  `}
                  whileHover={!isSimulating ? { scale: 1.02, x: -4 } : {}}
                  whileTap={!isSimulating ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg">
                        {scenario.label}
                      </div>
                      <div className="text-sm opacity-80">
                        {scenario.description}
                      </div>
                    </div>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </motion.button>
              ))}
            </div>

            {activeScenario && (
              <motion.button
                onClick={resetSimulation}
                className="w-full mt-4 p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center justify-center gap-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>איפוס</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Results */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            תוצאות הסימולציה
          </h3>

          <AnimatePresence mode="wait">
            {!activeScenario ? (
              <motion.div
                key="no-simulation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 text-slate-500"
              >
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>בחרו תרחיש עלייה לראות את ההשפעה</p>
              </motion.div>
            ) : (
              <motion.div
                key="simulation-results"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                {/* Shock Animation */}
                <AnimatePresence>
                  {animationPhase === 'shock' && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-red-500/20 rounded-2xl flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [1, 1.05, 1]
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1, repeat: 2 }}
                    >
                      <motion.div
                        animate={{ 
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 0.5, repeat: 2 }}
                      >
                        <Zap className="w-16 h-16 text-amber-500" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {currentImpact && animationPhase === 'result' && (
                  <div className="space-y-4">
                    {!currentImpact.isAffected ? (
                      <motion.div
                        className="text-center py-4 bg-emerald-50 rounded-xl border border-emerald-200"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Shield className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="text-emerald-800 font-medium">
                          המסלול שלכם מוגן!
                        </p>
                        <p className="text-sm text-emerald-700">
                          ריבית קבועה לא מושפעת מהלם
                        </p>
                      </motion.div>
                    ) : (
                      <>
                        {/* New Monthly Payment */}
                        <motion.div
                          className="text-center p-4 bg-red-50 rounded-xl border border-red-200"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="text-2xl font-bold text-red-700 mb-1">
                            {formatCurrency(currentImpact.newMonthlyPayment)}
                          </div>
                          <div className="text-sm text-red-600">
                            החזר חודשי חדש
                          </div>
                        </motion.div>

                        {/* Impact Details */}
                        <div className="space-y-3">
                          <motion.div
                            className="flex justify-between items-center p-3 bg-amber-50 rounded-lg"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          >
                            <span className="text-slate-700">עלייה חודשית:</span>
                            <span className="font-bold text-amber-700 flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              {formatCurrency(currentImpact.monthlyIncrease)}
                            </span>
                          </motion.div>

                          <motion.div
                            className="flex justify-between items-center p-3 bg-orange-50 rounded-lg"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          >
                            <span className="text-slate-700">עלייה שנתית:</span>
                            <span className="font-bold text-orange-700">
                              {formatCurrency(currentImpact.yearlyIncrease)}
                            </span>
                          </motion.div>

                          <motion.div
                            className="flex justify-between items-center p-3 bg-red-50 rounded-lg"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                          >
                            <span className="text-slate-700">עלייה כוללת:</span>
                            <span className="font-bold text-red-700">
                              {formatCurrency(currentImpact.totalIncrease)}
                            </span>
                          </motion.div>
                        </div>

                        {/* Risk Level */}
                        <motion.div
                          className={`p-4 rounded-xl text-center ${
                            activeScenario.severity === 'low' ? 'bg-yellow-50 border border-yellow-200' :
                            activeScenario.severity === 'medium' ? 'bg-orange-50 border border-orange-200' :
                            'bg-red-50 border border-red-200'
                          }`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.4 }}
                        >
                          <div className={`text-sm font-medium ${
                            activeScenario.severity === 'low' ? 'text-yellow-800' :
                            activeScenario.severity === 'medium' ? 'text-orange-800' :
                            'text-red-800'
                          }`}>
                            רמת סיכון: {
                              activeScenario.severity === 'low' ? 'נמוכה' :
                              activeScenario.severity === 'medium' ? 'בינונית' :
                              'גבוהה'
                            }
                          </div>
                        </motion.div>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Close Button */}
      {onClose && (
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            סגור סימולציה
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// Example usage component
export function InterestShockDemo() {
  const sampleMortgage: MortgageData = {
    loanAmount: 1000000,
    currentRate: 4.5,
    monthlyPayment: 5500,
    remainingYears: 20,
    trackType: 'prime'
  };

  return <InterestShockSimulation mortgageData={sampleMortgage} />;
}