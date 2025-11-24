'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Calendar,
  DollarSign,
  TrendingDown,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  PiggyBank,
  BarChart3,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Home,
  TrendingUp,
  CalendarDays,
  RefreshCw,
  Percent,
  Download,
  Filter,
  Zap,
  ArrowLeftRight,
  PieChart,
  Timer,
  Wallet
} from 'lucide-react';
import { MortgageSummary, MortgageTrack, Payment } from '@/types/mortgage';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, differenceInMonths } from 'date-fns';
import { he } from 'date-fns/locale';

interface EarlyRepaymentSimulationProps {
  mortgage: MortgageSummary;
  trackPayments: Record<string, Payment[]>;
  onClose: () => void;
  selectedDate: Date;
}

interface SimulatedTrack extends MortgageTrack {
  originalPrincipal: number;
  remainingPrincipalBeforeRepayment: number;
  repaymentAmount: number;
  actualRepaymentAmount: number; // After deducting fee
  newRemainingPrincipal: number;
  originalMonthlyPayment: number;
  newMonthlyPayment: number;
  originalEndDate: Date;
  newEndDate: Date;
  originalRemainingMonths: number;
  newRemainingMonths: number;
  interestSaved: number;
  monthsSaved: number;
  simulatedPayments?: Payment[];
}

type RepaymentStrategy = 'reduce-time' | 'reduce-payment';

