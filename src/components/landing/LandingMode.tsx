'use client';

import { createContext, useContext } from 'react';

/**
 * דף נחיתה של כלי חינמי הוא אתר עצמאי: יש לו כותרת משלו, ולכן הכלים שבתוכו
 * לא מציגים את סרגל הניווט של הפלטפורמה ואת קישור החזרה לדף הבית.
 */
const LandingModeContext = createContext(false);

export function LandingModeProvider({ children }: { children: React.ReactNode }) {
  return <LandingModeContext.Provider value>{children}</LandingModeContext.Provider>;
}

export function useLandingMode(): boolean {
  return useContext(LandingModeContext);
}
