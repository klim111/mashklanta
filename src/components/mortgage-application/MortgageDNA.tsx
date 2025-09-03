'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna, Shield, Zap, DollarSign, TrendingUp, Info, ChevronRight } from 'lucide-react';

interface PreferenceQuestion {
  id: string;
  question: string;
  description: string;
  options: {
    value: number;
    label: string;
    description: string;
  }[];
}

interface DNAProfile {
  stability: number;
  flexibility: number;
  cost: number;
  riskTolerance: number;
  label: string;
  description: string;
  recommendedMix: {
    prime: number;
    variable: number;
    fixed: number;
    indexLinked: number;
  };
  reasoning: string[];
}

const preferenceQuestions: PreferenceQuestion[] = [
  {
    id: 'stability',
    question: 'עד כמה חשובה לכם יציבות בתשלום החודשי?',
    description: 'יציבות גבוהה = תשלום קבוע, יציבות נמוכה = תשלום משתנה',
    options: [
      { value: 1, label: 'לא חשוב', description: 'אוקיי עם שינויים בתשלום' },
      { value: 2, label: 'קצת חשוב', description: 'מוכן לשינויים קטנים' },
      { value: 3, label: 'בינוני', description: 'רוצה איזון' },
      { value: 4, label: 'חשוב', description: 'מעדיף יציבות' },
      { value: 5, label: 'קריטי', description: 'חייב תשלום קבוע' }
    ]
  },
  {
    id: 'flexibility',
    question: 'עד כמה חשובה לכם גמישות בפירעון מוקדם?',
    description: 'גמישות גבוהה = יכולת להחזיר מוקדם בלי עמלות',
    options: [
      { value: 1, label: 'לא חשוב', description: 'לא מתכנן פירעון מוקדם' },
      { value: 2, label: 'קצת חשוב', description: 'אולי בעתיד הרחוק' },
      { value: 3, label: 'בינוני', description: 'רוצה אופציה' },
      { value: 4, label: 'חשוב', description: 'מתכנן פירעון חלקי' },
      { value: 5, label: 'קריטי', description: 'חייב גמישות מלאה' }
    ]
  },
  {
    id: 'cost',
    question: 'עד כמה חשוב לכם לחסוך בעלויות?',
    description: 'חיסכון גבוה = ריבית נמוכה יותר, סיכון גבוה יותר',
    options: [
      { value: 1, label: 'לא חשוב', description: 'מוכן לשלם יותר ליציבות' },
      { value: 2, label: 'קצת חשוב', description: 'חיסכון קטן זה נחמד' },
      { value: 3, label: 'בינוני', description: 'איזון בין עלות ויציבות' },
      { value: 4, label: 'חשוב', description: 'רוצה לחסוך כסף' },
      { value: 5, label: 'קריטי', description: 'חייב את העלות הנמוכה' }
    ]
  },
  {
    id: 'riskTolerance',
    question: 'איך אתם מרגישים לגבי סיכון בהשקעות?',
    description: 'סובלנות גבוהה = נוח עם שינויים, נמוכה = רוצה ודאות',
    options: [
      { value: 1, label: 'שמרן מאוד', description: 'רוצה ודאות מלאה' },
      { value: 2, label: 'שמרן', description: 'מעט סיכון זה בסדר' },
      { value: 3, label: 'מאוזן', description: 'איזון בין סיכון לתשואה' },
      { value: 4, label: 'אגרסיבי', description: 'מוכן לסכן לתשואה' },
      { value: 5, label: 'אגרסיבי מאוד', description: 'אוהב סיכון גבוה' }
    ]
  }
];

