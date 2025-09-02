'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronDown, TrendingUp, Home, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface MicroCalculatorProps {
  type: 'payment' | 'affordability' | 'ratio';
  inputs: string[];
  values: Record<string, any>;
}

export function MicroCalculator({ type, inputs, values }: MicroCalculatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calculation, setCalculation] = useState<any>(null);

  // Calculate based on type and inputs
  useEffect(() => {
    const calculate = () => {
      switch (type) {
        case 'affordability':
          return calculateAffordability();
        case 'payment':
          return calculatePayment();
        case 'ratio':
          return calculateRatio();
        default:
          return null;
      }
    };

    setCalculation(calculate());
  }, [type, inputs, values]);

  const calculateAffordability = () => {
    const ownCapital = values['personalInfo.ownCapital'] || 0;
    const monthlyIncome = values['personalInfo.monthlyIncome'] || 0;
    
    if (!ownCapital || !monthlyIncome) return null;

    const maxMonthlyPayment = monthlyIncome * 0.4; // 40% rule
    const maxMortgageAmount = maxMonthlyPayment * 12 * 25; // Rough estimate for 25 years
    const maxPropertyPrice = maxMortgageAmount + ownCapital;

    return {
      maxPropertyPrice,
      maxMortgageAmount,
      maxMonthlyPayment,
      downPaymentPercentage: (ownCapital / maxPropertyPrice) * 100,
      chartData: [
        { name: 'הון עצמי', value: ownCapital, color: '#10b981' },
        { name: 'משכנתא', value: maxMortgageAmount, color: '#3b82f6' }
      ]
    };
  };

  const calculatePayment = () => {
    const propertyPrice = values['propertyInfo.price'] || 0;
    const ownCapital = values['personalInfo.ownCapital'] || 0;
    
    if (!propertyPrice || !ownCapital) return null;

    const mortgageAmount = propertyPrice - ownCapital;
    const monthlyPayment = (mortgageAmount * 0.005) / (1 - Math.pow(1 + 0.005, -300)); // 5% annual, 25 years
    
    return {
      mortgageAmount,
      monthlyPayment,
      totalInterest: (monthlyPayment * 300) - mortgageAmount,
      totalPayment: monthlyPayment * 300,
      chartData: [
        { name: 'קרן', value: mortgageAmount, color: '#3b82f6' },
        { name: 'ריבית', value: (monthlyPayment * 300) - mortgageAmount, color: '#f59e0b' }
      ]
    };
  };

  const calculateRatio = () => {
    const monthlyIncome = values['personalInfo.monthlyIncome'] || 0;
    const monthlyExpenses = values['personalInfo.monthlyExpenses'] || 0;
    
    if (!monthlyIncome) return null;

    const availableIncome = monthlyIncome - monthlyExpenses;
    const recommendedPayment = monthlyIncome * 0.35; // Conservative 35%
    const maxPayment = monthlyIncome * 0.4; // Maximum 40%

    return {
      availableIncome,
      recommendedPayment,
      maxPayment,
      currentRatio: monthlyExpenses / monthlyIncome,
      chartData: [
        { name: 'הוצאות קיימות', value: monthlyExpenses, color: '#ef4444' },
        { name: 'משכנתא מומלצת', value: recommendedPayment, color: '#10b981' },
        { name: 'יתרה חופשית', value: monthlyIncome - monthlyExpenses - recommendedPayment, color: '#6b7280' }
      ]
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCalculatorTitle = () => {
    switch (type) {
      case 'affordability':
        return 'מחשבון יכולת קנייה';
      case 'payment':
        return 'מחשבון החזר חודשי';
      case 'ratio':
        return 'מחשבון יחס החזר';
      default:
        return 'מחשבון';
    }
  };

  const getCalculatorIcon = () => {
    switch (type) {
      case 'affordability':
        return Home;
      case 'payment':
        return DollarSign;
      case 'ratio':
        return TrendingUp;
      default:
        return Calculator;
    }
  };

  if (!calculation) {
    return null;
  }

  const Icon = getCalculatorIcon();

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                {getCalculatorTitle()}
              </h3>
              <p className="text-xs text-slate-600">לחץ לחישוב מפורט</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-slate-200"
          >
            <div className="p-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {type === 'affordability' && (
                  <>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-emerald-800">
                        {formatCurrency(calculation.maxPropertyPrice)}
                      </div>
                      <div className="text-xs text-emerald-600">מחיר מקסימלי</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-blue-800">
                        {formatCurrency(calculation.maxMonthlyPayment)}
                      </div>
                      <div className="text-xs text-blue-600">החזר חודשי</div>
                    </div>
                  </>
                )}

                {type === 'payment' && (
                  <>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-blue-800">
                        {formatCurrency(calculation.monthlyPayment)}
                      </div>
                      <div className="text-xs text-blue-600">החזר חודשי</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-orange-800">
                        {formatCurrency(calculation.totalInterest)}
                      </div>
                      <div className="text-xs text-orange-600">ריבית כוללת</div>
                    </div>
                  </>
                )}

                {type === 'ratio' && (
                  <>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-emerald-800">
                        {formatCurrency(calculation.recommendedPayment)}
                      </div>
                      <div className="text-xs text-emerald-600">החזר מומלץ</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-slate-800">
                        {Math.round(calculation.currentRatio * 100)}%
                      </div>
                      <div className="text-xs text-slate-600">יחס הוצאות</div>
                    </div>
                  </>
                )}
              </div>

              {/* Chart */}
              <div className="h-32 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calculation.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis hide />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {calculation.chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Advanced Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full mb-3 h-8 text-xs"
              >
                {showAdvanced ? 'פחות פרטים' : 'פרטים מתקדמים'}
              </Button>

              {/* Advanced Details */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    {type === 'affordability' && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">אחוז מקדמה:</span>
                          <span className="font-medium">{Math.round(calculation.downPaymentPercentage)}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">סכום משכנתא:</span>
                          <span className="font-medium">{formatCurrency(calculation.maxMortgageAmount)}</span>
                        </div>
                      </>
                    )}

                    {type === 'payment' && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">תשלום כולל:</span>
                          <span className="font-medium">{formatCurrency(calculation.totalPayment)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">יחס ריבית/קרן:</span>
                          <span className="font-medium">
                            {Math.round((calculation.totalInterest / calculation.mortgageAmount) * 100)}%
                          </span>
                        </div>
                      </>
                    )}

                    {type === 'ratio' && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">הכנסה זמינה:</span>
                          <span className="font-medium">{formatCurrency(calculation.availableIncome)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">החזר מקסימלי:</span>
                          <span className="font-medium">{formatCurrency(calculation.maxPayment)}</span>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}