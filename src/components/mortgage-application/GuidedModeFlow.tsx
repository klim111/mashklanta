'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { UserProfile } from './hooks/useMortgageApplication';
import { SingleQuestionScreen } from './SingleQuestionScreen';
import { UtilityPanel } from './UtilityPanel';

interface GuidedModeFlowProps {
  userProfile: UserProfile;
  onReset: () => void;
}

const guidedQuestions: Array<{
  id: string;
  title: string;
  description: string;
  type: 'number' | 'currency' | 'text' | 'select';
  section: string;
  field: string;
  placeholder: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  utilityInfo: {
    benefit: string;
    impact: string;
    costImpact: number;
  };
}> = [
  {
    id: 'age',
    title: 'בואו נכיר - כמה אתם בני?',
    description: 'הגיל משפיע על תנאי המשכנתא ואורך התקופה המותרת',
    type: 'number',
    section: 'personalInfo',
    field: 'age',
    placeholder: 'הקישו את הגיל שלכם',
    min: 18,
    max: 80,
    utilityInfo: {
      benefit: 'קביעת אורך תקופה מקסימלית',
      impact: 'עד גיל 67 תוכלו לקחת תקופה ארוכה יותר',
      costImpact: 0
    }
  },
  {
    id: 'income',
    title: 'מה ההכנסה החודשית הנטו שלכם?',
    description: 'כוללים משכורת, קצבאות, הכנסות נוספות קבועות',
    type: 'currency',
    section: 'financial',
    field: 'monthlyIncome',
    placeholder: 'הקישו את ההכנסה בשקלים',
    utilityInfo: {
      benefit: 'חישוב יכולת החזר מקסימלית',
      impact: 'קובע את גובה המשכנתא שתוכלו לקבל',
      costImpact: 0
    }
  },
  {
    id: 'equity',
    title: 'כמה הון עצמי יש לכם?',
    description: 'כסף שחסכתם, מתנות, הלוואות מהמשפחה',
    type: 'currency',
    section: 'financial',
    field: 'ownEquity',
    placeholder: 'סכום בשקלים',
    utilityInfo: {
      benefit: 'הפחתת סכום המשכנתא וריבית',
      impact: 'יותר הון עצמי = פחות ריבית ועמלות',
      costImpact: -2500
    }
  },
  {
    id: 'property-value',
    title: 'מה שווי הנכס שאתם רוצים לקנות?',
    description: 'לפי הערכת שמאי או מחירי שוק דומים',
    type: 'currency',
    section: 'propertyInfo',
    field: 'propertyValue',
    placeholder: 'שווי בשקלים',
    utilityInfo: {
      benefit: 'חישוב סכום המשכנתא הנדרש',
      impact: 'קובע את יחס המימון ותנאי הריבית',
      costImpact: 0
    }
  },
  {
    id: 'monthly-payment',
    title: 'מה ההחזר החודשי המקסימלי שנוח לכם?',
    description: 'חשבו על ההוצאות הקיימות והשאירו מרחב נשימה',
    type: 'currency',
    section: 'mortgageDetails',
    field: 'maxMonthlyPayment',
    placeholder: 'סכום בשקלים',
    utilityInfo: {
      benefit: 'בניית תמהיל מותאם ליכולת שלכם',
      impact: 'מבטיח שתוכלו לעמוד בתשלומים בנוחות',
      costImpact: 0
    }
  }
];

export function GuidedModeFlow({ userProfile, onReset }: GuidedModeFlowProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showExplanation, setShowExplanation] = useState<string | null>(null);

  const question = guidedQuestions[currentQuestion];
  const isLastQuestion = currentQuestion === guidedQuestions.length - 1;
  const canProceed = answers[question.id] !== undefined && answers[question.id] !== '';

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [question.id]: value
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Complete guided flow
      console.log('Guided flow completed:', answers);
    } else {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const toggleExplanation = (questionId: string) => {
    setShowExplanation(prev => prev === questionId ? null : questionId);
  };

  return (
    <div className="min-h-screen flex">
      {/* Main Question Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Progress Indicator */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-slate-500">
                שאלה {currentQuestion + 1} מתוך {guidedQuestions.length}
              </span>
              <button
                onClick={onReset}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                התחל מחדש
              </button>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestion + 1) / guidedQuestions.length) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
            >
              <SingleQuestionScreen
                question={question}
                value={answers[question.id]}
                onChange={handleAnswer}
              />

              {/* Expandable Explanation */}
              <motion.div className="mt-6">
                <button
                  onClick={() => toggleExplanation(question.id)}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>למה זה חשוב?</span>
                  <motion.div
                    animate={{ rotate: showExplanation === question.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showExplanation === question.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 overflow-hidden"
                    >
                      <div className="space-y-3 text-sm text-slate-700">
                        <p>{question.description}</p>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                            <span><strong>התועלת:</strong> {question.utilityInfo.benefit}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                            <span><strong>ההשפעה:</strong> {question.utilityInfo.impact}</span>
                          </div>
                          {question.utilityInfo.costImpact !== 0 && (
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                              <span>
                                <strong>השפעה על עלות:</strong>{' '}
                                {question.utilityInfo.costImpact > 0 ? '+' : ''}
                                {question.utilityInfo.costImpact.toLocaleString()} ₪
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8">
                <motion.button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                    ${currentQuestion === 0 
                      ? 'text-slate-400 cursor-not-allowed' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    }
                  `}
                  whileHover={currentQuestion > 0 ? { x: -4 } : {}}
                  whileTap={currentQuestion > 0 ? { scale: 0.98 } : {}}
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>קודם</span>
                </motion.button>

                <motion.button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className={`
                    flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all
                    ${canProceed
                      ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-md hover:shadow-lg'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                  whileHover={canProceed ? { scale: 1.02, x: -4 } : {}}
                  whileTap={canProceed ? { scale: 0.98 } : {}}
                >
                  <span>{isLastQuestion ? 'סיים' : 'הבא'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Utility Panel */}
      <UtilityPanel
        question={question}
        currentAnswer={answers[question.id]}
        allAnswers={answers}
      />
    </div>
  );
}