'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, MapPin } from 'lucide-react';
import { useState } from 'react';
import { MortgageMilestone } from './hooks/useMortgageApplication';

interface MortgagePassportProps {
  progress: number;
  milestones: MortgageMilestone[];
  currentStep: number;
}

export function MortgagePassport({ progress, milestones, currentStep }: MortgagePassportProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStampIcon = (milestone: MortgageMilestone, index: number) => {
    if (milestone.completed) {
      return <Check className="w-4 h-4 text-emerald-600" />;
    }
    if (index === currentStep) {
      return <Clock className="w-4 h-4 text-blue-600" />;
    }
    return <MapPin className="w-4 h-4 text-slate-400" />;
  };

  const getStampColor = (milestone: MortgageMilestone, index: number) => {
    if (milestone.completed) {
      return 'from-emerald-500 to-green-600';
    }
    if (index === currentStep) {
      return 'from-blue-500 to-indigo-600';
    }
    return 'from-slate-300 to-slate-400';
  };

  return (
    <motion.div
      className="fixed top-6 right-6 z-40"
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <motion.div
        className={`
          bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200
          transition-all duration-300 overflow-hidden cursor-pointer
          ${isExpanded ? 'w-80' : 'w-20'}
        `}
        onHoverStart={() => setIsExpanded(true)}
        onHoverEnd={() => setIsExpanded(false)}
        whileHover={{ scale: 1.02 }}
      >
        {/* Passport Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* Progress Circle */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <path
                  className="text-slate-200"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Progress circle */}
                <motion.path
                  className="text-teal-500"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  strokeDasharray="100, 100"
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: `${progress}, 100` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-700">
                  {Math.round(progress)}%
                </span>
              </div>
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
                  <h3 className="font-semibold text-slate-800 text-sm">דרכון משכנתא</h3>
                  <p className="text-xs text-slate-500">מעקב התקדמות</p>
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
              {/* Milestones */}
              <div className="p-4 space-y-4">
                {milestones.map((milestone, index) => (
                  <motion.div
                    key={milestone.id}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    {/* Stamp */}
                    <motion.div
                      className={`
                        w-8 h-8 rounded-full bg-gradient-to-br ${getStampColor(milestone, index)}
                        flex items-center justify-center shadow-sm
                      `}
                      whileHover={{ scale: 1.1 }}
                      animate={
                        index === currentStep && !milestone.completed
                          ? {
                              scale: [1, 1.1, 1],
                              boxShadow: [
                                '0 0 0 0 rgba(59, 130, 246, 0.4)',
                                '0 0 0 10px rgba(59, 130, 246, 0)',
                                '0 0 0 0 rgba(59, 130, 246, 0)'
                              ]
                            }
                          : {}
                      }
                      transition={
                        index === currentStep && !milestone.completed
                          ? { duration: 2, repeat: Infinity }
                          : { duration: 0.2 }
                      }
                    >
                      {getStampIcon(milestone, index)}
                    </motion.div>

                    {/* Milestone Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-slate-800 truncate">
                          {milestone.title}
                        </h4>
                        {milestone.eta && !milestone.completed && (
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {milestone.eta}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mb-2">
                        {milestone.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${getStampColor(milestone, index)} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${milestone.progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    שלב {currentStep + 1} מתוך {milestones.length}
                  </span>
                  <span className="text-slate-500">
                    {milestones.filter(m => m.completed).length} הושלמו
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Stamps Preview */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2"
            >
              <div className="flex flex-col items-center gap-1">
                {milestones.slice(0, 3).map((milestone, index) => (
                  <motion.div
                    key={milestone.id}
                    className={`
                      w-3 h-3 rounded-full bg-gradient-to-br ${getStampColor(milestone, index)}
                    `}
                    animate={
                      index === currentStep && !milestone.completed
                        ? { scale: [1, 1.2, 1] }
                        : {}
                    }
                    transition={
                      index === currentStep && !milestone.completed
                        ? { duration: 1, repeat: Infinity }
                        : {}
                    }
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}