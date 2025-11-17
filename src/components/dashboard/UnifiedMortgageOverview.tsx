'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  PieChart,
  CalendarDays,
  RefreshCw,
  X,
  Percent,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { MortgageSummary, MortgageTrack, Payment, DateSnapshot } from '@/types/mortgage';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, differenceInMonths, isAfter, isBefore } from 'date-fns';
import { he } from 'date-fns/locale';
import { calculateDateSnapshot } from '@/lib/mortgage-utils';

interface UnifiedMortgageOverviewProps {
  mortgage: MortgageSummary;
  trackPayments: Record<string, Payment[]>;
  onRefinance: (trackId: string) => void;
}

export default function UnifiedMortgageOverview({ 
  mortgage, 
  trackPayments,
  onRefinance 
}: UnifiedMortgageOverviewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [expandedSchedule, setExpandedSchedule] = useState<string | 'full' | null>(null);
  const [snapshot, setSnapshot] = useState<DateSnapshot | null>(null);
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'timeline'>('list');
  const [scheduleCurrentPage, setScheduleCurrentPage] = useState(0);
  const [scheduleFilterDate, setScheduleFilterDate] = useState<Date | null>(null);
  const [showScheduleCalendar, setShowScheduleCalendar] = useState(false);

  // Calculate snapshot when date changes
  useEffect(() => {
    const newSnapshot = calculateDateSnapshot(mortgage, trackPayments, selectedDate);
    setSnapshot(newSnapshot);
  }, [selectedDate, mortgage, trackPayments]);

  // Calculate dynamic values based on selected date
  const calculateDynamicValues = (track: MortgageTrack) => {
    const payments = trackPayments[track.id] || [];
    const paidPayments = payments.filter(p => p.date <= selectedDate);
    const upcomingPayments = payments.filter(p => p.date > selectedDate);
    
    const paidPrincipal = paidPayments.reduce((sum, p) => sum + p.principal, 0);
    const paidInterest = paidPayments.reduce((sum, p) => sum + p.interest, 0);
    const remainingPrincipal = upcomingPayments.reduce((sum, p) => sum + p.principal, 0);
    const remainingMonths = upcomingPayments.length;
    const nextPayment = upcomingPayments[0];
    
    const progress = track.principal > 0 ? (paidPrincipal / track.principal) * 100 : 0;
    
    return {
      paidPrincipal,
      paidInterest,
      remainingPrincipal,
      remainingMonths,
      progress,
      nextPayment,
      isCompleted: remainingPrincipal === 0 && paidPrincipal > 0
    };
  };

  // Generate calendar days
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = monthStart.getDay();
  const paddingDays = Array(startPadding).fill(null);

  const handleDateSelect = (date: Date) => {
    if (date >= mortgage.startDate && date <= mortgage.endDate) {
      setSelectedDate(date);
      setShowCalendar(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subMonths(selectedDate, 1)
      : addMonths(selectedDate, 1);
    
    if (newDate >= mortgage.startDate && newDate <= mortgage.endDate) {
      setSelectedDate(newDate);
    }
  };

  const jumpToToday = () => {
    const today = new Date();
    if (today >= mortgage.startDate && today <= mortgage.endDate) {
      setSelectedDate(today);
    }
  };

  // Calculate overall progress based on selected date
  const overallProgress = snapshot ? 
    ((snapshot.totalPaidPrincipal / mortgage.originalAmount) * 100).toFixed(1) : '0';
  
  const monthsPassed = Math.floor(
    (selectedDate.getTime() - mortgage.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  
  const totalMonths = Math.floor(
    (mortgage.endDate.getTime() - mortgage.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  // Get all payments for full amortization
  const allPayments = Object.values(trackPayments).flat().sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );

  // Filter payments for schedule view
  const getFilteredPayments = (trackId: string | 'full') => {
    let payments = trackId === 'full' ? allPayments : (trackPayments[trackId] || []);
    
    if (scheduleFilterDate) {
      payments = payments.filter(p => 
        format(p.date, 'MM/yyyy') === format(scheduleFilterDate, 'MM/yyyy')
      );
    }
    
    return payments;
  };

  // Render amortization schedule
  const renderAmortizationSchedule = (trackId: string | 'full') => {
    const payments = getFilteredPayments(trackId);
    const paymentsPerPage = 12;
    const paginatedPayments = payments.slice(
      scheduleCurrentPage * paymentsPerPage,
      (scheduleCurrentPage + 1) * paymentsPerPage
    );
    const totalPages = Math.ceil(payments.length / paymentsPerPage);
    
    const track = trackId !== 'full' ? mortgage.tracks.find(t => t.id === trackId) : null;
    const dynamicValues = track ? calculateDynamicValues(track) : null;
    
    // Calculate totals
    const paidPayments = payments.filter(p => p.isPaid);
    const upcomingPayments = payments.filter(p => !p.isPaid);
    const totals = {
      paidPrincipal: paidPayments.reduce((sum, p) => sum + p.principal, 0),
      paidInterest: paidPayments.reduce((sum, p) => sum + p.interest, 0),
      remainingPrincipal: upcomingPayments.reduce((sum, p) => sum + p.principal, 0),
      remainingInterest: upcomingPayments.reduce((sum, p) => sum + p.interest, 0),
    };

    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="bg-gray-50 border-t-2 border-gray-200 p-6">
          {/* Schedule Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              לוח סילוקין - {trackId === 'full' ? 'כל המשכנתא' : track?.name}
            </h4>
            <button
              onClick={() => setExpandedSchedule(null)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">קרן ששולמה</p>
              <p className="text-lg font-bold text-gray-900">
                ₪{totals.paidPrincipal.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <p className="text-xs text-green-600 mb-1">קרן נותרת</p>
              <p className="text-lg font-bold text-gray-900">
                ₪{totals.remainingPrincipal.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <p className="text-xs text-orange-600 mb-1">ריבית ששולמה</p>
              <p className="text-lg font-bold text-gray-900">
                ₪{totals.paidInterest.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <p className="text-xs text-purple-600 mb-1">תשלומים נותרים</p>
              <p className="text-lg font-bold text-gray-900">
                {upcomingPayments.length}
              </p>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setScheduleViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  scheduleViewMode === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                רשימה
              </button>
              <button
                onClick={() => setScheduleViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  scheduleViewMode === 'timeline'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ציר זמן
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScheduleCalendar(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <CalendarDays className="w-4 h-4" />
                {scheduleFilterDate ? format(scheduleFilterDate, 'MM/yyyy', { locale: he }) : 'סנן לפי תאריך'}
              </button>
              {scheduleFilterDate && (
                <button
                  onClick={() => setScheduleFilterDate(null)}
                  className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Payments View */}
          {scheduleViewMode === 'list' ? (
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Table Header */}
              <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-gray-50 font-semibold text-sm text-gray-700 border-b">
                <div>#</div>
                <div>תאריך</div>
                <div>קרן</div>
                <div>ריבית</div>
                <div>סה"כ</div>
                <div>יתרה</div>
                <div>סטטוס</div>
              </div>

              {/* Payments List */}
              <div className="divide-y divide-gray-200">
                {paginatedPayments.map((payment) => {
                  const isNext = !payment.isPaid && paidPayments.length > 0 && 
                    paidPayments[paidPayments.length - 1].paymentNumber === payment.paymentNumber - 1;
                  
                  return (
                    <div
                      key={payment.id}
                      className={`grid grid-cols-7 gap-4 px-4 py-3 text-sm ${
                        payment.isPaid 
                          ? 'bg-gray-50 text-gray-600' 
                          : isNext
                            ? 'bg-purple-50'
                            : 'bg-white'
                      }`}
                    >
                      <div className="font-medium">
                        #{payment.paymentNumber}
                        {isNext && (
                          <span className="mr-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                            הבא
                          </span>
                        )}
                      </div>
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
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-4 h-4" />
                            ממתין
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Timeline View */
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="relative">
                <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                
                <div className="space-y-4">
                  {paginatedPayments.map((payment, index) => {
                    const isNext = !payment.isPaid && paidPayments.length > 0 && 
                      paidPayments[paidPayments.length - 1].paymentNumber === payment.paymentNumber - 1;
                    
                    return (
                      <div key={payment.id} className="relative flex gap-4">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center z-10
                          ${payment.isPaid 
                            ? 'bg-green-500' 
                            : isNext
                              ? 'bg-purple-600 ring-4 ring-purple-200'
                              : 'bg-gray-300'
                          }
                        `}>
                          {payment.isPaid ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <Clock className="w-4 h-4 text-white" />
                          )}
                        </div>
                        
                        <div className={`flex-1 p-3 rounded-lg border ${
                          payment.isPaid 
                            ? 'bg-gray-50 border-gray-200' 
                            : isNext
                              ? 'bg-purple-50 border-purple-300'
                              : 'bg-white border-gray-200'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-semibold">תשלום #{payment.paymentNumber}</span>
                              {isNext && (
                                <span className="mr-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                                  הבא
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-gray-600">
                              {format(payment.date, 'dd/MM/yyyy', { locale: he })}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm">
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
                            <div>
                              <span className="text-gray-600">יתרה: </span>
                              <span className="font-medium">₪{payment.remainingBalance.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                onClick={() => setScheduleCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={scheduleCurrentPage === 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <span className="text-sm text-gray-600">
                עמוד {scheduleCurrentPage + 1} מתוך {totalPages}
              </span>
              
              <button
                onClick={() => setScheduleCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={scheduleCurrentPage === totalPages - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Unified Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header with Timeline */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">המשכנתא שלך</h2>
              <p className="text-purple-100 flex items-center gap-2 text-sm">
                <Home className="w-4 h-4" />
                {mortgage.propertyAddress}
              </p>
            </div>
            
            {/* Date Navigation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={jumpToToday}
                className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors text-sm font-medium"
              >
                היום
              </button>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
              >
                <CalendarDays className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Date Navigation with Timeline */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigateMonth('prev')}
                disabled={selectedDate <= mortgage.startDate}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h3 className="text-lg font-bold">
                  {format(selectedDate, 'MMMM yyyy', { locale: he })}
                </h3>
                <p className="text-xs text-purple-200">
                  {format(selectedDate, 'dd/MM/yyyy', { locale: he })}
                </p>
              </div>

              <button
                onClick={() => navigateMonth('next')}
                disabled={selectedDate >= mortgage.endDate}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Timeline Progress */}
            <div className="relative">
              <div className="w-full bg-white/20 rounded-full h-2">
                <motion.div
                  animate={{ 
                    width: `${((selectedDate.getTime() - mortgage.startDate.getTime()) / 
                      (mortgage.endDate.getTime() - mortgage.startDate.getTime())) * 100}%` 
                  }}
                  className="bg-white rounded-full h-2"
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-purple-200 mt-2">
                <span>{format(mortgage.startDate, 'MM/yyyy', { locale: he })}</span>
                <span className="font-semibold text-white">
                  {monthsPassed} מתוך {totalMonths} חודשים
                </span>
                <span>{format(mortgage.endDate, 'MM/yyyy', { locale: he })}</span>
              </div>
            </div>
          </div>

          {/* Total Mortgage Summary Row */}
          <div 
            onClick={() => setExpandedSchedule(expandedSchedule === 'full' ? null : 'full')}
            className="bg-white/90 text-gray-900 rounded-lg p-4 mb-3 cursor-pointer hover:bg-white transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-600 mb-1">סך המשכנתא</p>
                  <p className="text-2xl font-bold">₪{mortgage.originalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">נותר לתשלום</p>
                  <p className="text-2xl font-bold">
                    ₪{snapshot ? snapshot.totalRemainingPrincipal.toLocaleString() : '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">התקדמות</p>
                  <p className="text-2xl font-bold">{overallProgress}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">תשלום חודשי כולל</p>
                  <p className="text-2xl font-bold">₪{mortgage.totalMonthlyPayment.toLocaleString()}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSchedule === 'full' ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {/* All Mortgage Tracks */}
          <div className="space-y-2">
            {mortgage.tracks.map((track) => {
              const dynamicValues = calculateDynamicValues(track);
              const trackTypeColor = {
                prime: 'bg-blue-50 text-blue-900 border-blue-200',
                fixed: 'bg-green-50 text-green-900 border-green-200',
                variable: 'bg-orange-50 text-orange-900 border-orange-200',
                adjustable: 'bg-purple-50 text-purple-900 border-purple-200',
                eligibility: 'bg-pink-50 text-pink-900 border-pink-200'
              }[track.type];

              return (
                <div
                  key={track.id}
                  onClick={() => setExpandedSchedule(expandedSchedule === track.id ? null : track.id)}
                  className={`${trackTypeColor} border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="min-w-[150px]">
                        <p className="font-semibold">{track.name}</p>
                        <p className="text-xs opacity-75">
                          {dynamicValues.isCompleted ? 'הושלם' : `${dynamicValues.remainingMonths} חודשים`}
                        </p>
                      </div>
                      <div className="grid grid-cols-5 gap-4 flex-1">
                        <div>
                          <p className="text-xs opacity-75">סכום מקורי</p>
                          <p className="font-semibold">₪{track.principal.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-75">יתרה</p>
                          <p className="font-semibold">₪{dynamicValues.remainingPrincipal.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-75">ריבית</p>
                          <p className="font-semibold">{track.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-75">תשלום חודשי</p>
                          <p className="font-semibold">₪{track.monthlyPayment.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-75">תשלום הבא</p>
                          <p className="font-semibold">
                            {dynamicValues.nextPayment 
                              ? format(dynamicValues.nextPayment.date, 'dd/MM', { locale: he })
                              : '-'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform ${expandedSchedule === track.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expandable Amortization Schedule */}
        <AnimatePresence>
          {expandedSchedule && renderAmortizationSchedule(expandedSchedule)}
        </AnimatePresence>

        {/* Rest of the content */}
        <div className="bg-gray-50 p-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">מקורי</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">₪{mortgage.originalAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">סכום ההלוואה</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600 font-medium">נותר</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₪{snapshot ? snapshot.totalRemainingPrincipal.toLocaleString() : '0'}
              </p>
              <p className="text-xs text-gray-600 mt-1">יתרת קרן</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Check className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-purple-600 font-medium">שולם</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₪{snapshot ? (snapshot.totalPaidPrincipal + snapshot.totalPaidInterest).toLocaleString() : '0'}
              </p>
              <p className="text-xs text-gray-600 mt-1">סה"כ שולם</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-orange-600 font-medium">נותרו</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {snapshot ? snapshot.totalRemainingPayments : 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">תשלומים</p>
            </div>
          </div>

          {/* Detailed Tracks Section */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">פירוט מסלולי המשכנתא</h3>
              <span className="text-sm text-gray-600">
                {mortgage.tracks.filter(t => !calculateDynamicValues(t).isCompleted).length} מסלולים פעילים
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mortgage.tracks.map((track) => {
                const dynamicValues = calculateDynamicValues(track);
                const monthsUntilAdjustment = track.nextAdjustmentDate 
                  ? differenceInMonths(track.nextAdjustmentDate, selectedDate)
                  : null;
                
                const trackTypeLabel = {
                  prime: 'פריים',
                  fixed: 'קבועה',
                  variable: 'משתנה',
                  adjustable: 'משתנה כל תקופה',
                  eligibility: 'זכאות'
                }[track.type];

                const trackTypeColor = {
                  prime: 'border-blue-300 bg-blue-50',
                  fixed: 'border-green-300 bg-green-50',
                  variable: 'border-orange-300 bg-orange-50',
                  adjustable: 'border-purple-300 bg-purple-50',
                  eligibility: 'border-pink-300 bg-pink-50'
                }[track.type];

                const trackTypeBadge = {
                  prime: 'bg-blue-100 text-blue-700 border-blue-200',
                  fixed: 'bg-green-100 text-green-700 border-green-200',
                  variable: 'bg-orange-100 text-orange-700 border-orange-200',
                  adjustable: 'bg-purple-100 text-purple-700 border-purple-200',
                  eligibility: 'bg-pink-100 text-pink-700 border-pink-200'
                }[track.type];

                return (
                  <motion.div
                    key={track.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setExpandedSchedule(expandedSchedule === track.id ? null : track.id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      dynamicValues.isCompleted ? 'opacity-60 bg-gray-50 border-gray-300' : trackTypeColor
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{track.name}</h4>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 border ${trackTypeBadge}`}>
                          {trackTypeLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRefinance(track.id);
                          }}
                          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
                          title="מחזור"
                        >
                          <RefreshCw className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">ריבית:</span>
                        <span className="font-semibold text-gray-900 mr-1">{track.interestRate}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">תשלום:</span>
                        <span className="font-semibold text-gray-900 mr-1">₪{track.monthlyPayment.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">שולם:</span>
                        <span className="font-semibold text-gray-900 mr-1">₪{dynamicValues.paidPrincipal.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">נותר:</span>
                        <span className="font-semibold text-gray-900 mr-1">₪{dynamicValues.remainingPrincipal.toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">התקדמות</span>
                        <span className="font-semibold text-gray-900">{dynamicValues.progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div 
                          animate={{ width: `${dynamicValues.progress}%` }}
                          className={`h-2 rounded-full ${
                            dynamicValues.isCompleted ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-500 to-blue-500'
                          }`}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1 text-gray-500">
                        <span>{dynamicValues.remainingMonths} חודשים נותרו</span>
                        {!dynamicValues.isCompleted && (
                          <span className="text-purple-600 font-medium">לחץ ללוח סילוקין →</span>
                        )}
                      </div>
                    </div>

                    {monthsUntilAdjustment !== null && monthsUntilAdjustment > 0 && monthsUntilAdjustment <= 3 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-orange-700 bg-orange-100 rounded-lg px-2 py-1 border border-orange-200">
                        <AlertCircle className="w-3 h-3" />
                        <span>עדכון ריבית בעוד {monthsUntilAdjustment} חודשים</span>
                      </div>
                    )}

                    {dynamicValues.isCompleted && (
                      <div className="mt-3 text-center text-xs text-gray-500 bg-gray-100 rounded-lg py-1">
                        הושלם
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Payment Distribution Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                התפלגות תשלומים עד התאריך הנבחר
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">קרן ששולמה</span>
                  <span className="font-semibold text-gray-900">
                    ₪{snapshot ? snapshot.totalPaidPrincipal.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ריבית ששולמה</span>
                  <span className="font-semibold text-gray-900">
                    ₪{snapshot ? snapshot.totalPaidInterest.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="font-medium text-gray-900">סה"כ שולם</span>
                  <span className="font-bold text-lg text-purple-600">
                    ₪{snapshot ? (snapshot.totalPaidPrincipal + snapshot.totalPaidInterest).toLocaleString() : '0'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                יתרות מהתאריך הנבחר
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">קרן נותרת</span>
                  <span className="font-semibold text-gray-900">
                    ₪{snapshot ? snapshot.totalRemainingPrincipal.toLocaleString() : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">תשלומים נותרים</span>
                  <span className="font-semibold text-gray-900">
                    {snapshot ? snapshot.totalRemainingPayments : 0}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <div className="text-xs text-gray-500 text-center">
                    התשלום החודשי הממוצע: ₪{mortgage.totalMonthlyPayment.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      <AnimatePresence>
        {(showCalendar || showScheduleCalendar) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCalendar(false);
              setShowScheduleCalendar(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {showScheduleCalendar ? 'בחר חודש לסינון' : 'בחר תאריך'}
                </h3>
                <button
                  onClick={() => {
                    setShowCalendar(false);
                    setShowScheduleCalendar(false);
                  }}
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
                
                <h4 className="font-semibold">
                  {format(calendarMonth, 'MMMM yyyy', { locale: he })}
                </h4>
                
                <button
                  onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {showScheduleCalendar ? (
                /* Month Selection for Filter */
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthDate = new Date(calendarMonth.getFullYear(), i, 1);
                    const isSelected = scheduleFilterDate && 
                      format(scheduleFilterDate, 'MM/yyyy') === format(monthDate, 'MM/yyyy');
                    
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setScheduleFilterDate(monthDate);
                          setShowScheduleCalendar(false);
                          setScheduleCurrentPage(0);
                        }}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {format(monthDate, 'MMM', { locale: he })}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Day Selection Grid */
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
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    const isDisabled = day < mortgage.startDate || day > mortgage.endDate;
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDateSelect(day)}
                        disabled={isDisabled}
                        className={`
                          p-2 rounded-lg text-sm transition-all
                          ${isSelected 
                            ? 'bg-purple-600 text-white' 
                            : isCurrentDay
                              ? 'bg-purple-100 text-purple-700 font-semibold'
                              : isDisabled
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'hover:bg-gray-100'
                          }
                        `}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {showScheduleCalendar ? (
                  <button
                    onClick={() => {
                      setScheduleFilterDate(null);
                      setShowScheduleCalendar(false);
                      setScheduleCurrentPage(0);
                    }}
                    className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    הסר סינון
                  </button>
                ) : (
                  <button
                    onClick={jumpToToday}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    היום
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCalendar(false);
                    setShowScheduleCalendar(false);
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}