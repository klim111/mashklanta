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
  Info,
  Zap
} from 'lucide-react';
import { MortgageTrack, Payment } from '@/types/mortgage';
import { differenceInMonths } from 'date-fns';

interface TrackInfographicProps {
  track: MortgageTrack;
  trackPayments: Payment[];
  selectedDate: Date;
}

export default function TrackInfographic({
  track,
  trackPayments,
  selectedDate
}: TrackInfographicProps) {
  // Calculate all metrics for this specific track
  const originalAmount = track.principal;
  const paidPayments = trackPayments.filter(p => p.date <= selectedDate);
  const upcomingPayments = trackPayments.filter(p => p.date > selectedDate);
  
  const paidPrincipal = paidPayments.reduce((sum, p) => sum + p.principal, 0);
  const paidInterest = paidPayments.reduce((sum, p) => sum + p.interest, 0);
  const totalPaid = paidPrincipal + paidInterest;
  const remainingPrincipal = upcomingPayments.reduce((sum, p) => sum + p.principal, 0);
  const remainingInterest = upcomingPayments.reduce((sum, p) => sum + p.interest, 0);
  const remainingPayments = upcomingPayments.length;

  // Calculate percentages for visualization
  const paidPercentage = originalAmount > 0 ? (totalPaid / originalAmount) * 100 : 0;
  const principalPercentage = originalAmount > 0 ? (paidPrincipal / originalAmount) * 100 : 0;
  const interestPercentage = originalAmount > 0 ? (paidInterest / originalAmount) * 100 : 0;
  const remainingPercentage = originalAmount > 0 ? (remainingPrincipal / originalAmount) * 100 : 0;
  
  // Calculate percentages for each section
  const principalPaidPercentage = principalPercentage;
  const interestPaidPercentage = interestPercentage;

  // Calculate indexation data if track is index-linked (check if "צמוד" is in track name)
  const isIndexLinked = track.name.includes('צמוד') || track.name.includes('צמודי');
  let indexationData = null;
  
  if (isIndexLinked) {
    const monthsPassed = differenceInMonths(selectedDate, track.startDate);
    const monthsTotal = differenceInMonths(track.endDate, track.startDate);
    
    // Simulate 2% annual indexation (simplified - in reality would use actual CPI)
    const annualIndexationRate = 0.02;
    const indexationFactor = Math.pow(1 + annualIndexationRate, monthsPassed / 12) - 1;
    
    const trackIndexationChange = originalAmount * indexationFactor;
    const paidRatio = paidPayments.length / track.totalMonths;
    const paidIndexation = trackIndexationChange * paidRatio;
    const remainingRatio = 1 - paidRatio;
    const remainingIndexation = trackIndexationChange * remainingRatio;
    
    indexationData = {
      totalIndexationChange: trackIndexationChange,
      totalIndexationChangePercentage: (trackIndexationChange / originalAmount) * 100,
      paidIndexationAmount: paidIndexation,
      remainingPrincipalIndexationChange: remainingIndexation
    };
  }

  // Visual representation: paid amount "cut out" from total
  const visualBarHeight = 100;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          תמונת מצב - {track.name}
        </h4>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm(`האם ברצונך לבצע פרעון מוקדם של ₪${remainingPrincipal.toLocaleString()} למסלול ${track.name}?`)) {
                // In production, this would call an API
                alert(`פרעון מוקדם של ₪${remainingPrincipal.toLocaleString()} יבוצע למסלול ${track.name}`);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm"
            title="פרעון מוקדם"
          >
            <Zap className="w-3.5 h-3.5" />
            פרעון מוקדם
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Info className="w-3 h-3" />
            <span>עדכון אחרון: {selectedDate.toLocaleDateString('he-IL')}</span>
          </div>
        </div>
      </div>

      {/* Main Visual Bar - Showing paid amount "cut out" */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">סכום מקורי של המסלול</span>
          <span className="text-xl font-bold text-gray-900">
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
                <span className="text-white font-bold text-base mb-1 drop-shadow-lg">
                  ₪{remainingPrincipal.toLocaleString()}
                </span>
                <span className="text-white font-bold text-xs drop-shadow-md">
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
                  <span className="text-white font-bold text-base mb-1 drop-shadow-lg">
                    ₪{paidPrincipal.toLocaleString()}
                  </span>
                  <span className="text-white font-bold text-xs drop-shadow-md">
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
                  <span className="text-white font-bold text-base mb-1 drop-shadow-lg">
                    ₪{paidInterest.toLocaleString()}
                  </span>
                  <span className="text-white font-bold text-xs drop-shadow-md">
                    {interestPaidPercentage.toFixed(1)}%
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-700">קרן ששולמה</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-700">ריבית ששולמה</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-700">יתרה</span>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Remaining Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg p-3 border-2 border-blue-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">יתרה</span>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-0.5">
            ₪{remainingPrincipal.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600">חוב קרן נותר</p>
        </motion.div>

        {/* Estimated Interest */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg p-3 border-2 border-purple-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <Percent className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded">ריבית</span>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-0.5">
            ₪{remainingInterest.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600">ריבית נותרת</p>
        </motion.div>

        {/* Remaining Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg p-3 border-2 border-green-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <Calendar className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">תשלומים</span>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-0.5">
            {remainingPayments}
          </p>
          <p className="text-xs text-gray-600">תשלומים נותרים</p>
        </motion.div>

        {/* Total Paid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg p-3 border-2 border-orange-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-1">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded">שולם</span>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-0.5">
            ₪{totalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600">סה"כ שולם</p>
        </motion.div>
      </div>

      {/* Indexation Section - Only show if track is index-linked */}
      {isIndexLinked && indexationData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-200 mt-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-orange-600" />
            <h5 className="text-sm font-semibold text-gray-900">
              השפעת הצמדה למדד
            </h5>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Total Indexation Change */}
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">שינוי כולל מהצמדה</span>
                {indexationData.totalIndexationChange >= 0 ? (
                  <ArrowUp className="w-3 h-3 text-red-600" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-green-600" />
                )}
              </div>
              <p className={`text-lg font-bold ${
                indexationData.totalIndexationChange >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {indexationData.totalIndexationChange >= 0 ? '+' : ''}
                ₪{Math.abs(indexationData.totalIndexationChange).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                ({indexationData.totalIndexationChangePercentage >= 0 ? '+' : ''}
                {indexationData.totalIndexationChangePercentage.toFixed(2)}%)
              </p>
            </div>

            {/* Paid Indexation */}
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">שולם על חשבון עליית המדד</span>
                <TrendingUp className="w-3 h-3 text-orange-600" />
              </div>
              <p className="text-lg font-bold text-orange-600">
                ₪{indexationData.paidIndexationAmount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                מתוך השינוי הכולל
              </p>
            </div>

            {/* Remaining Principal Indexation Change */}
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">שינוי יתרת קרן מהצמדה</span>
                {indexationData.remainingPrincipalIndexationChange >= 0 ? (
                  <ArrowUp className="w-3 h-3 text-red-600" />
                ) : (
                  <ArrowDown className="w-3 h-3 text-green-600" />
                )}
              </div>
              <p className={`text-lg font-bold ${
                indexationData.remainingPrincipalIndexationChange >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {indexationData.remainingPrincipalIndexationChange >= 0 ? '+' : ''}
                ₪{Math.abs(indexationData.remainingPrincipalIndexationChange).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                השפעה על הקרן הנותרת
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Breakdown Summary */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <PieChart className="w-3 h-3" />
            התפלגות התשלומים ששולמו
          </h5>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">קרן</span>
                <span className="font-semibold">₪{paidPrincipal.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalPaid > 0 ? (paidPrincipal / totalPaid) * 100 : 0}%` }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="bg-green-500 h-1.5 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {totalPaid > 0 ? ((paidPrincipal / totalPaid) * 100).toFixed(1) : 0}% מהתשלומים
              </p>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">ריבית</span>
                <span className="font-semibold">₪{paidInterest.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalPaid > 0 ? (paidInterest / totalPaid) * 100 : 0}%` }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="bg-orange-500 h-1.5 rounded-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {totalPaid > 0 ? ((paidInterest / totalPaid) * 100).toFixed(1) : 0}% מהתשלומים
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" />
            סיכום כללי
          </h5>
          <div className="space-y-1.5 text-xs">
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
              <span className="text-gray-600">ריבית נותרת:</span>
              <span className="font-semibold text-purple-600">₪{remainingInterest.toLocaleString()}</span>
            </div>
            <div className="pt-1.5 border-t mt-1.5">
              <div className="flex justify-between font-bold">
                <span className="text-gray-900">סה"כ תשלומים צפויים:</span>
                <span className="text-purple-600">
                  ₪{(remainingPrincipal + remainingInterest).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

