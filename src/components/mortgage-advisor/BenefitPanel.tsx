'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, DollarSign, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BenefitPanelProps {
  benefit: {
    title: string;
    description: string;
    impact: string;
    nextStep: string;
    estimatedCost?: number;
  };
}

export function BenefitPanel({ benefit }: BenefitPanelProps) {
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-emerald-50 border-blue-200 shadow-sm">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 text-lg">
              {benefit.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-blue-800 mb-4 leading-relaxed">
          {benefit.description}
        </p>

        {/* Impact */}
        <div className="bg-white/60 rounded-lg p-3 mb-4">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-500 rounded-full" />
            השפעה על המשכנתא
          </h4>
          <p className="text-blue-800 text-sm">
            {benefit.impact}
          </p>
        </div>

        {/* Cost Impact */}
        {benefit.estimatedCost !== undefined && (
          <div className="bg-white/60 rounded-lg p-3 mb-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              עלות נוספת
            </h4>
            <p className="text-lg font-semibold text-emerald-700">
              {benefit.estimatedCost === 0 ? 'ללא עלות' : `+${formatCurrency(benefit.estimatedCost)}`}
            </p>
          </div>
        )}

        {/* Next Step */}
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-white/40 rounded-lg p-3">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">השלב הבא:</span>
          <span>{benefit.nextStep}</span>
          <ArrowRight className="w-3 h-3 flex-shrink-0 mr-auto" />
        </div>
      </Card>
    </motion.div>
  );
}