'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, HelpCircle, CheckCircle, ArrowRight, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { MortgageState } from '@/app/mortgage-advisor/page';
import { ZoomableJourney } from './ZoomableJourney';
import { BenefitPanel } from './BenefitPanel';
import { MicroCalculator } from './MicroCalculator';

interface GuidedModeProps {
  state: MortgageState;
  updateState: (updates: Partial<MortgageState>) => void;
  onAddHint: (hintId: string) => void;
}

interface Question {
  id: string;
  title: string;
  subtitle: string;
  type: 'input' | 'radio' | 'slider' | 'multi-input';
  field: string;
  options?: { value: string; label: string; description?: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  validation?: (value: any) => boolean;
  explanation?: {
    title: string;
    content: string;
    benefits: string[];
  };
  benefit?: {
    title: string;
    description: string;
    impact: string;
    nextStep: string;
    estimatedCost?: number;
  };
  calculator?: {
    type: 'payment' | 'affordability' | 'ratio';
    inputs: string[];
  };
}

const questions: Question[] = [
  {
    id: 'own-capital',
    title: 'כמה הון עצמי יש לכם?',
    subtitle: 'הסכום הזמין כרגע למקדמה למשכנתא',
    type: 'input',
    field: 'personalInfo.ownCapital',
    unit: '₪',
    validation: (value) => value > 0,
    explanation: {
      title: 'למה הון עצמי כל כך חשוב?',
      content: 'ההון העצמי קובע את גובה המקדמה שתוכלו לשלם ומשפיע ישירות על תנאי המשכנתא.',
      benefits: [
        'מקדמה גבוהה יותר = ריבית נמוכה יותר',
        'פחות סיכון לבנק = תנאים טובים יותר',
        'גישה לתוכניות מיוחדות (דירה ראשונה וכו\')'
      ]
    },
    benefit: {
      title: 'מה תרוויחו מהמידע הזה',
      description: 'נוכל לחשב בדיוק איזה נכסים נמצאים בטווח שלכם',
      impact: 'חישוב מדויק של טווח המחירים המתאים',
      nextStep: 'נעבור לבדוק את ההכנסות החודשיות',
      estimatedCost: 0
    },
    calculator: {
      type: 'affordability',
      inputs: ['ownCapital', 'monthlyIncome']
    }
  },
  {
    id: 'monthly-income',
    title: 'מה ההכנסה החודשית נטו שלכם?',
    subtitle: 'כל ההכנסות הקבועות אחרי מס (משכורת, קצבאות, הכנסות נוספות)',
    type: 'input',
    field: 'personalInfo.monthlyIncome',
    unit: '₪',
    validation: (value) => value > 0,
    explanation: {
      title: 'איך מחשבים הכנסה למשכנתא?',
      content: 'הבנקים בודקים הכנסות קבועות בלבד ולוקחים בחשבון יציבות תעסוקתית.',
      benefits: [
        'הכנסה גבוהה = יכולת החזר גבוהה יותר',
        'יציבות תעסוקתית משפרת את התנאים',
        'הכנסות נוספות מוכרות מגדילות את המסגרת'
      ]
    },
    benefit: {
      title: 'איך זה עוזר לכם',
      description: 'נחשב את יכולת ההחזר המקסימלית שלכם',
      impact: 'קביעת גובה המשכנתא המתאים',
      nextStep: 'נבדוק את ההוצאות הקבועות',
      estimatedCost: 0
    }
  },
  {
    id: 'monthly-expenses',
    title: 'מה ההוצאות החודשיות הקבועות שלכם?',
    subtitle: 'הוצאות שאי אפשר להימנע מהן (שכר דירה, הלואות, ביטוחים)',
    type: 'input',
    field: 'personalInfo.monthlyExpenses',
    unit: '₪',
    validation: (value) => value >= 0,
    explanation: {
      title: 'למה הבנק בודק הוצאות?',
      content: 'הבנק רוצה לוודא שיש לכם מספיק כסף לחיות בכבוד גם אחרי תשלום המשכנתא.',
      benefits: [
        'הוצאות נמוכות = יכולת החזר גבוהה יותר',
        'שקיפות מונעת הפתעות בתהליך',
        'תכנון נכון למניעת קשיים עתידיים'
      ]
    },
    benefit: {
      title: 'מה זה נותן לנו',
      description: 'נוכל לחשב את יחס ההחזר הבטוח עבורכם',
      impact: 'הימנעות מעומס פיננסי מוגזם',
      nextStep: 'נעבור להעדפות האישיות שלכם',
      estimatedCost: 0
    }
  },
  {
    id: 'age',
    title: 'מה הגיל שלכם?',
    subtitle: 'הגיל משפיע על תקופת המשכנתא המקסימלית',
    type: 'input',
    field: 'personalInfo.age',
    validation: (value) => value >= 18 && value <= 80,
    explanation: {
      title: 'איך הגיל משפיע על המשכנתא?',
      content: 'הבנקים מגבילים את תקופת המשכנתא כך שתסתיים עד גיל פרישה.',
      benefits: [
        'גיל צעיר = תקופות החזר ארוכות יותר',
        'החזר חודשי נמוך יותר',
        'גמישות רבה יותר בתכנון'
      ]
    },
    benefit: {
      title: 'למה זה חשוב',
      description: 'נקבע את תקופת המשכנתא האופטימלית',
      impact: 'איזון בין החזר חודשי לעלות כוללת',
      nextStep: 'נבדוק את המצב המשפחתי',
      estimatedCost: 0
    }
  },
  {
    id: 'family-status',
    title: 'מה המצב המשפחתי שלכם?',
    subtitle: 'המצב המשפחתי משפיע על זכאויות וסיכונים',
    type: 'radio',
    field: 'personalInfo.familyStatus',
    options: [
      { value: 'single', label: 'רווק/ה', description: 'הכנסה אחת, גמישות מקסימלית' },
      { value: 'married', label: 'נשוי/ה', description: 'אפשרות לשתי הכנסות, יציבות' },
      { value: 'divorced', label: 'גרוש/ה', description: 'זכאות למענקים מיוחדים' },
      { value: 'widowed', label: 'אלמן/ה', description: 'זכאות לתמיכות ממשלתיות' }
    ],
    explanation: {
      title: 'איך המצב המשפחתי משפיע?',
      content: 'המצב המשפחתי קובע זכאויות, סיכונים ואפשרויות מימון.',
      benefits: [
        'זוגות - אפשרות לשתי הכנסות',
        'זכאות למענקים ותמיכות',
        'תכנון ביטוחי מותאם'
      ]
    },
    benefit: {
      title: 'איך זה משפיע על המשכנתא',
      description: 'נבדוק זכאויות למענקים ותמיכות',
      impact: 'אפשרות לחיסכון משמעותי',
      nextStep: 'נעבור להעדפות הסיכון שלכם',
      estimatedCost: 0
    }
  },
  {
    id: 'risk-preferences',
    title: 'מה החשיבות של יציבות מול תשואה עבורכם?',
    subtitle: 'עזרו לנו להבין את פרופיל הסיכון שלכם',
    type: 'slider',
    field: 'preferences.stability',
    min: 1,
    max: 5,
    step: 1,
    explanation: {
      title: 'יציבות מול תשואה במשכנתא',
      content: 'ריבית קבועה נותנת יציבות, ריבית משתנה יכולה לחסוך כסף אבל עם סיכון.',
      benefits: [
        'יציבות גבוהה = שקט נפשי',
        'גמישות גבוהה = פוטנציאל לחיסכון',
        'איזון נכון = הפתרון האופטימלי'
      ]
    },
    benefit: {
      title: 'איך זה ישפיע על התמהיל',
      description: 'נבנה תמהיל מסלולים שמתאים לפרופיל שלכם',
      impact: 'איזון אופטימלי בין סיכון לתשואה',
      nextStep: 'נבדוק העדפות נוספות',
      estimatedCost: 0
    }
  }
];

export function GuidedMode({ state, updateState, onAddHint }: GuidedModeProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleAnswer = (value: any) => {
    const newAnswers = { ...answers, [currentQuestion.field]: value };
    setAnswers(newAnswers);
    
    // Update global state
    const updates: Partial<MortgageState> = {};
    const fieldPath = currentQuestion.field.split('.');
    if (fieldPath.length === 2) {
      const topLevelKey = fieldPath[0] as keyof MortgageState;
      const nestedKey = fieldPath[1];
      
      if (topLevelKey === 'personalInfo' || topLevelKey === 'preferences' || topLevelKey === 'propertyInfo' || topLevelKey === 'mortgageStructure') {
        (updates as any)[topLevelKey] = {
          ...(state[topLevelKey] as any),
          [nestedKey]: value
        };
      }
    }
    updateState(updates);

    // Validate
    const valid = currentQuestion.validation ? currentQuestion.validation(value) : true;
    setIsValid(valid);

    // Trigger hints based on answers
    if (currentQuestion.id === 'monthly-income' && value > 0) {
      const monthlyExpenses = answers['personalInfo.monthlyExpenses'] || 0;
      const paymentRatio = (value * 0.4) / value; // Assuming 40% max ratio
      if (paymentRatio > 0.4) {
        onAddHint('high-payment-ratio');
      }
    }
  };

  const handleNext = () => {
    if (!isValid) {
      onAddHint('validation-error');
      return;
    }

    // Pass/Fail gate validation
    const currentAnswer = answers[currentQuestion.field];
    if (!validatePassFailGate(currentQuestion.id, currentAnswer)) {
      return;
    }
    
    if (isLastQuestion) {
      // Complete guided mode
      onAddHint('profile-complete');
      updateState({ currentStep: state.currentStep + 1 });
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
      setIsValid(false);
    }
  };

  const validatePassFailGate = (questionId: string, answer: any): boolean => {
    switch (questionId) {
      case 'own-capital':
        if (answer < 50000) {
          onAddHint('insufficient-capital');
          return false;
        }
        break;
      case 'monthly-income':
        if (answer < 8000) {
          onAddHint('insufficient-income');
          return false;
        }
        break;
      case 'monthly-expenses':
        const income = answers['personalInfo.monthlyIncome'] || 0;
        if (income > 0 && (answer / income) > 0.6) {
          onAddHint('high-expense-ratio');
          return false;
        }
        break;
    }
    return true;
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
      setIsValid(true); // Previous answers are assumed valid
    }
  };

