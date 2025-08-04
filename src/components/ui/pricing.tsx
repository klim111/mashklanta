"use client"

import { motion } from "framer-motion"
import { Check, Star, Zap, Users, Brain, Calculator } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"

const pricingPlans = [
  {
    name: "ייעוץ אוטומטי מלא",
    description: "המערכת תנתח את הנתונים שלך ותבנה תמהיל אופטימלי",
    price: "₪299",
    period: "חד פעמי",
    icon: Brain,
    color: "bg-blue-500",
    features: [
      "ניתוח נתונים אוטומטי",
      "בניית תמהיל מותאם אישית",
      "השוואת מסלולים",
      "המלצות AI מתקדמות",
      "ליווי עד לחתימה",
      "תמיכה טלפונית"
    ],
    popular: false
  },
  {
    name: "ייעוץ היברידי",
    description: "בנה תמהיל בעצמך וקבל ייעוץ למו״מ בלבד",
    price: "₪149",
    period: "חד פעמי",
    icon: Users,
    color: "bg-green-500",
    features: [
      "כל הכלים הבסיסיים",
      "בניית תמהיל עצמאית",
             "ייעוץ למו״מ בלבד",
      "ליווי לחתימה",
      "תמיכה טלפונית",
      "השוואת הצעות"
    ],
    popular: true
  },
  {
    name: "כלים בסיסיים",
    description: "גישה לכלים הבסיסיים ללא ייעוץ",
    price: "₪99",
    period: "ל-3 חודשים",
    icon: Calculator,
    color: "bg-purple-500",
    features: [
      "מחשבוני משכנתא",
      "בניית תמהילים",
      "השוואת מסלולים",
      "שמירת נתונים",
      "גישה לפלטפורמה",
      "תמיכה במייל"
    ],
    popular: false
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
    y: 30,
    scale: 0.9
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const
    }
  }
}

export default function Pricing() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">מודל המחירים שלנו</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            בחר את הפתרון המתאים לך - מהכלים הבסיסיים ועד לייעוץ מלא
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="relative"
            >
              {plan.popular && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10"
                >
                  <div className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    הכי פופולרי
                  </div>
                </motion.div>
              )}
              
              <Card className={`h-full ${plan.popular ? 'border-2 border-yellow-400 shadow-xl' : 'border border-gray-200'}`}>
                <CardHeader className="text-center pb-6">
                  <motion.div
                    className={`w-16 h-16 mx-auto rounded-full ${plan.color} flex items-center justify-center mb-4`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <plan.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                  <p className="text-gray-600">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>
                  
                  <ul className="space-y-3 mb-8 text-right">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: featureIndex * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                      {plan.popular ? 'התחל עכשיו' : 'בחר תוכנית'}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Card className="max-w-4xl mx-auto p-8 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                למה לבחור בנו?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <h3 className="font-bold text-lg mb-2">חיסכון משמעותי</h3>
                  <p className="text-gray-600">חסכו עד ₪270,000 בממוצע למשפחה</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">זמן מהיר</h3>
                  <p className="text-gray-600">תהליך מהיר של 30 דקות במקום שבועות</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">שקיפות מלאה</h3>
                  <p className="text-gray-600">כל המידע והחישובים גלויים לכם</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
} 