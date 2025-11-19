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

  // Calculate percentages for visualization
  const paidPercentage = originalAmount > 0 ? (totalPaid / originalAmount) * 100 : 0;
  const principalPercentage = originalAmount > 0 ? (paidPrincipal / originalAmount) * 100 : 0;
  const interestPercentage = originalAmount > 0 ? (paidInterest / originalAmount) * 100 : 0;
  const remainingPercentage = originalAmount > 0 ? (remainingPrincipal / originalAmount) * 100 : 0;
  
  // Calculate percentages for each section
  const principalPaidPercentage = principalPercentage;
  const interestPaidPercentage = interestPercentage;

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">סכום מקורי של המשכנתא</span>
          <span className="text-2xl font-bold text-gray-900">
            ₪{originalAmount.toLocaleString()}
          </span>
        </div>
        
        <div className="relative" style={{ height: `${visualBarHeight}px` }}>
          {/* Background - Total Amount (Full Bar) */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl overflow-hidden shadow-inner">
          </div>

          {/* Remaining Principal - Right side */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${remainingPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute right-0 top-0 bottom-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-r-xl"
            style={{ 
              boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1)',
            }}
          >
            {remainingPercentage > 8 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-lg mb-1 drop-shadow-lg">
                  ₪{remainingPrincipal.toLocaleString()}
                </span>
                <span className="text-white font-bold text-sm drop-shadow-md">
                  {remainingPercentage.toFixed(1)}%
                </span>
              </div>
            )}
          </motion.div>

          {/* Paid Amount - "Cut out" effect with diagonal cut */}
          <motion.div
            initial={{ width: 0, clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
            animate={{ 
              width: `${paidPercentage}%`,
              clipPath: 'polygon(0 0, 100% 0, calc(100% - 15px) 100%, 0 100%)'
            }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="absolute left-0 top-0 bottom-0"
            style={{
              boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.1), -2px 0 8px rgba(0,0,0,0.15)',
            }}
          >
            {/* Principal portion */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${paidPercentage > 0 ? (principalPercentage / paidPercentage) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-green-500 to-green-600"
            >
              {principalPaidPercentage > 8 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white font-bold text-lg mb-1 drop-shadow-lg">
                    ₪{paidPrincipal.toLocaleString()}
                  </span>
                  <span className="text-white font-bold text-sm drop-shadow-md">
                    {principalPaidPercentage.toFixed(1)}%
                  </span>
                </div>
              )}
            </motion.div>
            
            {/* Interest portion */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${paidPercentage > 0 ? (interestPercentage / paidPercentage) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-r from-orange-500 to-orange-600"
              style={{ 
                left: `${paidPercentage > 0 ? (principalPercentage / paidPercentage) * 100 : 0}%`,
              }}
            >
              {interestPaidPercentage > 8 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white font-bold text-lg mb-1 drop-shadow-lg">
                    ₪{paidInterest.toLocaleString()}
                  </span>
                  <span className="text-white font-bold text-sm drop-shadow-md">
                    {interestPaidPercentage.toFixed(1)}%
                  </span>
                </div>
              )}
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

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Remaining Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">יתרה</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            ₪{remainingPrincipal.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600">חוב קרן נותר</p>
        </motion.div>

        {/* Estimated Interest */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 border-2 border-purple-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <Percent className="w-5 h-5 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded">ריבית</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            ₪{estimatedRemainingInterest.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600">ערך משוערך של ריבית נותרת</p>
        </motion.div>

        {/* Remaining Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-4 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">תשלומים</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {remainingPayments}
          </p>
          <p className="text-xs text-gray-600">תשלומים נותרים</p>
        </motion.div>

        {/* Total Paid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-4 border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">שולם</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            ₪{totalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600">סה"כ שולם עד כה</p>
        </motion.div>
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

      {/* Breakdown Pie Chart Representation */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  animate={{ width: `${(paidPrincipal / totalPaid) * 100}%` }}
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
                  animate={{ width: `${(paidInterest / totalPaid) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="bg-orange-500 h-2 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {totalPaid > 0 ? ((paidInterest / totalPaid) * 100).toFixed(1) : 0}% מהתשלומים
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
          </div>
        </div>
      </div>
    </div>
  );
}

