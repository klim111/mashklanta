'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';
import NavBar from '@/components/ui/navbar';
import Mashkalanta from '@/components/ui/mashkalanta';
import MortgageMarketDashboard from '@/components/home/MortgageMarketDashboard';
import { ConsumerCreditMarket } from '@/components/consumer-loans/ConsumerCreditMarket';
import Footer from '@/components/ui/footer';
import { Button } from '@/components/ui/button';
import { GuestStart } from '@/components/service-flow/GuestStart';
import { FreeToolsSection } from '@/components/service-flow/FreeToolsSection';
import { PricingModelStrip } from '@/components/service-flow/PricingModelStrip';
import { PlatformBillingNotes } from '@/components/service-flow/PlatformBillingNotes';
import { usePricing } from '@/components/pricing/PricingProvider';
import { HeroPromoVideo } from '@/components/home/HeroPromoVideo';
import { HeroCarousel } from '@/components/home/hero-carousel/HeroCarousel';
import { demoId } from '@/demo/demo-attr';

export default function Home() {
  const { platformPrice, advisory } = usePricing();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.9]);

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Navigation */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-slate-100"
      >
        <NavBar />
      </motion.div>
      
      {/* התוכן הראשי — היעד של "דילוג לתוכן הראשי" */}
      <main id="main">
      {/* Mashkalanta Logo Section with Benefits Carousel */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="relative overflow-hidden bg-hero-soft"
        {...demoId('home-hero')}
      >
        {/* הראש בנוי כעמודה אחת בזרימה רגילה — לוגו, טקסט, אנימציה, כפתורים — וממלא לפחות
            את גובה המסך שמתחת לסרגל הניווט. כך אין רכיב שעולה על אחר בשום יחס מסך */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-10 pt-8 md:min-h-[calc(100svh-4rem)] md:px-6 md:pb-12 md:pt-10 lg:pt-12">
        {/* הכותרת הראשית של העמוד — לקוראי מסך; הלוגו המונפש מציג אותה ויזואלית */}
        <h1 className="sr-only">משכלנתא — פלטפורמה לתכנון משכנתא</h1>
        {/* Logo */}
        <div className="flex items-center justify-center">
          <Mashkalanta autoPlay />
        </div>

        {/* Title and Subtitle Section */}
        <div className="flex flex-col items-center pt-3 text-center md:pt-6">
                <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mx-auto max-w-md text-balance text-base leading-relaxed text-slate-600 md:max-w-4xl md:text-xl"
            {...demoId('home-hero-title')}
          >
            פלטפורמה שנותנת לך ידע, כלים מקצועיים
            <br />
            <span className="text-blue-600 font-semibold">ושקיפות מלאה</span>
          </motion.p>
        </div>

        {/* קרוסלת היתרונות: במה משלה בזרימת הדף, בין הטקסט לכפתורים, כך שבשום גודל מסך
            היא לא נכנסת מתחת לטקסט או לכפתורים. בטלפון הגובה קבוע; ממסך בינוני ומעלה הוא
            נגזר מהמקום שנשאר במסך */}
        <HeroCarousel className="pointer-events-none relative my-4 h-[19rem] w-full max-w-3xl md:h-auto md:min-h-[220px] md:flex-1 lg:min-h-[240px] xl:max-h-[460px]" />

        {/* מתחת לאנימציה: ההדגמה הקצרה של הפלטפורמה — סרטון שנפתח בחלון */}
        <div className="flex w-full items-center justify-center pt-4 md:pt-0">
          <HeroPromoVideo className="w-full max-w-sm md:w-auto md:max-w-none" />
        </div>

        {/* Buttons Section - Bottom */}
        <div className="flex w-full items-center justify-center pt-6 md:pt-5">
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
                className="w-full justify-center px-6 py-4 text-cta font-semibold bg-white/90 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-lg backdrop-blur-sm md:w-auto md:px-8"
              >
                <Link href="/how-it-works">למדו איך זה עובד</Link>
              </Button>
            </motion.div>

            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full md:w-auto"
            >
              <Button
                size="lg"
                className="w-full justify-center px-6 py-4 text-cta font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg md:w-auto md:px-8"
                onClick={() => {
                  const actionCardsSection = document.querySelector('[data-section="action-cards"]');
                  if (actionCardsSection) {
                    actionCardsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                התחילו עכשיו
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </motion.div>
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
        className="relative overflow-hidden bg-hero-soft py-10 px-4 md:min-h-screen md:px-6 md:py-20"
      >
        <div className="max-w-6xl mx-auto">
          {/* הכלים החינמיים — תכנון וניתוח מקדים, לפני שבוחרים איך להתקדם */}
          <div id="free-tools" className="scroll-mt-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm sm:p-6 md:p-10" {...demoId('home-free-tools')}>
            <FreeToolsSection />
          </div>

          {/* מה תרצו לעשות? — נקודת הכניסה, גם למי שעדיין לא נרשם */}
          <div id="start" className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur-sm md:p-10" {...demoId('home-start')}>
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
        className="relative overflow-hidden bg-brand-dark px-4 py-12 text-white md:px-6 md:py-20"
        {...demoId('home-pricing')}
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
            <h2 className="mb-4 text-title font-black text-white">
              משלמים על מה שלקחתם — ותמיד מתחת לממוצע בשוק
            </h2>
            <p className="mx-auto max-w-2xl text-base text-slate-100 md:text-lg">
              גישה לפלטפורמה ב-₪{platformPrice} לחודש לתהליך משכנתא. ביקשתם ליווי באמצע? מה ששילמתם מקוזז, והגישה
              המלאה כלולה בכל הזמנת ליווי — לשלב אחד או לכל שלבי התכנון.
            </p>
          </div>
          <div className="mx-auto mb-8 grid max-w-4xl gap-5 md:grid-cols-2">
            <Link href="/pricing" className="group relative rounded-2xl border border-violet-400/50 bg-white/10 p-5 text-center backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/15 sm:p-7 md:text-right">
              <div className="text-sm font-bold text-cyan-200">עצמאי / היברידי</div>
              <div className="my-2 text-4xl font-black text-white">₪{platformPrice}</div>
              <div className="text-sm text-slate-100">
                לחודש לתהליך משכנתא, גישה מלאה לכל הכלים. מתחילים לבד, ובכל שלב שצריך עזרה מעבירים ליועץ משכלנתא
              </div>
            </Link>
            <Link href="/pricing#advisory" className="group rounded-2xl border border-white/15 bg-white/5 p-5 text-center backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/10 sm:p-7 md:text-right">
              <div className="text-sm font-bold text-amber-200">{advisory.title}</div>
              <div className="my-2 text-subtitle font-black leading-snug text-white sm:my-3.5">{advisory.priceLabel}</div>
              <div className="text-sm text-slate-100">
                {advisory.tagline}. {advisory.cheaper}, ומה ששילמתם על הפלטפורמה מקוזז.
              </div>
            </Link>
          </div>
          <PlatformBillingNotes tone="dark" className="mx-auto mb-8 max-w-4xl" />
          <PricingModelStrip compact tone="dark" className="mb-10" />
          <div className="text-center">
            <Button asChild size="lg" className="w-full bg-white px-8 text-base font-bold text-indigo-900 shadow-xl hover:bg-blue-50 hover:text-indigo-900 sm:w-auto">
              <Link href="/pricing">למודל התמחור המלא</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* שוק המשכנתאות — נתוני בנק ישראל */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
        className="bg-white"
        >
          <MortgageMarketDashboard />
        </motion.section>

      {/* שוק ההלוואות הצרכניות — נתוני בנק ישראל, אותו חלק שבכלי ההלוואות */}
      <ConsumerCreditMarket />

      </main>

        {/* Footer */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true, margin: "-100px" }}
        className="bg-slate-900 text-white"
        >
          <Footer />
        </motion.section>
    </div>
  );
} 