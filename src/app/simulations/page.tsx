'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, TrendingUp, Calculator, PieChart, 
  ArrowRight, Play, BarChart3,
  DollarSign, Target, Zap, Info
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NavBar from '@/components/ui/navbar';

const simulations = [
  {
    id: 'financial-dynamics',
    title: 'דינמיקה פיננסית',
    description: 'הדגמה אינטראקטיבית בזמן אמת של זרימת כסף, חובות, חיסכון ונכסים',
    longDescription: 'כלי מתקדם להבנת הדינמיקה הפיננסית שלך לאורך זמן. מדמה את זרימת הכסף בין נזילות, חובות, חיסכון ונכסים, כולל חישוב ריבית חיובית (R+) ושלילית (R-).',
    href: '/financial-dynamics',
    icon: Activity,
    color: 'from-indigo-600 to-indigo-700',
    borderColor: 'border-indigo-300',
    features: [
      'ויזואליזציה בזמן אמת',
      'חישוב R+ ו-R-',
      'תחזיות לטווח ארוך',
      'ניתוח עושר מצטבר'
    ],
    status: 'new',
    recommended: true
  },
  {
    id: 'mortgage-optimizer',
    title: 'אופטימיזציית משכנתא',
    description: 'מציאת התמהיל האופטימלי למשכנתא שלך',
    longDescription: 'סימולטור מתקדם למציאת התמהיל הטוב ביותר למשכנתא, כולל השוואת מסלולים שונים וחישוב החיסכון הפוטנציאלי.',
    href: '/mortgage-planning',
    icon: TrendingUp,
    color: 'from-green-600 to-green-700',
    borderColor: 'border-green-300',
    features: [
      'השוואת מסלולים',
      'חישוב החזר חודשי',
      'ניתוח רגישות',
      'המלצות מותאמות'
    ],
    status: 'popular'
  },
  {
    id: 'refinance-calculator',
    title: 'מחשבון מיחזור',
    description: 'בדיקת כדאיות מיחזור המשכנתא הקיימת',
    longDescription: 'כלי לבדיקת האם כדאי למחזר את המשכנתא הקיימת שלך בהתאם לתנאי השוק הנוכחיים.',
    href: '/mortgage-refinance',
    icon: Calculator,
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-300',
    features: [
      'השוואת תנאים',
      'חישוב עלויות מיחזור',
      'ניתוח נקודת איזון',
      'תחזית חיסכון'
    ]
  },
  {
    id: 'investment-comparison',
    title: 'השוואת השקעות',
    description: 'השוואה בין אפשרויות השקעה שונות',
    longDescription: 'כלי להשוואה בין השקעה בנדל"ן, שוק ההון, חיסכון ועוד, עם התחשבות בסיכון ותשואה.',
    href: '/investment-comparison',
    icon: PieChart,
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-300',
    features: [
      'ניתוח סיכון-תשואה',
      'השוואת אלטרנטיבות',
      'תחזיות ארוכות טווח',
      'המלצות מותאמות'
    ],
    status: 'coming-soon'
  },
  {
    id: 'debt-strategy',
    title: 'אסטרטגיית חובות',
    description: 'תכנון אופטימלי לסילוק חובות',
    longDescription: 'כלי לתכנון אסטרטגיה אופטימלית לסילוק חובות מרובים, כולל סדר עדיפויות וחיסכון בריבית.',
    href: '/debt-strategy',
    icon: Target,
    color: 'from-orange-600 to-orange-700',
    borderColor: 'border-orange-300',
    features: [
      'תעדוף חובות',
      'אסטרטגיית סילוק',
      'חיסכון בריבית',
      'לוח זמנים מפורט'
    ],
    status: 'coming-soon'
  },
  {
    id: 'retirement-planning',
    title: 'תכנון פרישה',
    description: 'סימולציה של תכנון פיננסי לפרישה',
    longDescription: 'כלי מתקדם לתכנון פיננסי לקראת פרישה, כולל חישוב הכנסות נדרשות וניהול חיסכון פנסיוני.',
    href: '/retirement-planning',
    icon: Zap,
    color: 'from-teal-600 to-teal-700',
    borderColor: 'border-teal-300',
    features: [
      'תחזית הכנסות',
      'ניהול פנסיה',
      'תכנון מס',
      'אופטימיזציה'
    ],
    status: 'coming-soon'
  }
];

