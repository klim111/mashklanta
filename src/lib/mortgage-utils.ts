import { MortgageSummary, MortgageTrack, Payment, DateSnapshot } from '@/types/mortgage';
import { addMonths, isBefore, isAfter, differenceInMonths } from 'date-fns';

// Calculate monthly payment using amortization formula
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
    (Math.pow(1 + monthlyRate, months) - 1);
  
  return Math.round(payment);
}

// Generate amortization schedule for a track
export function generateAmortizationSchedule(
  track: MortgageTrack,
  startPaymentNumber: number = 1
): Payment[] {
  const payments: Payment[] = [];
  let remainingBalance = track.principal;
  const monthlyRate = track.interestRate / 100 / 12;
  const monthlyPayment = track.monthlyPayment;
  
  for (let i = 0; i < track.totalMonths; i++) {
    const paymentDate = addMonths(track.startDate, i);
    const interestPayment = Math.round(remainingBalance * monthlyRate);
    const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);
    
    remainingBalance -= principalPayment;
    
    payments.push({
      id: `${track.id}-payment-${i + 1}`,
      trackId: track.id,
      paymentNumber: startPaymentNumber + i,
      date: paymentDate,
      principal: principalPayment,
      interest: interestPayment,
      totalPayment: principalPayment + interestPayment,
      remainingBalance: Math.max(0, remainingBalance),
      isPaid: isBefore(paymentDate, new Date()),
      isUpcoming: !isBefore(paymentDate, new Date())
    });
    
    if (remainingBalance <= 0) break;
  }
  
  return payments;
}

// Calculate snapshot for a specific date
export function calculateDateSnapshot(
  mortgage: MortgageSummary,
  trackPayments: Record<string, Payment[]>,
  date: Date
): DateSnapshot {
  let totalPaidPrincipal = 0;
  let totalPaidInterest = 0;
  let totalRemainingPrincipal = 0;
  let totalRemainingPayments = 0;
  
  const trackSnapshots = mortgage.tracks.map(track => {
    const payments = trackPayments[track.id] || [];
    const paidPayments = payments.filter(p => isBefore(p.date, date));
    const upcomingPayments = payments.filter(p => !isBefore(p.date, date));
    
    const paidPrincipal = paidPayments.reduce((sum, p) => sum + p.principal, 0);
    const paidInterest = paidPayments.reduce((sum, p) => sum + p.interest, 0);
    const remainingPrincipal = upcomingPayments.reduce((sum, p) => sum + p.principal, 0);
    const remainingPayments = upcomingPayments.length;
    
    totalPaidPrincipal += paidPrincipal;
    totalPaidInterest += paidInterest;
    totalRemainingPrincipal += remainingPrincipal;
    totalRemainingPayments += remainingPayments;
    
    return {
      trackId: track.id,
      remainingPrincipal,
      paidPrincipal,
      paidInterest,
      remainingPayments,
      nextAdjustment: track.nextAdjustmentDate
    };
  });
  
  const totalRemainingInterest = mortgage.tracks.reduce((sum, track) => {
    const payments = trackPayments[track.id] || [];
    const upcomingPayments = payments.filter(p => !isBefore(p.date, date));
    return sum + upcomingPayments.reduce((s, p) => s + p.interest, 0);
  }, 0);
  
  return {
    date,
    totalRemainingPrincipal,
    totalPaidPrincipal,
    totalPaidInterest,
    totalRemainingPayments,
    trackSnapshots
  };
}

