"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaBaby, FaMoneyBillWave, FaChartLine, FaHandshake, FaRocket, FaStar, FaShieldAlt, FaUsers, FaCalculator } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OPTIONS = [
  {
    key: "first",
    label: "המזכיר הראשון שלך בעולם המשכנתאות",
    icon: <FaBaby size={28} className="text-financial-primary" />,
    message: "משכנתא משלבת ידע פיננסי, אלגוריתמים חכמים ובינה מלאכותית – כדי להוביל אותך בבטחה מהתחלה ועד החתימה על המשכנתא האידיאלית שלך.",
    color: "bg-financial-gradient",
    bgColor: "bg-financial-light"
  },
  {
    key: "reduce", 
    label: "אתה שולם ביוקר, אנחנו נוציא את הדרך",
    icon: <FaMoneyBillWave size={28} className="text-financial-success" />,
    message: "אתה מחליט לאן – אנחנו יודעים איך",
    color: "bg-financial-success-gradient",
    bgColor: "bg-financial-light"
  },
  {
    key: "finish",
    label: "אתה מחליט לאן – אנחנו יודעים איך",
    icon: <FaChartLine size={28} className="text-financial-accent" />,
    message: "עם הכלים החכמים שלנו, תוכל לנווט בבטחה בעולם המשכנתאות ולקבל החלטות מושכלות שיחסכו לך זמן וכסף.",
    color: "bg-financial-accent-gradient",
    bgColor: "bg-financial-light"
  }
];

