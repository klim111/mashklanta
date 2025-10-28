import React, { useState, useEffect, useCallback } from 'react';

interface InfiniteCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  debtPaymentDay: number;
  savingsPaymentDay: number;
}

export const InfiniteCalendar: React.FC<InfiniteCalendarProps> = ({
  currentDate,
  onDateChange,
  debtPaymentDay,
  savingsPaymentDay
}) => {
  const [visibleDays, setVisibleDays] = useState<Date[]>([]);
  const [dayOffset, setDayOffset] = useState(0);

  // Generate visible days for infinite calendar - one month view
  const generateVisibleDays = useCallback((centerDate: Date, offset: number = 0) => {
    const days = [];
    
    // Generate days for one month (approximately 30-31 days)
    // Start from the first day of the current month
    const firstDayOfMonth = new Date(centerDate.getFullYear(), centerDate.getMonth(), 1);
    const lastDayOfMonth = new Date(centerDate.getFullYear(), centerDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Generate all days of the current month
    for (let i = 0; i < daysInMonth; i++) {
      const day = new Date(firstDayOfMonth);
      day.setDate(day.getDate() + i + offset);
      day.setHours(0, 0, 0, 0);
      days.push(day);
    }
    
    return days;
  }, []);

  // Update visible days when current date changes
  useEffect(() => {
    const newVisibleDays = generateVisibleDays(currentDate, dayOffset);
    setVisibleDays(newVisibleDays);
  }, [currentDate, dayOffset, generateVisibleDays]);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        handleNavigation('forward'); // RTL: left arrow goes to next day
      } else if (event.key === 'ArrowRight') {
        handleNavigation('backward'); // RTL: right arrow goes to previous day
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentDate, dayOffset]);

  const handleDayClick = (dayDate: Date) => {
    setDayOffset(0);
    onDateChange(dayDate);
  };

  const handleNavigation = (direction: 'forward' | 'backward') => {
    const newDate = new Date(currentDate);
    
    if (direction === 'forward') {
      // Move to next day
      newDate.setDate(newDate.getDate() + 1);
      setDayOffset(prev => prev + 1);
    } else {
      // Move to previous day
      newDate.setDate(newDate.getDate() - 1);
      setDayOffset(prev => prev - 1);
    }
    
    // Check if we need to regenerate days (when we get close to edges)
    if (Math.abs(dayOffset) > 15) {
      setDayOffset(0);
    }
    
    onDateChange(newDate);
  };

  return (
    <div className="relative h-24 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-inner w-full" dir="rtl">
      {/* Full width container for days */}
      <div className="relative h-full w-full flex items-center">
        {/* Generate days that fill the entire width */}
        {visibleDays.map((dayDate, index) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dayDate.setHours(0, 0, 0, 0);
          
          const isToday = dayDate.getTime() === today.getTime();
          const isSelected = dayDate.getTime() === currentDate.getTime();
          const isPaymentDay = dayDate.getDate() === debtPaymentDay || dayDate.getDate() === savingsPaymentDay;
          const isPast = dayDate < today;
          const dayOfWeek = dayDate.getDay();
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 0; // Friday or Saturday
          const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
          
          // Calculate position - RTL: days move from right to left
          // Each day takes equal width of the month
          const totalDays = visibleDays.length;
          const dayWidth = 100 / totalDays; // Each day takes equal width
          const rightPosition = (index * dayWidth);
          
          return (
            <div
              key={`${dayDate.getTime()}-${index}`}
              className={`
                absolute flex flex-col items-center justify-center cursor-pointer
                border-l border-gray-200 transition-all duration-300 ease-out
                ${isSelected ? 'bg-blue-600 text-white shadow-lg z-20' : ''}
                ${isToday && !isSelected ? 'bg-green-500 text-white z-15' : ''}
                ${isWeekend && !isSelected && !isToday ? 'bg-gray-100' : ''}
                ${!isSelected && !isToday ? 'hover:bg-blue-50 z-10' : ''}
                ${isPast ? 'opacity-70' : 'opacity-100'}
              `}
              style={{
                right: `${rightPosition}%`,
                width: `${dayWidth}%`,
                height: '100%',
                minHeight: '96px'
              }}
              onClick={() => handleDayClick(dayDate)}
              title={`${dayDate.toLocaleDateString('he-IL')} ${isPaymentDay ? '(יום תשלום)' : ''}`}
            >
              {/* Day of week - consistent size */}
              <div className={`text-xs font-semibold leading-tight ${isSelected || isToday ? 'text-white' : 'text-gray-600'}`}>
                {dayNames[dayOfWeek]}
              </div>
              
              {/* Day number - consistent size */}
              <div className={`text-base font-bold leading-tight ${isSelected || isToday ? 'text-white' : 'text-gray-900'}`}>
                {dayDate.getDate()}
              </div>
              
              {/* Payment indicators - consistent size */}
              {isPaymentDay && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {dayDate.getDate() === debtPaymentDay && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="תשלום חוב" />
                  )}
                  {dayDate.getDate() === savingsPaymentDay && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="הפקדת חיסכון" />
                  )}
                </div>
              )}
              
              {/* Today indicator - consistent size */}
              {isToday && !isSelected && (
                <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
              
              {/* Selected day border - clean design */}
              {isSelected && (
                <div className="absolute inset-0 border-2 border-white rounded-sm pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Navigation arrows - RTL positioned */}
      <button
        onClick={() => handleNavigation('backward')}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-md z-30"
        title="יום קודם"
      >
        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      
      <button
        onClick={() => handleNavigation('forward')}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 w-7 h-7 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 shadow-md z-30"
        title="יום הבא"
      >
        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      {/* Current month/year display - RTL positioned */}
      <div className="absolute top-2 right-1/2 transform translate-x-1/2 text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded shadow-sm z-30">
        {currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
};
