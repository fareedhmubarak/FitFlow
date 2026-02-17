import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameMonth, isSameDay, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Users, CreditCard, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { membershipService } from '@/lib/membershipService';
import { CalendarPaymentData } from '@/lib/membershipService';
import { GymLoader } from '@/components/ui/GymLoader';

interface DayData {
  date: Date;
  payments: CalendarPaymentData[];
  totalAmount: number;
  hasPayments: boolean;
}

export default function EnhancedPaymentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get calendar data for the current month
  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['calendar-data', currentMonth],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = addDays(monthStart, -monthStart.getDay()); // Start from Sunday
      const endDate = addDays(monthEnd, 6 - monthEnd.getDay()); // End on Saturday

      return await membershipService.getCalendarData(startDate, endDate);
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = addDays(monthStart, -monthStart.getDay());
  const endDate = addDays(monthEnd, 6 - monthEnd.getDay());

  // Group payments by date
  const getDayData = (date: Date): DayData => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayPayments = calendarData?.filter(p => p.due_date === dateStr) || [];

    return {
      date,
      payments: dayPayments,
      totalAmount: dayPayments.reduce((sum, p) => sum + p.amount_due, 0),
      hasPayments: dayPayments.length > 0
    };
  };

  // Generate all days for the calendar grid
  const generateCalendarDays = (): DayData[] => {
    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(getDayData(new Date(current)));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => addMonths(prev, -1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
    setSelectedDate(null);
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'due_today': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3" />;
      case 'due_today': return <Clock className="w-3 h-3" />;
      case 'overdue': return <AlertTriangle className="w-3 h-3" />;
      case 'upcoming': return <Calendar className="w-3 h-3" />;
      default: return <CreditCard className="w-3 h-3" />;
    }
  };

  const handleDayClick = (dayData: DayData) => {
    setSelectedDate(dayData.date);
  };

  const handlePreviousDay = () => {
    if (selectedDate) {
      setSelectedDate(prev => prev ? addDays(prev, -1) : null);
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      setSelectedDate(prev => prev ? addDays(prev, 1) : null);
    }
  };

  const selectedDayData = selectedDate ? getDayData(selectedDate) : null;

  if (isLoading) {
    return <GymLoader message="Loading calendar..." variant="calendar" />;
  }

  const monthStats = calendarData?.reduce((acc, payment) => {
    const paymentMonth = new Date(payment.due_date);
    if (isSameMonth(paymentMonth, currentMonth)) {
      acc.totalAmount += payment.amount_due;
      acc.totalPayments += 1;

      if (payment.payment_status === 'overdue') {
        acc.overdueAmount += payment.amount_due;
        acc.overdueCount += 1;
      }

      if (payment.payment_status === 'paid') {
        acc.paidAmount += payment.amount_due;
        acc.paidCount += 1;
      }
    }
    return acc;
  }, { totalAmount: 0, totalPayments: 0, overdueAmount: 0, overdueCount: 0, paidAmount: 0, paidCount: 0 });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h1>
              <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>{monthStats?.totalPayments || 0} Total</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>{monthStats?.overdueCount || 0} Overdue</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>{monthStats?.paidCount || 0} Paid</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Month Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{(monthStats?.totalAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{(monthStats?.overdueAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collected</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(monthStats?.paidAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weeks.map((week, weekIndex) => (
              week.map((dayData, dayIndex) => {
                const isCurrentMonth = isSameMonth(dayData.date, currentMonth);
                const isToday = isSameDay(dayData.date, new Date());
                const isSelected = selectedDate && isSameDay(dayData.date, selectedDate);

                return (
                  <motion.div
                    key={`${weekIndex}-${dayIndex}`}
                    layout
                    whileHover={{ scale: dayData.hasPayments ? 1.02 : 1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => dayData.hasPayments && handleDayClick(dayData)}
                    className={`
                      min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all relative
                      ${!isCurrentMonth ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-white text-gray-900 border-gray-300'}
                      ${dayData.hasPayments ? 'hover:shadow-md' : ''}
                      ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                      ${isToday ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className="text-xs font-medium mb-1">
                      {format(dayData.date, 'd')}
                    </div>

                    {dayData.hasPayments && (
                      <div className="space-y-1">
                        {dayData.payments.slice(0, 2).map((payment, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-1 text-xs px-1 py-0.5 rounded border ${getStatusColor(payment.payment_status)}`}
                            title={payment.member_name}
                          >
                            {getStatusIcon(payment.payment_status)}
                            <span className="truncate max-w-full">
                              ₹{payment.amount_due.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}

                        {dayData.payments.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayData.payments.length - 2} more
                          </div>
                        )}

                        {dayData.totalAmount > 0 && (
                          <div className="text-xs font-medium text-gray-700 text-center">
                            Total: ₹{dayData.totalAmount.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })
            ))}
          </div>
        </div>

        {/* Selected Day Details */}
        <AnimatePresence>
          {selectedDayData && selectedDayData.hasPayments && (
            <motion.div
              key="selected-day-details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {format(selectedDayData.date, 'EEEE, MMMM d, yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousDay}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleNextDay}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {selectedDayData.payments.map((payment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${getStatusColor(payment.payment_status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{payment.member_name}</p>
                          <p className="text-xs text-gray-600">
                            {payment.payment_status === 'overdue' && `${payment.days_overdue} days overdue`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ₹{payment.amount_due.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs">
                          {payment.payment_status === 'paid' ? 'Paid' :
                           payment.payment_status === 'due_today' ? 'Due today' :
                           payment.payment_status === 'overdue' ? 'Overdue' : 'Upcoming'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {selectedDayData.totalAmount > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-600">Day Total</p>
                      <p className="text-lg font-bold text-gray-900">
                        ₹{selectedDayData.totalAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}