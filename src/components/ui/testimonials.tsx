"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Quote, Heart, TrendingUp, Users, Award } from "lucide-react"
import { Card, CardContent, CardHeader } from "./card"
import { Button } from "./button"

const testimonials = [
  {
    name: "דוד כהן",
    role: "משפחה עם 3 ילדים",
    content: "חסכנו 180,000 שקל על המשכנתא! המערכת עזרה לנו למצוא את התמהיל המושלם והתהליך היה פשוט ומהיר. היועצים היו מקצועיים מאוד.",
    rating: 5,
    image: "👨‍👩‍👧‍👦",
    savings: "₪180K",
    time: "2 שבועות",
    color: "bg-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    name: "שרה לוי",
    role: "רוכשת דירה ראשונה",
    content: "לא ידעתי איך להתחיל עם המשכנתא. המערכת הסבירה לי הכל בצורה פשוטה ועכשיו יש לי דירה! התהליך היה מהיר ופשוט.",
    rating: 5,
    image: "🏠",
    savings: "₪120K",
    time: "3 שבועות",
    color: "bg-green-600",
    bgColor: "bg-green-50"
  },
  {
    name: "יוסי גולדברג",
    role: "יזם נדל״ן",
    content: "השתמשתי במערכת לכמה פרויקטים. החיסכון המצטבר הוא מעל 500,000 שקל. מומלץ בחום! המערכת חכמה מאוד.",
    rating: 5,
    image: "💼",
    savings: "₪500K",
    time: "6 חודשים",
    color: "bg-purple-600",
    bgColor: "bg-purple-50"
  },
  {
    name: "מיכל רוזן",
    role: "משפחה צעירה",
    content: "התהליך היה מהיר ופשוט. תוך 30 דקות היה לנו תמהיל מושלם. חוסכים 2,500 שקל בחודש! היועצים היו נהדרים.",
    rating: 5,
    image: "👫",
    savings: "₪2.5K/חודש",
    time: "1 שבוע",
    color: "bg-orange-600",
    bgColor: "bg-orange-50"
  },
  {
    name: "אבי שמואלי",
    role: "עובד הייטק",
    content: "המערכת חכמה מאוד. היא מצאה לנו מסלולים שלא ידענו עליהם קיימים. חיסכון של 200,000 שקל! התהליך היה מקצועי.",
    rating: 5,
    image: "💻",
    savings: "₪200K",
    time: "4 שבועות",
    color: "bg-red-600",
    bgColor: "bg-red-50"
  },
  {
    name: "רחל כהן",
    role: "גמלאית",
    content: "חששתי מהתהליך אבל המערכת הסבירה הכל בצורה פשוטה. עכשיו יש לי משכנתא מצוינת! היועצים היו סבלניים מאוד.",
    rating: 5,
    image: "👵",
    savings: "₪80K",
    time: "2 שבועות",
    color: "bg-indigo-600",
    bgColor: "bg-indigo-50"
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

export default function Testimonials() {
  const [selectedTestimonial, setSelectedTestimonial] = useState<number | null>(null)

  return (
    <section className="py-20 px-4 bg-slate-50">
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
            className="inline-flex items-center gap-2 bg-pink-600 text-white px-6 py-3 rounded-full text-sm font-medium mb-6"
          >
            <Heart className="w-5 h-5" />
            <span>המלצות לקוחות</span>
          </motion.div>
          
          <h2 className="text-title font-bold mb-6 text-slate-900">
            מה הלקוחות שלנו אומרים
          </h2>
          
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            הצטרפו ל-1,200+ משפחות שכבר חסכו מאות אלפי שקלים 
            וקיבלו את המשכנתא המושלמת עבורן
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05,
                y: -10,
                transition: { duration: 0.3 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTestimonial(selectedTestimonial === index ? null : index)}
              className="cursor-pointer"
            >
              <Card className={`h-full hover:shadow-2xl transition-all duration-300 border-2 ${testimonial.bgColor} hover:scale-105`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <motion.div 
                      className="text-4xl"
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {testimonial.image}
                    </motion.div>
                    <div className="flex">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                        >
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <motion.div
                    className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Quote className="w-6 h-6 text-slate-400" />
                  </motion.div>
                </CardHeader>
                
                <CardContent className="text-right">
                  <p className="text-slate-700 leading-relaxed mb-6 text-lg">
                    "{testimonial.content}"
                  </p>
                  
                  <AnimatePresence>
                    {selectedTestimonial === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 space-y-3"
                      >
                        <div className={`p-4 rounded-xl ${testimonial.color} text-white`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-2xl font-bold">{testimonial.savings}</div>
                              <div className="text-sm opacity-90">חיסכון</div>
                            </div>
                            <div>
                              <div className="text-lg font-semibold">{testimonial.time}</div>
                              <div className="text-sm opacity-90">זמן תהליך</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="mt-6">
                    <p className="font-bold text-slate-900 text-lg">{testimonial.name}</p>
                    <p className="text-slate-600">{testimonial.role}</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="mt-4 w-full border-2 hover:border-current transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTestimonial(selectedTestimonial === index ? null : index)
                    }}
                  >
                    {selectedTestimonial === index ? "הסתר פרטים" : "הצג פרטים"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <Card className="max-w-6xl mx-auto p-8 bg-white border-2 border-slate-200 shadow-2xl">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-medium mb-6"
              >
                <Award className="w-5 h-5" />
                <span>המספרים מדברים בעד עצמם</span>
              </motion.div>
              
              <h3 className="text-subtitle font-bold mb-6 text-slate-900">
                התוצאות שלנו
              </h3>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { 
                    icon: Users, 
                    number: "1,200+", 
                    label: "לקוחות מרוצים", 
                    color: "text-blue-600",
                    bgColor: "bg-blue-50",
                    borderColor: "border-blue-200"
                  },
                  { 
                    icon: TrendingUp, 
                    number: "₪270M", 
                    label: "חיסכון מצטבר", 
                    color: "text-green-600",
                    bgColor: "bg-green-50",
                    borderColor: "border-green-200"
                  },
                  { 
                    icon: Heart, 
                    number: "98%", 
                    label: "שביעות רצון", 
                    color: "text-purple-600",
                    bgColor: "bg-purple-50",
                    borderColor: "border-purple-200"
                  },
                  { 
                    icon: Award, 
                    number: "30 דקות", 
                    label: "זמן ממוצע לתהליך", 
                    color: "text-orange-600",
                    bgColor: "bg-orange-50",
                    borderColor: "border-orange-200"
                  }
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
                    <Card className={`${stat.bgColor} border-2 ${stat.borderColor} hover:shadow-xl transition-all duration-300`}>
                      <CardContent className="py-6">
                        <motion.div
                          className={`w-16 h-16 mx-auto rounded-2xl ${stat.color.replace('text-', 'bg-')} flex items-center justify-center mb-4`}
                          whileHover={{ 
                            rotate: 360,
                            scale: 1.1,
                            transition: { duration: 0.6 }
                          }}
                        >
                          <stat.icon className="w-8 h-8 text-white" />
                        </motion.div>
                        <div className={`text-3xl font-bold ${stat.color} mb-2`}>{stat.number}</div>
                        <div className="text-slate-600 font-medium">{stat.label}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
} 