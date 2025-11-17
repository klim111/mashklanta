'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Clock,
  AlertCircle,
  ChevronRight,
  PieChart
} from 'lucide-react';
import { MortgageSummary } from '@/types/mortgage';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface MortgageOverviewProps {
  mortgage: MortgageSummary;
  onTrackSelect: (trackId: string) => void;
}

export default function MortgageOverview({ mortgage, onTrackSelect }: MortgageOverviewProps) {
  const progressPercentage = 
    ((mortgage.totalPaidPrincipal / mortgage.originalAmount) * 100).toFixed(1);
  
  const monthsPassed = Math.floor(
    (new Date().getTime() - new Date(mortgage.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  
  const totalMonths = Math.floor(
    (new Date(mortgage.endDate).getTime() - new Date(mortgage.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const activeTracksCount = mortgage.tracks.filter(t => !t.isCompleted).length;
  const completedTracksCount = mortgage.tracks.filter(t => t.isCompleted).length;

  return (
    <div className="space-y-6">
      {/* Main Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">המשכנתא שלך</h2>
            <p className="text-purple-100 flex items-center gap-2">
              <Home className="w-4 h-4" />
              {mortgage.propertyAddress}
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-sm text-purple-100">התשלום הבא</p>
            <p className="text-xl font-bold">
              {format(mortgage.nextPaymentDate, 'dd/MM/yyyy', { locale: he })}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>התקדמות כללית</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-white rounded-full h-3"
            />
          </div>
          <div className="flex justify-between text-sm mt-2 text-purple-100">
            <span>{monthsPassed} חודשים עברו</span>
            <span>{totalMonths - monthsPassed} חודשים נותרו</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-purple-100 text-sm mb-1">סכום מקורי</p>
            <p className="text-2xl font-bold">₪{mortgage.originalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-purple-100 text-sm mb-1">יתרת קרן</p>
            <p className="text-2xl font-bold">₪{mortgage.currentBalance.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-purple-100 text-sm mb-1">תשלום חודשי</p>
            <p className="text-2xl font-bold">₪{mortgage.totalMonthlyPayment.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-purple-100 text-sm mb-1">התשלום הבא</p>
            <p className="text-2xl font-bold">₪{mortgage.nextPaymentAmount.toLocaleString()}</p>
          </div>
        </div>
      </motion.div>

      {/* Payment Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">התפלגות תשלומים</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">קרן ששולמה</span>
                <span className="font-semibold">₪{mortgage.totalPaidPrincipal.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(mortgage.totalPaidPrincipal / (mortgage.totalPaidPrincipal + mortgage.totalPaidInterest)) * 100}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">ריבית ששולמה</span>
                <span className="font-semibold">₪{mortgage.totalPaidInterest.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${(mortgage.totalPaidInterest / (mortgage.totalPaidPrincipal + mortgage.totalPaidInterest)) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-gray-600">סה"כ שולם</span>
                <span className="font-bold text-lg">
                  ₪{(mortgage.totalPaidPrincipal + mortgage.totalPaidInterest).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">יתרות לתשלום</h3>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">קרן נותרת</span>
                <span className="font-semibold">₪{mortgage.totalRemainingPrincipal.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(mortgage.totalRemainingPrincipal / (mortgage.totalRemainingPrincipal + mortgage.totalRemainingInterest)) * 100}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">ריבית עתידית</span>
                <span className="font-semibold">₪{mortgage.totalRemainingInterest.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${(mortgage.totalRemainingInterest / (mortgage.totalRemainingPrincipal + mortgage.totalRemainingInterest)) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-gray-600">סה"כ נותר לתשלום</span>
                <span className="font-bold text-lg">
                  ₪{(mortgage.totalRemainingPrincipal + mortgage.totalRemainingInterest).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tracks Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">מסלולי המשכנתא</h3>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              {activeTracksCount} פעילים
            </span>
            {completedTracksCount > 0 && (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
                {completedTracksCount} הושלמו
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mortgage.tracks.map((track) => {
            const trackProgress = ((track.principal - track.remainingPrincipal) / track.principal) * 100;
            const trackTypeLabel = {
              prime: 'פריים',
              fixed: 'קבועה',
              variable: 'משתנה',
              adjustable: 'משתנה כל תקופה',
              eligibility: 'זכאות'
            }[track.type];

            const trackTypeColor = {
              prime: 'bg-blue-100 text-blue-700',
              fixed: 'bg-green-100 text-green-700',
              variable: 'bg-orange-100 text-orange-700',
              adjustable: 'bg-purple-100 text-purple-700',
              eligibility: 'bg-pink-100 text-pink-700'
            }[track.type];

            return (
              <motion.div
                key={track.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => onTrackSelect(track.id)}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  track.isCompleted ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{track.name}</h4>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${trackTypeColor}`}>
                      {trackTypeLabel}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ריבית</span>
                    <span className="font-medium">{track.interestRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">תשלום חודשי</span>
                    <span className="font-medium">₪{track.monthlyPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">יתרת קרן</span>
                    <span className="font-medium">₪{track.remainingPrincipal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">התקדמות</span>
                    <span className="text-gray-500">{trackProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${track.isCompleted ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-500 to-blue-500'}`}
                      style={{ width: `${trackProgress}%` }}
                    />
                  </div>
                </div>

                {track.nextAdjustmentDate && !track.isCompleted && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>
                      עדכון ריבית ב-{format(track.nextAdjustmentDate, 'dd/MM/yyyy', { locale: he })}
                    </span>
                  </div>
                )}

                {track.isCompleted && (
                  <div className="mt-3 text-center text-xs text-gray-500 bg-gray-100 rounded-lg py-1">
                    הושלם ב-{format(track.endDate, 'dd/MM/yyyy', { locale: he })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
