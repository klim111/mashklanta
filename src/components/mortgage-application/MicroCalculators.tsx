'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, TrendingUp, Settings, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

interface CalculatorResult {
  label: string;
  value: number | string;
  format: 'currency' | 'percentage' | 'number';
  trend?: 'up' | 'down' | 'neutral';
}

interface MicroCalculatorProps {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  inputs: {
    id: string;
    label: string;
    type: 'number' | 'currency' | 'percentage';
    value: number;
    min?: number;
    max?: number;
    step?: number;
  }[];
  results: CalculatorResult[];
  onInputChange: (inputId: string, value: number) => void;
  onAdvancedToggle?: (expanded: boolean) => void;
  advancedInputs?: {
    id: string;
    label: string;
    type: 'number' | 'currency' | 'percentage';
    value: number;
    min?: number;
    max?: number;
    step?: number;
  }[];
}

export function MicroCalculator({
  id,
  title,
  description,
  icon: IconComponent,
  color,
  inputs,
  results,
  onInputChange,
  onAdvancedToggle,
  advancedInputs = []
}: MicroCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatValue = (value: number | string, format: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('he-IL', {
          style: 'currency',
          currency: 'ILS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const handleAdvancedToggle = () => {
    const newExpanded = !showAdvanced;
    setShowAdvanced(newExpanded);
    onAdvancedToggle?.(newExpanded);
  };

  const renderInput = (input: any) => (
    <div key={input.id} className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {input.label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={input.value}
          onChange={(e) => onInputChange(input.id, Number(e.target.value))}
          min={input.min}
          max={input.max}
          step={input.step || 1}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          dir="rtl"
        />
        {input.type === 'currency' && (
          <span className="absolute left-3 top-2 text-xs text-slate-500">₪</span>
        )}
        {input.type === 'percentage' && (
          <span className="absolute left-3 top-2 text-xs text-slate-500">%</span>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Calculator Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-600">{description}</p>
            </div>
          </div>
          
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </motion.div>
          </motion.button>
        </div>

        {/* Quick Results */}
        <div className="grid grid-cols-2 gap-4">
          {results.slice(0, 2).map((result, index) => (
            <motion.div
              key={index}
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className={`text-lg font-bold ${
                result.trend === 'up' ? 'text-emerald-600' :
                result.trend === 'down' ? 'text-red-600' :
                'text-slate-800'
              }`}>
                {formatValue(result.value, result.format)}
              </div>
              <div className="text-xs text-slate-600">{result.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-6">
              {/* Basic Inputs */}
              <div className="grid md:grid-cols-2 gap-4">
                {inputs.map(renderInput)}
              </div>

              {/* Advanced Toggle */}
              {advancedInputs.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleAdvancedToggle}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>פרמטרים מתקדמים</span>
                    <motion.div
                      animate={{ rotate: showAdvanced ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 grid md:grid-cols-2 gap-4 overflow-hidden"
                      >
                        {advancedInputs.map(renderInput)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* All Results */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-800 mb-4">תוצאות מפורטות</h4>
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <span className="text-sm text-slate-700">{result.label}</span>
                      <div className="flex items-center gap-2">
                        {result.trend && (
                          <TrendingUp 
                            className={`w-4 h-4 ${
                              result.trend === 'up' ? 'text-emerald-600' :
                              result.trend === 'down' ? 'text-red-600 rotate-180' :
                              'text-slate-400'
                            }`}
                          />
                        )}
                        <span className={`font-semibold ${
                          result.trend === 'up' ? 'text-emerald-600' :
                          result.trend === 'down' ? 'text-red-600' :
                          'text-slate-800'
                        }`}>
                          {formatValue(result.value, result.format)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Visual Chart Placeholder */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-800 mb-4">תצוגה גרפית</h4>
                <div className="h-32 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm">גרף יוצג כאן</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Predefined calculator configurations
export const calculatorConfigs = {
  monthlyPayment: {
    id: 'monthly-payment',
    title: 'חישוב החזר חודשי',
    description: 'חישוב PMT מדויק',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
    inputs: [
      { id: 'loanAmount', label: 'סכום הלוואה', type: 'currency' as const, value: 1000000, min: 50000 },
      { id: 'interestRate', label: 'ריבית שנתית', type: 'percentage' as const, value: 4.5, min: 0, max: 15, step: 0.1 },
      { id: 'years', label: 'תקופה בשנים', type: 'number' as const, value: 25, min: 5, max: 30 }
    ],
    advancedInputs: [
      { id: 'fees', label: 'עמלות חודשיות', type: 'currency' as const, value: 50, min: 0 },
      { id: 'insurance', label: 'ביטוח חודשי', type: 'currency' as const, value: 200, min: 0 }
    ]
  },
  
  affordability: {
    id: 'affordability',
    title: 'בדיקת יכולת החזר',
    description: 'יחס החזר להכנסה',
    icon: TrendingUp,
    color: 'from-emerald-500 to-teal-600',
    inputs: [
      { id: 'monthlyIncome', label: 'הכנסה חודשית', type: 'currency' as const, value: 25000, min: 5000 },
      { id: 'monthlyPayment', label: 'החזר חודשי', type: 'currency' as const, value: 8000, min: 1000 },
      { id: 'otherDebts', label: 'התחייבויות אחרות', type: 'currency' as const, value: 2000, min: 0 }
    ],
    advancedInputs: [
      { id: 'livingExpenses', label: 'הוצאות קיום', type: 'currency' as const, value: 8000, min: 3000 },
      { id: 'safetyMargin', label: 'מרווח ביטחון', type: 'percentage' as const, value: 10, min: 0, max: 30 }
    ]
  }
};

interface MicroCalculatorsProps {
  activeCalculators?: string[];
}

export function MicroCalculators({ activeCalculators = ['monthly-payment', 'affordability'] }: MicroCalculatorsProps) {
  const [calculatorStates, setCalculatorStates] = useState<Record<string, any>>({
    'monthly-payment': {
      loanAmount: 1000000,
      interestRate: 4.5,
      years: 25,
      fees: 50,
      insurance: 200
    },
    'affordability': {
      monthlyIncome: 25000,
      monthlyPayment: 8000,
      otherDebts: 2000,
      livingExpenses: 8000,
      safetyMargin: 10
    }
  });

  const handleInputChange = (calculatorId: string, inputId: string, value: number) => {
    setCalculatorStates(prev => ({
      ...prev,
      [calculatorId]: {
        ...prev[calculatorId],
        [inputId]: value
      }
    }));
  };

  const calculateResults = (calculatorId: string) => {
    const state = calculatorStates[calculatorId] || {};
    
    switch (calculatorId) {
      case 'monthly-payment': {
        const { loanAmount = 1000000, interestRate = 4.5, years = 25, fees = 50, insurance = 200 } = state;
        const monthlyRate = interestRate / 100 / 12;
        const numPayments = years * 12;
        const payment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                        (Math.pow(1 + monthlyRate, numPayments) - 1);
        const totalPayment = payment + fees + insurance;
        const totalInterest = (payment * numPayments) - loanAmount;
        
        return [
          { label: 'החזר חודשי', value: totalPayment, format: 'currency', trend: 'neutral' },
          { label: 'רק קרן וריבית', value: payment, format: 'currency', trend: 'neutral' },
          { label: 'סה"כ ריבית', value: totalInterest, format: 'currency', trend: 'down' },
          { label: 'סה"כ תשלומים', value: totalPayment * numPayments, format: 'currency', trend: 'down' }
        ];
      }
      
      case 'affordability': {
        const { monthlyIncome = 25000, monthlyPayment = 8000, otherDebts = 2000, livingExpenses = 8000, safetyMargin = 10 } = state;
        const totalDebts = monthlyPayment + otherDebts;
        const debtRatio = (totalDebts / monthlyIncome) * 100;
        const availableIncome = monthlyIncome - totalDebts - livingExpenses;
        const safetyAmount = (monthlyIncome * safetyMargin) / 100;
        const netAvailable = availableIncome - safetyAmount;
        
        return [
          { label: 'יחס החזר', value: debtRatio, format: 'percentage', trend: debtRatio > 40 ? 'down' : 'up' },
          { label: 'הכנסה פנויה', value: netAvailable, format: 'currency', trend: netAvailable > 0 ? 'up' : 'down' },
          { label: 'סה"כ התחייבויות', value: totalDebts, format: 'currency', trend: 'neutral' },
          { label: 'מרווח ביטחון', value: safetyAmount, format: 'currency', trend: 'up' }
        ];
      }
      
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">
          מחשבונים חכמים
        </h2>
        <p className="text-slate-600">
          כלי חישוב מתקדמים עם פרמטרים מותאמים אישית
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {activeCalculators.map(calculatorId => {
          const config = calculatorConfigs[calculatorId as keyof typeof calculatorConfigs];
          if (!config) return null;

          return (
            <MicroCalculator
              key={calculatorId}
              {...config}
              inputs={config.inputs.map(input => ({
                ...input,
                value: calculatorStates[calculatorId]?.[input.id] ?? input.value
              }))}
              advancedInputs={config.advancedInputs?.map(input => ({
                ...input,
                value: calculatorStates[calculatorId]?.[input.id] ?? input.value
              }))}
              results={calculateResults(calculatorId)}
              onInputChange={(inputId, value) => handleInputChange(calculatorId, inputId, value)}
            />
          );
        })}
      </div>
    </div>
  );
}