import type { MortgageTrack, MortgageMix, MortgageCalculation, TrackCalculation, AmortRow } from './types';

/**
 * חישוב תשלום חודשי לפי נוסחת האנונה
 */
export function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (annualRate === 0) {
    return principal / (years * 12);
  }
  
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  const monthlyPayment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return monthlyPayment;
}

/**
 * חישוב תשלום חודשי ראשון בשיטת קרן שווה.
 * הקרן החודשית קבועה, והריבית מחושבת לפי יתרה נוכחית ולכן סך התשלום החודשי פוחת לאורך הזמן.
 */
export function calculateEqualPrincipalFirstPayment(principal: number, annualRate: number, years: number): number {
  const numPayments = years * 12;
  if (numPayments <= 0) return 0;
  const principalPayment = principal / numPayments;
  const monthlyRate = annualRate / 100 / 12;
  const firstMonthInterest = principal * monthlyRate;
  return principalPayment + firstMonthInterest;
}

/**
 * יצירת לוח סילוקין למסלול בודד
 */
export function generateAmortizationSchedule(
  principal: number, 
  annualRate: number, 
  years: number,
  amortizationType: MortgageTrack['amortizationType'] = 'spitzer'
): AmortRow[] {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  const schedule: AmortRow[] = [];
  let balance = principal;
  const equalPrincipalPayment = numPayments > 0 ? principal / numPayments : 0;
  const isPartialGrace = amortizationType === 'partial_grace';
  const isFullGrace = amortizationType === 'full_grace';
  
  for (let month = 1; month <= numPayments; month++) {
    const interestPayment = balance * monthlyRate;
    let principalPayment = 0;
    let actualPayment = 0;
    let newBalance = balance;

    if (isFullGrace) {
      if (month === numPayments) {
        // בחודש האחרון משלמים את כל הקרן המקורית + הריבית שנצברה (ריבית דריבית).
        actualPayment = balance + interestPayment;
        principalPayment = balance;
        newBalance = 0;
      } else {
        // אין תשלום שוטף, והריבית מצטרפת לקרן.
        actualPayment = 0;
        principalPayment = 0;
        newBalance = balance + interestPayment;
      }
    } else {
      principalPayment = isPartialGrace
        ? (month === numPayments ? balance : 0)
        : amortizationType === 'equal_principal'
          ? Math.min(equalPrincipalPayment, balance)
          : monthlyPayment - interestPayment;
      actualPayment =
        isPartialGrace
          ? interestPayment + principalPayment
          : amortizationType === 'equal_principal'
          ? principalPayment + interestPayment
          : monthlyPayment;
      newBalance = Math.max(0, balance - principalPayment);
    }
    
    schedule.push({
      month,
      balanceStart: balance,
      payment: actualPayment,
      interest: interestPayment,
      principal: principalPayment,
      balanceEnd: newBalance
    });
    
    balance = newBalance;
    
    // הפסקה אם היתרה הגיעה לאפס
    if (balance <= 0.01) break;
  }
  
  return schedule;
}

/**
 * חישוב מסלול משכנתא בודד
 */
export function calculateTrack(track: MortgageTrack): TrackCalculation {
  const amortSchedule = generateAmortizationSchedule(
    track.amount,
    track.interestRate,
    track.years,
    track.amortizationType || 'spitzer'
  );
  const isEqualPrincipal = track.amortizationType === 'equal_principal';
  const monthlyPayment = amortSchedule[0]?.payment ?? (
    isEqualPrincipal
      ? calculateEqualPrincipalFirstPayment(track.amount, track.interestRate, track.years)
      : calculateMonthlyPayment(track.amount, track.interestRate, track.years)
  );
  
  const totalPaid = amortSchedule.reduce((sum, row) => sum + row.payment, 0);
  const totalInterest = totalPaid - track.amount;
  
  return {
    track: {
      ...track,
      monthlyPayment,
      totalInterest,
      totalPaid
    },
    monthlyPayment,
    totalInterest,
    totalPaid,
    amortSchedule
  };
}

/**
 * חישוב תמהיל משכנתא מלא
 */
export function calculateMortgageMix(mix: MortgageMix): MortgageCalculation {
  const trackCalculations = mix.tracks.map(track => calculateTrack(track));
  
  const totalMonthlyPayment = trackCalculations.reduce((sum, calc) => sum + calc.monthlyPayment, 0);
  const totalInterest = trackCalculations.reduce((sum, calc) => sum + calc.totalInterest, 0);
  const totalPaid = trackCalculations.reduce((sum, calc) => sum + calc.totalPaid, 0);
  
  // חישוב ריבית ממוצעת משוקללת
  const weightedRateSum = mix.tracks.reduce((sum, track) => 
    sum + (track.interestRate * track.amount), 0
  );
  const averageRate = mix.totalAmount > 0 ? weightedRateSum / mix.totalAmount : 0;
  
  // חישוב תקופה ממוצעת משוקללת
  const weightedYearsSum = mix.tracks.reduce((sum, track) => 
    sum + (track.years * track.amount), 0
  );
  const weightedAverageYears = mix.totalAmount > 0 ? weightedYearsSum / mix.totalAmount : 0;
  
  // עדכון התמהיל עם הנתונים המחושבים
  const updatedMix = {
    ...mix,
    totalMonthlyPayment,
    totalInterest,
    totalPaid,
    averageRate,
    tracks: trackCalculations.map(calc => calc.track)
  };
  
  return {
    mix: updatedMix,
    trackCalculations,
    summary: {
      totalMonthlyPayment,
      totalInterest,
      totalPaid,
      averageRate,
      weightedAverageYears
    }
  };
}