// Generate mock mortgage data for demonstration
export function generateMockMortgageData(): {
  summary: MortgageSummary;
  payments: Record<string, Payment[]>;
} {
  const startDate = new Date(2022, 0, 1); // January 2022
  const propertyValue = 2500000; // 2.5M NIS
  const loanAmount = 1750000; // 70% LTV
  
  // Create mortgage tracks
  const tracks: MortgageTrack[] = [
    {
      id: 'track-1',
      name: 'פריים -0.7%',
      type: 'prime',
      principal: 525000, // 30% of loan
      remainingPrincipal: 420000,
      interestRate: 3.05, // Prime (3.75%) - 0.7%
      monthlyPayment: calculateMonthlyPayment(525000, 3.05, 300),
      startDate,
      endDate: addMonths(startDate, 300),
      totalMonths: 300,
      remainingMonths: 240,
      indexType: 'פריים',
      margin: -0.7,
      isCompleted: false
    },
    {
      id: 'track-2',
      name: 'קבועה צמודה 3.2%',
      type: 'fixed',
      principal: 700000, // 40% of loan
      remainingPrincipal: 580000,
      interestRate: 3.2,
      monthlyPayment: calculateMonthlyPayment(700000, 3.2, 240),
      startDate,
      endDate: addMonths(startDate, 240),
      totalMonths: 240,
      remainingMonths: 180,
      isCompleted: false
    },
    {
      id: 'track-3',
      name: 'משתנה כל 5 שנים',
      type: 'adjustable',
      principal: 525000, // 30% of loan
      remainingPrincipal: 450000,
      interestRate: 2.8,
      monthlyPayment: calculateMonthlyPayment(525000, 2.8, 360),
      startDate,
      endDate: addMonths(startDate, 360),
      totalMonths: 360,
      remainingMonths: 300,
      nextAdjustmentDate: addMonths(new Date(), 14), // 14 months from now
      adjustmentPeriod: 60,
      isCompleted: false
    }
  ];
  
  // Generate payments for each track
  const payments: Record<string, Payment[]> = {};
  let paymentCounter = 1;
  
  tracks.forEach(track => {
    const trackPayments = generateAmortizationSchedule(track, paymentCounter);
    payments[track.id] = trackPayments;
    paymentCounter += trackPayments.length;
  });
  
  // Calculate summary totals
  const totalMonthlyPayment = tracks.reduce((sum, t) => sum + t.monthlyPayment, 0);
  const totalPaidPrincipal = tracks.reduce((sum, t) => sum + (t.principal - t.remainingPrincipal), 0);
  const totalRemainingPrincipal = tracks.reduce((sum, t) => sum + t.remainingPrincipal, 0);
  
  // Calculate total interest paid and remaining
  let totalPaidInterest = 0;
  let totalRemainingInterest = 0;
  
  Object.values(payments).forEach(trackPayments => {
    trackPayments.forEach(payment => {
      if (payment.isPaid) {
        totalPaidInterest += payment.interest;
      } else {
        totalRemainingInterest += payment.interest;
      }
    });
  });
  
  // Find next payment
  const allPayments = Object.values(payments).flat();
  const nextPayment = allPayments.find(p => !p.isPaid);
  
  const summary: MortgageSummary = {
    id: 'mortgage-1',
    userId: 'user-1',
    propertyAddress: 'רחוב הרצל 123, תל אביב',
    originalAmount: loanAmount,
    currentBalance: totalRemainingPrincipal,
    startDate,
    endDate: tracks.reduce((latest, t) => 
      isAfter(t.endDate, latest) ? t.endDate : latest, 
      tracks[0].endDate
    ),
    tracks,
    totalMonthlyPayment,
    totalPaidPrincipal,
    totalPaidInterest,
    totalRemainingPrincipal,
    totalRemainingInterest,
    nextPaymentDate: nextPayment?.date || new Date(),
    nextPaymentAmount: nextPayment?.totalPayment || 0
  };
  
  return { summary, payments };
}

// Calculate refinance scenarios
export function calculateRefinanceScenario(
  track: MortgageTrack,
  newRate: number,
  refinanceCost: number = 5000
) {
  const newMonthlyPayment = calculateMonthlyPayment(
    track.remainingPrincipal,
    newRate,
    track.remainingMonths
  );
  
  const currentTotalPayments = track.monthlyPayment * track.remainingMonths;
  const newTotalPayments = newMonthlyPayment * track.remainingMonths;
  const totalSavings = currentTotalPayments - newTotalPayments - refinanceCost;
  const monthlySavings = track.monthlyPayment - newMonthlyPayment;
  const breakEvenMonths = refinanceCost / monthlySavings;
  
  return {
    trackId: track.id,
    currentRate: track.interestRate,
    newRate,
    currentMonthlyPayment: track.monthlyPayment,
    newMonthlyPayment,
    monthlySavings,
    totalSavings,
    breakEvenMonths: Math.ceil(breakEvenMonths),
    refinanceCost
  };
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// Calculate LTV ratio
export function calculateLTV(loanAmount: number, propertyValue: number): number {
  return (loanAmount / propertyValue) * 100;
}

// Calculate DTI ratio
export function calculateDTI(monthlyPayment: number, monthlyIncome: number): number {
  return (monthlyPayment / monthlyIncome) * 100;
}

// Check if track needs attention (e.g., rate adjustment coming)
export function trackNeedsAttention(track: MortgageTrack): boolean {
  if (track.isCompleted) return false;
  
  if (track.nextAdjustmentDate) {
    const monthsUntilAdjustment = differenceInMonths(track.nextAdjustmentDate, new Date());
    return monthsUntilAdjustment <= 3;
  }
  
  // Check if track is ending soon
  return track.remainingMonths <= 6;
}
