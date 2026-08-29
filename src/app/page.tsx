'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowLeft, RefreshCw, Menu, Calculator, Banknote, CreditCard, Tag, Layers, GraduationCap, PiggyBank } from 'lucide-react';
import Link from 'next/link';
import NavBar from '@/components/ui/navbar';
import Mashkalanta from '@/components/ui/mashkalanta';
import Statistic from '@/components/ui/statistic';
import Footer from '@/components/ui/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { journeyStages } from '@/data/platform/journey';

export default function Home() {
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.9]);

  useEffect(() => {
    const unsubscribe = scrollY.onChange((latest) => {
      setShowHamburger(latest > 600);
    });
    return unsubscribe;
  }, [scrollY]);

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Navigation */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100"
      >
        <NavBar />
      </motion.div>
      
      {/* Mashkalanta Logo Section with Benefits Carousel */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="relative overflow-hidden h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50"
      >
        {/* Logo Section - Top */}
        <div className="h-1/5 flex items-center justify-center pt-2">
        <Mashkalanta />
        </div>

        {/* Title and Subtitle Section */}
        <div className="h-2/5 flex flex-col items-center justify-start px-6 pt-0">
                <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed text-center"
          >
            פלטפורמה חדשנית המשלבת טכנולוגיה מתקדמת עם מומחיות פיננסית
            <br />
            <span className="text-blue-600 font-semibold">למציאת המשכנתא המושלמת עבורך</span>
          </motion.p>
        </div>

        {/* Animation Section - Middle */}
        <div className="h-1/5 flex items-center justify-center relative">
          {/* Animation content will be handled by the carousel below */}
        </div>

        {/* Buttons Section - Bottom */}
        <div className="flex min-h-[18%] items-center justify-center px-6 pb-10 pt-2">
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-white/90 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-lg backdrop-blur-sm"
              >
                <Link href="/how-it-works">למד איך זה עובד</Link>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-white/90 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400 shadow-lg backdrop-blur-sm"
              >
                <Link href="/pricing">
                  <Tag className="w-5 h-5 ml-2" />
                  תמחור
                </Link>
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                onClick={() => {
                  const actionCardsSection = document.querySelector('[data-section="action-cards"]');
                  if (actionCardsSection) {
                    actionCardsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                התחל עכשיו
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Benefits Visualization Carousel - Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          
          {/* Slide 1: Transparency & Simplicity */}
          <div className="absolute inset-0 opacity-0 animate-carousel-slide-1 flex items-center justify-center">
            <div className="max-w-4xl w-full px-8">
              <svg viewBox="0 0 800 400" className="w-full h-auto">
                {/* Shield Icon */}
                <path d="M400 50 L350 80 L350 200 Q350 250 400 280 Q450 250 450 200 L450 80 Z" 
                      fill="rgba(59, 130, 246, 0.2)" stroke="rgba(59, 130, 246, 0.6)" strokeWidth="3" className="animate-pulse-glow" />
                
                {/* Checkmarks inside shield */}
                <path d="M370 150 L385 165 L420 130" stroke="rgba(34, 197, 94, 0.8)" strokeWidth="4" fill="none" className="animate-draw-line" />
                <path d="M370 180 L385 195 L420 160" stroke="rgba(34, 197, 94, 0.8)" strokeWidth="4" fill="none" className="animate-draw-line" style={{animationDelay: '0.5s'}} />
                <path d="M370 210 L385 225 L420 190" stroke="rgba(34, 197, 94, 0.8)" strokeWidth="4" fill="none" className="animate-draw-line" style={{animationDelay: '1s'}} />
                
                {/* Floating Elements */}
                <circle cx="300" cy="120" r="15" fill="rgba(59, 130, 246, 0.3)" className="animate-float-up" />
                <rect x="480" y="140" width="30" height="20" rx="5" fill="rgba(99, 102, 241, 0.3)" className="animate-float-up" style={{animationDelay: '0.7s'}} />
                <polygon points="520,200 540,220 520,240" fill="rgba(139, 92, 246, 0.3)" className="animate-float-up" style={{animationDelay: '1.4s'}} />
                
                {/* Title */}
                <text x="400" y="350" textAnchor="middle" fill="rgba(59, 130, 246, 0.9)" 
                      fontSize="32" fontWeight="bold">פשטות ושקיפות מלאה</text>
                <text x="400" y="380" textAnchor="middle" fill="rgba(75, 85, 99, 0.8)" 
                      fontSize="18">תהליך ברור ללא הפתעות</text>
              </svg>
            </div>
          </div>

          {/* Slide 2: Navigation & Guidance — חמשת שלבי המשכנתא */}
          <div className="absolute inset-0 opacity-0 animate-carousel-slide-2 flex items-center justify-center">
            <div className="max-w-4xl w-full px-8" dir="rtl">
              <div className="relative mb-10">
                <div className="absolute top-7 right-[6%] left-[6%] hidden h-1 rounded-full bg-gray-200 md:block" />
                <div className="absolute top-7 right-[6%] left-[6%] hidden h-1 overflow-hidden rounded-full md:block">
                  <div className="h-full w-full bg-gradient-to-l from-blue-500 via-violet-500 to-rose-500 animate-draw-line" />
                </div>
                <ol className="relative grid grid-cols-5 gap-1 md:gap-2">
                  {journeyStages.map((stage) => (
                    <li key={stage.id} className="flex flex-col items-center text-center">
                      <span
                        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-black text-white shadow-lg ${stage.gradient} animate-pulse-glow`}
                      >
                        {stage.number}
                      </span>
                      <span className="mt-3 text-[11px] font-bold leading-snug text-gray-800 md:text-sm">
                        {stage.shortTitle}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-center text-2xl font-black text-emerald-600 md:text-3xl">
                ניווט לאורך כל השלבים
              </p>
              <p className="mt-1 text-center text-base text-gray-600 md:text-lg">
                ליווי מקצועי מהתחלה ועד הסוף
              </p>
            </div>
          </div>

          {/* Slide 3: Optimal Mix */}
          <div className="absolute inset-0 opacity-0 animate-carousel-slide-3 flex items-center justify-center">
            <div className="max-w-4xl w-full px-8">
              <svg viewBox="0 0 800 400" className="w-full h-auto">
                {/* Multiple Charts Representing Mix */}
                <rect x="150" y="180" width="100" height="120" rx="10" fill="rgba(168, 85, 247, 0.3)" className="animate-float-up" />
                <rect x="280" y="160" width="100" height="140" rx="10" fill="rgba(139, 92, 246, 0.4)" className="animate-float-up" style={{animationDelay: '0.5s'}} />
                <rect x="410" y="140" width="100" height="160" rx="10" fill="rgba(124, 58, 237, 0.5)" className="animate-float-up" style={{animationDelay: '1s'}} />
                <rect x="540" y="170" width="100" height="130" rx="10" fill="rgba(109, 40, 217, 0.4)" className="animate-float-up" style={{animationDelay: '1.5s'}} />
                
                {/* Connecting Lines */}
                <path d="M200 150 Q300 100 400 120 Q500 100 600 150" 
                      stroke="rgba(34, 197, 94, 0.6)" strokeWidth="3" fill="none" className="animate-draw-line" />
                
                {/* Percentage Labels */}
                <text x="200" y="170" textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="16" fontWeight="bold">25%</text>
                <text x="330" y="150" textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="16" fontWeight="bold">35%</text>
                <text x="460" y="130" textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="16" fontWeight="bold">30%</text>
                <text x="590" y="160" textAnchor="middle" fill="rgba(255, 255, 255, 0.9)" fontSize="16" fontWeight="bold">10%</text>
                
                {/* Title */}
                <text x="400" y="350" textAnchor="middle" fill="rgba(168, 85, 247, 0.9)" 
                      fontSize="32" fontWeight="bold">תמהיל אופטימלי מותאם</text>
                <text x="400" y="380" textAnchor="middle" fill="rgba(75, 85, 99, 0.8)" 
                      fontSize="18">התאמה מושלמת לצרכים שלך</text>
              </svg>
            </div>
          </div>

          {/* Slide 4: Cost Savings */}
          <div className="absolute inset-0 opacity-0 animate-carousel-slide-4 flex items-center justify-center">
            <div className="max-w-4xl w-full px-8">
              <svg viewBox="0 0 800 400" className="w-full h-auto">
                {/* Cost / remaining-debt graph — descends over time */}
                <path d="M100 70 Q200 110 300 160 Q400 220 500 260 Q600 290 700 315"
                      stroke="rgba(34, 197, 94, 0.8)" strokeWidth="6" fill="none" className="animate-draw-line" />

                <text x="150" y="60" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="24" className="animate-pulse-glow">₪</text>
                <text x="300" y="145" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="28" className="animate-pulse-glow" style={{animationDelay: '1s'}}>₪</text>
                <text x="500" y="245" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="32" className="animate-pulse-glow" style={{animationDelay: '2s'}}>₪</text>
                <text x="700" y="300" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="36" className="animate-pulse-glow" style={{animationDelay: '3s'}}>₪</text>

                <text x="150" y="95" textAnchor="middle" fill="rgba(75, 85, 99, 0.7)" fontSize="14">₪500K</text>
                <text x="300" y="185" textAnchor="middle" fill="rgba(75, 85, 99, 0.7)" fontSize="14">₪300K</text>
                <text x="500" y="285" textAnchor="middle" fill="rgba(75, 85, 99, 0.7)" fontSize="14">₪150K</text>
                <text x="700" y="345" textAnchor="middle" fill="rgba(75, 85, 99, 0.7)" fontSize="14">₪50K</text>
                
                {/* Title */}
                <text x="400" y="350" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" 
                      fontSize="32" fontWeight="bold">חיסכון עצום בעלויות</text>
                <text x="400" y="380" textAnchor="middle" fill="rgba(75, 85, 99, 0.8)" 
                      fontSize="18">עד חצי מיליון שקל חיסכון</text>
              </svg>
            </div>
          </div>
        </div>
      </motion.section>
      
      {/* Floating Hamburger Menu Button - Only visible after scrolling past first section */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: showHamburger ? 1 : 0, x: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-6 right-6 z-50"
      >
        <Button
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm border-gray-300 hover:bg-white hover:border-gray-400 shadow-lg"
          onClick={() => setIsNavbarOpen(!isNavbarOpen)}
        >
          {isNavbarOpen ? (
            <span className="text-lg font-bold">✕</span>
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </motion.div>

      {/* Mobile Navbar Overlay */}
      {isNavbarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsNavbarOpen(false)}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900">תפריט ניווט</h2>
              </div>
              
              <nav className="space-y-4">
                <Link href="/" className="block py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                  בית
                </Link>
                <Link href="/mortgage-application" className="block py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                  משכנתא חדשה
                </Link>
                <Link href="/mortgage-advisor" className="block py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                  ייעוץ משכנתא
                </Link>
                <Link href="/consumer-loans" className="block py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                  הלוואות צרכניות
                </Link>
                <Link href="/dashboard" className="block py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                  לוח בקרה
                </Link>
                <Link href="/auth/login" className="block py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                  התחברות
                </Link>
                <Link href="/auth/register" className="block py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
                  הרשמה
                </Link>
              </nav>
            </div>
          </motion.div>
        </motion.div>
      )}


      {/* Action Cards Section */}
        <motion.section
        data-section="action-cards"
        initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
        className="relative min-h-screen py-20 px-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Affordability */}
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link href="/mortgage-planning?flow=affordability">
                <Card className="group relative overflow-hidden border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl z-10 cursor-pointer h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col justify-between">
                    <div>
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <Calculator className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                        מה אני יכול להרשות לעצמי
                      </h3>
                      <p className="text-gray-600 text-lg leading-relaxed mb-6">
                        חישוב ערך הנכס המקסימלי לפי נתוני ההכנסה והמשך תכנון המשכנתא
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700 font-semibold">
                      <span>התחל עכשיו</span>
                      <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Existing property mortgage */}
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link href="/mortgage-planning?flow=existing">
                <Card className="group relative overflow-hidden border border-gray-200 hover:border-green-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl z-10 cursor-pointer h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col justify-between">
                    <div>
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <Banknote className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors">
                        משכנתא לנכס קיים
                      </h3>
                      <p className="text-gray-600 text-lg leading-relaxed mb-6">
                        יודעים את מחיר הנכס? נלווה אתכם צעד אחר צעד עד המשכנתא המשתלמת ביותר
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-green-600 group-hover:text-green-700 font-semibold">
                      <span>התחל עכשיו</span>
                      <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Refinance */}
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link href="/mortgage-refinance">
                <Card className="group relative overflow-hidden border border-gray-200 hover:border-purple-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl z-10 cursor-pointer h-full">
                  <CardContent className="p-8 text-center h-full flex flex-col justify-between">
                    <div>
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <RefreshCw className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                        מיחזור משכנתא
                      </h3>
                      <p className="text-gray-600 text-lg leading-relaxed mb-6">
                        שפר את תנאי המשכנתא הקיימת שלך — הקטנת תשלום חודשי או קיצור תקופה
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-purple-600 group-hover:text-purple-700 font-semibold">
                      <span>התחל עכשיו</span>
                      <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </div>
          
                {/* Tools Section */}
                <div className="max-w-6xl mx-auto mt-8 relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-6"
                  >
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                      הכלים של משכלנתא
                    </h2>
                    <p className="text-base text-gray-600 max-w-2xl mx-auto">
                      כלים מתקדמים שיעזרו לך לקבל החלטות מושכלות ולנהל את המשכנתא שלך בצורה הטובה ביותר
                    </p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
                      <Link href="/mortgage-advisor">
                        <Card className="h-full border border-gray-200 hover:border-indigo-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer">
                          <CardContent className="p-4 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                              <Layers className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                              בניית תמהיל
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              בניית תמהיל משכנתא עם תחזיות ריבית ואינפלציה
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
                      <Link href="/equity-planning">
                        <Card className="h-full border border-gray-200 hover:border-green-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer">
                          <CardContent className="p-4 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                              <PiggyBank className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                              מחשבון הון עצמי
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              חישוב ההון העצמי הנדרש למשכנתא
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
                      <Link href="/consumer-loans">
                        <Card className="h-full border border-gray-200 hover:border-orange-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer">
                          <CardContent className="p-4 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                              <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                              תכנון וניהול הלוואות צרכניות
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              כלים לניהול הלוואות צרכניות קיימות
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
                      <Link href="/learn">
                        <Card className="h-full border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer">
                          <CardContent className="p-4 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                              <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                              מרכז הלמידה
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              מסלולי ריבית, תמהיל ומסע המשכנתא
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  </div>
                </div>
        </div>
        </motion.section>

      {/* Pricing teaser */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, margin: "-80px" }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 py-20 px-6 text-white"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 right-[12%] h-72 w-72 rounded-full bg-violet-500/20 blur-3xl animate-blob" />
          <div className="absolute -bottom-20 left-[10%] h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-blob [animation-delay:3s]" />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              <Tag className="h-4 w-4" />
              מודל התמחור
            </div>
            <h2 className="mb-4 text-3xl font-black text-white md:text-5xl">
              משלמים על שלב, לא על חבילה
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-100">
              כל אחד מחמשת שלבי המשכנתא מתומחר בנפרד. עשיתם לבד — לא שילמתם. רוצים יועץ על הכל — מקבלים מחיר חבילה.
            </p>
          </div>
          <div className="mb-10 grid gap-5 md:grid-cols-3">
            <Link href="/pricing" className="group rounded-2xl border border-white/15 bg-white/5 p-7 backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/10">
              <div className="text-sm font-bold text-cyan-200">עצמאי</div>
              <div className="my-2 text-4xl font-black text-white">₪120</div>
              <div className="text-sm text-slate-100">לחודש, עד קבלת המשכנתא — כל הכלים פתוחים</div>
            </Link>
            <Link href="/pricing#builder" className="group relative rounded-2xl border border-violet-400/50 bg-white/10 p-7 backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/15">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-0.5 text-[11px] font-black text-white">הכי נבחר</span>
              <div className="text-sm font-bold text-violet-200">היברידי</div>
              <div className="my-2 text-4xl font-black text-white">לפי שלב</div>
              <div className="text-sm text-slate-100">אתם עושים מה שאתם יודעים, היועץ נכנס בדיוק היכן שצריך</div>
            </Link>
            <Link href="/pricing" className="group rounded-2xl border border-white/15 bg-white/5 p-7 backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/10">
              <div className="text-sm font-bold text-amber-200">ליווי מלא</div>
              <div className="my-2 text-4xl font-black text-white">₪6,000</div>
              <div className="text-sm text-slate-100">חמשת השלבים מקצה לקצה, כולל גישה לפלטפורמה</div>
            </Link>
          </div>
          <div className="text-center">
            <Button asChild size="lg" className="bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900">
              <Link href="/pricing">למודל התמחור המלא ולמחשבון החבילה</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Statistics Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
        className="bg-white"
        >
          <Statistic />
        </motion.section>

        {/* Footer */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true, margin: "-100px" }}
        className="bg-gray-900 text-white"
        >
          <Footer />
        </motion.section>
    </div>
  );
} 