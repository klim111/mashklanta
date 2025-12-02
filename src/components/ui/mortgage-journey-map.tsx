"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  FileText, 
  User, 
  Building, 
  Home, 
  TrendingUp,
  MapPin,
  ArrowRight,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// סוגי נתונים
interface Document {
  name: string;
  optional?: boolean;
}

interface JourneyStep {
  id: string;
  order: number;
  title: string;
  appliesTo: string[];
  durationAvgDays: number;
  durationRangeDays: [number, number];
  parallelizable: boolean;
  dependsOn: string[];
  notes: string;
  documents: Document[];
  status?: 'completed' | 'in_progress' | 'pending' | 'blocked';
  startDate?: Date;
  endDate?: Date;
  actualDays?: number;
}

interface JourneyMapProps {
  steps: JourneyStep[];
  currentStep?: string;
  onStepClick?: (step: JourneyStep) => void;
}

// אייקונים לכל שלב
const getStepIcon = (stepId: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    discovery: <User className="w-5 h-5" />,
    borrower_docs: <FileText className="w-5 h-5" />,
    equity_afford: <TrendingUp className="w-5 h-5" />,
    mix_design: <Building className="w-5 h-5" />,
    pre_approval: <CheckCircle className="w-5 h-5" />,
    legal_checks: <FileText className="w-5 h-5" />,
    pre_appraisal: <MapPin className="w-5 h-5" />,
    bank_survey: <Building className="w-5 h-5" />,
    neg_round1: <TrendingUp className="w-5 h-5" />,
    neg_round2: <TrendingUp className="w-5 h-5" />,
    bank_choice: <CheckCircle className="w-5 h-5" />,
    purchase_contract: <Home className="w-5 h-5" />,
  };
  return iconMap[stepId] || <Circle className="w-5 h-5" />;
};

// צבעים לפי סטטוס
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-500 border-green-500 text-white';
    case 'in_progress': return 'bg-blue-500 border-blue-500 text-white animate-pulse';
    case 'pending': return 'bg-gray-300 border-gray-300 text-gray-600';
    case 'blocked': return 'bg-red-500 border-red-500 text-white';
    default: return 'bg-gray-300 border-gray-300 text-gray-600';
  }
};

// חישוב תאריכים
const calculateDates = (steps: JourneyStep[], startDate: Date = new Date()) => {
  let currentDate = new Date(startDate);
  
  return steps.map(step => {
    const stepStartDate = new Date(currentDate);
    const durationDays = step.actualDays || step.durationAvgDays;
    const stepEndDate = new Date(currentDate);
    stepEndDate.setDate(stepEndDate.getDate() + durationDays);
    
    currentDate = new Date(stepEndDate);
    
    return {
      ...step,
      startDate: stepStartDate,
      endDate: stepEndDate,
      status: step.status || 'pending'
    };
  });
};

