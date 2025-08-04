"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, FileText, Search, Handshake, CheckCircle, TrendingUp, Shield, Users } from "lucide-react";

const serviceSteps = [
  {
    id: "1",
    title: "אבחון כלכלי",
    icon: Calculator,
    color: "bg-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  {
    id: "2", 
    title: "איסוף מסמכים",
    icon: FileText,
    color: "bg-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  {
    id: "3",
    title: "בדיקת הצעות", 
    icon: Search,
    color: "bg-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  },
  {
    id: "4",
    title: "ניהול מו\"מ",
    icon: Handshake,
    color: "bg-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  },
  {
    id: "5",
    title: "חתימה",
    icon: CheckCircle,
    color: "bg-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
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
    <section className="py-20 px-4 bg-gray-50">
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
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-medium mb-6"
          >
            <Users className="w-5 h-5" />
            <span>השירותים שלנו</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            למה לבחור במשכלתנא?
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            אנחנו מציעים פתרון מקיף ומקצועי לכל שלב בתהליך המשכנתא, 
            עם טכנולוגיה מתקדמת וליווי אישי מקצועי
          </p>
        </motion.div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <TabsList className="flex justify-center gap-2 flex-wrap mb-12 bg-white border border-gray-200 p-2 rounded-2xl shadow-lg">
              {serviceSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <TabsTrigger 
                    value={step.id} 
                    className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                      activeTab === step.id 
                        ? `${step.color} text-white shadow-lg` 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                    <span className="font-medium">{step.title}</span>
                  </TabsTrigger>
                </motion.div>
              ))}
            </TabsList>
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <TabsContent value={activeTab} className="mt-8">
                <Card className="border-2 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="flex items-center gap-4 mb-6"
                        >
                          <div className={`p-4 rounded-2xl ${serviceSteps.find(s => s.id === activeTab)?.color} text-white`}>
                            {(() => {
                              const content = serviceContent[activeTab as keyof typeof serviceContent];
                              const IconComponent = content.icon;
                              return <IconComponent className="w-8 h-8" />;
                            })()}
                          </div>
                          <h3 className="text-3xl font-bold">{serviceContent[activeTab as keyof typeof serviceContent].title}</h3>
                        </motion.div>
                        
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="text-lg text-gray-600 leading-relaxed mb-6"
                        >
                          {serviceContent[activeTab as keyof typeof serviceContent].description}
                        </motion.p>
                        
                        <motion.ul
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                          className="space-y-3"
                        >
                          {serviceContent[activeTab as keyof typeof serviceContent].features.map((feature, index) => (
                            <motion.li
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                              className="flex items-center gap-3 text-gray-700"
                            >
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {feature}
                            </motion.li>
                          ))}
                        </motion.ul>
                      </div>
                      
                      <div className="space-y-6">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.6 }}
                          className="grid grid-cols-1 gap-4"
                        >
                          {Object.entries(serviceContent[activeTab as keyof typeof serviceContent].stats).map(([key, value], index) => (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                              className={`p-6 rounded-2xl border-2 ${serviceSteps.find(s => s.id === activeTab)?.bgColor} ${serviceSteps.find(s => s.id === activeTab)?.borderColor} hover:shadow-lg transition-all duration-300 hover:scale-105`}
                            >
                              <div className="text-3xl font-bold text-gray-800 mb-2">{value}</div>
                              <div className="text-sm text-gray-600 capitalize">{key}</div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        viewport={{ once: true }}
        className="mt-20"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { number: "+1,200", label: "לקוחות מרוצים", color: "text-blue-600", bgColor: "bg-blue-50" },
            { number: "98%", label: "שביעות רצון", color: "text-green-600", bgColor: "bg-green-50" },
            { number: "₪270,000", label: "חיסכון ממוצע למשפחה", color: "text-purple-600", bgColor: "bg-purple-50" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="text-center"
            >
              <Card className={`${stat.bgColor} border-2 hover:shadow-xl transition-all duration-300`}>
                <CardContent className="py-8">
                  <div className={`text-4xl font-bold ${stat.color} mb-2`}>{stat.number}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
} 