  const renderQuestionInput = () => {
    const currentValue = answers[currentQuestion.field];

    switch (currentQuestion.type) {
      case 'input':
        return (
          <div className="space-y-2">
            <Label htmlFor="answer">{currentQuestion.title}</Label>
            <div className="relative">
              <Input
                id="answer"
                type="number"
                value={currentValue || ''}
                onChange={(e) => handleAnswer(Number(e.target.value))}
                placeholder="הכנס סכום..."
                className="text-lg pr-12"
              />
              {currentQuestion.unit && (
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                  {currentQuestion.unit}
                </span>
              )}
            </div>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            <Label>{currentQuestion.title}</Label>
            <RadioGroup
              value={currentValue || ''}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {currentQuestion.options?.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    {option.description && (
                      <p className="text-sm text-slate-600 mt-1">{option.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-4">
            <Label>{currentQuestion.title}</Label>
            <div className="px-4">
              <Slider
                value={[currentValue || 3]}
                onValueChange={(values) => handleAnswer(values[0])}
                min={currentQuestion.min}
                max={currentQuestion.max}
                step={currentQuestion.step}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-slate-600 mt-2">
                <span>יציבות מקסימלית</span>
                <span>איזון</span>
                <span>תשואה מקסימלית</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-slate-50 to-blue-50/30 p-6">
      {/* Journey Progress */}
      <div className="mb-8">
        <ZoomableJourney
          currentStep={state.currentStep}
          onStepClick={() => {}}
        />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Question */}
          <div className="lg:col-span-2">
            <Card className="p-8 bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>שאלה {currentQuestionIndex + 1} מתוך {questions.length}</span>
                  <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-l from-blue-500 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h1 className="text-3xl font-semibold text-slate-800 mb-3">
                      {currentQuestion.title}
                    </h1>
                    <p className="text-lg text-slate-600">
                      {currentQuestion.subtitle}
                    </p>
                  </div>

                  {/* Answer Input */}
                  <div className="mb-8">
                    {renderQuestionInput()}
                  </div>

                  {/* Explanation Toggle */}
                  {currentQuestion.explanation && (
                    <div className="mb-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowExplanation(!showExplanation)}
                        className="flex items-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4" />
                        למה זה חשוב?
                        <motion.div
                          animate={{ rotate: showExplanation ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </motion.div>
                      </Button>

                      <AnimatePresence>
                        {showExplanation && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <h4 className="font-semibold text-blue-800 mb-2">
                              {currentQuestion.explanation.title}
                            </h4>
                            <p className="text-blue-700 mb-3">
                              {currentQuestion.explanation.content}
                            </p>
                            <ul className="space-y-1">
                              {currentQuestion.explanation.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-blue-700">
                                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentQuestionIndex === 0}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      הקודם
                    </Button>

                    <Button
                      onClick={handleNext}
                      disabled={!isValid}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isLastQuestion ? 'סיום' : 'הבא'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </Card>
          </div>

          {/* Benefit Panel */}
          <div className="space-y-6">
            {currentQuestion.benefit && (
              <BenefitPanel benefit={currentQuestion.benefit} />
            )}

            {/* Micro Calculator */}
            {currentQuestion.calculator && (
              <MicroCalculator
                type={currentQuestion.calculator.type}
                inputs={currentQuestion.calculator.inputs}
                values={answers}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}