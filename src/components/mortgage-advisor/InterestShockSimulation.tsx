'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingUp, RotateCcw, Play, Pause, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface InterestShockSimulationProps {
  mortgageStructure: {
    totalAmount: number;
    primeRate: number;
    fixedRate: number;
    indexLinked: number;
  };
  onShockTest: (results: any) => void;
}

interface ShockScenario {
  id: string;
  name: string;
  description: string;
  increase: number;
  color: string;
  intensity: 'mild' | 'moderate' | 'severe';
}

const shockScenarios: ShockScenario[] = [
  {
    id: 'mild',
    name: 'עלייה מתונה',
    description: 'עלייה של 1% בריבית',
    increase: 1,
    color: '#f59e0b',
    intensity: 'mild'
  },
  {
    id: 'moderate',
    name: 'עלייה משמעותית',
    description: 'עלייה של 2% בריבית',
    increase: 2,
    color: '#f97316',
    intensity: 'moderate'
  },
  {
    id: 'severe',
    name: 'הלם חריף',
    description: 'עלייה של 3% בריבית',
    increase: 3,
    color: '#dc2626',
    intensity: 'severe'
  }
];

export function InterestShockSimulation({ mortgageStructure, onShockTest }: InterestShockSimulationProps) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const calculateBasePayment = () => {
    // Simplified calculation - in real app would be more complex
    const baseRate = 0.05; // 5% base rate
    const monthlyRate = baseRate / 12;
    const periods = 25 * 12; // 25 years
    
    const monthlyPayment = (mortgageStructure.totalAmount * monthlyRate * Math.pow(1 + monthlyRate, periods)) / 
                          (Math.pow(1 + monthlyRate, periods) - 1);
    
    return monthlyPayment;
  };

  const calculateShockImpact = (scenario: ShockScenario) => {
    const basePayment = calculateBasePayment();
    const shockedRate = 0.05 + (scenario.increase / 100);
    const monthlyShockedRate = shockedRate / 12;
    const periods = 25 * 12;
    
    // Only prime rate portion is affected by interest rate changes
    const primePortionAmount = mortgageStructure.totalAmount * (mortgageStructure.primeRate / 100);
    const fixedPortionPayment = basePayment * (mortgageStructure.fixedRate / 100);
    const indexLinkedPortionPayment = basePayment * (mortgageStructure.indexLinked / 100);
    
    const shockedPrimePayment = (primePortionAmount * monthlyShockedRate * Math.pow(1 + monthlyShockedRate, periods)) / 
                               (Math.pow(1 + monthlyShockedRate, periods) - 1);
    
    const newTotalPayment = shockedPrimePayment + fixedPortionPayment + indexLinkedPortionPayment;
    const paymentIncrease = newTotalPayment - basePayment;
    const percentageIncrease = (paymentIncrease / basePayment) * 100;
    
    // Generate chart data
    const chartData = [];
    for (let year = 0; year <= 25; year++) {
      chartData.push({
        year,
        original: basePayment,
        shocked: newTotalPayment,
        difference: paymentIncrease
      });
    }

    return {
      basePayment,
      newPayment: newTotalPayment,
      increase: paymentIncrease,
      percentageIncrease,
      totalExtraCost: paymentIncrease * periods,
      chartData,
      affectedPortion: mortgageStructure.primeRate
    };
  };

  const runSimulation = async (scenario: ShockScenario) => {
    setIsSimulating(true);
    setShowAnimation(true);
    setActiveScenario(scenario.id);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = calculateShockImpact(scenario);
    setSimulationResults(results);
    setIsSimulating(false);
    setShowAnimation(false);
    
    onShockTest(results);
  };

  const resetSimulation = () => {
    setActiveScenario(null);
    setSimulationResults(null);
    setIsSimulating(false);
    setShowAnimation(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getScenarioIcon = (intensity: string) => {
    switch (intensity) {
      case 'mild': return '📊';
      case 'moderate': return '⚠️';
      case 'severe': return '🚨';
      default: return '📈';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2 flex items-center justify-center gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          סימולציית הלם ריבית
        </h2>
        <p className="text-slate-600">
          בדקו איך עליות ריבית עתידיות ישפיעו על ההחזר החודשי שלכם
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scenario Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">בחרו תרחיש</h3>
          
          {shockScenarios.map((scenario) => (
            <motion.div
              key={scenario.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`
                  p-4 cursor-pointer transition-all duration-200
                  ${activeScenario === scenario.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                    : 'hover:shadow-md border-slate-200'
                  }
                `}
                onClick={() => !isSimulating && runSimulation(scenario)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">{getScenarioIcon(scenario.intensity)}</div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{scenario.name}</h4>
                    <p className="text-sm text-slate-600">{scenario.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    className={`
                      ${scenario.intensity === 'mild' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${scenario.intensity === 'moderate' ? 'bg-orange-100 text-orange-800' : ''}
                      ${scenario.intensity === 'severe' ? 'bg-red-100 text-red-800' : ''}
                    `}
                  >
                    +{scenario.increase}% ריבית
                  </Badge>
                  
                  {isSimulating && activeScenario === scenario.id ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">מחשב...</span>
                    </div>
                  ) : (
                    <Play className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Reset Button */}
          {(activeScenario || simulationResults) && (
            <Button
              variant="outline"
              onClick={resetSimulation}
              className="w-full flex items-center gap-2"
              disabled={isSimulating}
            >
              <RotateCcw className="w-4 h-4" />
              איפוס סימולציה
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {isSimulating && showAnimation && (
              <motion.div
                key="simulation"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-center h-64"
              >
                <Card className="p-8 text-center bg-blue-50 border-blue-200">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <TrendingUp className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    מריץ סימולציה...
                  </h3>
                  <p className="text-blue-600">
                    מחשב את ההשפעה על ההחזר החודשי
                  </p>
                </Card>
              </motion.div>
            )}

            {simulationResults && !isSimulating && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Impact Summary */}
                <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    השפעת הלם הריבית
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/60 rounded-lg p-4 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="text-2xl font-bold text-red-600"
                      >
                        +{formatCurrency(simulationResults.increase)}
                      </motion.div>
                      <div className="text-sm text-slate-600">עלייה חודשית</div>
                    </div>
                    
                    <div className="bg-white/60 rounded-lg p-4 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="text-2xl font-bold text-orange-600"
                      >
                        +{simulationResults.percentageIncrease.toFixed(1)}%
                      </motion.div>
                      <div className="text-sm text-slate-600">אחוז עלייה</div>
                    </div>
                    
                    <div className="bg-white/60 rounded-lg p-4 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6, type: "spring" }}
                        className="text-2xl font-bold text-red-700"
                      >
                        {formatCurrency(simulationResults.totalExtraCost)}
                      </motion.div>
                      <div className="text-sm text-slate-600">עלות נוספת כוללת</div>
                    </div>
                  </div>

                  {/* Protection Note */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-emerald-800">
                        <span className="font-medium">הגנה חלקית: </span>
                        רק {simulationResults.affectedPortion}% מהמשכנתא (החלק המשתנה) מושפע מעליית הריבית.
                        החלק הקבוע והצמוד נשארים יציבים.
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Chart */}
                <Card className="p-6">
                  <h4 className="font-semibold text-slate-800 mb-4">השוואת החזר לאורך זמן</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={simulationResults.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="year" 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          label={{ value: 'שנים', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#64748b' }}
                          tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip 
                          formatter={(value: any) => [formatCurrency(value), '']}
                          labelFormatter={(label) => `שנה ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="original" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="החזר מקורי"
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="shocked" 
                          stroke="#dc2626" 
                          strokeWidth={2}
                          name="החזר אחרי הלם"
                          dot={false}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>
            )}

            {!activeScenario && !simulationResults && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-64"
              >
                <Card className="p-8 text-center border-slate-200">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">
                    בחרו תרחיש לסימולציה
                  </h3>
                  <p className="text-slate-500">
                    לחצו על אחד מהתרחישים כדי לראות את ההשפעה על המשכנתא
                  </p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}