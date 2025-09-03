'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModeSelectionScreen } from './ModeSelectionScreen';
import { GuidedModeFlow } from './GuidedModeFlow';
import { ProModeFlow } from './ProModeFlow';
import { MortgagePassport } from './MortgagePassport';
import { CostRail } from './CostRail';
import { useMortgageApplication } from './hooks/useMortgageApplication';

export type ApplicationMode = 'guided' | 'pro' | null;

export function MortgageApplication() {
  const [mode, setMode] = useState<ApplicationMode>(null);
  const { 
    currentStep, 
    progress, 
    milestones, 
    costs, 
    userProfile,
    setCurrentStep 
  } = useMortgageApplication();

  const handleModeSelect = (selectedMode: ApplicationMode) => {
    setMode(selectedMode);
  };

  const handleReset = () => {
    setMode(null);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 text-right" dir="rtl">
      
      {/* Cost Rail - Always visible when mode is selected */}
      <AnimatePresence>
        {mode && (
          <CostRail costs={costs} />
        )}
      </AnimatePresence>

      {/* Mortgage Passport - Always visible when mode is selected */}
      <AnimatePresence>
        {mode && (
          <MortgagePassport 
            progress={progress}
            milestones={milestones}
            currentStep={currentStep}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {!mode && (
            <motion.div
              key="mode-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <ModeSelectionScreen onModeSelect={handleModeSelect} />
            </motion.div>
          )}

          {mode === 'guided' && (
            <motion.div
              key="guided-mode"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <GuidedModeFlow 
                userProfile={userProfile}
                onReset={handleReset}
              />
            </motion.div>
          )}

          {mode === 'pro' && (
            <motion.div
              key="pro-mode"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <ProModeFlow 
                userProfile={userProfile}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}