export default function MortgageJourneyMap({ 
  steps, 
  currentStep, 
  onStepClick 
}: JourneyMapProps) {
  const [selectedStep, setSelectedStep] = useState<JourneyStep | null>(null);
  const [stepsWithDates, setStepsWithDates] = useState<JourneyStep[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (!steps.length) {
      setStepsWithDates([]);
      setOverallProgress(0);
      return;
    }

    const currentIndex = currentStep
      ? steps.findIndex((step) => step.id === currentStep)
      : -1;

    const enhancedSteps: JourneyStep[] = steps.map((step, index) => {
      if (step.status) {
        return step;
      }

      if (currentIndex === -1) {
        return step;
      }

      if (index < currentIndex) {
        return { ...step, status: 'completed' };
      }

      if (index === currentIndex) {
        return { ...step, status: 'in_progress' };
      }

      return { ...step, status: 'pending' };
    });

    const calculatedSteps = calculateDates(enhancedSteps);
    setStepsWithDates(calculatedSteps);
    
    // חישוב התקדמות כללית
    const completedSteps = calculatedSteps.filter((s) => s.status === 'completed').length;
    const progress = (completedSteps / calculatedSteps.length) * 100;
    setOverallProgress(progress);
  }, [steps, currentStep]);

  const handleStepClick = (step: JourneyStep) => {
    setSelectedStep(step);
    onStepClick?.(step);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* כותרת ומד התקדמות כללי */}
      <div className="max-w-7xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🗺️ מפת המסע למשכנתא
          </h1>
          <p className="text-lg text-gray-600">
            עקוב אחר התקדמותך בכל שלבי תהליך המשכנתא
          </p>
        </motion.div>

        {/* מד התקדמות כללי */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">התקדמות כללית</h3>
              <p className="text-gray-600">
                {Math.round(overallProgress)}% הושלמו מתוך {stepsWithDates.length} שלבים
              </p>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(overallProgress)}%
            </div>
          </div>
          <Progress value={overallProgress} className="h-3 bg-gray-200" />
        </motion.div>
      </div>

      {/* המפה הראשית */}
      <div className="max-w-7xl mx-auto">
        <div className="relative">
          {/* רקע המפה */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 to-indigo-100/30 rounded-3xl"></div>
          
          {/* מסלול המפה */}
          <div className="relative p-8">
            {/* רקע דקורטיבי */}
            <div className="absolute inset-0 overflow-hidden">
              {/* עננים דקורטיביים */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-16 h-8 bg-white/20 rounded-full blur-sm"
                  style={{
                    top: `${20 + i * 15}%`,
                    left: `${10 + i * 20}%`,
                  }}
                  animate={{
                    x: [0, 30, 0],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{
                    duration: 8 + i * 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
              
              {/* כוכבים נוצצים */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                  style={{
                    top: `${15 + i * 10}%`,
                    left: `${15 + i * 12}%`,
                  }}
                  animate={{
                    scale: [0.5, 1.2, 0.5],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>

            <svg
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 1 }}
            >
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* קו המסלול הבסיסי */}
              <path
                d={`M 50 250 Q 200 150 400 250 Q 600 350 800 250 Q 1000 150 1200 250 Q 1400 350 1600 250`}
                stroke="url(#pathGradient)"
                strokeWidth="4"
                fill="none"
                strokeDasharray="15,10"
                opacity="0.6"
              />
              
              {/* קו ההתקדמות */}
              <motion.path
                d={`M 50 250 Q 200 150 400 250 Q 600 350 800 250 Q 1000 150 1200 250 Q 1400 350 1600 250`}
                stroke="url(#progressGradient)"
                strokeWidth="6"
                fill="none"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: overallProgress / 100 }}
                transition={{ duration: 3, ease: "easeInOut" }}
              />
              
              {/* ניצוצות לאורך המסלול */}
              {overallProgress > 0 && (
                <motion.circle
                  r="4"
                  fill="#FBBF24"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    r: [2, 6, 2],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <animateMotion
                    dur="4s"
                    repeatCount="indefinite"
                    path="M 50 250 Q 200 150 400 250 Q 600 350 800 250 Q 1000 150 1200 250 Q 1400 350 1600 250"
                  />
                </motion.circle>
              )}
            </svg>

              {/* שלבי המפה */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                {stepsWithDates.map((step, index) => {
                  const isActiveStep = currentStep === step.id;

                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                    >
                    {/* כרטיס השלב */}
                    <Card
                      data-active={isActiveStep ? 'true' : undefined}
                      className={`cursor-pointer transition-all duration-500 hover:shadow-2xl border-2 backdrop-blur-sm ${
                        step.status === 'completed' 
                          ? 'border-green-400 bg-gradient-to-br from-green-50/90 to-emerald-50/90 shadow-green-200/50' 
                          : step.status === 'in_progress'
                          ? 'border-blue-400 bg-gradient-to-br from-blue-50/90 to-cyan-50/90 shadow-blue-200/50 shadow-lg ring-2 ring-blue-300/30'
                          : step.status === 'blocked'
                          ? 'border-red-400 bg-gradient-to-br from-red-50/90 to-pink-50/90 shadow-red-200/50'
                          : 'border-gray-200 bg-gradient-to-br from-white/90 to-gray-50/90'
                      } ${isActiveStep ? 'ring-2 ring-indigo-400/60 shadow-indigo-200/70' : ''} hover:scale-105 hover:-translate-y-2 group`}
                      onClick={() => handleStepClick(step)}
                      aria-label={`פרטי שלב ${step.order} - ${step.title}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-4">
                          {/* אייקון הסטטוס */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${getStatusColor(step.status || 'pending')} ${
                            step.status === 'in_progress' ? 'animate-pulse shadow-lg' : ''
                          } ${
                            step.status === 'completed' ? 'shadow-green-300/50' : ''
                          }`}>
                            <motion.div
                              animate={step.status === 'in_progress' ? { rotate: [0, 5, -5, 0] } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              {getStepIcon(step.id)}
                            </motion.div>
                          
                          {/* אפקט זוהר לשלב בתהליך */}
                          {step.status === 'in_progress' && (
                            <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
                          )}
                          
                          {/* אפקט ניצוצות לשלב שהושלם */}
                          {step.status === 'completed' && (
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              initial={{ scale: 0 }}
                              animate={{ scale: [0, 1.2, 0] }}
                              transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                            >
                              <div className="w-full h-full rounded-full border-2 border-green-400/30"></div>
                            </motion.div>
                          )}
                        </div>
                          {/* מספר השלב */}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-bold">
                              שלב {step.order}
                            </Badge>
                            {isActiveStep && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                נוכחי
                              </span>
                            )}
                          </div>
                      </div>
                      
                      <CardTitle className="text-lg font-bold text-gray-900 leading-tight">
                        {step.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {/* זמן משוער */}
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {step.durationAvgDays < 1 
                            ? `${Math.round(step.durationAvgDays * 24)} שעות`
                            : `${step.durationAvgDays} ימים`
                          }
                        </span>
                      </div>

                      {/* תאריכים עם לוח שנה מיני */}
                      {step.startDate && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">
                              {step.startDate.toLocaleDateString('he-IL')}
                              {step.endDate && ` - ${step.endDate.toLocaleDateString('he-IL')}`}
                            </span>
                          </div>
                          
                          {/* מיני לוח שנה ויזואלי */}
                          <div className="bg-white/50 rounded-lg p-2 border border-gray-200/50">
                            <div className="grid grid-cols-7 gap-1 text-xs">
                              {/* כותרות ימים */}
                              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, i) => (
                                <div key={i} className="text-center text-gray-400 font-semibold py-1">
                                  {day}
                                </div>
                              ))}
                              
                              {/* ימי החודש */}
                              {Array.from({ length: 14 }, (_, i) => {
                                const dayNum = i + 1;
                                const isStartDay = step.startDate && step.startDate.getDate() === dayNum;
                                const isEndDay = step.endDate && step.endDate.getDate() === dayNum;
                                const isInRange = step.startDate && step.endDate && 
                                  dayNum >= step.startDate.getDate() && dayNum <= step.endDate.getDate();
                                
                                return (
                                  <div
                                    key={i}
                                    className={`text-center py-1 rounded text-xs ${
                                      isStartDay || isEndDay
                                        ? 'bg-blue-500 text-white font-bold'
                                        : isInRange
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    {dayNum <= 31 ? dayNum : ''}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* מסמכים נדרשים */}
                      {step.documents.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span>{step.documents.length} מסמכים</span>
                        </div>
                      )}

                      {/* סטטוס */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={step.status === 'completed' ? 'default' : 'secondary'}
                          className={
                            step.status === 'completed' 
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : step.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : step.status === 'blocked'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }
                        >
                          {step.status === 'completed' && '✅ הושלם'}
                          {step.status === 'in_progress' && '⏳ בתהליך'}
                          {step.status === 'pending' && '⏸️ ממתין'}
                          {step.status === 'blocked' && '⚠️ חסום'}
                        </Badge>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="p-1 h-8 w-8"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* חץ לשלב הבא */}
                  {index < stepsWithDates.length - 1 && (
                    <div className="hidden lg:block absolute -left-3 top-1/2 transform -translate-y-1/2 z-20">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index + 1) * 0.1 }}
                      >
                        <div className="relative">
                          <ArrowRight 
                            className={`w-6 h-6 transition-colors duration-300 ${
                              step.status === 'completed' ? 'text-green-500' : 'text-blue-500'
                            }`} 
                          />
                          
                          {/* אפקט זרימה לחץ */}
                          {step.status === 'completed' && (
                            <motion.div
                              className="absolute inset-0"
                              animate={{ x: [0, 20, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <div className="w-2 h-2 bg-green-400 rounded-full opacity-60"></div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* אפקט חגיגה לשלב שהושלם */}
                  {step.status === 'completed' && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.3 }}
                    >
                      {/* פרטיקלים חגיגיים */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={`confetti-${i}`}
                          className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                          style={{
                            top: `${20 + Math.random() * 60}%`,
                            left: `${20 + Math.random() * 60}%`,
                          }}
                          animate={{
                            y: [0, -30, 0],
                            x: [0, Math.random() * 40 - 20, 0],
                            opacity: [1, 0.5, 0],
                            scale: [1, 0.5, 0]
                          }}
                          transition={{
                            duration: 2 + Math.random(),
                            repeat: Infinity,
                            delay: i * 0.2
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {/* פאנל פרטי השלב */}
      <AnimatePresence>
        {selectedStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedStep(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedStep.title}
                </h3>
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedStep(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                {/* פרטי השלב */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700">{selectedStep.notes}</p>
                </div>

                {/* זמנים */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm text-blue-600 font-semibold">זמן ממוצע</div>
                    <div className="text-lg font-bold text-blue-900">
                      {selectedStep.durationAvgDays < 1 
                        ? `${Math.round(selectedStep.durationAvgDays * 24)} שעות`
                        : `${selectedStep.durationAvgDays} ימים`
                      }
                    </div>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-sm text-indigo-600 font-semibold">טווח זמנים</div>
                    <div className="text-lg font-bold text-indigo-900">
                      {selectedStep.durationRangeDays[0]}-{selectedStep.durationRangeDays[1]} ימים
                    </div>
                  </div>
                </div>

                {/* מסמכים נדרשים */}
                {selectedStep.documents.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">מסמכים נדרשים:</h4>
                    <div className="space-y-2">
                      {selectedStep.documents.map((doc, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <FileText className="w-5 h-5 text-gray-600" />
                          <span className="flex-1 text-gray-800">{doc.name}</span>
                          {doc.optional && (
                            <Badge variant="outline" className="text-xs">
                              אופציונלי
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
