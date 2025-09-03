'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Zap, AlertCircle, CheckCircle, ArrowRight, Settings } from 'lucide-react';

interface SmartHint {
  id: string;
  type: 'tip' | 'warning' | 'error' | 'success' | 'suggestion';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    autoFix?: boolean;
  };
  priority: 'low' | 'medium' | 'high';
  context: string;
  showCondition?: (data: any) => boolean;
  dismissible?: boolean;
}

interface SmartHintsProps {
  context: string;
  userData?: any;
  onHintAction?: (hintId: string, action: string) => void;
}

// Predefined smart hints for different contexts
const hintDatabase: SmartHint[] = [
  {
    id: 'high-debt-ratio',
    type: 'warning',
    title: 'יחס החזר גבוה',
    message: 'יחס ההחזר שלכם עולה על 40% מההכנסה. זה עלול להקשות על קבלת אישור.',
    action: {
      label: 'תקן אוטומטית',
      onClick: () => {},
      autoFix: true
    },
    priority: 'high',
    context: 'financial-input',
    showCondition: (data) => {
      const ratio = (data.monthlyPayment / data.monthlyIncome) * 100;
      return ratio > 40;
    },
    dismissible: true
  },
  {
    id: 'low-equity',
    type: 'suggestion',
    title: 'הון עצמי נמוך',
    message: 'עם יותר הון עצמי תוכלו לקבל תנאים טובים יותר. שקלו לחכות ולחסוך עוד.',
    action: {
      label: 'חשב השפעה',
      onClick: () => {}
    },
    priority: 'medium',
    context: 'financial-input',
    showCondition: (data) => {
      const equityRatio = (data.ownEquity / data.propertyValue) * 100;
      return equityRatio < 25;
    },
    dismissible: true
  },
  {
    id: 'missing-documents',
    type: 'error',
    title: 'מסמכים חסרים',
    message: 'לא ניתן להמשיך בלי לצרף תלושי משכורת עדכניים.',
    priority: 'high',
    context: 'document-upload',
    dismissible: false
  },
  {
    id: 'optimal-mix-suggestion',
    type: 'tip',
    title: 'תמהיל מומלץ',
    message: 'על בסיס הפרופיל שלכם, תמהיל של 60% קבוע ו-40% פריים יהיה אידיאלי.',
    action: {
      label: 'החל תמהיל',
      onClick: () => {},
      autoFix: true
    },
    priority: 'medium',
    context: 'portfolio-building',
    showCondition: (data) => {
      return data.riskProfile === 'moderate' && !data.hasSelectedMix;
    },
    dismissible: true
  },
  {
    id: 'interest-rate-opportunity',
    type: 'success',
    title: 'הזדמנות חיסכון',
    message: 'הריבית ירדה השבוע! זה זמן מצוין לקחת משכנתא.',
    priority: 'medium',
    context: 'market-conditions',
    dismissible: true
  },
  {
    id: 'bank-comparison-tip',
    type: 'tip',
    title: 'השוואת בנקים',
    message: 'מצאנו שבנק לאומי מציע תנאים טובים יותר לפרופיל שלכם.',
    action: {
      label: 'ראה פרטים',
      onClick: () => {}
    },
    priority: 'medium',
    context: 'bank-comparison',
    dismissible: true
  },
  {
    id: 'refinancing-opportunity',
    type: 'suggestion',
    title: 'הזדמנות למיחזור',
    message: 'עם המשכנתא הקיימת שלכם, מיחזור יכול לחסוך לכם 250,000 ₪.',
    action: {
      label: 'חשב מיחזור',
      onClick: () => {}
    },
    priority: 'high',
    context: 'existing-mortgage',
    dismissible: true
  }
];

