import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface CalendarProps {
  year: number;
  month: number;
  paymentsByDate: Record<string, any>;
  onDateClick: (date: string) => void;
  selectedDate: string | null;
}

export default function Calendar({ year, month, paymentsByDate, onDateClick, selectedDate }: CalendarProps) {
  const { t } = useTranslation();

  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = monthStart.getDay();

  // Pad beginning with empty cells
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = paymentsByDate[dateStr];

    if (!dayData) return 'none';

    const today = startOfDay(new Date());
    const dayDate = startOfDay(date);

    // All paid
    if (dayData.statuses.succeeded === dayData.memberCount) {
      return 'paid';
    }

    // Has pending/failed payments
    if (dayData.statuses.pending > 0 || dayData.statuses.failed > 0) {
      // Check if overdue
      if (isBefore(dayDate, today)) {
        const daysOverdue = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue >= 8) {
          return 'overdue-late'; // 8+ days overdue
        } else if (daysOverdue >= 1) {
          return 'overdue-early'; // 1-7 days overdue
        }
      }

      // Due today or upcoming
      return 'due';
    }

    return 'none';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-payment-paid text-white';
      case 'due':
        return 'bg-payment-due text-white';
      case 'overdue-early':
        return 'bg-payment-overdue-early text-white';
      case 'overdue-late':
        return 'bg-payment-overdue-late text-white';
      default:
        return 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600';
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-payment-paid"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('payments.calendar.today')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-payment-due"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('payments.calendar.dueToday')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-payment-overdue-early"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('payments.calendar.overdueEarly')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-payment-overdue-late"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('payments.calendar.overdueLate')}</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}

        {/* Padding days */}
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="aspect-square"></div>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayData = paymentsByDate[dateStr];
          const status = getDayStatus(day);
          const isSelected = selectedDate === dateStr;
          const isTodayDate = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => onDateClick(dateStr)}
              className={`aspect-square rounded-lg p-2 transition-all ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-2'
                  : ''
              } ${getStatusColor(status)} ${
                isTodayDate && status === 'none'
                  ? 'ring-2 ring-primary'
                  : ''
              }`}
            >
              <div className="flex flex-col h-full">
                <span className={`text-sm font-semibold ${
                  isTodayDate ? 'text-primary' : ''
                }`}>
                  {format(day, 'd')}
                </span>
                {dayData && (
                  <div className="mt-1 flex-1">
                    <div className="text-xs font-medium">
                      {dayData.memberCount}
                    </div>
                    {dayData.totalAmount > 0 && (
                      <div className="text-xs opacity-90">
                        ₹{(dayData.totalAmount / 1000).toFixed(1)}k
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
