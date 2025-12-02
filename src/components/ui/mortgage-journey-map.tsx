"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle,
  Circle,
  FileText,
  User,
  Building,
  Home,
  TrendingUp,
  MapPin,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500 border-green-500 text-white';
    case 'in_progress':
      return 'bg-blue-500 border-blue-500 text-white animate-pulse';
    case 'pending':
      return 'bg-gray-300 border-gray-300 text-gray-600';
    case 'blocked':
      return 'bg-red-500 border-red-500 text-white';
    default:
      return 'bg-gray-300 border-gray-300 text-gray-600';
  }
};

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
      status: step.status || 'pending',
    };
  });
};

export default function MortgageJourneyMap({ steps, currentStep, onStepClick }: JourneyMapProps) {
  const [selectedStep, setSelectedStep] = useState<JourneyStep | null>(null);
  const [stepsWithDates, setStepsWithDates] = useState<JourneyStep[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    const calculatedSteps = calculateDates(steps);
    setStepsWithDates(calculatedSteps);

    const completedSteps = calculatedSteps.filter(s => s.status === 'completed').length;
    const progress = (completedSteps / calculatedSteps.length) * 100;
    setOverallProgress(progress);
  }, [steps]);

  const handleStepClick = (step: JourneyStep) => {
    setSelectedStep(step);
    onStepClick?.(step);
  };

  const normalizedProgress = Math.min(Math.max(overallProgress, 0), 100) / 100;
  const timelinePath = 'M 20 260 C 260 120 520 120 760 260 S 1260 400 1500 260';

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            🗺️ מפת המסע למשכנתא
          </h1>
          <p className="text-base text-gray-600 sm:text-lg">
            עקוב אחר כל שלב בתהליך ותכנן את העבודה שלך בביטחון
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-white/70 bg-white p-6 shadow-lg backdrop-blur"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">התקדמות כללית</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(overallProgress)}% הושלמו מתוך {stepsWithDates.length} שלבים
              </p>
            </div>
            <div className="text-4xl.font-extrabold text-blue-600">
              {Math.round(overallProgress)}%
            </div>
          </div>
          <Progress value={overallProgress} className="mt-4 h-3 bg-slate-100" />
        </motion.div>

        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-4 shadow-xl backdrop-blur sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-60" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%)]" />

          <div className="relative z-10 flex flex-col gap-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                    תצוגת תהליך חכמה
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">
                    כל השלבים במקום אחד
                  </h2>
                </div>
                <Badge variant="outline" className="w-fit border-blue-200 text-blue-700">
                  {stepsWithDates.filter(step => step.status === 'completed').length} שלבים הושלמו
                </Badge>
              </div>

              <div className="relative h-40 rounded-2xl border border-white/60 bg-gradient-to-r from-slate-50 via-white to-blue-50 shadow-inner sm:h-48 lg:h-56">
                <svg
                  viewBox="0 0 1600 400"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                >
                  <defs>
                    <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#cbd5f5" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#a5b4fc" stopOpacity="0.7" />
                      <stop.offset="100%" stopColor="#93c5fd" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="50%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <path
                    d={timelinePath}
                    stroke="url(#pathGradient)"
                    strokeWidth="6"
                    strokeDasharray="12 18"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.4"
                  />

                  <motion.path
                    d={timelinePath}
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    filter="url(#glow)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: normalizedProgress }}
                    transition={{ duration: 2.5, ease: 'easeInOut' }}
                  />

                  {normalizedProgress > 0 && (
                    <motion.circle
                      r="6"
                      fill="#fcd34d"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <animateMotion
                        dur="5s"
                        repeatCount="indefinite"
                        path={timelinePath}
                      />
                    </motion.circle>
                  )}
                </svg>

                <div className="pointer-events-none absolute inset-0 px-4 sm:px-6">
                  {stepsWithDates.map((step, index) => {
                    const denominator = Math.max(1, stepsWithDates.length - 1);
                    const positionPercent = (index / denominator) * 100;

                    return (
                      <div
                        key={step.id}
                        className="absolute.bottom-3 flex -translate-x-1/2 flex-col items-center gap-1"
                        style={{ left: `${positionPercent}%` }}
                      >
                        <span className="hidden whitespace-nowrap rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm lg:block">
                          {step.order}. {step.title}
                        </span>
                        <span
                          className={`h-3 w-3 rounded-full border-2 ${
                            step.status === 'completed'
                              ? 'border-emerald-500 bg-emerald-500'
                              : step.status === 'in_progress'
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-slate-300 bg-white'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {stepsWithDates.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative"
                >
                  <Card 
                    className={`flex h-full cursor-pointer flex-col border-2 transition-all duration-500 hover:shadow-2xl ${
                      step.status === 'completed' 
                        ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' 
                        : step.status === 'in_progress'
                        ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 ring-1 ring-blue-200/60'
                        : step.status === 'blocked'
                        ? 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50'
                        : 'border-slate-200 bg-white'
                    } group`}
                    onClick={() => handleStepClick(step)}
                  >
                    <CardHeader className="flex flex-col gap-4 pb-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className={`relative h-12 w-12 rounded-full ${getStatusColor(step.status || 'pending')} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                          <motion.div
                            animate={step.status === 'in_progress' ? { rotate: [0, 5, -5, 0] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {getStepIcon(step.id)}
                          </motion.div>
                          {step.status === 'in_progress' && (
                            <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
                          )}
                          {step.status === 'completed' && (
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              initial={{ scale: 0 }}
                              animate={{ scale: [0, 1.2, 0] }}
                              transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                            >
                              <div className="h-full w-full rounded-full border-2 border-green-400/40" />
                            </motion.div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs font-bold">
                          שלב {step.order}
                        </Badge>
                      </div>

                      <CardTitle className="text-lg font-bold leading-tight text-slate-900">
                        {step.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col gap-4 pt-0 text-sm text-slate-600">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>
                          {step.durationAvgDays < 1 
                            ? `${Math.round(step.durationAvgDays * 24)} שעות`
                            : `${step.durationAvgDays} ימים`
                          }
                        </span>
                      </div>

                      {step.startDate && (
                        <div>
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {step.startDate.toLocaleDateString('he-IL')}
                              {step.endDate ? ` - ${step.endDate.toLocaleDateString('he-IL')}` : ''}
                            </span>
                          </div>
                          <div className="rounded-lg border border-slate-200/60 bg-white/70 p-2">
                            <div className="grid grid-cols-7 gap-1 text-[11px] text-slate-500 sm:text-xs">
                              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, i) => (
                                <div key={day + i} className="py-0.5 text-center font-semibold">
                                  {day}
                                </div>
                              ))}
                              {Array.from({ length: 14 }, (_, i) => {
                                const dayNum = i + 1;
                                const isStartDay = step.startDate && step.startDate.getDate() === dayNum;
                                const isEndDay = step.endDate && step.endDate.getDate() === dayNum;
                                const isInRange =
                                  step.startDate &&
                                  step.endDate &&
                                  dayNum >= step.startDate.getDate() &&
                                  dayNum <= step.endDate.getDate();

                                return (
                                  <div
                                    key={`${step.id}-${dayNum}`}
                                    className={`rounded py-0.5 text-center ${
                                      isStartDay || isEndDay
                                        ? 'bg-blue-500 text-white font-bold'
                                        : isInRange
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-slate-600'
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

                      {step.documents.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <FileText className="h-4 w-4" />
                            <span>מסמכים</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {step.documents.slice(0, 3).map((doc, docIndex) => (
                              <span
                                key={`${step.id}-doc-${docIndex}`}
                                className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700"
                              >
                                {doc.name}{doc.optional ? ' (אופציונלי)' : ''}
                              </span>
                            ))}
                            {step.documents.length > 3 && (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">
                                +{step.documents.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between border-t.border-slate-200/70 pt-4 text-xs font-semibold">
                        <Badge 
                          variant={step.status === 'completed' ? 'default' : 'secondary'}
                          className={
                            step.status === 'completed'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : step.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : step.status === 'blocked'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
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
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStepClick(step);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {step.status === 'completed' && (
                    <motion.div
                      className="pointer-events-none absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.3 }}
                    >
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={`${step.id}-confetti-${i}`}
                          className="absolute h-2 w-2 rounded-full bg-yellow-400"
                          style={{
                            top: `${20 + Math.random() * 60}%`,
                            left: `${20 + Math.random() * 60}%`,
                          }}
                          animate={{
                            y: [0, -25, 0],
                            x: [0, Math.random() * 30 - 15, 0],
                            opacity: [1, 0.5, 0],
                            scale: [1, 0.5, 0],
                          }}
                          transition={{
                            duration: 2 + Math.random(),
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <AnimatePresence>
          {selectedStep && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setSelectedStep(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                      פירוט שלב
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedStep.title}</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedStep(null)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-4 text-slate-700">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p>{selectedStep.notes}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <div className="text-sm font-semibold text-blue-600">זמן ממוצע</div>
                      <div className="text-lg font-bold text-blue-900">
                        {selectedStep.durationAvgDays < 1 
                          ? `${Math.round(selectedStep.durationAvgDays * 24)} שעות`
                          : `${selectedStep.durationAvgDays} ימים`
                        }
                      </div>
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-3">
                      <div className="text-sm font-semibold text-indigo-600">טווח זמנים</div>
                      <div className="text-lg font-bold text-indigo-900">
                        {selectedStep.durationRangeDays[0]}-{selectedStep.durationRangeDays[1]} ימים
                      </div>
                    </div>
                  </div>

                  {selectedStep.documents.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-lg font-bold text-slate-900">מסמכים נדרשים</h4>
                      <div className="space-y-2">
                        {selectedStep.documents.map((doc, index) => (
                          <div 
                            key={`${doc.name}-${index}`}
                            className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
                          >
                            <FileText className="h-5 w-5 text-slate-500" />
                            <span className="flex-1">{doc.name}</span>
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
    </div>
  );
}
