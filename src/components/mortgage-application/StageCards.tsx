'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calculator, FileText, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface StageCardProps {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  requirements: string[];
  icon: React.ComponentType<any>;
  color: string;
  completed: boolean;
  locked: boolean;
  onAction: () => void;
  onExpandToggle?: (expanded: boolean) => void;
}

interface StageCardsProps {
  stages: StageCardProps[];
}

const iconMap = {
  Calculator,
  FileText,
  CreditCard,
  CheckCircle
};

export function StageCard({
  id,
  title,
  description,
  ctaText,
  requirements,
  icon: IconComponent,
  color,
  completed,
  locked,
  onAction,
  onExpandToggle
}: StageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpandToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandToggle?.(newExpanded);
  };

  const getStatusIcon = () => {
    if (completed) return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    if (locked) return <AlertCircle className="w-5 h-5 text-amber-600" />;
    return <IconComponent className="w-5 h-5 text-slate-600" />;
  };

  const getCardStyles = () => {
    if (completed) {
      return 'bg-emerald-50 border-emerald-200 shadow-emerald-100';
    }
    if (locked) {
      return 'bg-slate-50 border-slate-200 opacity-75';
    }
    return 'bg-white border-slate-200 hover:shadow-lg';
  };

  return (
    <motion.div
      className={`
        rounded-2xl border-2 transition-all duration-300 overflow-hidden
        ${getCardStyles()}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!locked ? { y: -4 } : {}}
      layout
    >
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          {/* Icon and Status */}
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl bg-gradient-to-br ${color} 
              flex items-center justify-center shadow-sm
              ${completed ? 'bg-emerald-500' : locked ? 'bg-slate-400' : ''}
            `}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            {getStatusIcon()}
          </div>

          {/* Expand Button */}
          <motion.button
            onClick={handleExpandToggle}
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

        {/* Title and Description */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xl font-semibold text-slate-800">
            {title}
          </h3>
          <p className="text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Requirements Preview */}
        <div className="space-y-2 mb-6">
          <h4 className="text-sm font-medium text-slate-700">מה צריך להביא:</h4>
          <div className="flex items-center gap-4">
            {requirements.slice(0, 3).map((req, index) => (
              <div key={index} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-sm text-slate-600">{req}</span>
              </div>
            ))}
            {requirements.length > 3 && (
              <span className="text-sm text-slate-500">
                +{requirements.length - 3} נוספים
              </span>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <motion.button
          onClick={onAction}
          disabled={locked}
          className={`
            w-full py-3 px-6 rounded-xl font-medium transition-all
            ${completed
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : locked
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : `bg-gradient-to-r ${color} text-white shadow-md hover:shadow-lg`
            }
          `}
          whileHover={!locked && !completed ? { scale: 1.02 } : {}}
          whileTap={!locked && !completed ? { scale: 0.98 } : {}}
        >
          {completed ? 'הושלם ✓' : locked ? 'נעול' : ctaText}
        </motion.button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-slate-200 bg-slate-50/50 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {/* Full Requirements List */}
              <div>
                <h4 className="text-sm font-medium text-slate-800 mb-3">
                  רשימה מלאה - מה צריך להביא:
                </h4>
                <div className="grid gap-2">
                  {requirements.map((req, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                      <span>{req}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-800 mb-2">
                  מידע נוסף:
                </h4>
                <div className="text-sm text-slate-600 space-y-2">
                  <p>• השלב הזה לוקח בממוצע 10-15 דקות</p>
                  <p>• ניתן לשמור ולחזור מאוחר יותר</p>
                  <p>• כל המידע מוצפן ומאובטח</p>
                </div>
              </div>

              {/* Progress Indicator */}
              {!completed && !locked && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>התקדמות</span>
                    <span>0%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: '0%' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function StageCards({ stages }: StageCardsProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleExpandToggle = (cardId: string, expanded: boolean) => {
    setExpandedCard(expanded ? cardId : null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">
          שלבי התהליך
        </h2>
        <p className="text-slate-600">
          כל שלב מתבסס על הקודם - עקבו אחר הסדר המומלץ
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {stages.map((stage) => (
          <StageCard
            key={stage.id}
            {...stage}
            onExpandToggle={(expanded) => handleExpandToggle(stage.id, expanded)}
          />
        ))}
      </div>

      {/* Progress Summary */}
      <motion.div
        className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl border border-blue-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">
              התקדמות כללית
            </h3>
            <p className="text-sm text-slate-600">
              {stages.filter(s => s.completed).length} מתוך {stages.length} שלבים הושלמו
            </p>
          </div>
          <div className="text-left">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((stages.filter(s => s.completed).length / stages.length) * 100)}%
            </div>
            <div className="text-xs text-slate-500">הושלם</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-white/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(stages.filter(s => s.completed).length / stages.length) * 100}%` 
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}