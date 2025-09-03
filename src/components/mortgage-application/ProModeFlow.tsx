'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, BarChart3, Calculator, FileText, ArrowRight } from 'lucide-react';
import { UserProfile } from './hooks/useMortgageApplication';
import { JourneyMap } from './JourneyMap';

interface ProModeFlowProps {
  userProfile: UserProfile;
  onReset: () => void;
}

export function ProModeFlow({ userProfile, onReset }: ProModeFlowProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    {
      id: 'client-profiling',
      title: 'הכרת הלקוח',
      description: 'מידע אישי ופיננסי מקיף',
      icon: FileText,
      color: 'from-blue-500 to-indigo-600',
      progress: 45
    },
    {
      id: 'portfolio-building',
      title: 'בניית תמהיל',
      description: 'יצירת תמהיל משכנתא מותאם',
      icon: BarChart3,
      color: 'from-emerald-500 to-teal-600',
      progress: 0
    },
    {
      id: 'calculations',
      title: 'חישובים ומחשבונים',
      description: 'כלי חישוב מתקדמים',
      icon: Calculator,
      color: 'from-purple-500 to-pink-600',
      progress: 0
    },
    {
      id: 'bank-negotiations',
      title: 'מו"מ בנקים',
      description: 'השוואת הצעות ומשא ומתן',
      icon: Settings,
      color: 'from-amber-500 to-orange-600',
      progress: 0
    }
  ];

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        className="max-w-7xl mx-auto mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800 mb-2">
              מצב מקצועי - דשבורד מלא
            </h1>
            <p className="text-slate-600">
              כל הכלים והשלבים פתוחים וזמינים במקביל
            </p>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            התחל מחדש
          </button>
        </div>
      </motion.div>

      {/* Journey Map */}
      <motion.div
        className="max-w-7xl mx-auto mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <JourneyMap
          sections={sections}
          activeSection={activeSection}
          onSectionClick={setActiveSection}
        />
      </motion.div>

      {/* Dashboard Grid */}
      <motion.div
        className="max-w-7xl mx-auto grid lg:grid-cols-2 xl:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {sections.map((section, index) => {
          const Icon = section.icon;
          
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              className={`
                bg-white rounded-2xl shadow-lg border border-slate-200 p-6 cursor-pointer
                hover:shadow-xl transition-all duration-300 group
                ${activeSection === section.id ? 'ring-2 ring-blue-500' : ''}
              `}
              onClick={() => setActiveSection(
                activeSection === section.id ? null : section.id
              )}
              whileHover={{ y: -4 }}
            >
              {/* Section Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`
                  w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} 
                  flex items-center justify-center group-hover:scale-110 transition-transform
                `}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-500 mb-1">
                    {section.progress}% הושלם
                  </div>
                  <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${section.color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${section.progress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section Content */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-slate-800">
                  {section.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {section.description}
                </p>

                {/* Quick Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    לחצו להרחבה
                  </span>
                  <motion.div
                    className="text-slate-400 group-hover:text-slate-600"
                    whileHover={{ x: -4 }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </div>
              </div>

              {/* Expanded Content Preview */}
              {activeSection === section.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 pt-4 border-t border-slate-100 overflow-hidden"
                >
                  <div className="text-sm text-slate-600">
                    תוכן מפורט של {section.title} יופיע כאן...
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="max-w-7xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        {[
          { label: 'שלבים הושלמו', value: '1/4', color: 'text-blue-600' },
          { label: 'זמן משוער', value: '45 דק', color: 'text-emerald-600' },
          { label: 'עלות נוכחית', value: '₪7,000', color: 'text-purple-600' },
          { label: 'חיסכון פוטנציאלי', value: '₪2,500', color: 'text-amber-600' }
        ].map((stat, index) => (
          <motion.div
            key={index}
            className="bg-white rounded-xl p-4 shadow-md border border-slate-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
          >
            <div className="text-center">
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-600">
                {stat.label}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}