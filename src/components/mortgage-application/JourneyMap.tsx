'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Check, Clock, Circle } from 'lucide-react';

interface JourneySection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  progress: number;
}

interface JourneyMapProps {
  sections: JourneySection[];
  activeSection: string | null;
  onSectionClick: (sectionId: string) => void;
}

interface SubStep {
  id: string;
  title: string;
  completed: boolean;
  active: boolean;
}

interface DetailedTask {
  id: string;
  title: string;
  completed: boolean;
  estimated: string;
}

const subSteps: Record<string, SubStep[]> = {
  'client-profiling': [
    { id: 'personal-info', title: 'מידע אישי', completed: true, active: false },
    { id: 'financial-info', title: 'מידע פיננסי', completed: true, active: false },
    { id: 'preferences', title: 'העדפות', completed: false, active: true },
    { id: 'property-details', title: 'פרטי נכס', completed: false, active: false }
  ],
  'portfolio-building': [
    { id: 'risk-assessment', title: 'הערכת סיכונים', completed: false, active: false },
    { id: 'mix-creation', title: 'יצירת תמהיל', completed: false, active: false },
    { id: 'optimization', title: 'אופטימיזציה', completed: false, active: false }
  ],
  'calculations': [
    { id: 'basic-calc', title: 'חישובים בסיסיים', completed: false, active: false },
    { id: 'advanced-calc', title: 'חישובים מתקדמים', completed: false, active: false },
    { id: 'scenarios', title: 'תרחישים', completed: false, active: false }
  ],
  'bank-negotiations': [
    { id: 'bank-survey', title: 'סקר בנקים', completed: false, active: false },
    { id: 'offers-comparison', title: 'השוואת הצעות', completed: false, active: false },
    { id: 'negotiation', title: 'משא ומתן', completed: false, active: false }
  ]
};

const detailedTasks: Record<string, DetailedTask[]> = {
  'personal-info': [
    { id: 'age', title: 'גיל', completed: true, estimated: '1 דק' },
    { id: 'marital-status', title: 'מצב משפחתי', completed: true, estimated: '1 דק' },
    { id: 'dependents', title: 'מספר ילדים', completed: true, estimated: '1 דק' }
  ],
  'financial-info': [
    { id: 'income', title: 'הכנסה חודשית', completed: true, estimated: '2 דק' },
    { id: 'expenses', title: 'הוצאות חודשיות', completed: true, estimated: '3 דק' },
    { id: 'assets', title: 'נכסים', completed: false, estimated: '5 דק' },
    { id: 'debts', title: 'התחייבויות', completed: false, estimated: '3 דק' }
  ],
  'preferences': [
    { id: 'stability', title: 'יציבות מול גמישות', completed: false, estimated: '2 דק' },
    { id: 'risk-tolerance', title: 'סובלנות לסיכון', completed: false, estimated: '2 דק' },
    { id: 'payment-preference', title: 'העדפת תשלום', completed: false, estimated: '1 דק' }
  ]
};

