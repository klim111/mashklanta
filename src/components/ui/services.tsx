"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, FileText, Search, Handshake, CheckCircle, TrendingUp, Shield, Users, Star, Award } from "lucide-react";

const serviceSteps = [
  {
    id: "1",
    title: "אבחון כלכלי",
    icon: Calculator,
    color: "bg-financial-gradient",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  {
    id: "2", 
    title: "איסוף מסמכים",
    icon: FileText,
    color: "bg-financial-success-gradient",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  {
    id: "3",
    title: "בדיקת הצעות", 
    icon: Search,
    color: "bg-gradient-to-r from-purple-600 to-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  },
  {
    id: "4",
    title: "ניהול מו\"מ",
    icon: Handshake,
    color: "bg-gradient-to-r from-orange-600 to-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  },
  {
    id: "5",
    title: "חתימה",
    icon: CheckCircle,
    color: "bg-gradient-to-r from-emerald-600 to-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200"
  }
];

const serviceContent = {
  "1": {
    title: "אבחון כלכלי מקיף",
    description: "נבצע ניתוח מעמיק של המצב הכלכלי שלך, כולל הכנסות, הוצאות, נכסים וחובות. נבנה תמהיל משכנתא מותאם אישית שיחסוך לך מאות אלפי שקלים.",
    features: [
      "ניתוח יכולת החזר מפורט",
      "בניית תמהיל אופטימלי", 
      "תכנון אסטרטגי לטווח ארוך",
      "המלצות מותאמות אישית"
    ],
    icon: TrendingUp,
    stats: { time: "30 דקות", accuracy: "99.5%", savings: "₪150K+" }
  },
  "2": {
    title: "איסוף מסמכים מאובטח",
    description: "נעזור לך לאסוף את כל המסמכים הנדרשים בצורה מאובטחת ומסודרת. המערכת שלנו מנהלת את כל התהליך בצורה דיגיטלית.",
    features: [
      "רשימת מסמכים מותאמת אישית",
      "העלאה מאובטחת של מסמכים",
      "מעקב אחר התקדמות",
      "הצפנה מתקדמת"
    ],
    icon: Shield,
    stats: { time: "15 דקות", security: "256-bit", documents: "100%" }
  },
  "3": {
    title: "השוואת הצעות מכל הבנקים",
    description: "נשווה הצעות מכל הבנקים בישראל ונמצא עבורך את התנאים הטובים ביותר. נחסוך לך זמן יקר ונבטיח שתקבל את המחיר הטוב ביותר.",
    features: [
      "השוואה מפורטת של תנאים",
      "ניתוח עלויות כולל",
      "המלצות מותאמות אישית",
      "מעקב אחר שינויים"
    ],
    icon: Search,
    stats: { banks: "12+", offers: "50+", savings: "₪200K+" }
  },
  "4": {
    title: "ניהול משא ומתן מקצועי",
    description: "ננהל עבורך את כל המשא ומתן מול הבנקים. יש לנו ניסיון רב וקשרים עם כל הבנקים בישראל, מה שמבטיח לך תנאים טובים יותר.",
    features: [
      "משא ומתן מקצועי",
      "קשרים עם כל הבנקים",
      "ליווי צמוד עד לחתימה",
      "תנאים מותאמים אישית"
    ],
    icon: Handshake,
    stats: { experience: "15+ שנים", banks: "כל הבנקים", success: "98%" }
  },
  "5": {
    title: "חתימה וליווי מתמשך",
    description: "נלווה אותך עד לחתימה על המשכנתא ונמשיך ללוות אותך גם אחר כך. נעזור לך לנהל את המשכנתא בצורה חכמה ולחסוך כסף.",
    features: [
      "ליווי עד לחתימה",
      "ניהול המשכנתא",
      "ייעוץ מתמשך",
      "מעקב אחר שינויים"
    ],
    icon: CheckCircle,
    stats: { support: "24/7", satisfaction: "99%", savings: "₪50K/שנה" }
  }
};

export default function Services() {
  const [activeTab, setActiveTab] = useState("1");

  return (
    <section className="container-financial section-padding">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 bg-financial-gradient text-white px-6 py-3 rounded-full text-sm font-semibold mb-8 shadow-financial"
          >
            <Award className="w-5 h-5" />
            <span>השירותים המקצועיים שלנו</span>
            <Star className="w-4 h-4" />
          </motion.div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-financial-gradient">
            למה לבחור במשכלתנא?
          </h2>
          
          <p className="text-xl text-financial-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
            אנחנו מציעים פתרון מקיף ומקצועי לכל שלב בתהליך המשכנתא, 
            עם טכנולוגיה מתקדמת וליווי אישי מקצועי שיחסוך לך זמן, כסף ודאגות
          </p>
        </motion.div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="flex justify-center mb-12"
          >
            <TabsList className="grid grid-cols-5 w-full max-w-4xl h-auto p-2 bg-white shadow-financial-lg rounded-2xl border border-financial-gray-200">
              {serviceSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  viewport={{ once: true }}
                >
                  <TabsTrigger 
                    value={step.id} 
                    className={`flex flex-col items-center gap-3 p-6 rounded-xl transition-all duration-300 data-[state=active]:bg-financial-gradient data-[state=active]:text-white data-[state=active]:shadow-financial hover:bg-financial-gray-50 ${
                      activeTab === step.id ? 'transform scale-105' : ''
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activeTab === step.id ? 'bg-white/20' : 'bg-financial-gray-100'
                    }`}>
                      <step.icon className={`w-6 h-6 ${
                        activeTab === step.id ? 'text-white' : 'text-financial-primary'
                      }`} />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm">{step.title}</div>
                      <div className={`text-xs mt-1 ${
                        activeTab === step.id ? 'text-white/80' : 'text-financial-gray-500'
                      }`}>
                        שלב {step.id}
                      </div>
                    </div>
                  </TabsTrigger>
                </motion.div>
              ))}
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            {Object.entries(serviceContent).map(([key, content]) => (
              <TabsContent key={key} value={key} className="mt-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="card-financial border-2 shadow-financial-xl">
                    <CardContent className="p-8">
                      <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex items-center gap-4 mb-6"
                          >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${serviceSteps.find(s => s.id === key)?.color}`}>
                              <content.icon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-3xl font-bold text-financial-gray-900 mb-2">
                                {content.title}
                              </h3>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-financial-primary rounded-full"></div>
                                <span className="text-financial-gray-600 font-medium">שלב {key} מתוך 5</span>
                              </div>
                            </div>
                          </motion.div>
                          
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="text-lg text-financial-gray-700 leading-relaxed mb-6"
                          >
                            {content.description}
                          </motion.p>
                          
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                          >
                            {content.features.map((feature, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 * index }}
                                className="flex items-center gap-3 p-3 bg-financial-gray-50 rounded-xl hover:bg-financial-gray-100 transition-colors"
                              >
                                <div className="w-2 h-2 bg-financial-success rounded-full flex-shrink-0"></div>
                                <span className="text-financial-gray-700 font-medium">{feature}</span>
                              </motion.div>
                            ))}
                          </motion.div>
                        </div>
                        
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          className="space-y-6"
                        >
                          <div className="text-center">
                            <h4 className="text-2xl font-bold text-financial-gray-900 mb-4">
                              נתונים מרשימים
                            </h4>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                            {Object.entries(content.stats).map(([statKey, statValue], index) => (
                              <motion.div
                                key={statKey}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.1 * index }}
                                className="card-financial text-center p-6 border-l-4 border-l-financial-primary"
                              >
                                <div className="text-3xl font-black text-financial-primary mb-2">
                                  {statValue}
                                </div>
                                <div className="text-financial-gray-600 font-semibold capitalize">
                                  {statKey === 'time' && 'זמן ממוצע'}
                                  {statKey === 'accuracy' && 'דיוק'}
                                  {statKey === 'savings' && 'חיסכון ממוצע'}
                                  {statKey === 'security' && 'רמת אבטחה'}
                                  {statKey === 'documents' && 'השלמת מסמכים'}
                                  {statKey === 'banks' && 'בנקים'}
                                  {statKey === 'offers' && 'הצעות'}
                                  {statKey === 'experience' && 'ניסיון'}
                                  {statKey === 'success' && 'הצלחה'}
                                  {statKey === 'support' && 'תמיכה'}
                                  {statKey === 'satisfaction' && 'שביעות רצון'}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </AnimatePresence>
        </Tabs>
      </div>
    </section>
  );
} 