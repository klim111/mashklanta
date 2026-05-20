'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Percent,
  Calendar,
  PieChart,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { MortgageSummary, Payment, DateSnapshot } from '@/types/mortgage';
import { differenceInMonths } from 'date-fns';

interface MortgageInfographicProps {
  mortgage: MortgageSummary;
  trackPayments: Record<string, Payment[]>;
  snapshot: DateSnapshot | null;
  selectedDate: Date;
}

interface IndexationData {
  hasIndexLinkedTracks: boolean;
  totalIndexationChange: number;
  totalIndexationChangePercentage: number;
  paidIndexationAmount: number;
  remainingPrincipalIndexationChange: number;
  indexLinkedTracksCount: number;
}

export default function MortgageInfographic({
  mortgage,
  trackPayments,
  snapshot,
  selectedDate
}: MortgageInfographicProps) {
  if (!snapshot) return null;

  // Calculate all metrics
  const originalAmount = mortgage.originalAmount;
  const totalPaid = snapshot.totalPaidPrincipal + snapshot.totalPaidInterest;
  const paidPrincipal = snapshot.totalPaidPrincipal;
  const paidInterest = snapshot.totalPaidInterest;
  const remainingPrincipal = snapshot.totalRemainingPrincipal;
  const remainingPayments = snapshot.totalRemainingPayments;
  
  // Calculate estimated remaining interest
  const estimatedRemainingInterest = mortgage.tracks.reduce((sum, track) => {
    const payments = trackPayments[track.id] || [];
    const upcomingPayments = payments.filter(p => p.date > selectedDate);
    return sum + upcomingPayments.reduce((s, p) => s + p.interest, 0);
  }, 0);

  // Calculate indexation data
  const calculateIndexation = (): IndexationData => {
    let totalIndexationChange = 0;
    let paidIndexationAmount = 0;
    let remainingPrincipalIndexationChange = 0;
    let indexLinkedTracksCount = 0;

    mortgage.tracks.forEach(track => {
      // Check if track is index-linked (has indexType or is of type that's typically linked)
      const isIndexLinked = track.indexType !== undefined && track.indexType !== null;
      
      if (isIndexLinked) {
        indexLinkedTracksCount++;
        
        // Simulate indexation effect - in real app, this would use actual CPI data
        // For now, we'll calculate based on time passed and a simulated index rate
        const monthsPassed = differenceInMonths(selectedDate, mortgage.startDate);
        const monthsTotal = differenceInMonths(mortgage.endDate, mortgage.startDate);
        
        // Simulate 2% annual indexation (simplified - in reality would use actual CPI)
        const annualIndexationRate = 0.02;
        const indexationFactor = Math.pow(1 + annualIndexationRate, monthsPassed / 12) - 1;
        
        const trackOriginalPrincipal = track.principal;
        const trackIndexationChange = trackOriginalPrincipal * indexationFactor;
        
        // Calculate how much of the indexation has been paid
        const trackPaymentsList = trackPayments[track.id] || [];
        const paidPayments = trackPaymentsList.filter(p => p.date <= selectedDate);
        const paidRatio = paidPayments.length / track.totalMonths;
        const paidIndexation = trackIndexationChange * paidRatio;
        
        // Remaining principal indexation change
        const remainingRatio = 1 - paidRatio;
        const remainingIndexation = trackIndexationChange * remainingRatio;
        
        totalIndexationChange += trackIndexationChange;
        paidIndexationAmount += paidIndexation;
        remainingPrincipalIndexationChange += remainingIndexation;
      }
    });

    const totalIndexationChangePercentage = originalAmount > 0 
      ? (totalIndexationChange / originalAmount) * 100 
      : 0;

    return {
      hasIndexLinkedTracks: indexLinkedTracksCount > 0,
      totalIndexationChange,
      totalIndexationChangePercentage,
      paidIndexationAmount,
      remainingPrincipalIndexationChange,
      indexLinkedTracksCount
    };
  };

  const indexationData = calculateIndexation();

  // Calculate dynamic monthly payment based on selected date
  // Sum up monthly payments of all active tracks at the selected date
  const calculateDynamicMonthlyPayment = (): number => {
    return mortgage.tracks.reduce((sum, track) => {
      const payments = trackPayments[track.id] || [];
      // Find the next payment after selected date
      const nextPayment = payments.find(p => p.date > selectedDate);
      
      if (nextPayment) {
        // Track is still active, add its monthly payment
        return sum + track.monthlyPayment;
      }
      // Track is completed, don't add to monthly payment
      return sum;
    }, 0);
  };

  const dynamicMonthlyPayment = calculateDynamicMonthlyPayment();

  // Calculate percentages for visualization
  const paidPercentage = originalAmount > 0 ? (totalPaid / originalAmount) * 100 : 0;
  const principalPercentage = originalAmount > 0 ? (paidPrincipal / originalAmount) * 100 : 0;
  const interestPercentage = originalAmount > 0 ? (paidInterest / originalAmount) * 100 : 0;
  const remainingPercentage = originalAmount > 0 ? (remainingPrincipal / originalAmount) * 100 : 0;
  
  // Minimum width for each section to display text properly (in percentage)
  // This ensures text is always visible until the very last payment
  const MIN_SECTION_WIDTH = 15; // Minimum 15% for text to fit comfortably
  
  // Smart adjustment: ensure each section has minimum width for text
  // Only hide remaining section when it's exactly zero
  const isRemainingZero = remainingPrincipal <= 0;
  
  let adjustedPrincipalPercentage = principalPercentage;
  let adjustedInterestPercentage = interestPercentage;
  let adjustedRemainingPercentage = remainingPercentage;
  let adjustedPaidPercentage = paidPercentage;
  
  // If remaining is zero, hide it and show all paid amount
  // Calculate principal and interest as percentages of the paid amount (100%)
  if (isRemainingZero) {
    adjustedRemainingPercentage = 0;
    adjustedPaidPercentage = 100;
    // Calculate principal and interest as percentages of total paid amount
    // These will be used to divide the 100% paid section
    const principalRatio = totalPaid > 0 ? paidPrincipal / totalPaid : 0;
    const interestRatio = totalPaid > 0 ? paidInterest / totalPaid : 0;
    // Convert to percentages of the original amount for consistency
    adjustedPrincipalPercentage = principalRatio * 100;
    adjustedInterestPercentage = interestRatio * 100;
  } else {
    // Adjust remaining section if too small (but not zero)
    if (remainingPercentage > 0 && remainingPercentage < MIN_SECTION_WIDTH) {
      const neededIncrease = MIN_SECTION_WIDTH - remainingPercentage;
      adjustedRemainingPercentage = MIN_SECTION_WIDTH;
      // Reduce paid percentage to make room
      adjustedPaidPercentage = Math.max(0, paidPercentage - neededIncrease);
      
      // Adjust principal and interest proportionally within paid section
      if (paidPercentage > 0 && adjustedPaidPercentage > 0) {
        const scale = adjustedPaidPercentage / paidPercentage;
        adjustedPrincipalPercentage = principalPercentage * scale;
        adjustedInterestPercentage = interestPercentage * scale;
      }
    }
    
    // Adjust principal section within paid if too small
    const principalInPaidWidth = adjustedPaidPercentage > 0 ? (adjustedPrincipalPercentage / adjustedPaidPercentage) * 100 : 0;
    if (principalInPaidWidth > 0 && principalInPaidWidth < MIN_SECTION_WIDTH && adjustedPaidPercentage > 0) {
      const minPrincipalWidth = (MIN_SECTION_WIDTH / 100) * adjustedPaidPercentage;
      adjustedPrincipalPercentage = Math.max(adjustedPrincipalPercentage, minPrincipalWidth);
      // Adjust interest to fit
      adjustedInterestPercentage = Math.max(0, adjustedPaidPercentage - adjustedPrincipalPercentage);
    }
    
    // Adjust interest section within paid if too small
    const interestInPaidWidth = adjustedPaidPercentage > 0 ? (adjustedInterestPercentage / adjustedPaidPercentage) * 100 : 0;
    if (interestInPaidWidth > 0 && interestInPaidWidth < MIN_SECTION_WIDTH && adjustedPaidPercentage > 0) {
      const minInterestWidth = (MIN_SECTION_WIDTH / 100) * adjustedPaidPercentage;
      adjustedInterestPercentage = Math.max(adjustedInterestPercentage, minInterestWidth);
      // Adjust principal to fit
      adjustedPrincipalPercentage = Math.max(0, adjustedPaidPercentage - adjustedInterestPercentage);
    }
    
    // Ensure total doesn't exceed 100%
    const totalAdjusted = adjustedPaidPercentage + adjustedRemainingPercentage;
    if (totalAdjusted > 100) {
      const scale = 100 / totalAdjusted;
      adjustedPaidPercentage *= scale;
      adjustedRemainingPercentage *= scale;
      adjustedPrincipalPercentage *= scale;
      adjustedInterestPercentage *= scale;
    }
  }
  
  // Ensure percentages don't exceed 100% and bar stays within bounds
  const clampedPaidPercentage = Math.min(adjustedPaidPercentage, 100);
  const clampedRemainingPercentage = Math.min(adjustedRemainingPercentage, 100);
  
  // Calculate percentages for each section (for display labels)
  const principalPaidPercentage = principalPercentage;
  const interestPaidPercentage = interestPercentage;
  
  // Adjusted percentages for display within paid section
  // If remaining is zero, use the ratios directly (they're already percentages of paid amount)
  let adjustedPrincipalInPaid: number;
  let adjustedInterestInPaid: number;
  
  if (isRemainingZero) {
    // When remaining is zero, paid section is 100%, so use ratios directly
    const principalRatio = totalPaid > 0 ? paidPrincipal / totalPaid : 0;
    const interestRatio = totalPaid > 0 ? paidInterest / totalPaid : 0;
    adjustedPrincipalInPaid = principalRatio * 100;
    adjustedInterestInPaid = interestRatio * 100;
  } else {
    // Normal case: calculate as percentage of the paid section
    adjustedPrincipalInPaid = clampedPaidPercentage > 0 ? (adjustedPrincipalPercentage / clampedPaidPercentage) * 100 : 0;
    adjustedInterestInPaid = clampedPaidPercentage > 0 ? (adjustedInterestPercentage / clampedPaidPercentage) * 100 : 0;
  }

  // Visual representation: paid amount "cut out" from total
  const visualBarHeight = 120;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          תמונת מצב כללית
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Info className="w-4 h-4" />
          <span>עדכון אחרון: {selectedDate.toLocaleDateString('he-IL')}</span>
        </div>
      </div>

      {/* Main Visual Bar - Showing paid amount "cut out" */}
      <div className="mb-8 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">סכום מקורי של המשכנתא</span>
          <span className="text-2xl font-bold text-gray-900">
            ₪{originalAmount.toLocaleString()}
          </span>
        </div>
        
        <div className="relative overflow-hidden rounded-xl" style={{ height: `${visualBarHeight}px`, maxWidth: '100%' }}>
          {/* Background - Total Amount (Full Bar) */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl overflow-hidden shadow-inner">
          </div>

          {/* Remaining Principal - Right side, no gap from interest - Only show if not zero */}
          {!isRemainingZero && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clampedRemainingPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 to-blue-600"
              style={{ 
                boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1)',
                maxWidth: '100%',
                right: 0, // Align to right edge
                borderTopRightRadius: '0.75rem',
                borderBottomRightRadius: '0.75rem',
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
              }}
            >
              {remainingPrincipal > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span 
                  className="text-white font-bold mb-1 drop-shadow-lg whitespace-nowrap"
                  style={{ 
                    fontSize: clampedRemainingPercentage > 15 ? '1.125rem' : clampedRemainingPercentage > 8 ? '0.875rem' : '0.75rem',
                    lineHeight: '1.2'
                  }}
                >
                  ₪{remainingPrincipal.toLocaleString()}
                </span>
                <span 
                  className="text-white font-bold drop-shadow-md whitespace-nowrap"
                  style={{ 
                    fontSize: clampedRemainingPercentage > 15 ? '0.875rem' : clampedRemainingPercentage > 8 ? '0.75rem' : '0.625rem'
                  }}
                >
                  {clampedRemainingPercentage.toFixed(1)}%
                </span>
              </div>
              )}
            </motion.div>
          )}

          {/* Paid Amount - No diagonal cut, straight vertical line */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ 
              width: `${clampedPaidPercentage}%`
            }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="absolute left-0 top-0 bottom-0"
            style={{
              boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.1), -2px 0 8px rgba(0,0,0,0.15)',
              maxWidth: '100%',
              borderTopLeftRadius: '0.75rem',
              borderBottomLeftRadius: '0.75rem',
              borderTopRightRadius: isRemainingZero ? '0.75rem' : 0, // Round right side if remaining is zero
              borderBottomRightRadius: isRemainingZero ? '0.75rem' : 0, // Round right side if remaining is zero
            }}
          >
            {/* Principal portion */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${adjustedPrincipalInPaid}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-green-500 to-green-600"
              style={{ maxWidth: '100%' }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span 
                  className="text-white font-bold mb-1 drop-shadow-lg whitespace-nowrap"
                  style={{ 
                    fontSize: adjustedPrincipalInPaid > 15 ? '1.125rem' : adjustedPrincipalInPaid > 8 ? '0.875rem' : '0.75rem',
                    lineHeight: '1.2'
                  }}
                >
                  ₪{paidPrincipal.toLocaleString()}
                </span>
                <span 
                  className="text-white font-bold drop-shadow-md whitespace-nowrap"
                  style={{ 
                    fontSize: adjustedPrincipalInPaid > 15 ? '0.875rem' : adjustedPrincipalInPaid > 8 ? '0.75rem' : '0.625rem'
                  }}
                >
                  {principalPaidPercentage.toFixed(1)}%
                </span>
              </div>
            </motion.div>
            
            {/* Interest portion - Straight vertical line, no gap */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${adjustedInterestInPaid}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-orange-500 to-orange-600"
              style={{ 
                left: `${adjustedPrincipalInPaid}%`,
                maxWidth: '100%',
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span 
                  className="text-white font-bold mb-1 drop-shadow-lg whitespace-nowrap"
                  style={{ 
                    fontSize: adjustedInterestInPaid > 15 ? '1.125rem' : adjustedInterestInPaid > 8 ? '0.875rem' : '0.75rem',
                    lineHeight: '1.2'
                  }}
                >
                  ₪{paidInterest.toLocaleString()}
                </span>
                <span 
                  className="text-white font-bold drop-shadow-md whitespace-nowrap"
                  style={{ 
                    fontSize: adjustedInterestInPaid > 15 ? '0.875rem' : adjustedInterestInPaid > 8 ? '0.75rem' : '0.625rem'
                  }}
                >
                  {interestPaidPercentage.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700">קרן ששולמה: ₪{paidPrincipal.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-gray-700">ריבית ששולמה: ₪{paidInterest.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700">יתרה: ₪{remainingPrincipal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Breakdown Pie Chart Representation */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            התפלגות התשלומים ששולמו
          </h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">קרן</span>
                <span className="font-semibold">₪{paidPrincipal.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalPaid > 0 ? (paidPrincipal / totalPaid) * 100 : 0}%` }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="bg-green-500 h-2 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {totalPaid > 0 ? ((paidPrincipal / totalPaid) * 100).toFixed(1) : 0}% מהתשלומים
              </p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">ריבית</span>
                <span className="font-semibold">₪{paidInterest.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalPaid > 0 ? (paidInterest / totalPaid) * 100 : 0}%` }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="bg-orange-500 h-2 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {totalPaid > 0 ? ((paidInterest / totalPaid) * 100).toFixed(1) : 0}% מהתשלומים
              </p>
            </div>
            <div className="pt-3 border-t mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">שולם על כל שקל קרן שהוחזר:</span>
                <span className="text-lg font-bold text-purple-600">
                  ₪{(paidPrincipal > 0 ? (totalPaid / paidPrincipal) : 0).toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                כולל קרן + ריבית על ₪{paidPrincipal.toLocaleString()} קרן ששולמה
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            סיכום כללי
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">סכום מקורי:</span>
              <span className="font-semibold">₪{originalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">שולם (קרן + ריבית):</span>
              <span className="font-semibold text-green-600">₪{totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">יתרת קרן:</span>
              <span className="font-semibold text-blue-600">₪{remainingPrincipal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ריבית משוערת נותרת:</span>
              <span className="font-semibold text-purple-600">₪{estimatedRemainingInterest.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t mt-2">
              <div className="flex justify-between font-bold">
                <span className="text-gray-900">סה"כ תשלומים צפויים:</span>
                <span className="text-purple-600">
                  ₪{(remainingPrincipal + estimatedRemainingInterest).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">משוער להיות משולם על כל שקל:</span>
                <span className="text-lg font-bold text-purple-600">
                  ₪{(originalAmount > 0 ? ((totalPaid + remainingPrincipal + estimatedRemainingInterest) / originalAmount) : 0).toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                כולל שולם עד כה + נותר לשלם
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Indexation Section - Only show if there are index-linked tracks */}
      {indexationData.hasIndexLinkedTracks && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-5 border-2 border-yellow-200 mt-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-orange-600" />
            <h4 className="text-lg font-semibold text-gray-900">
              השפעת הצמדה למדד ({indexationData.indexLinkedTracksCount} מסלולים צמודי מדד)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Indexation Change */}
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">שינוי כולל מהצמדה</span>
                {indexationData.totalIndexationChange >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-red-600" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className={`text-xl font-bold ${
                indexationData.totalIndexationChange >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {indexationData.totalIndexationChange >= 0 ? '+' : ''}
                ₪{Math.abs(indexationData.totalIndexationChange).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ({indexationData.totalIndexationChangePercentage >= 0 ? '+' : ''}
                {indexationData.totalIndexationChangePercentage.toFixed(2)}%)
              </p>
            </div>

            {/* Paid Indexation */}
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">שולם על חשבון עליית המדד</span>
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-xl font-bold text-orange-600">
                ₪{indexationData.paidIndexationAmount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                מתוך השינוי הכולל
              </p>
            </div>

            {/* Remaining Principal Indexation Change */}
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">שינוי יתרת קרן מהצמדה</span>
                {indexationData.remainingPrincipalIndexationChange >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-red-600" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-green-600" />
                )}
              </div>
              <p className={`text-xl font-bold ${
                indexationData.remainingPrincipalIndexationChange >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {indexationData.remainingPrincipalIndexationChange >= 0 ? '+' : ''}
                ₪{Math.abs(indexationData.remainingPrincipalIndexationChange).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                השפעה על הקרן הנותרת
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

