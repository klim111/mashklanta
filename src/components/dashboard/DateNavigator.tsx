'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  TrendingUp,
  DollarSign,
  X
} from 'lucide-react';
import { DateSnapshot } from '@/types/mortgage';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { he } from 'date-fns/locale';

interface DateNavigatorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  snapshot: DateSnapshot | null;
  mortgageStartDate: Date;
  mortgageEndDate: Date;
}

export default function DateNavigator({
  currentDate,
  onDateChange,
  snapshot,
  mortgageStartDate,
  mortgageEndDate
}: DateNavigatorProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(currentDate);
  const [showDetails, setShowDetails] = useState(false);

  // Generate calendar days
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Add padding days for calendar grid
  const startPadding = monthStart.getDay();
  const paddingDays = Array(startPadding).fill(null);

  const handleDateSelect = (date: Date) => {
    if (date >= mortgageStartDate && date <= mortgageEndDate) {
      onDateChange(date);
      setShowCalendar(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subMonths(currentDate, 1)
      : addMonths(currentDate, 1);
    
    if (newDate >= mortgageStartDate && newDate <= mortgageEndDate) {
      onDateChange(newDate);
    }
  };

  const jumpToToday = () => {
    const today = new Date();
    if (today >= mortgageStartDate && today <= mortgageEndDate) {
      onDateChange(today);
    }
  };

  return (
    <>
      {/* Date Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">ניווט בזמן</h3>
          <div className="flex gap-2">
            <button
              onClick={jumpToToday}
              className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
            >
              היום
            </button>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            disabled={currentDate <= mortgageStartDate}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: he })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {format(currentDate, 'dd/MM/yyyy', { locale: he })}
            </p>
          </div>

          <button
            onClick={() => navigateMonth('next')}
            disabled={currentDate >= mortgageEndDate}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Progress */}
        <div className="mt-6">
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${((currentDate.getTime() - mortgageStartDate.getTime()) / 
                    (mortgageEndDate.getTime() - mortgageStartDate.getTime())) * 100}%` 
                }}
                className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full h-2"
              />
            </div>
            
            {/* Markers */}
            <div className="absolute top-1/2 transform -translate-y-1/2 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-purple-600 rounded-full border-2 border-white"
              style={{ 
                right: `${((currentDate.getTime() - mortgageStartDate.getTime()) / 
                  (mortgageEndDate.getTime() - mortgageStartDate.getTime())) * 100}%` 
              }}
            />
            <div className="absolute top-1/2 transform -translate-y-1/2 left-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
          </div>
          
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>{format(mortgageStartDate, 'MM/yyyy', { locale: he })}</span>
            <span className="font-semibold text-purple-600">
              {format(currentDate, 'MM/yyyy', { locale: he })}
            </span>
            <span>{format(mortgageEndDate, 'MM/yyyy', { locale: he })}</span>
          </div>
        </div>

        {/* Snapshot Summary */}
        {snapshot && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">קרן ששולמה</p>
              <p className="text-lg font-bold text-gray-900">
                ₪{snapshot.totalPaidPrincipal.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">ריבית ששולמה</p>
              <p className="text-lg font-bold text-gray-900">
                ₪{snapshot.totalPaidInterest.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">קרן נותרת</p>
              <p className="text-lg font-bold text-gray-900">
                ₪{snapshot.totalRemainingPrincipal.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">תשלומים נותרים</p>
              <p className="text-lg font-bold text-gray-900">
                {snapshot.totalRemainingPayments}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowDetails(true)}
          className="w-full mt-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          הצג פירוט מלא
        </button>
      </motion.div>

      {/* Calendar Modal */}
      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
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
                <h3 className="text-lg font-semibold">בחר תאריך</h3>
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
                  const isSelected = isSameDay(day, currentDate);
                  const isCurrentDay = isToday(day);
                  const isDisabled = day < mortgageStartDate || day > mortgageEndDate;
                  
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

              <div className="mt-4 flex gap-2">
                <button
                  onClick={jumpToToday}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  היום
                </button>
                <button
                  onClick={() => setShowCalendar(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Snapshot Modal */}
      <AnimatePresence>
        {showDetails && snapshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">מצב המשכנתא</h3>
                  <p className="text-gray-600 mt-1">
                    {format(currentDate, 'dd MMMM yyyy', { locale: he })}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Overall Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">סיכום כללי</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">סה"כ שולם</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₪{(snapshot.totalPaidPrincipal + snapshot.totalPaidInterest).toLocaleString()}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">קרן:</span>
                        <span className="font-medium">₪{snapshot.totalPaidPrincipal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ריבית:</span>
                        <span className="font-medium">₪{snapshot.totalPaidInterest.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">סה"כ נותר</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₪{snapshot.totalRemainingPrincipal.toLocaleString()}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">תשלומים:</span>
                        <span className="font-medium">{snapshot.totalRemainingPayments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Track Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">פירוט לפי מסלולים</h4>
                <div className="space-y-3">
                  {snapshot.trackSnapshots.map((track, index) => (
                    <div key={track.trackId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">מסלול {index + 1}</h5>
                        {track.nextAdjustment && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            עדכון ב-{format(track.nextAdjustment, 'MM/yyyy', { locale: he })}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">קרן ששולמה</p>
                          <p className="font-semibold">₪{track.paidPrincipal.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">קרן נותרת</p>
                          <p className="font-semibold">₪{track.remainingPrincipal.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">ריבית ששולמה</p>
                          <p className="font-semibold">₪{track.paidInterest.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">תשלומים נותרים</p>
                          <p className="font-semibold">{track.remainingPayments}</p>
                        </div>
                      </div>
                      
                      {/* Progress bar for this track */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full h-2"
                            style={{ 
                              width: `${(track.paidPrincipal / (track.paidPrincipal + track.remainingPrincipal)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="w-full mt-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                סגור
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
