'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  TrendingUp,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calculator,
  ChevronDown,
  ChevronUp,
  Edit
} from 'lucide-react';
import { MortgageTrack, Payment } from '@/types/mortgage';
import { format, differenceInMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import AmortizationSchedule from './AmortizationSchedule';

interface TrackDetailsProps {
  track: MortgageTrack;
  payments: Payment[];
  onBack: () => void;
  onRefinance: () => void;
}

export default function TrackDetails({ 
  track, 
  payments,
  onBack,
  onRefinance 
}: TrackDetailsProps) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate track statistics
  const paidPayments = payments.filter(p => p.isPaid);
  const upcomingPayments = payments.filter(p => !p.isPaid);
  const nextPayment = upcomingPayments[0];
  
  const totalPaidPrincipal = paidPayments.reduce((sum, p) => sum + p.principal, 0);
  const totalPaidInterest = paidPayments.reduce((sum, p) => sum + p.interest, 0);
  const totalRemainingPrincipal = upcomingPayments.reduce((sum, p) => sum + p.principal, 0);
  const totalRemainingInterest = upcomingPayments.reduce((sum, p) => sum + p.interest, 0);
  
  const progressPercentage = ((totalPaidPrincipal / track.principal) * 100).toFixed(1);
  const monthsRemaining = track.remainingMonths;
  const monthsUntilAdjustment = track.nextAdjustmentDate 
    ? differenceInMonths(track.nextAdjustmentDate, new Date())
    : null;

  // Get track type details
  const getTrackTypeInfo = () => {
    switch (track.type) {
      case 'prime':
        return {
          label: 'משכנתא בריבית פריים',
          description: 'ריבית משתנה הצמודה לריבית בנק ישראל',
          color: 'blue',
          icon: TrendingUp
        };
      case 'fixed':
        return {
          label: 'משכנתא בריבית קבועה',
          description: 'ריבית קבועה לכל תקופת ההלוואה',
          color: 'green',
          icon: DollarSign
        };
      case 'variable':
        return {
          label: 'משכנתא בריבית משתנה',
          description: 'ריבית משתנה לפי מדד או ריבית בסיס',
          color: 'orange',
          icon: TrendingUp
        };
      case 'adjustable':
        return {
          label: 'משכנתא משתנה כל תקופה',
          description: `ריבית מתעדכנת כל ${track.adjustmentPeriod} חודשים`,
          color: 'purple',
          icon: RefreshCw
        };
      case 'eligibility':
        return {
          label: 'הלוואת זכאות',
          description: 'הלוואה מסובסדת מהמדינה',
          color: 'pink',
          icon: Calculator
        };
      default:
        return {
          label: 'מסלול משכנתא',
          description: '',
          color: 'gray',
          icon: DollarSign
        };
    }
  };

  const trackInfo = getTrackTypeInfo();
  const Icon = trackInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            חזרה לסקירה כללית
          </button>
          
          <button
            onClick={onRefinance}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            מחזור משכנתא
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg bg-${trackInfo.color}-100 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${trackInfo.color}-600`} />
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{track.name}</h2>
            <p className="text-gray-600 mt-1">{trackInfo.label}</p>
            {trackInfo.description && (
              <p className="text-sm text-gray-500 mt-1">{trackInfo.description}</p>
            )}
          </div>
          
          {track.isCompleted && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
              הושלם
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">התקדמות</span>
            <span className="font-semibold">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`bg-gradient-to-r from-${trackInfo.color}-500 to-${trackInfo.color}-600 rounded-full h-3`}
            />
          </div>
          <div className="flex justify-between text-sm mt-2 text-gray-500">
            <span>{paidPayments.length} תשלומים שולמו</span>
            <span>{upcomingPayments.length} תשלומים נותרו</span>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <Percent className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold">{track.interestRate}%</span>
          </div>
          <h3 className="font-semibold text-gray-900">ריבית נוכחית</h3>
          {track.indexType && (
            <p className="text-sm text-gray-600 mt-1">צמוד ל-{track.indexType}</p>
          )}
          {track.margin && (
            <p className="text-sm text-gray-600">מרווח: {track.margin}%</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold">₪{track.monthlyPayment.toLocaleString()}</span>
          </div>
          <h3 className="font-semibold text-gray-900">תשלום חודשי</h3>
          <p className="text-sm text-gray-600 mt-1">
            התשלום הבא: {nextPayment && format(nextPayment.date, 'dd/MM', { locale: he })}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold">{monthsRemaining}</span>
          </div>
          <h3 className="font-semibold text-gray-900">חודשים נותרו</h3>
          <p className="text-sm text-gray-600 mt-1">
            סיום: {format(track.endDate, 'MM/yyyy', { locale: he })}
          </p>
        </motion.div>
      </div>

      {/* Adjustment Warning */}
      {track.nextAdjustmentDate && !track.isCompleted && monthsUntilAdjustment !== null && monthsUntilAdjustment <= 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-orange-900">עדכון ריבית קרוב</h3>
              <p className="text-orange-700 mt-1">
                הריבית במסלול זה תתעדכן ב-{format(track.nextAdjustmentDate, 'dd/MM/yyyy', { locale: he })}
                {' '}({monthsUntilAdjustment} חודשים)
              </p>
              <button
                onClick={onRefinance}
                className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                בדוק אפשרויות מחזור
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">תשלומים עד כה</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">קרן</span>
                <span className="font-semibold">₪{totalPaidPrincipal.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(totalPaidPrincipal / (totalPaidPrincipal + totalPaidInterest)) * 100}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">ריבית</span>
                <span className="font-semibold">₪{totalPaidInterest.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${(totalPaidInterest / (totalPaidPrincipal + totalPaidInterest)) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-gray-900 font-medium">סה"כ שולם</span>
                <span className="font-bold text-lg">
                  ₪{(totalPaidPrincipal + totalPaidInterest).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">תשלומים עתידיים</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">קרן</span>
                <span className="font-semibold">₪{totalRemainingPrincipal.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(totalRemainingPrincipal / (totalRemainingPrincipal + totalRemainingInterest)) * 100}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">ריבית</span>
                <span className="font-semibold">₪{totalRemainingInterest.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${(totalRemainingInterest / (totalRemainingPrincipal + totalRemainingInterest)) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-gray-900 font-medium">סה"כ נותר</span>
                <span className="font-bold text-lg">
                  ₪{(totalRemainingPrincipal + totalRemainingInterest).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Amortization Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">לוח סילוקין</h3>
          <button
            onClick={() => setShowFullSchedule(!showFullSchedule)}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
          >
            {showFullSchedule ? (
              <>
                <ChevronUp className="w-4 h-4" />
                הסתר
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                הצג הכל
              </>
            )}
          </button>
        </div>

        {showFullSchedule ? (
          <AmortizationSchedule
            payments={payments}
            trackName={track.name}
            onDateSelect={setSelectedDate}
          />
        ) : (
          /* Show next 3 payments preview */
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="space-y-3">
              {payments.slice(paidPayments.length, paidPayments.length + 3).map((payment, index) => (
                <div
                  key={payment.id}
                  className={`p-4 rounded-lg border ${
                    index === 0 
                      ? 'border-purple-300 bg-purple-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">תשלום #{payment.paymentNumber}</span>
                      {index === 0 && (
                        <span className="mr-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                          הבא
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      {format(payment.date, 'dd/MM/yyyy', { locale: he })}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-600">קרן: </span>
                      <span className="font-medium">₪{payment.principal.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ריבית: </span>
                      <span className="font-medium">₪{payment.interest.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">סה"כ: </span>
                      <span className="font-medium">₪{payment.totalPayment.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setShowFullSchedule(true)}
              className="w-full mt-4 py-2 text-center text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              הצג את כל לוח הסילוקין
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
