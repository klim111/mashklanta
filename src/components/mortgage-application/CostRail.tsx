'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Info } from 'lucide-react';
import { useState } from 'react';
import { MortgageCosts } from './hooks/useMortgageApplication';

interface CostRailProps {
  costs: MortgageCosts;
}

export function CostRail({ costs }: CostRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fixedCostItems = [
    { key: 'appraisal', label: 'שמאי', amount: costs.fixed.appraisal, description: 'הערכת שווי הנכס' },
    { key: 'fileOpening', label: 'פתיחת תיק', amount: costs.fixed.fileOpening, description: 'עלות פתיחת תיק בבנק' },
    { key: 'notary', label: 'נוטריון', amount: costs.fixed.notary, description: 'אישור מסמכים משפטיים' },
    { key: 'insurance', label: 'ביטוחים', amount: costs.fixed.insurance, description: 'ביטוח מבנה ותכולה' }
  ];

  const variableCostItems = [
    { key: 'legalFees', label: 'עו"ד', amount: costs.variable.legalFees, description: 'ייצוג משפטי' },
    { key: 'brokerFees', label: 'תיווך', amount: costs.variable.brokerFees, description: 'עמלת יועץ משכנתא' },
    { key: 'bankFees', label: 'עמלות בנק', amount: costs.variable.bankFees, description: 'עמלות נוספות של הבנק' }
  ];

  return (
    <motion.div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40"
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <motion.div
        className={`
          bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200
          transition-all duration-300 overflow-hidden
          ${isExpanded ? 'w-80' : 'w-20'}
        `}
        onHoverStart={() => setIsExpanded(true)}
        onHoverEnd={() => {
          setIsExpanded(false);
          setShowTooltip(null);
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <h3 className="font-semibold text-slate-800 text-sm">מעקב עלויות</h3>
                  <p className="text-xs text-slate-500">בזמן אמת</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Current Total */}
        <div className="p-4 border-b border-slate-100">
          <div className="text-center">
            <motion.div
              className="text-2xl font-bold text-slate-800"
              key={costs.total}
              initial={{ scale: 1.2, color: '#059669' }}
              animate={{ scale: 1, color: '#1e293b' }}
              transition={{ duration: 0.3 }}
            >
              {formatCurrency(costs.total)}
            </motion.div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-slate-500 mt-1"
                >
                  עלות נוכחית
                </motion.div>
              )}
            </AnimatePresence>
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
              className="overflow-hidden"
            >
              {/* Fixed Costs */}
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-slate-700">עלויות קבועות</span>
                </div>
                <div className="space-y-2">
                  {fixedCostItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex justify-between items-center text-xs group cursor-pointer"
                      onMouseEnter={() => setShowTooltip(item.key)}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">{item.label}</span>
                        {showTooltip === item.key && (
                          <div className="absolute left-full ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-800">
                        {item.amount > 0 ? formatCurrency(item.amount) : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variable Costs */}
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-slate-700">עלויות משתנות</span>
                </div>
                <div className="space-y-2">
                  {variableCostItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex justify-between items-center text-xs group cursor-pointer"
                      onMouseEnter={() => setShowTooltip(item.key)}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">{item.label}</span>
                        {showTooltip === item.key && (
                          <div className="absolute left-full ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-800">
                        {item.amount > 0 ? formatCurrency(item.amount) : 'בהמשך'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated Total */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-slate-500" />
                    <span className="text-xs text-slate-600">צפי סופי</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrency(costs.estimated)}
                  </span>
                </div>
                <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((costs.total / costs.estimated) * 100, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Indicator */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2 text-center"
            >
              <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full mx-auto" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}