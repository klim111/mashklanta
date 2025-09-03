'use client';

import { useState } from 'react';
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

  console.log('MortgageApplication render - current mode:', mode);

  const handleModeSelect = (selectedMode: ApplicationMode) => {
    console.log('handleModeSelect called with:', selectedMode);
    console.log('Current mode before update:', mode);
    setMode(selectedMode);
    console.log('Mode state updated to:', selectedMode);
  };

  const handleReset = () => {
    setMode(null);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 text-right" dir="rtl">
      {/* Debug Info */}
      <div className="fixed top-4 left-4 bg-white p-2 rounded shadow z-50 text-sm">
        Debug: Mode = {mode || 'null'}
      </div>
      
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
        {/* Simplified rendering for debugging */}
        {!mode && (
          <div>
            <ModeSelectionScreen onModeSelect={handleModeSelect} />
          </div>
        )}

        {mode === 'guided' && (
          <div>
            <GuidedModeFlow 
              userProfile={userProfile}
              onReset={handleReset}
            />
          </div>
        )}

        {mode === 'pro' && (
          <div>
            <ProModeFlow 
              userProfile={userProfile}
              onReset={handleReset}
            />
          </div>
        )}
      </div>
    </div>
  );
}