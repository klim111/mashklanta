'use client';

import { useState, useEffect } from 'react';

export interface MortgageCosts {
  fixed: {
    appraisal: number;
    fileOpening: number;
    notary: number;
    insurance: number;
  };
  variable: {
    legalFees: number;
    brokerFees: number;
    bankFees: number;
  };
  total: number;
  estimated: number;
}

export interface MortgageMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  eta?: string;
  progress: number;
}

export interface UserProfile {
  personalInfo: {
    age?: number;
    maritalStatus?: string;
    dependents?: number;
  };
  financial: {
    monthlyIncome?: number;
    ownEquity?: number;
    monthlyExpenses?: number;
    existingLoans?: number;
  };
  preferences: {
    stability?: number; // 1-5 scale
    flexibility?: number; // 1-5 scale
    cost?: number; // 1-5 scale
  };
  propertyInfo: {
    propertyValue?: number;
    propertyType?: string;
    location?: string;
  };
  mortgageDetails: {
    loanAmount?: number;
    desiredTerm?: number;
    maxMonthlyPayment?: number;
  };
}

export function useMortgageApplication() {
  const [currentStep, setCurrentStep] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    personalInfo: {},
    financial: {},
    preferences: {},
    propertyInfo: {},
    mortgageDetails: {}
  });

  const [milestones, setMilestones] = useState<MortgageMilestone[]>([
    {
      id: 'client-profiling',
      title: 'הכרת הלקוח',
      description: 'איסוף מידע אישי ופיננסי',
      completed: false,
      eta: '5-10 דקות',
      progress: 0
    },
    {
      id: 'portfolio-building',
      title: 'בניית תמהיל',
      description: 'יצירת תמהיל משכנתא מותאם',
      completed: false,
      eta: '10-15 דקות',
      progress: 0
    },
    {
      id: 'bank-negotiations',
      title: 'מו"מ בנקים',
      description: 'השוואת הצעות ומשא ומתן',
      completed: false,
      eta: '2-3 שבועות',
      progress: 0
    }
  ]);

  const [costs, setCosts] = useState<MortgageCosts>({
    fixed: {
      appraisal: 2500,
      fileOpening: 1500,
      notary: 3000,
      insurance: 0
    },
    variable: {
      legalFees: 0,
      brokerFees: 0,
      bankFees: 0
    },
    total: 7000,
    estimated: 15000
  });

  // Calculate overall progress
  const progress = milestones.reduce((acc, milestone) => acc + milestone.progress, 0) / milestones.length;

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mortgage-application-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setCurrentStep(state.currentStep || 0);
        setUserProfile(state.userProfile || userProfile);
        setMilestones(state.milestones || milestones);
        setCosts(state.costs || costs);
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    const state = {
      currentStep,
      userProfile,
      milestones,
      costs
    };
    localStorage.setItem('mortgage-application-state', JSON.stringify(state));
  }, [currentStep, userProfile, milestones, costs]);

  const updateUserProfile = (section: keyof UserProfile, data: Partial<UserProfile[keyof UserProfile]>) => {
    setUserProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...data
      }
    }));
  };

  const updateMilestone = (id: string, updates: Partial<MortgageMilestone>) => {
    setMilestones(prev => prev.map(milestone => 
      milestone.id === id ? { ...milestone, ...updates } : milestone
    ));
  };

  const updateCosts = (newCosts: Partial<MortgageCosts>) => {
    setCosts(prev => ({
      ...prev,
      ...newCosts,
      total: (newCosts.fixed ? Object.values(newCosts.fixed).reduce((a, b) => a + b, 0) : prev.total)
    }));
  };

  const resetApplication = () => {
    setCurrentStep(0);
    setUserProfile({
      personalInfo: {},
      financial: {},
      preferences: {},
      propertyInfo: {},
      mortgageDetails: {}
    });
    setMilestones(prev => prev.map(m => ({ ...m, completed: false, progress: 0 })));
    setCosts({
      fixed: {
        appraisal: 2500,
        fileOpening: 1500,
        notary: 3000,
        insurance: 0
      },
      variable: {
        legalFees: 0,
        brokerFees: 0,
        bankFees: 0
      },
      total: 7000,
      estimated: 15000
    });
    localStorage.removeItem('mortgage-application-state');
  };

  return {
    currentStep,
    setCurrentStep,
    userProfile,
    updateUserProfile,
    milestones,
    updateMilestone,
    costs,
    updateCosts,
    progress,
    resetApplication
  };
}