'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Users, Building2, Handshake, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

interface MortgagePassportProps {
  milestones: {
    characterization: boolean;
    structureBuilding: boolean;
    preliminaryApproval: boolean;
    bankNegotiation: boolean;
  };
  currentStep: number;
}

interface Milestone {
  id: keyof MortgagePassportProps['milestones'];
  title: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  eta?: string;
  description: string;
}

export function MortgagePassport({ milestones, currentStep }: MortgagePassportProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const milestoneData: Milestone[] = [
    {
      id: 'characterization',
      title: 'אפיון',
      icon: Users,
      completed: milestones.characterization,
      eta: '5 דק',
      description: 'הכרת הלקוח והגדרת צרכים'
    },
    {
      id: 'structureBuilding',
      title: 'תמהיל',
      icon: Building2,
      completed: milestones.structureBuilding,
      eta: '10 דק',
      description: 'בניית מבנה המשכנתא המותאם'
    },
    {
      id: 'preliminaryApproval',
      title: 'אישור עקרוני',
      icon: Target,
      completed: milestones.preliminaryApproval,
      eta: '3-5 ימים',
      description: 'קבלת אישור עקרוני מהבנקים'
    },
    {
      id: 'bankNegotiation',
      title: 'מו"מ בנקים',
      icon: Handshake,
      completed: milestones.bankNegotiation,
      eta: '1-2 שבועות',
      description: 'משא ומתן וסיום התהליך'
    }
  ];

  const completedCount = Object.values(milestones).filter(Boolean).length;
  const totalCount = milestoneData.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const getCurrentMilestone = () => {
    return milestoneData.find(milestone => !milestone.completed) || milestoneData[milestoneData.length - 1];
  };

  const currentMilestone = getCurrentMilestone();

  return (
    <motion.div
      className="fixed left-4 bottom-4 z-40"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.7, duration: 0.3 }}
    >
      <Card className="bg-white/95 backdrop-blur-sm border-slate-200 shadow-lg overflow-hidden">
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 cursor-pointer"
              onClick={() => setIsExpanded(true)}
            >
              {/* Circular Progress */}
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                  {/* Background circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="rgb(226, 232, 240)"
                    strokeWidth="6"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                    animate={{ 
                      strokeDashoffset: 2 * Math.PI * 32 * (1 - progressPercentage / 100)
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                
                {/* Center Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-800">
                      {completedCount}/{totalCount}
                    </div>
                    <div className="text-xs text-slate-500">שלבים</div>
                  </div>
                </div>
              </div>

              {/* Current Step */}
              <div className="text-center">
                <h4 className="font-semibold text-sm text-slate-800 mb-1">
                  דרכון משכנתא
                </h4>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                  <currentMilestone.icon className="w-3 h-3" />
                  <span>{currentMilestone.title}</span>
                </div>
                {currentMilestone.eta && (
                  <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{currentMilestone.eta}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 w-64"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-blue-600" />
                  </div>
                  דרכון משכנתא
                </h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-600 mb-2">
                  <span>התקדמות כללית</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-l from-blue-500 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                {milestoneData.map((milestone, index) => (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      flex items-center gap-3 p-2 rounded-lg transition-all duration-200
                      ${milestone.completed 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : milestone === currentMilestone
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-slate-50 border border-slate-200'
                      }
                    `}
                  >
                    {/* Icon/Status */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${milestone.completed
                        ? 'bg-emerald-500 text-white'
                        : milestone === currentMilestone
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-300 text-slate-600'
                      }
                    `}>
                      {milestone.completed ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <milestone.icon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`
                          font-semibold text-sm
                          ${milestone.completed 
                            ? 'text-emerald-800' 
                            : milestone === currentMilestone
                              ? 'text-blue-800'
                              : 'text-slate-600'
                          }
                        `}>
                          {milestone.title}
                        </h4>
                        {milestone.completed && (
                          <div className="text-xs text-emerald-600 font-medium">✓</div>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-600 mb-1">
                        {milestone.description}
                      </p>
                      
                      {!milestone.completed && milestone.eta && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Clock className="w-3 h-3" />
                          <span>זמן משוער: {milestone.eta}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Next Steps */}
              {completedCount < totalCount && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-sm text-blue-800 mb-1">השלב הבא</h4>
                  <p className="text-xs text-blue-700">
                    {currentMilestone.description}
                  </p>
                  {currentMilestone.eta && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>זמן משוער: {currentMilestone.eta}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Completion Message */}
              {completedCount === totalCount && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center"
                >
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-sm text-emerald-800 mb-1">
                    🎉 כל הכבוד!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    סיימתם בהצלחה את כל השלבים
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}