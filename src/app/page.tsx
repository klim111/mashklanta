'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';
import NavBar from '@/components/ui/navbar';
import Mashkalanta from '@/components/ui/mashkalanta';
import Statistic from '@/components/ui/statistic';
import Footer from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { journeyStages } from '@/data/platform/journey';
import { GuestStart } from '@/components/service-flow/GuestStart';
import { FreeToolsSection } from '@/components/service-flow/FreeToolsSection';
import { PricingModelStrip } from '@/components/service-flow/PricingModelStrip';
import { FULL_SERVICE_PRICE, PLATFORM_MONTHLY_PRICE } from '@/lib/service-flow';

export default function Home() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.9]);

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
        className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 md:min-h-[100svh] lg:h-screen"
      >
        {/* Logo Section - Top */}
        <div className="relative z-10 flex items-center justify-center px-5 pt-8 md:h-1/5 md:px-0 md:pt-2">
        <Mashkalanta autoPlay />
        </div>

        {/* Title and Subtitle Section */}
        <div className="relative z-10 flex flex-col items-center justify-start px-5 pt-3 text-center md:h-2/5 md:px-6 md:pt-0">
                <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mx-auto max-w-md text-base leading-relaxed text-gray-600 md:max-w-4xl md:text-xl"
          >
            פלטפורמה חדשנית המשלבת טכנולוגיה מתקדמת עם מומחיות פיננסית
            <br />
            <span className="text-blue-600 font-semibold">למציאת המשכנתא המושלמת עבורך</span>
          </motion.p>
        </div>

        {/* Animation Section - Middle (desktop overlay lives below; keep spacer on md+) */}
        <div className="relative hidden h-1/5 items-center justify-center md:flex">
          {/* Animation content will be handled by the carousel below */}
        </div>

        {/* Buttons Section - Bottom */}
        <div className="relative z-10 flex items-center justify-center px-5 pb-10 pt-8 md:min-h-[18%] md:px-6 md:pb-10 md:pt-2">
          <div className="flex w-full max-w-sm flex-col items-stretch justify-center gap-3 md:max-w-none md:flex-row md:flex-wrap md:gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full md:w-auto"
            >
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full justify-center px-6 py-4 text-base font-semibold bg-white/90 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-lg backdrop-blur-sm md:w-auto md:px-8 md:text-lg"
              >
                <Link href="/how-it-works">למד איך זה עובד</Link>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full md:w-auto"
            >
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full justify-center px-6 py-4 text-base font-semibold bg-white/90 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400 shadow-lg backdrop-blur-sm md:w-auto md:px-8 md:text-lg"
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
              className="w-full md:w-auto"
            >
              <Button
                size="lg"
                className="w-full justify-center px-6 py-4 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg md:w-auto md:px-8 md:text-lg"
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

        {/* Benefits Visualization Carousel - Background (desktop/tablet only so it never covers phone copy) */}
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex">
          
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
                <ol className="relative mx-auto grid max-w-xs grid-cols-5 gap-0.5 sm:max-w-md sm:gap-1 md:max-w-none md:gap-2">
                  {journeyStages.map((stage) => (
                    <li key={stage.id} className="flex flex-col items-center text-center">
                      <span
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black text-white shadow-lg sm:h-12 sm:w-12 sm:rounded-2xl sm:text-base md:h-14 md:w-14 md:text-lg ${stage.gradient} animate-pulse-glow`}
                      >
                        {stage.number}
                      </span>
                      <span className="mt-1.5 text-[8px] font-bold leading-tight text-gray-800 sm:mt-3 sm:text-[11px] md:text-sm">
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

      {/* Action Cards Section */}
        <motion.section
        data-section="action-cards"
        initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10 px-4 md:min-h-screen md:px-6 md:py-20"
      >
        <div className="max-w-6xl mx-auto">
          {/* הכלים החינמיים — תכנון וניתוח מקדים, לפני שבוחרים איך להתקדם */}
          <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl backdrop-blur-sm md:p-10">
            <FreeToolsSection />
          </div>

          {/* הגשר בין הכלים לבחירה */}
          <div className="my-8 flex items-center justify-center gap-4">
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-transparent" />
            <p className="text-center text-lg font-black text-slate-700 md:text-xl">
              כבר מבינים את תמונת המצב ורוצים להתקדם?
            </p>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-transparent" />
          </div>

          {/* מה תרצו לעשות? — נקודת הכניסה, גם למי שעדיין לא נרשם */}
          <div id="start" className="scroll-mt-24 rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-xl backdrop-blur-sm md:p-10">
            <GuestStart />
          </div>
        </div>
        </motion.section>

      {/* Pricing teaser */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, margin: "-80px" }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-4 py-12 text-white md:px-6 md:py-20"
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
            <h2 className="mb-4 text-2xl font-black text-white md:text-5xl">
              משלמים על מה שלקחתם — ותמיד את המחיר הנמוך
            </h2>
            <p className="mx-auto max-w-2xl text-base text-slate-100 md:text-lg">
              גישה לפלטפורמה ב-₪{PLATFORM_MONTHLY_PRICE} לחודש. ביקשתם ליווי באמצע? מה ששילמתם מקוזז, והגישה
              המלאה כלולה בכל הזמנת ליווי — לשלב אחד או לכל הדרך.
            </p>
          </div>
          <div className="mb-8 grid gap-5 md:grid-cols-3">
            <Link href="/pricing" className="group rounded-2xl border border-white/15 bg-white/5 p-5 text-center backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/10 sm:p-7 md:text-right">
              <div className="text-sm font-bold text-cyan-200">מסלול עצמאי</div>
              <div className="my-2 text-4xl font-black text-white">₪{PLATFORM_MONTHLY_PRICE}</div>
              <div className="text-sm text-slate-100">לחודש, עד לסיום התהליך — כל השלבים והכלים פתוחים</div>
            </Link>
            <Link href="/pricing#builder" className="group relative rounded-2xl border border-violet-400/50 bg-white/10 p-5 text-center backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/15 sm:p-7 md:text-right">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-0.5 text-[11px] font-black text-white">הכי נבחר</span>
              <div className="text-sm font-bold text-violet-200">ליווי משולב</div>
              <div className="my-2 text-4xl font-black text-white">לפי שלב</div>
              <div className="text-sm text-slate-100">עוזרים בשלבים שתבחרו — הגישה לפלטפורמה כלולה</div>
            </Link>
            <Link href="/pricing" className="group rounded-2xl border border-white/15 bg-white/5 p-5 text-center backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/10 sm:p-7 md:text-right">
              <div className="text-sm font-bold text-amber-200">ליווי מלא</div>
              <div className="my-2 text-4xl font-black text-white">₪{FULL_SERVICE_PRICE.toLocaleString('he-IL')}</div>
              <div className="text-sm text-slate-100">עד לחתימה הסופית, כולל גישה מלאה לפלטפורמה</div>
            </Link>
          </div>
          <PricingModelStrip compact tone="dark" className="mb-10" />
          <div className="text-center">
            <Button asChild size="lg" className="w-full bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900 sm:w-auto">
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