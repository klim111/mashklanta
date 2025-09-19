'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  CheckCircle,
  Circle,
  Navigation,
  Home,
  Shield,
  Calculator,
  ArrowRight,
  Users,
  Play,
  Check,
  FolderOpen,
  FileCheck,
  FileClock,
  FileX,
  Rocket,
  ChevronDown,
  Info,
  Target,
  TrendingUp,
  Compass
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  optional?: boolean;
  status?: 'ready' | 'pending' | 'in_progress';
}

interface JourneyStep {
  id: string;
  order: number;
  title: string;
  description: string;
  category: string;
  documents: Document[];
  requiresDocuments: boolean;
  status: 'completed' | 'in_progress' | 'pending';
  manualComplete?: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: React.ReactElement;
  steps: string[];
  status: 'completed' | 'in_progress' | 'pending';
  progress: number;
}

// Sample data
const sampleSteps: JourneyStep[] = [
  // הכנה
  {
    id: 'prep-1',
    order: 1,
    title: 'איסוף מסמכי הכנסה',
    description: 'איסוף תלושי שכר, אישורי הכנסה ומסמכים פיננסיים בסיסיים להוכחת יכולת החזר',
    category: 'preparation',
    documents: [
      { id: 'doc-1', name: 'תלושי שכר - 3 חודשים אחרונים', status: 'pending' },
      { id: 'doc-2', name: 'אישור ניהול חשבון בנק', status: 'pending' },
      { id: 'doc-3', name: 'דפי חשבון - 3 חודשים', status: 'pending' },
      { id: 'doc-4', name: 'טופס 106 מהמעסיק', optional: true, status: 'pending' }
    ],
    requiresDocuments: true,
    status: 'pending'
  },
  {
    id: 'prep-2',
    order: 2,
    title: 'בדיקת דוח אשראי',
    description: 'הזמנת דוח אשראי מבנק ישראל ובדיקת הסטטוס האשראי שלך - ניתן להזמין בחינם באתר בנק ישראל',
    category: 'preparation',
    documents: [],
    requiresDocuments: false,
    status: 'pending',
    manualComplete: true
  },
  {
    id: 'prep-3',
    order: 3,
    title: 'הכנת מסמכי זיהוי',
    description: 'צילום תעודות זהות, דרכונים ומסמכים מזהים נוספים',
    category: 'preparation',
    documents: [
      { id: 'doc-5', name: 'תעודת זהות + ספח', status: 'pending' },
      { id: 'doc-6', name: 'תעודת נישואין/גירושין', optional: true, status: 'pending' }
    ],
    requiresDocuments: true,
    status: 'pending'
  },
  // תכנון
  {
    id: 'plan-1',
    order: 4,
    title: 'חישוב יכולת החזר',
    description: 'חישוב מדויק של יכולת ההחזר החודשית בהתאם להכנסות וההוצאות - מומלץ להשאיר מרווח ביטחון של 20%',
    category: 'planning',
    documents: [],
    requiresDocuments: false,
    status: 'pending',
    manualComplete: true
  },
  {
    id: 'plan-2',
    order: 5,
    title: 'בחירת מסלול משכנתא',
    description: 'בחירת תמהיל המסלולים האופטימלי - קבועה, משתנה, פריים וכדומה',
    category: 'planning',
    documents: [],
    requiresDocuments: false,
    status: 'pending',
    manualComplete: true
  },
  // משפטי
  {
    id: 'legal-1',
    order: 6,
    title: 'בחירת עורך דין',
    description: 'בחירת עורך דין לליווי העסקה ובדיקת המסמכים המשפטיים',
    category: 'legal',
    documents: [],
    requiresDocuments: false,
    status: 'pending',
    manualComplete: true
  },
  {
    id: 'legal-2',
    order: 7,
    title: 'בדיקת נסח טאבו',
    description: 'בדיקת נקיות הנכס מעיקולים, משכנתאות וזכויות צד ג',
    category: 'legal',
    documents: [
      { id: 'doc-7', name: 'נסח טאבו עדכני', status: 'pending' },
      { id: 'doc-8', name: 'חוזה רכישה', status: 'pending' }
    ],
    requiresDocuments: true,
    status: 'pending'
  },
  // משא ומתן
  {
    id: 'nego-1',
    order: 8,
    title: 'פגישות עם בנקים',
    description: 'קביעת פגישות עם יועצי משכנתאות בבנקים שונים לקבלת הצעות',
    category: 'negotiation',
    documents: [],
    requiresDocuments: false,
    status: 'pending',
    manualComplete: true
  },
  {
    id: 'nego-2',
    order: 9,
    title: 'השוואת הצעות',
    description: 'השוואת ההצעות מהבנקים השונים ובחירת ההצעה הטובה ביותר',
    category: 'negotiation',
    documents: [
      { id: 'doc-9', name: 'הצעות מהבנקים', status: 'pending' }
    ],
    requiresDocuments: true,
    status: 'pending'
  },
  // אישור
  {
    id: 'approval-1',
    order: 10,
    title: 'הגשת בקשה לבנק',
    description: 'הגשת כל המסמכים הנדרשים לבנק הנבחר',
    category: 'approval',
    documents: [],
    requiresDocuments: false,
    status: 'pending',
    manualComplete: true
  },
  {
    id: 'approval-2',
    order: 11,
    title: 'קבלת אישור עקרוני',
    description: 'קבלת אישור עקרוני למשכנתא מהבנק',
    category: 'approval',
    documents: [
      { id: 'doc-10', name: 'אישור עקרוני מהבנק', status: 'pending' }
    ],
    requiresDocuments: true,
    status: 'pending'
  },
  // סיום
  {
    id: 'final-1',
    order: 12,
    title: 'חתימה על המשכנתא',
    description: 'חתימה על מסמכי המשכנתא בבנק',
    category: 'finalization',
    documents: [],
    requiresDocuments: false,
    status: 'pending',
    manualComplete: true
  },
  {
    id: 'final-2',
    order: 13,
    title: 'העברת כספים',
    description: 'העברת כספי המשכנתא וההון העצמי לרכישת הנכס',
    category: 'finalization',
    documents: [
      { id: 'doc-11', name: 'אישור העברה בנקאית', status: 'pending' }
    ],
    requiresDocuments: true,
    status: 'pending'
  }
];