export default function EarlyRepaymentSimulation({
  mortgage,
  trackPayments,
  onClose,
  selectedDate: initialDate
}: EarlyRepaymentSimulationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentTiming, setRepaymentTiming] = useState<'now' | 'future'>('now');
  const [repaymentDate, setRepaymentDate] = useState(new Date());
  const [earlyRepaymentFee, setEarlyRepaymentFee] = useState('');
  const [repaymentStrategy, setRepaymentStrategy] = useState<RepaymentStrategy>('reduce-time');
  const [simulatedTracks, setSimulatedTracks] = useState<SimulatedTrack[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [expandedSchedule, setExpandedSchedule] = useState<string | 'full' | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [expandedGeneralDetails, setExpandedGeneralDetails] = useState(false);
  const [selectedTrackForRepayment, setSelectedTrackForRepayment] = useState<string | null>(null);
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'timeline'>('list');
  const [scheduleCurrentPage, setScheduleCurrentPage] = useState(0);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  // Calculate simulation when parameters change
  useEffect(() => {
    if (repaymentAmount && parseFloat(repaymentAmount) > 0) {
      calculateSimulations();
    } else {
      setSimulatedTracks([]);
    }
  }, [repaymentAmount, repaymentDate, earlyRepaymentFee, repaymentStrategy]);

  const calculateSimulations = () => {
    const grossAmount = parseFloat(repaymentAmount);
    const fee = parseFloat(earlyRepaymentFee) || 0;
    const netAmount = grossAmount - fee; // Actual amount after fee deduction
    
    if (netAmount <= 0) {
      alert('סכום הפירעון חייב להיות גבוה מעמלת הפירעון המוקדם');
      return;
    }

    const effectiveDate = repaymentTiming === 'now' ? new Date() : repaymentDate;
    
    const simulations: SimulatedTrack[] = mortgage.tracks.map(track => {
      const payments = trackPayments[track.id] || [];
      const futurePayments = payments.filter(p => p.date > effectiveDate);
      const pastPayments = payments.filter(p => p.date <= effectiveDate);
      
      const remainingPrincipal = futurePayments.reduce((sum, p) => sum + p.principal, 0);
      const remainingInterest = futurePayments.reduce((sum, p) => sum + p.interest, 0);
      const originalRemainingMonths = futurePayments.length;
      
      // Simulate if this track gets the full net repayment
      const repaymentForTrack = Math.min(netAmount, remainingPrincipal);
      const newRemainingPrincipal = remainingPrincipal - repaymentForTrack;
      
      let newMonthlyPayment = track.monthlyPayment;
      let newRemainingMonths = originalRemainingMonths;
      let newEndDate = track.endDate;
      
      if (newRemainingPrincipal > 0) {
        const monthlyInterestRate = track.interestRate / 100 / 12;
        
        if (repaymentStrategy === 'reduce-time') {
          // Keep same monthly payment, reduce loan period
          newMonthlyPayment = track.monthlyPayment;
          
          // Calculate new loan period using loan formula
          if (monthlyInterestRate > 0) {
            const logBase = Math.log(1 + monthlyInterestRate);
            const logValue = Math.log(newMonthlyPayment / (newMonthlyPayment - newRemainingPrincipal * monthlyInterestRate));
            newRemainingMonths = Math.ceil(logValue / logBase);
          } else {
            newRemainingMonths = Math.ceil(newRemainingPrincipal / track.monthlyPayment);
          }
          
          newEndDate = addMonths(effectiveDate, newRemainingMonths);
        } else {
          // Keep same loan period, reduce monthly payment
          newRemainingMonths = originalRemainingMonths;
          
          // Calculate new monthly payment using loan formula
          if (monthlyInterestRate > 0) {
            const factor = Math.pow(1 + monthlyInterestRate, newRemainingMonths);
            newMonthlyPayment = Math.round(newRemainingPrincipal * monthlyInterestRate * factor / (factor - 1));
          } else {
            newMonthlyPayment = Math.round(newRemainingPrincipal / newRemainingMonths);
          }
          
          newEndDate = track.endDate; // Keep original end date
        }
      } else {
        // Loan fully paid off
        newMonthlyPayment = 0;
        newRemainingMonths = 0;
        newEndDate = effectiveDate;
      }

      // Calculate interest saved
      const newTotalInterest = newRemainingPrincipal * track.interestRate * newRemainingMonths / 1200;
      const interestSaved = Math.max(0, remainingInterest - newTotalInterest);
      const monthsSaved = Math.max(0, originalRemainingMonths - newRemainingMonths);

      // Generate simulated payment schedule
      const simulatedPayments: Payment[] = [...pastPayments];
      let balance = newRemainingPrincipal;
      const monthlyInterestRate = track.interestRate / 100 / 12;
      
      for (let i = 1; i <= newRemainingMonths; i++) {
        const paymentDate = addMonths(effectiveDate, i);
        const interestPayment = Math.round(balance * monthlyInterestRate);
        const principalPayment = newMonthlyPayment - interestPayment;
        balance = Math.max(0, balance - principalPayment);
        
        simulatedPayments.push({
          id: `sim-${track.id}-${i}`,
          trackId: track.id,
          paymentNumber: pastPayments.length + i,
          date: paymentDate,
          principal: Math.round(principalPayment),
          interest: interestPayment,
          totalPayment: newMonthlyPayment,
          remainingBalance: Math.round(balance),
          isPaid: false,
          isUpcoming: true
        });
      }

      return {
        ...track,
        originalPrincipal: track.principal,
        remainingPrincipalBeforeRepayment: remainingPrincipal,
        repaymentAmount: repaymentForTrack + (fee / mortgage.tracks.length), // Include fee portion
        actualRepaymentAmount: repaymentForTrack,
        newRemainingPrincipal,
        originalMonthlyPayment: track.monthlyPayment,
        newMonthlyPayment,
        originalEndDate: track.endDate,
        newEndDate,
        originalRemainingMonths,
        newRemainingMonths,
        interestSaved,
        monthsSaved,
        simulatedPayments
      };
    });

    setSimulatedTracks(simulations);
  };

  // Calculate total mortgage summary after repayment for selected track
  const calculateTotalSummary = (withRepayment: boolean = true) => {
    // Calculate original values (before repayment)
    const originalTotalRemaining = Object.values(trackPayments).flat()
      .filter(p => p.date > new Date())
      .reduce((sum, p) => sum + p.principal, 0);
    
    const originalTotalMonthly = mortgage.tracks.reduce((sum, t) => sum + t.monthlyPayment, 0);
    
    if (!withRepayment || !selectedTrackForRepayment || simulatedTracks.length === 0) {
      // Return original values
      return {
        totalAmount: mortgage.originalAmount,
        totalRemaining: originalTotalRemaining,
        totalMonthly: originalTotalMonthly,
        progress: ((mortgage.originalAmount - originalTotalRemaining) / mortgage.originalAmount * 100).toFixed(1),
        originalTotalRemaining,
        originalTotalMonthly
      };
    }

    // Calculate with selected track repaid
    const selectedTrack = simulatedTracks.find(t => t.id === selectedTrackForRepayment);
    if (!selectedTrack) {
      return {
        totalAmount: mortgage.originalAmount,
        totalRemaining: originalTotalRemaining,
        totalMonthly: originalTotalMonthly,
        progress: ((mortgage.originalAmount - originalTotalRemaining) / mortgage.originalAmount * 100).toFixed(1),
        originalTotalRemaining,
        originalTotalMonthly
      };
    }

    let totalRemaining = 0;
    let totalMonthly = 0;

    simulatedTracks.forEach(track => {
      if (track.id === selectedTrackForRepayment) {
        // Use simulated values for selected track
        totalRemaining += track.newRemainingPrincipal;
        totalMonthly += track.newMonthlyPayment;
      } else {
        // Use original values for other tracks
        const payments = trackPayments[track.id] || [];
        const futurePayments = payments.filter(p => p.date > new Date());
        const remaining = futurePayments.reduce((sum, p) => sum + p.principal, 0);
        totalRemaining += remaining;
        totalMonthly += track.monthlyPayment;
      }
    });

    const progress = ((mortgage.originalAmount - totalRemaining) / mortgage.originalAmount * 100).toFixed(1);

    return {
      totalAmount: mortgage.originalAmount,
      totalRemaining,
      totalMonthly,
      progress,
      originalTotalRemaining,
      originalTotalMonthly
    };
  };

  // Render amortization schedule
  const renderAmortizationSchedule = (trackId: string | 'full') => {
    if (trackId === 'full') {
      // Show combined schedule for all tracks
      if (!selectedTrackForRepayment) return null;
      
      // Combine all payments from all tracks
      const allPayments: Payment[] = [];
      simulatedTracks.forEach(track => {
        if (track.id === selectedTrackForRepayment && track.simulatedPayments) {
          allPayments.push(...track.simulatedPayments);
        } else {
          const payments = trackPayments[track.id] || [];
          allPayments.push(...payments);
        }
      });
      
      const sortedPayments = allPayments.sort((a, b) => a.date.getTime() - b.date.getTime());
      const paymentsPerPage = 12;
      const paginatedPayments = sortedPayments.slice(
        scheduleCurrentPage * paymentsPerPage,
        (scheduleCurrentPage + 1) * paymentsPerPage
      );
      const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);

      return renderScheduleContent('כל המשכנתא', paginatedPayments, totalPages);
    } else {
      // Show schedule for specific track
      const track = simulatedTracks.find(t => t.id === trackId);
      if (!track || !track.simulatedPayments) return null;

      const payments = track.simulatedPayments;
      const paymentsPerPage = 12;
      const paginatedPayments = payments.slice(
        scheduleCurrentPage * paymentsPerPage,
        (scheduleCurrentPage + 1) * paymentsPerPage
      );
      const totalPages = Math.ceil(payments.length / paymentsPerPage);

      return renderScheduleContent(
        `${track.name} (${repaymentStrategy === 'reduce-time' ? 'קיצור תקופה' : 'הפחתת תשלום'})`,
        paginatedPayments,
        totalPages
      );
    }
  };

  const renderScheduleContent = (title: string, paginatedPayments: Payment[], totalPages: number) => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm mt-2"
    >
      <div className="bg-gray-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">
            לוח סילוקין מעודכן - {title}
          </h4>
          <button
            onClick={() => setExpandedSchedule(null)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronUp className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-gray-50 font-semibold text-sm text-gray-700 border-b">
            <div>#</div>
            <div>תאריך</div>
            <div>קרן</div>
            <div>ריבית</div>
            <div>סה"כ</div>
            <div>יתרה</div>
            <div>סטטוס</div>
          </div>

          <div className="divide-y divide-gray-200">
            {paginatedPayments.map((payment) => (
              <div
                key={payment.id}
                className={`grid grid-cols-7 gap-4 px-4 py-3 text-sm ${
                  payment.isPaid ? 'bg-gray-50 text-gray-600' : 'bg-white text-gray-900'
                }`}
              >
                <div className="font-medium">#{payment.paymentNumber}</div>
                <div>{format(payment.date, 'dd/MM/yyyy', { locale: he })}</div>
                <div>₪{payment.principal.toLocaleString()}</div>
                <div>₪{payment.interest.toLocaleString()}</div>
                <div className="font-semibold">₪{payment.totalPayment.toLocaleString()}</div>
                <div>₪{payment.remainingBalance.toLocaleString()}</div>
                <div>
                  {payment.isPaid ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="w-4 h-4" />
                      שולם
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-700">
                      <Clock className="w-4 h-4" />
                      ממתין
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              onClick={() => setScheduleCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={scheduleCurrentPage === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors font-medium"
            >
              <ChevronRight className="w-5 h-5" />
              <span>הקודם</span>
            </button>
            
            <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
              עמוד {scheduleCurrentPage + 1} מתוך {totalPages}
            </span>
            
            <button
              onClick={() => setScheduleCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={scheduleCurrentPage === totalPages - 1}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors font-medium"
            >
              <span>הבא</span>
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Calendar generation
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = monthStart.getDay();
  const paddingDays = Array(startPadding).fill(null);

  const handleDateSelect = (date: Date) => {
    setRepaymentDate(date);
    setShowCalendar(false);
  };

  const getNetAmount = () => {
    const gross = parseFloat(repaymentAmount) || 0;
    const fee = parseFloat(earlyRepaymentFee) || 0;
    return Math.max(0, gross - fee);
  };

  const totalSummary = calculateTotalSummary();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-7xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">סימולציית פירעון מוקדם</h2>
                  <p className="text-purple-100 text-sm mt-1">חשב כמה תחסוך בפירעון מוקדם של המשכנתא</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
            {/* Input Section */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 mb-6 border border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                הגדרת פרמטרים לסימולציה
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Repayment Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    סכום פנוי לפירעון
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={repaymentAmount}
                      onChange={(e) => setRepaymentAmount(e.target.value)}
                      placeholder="הכנס סכום"
                      className="w-full px-4 py-3 pr-8 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-lg font-semibold"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                  </div>
                </div>

                {/* Early Repayment Fee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-600" />
                    עמלת פירעון מוקדם
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={earlyRepaymentFee}
                      onChange={(e) => setEarlyRepaymentFee(e.target.value)}
                      placeholder="הכנס סכום"
                      className="w-full px-4 py-3 pr-8 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-lg font-semibold"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                  </div>
                </div>

                {/* Repayment Strategy */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    מה המטרה שלך?
                  </label>
                  <div className="flex bg-white rounded-xl border-2 border-purple-300 p-1">
                    <button
                      onClick={() => setRepaymentStrategy('reduce-time')}
                      className={`flex-1 py-2.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        repaymentStrategy === 'reduce-time'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Timer className="w-4 h-4" />
                      <span>קיצור תקופה</span>
                    </button>
                    <button
                      onClick={() => setRepaymentStrategy('reduce-payment')}
                      className={`flex-1 py-2.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        repaymentStrategy === 'reduce-payment'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>הפחתת תשלום</span>
                    </button>
                  </div>
                </div>

                {/* Timing Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    מתי הכסף יהיה זמין?
                  </label>
                  <div className="flex bg-white rounded-xl border-2 border-purple-300 p-1">
                    <button
                      onClick={() => setRepaymentTiming('now')}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        repaymentTiming === 'now'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      יש לי עכשיו
                    </button>
                    <button
                      onClick={() => setRepaymentTiming('future')}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        repaymentTiming === 'future'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      יהיה לי בעתיד
                    </button>
                  </div>
                </div>

                {/* Date Selection (if future) */}
                {repaymentTiming === 'future' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      תאריך פירעון משוער
                    </label>
                    <button
                      onClick={() => setShowCalendar(true)}
                      className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-xl hover:border-purple-500 transition-all text-left font-medium flex items-center justify-between"
                    >
                      <span>{format(repaymentDate, 'dd/MM/yyyy', { locale: he })}</span>
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </button>
                  </div>
                )}

                {/* Net Amount Display */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-green-600" />
                    סכום נטו לפירעון
                  </label>
                  <div className="px-4 py-3 bg-green-50 border-2 border-green-300 rounded-xl">
                    <p className="text-2xl font-bold text-green-700">₪{getNetAmount().toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-1">אחרי ניכוי עמלת פירעון מוקדם</p>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">הסבר:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>קיצור תקופה:</strong> התשלום החודשי נשאר זהה, אך המשכנתא תסתיים מוקדם יותר</li>
                    <li><strong>הפחתת תשלום:</strong> תקופת המשכנתא נשארת זהה, אך התשלום החודשי יורד</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Total Mortgage Summary - Like Dashboard */}
            {simulatedTracks.length > 0 && (
              <div className="mb-6">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-purple-300">
                  <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 text-white">
                    <div className="bg-white/90 text-gray-900 rounded-lg p-5 transition-all">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <p className="text-sm font-medium text-gray-600">
                          {selectedTrackForRepayment 
                            ? `סיכום המשכנתא אחרי פירעון ${simulatedTracks.find(t => t.id === selectedTrackForRepayment)?.name}`
                            : 'בחר מסלול לראות את השפעת הפירעון על המשכנתא הכללית'
                          }
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-center">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">סך המשכנתא</p>
                            <p className="text-2xl font-bold">₪{totalSummary.totalAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">נותר לתשלום</p>
                            <p className="text-2xl font-bold">
                              {selectedTrackForRepayment && totalSummary.originalTotalRemaining !== totalSummary.totalRemaining && (
                                <span className="text-sm line-through text-gray-500 block">
                                  ₪{totalSummary.originalTotalRemaining?.toLocaleString()}
                                </span>
                              )}
                              <span className={selectedTrackForRepayment && totalSummary.originalTotalRemaining !== totalSummary.totalRemaining ? 'text-green-600' : ''}>
                                ₪{totalSummary.totalRemaining.toLocaleString()}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">התקדמות</p>
                            <p className="text-2xl font-bold">{totalSummary.progress}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">תשלום חודשי כולל</p>
                            <p className="text-2xl font-bold">
                              {selectedTrackForRepayment && totalSummary.originalTotalMonthly !== totalSummary.totalMonthly && (
                                <span className="text-sm line-through text-gray-500 block">
                                  ₪{totalSummary.originalTotalMonthly?.toLocaleString()}
                                </span>
                              )}
                              <span className={selectedTrackForRepayment && totalSummary.originalTotalMonthly !== totalSummary.totalMonthly ? 'text-green-600' : ''}>
                                ₪{totalSummary.totalMonthly.toLocaleString()}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setExpandedSchedule(expandedSchedule === 'full' ? null : 'full');
                              setExpandedGeneralDetails(false);
                              setScheduleCurrentPage(0);
                            }}
                            disabled={!selectedTrackForRepayment}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm ${
                              expandedSchedule === 'full'
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : selectedTrackForRepayment
                                  ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            title="לוח סילוקין"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            לוח סילוקין
                          </button>
                          <button
                            onClick={() => {
                              setExpandedGeneralDetails(!expandedGeneralDetails);
                              setExpandedSchedule(null);
                            }}
                            disabled={!selectedTrackForRepayment}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm ${
                              expandedGeneralDetails
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : selectedTrackForRepayment
                                  ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            title="פרטים"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            פרטים
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded General Schedule/Details */}
                  <AnimatePresence>
                    {expandedSchedule === 'full' && selectedTrackForRepayment && (
                      <div className="p-6 pt-0">
                        {renderAmortizationSchedule('full')}
                      </div>
                    )}
                    {expandedGeneralDetails && selectedTrackForRepayment && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="p-6 pt-0 overflow-hidden"
                      >
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-4">
                            פרטי המשכנתא הכללית אחרי פירעון {simulatedTracks.find(t => t.id === selectedTrackForRepayment)?.name}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">סכום שנפרע (נטו)</p>
                              <p className="text-xl font-bold text-gray-900">₪{getNetAmount().toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">חיסכון בריבית</p>
                              <p className="text-xl font-bold text-green-600">
                                ₪{simulatedTracks.find(t => t.id === selectedTrackForRepayment)?.interestSaved.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">
                                {repaymentStrategy === 'reduce-time' ? 'חודשים שנחסכו' : 'הפחתה חודשית'}
                              </p>
                              <p className="text-xl font-bold text-blue-600">
                                {repaymentStrategy === 'reduce-time' 
                                  ? `${simulatedTracks.find(t => t.id === selectedTrackForRepayment)?.monthsSaved || 0} חודשים`
                                  : `₪${((simulatedTracks.find(t => t.id === selectedTrackForRepayment)?.originalMonthlyPayment || 0) - 
                                      (simulatedTracks.find(t => t.id === selectedTrackForRepayment)?.newMonthlyPayment || 0)).toLocaleString()}`
                                }
                              </p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">אסטרטגיה</p>
                              <p className="text-xl font-bold text-purple-600">
                                {repaymentStrategy === 'reduce-time' ? 'קיצור תקופה' : 'הפחתת תשלום'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Track Cards */}
            {simulatedTracks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  לחץ על מסלול כדי לראות איך המשכנתא תיראה אם תפרע אותו
                </h3>

                {simulatedTracks.map((track) => {
                  const isSelected = selectedTrackForRepayment === track.id;
                  
                  const trackTypeColor = {
                    prime: 'bg-blue-50 text-blue-900 border-blue-200',
                    fixed: 'bg-green-50 text-green-900 border-green-200',
                    variable: 'bg-orange-50 text-orange-900 border-orange-200',
                    adjustable: 'bg-purple-50 text-purple-900 border-purple-200',
                    eligibility: 'bg-pink-50 text-pink-900 border-pink-200'
                  }[track.type];

                  return (
                    <div key={track.id} className="space-y-2">
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setSelectedTrackForRepayment(isSelected ? null : track.id)}
                        className={`${trackTypeColor} border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected ? 'shadow-lg ring-2 ring-purple-400' : 'hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="min-w-[180px]">
                              <p className="font-semibold text-lg">{track.name}</p>
                              <p className="text-sm opacity-75 mt-1">
                                {isSelected ? '✓ מסלול נבחר לפירעון' : 'לחץ לבחירה'}
                              </p>
                            </div>
                            <div className="grid grid-cols-5 gap-3 flex-1">
                              <div>
                                <p className="text-xs opacity-75">יתרה נוכחית</p>
                                <p className="font-semibold">₪{track.remainingPrincipalBeforeRepayment.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-75">סכום שיפרע (נטו)</p>
                                <p className="font-semibold text-blue-700">₪{track.actualRepaymentAmount.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-75">יתרה אחרי</p>
                                <p className="font-semibold text-green-700">₪{track.newRemainingPrincipal.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs opacity-75">תשלום חודשי</p>
                                <div>
                                  {track.originalMonthlyPayment !== track.newMonthlyPayment && (
                                    <p className="text-xs line-through text-gray-500">₪{track.originalMonthlyPayment.toLocaleString()}</p>
                                  )}
                                  <p className="font-semibold text-green-700">₪{track.newMonthlyPayment.toLocaleString()}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs opacity-75">
                                  {repaymentStrategy === 'reduce-time' ? 'חודשים נחסכו' : 'הפחתה חודשית'}
                                </p>
                                <p className="font-semibold text-green-700">
                                  {repaymentStrategy === 'reduce-time' 
                                    ? `${track.monthsSaved} חודשים`
                                    : `₪${(track.originalMonthlyPayment - track.newMonthlyPayment).toLocaleString()}`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSchedule(expandedSchedule === track.id ? null : track.id);
                                setScheduleCurrentPage(0);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm ${
                                expandedSchedule === track.id
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                              title="לוח סילוקין"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              לוח סילוקין
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedDetails(expandedDetails === track.id ? null : track.id);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all shadow-sm ${
                                expandedDetails === track.id
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                              title="פרטים"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              פרטים
                            </button>
                          </div>
                        </div>
                      </motion.div>

                      {/* Expanded Schedule */}
                      <AnimatePresence>
                        {expandedSchedule === track.id && renderAmortizationSchedule(track.id)}
                      </AnimatePresence>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedDetails === track.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-4">
                                השוואה מפורטת - {track.name}
                              </h4>
                              
                              <div className="grid grid-cols-2 gap-6">
                                {/* Before */}
                                <div className="space-y-3">
                                  <h5 className="font-medium text-gray-700 pb-2 border-b">לפני הפירעון</h5>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">יתרת קרן</span>
                                      <span className="font-semibold">₪{track.remainingPrincipalBeforeRepayment.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">תשלום חודשי</span>
                                      <span className="font-semibold">₪{track.originalMonthlyPayment.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">חודשים נותרים</span>
                                      <span className="font-semibold">{track.originalRemainingMonths}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">סיום משוער</span>
                                      <span className="font-semibold">{format(track.originalEndDate, 'MM/yyyy', { locale: he })}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* After */}
                                <div className="space-y-3">
                                  <h5 className="font-medium text-green-700 pb-2 border-b border-green-200">אחרי הפירעון</h5>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">יתרת קרן</span>
                                      <span className="font-semibold text-green-700">₪{track.newRemainingPrincipal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">תשלום חודשי</span>
                                      <span className="font-semibold text-green-700">₪{track.newMonthlyPayment.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">חודשים נותרים</span>
                                      <span className="font-semibold text-green-700">{track.newRemainingMonths}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-600">סיום משוער</span>
                                      <span className="font-semibold text-green-700">{format(track.newEndDate, 'MM/yyyy', { locale: he })}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Savings Summary */}
                              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">סכום נטו שנפרע</p>
                                    <p className="text-xl font-bold text-gray-900">₪{track.actualRepaymentAmount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">חיסכון בריבית</p>
                                    <p className="text-xl font-bold text-green-600">₪{track.interestSaved.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">
                                      {repaymentStrategy === 'reduce-time' ? 'קיצור זמן' : 'הפחתה חודשית'}
                                    </p>
                                    <p className="text-xl font-bold text-blue-600">
                                      {repaymentStrategy === 'reduce-time' 
                                        ? `${track.monthsSaved} חודשים`
                                        : `₪${(track.originalMonthlyPayment - track.newMonthlyPayment).toLocaleString()}`
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!repaymentAmount && (
              <div className="text-center py-12">
                <div className="inline-flex p-4 bg-purple-100 rounded-full mb-4">
                  <Calculator className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">הזן סכום לפירעון</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  הכנס את הסכום הפנוי שברצונך להשתמש בו לפירעון מוקדם של המשכנתא
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 p-4 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
            >
              סגור
            </button>
          </div>
        </motion.div>

        {/* Calendar Modal */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
              onClick={() => setShowCalendar(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">בחר תאריך פירעון</h3>
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Calendar Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <h4 className="font-semibold text-gray-900">
                    {format(calendarMonth, 'MMMM yyyy', { locale: he })}
                  </h4>
                  
                  <button
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {/* Weekday headers */}
                  {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                    <div key={day} className="text-xs font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Padding days */}
                  {paddingDays.map((_, index) => (
                    <div key={`pad-${index}`} />
                  ))}
                  
                  {/* Calendar days */}
                  {days.map(day => {
                    const isSelected = isSameDay(day, repaymentDate);
                    const isCurrentDay = isToday(day);
                    const isPast = day < new Date();
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDateSelect(day)}
                        disabled={isPast}
                        className={`
                          p-2 rounded-lg text-sm transition-all
                          ${isSelected 
                            ? 'bg-purple-600 text-white' 
                            : isCurrentDay
                              ? 'bg-purple-100 text-purple-700 font-semibold'
                              : isPast
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-900 hover:bg-gray-100'
                          }
                        `}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}