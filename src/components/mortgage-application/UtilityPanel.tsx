'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Calculator, ArrowRight, Lightbulb } from 'lucide-react';

interface Question {
  id: string;
  title: string;
  description: string;
  type: 'number' | 'currency' | 'text' | 'select';
  utilityInfo: {
    benefit: string;
    impact: string;
    costImpact: number;
  };
}

interface UtilityPanelProps {
  question: Question;
  currentAnswer: any;
  allAnswers: Record<string, any>;
}

export function UtilityPanel({ question, currentAnswer, allAnswers }: UtilityPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateEstimatedLoan = () => {
    const propertyValue = allAnswers['property-value'] || 0;
    const equity = allAnswers['equity'] || 0;
    return Math.max(0, propertyValue - equity);
  };

  const calculateMonthlyPayment = () => {
    const loan = calculateEstimatedLoan();
    const monthlyIncome = allAnswers['income'] || 0;
    const maxPayment = allAnswers['monthly-payment'] || 0;
    
    if (loan > 0 && monthlyIncome > 0) {
      // Simple estimation: 4% annual interest, 25 years
      const monthlyRate = 0.04 / 12;
      const numPayments = 25 * 12;
      const payment = loan * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                     (Math.pow(1 + monthlyRate, numPayments) - 1);
      return Math.round(payment);
    }
    return maxPayment || 0;
  };

  const getRealtimeInsights = () => {
    const insights = [];
    
    if (currentAnswer) {
      switch (question.id) {
        case 'age':
          const maxYears = Math.max(0, 67 - currentAnswer);
          insights.push({
            type: 'info',
            text: `תוכלו לקחת משכנתא לתקופה של עד ${maxYears} שנים`
          });
          break;
          
        case 'income':
          const maxLoan = currentAnswer * 120; // 120x monthly income rule
          insights.push({
            type: 'positive',
            text: `סכום משכנתא מקסימלי: ${formatCurrency(maxLoan)}`
          });
          break;
          
        case 'equity':
          const savedInterest = currentAnswer * 0.03; // 3% annual interest saved
          insights.push({
            type: 'positive',
            text: `חיסכון שנתי בריבית: ${formatCurrency(savedInterest)}`
          });
          break;
          
        case 'property-value':
          const loanAmount = calculateEstimatedLoan();
          insights.push({
            type: 'info',
            text: `סכום משכנתא נדרש: ${formatCurrency(loanAmount)}`
          });
          break;
          
        case 'monthly-payment':
          const estimatedPayment = calculateMonthlyPayment();
          const difference = currentAnswer - estimatedPayment;
          if (difference > 0) {
            insights.push({
              type: 'positive',
              text: `מרחב נשימה של ${formatCurrency(difference)} לחודש`
            });
          } else if (difference < 0) {
            insights.push({
              type: 'warning',
              text: `חסר ${formatCurrency(Math.abs(difference))} לחודש`
            });
          }
          break;
      }
    }
    
    return insights;
  };

  const insights = getRealtimeInsights();
  const estimatedCostImpact = question.utilityInfo.costImpact;

  return (
    <motion.div
      className="w-80 bg-white border-r border-slate-200 p-6 space-y-6 overflow-y-auto"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Panel Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-slate-800">מה תרוויחו?</h3>
        </div>
        <p className="text-sm text-slate-600">
          תועלת בזמן אמת מהתשובה שלכם
        </p>
      </div>

      {/* Main Benefit */}
      <motion.div
        className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-1">
                התועלת העיקרית
              </h4>
              <p className="text-sm text-slate-700">
                {question.utilityInfo.benefit}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Impact on Next Step */}
      <motion.div
        className="p-4 bg-slate-50 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-slate-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-1">
                השפעה על השלב הבא
              </h4>
              <p className="text-sm text-slate-700">
                {question.utilityInfo.impact}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cost Impact */}
      {estimatedCostImpact !== 0 && (
        <motion.div
          className={`p-4 rounded-xl ${
            estimatedCostImpact > 0 
              ? 'bg-red-50 border border-red-100' 
              : 'bg-emerald-50 border border-emerald-100'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="flex items-start gap-2">
            <Calculator className={`w-4 h-4 mt-1 flex-shrink-0 ${
              estimatedCostImpact > 0 ? 'text-red-600' : 'text-emerald-600'
            }`} />
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-1">
                השפעה על העלות
              </h4>
              <p className={`text-sm font-semibold ${
                estimatedCostImpact > 0 ? 'text-red-700' : 'text-emerald-700'
              }`}>
                {estimatedCostImpact > 0 ? '+' : ''}{formatCurrency(estimatedCostImpact)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Real-time Insights */}
      <AnimatePresence>
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-medium text-slate-800">
              תובנות בזמן אמת
            </h4>
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-3 rounded-lg text-sm ${
                  insight.type === 'positive' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                    : insight.type === 'warning'
                    ? 'bg-amber-50 text-amber-800 border border-amber-100'
                    : 'bg-blue-50 text-blue-800 border border-blue-100'
                }`}
              >
                {insight.text}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Summary */}
      <motion.div
        className="pt-6 border-t border-slate-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-800">
            מה יש לנו עד כה
          </h4>
          <div className="space-y-2 text-xs text-slate-600">
            {Object.entries(allAnswers).map(([key, value]) => {
              if (!value) return null;
              const questionTitle = {
                'age': 'גיל',
                'income': 'הכנסה חודשית',
                'equity': 'הון עצמי',
                'property-value': 'שווי נכס',
                'monthly-payment': 'החזר מקסימלי'
              }[key] || key;
              
              return (
                <div key={key} className="flex justify-between">
                  <span>{questionTitle}:</span>
                  <span className="font-medium">
                    {typeof value === 'number' && key !== 'age' 
                      ? formatCurrency(value)
                      : value.toString()
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}