const sampleCategories: Category[] = [
  {
    id: 'preparation',
    name: 'הכנה',
    description: 'איסוף מסמכים ומידע ראשוני',
    color: '#3B82F6',
    icon: <FileText className="w-5 h-5" />,
    steps: ['prep-1', 'prep-2', 'prep-3'],
    status: 'pending',
    progress: 0
  },
  {
    id: 'planning',
    name: 'תכנון',
    description: 'תכנון פיננסי ובחירת מסלול',
    color: '#10B981',
    icon: <Calculator className="w-5 h-5" />,
    steps: ['plan-1', 'plan-2'],
    status: 'pending',
    progress: 0
  },
  {
    id: 'legal',
    name: 'משפטי',
    description: 'בדיקות משפטיות ועריכת דין',
    color: '#8B5CF6',
    icon: <Shield className="w-5 h-5" />,
    steps: ['legal-1', 'legal-2'],
    status: 'pending',
    progress: 0
  },
  {
    id: 'negotiation',
    name: 'משא ומתן',
    description: 'משא ומתן עם הבנקים',
    color: '#F59E0B',
    icon: <Users className="w-5 h-5" />,
    steps: ['nego-1', 'nego-2'],
    status: 'pending',
    progress: 0
  },
  {
    id: 'approval',
    name: 'אישור',
    description: 'קבלת אישור המשכנתא',
    color: '#EF4444',
    icon: <CheckCircle className="w-5 h-5" />,
    steps: ['approval-1', 'approval-2'],
    status: 'pending',
    progress: 0
  },
  {
    id: 'finalization',
    name: 'סיום',
    description: 'חתימה וסגירת העסקה',
    color: '#6366F1',
    icon: <Home className="w-5 h-5" />,
    steps: ['final-1', 'final-2'],
    status: 'pending',
    progress: 0
  }
];

// Helper functions
const getDocumentStatusIcon = (status?: string) => {
  switch (status) {
    case 'ready':
      return <FileCheck className="w-4 h-4 text-green-500" />;
    case 'in_progress':
      return <FileClock className="w-4 h-4 text-yellow-500" />;
    case 'pending':
    default:
      return <FileX className="w-4 h-4 text-gray-400" />;
  }
};