export function JourneyMap({ sections, activeSection, onSectionClick }: JourneyMapProps) {
  const [expandedSubStep, setExpandedSubStep] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'main' | 'sub' | 'detailed'>('main');

  const handleSectionClick = (sectionId: string) => {
    onSectionClick(sectionId);
    setZoomLevel('sub');
  };

  const handleSubStepClick = (subStepId: string) => {
    setExpandedSubStep(expandedSubStep === subStepId ? null : subStepId);
    setZoomLevel('detailed');
  };

  const handleBackToMain = () => {
    setZoomLevel('main');
    setExpandedSubStep(null);
    onSectionClick('');
  };

  const handleBackToSub = () => {
    setZoomLevel('sub');
    setExpandedSubStep(null);
  };

  const getStepIcon = (step: SubStep) => {
    if (step.completed) return <Check className="w-4 h-4 text-emerald-600" />;
    if (step.active) return <Clock className="w-4 h-4 text-blue-600" />;
    return <Circle className="w-4 h-4 text-slate-400" />;
  };

  const getTaskIcon = (task: DetailedTask) => {
    if (task.completed) return <Check className="w-3 h-3 text-emerald-600" />;
    return <Circle className="w-3 h-3 text-slate-400" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">מפת המסע</h2>
          <p className="text-sm text-slate-600">
            {zoomLevel === 'main' && 'השלבים העיקריים'}
            {zoomLevel === 'sub' && 'תתי-שלבים'}
            {zoomLevel === 'detailed' && 'משימות מפורטות'}
          </p>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          {zoomLevel !== 'main' && (
            <motion.button
              onClick={zoomLevel === 'detailed' ? handleBackToSub : handleBackToMain}
              className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              חזור
            </motion.button>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full ${zoomLevel === 'main' ? 'bg-blue-500' : 'bg-slate-300'}`} />
            <div className={`w-2 h-2 rounded-full ${zoomLevel === 'sub' ? 'bg-blue-500' : 'bg-slate-300'}`} />
            <div className={`w-2 h-2 rounded-full ${zoomLevel === 'detailed' ? 'bg-blue-500' : 'bg-slate-300'}`} />
          </div>
        </div>
      </div>

      {/* Main Level - Top Level Steps */}
      <AnimatePresence mode="wait">
        {zoomLevel === 'main' && (
          <motion.div
            key="main-level"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <div key={section.id} className="flex items-center flex-1">
                    {/* Step Circle */}
                    <motion.div
                      className={`
                        relative cursor-pointer group
                        ${isActive ? 'z-10' : 'z-0'}
                      `}
                      onClick={() => handleSectionClick(section.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={`
                        w-16 h-16 rounded-full bg-gradient-to-br ${section.color} 
                        flex items-center justify-center shadow-lg
                        ${isActive ? 'ring-4 ring-blue-200' : ''}
                        group-hover:shadow-xl transition-all
                      `}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      
                      {/* Progress Ring */}
                      <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-white/30"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <motion.path
                          className="text-white"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          strokeDasharray="100, 100"
                          initial={{ strokeDasharray: "0, 100" }}
                          animate={{ strokeDasharray: `${section.progress}, 100` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </svg>

                      {/* Step Label */}
                      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 text-center">
                        <div className="text-sm font-medium text-slate-800 whitespace-nowrap">
                          {section.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {section.progress}% הושלם
                        </div>
                      </div>
                    </motion.div>

                    {/* Connecting Line */}
                    {index < sections.length - 1 && (
                      <div className="flex-1 h-0.5 bg-slate-200 mx-4 relative">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-teal-500"
                          initial={{ width: '0%' }}
                          animate={{ 
                            width: section.progress === 100 ? '100%' : '0%'
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Sub Level - Sub Steps */}
        {zoomLevel === 'sub' && activeSection && (
          <motion.div
            key="sub-level"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {subSteps[activeSection]?.map((subStep, index) => (
              <motion.div
                key={subStep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`
                  flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all
                  ${subStep.active ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-slate-100'}
                `}
                onClick={() => handleSubStepClick(subStep.id)}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${subStep.completed ? 'bg-emerald-100' : subStep.active ? 'bg-blue-100' : 'bg-slate-200'}
                `}>
                  {getStepIcon(subStep)}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-slate-800">{subStep.title}</h4>
                  <p className="text-sm text-slate-600">
                    {subStep.completed ? 'הושלם' : subStep.active ? 'בתהליך' : 'ממתין'}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Detailed Level - Individual Tasks */}
        {zoomLevel === 'detailed' && expandedSubStep && (
          <motion.div
            key="detailed-level"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            {detailedTasks[expandedSubStep]?.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center
                  ${task.completed ? 'bg-emerald-100' : 'bg-slate-200'}
                `}>
                  {getTaskIcon(task)}
                </div>
                
                <div className="flex-1">
                  <span className={`text-sm ${task.completed ? 'text-slate-600 line-through' : 'text-slate-800'}`}>
                    {task.title}
                  </span>
                </div>

                <span className="text-xs text-slate-500">
                  {task.estimated}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}