'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion';
import { ArrowRight, ArrowLeft, Home as HomeIcon, RefreshCw, Shield, TrendingUp, Users, Zap, Target, BarChart3, HeartHandshake, CheckCircle, Menu, Map, Calculator, Banknote, CreditCard, UserCheck, Activity } from 'lucide-react';
import Link from 'next/link';
import NavBar from '@/components/ui/navbar';
import Mashkalanta from '@/components/ui/mashkalanta';
import Statistic from '@/components/ui/statistic';
import Footer from '@/components/ui/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.9]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const unsubscribe = scrollY.onChange((latest) => {
      setShowHamburger(latest > 600);
    });
    return unsubscribe;
  }, [scrollY]);

  const benefits = [
    {
      icon: Shield,
      title: "פשטות ושקיפות מלאה",
      description: "תהליך ברור וקל להבנה של לקיחת וניהול המשכנתא, ללא הפתעות או עמלות נסתרות",
      gradient: "from-blue-600 to-blue-700"
    },
    {
      icon: Target,
      title: "ניווט לאורך כל השלבים",
      description: "ליווי מקצועי ומותאם אישית בכל שלב של התהליך - מהבקשה ועד לסילוק המשכנתא",
      gradient: "from-green-600 to-green-700"
    },
    {
      icon: BarChart3,
      title: "תמהיל אופטימלי מותאם",
      description: "מציאת התמהיל הטוב ביותר המתאים בדיוק לצרכים ולמצב הפיננסי שלך",
      gradient: "from-purple-600 to-purple-700"
    },
    {
      icon: TrendingUp,
      title: "חיסכון עצום בעלויות",
      description: "הפחתה משמעותית בעלויות הלוואה באמצעות אופטימיזציה חכמה ומשא ומתן יעיל",
      gradient: "from-orange-600 to-orange-700"
    },
    {
      icon: Zap,
      title: "כלים מתקדמים לתכנון",
      description: "מחשבונים חכמים, סימולציות ותחזיות לתכנון פיננסי מדויק וארוך טווח",
      gradient: "from-indigo-600 to-indigo-700"
    },
    {
      icon: HeartHandshake,
      title: "ליווי AI + איש מקצוע",
      description: "שילוב מושלם בין טכנולוגיה מתקדמת לבין ייעוץ אנושי מקצועי ואישי",
      gradient: "from-rose-600 to-rose-700"
    }
  ];

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
        <div className="h-1/5 flex items-center justify-center px-6 pb-16">
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-white/90 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-lg backdrop-blur-sm"
              >
                למד איך זה עובד
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
                בוא נתחיל
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

          {/* Slide 2: Navigation & Guidance */}
          <div className="absolute inset-0 opacity-0 animate-carousel-slide-2 flex items-center justify-center">
            <div className="max-w-4xl w-full px-8">
              <svg viewBox="0 0 800 400" className="w-full h-auto">
                {/* Navigation Path */}
                <path d="M100 200 Q200 150 300 200 T500 200 T700 200" 
                      stroke="rgba(34, 197, 94, 0.6)" strokeWidth="6" fill="none" className="animate-draw-line" />
                
                {/* Milestone Points */}
                <circle cx="100" cy="200" r="12" fill="rgba(34, 197, 94, 0.8)" className="animate-pulse-glow" />
                <circle cx="300" cy="200" r="12" fill="rgba(34, 197, 94, 0.8)" className="animate-pulse-glow" style={{animationDelay: '1s'}} />
                <circle cx="500" cy="200" r="12" fill="rgba(34, 197, 94, 0.8)" className="animate-pulse-glow" style={{animationDelay: '2s'}} />
                <circle cx="700" cy="200" r="12" fill="rgba(34, 197, 94, 0.8)" className="animate-pulse-glow" style={{animationDelay: '3s'}} />
                
                {/* Step Labels */}
                <text x="100" y="180" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="14" fontWeight="bold">התחלה</text>
                <text x="300" y="180" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="14" fontWeight="bold">ניתוח</text>
                <text x="500" y="180" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="14" fontWeight="bold">תמהיל</text>
                <text x="700" y="180" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="14" fontWeight="bold">הצלחה</text>
                
                {/* Compass/Target Icon */}
                <circle cx="400" cy="120" r="40" fill="rgba(59, 130, 246, 0.2)" stroke="rgba(59, 130, 246, 0.6)" strokeWidth="2" className="animate-pulse-glow" />
                <path d="M400 90 L410 110 L400 130 L390 110 Z" fill="rgba(34, 197, 94, 0.8)" className="animate-float-up" />
                
                {/* Title */}
                <text x="400" y="320" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" 
                      fontSize="32" fontWeight="bold">ניווט לאורך כל השלבים</text>
                <text x="400" y="350" textAnchor="middle" fill="rgba(75, 85, 99, 0.8)" 
                      fontSize="18">ליווי מקצועי מהתחלה ועד הסוף</text>
              </svg>
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
                {/* Money Savings Graph */}
                <path d="M100 300 Q200 250 300 200 Q400 150 500 100 Q600 80 700 60" 
                      stroke="rgba(34, 197, 94, 0.8)" strokeWidth="6" fill="none" className="animate-draw-line" />
                
                {/* Money Icons */}
                <text x="150" y="290" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="24" className="animate-pulse-glow">₪</text>
                <text x="300" y="190" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="28" className="animate-pulse-glow" style={{animationDelay: '1s'}}>₪</text>
                <text x="500" y="90" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="32" className="animate-pulse-glow" style={{animationDelay: '2s'}}>₪</text>
                <text x="700" y="50" textAnchor="middle" fill="rgba(34, 197, 94, 0.9)" fontSize="36" className="animate-pulse-glow" style={{animationDelay: '3s'}}>₪</text>
                
                {/* Savings Labels */}
                <text x="150" y="320" textAnchor="middle" fill="rgba(75, 85, 99, 0.7)" fontSize="14">₪50K</text>
                <text x="300" y="220" textAnchor="middle" fill="rgba(75, 85, 99, 0.7)" fontSize="14">₪150K</text>
                <text x="500" y="120" textAnchor="middle" fill="rgba(75, 85, 99, 0.7)" fontSize="14">₪300K</text>
                <text x="700" y="80" textAnchor="middle" fill="rgba(75, 85, 99, 0.7)" fontSize="14">₪500K</text>
                
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
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* New Mortgage Card */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Link href="/mortgage-planning">
                      <Card className="group relative overflow-hidden border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl z-10 cursor-pointer">
                        <CardContent className="p-8 text-center">
                          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <HomeIcon className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                            לקחת משכנתא חדשה
                          </h3>
                          <p className="text-gray-600 text-lg leading-relaxed mb-6">
                            מציאת המשכנתא המושלמת עם התמהיל הטוב ביותר והתנאים המיטביים עבורך
                          </p>
                          <div className="flex items-center justify-center text-blue-600 group-hover:text-blue-700 font-semibold">
                            <span>התחל עכשיו</span>
                            <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>

            {/* Existing Mortgage Card */}
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link href="/existing-mortgage">
                <Card className="group relative overflow-hidden border border-gray-200 hover:border-green-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl z-10">
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <RefreshCw className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors">
                      פעולות על משכנתא קיימת
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed mb-6">
                      אופטימיזציה, מיחזור, ניהול וייעוץ למשכנתא הקיימת שלך לחיסכון מקסימלי
                    </p>
                    <div className="flex items-center justify-center text-green-600 group-hover:text-green-700 font-semibold">
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

                  {/* Tools Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {/* Simulations Tool */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
                      <Link href="/simulations">
                        <Card className="h-full border border-gray-200 hover:border-indigo-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer">
                          <CardContent className="p-4 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                              <Activity className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                              סימולציות
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              כלי סימולציה מתקדמים לתכנון פיננסי
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>

                    {/* Road Map Tool */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
                      <Card className="h-full border border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Map className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            מפת הדרכים
                          </h3>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            הסבר של צעד אחר צעד ללקיחת משכנתא
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Equity Calculator Tool */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
                      <Card className="h-full border border-gray-200 hover:border-green-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Calculator className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                            מחשבון הון עצמי
                          </h3>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            חישוב ההון העצמי הנדרש למשכנתא
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Monthly Payment Calculator */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
                      <Card className="h-full border border-gray-200 hover:border-purple-300 transition-all duration-300 bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl cursor-pointer">
                        <CardContent className="p-4 text-center">
                          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Banknote className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                            חישוב החזר חודשי מקסימלי
                          </h3>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            חישוב ההחזר החודשי המקסימלי שאתה יכול לעמוד בו
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Consumer Loans Planning */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="group"
                    >
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
                    </motion.div>
                  </div>

                  {/* Advisor Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        size="lg"
                        className="text-base px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                        onClick={() => {
                          const advisorSection = document.querySelector('[data-section="advisor"]');
                          if (advisorSection) {
                            advisorSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        <UserCheck className="w-5 h-5 ml-2" />
                        תן ליועץ משכנתא לעשות עבורך את העבודה
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
        </div>
        </motion.section>

      {/* Benefits Section */}
        <motion.section
        id="benefits-section"
        initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
        className="py-20 px-6 bg-gray-50"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              למה לבחור במשכלתנא?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              הפלטפורמה המתקדמת ביותר למשכנתאות בישראל - טכנולוגיה חדשנית, מומחיות מוכחת
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <motion.div
                  key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group"
                >
                  <Card className="h-full border border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
                    <CardContent className="p-8 text-center relative">
                      <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${benefit.gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {benefit.description}
                      </p>
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
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