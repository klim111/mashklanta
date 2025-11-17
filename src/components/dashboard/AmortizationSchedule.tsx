'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  TrendingUp,
  Download,
  Filter,
  Search,
  CalendarDays
} from 'lucide-react';
import { Payment } from '@/types/mortgage';
import { format, addMonths, isBefore, isAfter, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';

interface AmortizationScheduleProps {
  payments: Payment[];
  trackName: string;
  onDateSelect?: (date: Date) => void;
}

export default function AmortizationSchedule({ 
  payments, 
  trackName,
  onDateSelect 
}: AmortizationScheduleProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'upcoming'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const paymentsPerPage = 12;

  // Find the next payment
  const nextPaymentIndex = payments.findIndex(p => !p.isPaid);
  const currentPaymentIndex = nextPaymentIndex >= 0 ? nextPaymentIndex : payments.length - 1;

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = payments;
    
    if (filterStatus === 'paid') {
      filtered = filtered.filter(p => p.isPaid);
    } else if (filterStatus === 'upcoming') {
      filtered = filtered.filter(p => !p.isPaid);
    }

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.paymentNumber.toString().includes(searchTerm) ||
        format(p.date, 'MM/yyyy').includes(searchTerm)
      );
    }

    return filtered;
  }, [payments, filterStatus, searchTerm]);

  // Paginate payments
  const paginatedPayments = filteredPayments.slice(
    currentPage * paymentsPerPage,
    (currentPage + 1) * paymentsPerPage
  );

  const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);

  // Calculate totals
  const totals = useMemo(() => {
    const paid = payments.filter(p => p.isPaid);
    const upcoming = payments.filter(p => !p.isPaid);
    
    return {
      paidPrincipal: paid.reduce((sum, p) => sum + p.principal, 0),
      paidInterest: paid.reduce((sum, p) => sum + p.interest, 0),
      remainingPrincipal: upcoming.reduce((sum, p) => sum + p.principal, 0),
      remainingInterest: upcoming.reduce((sum, p) => sum + p.interest, 0),
      totalPaid: paid.reduce((sum, p) => sum + p.totalPayment, 0),
      totalRemaining: upcoming.reduce((sum, p) => sum + p.totalPayment, 0),
    };
  }, [payments]);

  // Jump to current payment
  const jumpToCurrent = () => {
    const pageIndex = Math.floor(currentPaymentIndex / paymentsPerPage);
    setCurrentPage(pageIndex);
    setFilterStatus('all');
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['מספר תשלום', 'תאריך', 'קרן', 'ריבית', 'סה"כ תשלום', 'יתרת קרן', 'סטטוס'];
    const rows = payments.map(p => [
      p.paymentNumber,
      format(p.date, 'dd/MM/yyyy'),
      p.principal.toFixed(2),
      p.interest.toFixed(2),
      p.totalPayment.toFixed(2),
      p.remainingBalance.toFixed(2),
      p.isPaid ? 'שולם' : 'ממתין'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `amortization_${trackName}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">לוח סילוקין - {trackName}</h3>
          <p className="text-sm text-gray-600 mt-1">
            תשלום {currentPaymentIndex + 1} מתוך {payments.length}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={jumpToCurrent}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            תשלום נוכחי
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            ייצוא
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-green-700 text-sm mb-1">קרן ששולמה</p>
          <p className="text-green-900 text-xl font-bold">₪{totals.paidPrincipal.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-orange-700 text-sm mb-1">ריבית ששולמה</p>
          <p className="text-orange-900 text-xl font-bold">₪{totals.paidInterest.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-blue-700 text-sm mb-1">קרן נותרת</p>
          <p className="text-blue-900 text-xl font-bold">₪{totals.remainingPrincipal.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-purple-700 text-sm mb-1">ריבית עתידית</p>
          <p className="text-purple-900 text-xl font-bold">₪{totals.remainingInterest.toLocaleString()}</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            רשימה
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'timeline'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ציר זמן
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-1">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">כל התשלומים</option>
            <option value="paid">שולמו</option>
            <option value="upcoming">עתידיים</option>
          </select>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="חיפוש לפי מספר או תאריך..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Payments View */}
      {viewMode === 'list' ? (
        <div>
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-3 bg-gray-50 rounded-lg font-semibold text-sm text-gray-700 mb-2">
            <div>#</div>
            <div>תאריך</div>
            <div>קרן</div>
            <div>ריבית</div>
            <div>סה"כ</div>
            <div>יתרה</div>
            <div>סטטוס</div>
          </div>

          {/* Payments List */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              {paginatedPayments.map((payment) => {
                const isNext = payment.paymentNumber === currentPaymentIndex + 1;
                
                return (
                  <motion.div
                    key={payment.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => onDateSelect?.(payment.date)}
                    className={`
                      grid grid-cols-1 md:grid-cols-7 gap-4 p-4 rounded-lg cursor-pointer transition-all
                      ${payment.isPaid 
                        ? 'bg-gray-50 text-gray-600' 
                        : isNext
                          ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300'
                          : 'bg-white border border-gray-200 hover:border-purple-300'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{payment.paymentNumber}</span>
                      {isNext && (
                        <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                          הבא
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm md:text-base">
                      {format(payment.date, 'dd/MM/yyyy', { locale: he })}
                    </div>
                    
                    <div className="text-sm md:text-base">
                      ₪{payment.principal.toLocaleString()}
                    </div>
                    
                    <div className="text-sm md:text-base">
                      ₪{payment.interest.toLocaleString()}
                    </div>
                    
                    <div className="font-semibold">
                      ₪{payment.totalPayment.toLocaleString()}
                    </div>
                    
                    <div className="text-sm md:text-base">
                      ₪{payment.remainingBalance.toLocaleString()}
                    </div>
                    
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
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-8 h-8 rounded-lg transition-colors ${
                      currentPage === i
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Timeline View */
        <div className="relative">
          <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          <div className="space-y-4">
            {paginatedPayments.map((payment, index) => {
              const isNext = payment.paymentNumber === currentPaymentIndex + 1;
              
              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex gap-4"
                >
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
                  
                  <div 
                    onClick={() => onDateSelect?.(payment.date)}
                    className={`
                      flex-1 p-4 rounded-lg cursor-pointer transition-all
                      ${payment.isPaid 
                        ? 'bg-gray-50' 
                        : isNext
                          ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300'
                          : 'bg-white border border-gray-200 hover:border-purple-300'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-semibold">תשלום #{payment.paymentNumber}</span>
                        {isNext && (
                          <span className="mr-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                            הבא
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {format(payment.date, 'dd/MM/yyyy', { locale: he })}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
