'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lightbulb, TrendingUp, X, Zap, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MortgageState } from '@/app/mortgage-advisor/page';

interface SmartHintsProps {
  hints: string[];
  onDismissHint: (hintId: string) => void;
  mortgageState: MortgageState;
  updateState: (updates: Partial<MortgageState>) => void;
}

interface Hint {
  id: string;
  type: 'warning' | 'tip' | 'optimization' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon: React.ComponentType<any>;
  priority: 'high' | 'medium' | 'low';
}

export function SmartHints({ hints, onDismissHint, mortgageState, updateState }: SmartHintsProps) {
  
  const getHintData = (hintId: string): Hint | null => {
    const hintMap: Record<string, Hint> = {
      'high-payment-ratio': {
        id: 'high-payment-ratio',
        type: 'warning',
        title: 'יחס החזר גבוה',
        message: 'יחס ההחזר החודשי עולה על 40% מההכנסה. נמליץ לקצר את תקופת המשכנתא או להגדיל את המקדמה.',
        action: {
          label: 'תקן אוטומטית',
          onClick: () => {
            // Auto-fix logic
            updateState({
              mortgageStructure: {
                ...mortgageState.mortgageStructure,
                totalAmount: mortgageState.mortgageStructure.totalAmount * 0.9
              }
            });
            onDismissHint(hintId);
          }
        },
        icon: AlertTriangle,
        priority: 'high'
      },
      'interest-rate-tip': {
        id: 'interest-rate-tip',
        type: 'tip',
        title: 'טיפ לחיסכון',
        message: 'שקלו להגדיל את החלק הקבוע ל-30% כדי להתגונן מפני עליות ריבית עתידיות.',
        action: {
          label: 'החל המלצה',
          onClick: () => {
            updateState({
              mortgageStructure: {
                ...mortgageState.mortgageStructure,
                fixedRate: 30,
                primeRate: 50,
                indexLinked: 20
              }
            });
            onDismissHint(hintId);
          }
        },
        icon: Lightbulb,
        priority: 'medium'
      },
      'optimization-opportunity': {
        id: 'optimization-opportunity',
        type: 'optimization',
        title: 'הזדמנות לאופטימיזציה',
        message: 'ניתן לחסוך עד 50,000 ₪ על פני כל תקופת המשכנתא על ידי שינוי התמהיל.',
        action: {
          label: 'הצג פרטים',
          onClick: () => {
            // Show optimization details
            console.log('Show optimization details');
            onDismissHint(hintId);
          }
        },
        icon: TrendingUp,
        priority: 'high'
      },
      'quick-approval': {
        id: 'quick-approval',
        type: 'tip',
        title: 'האצת תהליך',
        message: 'כדי לזרז את האישור העקרוני, הכינו מראש תלושי משכורת של 3 חודשים אחרונים.',
        icon: Zap,
        priority: 'low'
      },
      'profile-complete': {
        id: 'profile-complete',
        type: 'success',
        title: 'פרופיל הושלם',
        message: 'מעולה! הפרופיל שלכם מלא ואנחנו יכולים להמשיך לשלב הבא.',
        icon: CheckCircle,
        priority: 'medium'
      },
      'validation-error': {
        id: 'validation-error',
        type: 'warning',
        title: 'שדה חובה',
        message: 'אנא מלאו את השדה כדי להמשיך לשלב הבא.',
        icon: AlertTriangle,
        priority: 'high'
      },
      'insufficient-capital': {
        id: 'insufficient-capital',
        type: 'warning',
        title: 'הון עצמי נמוך',
        message: 'נדרש הון עצמי מינימלי של 50,000 ₪ כדי להמשיך. שקלו לחסוך יותר או לחפש נכס זול יותר.',
        action: {
          label: 'עזרה בתכנון',
          onClick: () => {
            // Show savings plan
            console.log('Show savings plan');
            onDismissHint(hintId);
          }
        },
        icon: AlertTriangle,
        priority: 'high'
      },
      'insufficient-income': {
        id: 'insufficient-income',
        type: 'warning',
        title: 'הכנסה נמוכה מדי',
        message: 'נדרשת הכנסה חודשית מינימלית של 8,000 ₪ לקבלת משכנתא. בדקו אפשרויות להגדלת הכנסה.',
        icon: AlertTriangle,
        priority: 'high'
      },
      'high-expense-ratio': {
        id: 'high-expense-ratio',
        type: 'warning',
        title: 'יחס הוצאות גבוה',
        message: 'ההוצאות שלכם מהוות יותר מ-60% מההכנסה. זה עלול לפגוע ביכולת לקבל משכנתא.',
        action: {
          label: 'ייעוץ תקציבי',
          onClick: () => {
            // Show budget advice
            console.log('Show budget advice');
            onDismissHint(hintId);
          }
        },
        icon: AlertTriangle,
        priority: 'high'
      }
    };

    return hintMap[hintId] || null;
  };

  const activeHints = hints.map(getHintData).filter(Boolean) as Hint[];
  
  // Sort by priority
  const sortedHints = activeHints.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const getTypeStyles = (type: Hint['type']) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'tip':
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      case 'optimization':
        return {
          bg: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          title: 'text-orange-800',
          message: 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          icon: 'text-emerald-600',
          title: 'text-emerald-800',
          message: 'text-emerald-700',
          button: 'bg-emerald-600 hover:bg-emerald-700'
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200',
          icon: 'text-slate-600',
          title: 'text-slate-800',
          message: 'text-slate-700',
          button: 'bg-slate-600 hover:bg-slate-700'
        };
    }
  };

  if (sortedHints.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {sortedHints.map((hint, index) => {
          const styles = getTypeStyles(hint.type);
          
          return (
            <motion.div
              key={hint.id}
              initial={{ opacity: 0, x: 300, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1,
                transition: {
                  delay: index * 0.1,
                  duration: 0.3,
                  ease: "easeOut"
                }
              }}
              exit={{ 
                opacity: 0, 
                x: 300, 
                scale: 0.9,
                transition: { duration: 0.2 }
              }}
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              <Card className={`p-4 border-2 shadow-lg ${styles.bg}`}>
                {/* Priority Indicator */}
                {hint.priority === 'high' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}

                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex-shrink-0 ${styles.icon}`}>
                    <hint.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm ${styles.title}`}>
                      {hint.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => onDismissHint(hint.id)}
                    className={`flex-shrink-0 ${styles.icon} hover:opacity-70 transition-opacity`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Message */}
                <p className={`text-sm leading-relaxed mb-3 ${styles.message}`}>
                  {hint.message}
                </p>

                {/* Action Button */}
                {hint.action && (
                  <Button
                    onClick={hint.action.onClick}
                    size="sm"
                    className={`w-full text-white ${styles.button}`}
                  >
                    {hint.action.label}
                  </Button>
                )}

                {/* Auto-dismiss timer for success hints */}
                {hint.type === 'success' && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-emerald-500 rounded-b"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                    onAnimationComplete={() => onDismissHint(hint.id)}
                  />
                )}
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}