export default function SimulationsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredSimulations = simulations.filter(sim => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'available') return !sim.status?.includes('coming-soon');
    if (selectedCategory === 'new') return sim.status === 'new';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <NavBar />
      </div>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative py-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
          >
            כלי סימולציה מתקדמים
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-8"
          >
            כלים אינטראקטיביים לתכנון פיננסי חכם, הדמיה של תרחישים שונים וקבלת החלטות מושכלות
          </motion.p>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center gap-2 mb-8"
          >
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              הכל
            </Button>
            <Button
              variant={selectedCategory === 'available' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('available')}
            >
              זמינים כעת
            </Button>
            <Button
              variant={selectedCategory === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('new')}
            >
              חדש
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Simulations Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSimulations.map((simulation, index) => {
              const Icon = simulation.icon;
              const isComingSoon = simulation.status === 'coming-soon';
              
              return (
                <motion.div
                  key={simulation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: isComingSoon ? 1 : 1.02, y: isComingSoon ? 0 : -5 }}
                  className={isComingSoon ? 'opacity-60' : ''}
                >
                  <Card className={`h-full border-2 ${isComingSoon ? 'border-gray-200' : simulation.borderColor} hover:${simulation.borderColor} transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl ${isComingSoon ? '' : 'cursor-pointer'} relative overflow-hidden`}>
                    {simulation.recommended && (
                      <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-400 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        מומלץ
                      </div>
                    )}
                    
                    {simulation.status && (
                      <div className="absolute top-3 left-3">
                        <Badge 
                          variant={
                            simulation.status === 'new' ? 'default' :
                            simulation.status === 'popular' ? 'secondary' :
                            'outline'
                          }
                        >
                          {simulation.status === 'new' && 'חדש'}
                          {simulation.status === 'popular' && 'פופולרי'}
                          {simulation.status === 'coming-soon' && 'בקרוב'}
                        </Badge>
                      </div>
                    )}

                    <CardHeader>
                      <div className={`w-14 h-14 mx-auto mb-4 bg-gradient-to-br ${simulation.color} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-xl text-center">
                        {simulation.title}
                      </CardTitle>
                      <CardDescription className="text-center mt-2">
                        {simulation.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {simulation.longDescription}
                      </p>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">תכונות עיקריות:</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {simulation.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${simulation.color}`} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {!isComingSoon ? (
                        <Link href={simulation.href}>
                          <Button className={`w-full bg-gradient-to-r ${simulation.color} hover:opacity-90 text-white shadow-md`}>
                            <Play className="w-4 h-4 ml-2" />
                            התחל סימולציה
                            <ArrowRight className="w-4 h-4 mr-2" />
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full">
                          בקרוב...
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12"
          >
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  על הסימולציות שלנו
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  כלי הסימולציה שלנו מבוססים על אלגוריתמים מתקדמים ונתונים עדכניים מהשוק הפיננסי.
                  הם מאפשרים לך להדמות תרחישים שונים, לבחון אסטרטגיות ולקבל החלטות מושכלות
                  לגבי העתיד הפיננסי שלך. כל סימולציה כוללת ויזואליזציות אינטראקטיביות,
                  חישובים בזמן אמת והמלצות מותאמות אישית.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <DollarSign className="w-3 h-3 ml-1" />
                    חישובים מדויקים
                  </Badge>
                  <Badge variant="secondary">
                    <BarChart3 className="w-3 h-3 ml-1" />
                    גרפים אינטראקטיביים
                  </Badge>
                  <Badge variant="secondary">
                    <Target className="w-3 h-3 ml-1" />
                    המלצות מותאמות
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}