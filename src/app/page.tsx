'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.9]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-financial-gradient-subtle text-foreground overflow-hidden">
      {/* Professional Navigation */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100"
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

        {/* Features Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-financial-gradient-subtle"
        >
          <Features />
        </motion.section>

        {/* Interactive Calculator */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <InteractiveCalculator />
        </motion.section>

        {/* Demo Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          id="demo-section"
          className="section-padding bg-financial-gradient-subtle"
        >
          <Demo />
        </motion.section>

        {/* Testimonials */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <Testimonials />
        </motion.section>

        {/* Pricing */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-financial-gradient-subtle"
        >
          <Pricing />
        </motion.section>

        {/* Mortgage Calculator */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <MortgageCalculator />
        </motion.section>

        {/* Equity Planner */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-financial-gradient-subtle"
        >
          <EquityPlanner />
        </motion.section>

        {/* Map */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-white"
        >
          <Map />
        </motion.section>

        {/* Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="section-padding bg-financial-gradient-subtle"
        >
          <Timeline />
        </motion.section>

        {/* Statistics */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
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
          className="bg-financial-gray-900 text-white"
        >
          <Footer />
        </motion.section>
      </div>

      {/* Professional Floating Action Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 z-50 btn-primary p-4 rounded-full shadow-2xl animate-pulse-financial"
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