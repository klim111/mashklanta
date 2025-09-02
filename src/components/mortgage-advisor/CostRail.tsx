'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, TrendingUp, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface CostRailProps {
  costs: {
    fixed: number;
    variable: number;
    total: number;
  };
}

interface CostItem {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'variable';
  category: 'lawyer' | 'appraisal' | 'registration' | 'bank' | 'other';
  description: string;
  isEstimated: boolean;
}

const mockCostItems: CostItem[] = [
  { id: '1', name: 'שמאי', amount: 2500, type: 'fixed', category: 'appraisal', description: 'שמאות הנכס', isEstimated: false },
  { id: '2', name: 'עו"ד', amount: 8000, type: 'variable', category: 'lawyer', description: 'ליווי משפטי', isEstimated: true },
  { id: '3', name: 'פתיחת תיק', amount: 1200, type: 'fixed', category: 'bank', description: 'עמלת הבנק', isEstimated: false },
  { id: '4', name: 'נוטריון', amount: 1500, type: 'fixed', category: 'registration', description: 'אימות מסמכים', isEstimated: true },
  { id: '5', name: 'רישום במקרקעין', amount: 3200, type: 'fixed', category: 'registration', description: 'רישום הזכויות', isEstimated: false },
  { id: '6', name: 'ביטוח מבנה', amount: 4500, type: 'variable', category: 'other', description: 'ביטוח השכנתא', isEstimated: true },
];

export function CostRail({ costs }: CostRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const totalEstimatedCosts = mockCostItems.reduce((sum, item) => sum + item.amount, 0);
  const fixedCosts = mockCostItems.filter(item => item.type === 'fixed').reduce((sum, item) => sum + item.amount, 0);
  const variableCosts = mockCostItems.filter(item => item.type === 'variable').reduce((sum, item) => sum + item.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div
      className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-lg">
        {/* Collapsed State */}
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">עלויות</span>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-slate-800">
                  {formatCurrency(totalEstimatedCosts)}
                </div>
                <div className="text-xs text-slate-500">צפוי</div>
              </div>

              {/* Mini Progress Bar */}
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                     style={{ width: `${Math.min((totalEstimatedCosts / 25000) * 100, 100)}%` }} />
              </div>
              
              <div className="text-xs text-slate-400 mt-1 text-center">לחץ לפירוט</div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 w-72"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">מסילת עלויות</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Total Cost */}
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {formatCurrency(totalEstimatedCosts)}
                  </div>
                  <div className="text-sm text-slate-600">עלות כוללת משוערת</div>
                </div>
              </div>

              {/* Fixed vs Variable */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <div className="text-sm font-semibold text-emerald-800">
                    {formatCurrency(fixedCosts)}
                  </div>
                  <div className="text-xs text-emerald-600">קבוע</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="text-sm font-semibold text-blue-800">
                    {formatCurrency(variableCosts)}
                  </div>
                  <div className="text-xs text-blue-600">משתנה</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>התקדמות</span>
                  <span>{Math.round((totalEstimatedCosts / 25000) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-l from-blue-500 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totalEstimatedCosts / 25000) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Details Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full mb-3 h-8"
              >
                {showDetails ? <EyeOff className="w-3 h-3 ml-1" /> : <Eye className="w-3 h-3 ml-1" />}
                {showDetails ? 'הסתר פירוט' : 'הצג פירוט'}
              </Button>

              {/* Detailed Breakdown */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 max-h-60 overflow-y-auto"
                  >
                    {mockCostItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-slate-800">{item.name}</span>
                            {item.isEstimated && (
                              <AlertCircle className="w-3 h-3 text-orange-500" />
                            )}
                          </div>
                          <div className="text-slate-600">{item.description}</div>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-slate-800">
                            {formatCurrency(item.amount)}
                          </div>
                          <div className={`text-xs ${
                            item.type === 'fixed' ? 'text-emerald-600' : 'text-blue-600'
                          }`}>
                            {item.type === 'fixed' ? 'קבוע' : 'משתנה'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer Note */}
              <div className="mt-4 p-2 bg-orange-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-800">
                    <div className="font-medium mb-1">העלויות מתעדכנות בזמן אמת</div>
                    <div>ככל שנתקדם, התחזית תהיה מדויקת יותר</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}