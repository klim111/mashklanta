"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaBaby, FaMoneyBillWave, FaChartLine, FaHandshake, FaRocket, FaStar } from "react-icons/fa";
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
    label: "קחו אותי למשכנתא הראשונה שלי",
    icon: <FaBaby size={28} className="text-blue-600" />,
    message: "צעד ראשון לדירה שלך יכול להיות פשוט, ברור, ונעים. אנחנו נהיה שם מהשלב הראשון, נסביר כל מונח, נבנה תמהיל שמתאים לך ונדאג שתקבל תנאים מצוינים.",
    color: "bg-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    key: "reduce",
    label: "לשחרר קצת את התשלום החודשי",
    icon: <FaMoneyBillWave size={28} className="text-green-600" />,
    message: "אם כל חודש מרגיש כמו מרתון – הגיע הזמן להוריד הילוך. נבנה יחד איתך תמהיל שיקנה לך אוויר לנשימה ויחסוך לך כסף.",
    color: "bg-green-600",
    bgColor: "bg-green-50"
  },
  {
    key: "finish",
    label: "לסיים כבר עם המשכנתא",
    icon: <FaChartLine size={28} className="text-red-600" />,
    message: "רוצה להוריד את העול כמה שיותר מהר? נבנה אסטרטגיה חכמה להחזר מואץ שיחסוך לך ריביות וזמן – בלי להכביד עליך כלכלית.",
    color: "bg-red-600",
    bgColor: "bg-red-50"
  },
  {
    key: "noEquity",
    label: "אין לי הון עצמי – מה עושים?",
    icon: <FaHandshake size={28} className="text-yellow-600" />,
    message: "אל דאגה. יש פתרונות. נבחן איתך אפשרויות מימון, הלוואות גישור, ואפילו פתרונות יצירתיים שיעזרו לך להתקדם גם בלי הון עצמי גבוה.",
    color: "bg-yellow-600",
    bgColor: "bg-yellow-50"
  },
];

export default function MortgageIntro() {
  const [selected, setSelected] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative text-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 50 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
        >
          <FaRocket className="animate-float" />
          <span>הפלטפורמה המתקדמת ביותר בישראל</span>
          <FaStar className="text-yellow-300" />
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
          ייעוץ משכנתאות חכם, אנושי ואמין
        </h1>
        
        <motion.p 
          className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          אנחנו כאן כדי להפוך את המסע לדירה שלך לפשוט יותר, עם ליווי אישי ומקצועי. 
          בעזרת מחשבונים חכמים, כלים מתקדמים וליווי של יועצים מנוסים – נחסוך לך זמן, כסף ודאגות.
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex justify-center gap-8 mb-12 text-sm"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">+1,200</div>
            <div className="text-gray-600">לקוחות מרוצים</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">98%</div>
            <div className="text-gray-600">שביעות רצון</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">₪270K</div>
            <div className="text-gray-600">חיסכון ממוצע</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        className="flex flex-wrap justify-center gap-4 mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      >
        {OPTIONS.map((opt, index) => (
          <motion.div
            key={opt.key}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20, scale: isVisible ? 1 : 0.8 }}
            transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setSelected(opt.key)}
              variant={selected === opt.key ? "default" : "outline"}
              className={`text-sm sm:text-base transition-all duration-300 hover:shadow-lg ${
                selected === opt.key ? `${opt.color} text-white border-0` : 'hover:border-2'
              }`}
            >
              {opt.label}
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto mt-8"
          >
            <div className={`rounded-2xl p-8 shadow-xl border-2 border-gray-100 ${OPTIONS.find((opt) => opt.key === selected)?.bgColor}`}>
              <motion.div 
                className="flex items-center gap-4 mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {OPTIONS.find((opt) => opt.key === selected)?.icon}
                <h2 className="text-2xl font-bold">המסלול שלך</h2>
              </motion.div>
              
              <motion.p 
                className="text-gray-700 leading-relaxed mb-6 text-lg"
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
              >
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className={`${OPTIONS.find((opt) => opt.key === selected)?.color} hover:shadow-lg text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105`}>
                      <FaRocket className="mr-2" />
                      התחל עכשיו - חינם
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-center">הרשמה לפלטפורמה</DialogTitle>
                      <DialogDescription className="text-center">
                        בחר את התוכנית המתאימה לך והתחל את המסע למשכנתא חכמה
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fullName-hero">שם מלא</Label>
                          <Input id="fullName-hero" placeholder="שם מלא" />
                        </div>
                        <div>
                          <Label htmlFor="phone-hero">טלפון</Label>
                          <Input id="phone-hero" type="tel" placeholder="050-1234567" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email-register-hero">אימייל</Label>
                        <Input id="email-register-hero" type="email" placeholder="you@example.com" />
                      </div>
                      <div>
                        <Label htmlFor="service-hero">בחר תוכנית</Label>
                        <select id="service-hero" className="w-full p-2 border border-gray-300 rounded-md">
                          <option value="">בחר תוכנית...</option>
                          <option value="full">ייעוץ אוטומטי מלא - ₪299</option>
                          <option value="hybrid">ייעוץ היברידי - ₪149</option>
                          <option value="basic">כלים בסיסיים - ₪99</option>
                        </select>
                      </div>
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-3">
                        התחל עכשיו - הרשמה חינם
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        כבר יש לך חשבון? <a href="#" className="text-primary underline">התחבר</a>
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selected && (
        <motion.div 
          className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 1.5 }}
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <FaRocket className="mr-2" />
                התחל עכשיו
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center">הרשמה לפלטפורמה</DialogTitle>
                <DialogDescription className="text-center">
                  בחר את התוכנית המתאימה לך והתחל את המסע למשכנתא חכמה
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName-hero-main">שם מלא</Label>
                    <Input id="fullName-hero-main" placeholder="שם מלא" />
                  </div>
                  <div>
                    <Label htmlFor="phone-hero-main">טלפון</Label>
                    <Input id="phone-hero-main" type="tel" placeholder="050-1234567" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email-register-hero-main">אימייל</Label>
                  <Input id="email-register-hero-main" type="email" placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="service-hero-main">בחר תוכנית</Label>
                  <select id="service-hero-main" className="w-full p-2 border border-gray-300 rounded-md">
                    <option value="">בחר תוכנית...</option>
                    <option value="full">ייעוץ אוטומטי מלא - ₪299</option>
                    <option value="hybrid">ייעוץ היברידי - ₪149</option>
                    <option value="basic">כלים בסיסיים - ₪99</option>
                  </select>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-3">
                  התחל עכשיו - הרשמה חינם
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  כבר יש לך חשבון? <a href="#" className="text-primary underline">התחבר</a>
                </p>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            className="text-lg px-8 py-4 rounded-xl border-2 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 hover:scale-105"
            onClick={() => {
              const demoSection = document.getElementById('demo-section');
              if (demoSection) {
                demoSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <FaStar className="mr-2" />
            צפה בדמו
          </Button>
        </motion.div>
      )}
    </section>
  );
} 