export function SmartHints({ context, userData = {}, onHintAction }: SmartHintsProps) {
  const [activeHints, setActiveHints] = useState<SmartHint[]>([]);
  const [dismissedHints, setDismissedHints] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Filter hints based on context and conditions
    const relevantHints = hintDatabase.filter(hint => {
      // Check context
      if (hint.context !== context) return false;
      
      // Check if dismissed
      if (dismissedHints.includes(hint.id)) return false;
      
      // Check show condition
      if (hint.showCondition && !hint.showCondition(userData)) return false;
      
      return true;
    });

    // Sort by priority
    const sortedHints = relevantHints.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    setActiveHints(sortedHints.slice(0, 3)); // Show max 3 hints
  }, [context, userData, dismissedHints]);

  const dismissHint = (hintId: string) => {
    setDismissedHints(prev => [...prev, hintId]);
  };

  const handleHintAction = (hint: SmartHint) => {
    if (hint.action) {
      hint.action.onClick();
      onHintAction?.(hint.id, 'action');
      
      if (hint.action.autoFix) {
        // Auto-dismiss after auto-fix
        setTimeout(() => {
          dismissHint(hint.id);
        }, 2000);
      }
    }
  };

  const getHintIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'suggestion':
        return <Zap className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getHintStyles = (type: string) => {
    switch (type) {
      case 'tip':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-700'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-800',
          icon: 'text-amber-600',
          button: 'bg-amber-100 hover:bg-amber-200 text-amber-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-100 hover:bg-red-200 text-red-700'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-800',
          icon: 'text-emerald-600',
          button: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
        };
      case 'suggestion':
        return {
          bg: 'bg-purple-50 border-purple-200',
          text: 'text-purple-800',
          icon: 'text-purple-600',
          button: 'bg-purple-100 hover:bg-purple-200 text-purple-700'
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200',
          text: 'text-slate-800',
          icon: 'text-slate-600',
          button: 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        };
    }
  };

  if (activeHints.length === 0 || !isVisible) {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-6 left-6 z-50 max-w-sm space-y-3"
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence>
        {activeHints.map((hint, index) => {
          const styles = getHintStyles(hint.type);
          
          return (
            <motion.div
              key={hint.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`
                ${styles.bg} border rounded-xl p-4 shadow-lg backdrop-blur-sm
                ${hint.priority === 'high' ? 'ring-2 ring-opacity-50' : ''}
              `}
              layout
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`${styles.icon} mt-0.5 flex-shrink-0`}>
                  {getHintIcon(hint.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`font-semibold text-sm ${styles.text}`}>
                      {hint.title}
                    </h4>
                    
                    {hint.dismissible && (
                      <button
                        onClick={() => dismissHint(hint.id)}
                        className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  <p className={`text-xs ${styles.text} leading-relaxed mb-3`}>
                    {hint.message}
                  </p>

                  {/* Action Button */}
                  {hint.action && (
                    <motion.button
                      onClick={() => handleHintAction(hint)}
                      className={`
                        ${styles.button} px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-all flex items-center gap-1
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {hint.action.autoFix && <Settings className="w-3 h-3" />}
                      <span>{hint.action.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Priority Indicator */}
              {hint.priority === 'high' && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Toggle Visibility */}
      <motion.button
        onClick={() => setIsVisible(!isVisible)}
        className="w-full p-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-white transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isVisible ? 'הסתר רמזים' : `${activeHints.length} רמזים זמינים`}
      </motion.button>
    </motion.div>
  );
}

// Hook for managing smart hints
export function useSmartHints(context: string, userData: any = {}) {
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [customHints, setCustomHints] = useState<SmartHint[]>([]);

  const addCustomHint = (hint: Omit<SmartHint, 'id'>) => {
    const newHint: SmartHint = {
      ...hint,
      id: `custom-${Date.now()}`
    };
    setCustomHints(prev => [...prev, newHint]);
    
    // Auto-remove after 10 seconds if dismissible
    if (hint.dismissible) {
      setTimeout(() => {
        setCustomHints(prev => prev.filter(h => h.id !== newHint.id));
      }, 10000);
    }
  };

  const removeCustomHint = (hintId: string) => {
    setCustomHints(prev => prev.filter(h => h.id !== hintId));
  };

  return {
    hintsEnabled,
    setHintsEnabled,
    customHints,
    addCustomHint,
    removeCustomHint
  };
}

// Example usage component
export function SmartHintsDemo() {
  const sampleUserData = {
    monthlyIncome: 20000,
    monthlyPayment: 9000,
    ownEquity: 200000,
    propertyValue: 1200000,
    riskProfile: 'moderate',
    hasSelectedMix: false
  };

  const { addCustomHint } = useSmartHints('financial-input', sampleUserData);

  const handleAddCustomHint = () => {
    addCustomHint({
      type: 'tip',
      title: 'רמז מותאם אישית',
      message: 'זה רמז שנוסף באופן דינמי על בסיס פעולת המשתמש.',
      priority: 'medium',
      context: 'financial-input',
      dismissible: true
    });
  };

  return (
    <div className="p-8 bg-slate-100 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">
          דמו של רמזים חכמים
        </h1>
        
        <button
          onClick={handleAddCustomHint}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          הוסף רמז מותאם
        </button>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <p className="text-slate-600">
            הרמזים החכמים יופיעו בפינה השמאלית התחתונה של המסך
            על בסיס הנתונים הנוכחיים שלכם.
          </p>
        </div>
      </div>

      <SmartHints
        context="financial-input"
        userData={sampleUserData}
        onHintAction={(hintId, action) => {
          console.log(`Hint ${hintId} action: ${action}`);
        }}
      />
    </div>
  );
}