'use client';

import { motion } from 'framer-motion';
import { UserCheck, Zap, ArrowLeft, Shield, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AdvisorMode } from '@/app/mortgage-advisor/page';

interface ModeSelectorProps {
  onModeSelect: (mode: AdvisorMode) => void;
}

export function ModeSelector({ onModeSelect }: ModeSelectorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-semibold text-slate-800 mb-4">
            בואו נתחיל את המסע למשכנתא
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            בחרו את הדרך המתאימה לכם - נלווה אתכם צעד אחר צעד או נתן לכם שליטה מלאה
          </p>
        </motion.div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Guided Mode */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="p-8 h-full cursor-pointer border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 group">
              <div className="flex flex-col h-full">
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <UserCheck className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-slate-800 mb-3">
                    ללוות אותי
                  </h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    אשף חכם שמוביל אתכם שאלה אחת בכל פעם, עם הסברים מפורטים והדרכה אישית
                  </p>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm text-slate-600">שאלה אחת בכל מסך</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm text-slate-600">הסברים מתקפלים</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm text-slate-600">הדרכה צעד אחר צעד</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Button 
                  onClick={() => onModeSelect('guided')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  <Shield className="w-4 h-4 ml-2" />
                  בואו נתחיל יחד
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Pro Mode */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="p-8 h-full cursor-pointer border-2 border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-200 group">
              <div className="flex flex-col h-full">
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                    <Zap className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-slate-800 mb-3">
                    אני יודע מה אני עושה
                  </h3>
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    דשבורד מקצועי עם כל השלבים פתוחים, שליטה מלאה ועיצוב נקי ומינימלי
                  </p>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-sm text-slate-600">כל השלבים פתוחים</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-sm text-slate-600">שליטה מלאה</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-sm text-slate-600">עיצוב מינימלי</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Button 
                  onClick={() => onModeSelect('pro')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  <Gauge className="w-4 h-4 ml-2" />
                  בואו נתחיל מהר
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-sm text-slate-500">
            תוכלו לעבור בין המצבים בכל שלב • הכל נשמר אוטומטית
          </p>
        </motion.div>
      </div>
    </div>
  );
}