const generateDNAProfile = (preferences: Record<string, number>): DNAProfile => {
  const { stability = 3, flexibility = 3, cost = 3, riskTolerance = 3 } = preferences;
  
  // Calculate profile type based on preferences
  const stabilityWeight = stability / 5;
  const flexibilityWeight = flexibility / 5;
  const costWeight = cost / 5;
  const riskWeight = riskTolerance / 5;
  
  // Determine profile label
  let label = '';
  let description = '';
  let recommendedMix = { prime: 0, variable: 0, fixed: 0, indexLinked: 0 };
  let reasoning: string[] = [];
  
  if (stabilityWeight > 0.7 && riskWeight < 0.4) {
    label = 'שמרן יציב';
    description = 'מעדיף ודאות ויציבות מלאה בתשלומים';
    recommendedMix = { prime: 20, variable: 10, fixed: 60, indexLinked: 10 };
    reasoning = [
      'ריבית קבועה גבוהה לוודאות מקסימלית',
      'מינימום ריבית משתנה להפחתת סיכון',
      'מעט פריים לגמישות בסיסית'
    ];
  } else if (riskWeight > 0.7 && costWeight > 0.6) {
    label = 'אגרסיבי חסכן';
    description = 'מוכן לקחת סיכונים כדי לחסוך בעלויות';
    recommendedMix = { prime: 50, variable: 30, fixed: 10, indexLinked: 10 };
    reasoning = [
      'פריים גבוה לחיסכון מקסימלי',
      'ריבית משתנה לתשואה פוטנציאלית',
      'מינימום קבוע לביטחון בסיסי'
    ];
  } else if (flexibilityWeight > 0.7) {
    label = 'גמיש מאוזן';
    description = 'רוצה גמישות מקסימלית עם איזון סיכונים';
    recommendedMix = { prime: 40, variable: 20, fixed: 30, indexLinked: 10 };
    reasoning = [
      'פריים גבוה לגמישות פירעון',
      'איזון בין קבוע למשתנה',
      'מגוון מסלולים לאופטימיזציה'
    ];
  } else {
    label = 'מאוזן קלאסי';
    description = 'איזון חכם בין כל הפרמטרים';
    recommendedMix = { prime: 30, variable: 20, fixed: 40, indexLinked: 10 };
    reasoning = [
      'חלוקה מאוזנת לפיזור סיכונים',
      'גמישות בינונית לפירעון',
      'עלויות סבירות עם יציבות'
    ];
  }
  
  return {
    stability,
    flexibility,
    cost,
    riskTolerance,
    label,
    description,
    recommendedMix,
    reasoning
  };
};

interface MortgageDNAProps {
  onProfileComplete?: (profile: DNAProfile) => void;
}

export function MortgageDNA({ onProfileComplete }: MortgageDNAProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [preferences, setPreferences] = useState<Record<string, number>>({});
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<DNAProfile | null>(null);

  const isComplete = Object.keys(preferences).length === preferenceQuestions.length;

  useEffect(() => {
    if (isComplete) {
      const generatedProfile = generateDNAProfile(preferences);
      setProfile(generatedProfile);
      onProfileComplete?.(generatedProfile);
    }
  }, [preferences, isComplete, onProfileComplete]);

  const handleAnswer = (questionId: string, value: number) => {
    setPreferences(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    if (currentQuestion < preferenceQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
      }, 300);
    } else {
      setTimeout(() => {
        setShowProfile(true);
      }, 500);
    }
  };

  const currentQ = preferenceQuestions[currentQuestion];

  if (showProfile && profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div>Profile view temporarily disabled for debugging</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
          <Dna className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          בואו נכיר את ההעדפות שלכם
        </h2>
        <p className="text-slate-600">
          4 שאלות קצרות שיעזרו לנו לבנות את התמהיל המושלם עבורכם
        </p>
      </motion.div>

      {/* Progress */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-500">
            שאלה {currentQuestion + 1} מתוך {preferenceQuestions.length}
          </span>
          <span className="text-sm text-slate-500">
            {Math.round(((currentQuestion + 1) / preferenceQuestions.length) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / preferenceQuestions.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </motion.div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                {currentQ?.question}
              </h3>
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{currentQ?.description}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {currentQ?.options.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => handleAnswer(currentQ.id, option.value)}
                  className="text-right p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 mb-1">
                        {option.label}
                      </div>
                      <div className="text-sm text-slate-600">
                        {option.description}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}