export default function MortgageIntro() {
  const [selected, setSelected] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-financial-hero overflow-hidden">
      {/* Professional Geometric Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-financial-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-financial-primary/5 to-financial-primary/10"></div>
      </div>

      <div className="container-financial relative z-10 text-center py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10"
        >
          {/* Professional Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="inline-flex items-center gap-3 bg-white shadow-lg border border-gray-200 text-financial-primary px-6 py-3 rounded-full text-sm font-semibold mb-8"
          >
            <FaShieldAlt className="animate-pulse-financial" />
            <span>הפלטפורמה המתקדמת ביותר בישראל</span>
            <FaStar className="text-yellow-500" />
          </motion.div>

          {/* Main Headline - Based on the Hebrew text from image */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-financial-gradient leading-tight">
            המזכיר הראשון שלך בעולם המשכנתאות
          </h1>
          
          {/* Subheadline */}
          <motion.div 
            className="text-2xl md:text-3xl font-bold text-financial-gray-700 mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            תרנבותית:
          </motion.div>

          <motion.p 
            className="text-xl md:text-2xl text-financial-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            משכנתא משלבת ידע פיננסי, אלגוריתמים חכמים ובינה מלאכותית – כדי להוביל אותך בבטחה מהתחלה ועד החתימה על המשכנתא האידיאלית שלך.
          </motion.p>

          <motion.p 
            className="text-lg text-financial-gray-500 mb-12 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 1.0 }}
          >
            <strong className="text-financial-primary">אתה שולם ביוקר, אנחנו נוציא את הדרך</strong><br/>
            אתה מחליט לאן – אנחנו יודעים איך
          </motion.p>

          {/* Professional Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex justify-center gap-8 mb-12 text-sm"
          >
            <div className="card-financial text-center px-6 py-4">
              <div className="flex items-center justify-center mb-2">
                <FaUsers className="text-financial-primary ml-2" />
                <div className="text-3xl font-bold text-financial-primary">+2,500</div>
              </div>
              <div className="text-financial-gray-600 font-medium">לקוחות מרוצים</div>
            </div>
            <div className="card-financial text-center px-6 py-4">
              <div className="flex items-center justify-center mb-2">
                <FaShieldAlt className="text-green-600 ml-2" />
                <div className="text-3xl font-bold text-green-600">99.8%</div>
              </div>
              <div className="text-financial-gray-600 font-medium">שביעות רצון</div>
            </div>
            <div className="card-financial text-center px-6 py-4">
              <div className="flex items-center justify-center mb-2">
                <FaCalculator className="text-purple-600 ml-2" />
                <div className="text-3xl font-bold text-purple-600">₪450K</div>
              </div>
              <div className="text-financial-gray-600 font-medium">חיסכון ממוצע</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Interactive Options */}
        <motion.div 
          className="flex flex-wrap justify-center gap-6 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          {OPTIONS.map((opt, index) => (
            <motion.div
              key={opt.key}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20, scale: isVisible ? 1 : 0.8 }}
              transition={{ duration: 0.5, delay: 1.6 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setSelected(opt.key)}
                variant={selected === opt.key ? "default" : "outline"}
                className={`text-base px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-xl border-2 font-semibold ${
                  selected === opt.key 
                    ? `${opt.color} text-white border-0 shadow-lg` 
                    : 'hover:border-blue-400 hover:bg-blue-50 bg-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  {opt.icon}
                  {opt.label}
                </span>
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* Dynamic Content Based on Selection */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto mt-8"
            >
              <div className={`card-financial ${OPTIONS.find((opt) => opt.key === selected)?.bgColor} border-2 border-gray-100 shadow-2xl`}>
                <motion.div 
                  className="flex items-center gap-4 mb-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {OPTIONS.find((opt) => opt.key === selected)?.icon}
                  <h2 className="text-3xl font-bold text-financial-gray-900">המסלול המתאים לך</h2>
                </motion.div>
                
                <motion.p 
                  className="text-financial-gray-700 leading-relaxed mb-8 text-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  {OPTIONS.find((opt) => opt.key === selected)?.message}
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className={`btn-primary text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg`}>
                        <FaRocket className="ml-2" />
                        התחל עכשיו - חינם
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-center text-financial-gray-900">הצטרף לפלטפורמה</DialogTitle>
                        <DialogDescription className="text-center text-financial-gray-600">
                          התחל את המסע שלך למשכנתא חכמה ומקצועית
                        </DialogDescription>
                      </DialogHeader>
                      <div className="form-financial space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="fullName-hero" className="text-financial-gray-700 font-semibold">שם מלא</Label>
                            <Input id="fullName-hero" placeholder="שם מלא" className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="phone-hero" className="text-financial-gray-700 font-semibold">טלפון</Label>
                            <Input id="phone-hero" type="tel" placeholder="050-1234567" className="mt-1" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="email-register-hero" className="text-financial-gray-700 font-semibold">אימייל</Label>
                          <Input id="email-register-hero" type="email" placeholder="you@example.com" className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="service-hero" className="text-financial-gray-700 font-semibold">בחר תוכנית</Label>
                          <select id="service-hero" className="w-full p-3 border-2 border-gray-200 rounded-lg mt-1 bg-white">
                            <option value="">בחר תוכנית...</option>
                            <option value="full">ייעוץ מלא עם בינה מלאכותית - ₪399</option>
                            <option value="hybrid">ייעוץ היברידי - ₪199</option>
                            <option value="basic">כלים בסיסיים - ₪99</option>
                          </select>
                        </div>
                        <Button className="btn-primary w-full text-lg py-4">
                          התחל עכשיו - ללא התחייבות
                        </Button>
                        <p className="text-xs text-center text-financial-gray-500">
                          כבר יש לך חשבון? <a href="#" className="text-financial-primary underline font-semibold">התחבר</a>
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    className="btn-secondary text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      const demoSection = document.getElementById('demo-section');
                      if (demoSection) {
                        demoSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    <FaStar className="ml-2" />
                    צפה בדמו
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Default CTA when no selection */}
        {!selected && (
          <motion.div 
            className="mt-12 flex flex-col sm:flex-row gap-6 justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 1.8 }}
          >
            <Dialog>
              <DialogTrigger asChild>
                <Button className="btn-primary text-xl px-10 py-5 rounded-xl transition-all duration-300 hover:scale-105 shadow-xl">
                  <FaRocket className="ml-2" />
                  התחל עכשיו
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-center text-financial-gray-900">הצטרף לפלטפורמה</DialogTitle>
                  <DialogDescription className="text-center text-financial-gray-600">
                    התחל את המסע שלך למשכנתא חכמה ומקצועית
                  </DialogDescription>
                </DialogHeader>
                <div className="form-financial space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName-hero-main" className="text-financial-gray-700 font-semibold">שם מלא</Label>
                      <Input id="fullName-hero-main" placeholder="שם מלא" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="phone-hero-main" className="text-financial-gray-700 font-semibold">טלפון</Label>
                      <Input id="phone-hero-main" type="tel" placeholder="050-1234567" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email-register-hero-main" className="text-financial-gray-700 font-semibold">אימייל</Label>
                    <Input id="email-register-hero-main" type="email" placeholder="you@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="service-hero-main" className="text-financial-gray-700 font-semibold">בחר תוכנית</Label>
                    <select id="service-hero-main" className="w-full p-3 border-2 border-gray-200 rounded-lg mt-1 bg-white">
                      <option value="">בחר תוכנית...</option>
                      <option value="full">ייעוץ מלא עם בינה מלאכותית - ₪399</option>
                      <option value="hybrid">ייעוץ היברידי - ₪199</option>
                      <option value="basic">כלים בסיסיים - ₪99</option>
                    </select>
                  </div>
                  <Button className="btn-primary w-full text-lg py-4">
                    התחל עכשיו - ללא התחייבות
                  </Button>
                  <p className="text-xs text-center text-financial-gray-500">
                    כבר יש לך חשבון? <a href="#" className="text-financial-primary underline font-semibold">התחבר</a>
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              className="btn-secondary text-xl px-10 py-5 rounded-xl transition-all duration-300 hover:scale-105"
              onClick={() => {
                const demoSection = document.getElementById('demo-section');
                if (demoSection) {
                  demoSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <FaStar className="ml-2" />
              צפה בדמו
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
} 