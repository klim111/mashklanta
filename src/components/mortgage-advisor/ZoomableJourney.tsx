'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Users, Building2, Handshake, Check, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface JourneyStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  current: boolean;
  substeps?: JourneySubstep[];
}

interface JourneySubstep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  details?: JourneyDetail[];
}

interface JourneyDetail {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  estimatedTime: string;
}

interface ZoomableJourneyProps {
  currentStep: number;
  onStepClick: (stepId: string) => void;
}

const journeyData: JourneyStep[] = [
  {
    id: 'characterization',
    title: 'הכרת הלקוח',
    subtitle: 'בניית פרופיל אישי',
    icon: Users,
    completed: false,
    current: true,
    substeps: [
      {
        id: 'personal-info',
        title: 'פרטים אישיים',
        description: 'גיל, מצב משפחתי, הכנסות',
        completed: false,
        current: true,
        details: [
          { id: 'basic-info', title: 'פרטים בסיסיים', description: 'גיל, מצב משפחתי, מקום מגורים', completed: false, estimatedTime: '2 דק' },
          { id: 'income', title: 'הכנסות חודשיות', description: 'משכורת, הכנסות נוספות', completed: false, estimatedTime: '3 דק' },
          { id: 'expenses', title: 'הוצאות חודשיות', description: 'הוצאות קבועות ומשתנות', completed: false, estimatedTime: '3 דק' },
        ]
      },
      {
        id: 'financial-status',
        title: 'מצב כלכלי',
        description: 'הון עצמי, חובות קיימים',
        completed: false,
        current: false,
        details: [
          { id: 'own-capital', title: 'הון עצמי', description: 'סכום זמין למקדמה', completed: false, estimatedTime: '2 דק' },
          { id: 'existing-debts', title: 'חובות קיימים', description: 'הלואות, כרטיסי אשראי', completed: false, estimatedTime: '3 דק' },
          { id: 'credit-score', title: 'דירוג אשראי', description: 'בדיקת דירוג אשראי', completed: false, estimatedTime: '1 דק' },
        ]
      },
      {
        id: 'preferences',
        title: 'העדפות אישיות',
        description: 'יציבות, גמישות, עלות',
        completed: false,
        current: false,
        details: [
          { id: 'risk-profile', title: 'פרופיל סיכון', description: 'יציבות מול תשואה', completed: false, estimatedTime: '2 דק' },
          { id: 'flexibility', title: 'גמישות', description: 'חשיבות האפשרות לשינויים', completed: false, estimatedTime: '2 דק' },
          { id: 'cost-sensitivity', title: 'רגישות לעלות', description: 'חשיבות העלות הכוללת', completed: false, estimatedTime: '2 דק' },
        ]
      }
    ]
  },
  {
    id: 'structure-building',
    title: 'בניית תמהיל',
    subtitle: 'הרכב המשכנתא המותאמת',
    icon: Building2,
    completed: false,
    current: false,
    substeps: [
      {
        id: 'property-details',
        title: 'פרטי הנכס',
        description: 'מחיר, מיקום, סוג נכס',
        completed: false,
        current: false,
        details: [
          { id: 'property-price', title: 'מחיר הנכס', description: 'מחיר הנכס הרצוי', completed: false, estimatedTime: '1 דק' },
          { id: 'location', title: 'מיקום הנכס', description: 'עיר, אזור, שכונה', completed: false, estimatedTime: '1 דק' },
          { id: 'property-type', title: 'סוג הנכס', description: 'דירה, בית, מסחרי', completed: false, estimatedTime: '1 דק' },
        ]
      },
      {
        id: 'mortgage-structure',
        title: 'מבנה המשכנתא',
        description: 'חלוקה בין מסלולים',
        completed: false,
        current: false,
        details: [
          { id: 'prime-rate', title: 'ריבית משתנה', description: 'אחוז מהמשכנתא בפריים', completed: false, estimatedTime: '3 דק' },
          { id: 'fixed-rate', title: 'ריבית קבועה', description: 'אחוז מהמשכנתא בקבועה', completed: false, estimatedTime: '3 דק' },
          { id: 'index-linked', title: 'צמודת מדד', description: 'אחוז מהמשכנתא צמודה', completed: false, estimatedTime: '3 דק' },
        ]
      },
      {
        id: 'optimization',
        title: 'אופטימיזציה',
        description: 'התאמת התמהיל לפרופיל',
        completed: false,
        current: false,
        details: [
          { id: 'risk-optimization', title: 'איזון סיכונים', description: 'התאמה לפרופיל הסיכון', completed: false, estimatedTime: '2 דק' },
          { id: 'cost-optimization', title: 'אופטימיזציית עלות', description: 'מינימיזציית עלויות', completed: false, estimatedTime: '2 דק' },
          { id: 'flexibility-optimization', title: 'אופטימיזציית גמישות', description: 'שמירה על אפשרויות', completed: false, estimatedTime: '2 דק' },
        ]
      }
    ]
  },
  {
    id: 'bank-negotiation',
    title: 'מו"מ בנקים',
    subtitle: 'קבלת הצעות והשוואה',
    icon: Handshake,
    completed: false,
    current: false,
    substeps: [
      {
        id: 'preliminary-approval',
        title: 'אישור עקרוני',
        description: 'קבלת אישור עקרוני מבנקים',
        completed: false,
        current: false,
        details: [
          { id: 'documents-preparation', title: 'הכנת מסמכים', description: 'אסוף מסמכים נדרשים', completed: false, estimatedTime: '30 דק' },
          { id: 'bank-applications', title: 'הגשת בקשות', description: 'הגשה ל-3-4 בנקים', completed: false, estimatedTime: '60 דק' },
          { id: 'approvals-tracking', title: 'מעקב אישורים', description: 'מעקב אחר תשובות הבנקים', completed: false, estimatedTime: '5 דק ביום' },
        ]
      },
      {
        id: 'offers-comparison',
        title: 'השוואת הצעות',
        description: 'ניתוח והשוואת הצעות הבנקים',
        completed: false,
        current: false,
        details: [
          { id: 'offers-analysis', title: 'ניתוח הצעות', description: 'בחינת תנאי כל הצעה', completed: false, estimatedTime: '20 דק' },
          { id: 'cost-comparison', title: 'השוואת עלויות', description: 'חישוב עלות כוללת לטווח ארוך', completed: false, estimatedTime: '15 דק' },
          { id: 'risk-assessment', title: 'הערכת סיכונים', description: 'בחינת סיכוני כל הצעה', completed: false, estimatedTime: '10 דק' },
        ]
      },
      {
        id: 'negotiation',
        title: 'משא ומתן',
        description: 'משא ומתן על תנאים',
        completed: false,
        current: false,
        details: [
          { id: 'terms-negotiation', title: 'משא ומתן על תנאים', description: 'שיפור תנאי המשכנתא', completed: false, estimatedTime: '45 דק' },
          { id: 'final-decision', title: 'החלטה סופית', description: 'בחירת ההצעה הטובה ביותר', completed: false, estimatedTime: '15 דק' },
          { id: 'signing', title: 'חתימה', description: 'חתימה על המסמכים', completed: false, estimatedTime: '30 דק' },
        ]
      }
    ]
  }
];

