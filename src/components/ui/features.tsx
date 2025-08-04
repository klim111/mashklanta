"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calculator, Brain, PieChart, BarChart3, Users, Shield, Zap, Target, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"

const features = [
  {
    icon: Calculator,
    title: "מחשבונים חכמים",
    description: "מחשבוני משכנתא מתקדמים עם חישובים מדויקים ולוחות סילוקין מפורטים",
    color: "bg-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    details: [
      "חישוב תשלום חודשי מדויק",
      "לוחות סילוקין מפורטים",
      "ניתוח עלויות כולל",
      "השוואת מסלולים שונים"
    ]
  },
  {
    icon: Brain,
    title: "ייעוץ AI אוטומטי",
    description: "בינה מלאכותית מתקדמת שמנתחת את הנתונים שלך וממליצה על התמהיל האופטימלי",
    color: "bg-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    details: [
      "ניתוח נתונים מתקדם",
      "המלצות מותאמות אישית",
      "למידה מתמשכת",
      "תחזיות מדויקות"
    ]
  },
  {
    icon: PieChart,
    title: "בניית תמהילים",
    description: "בנה תמהיל משכנתא מותאם אישית עם מסלולים שונים וריביות שונות",
    color: "bg-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    details: [
      "תמהיל מותאם אישית",
      "מסלולים מגוונים",
      "אופטימיזציה אוטומטית",
      "ניהול סיכונים"
    ]
  },
  {
    icon: BarChart3,
    title: "השוואת מסלולים",
    description: "השווה בין מסלולי משכנתא שונים ובדוק איזה מתאים לך ביותר",
    color: "bg-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    details: [
      "השוואה מפורטת",
      "ניתוח עלויות",
      "תנאים מושווים",
      "המלצות חכמות"
    ]
  },
  {
    icon: Users,
    title: "ליווי אישי",
    description: "קבל ליווי אישי מיועצים מנוסים בכל שלב בתהליך",
    color: "bg-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    details: [
      "יועצים מנוסים",
      "ליווי צמוד",
      "תמיכה 24/7",
      "ניסיון של 15+ שנים"
    ]
  },
  {
    icon: Shield,
    title: "בטיחות מידע",
    description: "המידע שלך מוגן ומאובטח עם הצפנה מתקדמת",
    color: "bg-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    details: [
      "הצפנה מתקדמת",
      "אבטחה ברמה גבוהה",
      "גיבוי אוטומטי",
      "תאימות GDPR"
    ]
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.9
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  }
}

export default function Features() {
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null)

  return (
    <section className="py-20 px-4 bg-white">
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
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-full text-sm font-medium mb-6"
          >
            <Zap className="w-5 h-5" />
            <span>הפונקציות שלנו</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            טכנולוגיה מתקדמת בשירות המשכנתא שלך
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            פלטפורמה מתקדמת שמשלבת טכנולוגיה חדישה עם ניסיון מקצועי 
            כדי להביא לך את הפתרון הטוב ביותר למשכנתא
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05,
                y: -10,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedFeature(selectedFeature === index ? null : index)}
              className="cursor-pointer"
            >
              <Card className={`h-full hover:shadow-2xl transition-all duration-300 border-2 ${feature.borderColor} ${feature.bgColor} hover:scale-105`}>
                <CardHeader className="text-center pb-4">
                  <motion.div
                    className={`w-20 h-20 mx-auto rounded-2xl ${feature.color} flex items-center justify-center mb-6 shadow-lg`}
                    whileHover={{ 
                      rotate: 360,
                      scale: 1.1,
                      transition: { duration: 0.6 }
                    }}
                  >
                    <feature.icon className="w-10 h-10 text-white" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold mb-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  <AnimatePresence>
                    {selectedFeature === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6"
                      >
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
                          <h4 className="font-semibold text-gray-800 mb-3">פרטים נוספים:</h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {feature.details.map((detail, detailIndex) => (
                              <motion.li
                                key={detailIndex}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: detailIndex * 0.1 }}
                                className="flex items-center gap-2"
                              >
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                {detail}
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <Button
                    variant="outline"
                    className="mt-4 w-full border-2 hover:border-current transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFeature(selectedFeature === index ? null : index)
                    }}
                  >
                    {selectedFeature === index ? "הסתר פרטים" : "הצג פרטים"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Demo Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <Card className="max-w-5xl mx-auto p-8 bg-gray-50 border-2 border-gray-200 shadow-2xl">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-medium mb-6"
              >
                <Target className="w-5 h-5" />
                <span>דמו המערכת</span>
              </motion.div>
              
              <CardTitle className="text-3xl font-bold mb-4 text-gray-900">
                נסה את המערכת עכשיו
              </CardTitle>
              
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                צפה בדמו של המערכת שלנו ובדוק איך היא עובדת
              </p>
            </CardHeader>
            
            <CardContent className="text-center">
              <motion.div
                className="bg-white rounded-2xl p-8 mb-8 border-2 border-gray-200 shadow-lg"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-center space-x-4 space-x-reverse mb-6">
                  <motion.div
                    animate={{ 
                      x: [0, 20, 0],
                      scale: [1, 1.2, 1],
                      rotate: [0, 360, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-6 h-6 bg-blue-600 rounded-full"
                  />
                  <span className="text-gray-600 font-medium">טוען דמו אינטראקטיבי...</span>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-4 h-4 bg-green-500 rounded-full"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: TrendingUp, label: "ניתוח מתקדם", color: "text-blue-600" },
                    { icon: Target, label: "תוצאות מדויקות", color: "text-green-600" },
                    { icon: Zap, label: "מהירות גבוהה", color: "text-purple-600" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                      viewport={{ once: true }}
                      className="text-center"
                    >
                      <item.icon className={`w-8 h-8 mx-auto mb-2 ${item.color}`} />
                      <p className="text-sm text-gray-600">{item.label}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                viewport={{ once: true }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <Target className="mr-2" />
                    צפה בדמו
                  </Button>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="outline"
                    className="text-lg px-8 py-4 rounded-xl border-2 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 hover:scale-105"
                  >
                    <TrendingUp className="mr-2" />
                    התחל עכשיו
                  </Button>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
} 