/**
 * השוואה בין תמהילי משכנתא
 */
export function compareMortgageMixes(mixes: MortgageMix[]): {
  calculations: MortgageCalculation[];
  bestByMonthly: MortgageCalculation;
  bestByTotal: MortgageCalculation;
  bestByInterest: MortgageCalculation;
} {
  const calculations = mixes.map(mix => calculateMortgageMix(mix));
  
  if (calculations.length === 0) {
    throw new Error('אין תמהילים להשוואה');
  }
  
  const bestByMonthly = calculations.reduce((best, current) => 
    current.summary.totalMonthlyPayment < best.summary.totalMonthlyPayment ? current : best
  );
  
  const bestByTotal = calculations.reduce((best, current) => 
    current.summary.totalPaid < best.summary.totalPaid ? current : best
  );
  
  const bestByInterest = calculations.reduce((best, current) => 
    current.summary.totalInterest < best.summary.totalInterest ? current : best
  );
  
  return {
    calculations,
    bestByMonthly,
    bestByTotal,
    bestByInterest
  };
}

/**
 * פונקציות עזר לעיצוב מספרים
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('he-IL').format(Math.round(num));
}

export function formatPercentage(rate: number, decimals: number = 2): string {
  return `${rate.toFixed(decimals)}%`;
}

/**
 * יצירת נתוני גרף החזר חודשי לאורך זמן
 */
export function generateMonthlyPaymentChart(trackCalculations: TrackCalculation[]): Array<{
  month: number;
  year: number;
  totalPayment: number;
  [trackName: string]: number;
}> {
  // מציאת האורך המקסימלי של לוח סילוקין
  const maxLength = Math.max(...trackCalculations.map(calc => calc.amortSchedule.length));
  
  const chartData = [];
  for (let i = 0; i < maxLength; i++) {
    const month = i + 1;
    const year = Math.floor(i / 12) + 1;
    
    let totalPayment = 0;
    const monthData: any = { month, year };
    
    trackCalculations.forEach(calc => {
      const payment = calc.amortSchedule[i]?.payment || 0;
      totalPayment += payment;
      monthData[calc.track.name] = payment;
    });
    
    monthData.totalPayment = totalPayment;
    chartData.push(monthData);
  }
  
  return chartData;
}

/**
 * יצירת נתוני גרף יתרת חוב לאורך זמן
 */
export function generateDebtBalanceChart(trackCalculations: TrackCalculation[]): Array<{
  month: number;
  year: number;
  totalBalance: number;
  [trackName: string]: number;
}> {
  const maxLength = Math.max(...trackCalculations.map(calc => calc.amortSchedule.length));
  
  const chartData = [];
  for (let i = 0; i < maxLength; i++) {
    const month = i + 1;
    const year = Math.floor(i / 12) + 1;
    
    let totalBalance = 0;
    const monthData: any = { month, year };
    
    trackCalculations.forEach(calc => {
      const balance = calc.amortSchedule[i]?.balanceEnd || 0;
      totalBalance += balance;
      monthData[calc.track.name] = balance;
    });
    
    monthData.totalBalance = totalBalance;
    chartData.push(monthData);
  }
  
  return chartData;
}

/**
 * יצירת נתוני גרף ריבית ממוצעת לאורך זמן
 */
export function generateAverageInterestChart(trackCalculations: TrackCalculation[]): Array<{
  month: number;
  year: number;
  averageInterestRate: number;
}> {
  const maxLength = Math.max(...trackCalculations.map(calc => calc.amortSchedule.length));
  
  const chartData = [];
  for (let i = 0; i < maxLength; i++) {
    const month = i + 1;
    const year = Math.floor(i / 12) + 1;
    
    // חישוב ריבית ממוצעת משוקללת לחודש הנוכחי
    let totalBalance = 0;
    let weightedInterest = 0;
    
    trackCalculations.forEach(calc => {
      const balance = calc.amortSchedule[i]?.balanceEnd || 0;
      totalBalance += balance;
      weightedInterest += balance * calc.track.interestRate;
    });
    
    const averageInterestRate = totalBalance > 0 ? weightedInterest / totalBalance : 0;
    
    chartData.push({
      month,
      year,
      averageInterestRate
    });
  }
  
  return chartData;
}

/**
 * יצירת נתוני גרף חלוקת תשלום (קרן מול ריבית)
 */
export function generatePaymentBreakdownChart(trackCalculations: TrackCalculation[]): Array<{
  month: number;
  year: number;
  totalInterest: number;
  totalPrincipal: number;
  interestPercentage: number;
  principalPercentage: number;
}> {
  const maxLength = Math.max(...trackCalculations.map(calc => calc.amortSchedule.length));
  
  const chartData = [];
  for (let i = 0; i < maxLength; i++) {
    const month = i + 1;
    const year = Math.floor(i / 12) + 1;
    
    let totalInterest = 0;
    let totalPrincipal = 0;
    
    trackCalculations.forEach(calc => {
      const row = calc.amortSchedule[i];
      if (row) {
        totalInterest += row.interest;
        totalPrincipal += row.principal;
      }
    });
    
    const totalPayment = totalInterest + totalPrincipal;
    const interestPercentage = totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0;
    const principalPercentage = totalPayment > 0 ? (totalPrincipal / totalPayment) * 100 : 0;
    
    chartData.push({
      month,
      year,
      totalInterest,
      totalPrincipal,
      interestPercentage,
      principalPercentage
    });
  }
  
  return chartData;
}