const getDocumentStatusText = (status?: string) => {
  switch (status) {
    case 'ready':
      return 'מסמך מוכן';
    case 'in_progress':
      return 'בתהליך הכנה';
    case 'pending':
    default:
      return 'ממתין';
  }
};

interface AdvancedMortgageJourneyProps {
  steps?: JourneyStep[];
  categories?: Category[];
  onStepUpdate?: (step: JourneyStep) => void;
  onCategoryUpdate?: (category: Category) => void;
}

export default function AdvancedMortgageJourney({ 
  steps: propSteps, 
  categories: propCategories, 
  onStepUpdate, 
  onCategoryUpdate 
}: AdvancedMortgageJourneyProps = {}) {
  const [steps, setSteps] = useState<JourneyStep[]>(propSteps || sampleSteps);
  const [categories, setCategories] = useState<Category[]>(propCategories || sampleCategories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activePathIndex, setActivePathIndex] = useState(-1);
  const [animatingPath, setAnimatingPath] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [centerDate, setCenterDate] = useState(new Date());

  // Update document status
  const updateDocumentStatus = (stepId: string, docId: string, status: 'ready' | 'pending' | 'in_progress') => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          documents: step.documents.map(doc =>
            doc.id === docId ? { ...doc, status } : doc
          )
        };
      }
      return step;
    }));
  };

  // Update step status
  const updateStepStatus = (stepId: string, status: 'completed' | 'in_progress' | 'pending') => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status } : step
    ));
  };

  // Calculate category progress
  const calculateCategoryProgress = (categoryId: string) => {
    const categorySteps = steps.filter(s => s.category === categoryId);
    if (categorySteps.length === 0) return 0;

    let completedWeight = 0;
    let totalWeight = 0;

    categorySteps.forEach(step => {
      if (step.requiresDocuments) {
        const readyDocs = step.documents.filter(d => d.status === 'ready').length;
        const totalDocs = step.documents.filter(d => !d.optional).length;
        if (totalDocs > 0) {
          completedWeight += (readyDocs / totalDocs);
          totalWeight += 1;
        }
      } else if (step.manualComplete) {
        completedWeight += step.status === 'completed' ? 1 : 0;
        totalWeight += 1;
      }
    });

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  // Update category progress when steps change
  useEffect(() => {
    setCategories(prev => prev.map(cat => ({
      ...cat,
      progress: calculateCategoryProgress(cat.id)
    })));
  }, [steps]);

  // Check if all documents in a step are ready
  const isStepComplete = (step: JourneyStep) => {
    if (step.requiresDocuments) {
      const requiredDocs = step.documents.filter(d => !d.optional);
      return requiredDocs.every(d => d.status === 'ready');
    }
    return step.status === 'completed';
  };

  // Animate path between categories
  useEffect(() => {
    if (activePathIndex >= 0 && activePathIndex < categories.length - 1) {
      setAnimatingPath(true);
      const timer = setTimeout(() => {
        setAnimatingPath(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activePathIndex, categories.length]);

  // Navigate to next category
  const goToNextCategory = () => {
    const currentIndex = categories.findIndex(c => c.id === selectedCategory);
    if (currentIndex < categories.length - 1) {
      const nextCategory = categories[currentIndex + 1];
      setSelectedCategory(nextCategory.id);
      setExpandedCategory(nextCategory.id);
      const firstStep = steps.find(s => s.category === nextCategory.id);
      if (firstStep) {
        setSelectedStep(firstStep.id);
      }
      setActivePathIndex(currentIndex);
    }
  };

  // Start journey
  const startJourney = () => {
    setShowWelcome(false);
    setSelectedCategory(categories[0].id);
    setExpandedCategory(categories[0].id);
    const firstStep = steps.find(s => s.category === categories[0].id);
    if (firstStep) {
      setSelectedStep(firstStep.id);
    }
  };

  const selectedStepData = steps.find(s => s.id === selectedStep);
  const categoryProgress = selectedCategory ? calculateCategoryProgress(selectedCategory) : 0;

  // Calendar functions
  const generateVisibleDays = () => {
    const days = [];
    const startDate = new Date(centerDate);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(centerDate.getDate() - dayOfWeek);
    
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
      const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      
      days.push({
        day: currentDate.getDate(),
        month: currentDate.getMonth(),
        monthName: monthNames[currentDate.getMonth()],
        year: currentDate.getFullYear(),
        date: new Date(currentDate),
        dayName: dayNames[currentDate.getDay()],
        dayShort: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][currentDate.getDay()],
        isToday: currentDate.toDateString() === new Date().toDateString()
      });
    }
    
    return days;
  };

  const visibleDays = generateVisibleDays();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex h-screen overflow-hidden">
        {/* Right Panel - Vertical Map */}
        <div className="w-80 bg-white shadow-2xl overflow-y-auto border-l border-gray-200">
          <div className="sticky top-0 bg-white z-20 border-b border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  מפת המסע שלך
                </h2>
              </div>
              <p className="text-sm text-gray-600">נווט בין השלבים לקבלת המשכנתא</p>
            </div>
          </div>

          <div className="p-6">
            {/* Journey Map SVG */}
            <div className="relative">
              <svg
                ref={svgRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ height: `${categories.length * 120}px` }}
              >
                {/* Draw paths between categories */}
                {categories.map((cat, index) => {
                  if (index < categories.length - 1) {
                    const isActive = index <= activePathIndex;
                    return (
                      <motion.path
                        key={`path-${index}`}
                        d={`M 40 ${60 + index * 120 + 30} L 40 ${60 + (index + 1) * 120 - 30}`}
                        stroke={isActive ? cat.color : '#E5E7EB'}
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: isActive ? 1 : 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                    );
                  }
                  return null;
                })}
              </svg>

              {/* Category Nodes */}
              <div className="relative space-y-8">
                {categories.map((category, index) => {
                  const isActive = category.id === selectedCategory;
                  const isExpanded = category.id === expandedCategory;
                  const isCompleted = category.progress === 100;
                  const categorySteps = steps.filter(s => s.category === category.id);

                  return (
                    <motion.div
                      key={category.id}
                      className="relative"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* Category Card */}
                      <motion.div
                        className={`
                          relative bg-white rounded-2xl border-2 transition-all cursor-pointer
                          ${isActive ? 'shadow-2xl scale-105' : 'shadow-lg hover:shadow-xl'}
                        `}
                        style={{
                          borderColor: isActive ? category.color : '#E5E7EB',
                          background: isActive ? `linear-gradient(135deg, ${category.color}10 0%, white 100%)` : 'white'
                        }}
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setExpandedCategory(isExpanded ? null : category.id);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Node Circle */}
                            <motion.div
                              className={`
                                w-12 h-12 rounded-full flex items-center justify-center
                                ${isCompleted ? 'bg-green-500' : ''}
                                shadow-lg relative z-10
                              `}
                              style={{
                                backgroundColor: isCompleted ? undefined : category.color,
                                border: `3px solid ${isActive ? category.color : '#E5E7EB'}`
                              }}
                              animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                              transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
                            >
                              {isCompleted ? (
                                <CheckCircle className="w-6 h-6 text-white" />
                              ) : (
                                <div className="text-white">
                                  {React.cloneElement(category.icon, { className: 'w-6 h-6' })}
                                </div>
                              )}
                            </motion.div>

                            {/* Category Info */}
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900">{category.name}</h3>
                              <p className="text-xs text-gray-600">{category.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {categorySteps.length} שלבים
                                </Badge>
                                {category.progress > 0 && (
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs"
                                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                                  >
                                    {category.progress}% הושלם
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Expand Icon */}
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            </motion.div>
                          </div>

                          {/* Progress Bar */}
                          {category.progress > 0 && (
                            <div className="mt-3">
                              <Progress value={category.progress} className="h-2" />
                            </div>
                          )}
                        </div>
                      </motion.div>

                      {/* Expanded Steps */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-6 mt-2 space-y-2 pl-6 border-l-2 border-gray-200">
                              {categorySteps.map((step, stepIndex) => {
                                const isStepActive = step.id === selectedStep;
                                const stepComplete = isStepComplete(step);

                                return (
                                  <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: stepIndex * 0.05 }}
                                    className={`
                                      p-3 rounded-lg cursor-pointer transition-all
                                      ${isStepActive ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}
                                      border
                                    `}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStep(step.id);
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center
                                        ${stepComplete ? 'bg-green-500' : isStepActive ? 'bg-blue-500' : 'bg-gray-300'}
                                      `}>
                                        {stepComplete ? (
                                          <Check className="w-3 h-3 text-white" />
                                        ) : (
                                          <span className="text-xs text-white font-bold">{stepIndex + 1}</span>
                                        )}
                                      </div>
                                      <span className={`
                                        text-sm font-medium
                                        ${stepComplete ? 'text-green-600 line-through' : 'text-gray-700'}
                                      `}>
                                        {step.title}
                                      </span>
                                      {step.requiresDocuments && (
                                        <Badge variant="outline" className="text-xs ml-auto">
                                          {step.documents.filter(d => d.status === 'ready').length}/{step.documents.length}
                                        </Badge>
                                      )}
                                      {step.manualComplete && !stepComplete && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="ml-auto h-6 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateStepStatus(step.id, 'completed');
                                          }}
                                        >
                                          סמן כבוצע
                                        </Button>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <AnimatePresence mode="wait">
              {showWelcome ? (
                /* Welcome Screen */
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-center min-h-[600px]"
                >
                  <Card className="max-w-2xl w-full bg-white shadow-2xl border-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-8 text-white">
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center"
                      >
                        <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
                          <Rocket className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold mb-2">ברוכים הבאים למסע המשכנתא</h1>
                        <p className="text-lg text-white/90">נלווה אותך צעד אחר צעד עד לקבלת המשכנתא המושלמת</p>
                      </motion.div>
                    </div>
                    <CardContent className="p-8">
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-center"
                          >
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Target className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900">מפה ברורה</h3>
                            <p className="text-xs text-gray-600 mt-1">תצוגה ויזואלית של כל השלבים</p>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-center"
                          >
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <FileCheck className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900">ניהול מסמכים</h3>
                            <p className="text-xs text-gray-600 mt-1">מעקב אחר כל המסמכים הנדרשים</p>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-center"
                          >
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900">מעקב התקדמות</h3>
                            <p className="text-xs text-gray-600 mt-1">ראה את ההתקדמות שלך בזמן אמת</p>
                          </motion.div>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <Button
                            size="lg"
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                            onClick={startJourney}
                          >
                            <Play className="w-5 h-5 mr-2" />
                            בואו נתחיל את המסע
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {/* Right Module - Step Details */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="bg-white shadow-xl border-0 h-full">
                      <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">פרטי השלב</h3>
                            {selectedStepData && (
                              <p className="text-sm text-gray-600 mt-1">{selectedStepData.title}</p>
                            )}
                          </div>
                          {selectedCategory && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">התקדמות בקטגוריה:</span>
                              <div className="flex items-center gap-2">
                                <Progress value={categoryProgress} className="w-24 h-2" />
                                <span className="text-sm font-bold">{categoryProgress}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {selectedStepData ? (
                          <div className="space-y-6">
                            {/* Step Description */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">תיאור השלב</h4>
                                  <p className="text-sm text-gray-700">{selectedStepData.description}</p>
                                </div>
                              </div>
                            </div>

                            {/* Manual Complete Option */}
                            {selectedStepData.manualComplete && !selectedStepData.requiresDocuments && (
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">סטטוס השלב</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {selectedStepData.status === 'completed' 
                                        ? 'השלב הושלם בהצלחה' 
                                        : 'סמן כאשר השלב הושלם'}
                                    </p>
                                  </div>
                                  {selectedStepData.status !== 'completed' && (
                                    <Button
                                      variant="outline"
                                      onClick={() => updateStepStatus(selectedStepData.id, 'completed')}
                                    >
                                      <Check className="w-4 h-4 mr-2" />
                                      סמן כבוצע
                                    </Button>
                                  )}
                                  {selectedStepData.status === 'completed' && (
                                    <Badge className="bg-green-500">
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      הושלם
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Navigation */}
                            <div className="flex justify-between pt-4 border-t">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const currentStepIndex = steps.findIndex(s => s.id === selectedStep);
                                  if (currentStepIndex > 0) {
                                    const prevStep = steps[currentStepIndex - 1];
                                    setSelectedStep(prevStep.id);
                                    setSelectedCategory(prevStep.category);
                                    setExpandedCategory(prevStep.category);
                                  }
                                }}
                                disabled={steps.findIndex(s => s.id === selectedStep) === 0}
                              >
                                <ChevronRight className="w-4 h-4 mr-2" />
                                השלב הקודם
                              </Button>
                              <Button
                                onClick={() => {
                                  const currentStepIndex = steps.findIndex(s => s.id === selectedStep);
                                  if (currentStepIndex < steps.length - 1) {
                                    const nextStep = steps[currentStepIndex + 1];
                                    setSelectedStep(nextStep.id);
                                    setSelectedCategory(nextStep.category);
                                    setExpandedCategory(nextStep.category);
                                    if (nextStep.category !== selectedStepData.category) {
                                      const catIndex = categories.findIndex(c => c.id === nextStep.category);
                                      setActivePathIndex(catIndex - 1);
                                    }
                                  }
                                }}
                                disabled={steps.findIndex(s => s.id === selectedStep) === steps.length - 1}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                              >
                                השלב הבא
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <Compass className="w-12 h-12 mb-3" />
                            <p className="text-lg">בחר שלב מהמפה כדי להתחיל</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Left Module - Documents */}
                  {selectedStepData?.requiresDocuments && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="bg-white shadow-xl border-0 h-full">
                        <CardHeader className="border-b">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-bold text-gray-900">מסמכים נדרשים</h3>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedStepData.documents.filter(d => d.status === 'ready').length} מתוך {selectedStepData.documents.length} מסמכים מוכנים
                          </p>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            {selectedStepData.documents.map((doc) => (
                              <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {getDocumentStatusIcon(doc.status)}
                                    <div>
                                      <p className="font-medium text-gray-900">{doc.name}</p>
                                      <p className="text-xs text-gray-500">{getDocumentStatusText(doc.status)}</p>
                                      {doc.optional && (
                                        <Badge variant="outline" className="text-xs mt-1">אופציונלי</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant={doc.status === 'ready' ? 'default' : 'outline'}
                                      onClick={() => updateDocumentStatus(selectedStepData.id, doc.id, 'ready')}
                                      className={doc.status === 'ready' ? 'bg-green-500 hover:bg-green-600' : ''}
                                    >
                                      <FileCheck className="w-3 h-3 mr-1" />
                                      מוכן
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={doc.status === 'in_progress' ? 'default' : 'outline'}
                                      onClick={() => updateDocumentStatus(selectedStepData.id, doc.id, 'in_progress')}
                                      className={doc.status === 'in_progress' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                                    >
                                      <FileClock className="w-3 h-3 mr-1" />
                                      בתהליך
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={doc.status === 'pending' ? 'default' : 'outline'}
                                      onClick={() => updateDocumentStatus(selectedStepData.id, doc.id, 'pending')}
                                      className={doc.status === 'pending' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                                    >
                                      <FileX className="w-3 h-3 mr-1" />
                                      ממתין
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Documents Progress */}
                          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">התקדמות במסמכים</span>
                              <span className="text-sm font-bold text-blue-600">
                                {Math.round((selectedStepData.documents.filter(d => d.status === 'ready').length / selectedStepData.documents.length) * 100)}%
                              </span>
                            </div>
                            <Progress 
                              value={(selectedStepData.documents.filter(d => d.status === 'ready').length / selectedStepData.documents.length) * 100}
                              className="h-2"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Left Panel - Calendar */}
        <div className="w-96 bg-white shadow-2xl overflow-y-auto border-r border-gray-200">
          <div className="sticky top-0 bg-white z-20 border-b border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(centerDate);
                    newDate.setDate(centerDate.getDate() - 7);
                    setCenterDate(newDate);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800">לוח זמנים</h3>
                  <p className="text-sm text-gray-600">
                    {visibleDays[3]?.monthName} {visibleDays[3]?.year}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(centerDate);
                    newDate.setDate(centerDate.getDate() + 7);
                    setCenterDate(newDate);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}

              {/* Days */}
              {visibleDays.map((day, index) => (
                <motion.div
                  key={`${day.year}-${day.month}-${day.day}`}
                  className={`
                    aspect-square p-2 rounded-lg border transition-all
                    ${day.isToday ? 'ring-2 ring-blue-400 bg-blue-50' : 'bg-white'}
                    ${day.date.getDay() === 6 ? 'bg-gray-100' : 'hover:bg-gray-50'}
                  `}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div className="text-center">
                    <div className={`text-sm font-bold ${day.isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {day.day}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Calendar Legend */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">מקרא</h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm text-gray-700">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
