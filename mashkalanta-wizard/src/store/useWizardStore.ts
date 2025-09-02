import { create } from 'zustand';

type WizardStage = 'discovery' | 'design' | 'market';

interface WizardState {
  // Current stage in the wizard
  currentStage: WizardStage;
  
  // UI mode flags
  guidedMode: boolean;
  
  // Progress tracking (UI only)
  progress: Record<string, boolean>;
  
  // Sample placeholder data
  equity: number;
  affordability: number;
  budget: number;
  
  // DNA Profile values (0-10)
  dnaProfile: {
    stability: number;
    flexibility: number;
    priceSensitivity: number;
    indexAversion: number;
  };
  
  // Actions
  setStage: (stage: WizardStage) => void;
  toggleGuided: () => void;
  markDone: (stepId: string) => void;
  updateDNAProfile: (profile: Partial<WizardState['dnaProfile']>) => void;
  updateFinancials: (data: { equity?: number; affordability?: number; budget?: number }) => void;
  reset: () => void;
}

const initialState = {
  currentStage: 'discovery' as WizardStage,
  guidedMode: true,
  progress: {},
  equity: 500000,
  affordability: 8000,
  budget: 1500000,
  dnaProfile: {
    stability: 5,
    flexibility: 5,
    priceSensitivity: 5,
    indexAversion: 5,
  },
};

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,
  
  setStage: (stage) => set({ currentStage: stage }),
  
  toggleGuided: () => set((state) => ({ guidedMode: !state.guidedMode })),
  
  markDone: (stepId) => set((state) => ({
    progress: { ...state.progress, [stepId]: true }
  })),
  
  updateDNAProfile: (profile) => set((state) => ({
    dnaProfile: { ...state.dnaProfile, ...profile }
  })),
  
  updateFinancials: (data) => set((state) => ({
    ...state,
    ...data,
  })),
  
  reset: () => set(initialState),
}));