'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MortgageDNA, 
  MicroCalculators, 
  OfferMixer, 
  InterestShockDemo, 
  SmartHintsDemo,
  StageCards
} from './index';
import { Calculator, Dna, Shuffle, Zap, Lightbulb, Layout } from 'lucide-react';

const demoComponents = [
  {
    id: 'dna',
    title: 'DNA משכנתא',
    description: 'מערכת פרופיל חזותי מבוססת העדפות',
    icon: Dna,
    color: 'from-purple-500 to-pink-600',
    component: MortgageDNA
  },
  {
    id: 'calculators',
    title: 'מחשבונים חכמים',
    description: 'כלי חישוב מתקדמים עם פרמטרים מותאמים',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
    component: MicroCalculators
  },
  {
    id: 'mixer',
    title: 'מיקסר הצעות',
    description: 'השוואה אינטראקטיבית של הצעות בנקים',
    icon: Shuffle,
    color: 'from-indigo-500 to-purple-600',
    component: OfferMixer
  },
  {
    id: 'shock',
    title: 'סימולציית הלם ריבית',
    description: 'בדיקת השפעת עליות ריבית',
    icon: Zap,
    color: 'from-amber-500 to-red-600',
    component: InterestShockDemo
  },
  {
    id: 'hints',
    title: 'רמזים חכמים',
    description: 'טיפים והצעות בהתאם להקשר',
    icon: Lightbulb,
    color: 'from-emerald-500 to-teal-600',
    component: SmartHintsDemo
  },
  {
    id: 'stages',
    title: 'כרטיסי שלבים',
    description: 'ממשק אחיד לשלבי התהליך',
    icon: Layout,
    color: 'from-teal-500 to-cyan-600',
    component: () => (
      <StageCards 
        stages={[
          {
            id: 'profile',
            title: 'בניית פרופיל',
            description: 'איסוף מידע אישי ופיננסי',
            ctaText: 'התחל',
            requirements: ['תעודת זהות', 'תלושי משכורת', 'אישור בנק'],
            icon: Dna,
            color: 'from-blue-500 to-indigo-600',
            completed: true,
            locked: false,
            onAction: () => {}
          },
          {
            id: 'calculate',
            title: 'חישובים',
            description: 'חישוב יכולת החזר ותמהיל',
            ctaText: 'חשב',
            requirements: ['נתוני הכנסה', 'נתוני נכס', 'העדפות אישיות'],
            icon: Calculator,
            color: 'from-emerald-500 to-teal-600',
            completed: false,
            locked: false,
            onAction: () => {}
          },
          {
            id: 'compare',
            title: 'השוואת הצעות',
            description: 'בדיקה והשוואה של הצעות בנקים',
            ctaText: 'השווה',
            requirements: ['פרופיל מושלם', 'אישור עקרוני', 'מסמכים'],
            icon: Shuffle,
            color: 'from-purple-500 to-pink-600',
            completed: false,
            locked: true,
            onAction: () => {}
          }
        ]}
      />
    )
  }
];

export function MortgageDemo() {
  const [activeComponent, setActiveComponent] = useState<string | null>(null);

  const ActiveComponent = activeComponent 
    ? demoComponents.find(c => c.id === activeComponent)?.component 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30" dir="rtl">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            דמו מערכת משכנתא חכמה
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            מערכת מתקדמת לבקשת משכנתא עם מצב מודרך ומצב מקצועי, 
            כלים חכמים ומעקב התקדמות בזמן אמת
          </p>
        </motion.div>

        {!activeComponent ? (
          <>
            {/* Component Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {demoComponents.map((component, index) => {
                const Icon = component.icon;
                
                return (
                  <motion.div
                    key={component.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 cursor-pointer hover:shadow-xl transition-all group"
                    onClick={() => setActiveComponent(component.id)}
                    whileHover={{ y: -4 }}
                  >
                    <div className="space-y-4">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${component.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">
                          {component.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {component.description}
                        </p>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100">
                        <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                          לחץ לצפייה בדמו ←
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Features Overview */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                תכונות המערכת
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: 'מצב דו-מצבי',
                    description: 'מצב מודרך למתחילים ומצב מקצועי למומחים',
                    icon: '🎯'
                  },
                  {
                    title: 'מעקב התקדמות',
                    description: 'דרכון משכנתא עם אבני דרך ו-ETA',
                    icon: '📍'
                  },
                  {
                    title: 'חישובים בזמן אמת',
                    description: 'מחשבונים חכמים עם עדכון מיידי',
                    icon: '⚡'
                  },
                  {
                    title: 'שמירה חלקה',
                    description: 'שמירה מקומית עם סנכרון ענן אופציונלי',
                    icon: '💾'
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="text-center p-4 rounded-xl bg-slate-50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                  >
                    <div className="text-3xl mb-3">{feature.icon}</div>
                    <h4 className="font-semibold text-slate-800 mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Back Button */}
            <motion.button
              onClick={() => setActiveComponent(null)}
              className="mb-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-all"
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>← חזור לתפריט הדמו</span>
            </motion.button>

            {/* Active Component */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {ActiveComponent && <ActiveComponent />}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}