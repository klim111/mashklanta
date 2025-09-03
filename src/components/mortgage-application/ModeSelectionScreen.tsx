'use client';

import { motion } from 'framer-motion';
import { Sparkles, Zap, ArrowLeft, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ApplicationMode } from './MortgageApplication';

interface ModeSelectionScreenProps {
  onModeSelect: (mode: ApplicationMode) => void;
}

export function ModeSelectionScreen({ onModeSelect }: ModeSelectionScreenProps) {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);

  const handleButtonClick = (modeId: string) => {
    onModeSelect(modeId as ApplicationMode);
  };

  const modes = [
    {
      id: 'guided',
      title: 'ללוות אותי',
      subtitle: 'מצב מודרך',
      description: 'אשף צעד אחר צעד עם הסברים והנחיות',
      icon: Sparkles,
      color: 'from-blue-500 to-teal-500',
      features: [
        'שאלה אחת בכל מסך',
        'הסברים מתקפלים וברורים',
        'ליווי מלא לאורך הדרך',
        'המלצות מותאמות אישית'
      ],
      ideal: 'מושלם למי שרוצה ליווי צמוד ולא מכיר את התהליך לעומק'
    },
    {
      id: 'pro',
      title: 'אני יודע מה אני עושה',
      subtitle: 'מצב מקצועי',
      description: 'דשבורד מקצועי עם כל השלבים פתוחים',
      icon: Zap,
      color: 'from-purple-500 to-pink-500',
      features: [
        'כל השלבים גלויים במקביל',
        'גישה מהירה לכל הכלים',
        'ממשק מינימלי ונקי',
        'שליטה מלאה בתהליך'
      ],
      ideal: 'מתאים למי שמכיר את תהליך המשכנתא ורוצה יעילות מקסימלית'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-semibold text-slate-800 mb-4">
          בואו נתחיל את המסע
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl">
          איך תרצו לנווט בתהליך המשכנתא? בחרו את הדרך המתאימה לכם
        </p>
      </motion.div>

      {/* Mode Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
        {modes.map((mode, index) => {
          const Icon = mode.icon;
          const isHovered = hoveredMode === mode.id;
          const isExpanded = expandedInfo === mode.id;

          return (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              className="relative"
            >
              <motion.div
                className={`
                  relative bg-white rounded-2xl p-8 shadow-lg border border-slate-200
                  cursor-pointer overflow-hidden group
                  ${isHovered ? 'shadow-2xl' : 'hover:shadow-xl'}
                `}
                onHoverStart={() => setHoveredMode(mode.id)}
                onHoverEnd={() => setHoveredMode(null)}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {/* Background Gradient */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-5`}
                  transition={{ duration: 0.3 }}
                />

                {/* Icon */}
                <motion.div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${mode.color} mb-6`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon className="w-8 h-8 text-white" />
                </motion.div>

                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-800 mb-2">
                      {mode.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      {mode.subtitle}
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>

                  {/* Features Preview */}
                  <div className="space-y-2">
                    {mode.features.slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Expandable Info */}
                  <motion.button
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedInfo(isExpanded ? null : mode.id);
                    }}
                  >
                    <span>למה זה מתאים לי?</span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </motion.button>

                  <motion.div
                    initial={false}
                    animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-3 border-t border-slate-100">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {mode.ideal}
                      </p>
                      <div className="space-y-2">
                        {mode.features.slice(2).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* CTA Button */}
                  <button
                    className={`
                      w-full mt-6 py-4 px-6 rounded-xl font-medium text-white
                      bg-gradient-to-r ${mode.color} shadow-md
                      hover:shadow-lg transition-all duration-200
                      relative z-10
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleButtonClick(mode.id);
                    }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      בואו נתחיל
                      <ArrowLeft className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-12 text-center"
      >
        <p className="text-sm text-slate-500">
          תוכלו לעבור בין המצבים בכל שלב של התהליך
        </p>
      </motion.div>
    </div>
  );
}