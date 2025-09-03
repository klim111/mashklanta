'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModeSelector } from '@/components/mortgage-advisor/ModeSelector';
import { GuidedMode } from '@/components/mortgage-advisor/GuidedMode';
import { ProMode } from '@/components/mortgage-advisor/ProMode';
import { CostRail } from '@/components/mortgage-advisor/CostRail';
import { MortgagePassport } from '@/components/mortgage-advisor/MortgagePassport';
import { SmartHints } from '@/components/mortgage-advisor/SmartHints';

export type AdvisorMode = 'guided' | 'pro' | null;

export interface MortgageState {
  mode: AdvisorMode;
  currentStep: number;
  personalInfo: {
    ownCapital: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    age: number;
    familyStatus: string;
  };
  preferences: {
    stability: number;
    flexibility: number;
    cost: number;
  };
  propertyInfo: {
    price: number;
    location: string;
    propertyType: string;
  };
  mortgageStructure: {
    totalAmount: number;
    primeRate: number;
    fixedRate: number;
    indexLinked: number;
  };
  costs: {
    fixed: number;
    variable: number;
    total: number;
  };
  milestones: {
    characterization: boolean;
    structureBuilding: boolean;
    preliminaryApproval: boolean;
    bankNegotiation: boolean;
  };
}

const initialState: MortgageState = {
  mode: null,
  currentStep: 0,
  personalInfo: {
    ownCapital: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    age: 0,
    familyStatus: '',
  },
  preferences: {
    stability: 3,
    flexibility: 3,
    cost: 3,
  },
  propertyInfo: {
    price: 0,
    location: '',
    propertyType: '',
  },
  mortgageStructure: {
    totalAmount: 0,
    primeRate: 0,
    fixedRate: 0,
    indexLinked: 0,
  },
  costs: {
    fixed: 0,
    variable: 0,
    total: 0,
  },
  milestones: {
    characterization: false,
    structureBuilding: false,
    preliminaryApproval: false,
    bankNegotiation: false,
  },
};

export default function MortgageAdvisorPage() {
  const [mortgageState, setMortgageState] = useState<MortgageState>(initialState);
  const [showHints, setShowHints] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mortgage-advisor-state');
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        setMortgageState(parsedState);
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    if (mortgageState.mode) {
      localStorage.setItem('mortgage-advisor-state', JSON.stringify(mortgageState));
    }
  }, [mortgageState]);

  const updateMortgageState = (updates: Partial<MortgageState>) => {
    setMortgageState(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const addHint = (hintId: string) => {
    setShowHints(prev => [...prev, hintId]);
  };

  const removeHint = (hintId: string) => {
    setShowHints(prev => prev.filter(id => id !== hintId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-slate-50 to-blue-50/30 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)]" />
      
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {!mortgageState.mode ? (
            <motion.div
              key="mode-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ModeSelector
                onModeSelect={(mode) => updateMortgageState({ mode })}
              />
            </motion.div>
          ) : (
            <motion.div
              key="advisor-interface"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex"
            >
              {/* Main Content */}
              <div className="flex-1 relative">
                {mortgageState.mode === 'guided' ? (
                  <GuidedMode
                    state={mortgageState}
                    updateState={updateMortgageState}
                    onAddHint={addHint}
                  />
                ) : (
                  <ProMode
                    state={mortgageState}
                    updateState={updateMortgageState}
                    onAddHint={addHint}
                  />
                )}
              </div>

              {/* Side Elements */}
              <div className="relative">
                <CostRail costs={mortgageState.costs} />
                <MortgagePassport 
                  milestones={mortgageState.milestones}
                  currentStep={mortgageState.currentStep}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart Hints */}
        <SmartHints
          hints={showHints}
          onDismissHint={removeHint}
          mortgageState={mortgageState}
          updateState={updateMortgageState}
        />
      </div>
    </div>
  );
}