export function ZoomableJourney({ currentStep, onStepClick }: ZoomableJourneyProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [expandedSubstep, setExpandedSubstep] = useState<string | null>(null);

  const handleStepClick = (stepId: string) => {
    if (expandedStep === stepId) {
      setExpandedStep(null);
      setExpandedSubstep(null);
    } else {
      setExpandedStep(stepId);
      setExpandedSubstep(null);
    }
  };

  const handleSubstepClick = (substepId: string) => {
    if (expandedSubstep === substepId) {
      setExpandedSubstep(null);
    } else {
      setExpandedSubstep(substepId);
    }
  };

  return (
    <div className="w-full">
      {/* Top Level - Main Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {journeyData.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <motion.div
              className="relative flex flex-col items-center cursor-pointer group"
              onClick={() => handleStepClick(step.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Step Circle */}
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-200
                ${step.completed 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : step.current 
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                }
                ${expandedStep === step.id ? 'ring-4 ring-blue-200' : ''}
                group-hover:shadow-lg
              `}>
                {step.completed ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <step.icon className="w-6 h-6" />
                )}
              </div>

              {/* Step Info */}
              <div className="mt-3 text-center">
                <h3 className="font-semibold text-sm text-slate-800">{step.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{step.subtitle}</p>
              </div>

              {/* Expand Indicator */}
              {step.substeps && (
                <motion.div
                  className="mt-2"
                  animate={{ rotate: expandedStep === step.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </motion.div>
              )}
            </motion.div>

            {/* Connection Line */}
            {index < journeyData.length - 1 && (
              <div className="flex-1 h-0.5 bg-slate-200 mx-4" />
            )}
          </div>
        ))}
      </div>

      {/* Second Level - Substeps */}
      <AnimatePresence>
        {expandedStep && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Card className="p-6 bg-slate-50/50 border-slate-200">
              <div className="grid md:grid-cols-3 gap-4">
                {journeyData
                  .find(step => step.id === expandedStep)
                  ?.substeps?.map((substep) => (
                    <motion.div
                      key={substep.id}
                      className="cursor-pointer"
                      onClick={() => handleSubstepClick(substep.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card className={`
                        p-4 transition-all duration-200
                        ${expandedSubstep === substep.id 
                          ? 'bg-blue-50 border-blue-200 shadow-md' 
                          : 'bg-white border-slate-200 hover:shadow-sm'
                        }
                      `}>
                        <div className="flex items-start gap-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                            ${substep.completed 
                              ? 'bg-emerald-500 text-white' 
                              : substep.current 
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }
                          `}>
                            {substep.completed ? <Check className="w-4 h-4" /> : '•'}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-slate-800 mb-1">
                              {substep.title}
                            </h4>
                            <p className="text-xs text-slate-600">
                              {substep.description}
                            </p>
                            {expandedSubstep === substep.id && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-2"
                              >
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Third Level - Details */}
      <AnimatePresence>
        {expandedSubstep && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <Card className="p-6 bg-blue-50/30 border-blue-200">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {journeyData
                  .find(step => step.id === expandedStep)
                  ?.substeps?.find(substep => substep.id === expandedSubstep)
                  ?.details?.map((detail) => (
                    <motion.div
                      key={detail.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-lg p-3 border border-slate-200 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs
                          ${detail.completed 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-200 text-slate-600'
                          }
                        `}>
                          {detail.completed ? <Check className="w-3 h-3" /> : '•'}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-xs text-slate-800 mb-1">
                            {detail.title}
                          </h5>
                          <p className="text-xs text-slate-600 mb-2">
                            {detail.description}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {detail.estimatedTime}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}