'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import NavBar from '@/components/ui/navbar';
import Mashkalanta from '@/components/ui/mashkalanta';
import Hero from '@/components/ui/Hero';
import MortgageCalculator from '@/components/mortgagecalculator';
import Services from '@/components/ui/services';
import Map from '@/components/ui/map';
import Timeline from '@/components/ui/timeline';
import Statistic from '@/components/ui/statistic';
import EquityPlanner from '@/components/ui/equitycalc';
import Features from '@/components/ui/features';
import Pricing from '@/components/ui/pricing';
import Testimonials from '@/components/ui/testimonials';
import Footer from '@/components/ui/footer';
import Demo from '@/components/ui/demo';
import InteractiveCalculator from '@/components/ui/interactive-calculator';
import { MortgageApplication } from '@/components/mortgage-application';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.9]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-white text-foreground overflow-hidden">
      {/* Professional Navigation */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-50 bg-white/98 backdrop-blur-sm shadow-sm border-b border-gray-100"
      >
        <NavBar />
      </motion.div>
      
      {/* Mashkalanta Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: "-100px" }}
        className="bg-white"
      >
        <Mashkalanta />
      </motion.section>
      
      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Hero />
        </motion.section>

        {/* Services Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <Services />
        </motion.section>

        {/* Mortgage Application Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true, margin: "-100px" }}
          id="mortgage-application"
          className="section-padding bg-financial-light"
        >
          <div className="container-financial">
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
                  className="inline-flex items-center gap-3 bg-financial-gradient text-white px-6 py-3 rounded-full text-sm font-semibold mb-8 shadow-financial"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>בקשת משכנתא חכמה</span>
                </motion.div>
                
                <h2 className="text-4xl md:text-6xl font-black mb-6 text-financial-gradient">
                  הגישו בקשת משכנתא חכמה
                </h2>
                
                <p className="text-xl text-financial-gray-600 max-w-4xl mx-auto leading-relaxed font-medium mb-8">
                  השתמשו במערכת החכמה שלנו לבקשת משכנתא עם מצב מודרך או מקצועי, 
                  מעקב התקדמות בזמן אמת ומחשבונים מתקדמים לחיסכון מקסימלי
                </p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="flex justify-center"
                >
                  <Link href="/mortgage-application" className="inline-flex items-center gap-3 bg-financial-gradient text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-financial-lg hover:shadow-financial-xl transition-all duration-300 hover:scale-105">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    התחל בקשת משכנתא
                  </Link>
                </motion.div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl shadow-financial-xl border border-financial-gray-200 overflow-hidden"
              >
                <MortgageApplication />
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-financial-light"
        >
          <Features />
        </motion.section>

        {/* Interactive Calculator */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <InteractiveCalculator />
        </motion.section>

        {/* Demo Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          id="demo-section"
          className="section-padding bg-financial-light"
        >
          <Demo />
        </motion.section>

        {/* Testimonials */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <Testimonials />
        </motion.section>

        {/* Pricing */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-financial-light"
        >
          <Pricing />
        </motion.section>

        {/* Mortgage Calculator */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <MortgageCalculator />
        </motion.section>

        {/* Equity Planner */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-financial-light"
        >
          <EquityPlanner />
        </motion.section>

        {/* Map */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <Map />
        </motion.section>

        {/* Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-financial-light"
        >
          <Timeline />
        </motion.section>

        {/* Statistics */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <Statistic />
        </motion.section>

        {/* Footer */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3 }}
          viewport={{ once: true, margin: "-100px" }}
          className="bg-financial-primary text-white"
        >
          <Footer />
        </motion.section>
      </div>

      {/* Professional Floating Action Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 1.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 z-50 bg-financial-primary text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all"
        onClick={() => {
          const heroSection = document.querySelector('section');
          if (heroSection) {
            heroSection.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </motion.button>
    </div>
  );
} 