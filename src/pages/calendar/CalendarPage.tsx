import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, Gift, IndianRupee, UserCheck, X, AlertCircle, Phone, MessageCircle, Users, TrendingUp, CreditCard, Download, Filter, ArrowUpDown, CheckCircle2 } from 'lucide-react';

// Animated counter component for dopamine hit
const AnimatedNumber = ({ value, prefix = '', suffix = '', className = '' }: { value: number; prefix?: string; suffix?: string; className?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span className={className}>{prefix}{displayValue.toLocaleString('en-IN')}{suffix}</span>;
};
import { gymService, CalendarEvent, EnhancedDashboardStats } from '@/lib/gymService';
import { GymLoader } from '@/components/ui/GymLoader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedMemberPopup, type UnifiedMemberData } from '@/components/common/UnifiedMemberPopup';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import toast from 'react-hot-toast';

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventsSheet, setShowEventsSheet] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [listFilter, setListFilter] = useState<'all' | 'overdue' | 'due' | 'paid'>('all');
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'overdue' | 'due' | 'paid'>('all');
  const [sortOrder, setSortOrder] = useState<'date-asc' | 'date-desc' | 'amount-desc'>('date-asc');
  
  // Member popup state
  const [selectedMember, setSelectedMember] = useState<UnifiedMemberData | null>(null);
  const [showMemberPopup, setShowMemberPopup] = useState(false);

  // Get start and end of current month for query
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Fetch calendar events
  const { data: events, isLoading: eventsLoading, refetch } = useQuery({
    queryKey: ['calendar-events', format(currentMonth, 'yyyy-MM')],
    queryFn: () => gymService.getCalendarEvents(monthStart, monthEnd),
  });

  // Fetch dashboard stats for the stats cards
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['calendar-stats', format(currentMonth, 'yyyy-MM')],
    queryFn: () => gymService.getEnhancedDashboardStats(),
  });

  // Get calendar weeks (including padding days from prev/next month)
  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    const firstWeekStart = startOfWeek(monthStart);
    const lastWeekEnd = endOfWeek(monthEnd);
    const allDays = eachDayOfInterval({ start: firstWeekStart, end: lastWeekEnd });
    
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }
    return weeks;
  }, [monthStart, monthEnd]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events?.forEach(event => {
      const dateKey = event.event_date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Calculate stats from events (only current month)
  const monthStats = useMemo(() => {
    if (!events) return { pendingCount: 0, pendingAmount: 0, paidCount: 0, paidAmount: 0, multiMonthCount: 0 };
    
    // Get current month boundaries
    const monthStartDate = format(monthStart, 'yyyy-MM-dd');
    const monthEndDate = format(monthEnd, 'yyyy-MM-dd');
    
    // Filter to current month only
    const currentMonthEvents = events.filter(e => 
      e.event_date >= monthStartDate && e.event_date <= monthEndDate
    );
    
    const pendingEvents = currentMonthEvents.filter(e => e.event_type === 'payment_due' || e.urgency === 'overdue');
    const paidEvents = currentMonthEvents.filter(e => e.event_type === 'payment');
    
    // Count multi-month plans (3M, 6M, 12M) - check plan_name for non-monthly plans
    const isMultiMonthPlan = (planName: string | null | undefined) => {
      if (!planName) return false;
      const lowerPlan = planName.toLowerCase();
      return lowerPlan.includes('quarter') || lowerPlan.includes('3 month') || lowerPlan.includes('3m') ||
             lowerPlan.includes('half') || lowerPlan.includes('6 month') || lowerPlan.includes('6m') ||
             lowerPlan.includes('year') || lowerPlan.includes('12 month') || lowerPlan.includes('12m') ||
             lowerPlan.includes('annual');
    };
    
    // Get unique members with multi-month plans who have dues this month
    const multiMonthMembers = new Set<string>();
    pendingEvents.forEach(e => {
      if (isMultiMonthPlan(e.plan_name)) {
        multiMonthMembers.add(e.member_id);
      }
    });
    
    return {
      pendingCount: pendingEvents.length,
      pendingAmount: pendingEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
      paidCount: paidEvents.length,
      paidAmount: paidEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
      multiMonthCount: multiMonthMembers.size
    };
  }, [events, monthStart, monthEnd]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  }, [selectedDate, eventsByDate]);

  // Get all events grouped by type for list view
  const eventsByType = useMemo(() => {
    if (!events) return { overdue: [], today: [], upcoming: [], birthdays: [], payments: [] };
    return {
      overdue: events.filter(e => e.urgency === 'overdue' && e.event_type !== 'payment'),
      today: events.filter(e => e.urgency === 'today' && e.event_type !== 'payment' && e.event_type !== 'birthday'),
      upcoming: events.filter(e => e.urgency === 'upcoming' && e.event_type !== 'payment' && e.event_type !== 'birthday'),
      birthdays: events.filter(e => e.event_type === 'birthday'),
      payments: events.filter(e => e.event_type === 'payment')
    };
  }, [events]);

  // Get sorted and filtered events for table view
  const tableData = useMemo(() => {
    if (!events) return [];
    
    // Get current month boundaries
    const monthStartDate = format(monthStart, 'yyyy-MM-dd');
    const monthEndDate = format(monthEnd, 'yyyy-MM-dd');
    
    // Filter events - only current month data and exclude birthdays
    let filtered = events.filter(e => {
      const eventDate = e.event_date;
      return e.event_type !== 'birthday' && 
             eventDate >= monthStartDate && 
             eventDate <= monthEndDate;
    });
    
    // Apply status filter
    if (listFilter === 'overdue') {
      filtered = filtered.filter(e => e.urgency === 'overdue');
    } else if (listFilter === 'due') {
      filtered = filtered.filter(e => e.event_type === 'payment_due' && e.urgency !== 'overdue');
    } else if (listFilter === 'paid') {
      filtered = filtered.filter(e => e.event_type === 'payment');
    }
    
    // Sort
    return filtered.sort((a, b) => {
      if (sortOrder === 'date-asc') {
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      } else if (sortOrder === 'date-desc') {
        return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
      } else {
        return (b.amount || 0) - (a.amount || 0);
      }
    });
  }, [events, listFilter, sortOrder, monthStart, monthEnd]);

  // Export to CSV - helper function with proper download
  const downloadCSV = (content: string, fileName: string) => {
    // Add BOM for Excel compatibility with UTF-8
    const BOM = '\uFEFF';
    const csvContent = BOM + content;
    
    // Use data URI approach which works more reliably across browsers
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to CSV (for list view)
  const handleExport = () => {
    if (!tableData.length) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['Date', 'Member Name', 'Phone', 'Plan', 'Amount', 'Status'];
    const rows = tableData.map(e => [
      format(new Date(e.event_date), 'dd/MM/yyyy'),
      e.member_name,
      e.member_phone,
      e.plan_name || '-',
      e.amount ? `${e.amount}` : '-',
      e.event_type === 'payment' ? 'Paid' : e.urgency === 'overdue' ? 'Overdue' : 'Due'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const filterSuffix = listFilter !== 'all' ? `_${listFilter}` : '';
    downloadCSV(csvContent, `FitFlow_Calendar${filterSuffix}_${format(currentMonth, 'MMM-yyyy')}.csv`);
    toast.success('Exported successfully!');
  };

  // Export calendar view data
  const handleCalendarExport = () => {
    const filteredCalendarEvents = getFilteredCalendarEvents();
    if (!filteredCalendarEvents.length) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['Date', 'Member Name', 'Phone', 'Plan', 'Amount', 'Status'];
    const rows = filteredCalendarEvents.map(e => [
      format(new Date(e.event_date), 'dd/MM/yyyy'),
      e.member_name,
      e.member_phone,
      e.plan_name || '-',
      e.amount ? `${e.amount}` : '-',
      e.event_type === 'payment' ? 'Paid' : e.urgency === 'overdue' ? 'Overdue' : 'Due'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const filterSuffix = calendarFilter !== 'all' ? `_${calendarFilter}` : '';
    downloadCSV(csvContent, `FitFlow_Calendar${filterSuffix}_${format(currentMonth, 'MMM-yyyy')}.csv`);
    toast.success('Exported successfully!');
  };

  // Get filtered events for calendar view
  const getFilteredCalendarEvents = () => {
    if (!events) return [];
    
    const monthStartDate = format(monthStart, 'yyyy-MM-dd');
    const monthEndDate = format(monthEnd, 'yyyy-MM-dd');
    
    let filtered = events.filter(e => {
      const eventDate = e.event_date;
      return e.event_type !== 'birthday' && 
             eventDate >= monthStartDate && 
             eventDate <= monthEndDate;
    });
    
    if (calendarFilter === 'overdue') {
      filtered = filtered.filter(e => e.urgency === 'overdue');
    } else if (calendarFilter === 'due') {
      filtered = filtered.filter(e => e.event_type === 'payment_due' && e.urgency !== 'overdue');
    } else if (calendarFilter === 'paid') {
      filtered = filtered.filter(e => e.event_type === 'payment');
    }
    
    return filtered;
  };

  // Filtered events by date for calendar view
  const filteredEventsByDate = useMemo(() => {
    const filtered = getFilteredCalendarEvents();
    const grouped: Record<string, CalendarEvent[]> = {};
    filtered.forEach(event => {
      const dateKey = event.event_date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events, calendarFilter, monthStart, monthEnd]);

  // Navigation
  const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => {
    // Only allow navigation to months up to current month
    const nextMonth = addMonths(currentMonth, 1);
    const now = new Date();
    if (nextMonth.getFullYear() < now.getFullYear() || 
       (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() <= now.getMonth())) {
      setCurrentMonth(nextMonth);
    }
  };
  
  // Check if we can go to next month
  const canGoNext = useMemo(() => {
    const nextMonth = addMonths(currentMonth, 1);
    const now = new Date();
    return nextMonth.getFullYear() < now.getFullYear() || 
          (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() <= now.getMonth());
  }, [currentMonth]);
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
    setShowEventsSheet(true);
  };

  // Handle date selection
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventsSheet(true);
  };

  // Handle member click - open unified popup and close events sheet
  const handleMemberClick = (event: CalendarEvent) => {
    // Close the events sheet first so only one popup shows
    setShowEventsSheet(false);
    
    const memberData: UnifiedMemberData = {
      id: event.member_id,
      name: event.member_name,
      phone: event.member_phone,
      photo_url: event.photo_url,
      status: (event.status as 'active' | 'inactive') || 'active',
      plan_name: event.plan_name || undefined,
      plan_amount: event.amount || undefined,
      amount_due: event.urgency === 'overdue' || event.event_type === 'payment_due' ? event.amount || undefined : undefined,
      joining_date: event.joining_date,
      membership_end_date: event.membership_end_date
    };
    setSelectedMember(memberData);
    setShowMemberPopup(true);
  };

  // Handle popup close and update
  const handlePopupClose = () => {
    setShowMemberPopup(false);
    setSelectedMember(null);
  };

  const handlePopupUpdate = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-stats'] });
  };

  // Get status icon for avatar
  const getStatusIcon = (event: CalendarEvent) => {
    if (event.event_type === 'payment') {
      return <div className="w-3 h-3 rounded-full bg-green-500 border border-white flex items-center justify-center">
        <span className="text-[6px] text-white font-bold">✓</span>
      </div>;
    }
    if (event.event_type === 'birthday') {
      return <div className="w-3 h-3 rounded-full bg-purple-500 border border-white flex items-center justify-center">
        <span className="text-[6px]">🎂</span>
      </div>;
    }
    if (event.urgency === 'overdue' || event.event_type === 'payment_due') {
      return <div className="w-3 h-3 rounded-full bg-amber-500 border border-white flex items-center justify-center">
        <span className="text-[6px] text-white font-bold">₹</span>
      </div>;
    }
    return null;
  };

  // Get status badge styles
  const getStatusBadge = (event: CalendarEvent) => {
    if (event.event_type === 'payment') {
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' };
    }
    if (event.event_type === 'birthday') {
      return { bg: 'bg-purple-100', text: 'text-purple-700', label: '🎂 Birthday' };
    }
    switch (event.urgency) {
      case 'overdue':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' };
      case 'today':
        return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Today' };
      case 'upcoming':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Upcoming' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Info' };
    }
  };

  // Section Header Component for List View
  const SectionHeader = ({ icon, title, count, color }: { icon: React.ReactNode; title: string; count: number; color: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <h3 className="font-semibold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{title}</h3>
      <span className="ml-auto text-sm" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{count} member{count !== 1 ? 's' : ''}</span>
    </div>
  );

  // Member Card Component for List View and Sheet
  // Compact member list item for date popup
  const CompactMemberItem = ({ event }: { event: CalendarEvent }) => {
    const status = getStatusBadge(event);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleMemberClick(event)}
        className="flex items-center gap-2.5 p-2 rounded cursor-pointer transition-all hover:bg-black/5"
        style={{ 
          backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.4))', 
        }}
      >
        <Avatar className="w-8 h-8 border border-white/50 shadow-sm flex-shrink-0">
          <AvatarImage src={event.photo_url || undefined} alt={event.member_name} />
          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[10px] font-semibold">
            {event.member_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate text-xs" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
            {event.member_name}
          </h4>
          <p className="text-[10px] truncate" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
            {event.event_title}
          </p>
        </div>
        
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          {event.amount && (
            <span className={`text-xs font-semibold ${event.urgency === 'overdue' ? 'text-red-500' : 'text-emerald-600'}`}>
              ₹{event.amount.toLocaleString('en-IN')}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
      </motion.div>
    );
  };
  
  // Full member card for the list view (not popup)
  const MemberCard = ({ event, showDate = false }: { event: CalendarEvent; showDate?: boolean }) => {
    const status = getStatusBadge(event);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleMemberClick(event)}
        className="backdrop-blur-xl rounded-2xl p-4 shadow-lg cursor-pointer transition-all"
        style={{ 
          backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', 
          borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))',
          borderWidth: '1px' 
        }}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 border-2 border-white shadow-md">
            <AvatarImage src={event.photo_url || undefined} alt={event.member_name} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-semibold">
              {event.member_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-semibold truncate text-sm" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{event.member_name}</h4>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{event.event_title}</p>
            {showDate && (
              <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{format(new Date(event.event_date), 'dd MMM')}</p>
            )}
          </div>
          
          {event.amount && (
            <p className={`text-sm font-bold ${event.urgency === 'overdue' ? 'text-red-500' : event.event_type === 'payment' ? 'text-green-500' : ''}`}
               style={event.urgency !== 'overdue' && event.event_type !== 'payment' ? { color: 'var(--theme-text-primary, #0f172a)' } : undefined}>
              ₹{event.amount.toLocaleString('en-IN')}
            </p>
          )}
        </div>
        
        <div className="flex gap-2 mt-3 pt-2" style={{ borderTopColor: 'var(--theme-glass-border, rgba(203,213,225,0.3))', borderTopWidth: '1px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://wa.me/91${event.member_phone}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-50 rounded text-green-600 text-xs font-medium"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${event.member_phone}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 rounded text-blue-600 text-xs font-medium"
          >
            <Phone className="w-3.5 h-3.5" />
            Call
          </button>
        </div>
      </motion.div>
    );
  };

  const isLoading = eventsLoading || statsLoading;

  if (isLoading) {
    return <GymLoader message="Loading calendar..." />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden font-[Urbanist]" style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Static gradient blobs - CSS animation for better performance */}
      <div 
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob" 
        style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }}
      />
      <div 
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" 
        style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-3 pb-1 relative z-50"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        {/* Line 1: Logo | Title | Profile */}
        <div className="flex items-center justify-between mb-1">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30"
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
            </svg>
          </motion.div>
          <h1 className="text-base font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Calendar</h1>
          <UserProfileDropdown />
        </div>

        {/* Line 2: View Toggle */}
        <div className="flex items-center justify-end gap-2 mb-1">
          {/* View Toggle */}
          <div className="flex rounded-full p-0.5" style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                  : ''
              }`}
              style={viewMode !== 'calendar' ? { color: 'var(--theme-text-secondary, #64748b)' } : undefined}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                  : ''
              }`}
              style={viewMode !== 'list' ? { color: 'var(--theme-text-secondary, #64748b)' } : undefined}
            >
              List
            </button>
          </div>
        </div>

        {/* Stats Cards - 2x2 grid by default, single row only on very small screens (<360px) */}
        <div className="calendar-stats-grid grid grid-cols-2 gap-1.5 mb-1.5">
          {/* Active Members */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded p-2.5 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] font-medium opacity-90 whitespace-nowrap">Active</span>
            </div>
            <p className="text-xl font-bold"><AnimatedNumber value={stats?.members?.active || 0} /></p>
          </div>

          {/* Multi-Month Plans */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded p-2.5 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] font-medium opacity-90 whitespace-nowrap">3/6/12M</span>
            </div>
            <p className="text-xl font-bold">
              <AnimatedNumber value={monthStats.multiMonthCount} />
              <span className="text-[10px] font-normal opacity-80 ml-1">plans</span>
            </p>
          </div>

          {/* Pending Dues */}
          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded p-2.5 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] font-medium opacity-90 whitespace-nowrap">Pending</span>
            </div>
            <p className="text-lg font-bold">
              <AnimatedNumber value={Math.round(monthStats.pendingAmount / 1000)} prefix="₹" suffix="k" />
              <span className="text-[10px] font-normal opacity-80 ml-1">(<AnimatedNumber value={monthStats.pendingCount} />)</span>
            </p>
          </div>

          {/* Paid This Month */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded p-2.5 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] font-medium opacity-90 whitespace-nowrap">Paid</span>
            </div>
            <p className="text-lg font-bold">
              {(stats?.thisMonth?.totalCollections || 0) >= 1000 
                ? <><AnimatedNumber value={Math.round((stats?.thisMonth?.totalCollections || 0) / 1000)} prefix="₹" suffix="k" /></>
                : <AnimatedNumber value={stats?.thisMonth?.totalCollections || 0} prefix="₹" />}
              <span className="text-[10px] font-normal opacity-80 ml-1">(<AnimatedNumber value={monthStats.paidCount} />)</span>
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goToPreviousMonth}
            className="w-8 h-8 rounded backdrop-blur-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: 'var(--theme-text-secondary, #475569)' }} />
          </motion.button>
          <h2 className="text-base font-semibold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <motion.button
            whileTap={canGoNext ? { scale: 0.95 } : undefined}
            onClick={goToNextMonth}
            disabled={!canGoNext}
            className={`w-8 h-8 rounded backdrop-blur-xl flex items-center justify-center ${!canGoNext ? 'opacity-30 cursor-not-allowed' : ''}`}
            style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.4))', borderWidth: '1px' }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-secondary, #475569)' }} />
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden px-2 relative z-10">
        {viewMode === 'calendar' ? (
          <>
            {/* Calendar Filter Bar */}
            <div className="flex items-center gap-1.5 mb-1.5 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 flex-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'overdue', label: 'Overdue', color: 'text-red-600' },
                  { id: 'due', label: 'Due', color: 'text-amber-600' },
                  { id: 'paid', label: 'Paid', color: 'text-green-600' },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setCalendarFilter(filter.id as any)}
                    className={`px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                      calendarFilter === filter.id
                        ? 'bg-emerald-500 text-white shadow-md'
                        : ''
                    }`}
                    style={calendarFilter !== filter.id ? {
                      backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))',
                      color: 'var(--theme-text-primary, #0f172a)'
                    } : undefined}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCalendarExport}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500 text-white text-[10px] font-semibold whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-0.5 mb-0.5 flex-shrink-0">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-[9px] font-semibold" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid - Outlook Style with Square Cells */}
            <div className="flex-1 grid gap-0.5" style={{ gridTemplateRows: `repeat(${calendarWeeks.length}, 1fr)` }}>
              {calendarWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-0.5">
                  {week.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    // Use filtered events based on calendar filter
                    const dayEvents = isCurrentMonth ? (filteredEventsByDate[dateKey] || []) : [];
                    const hasOverdue = dayEvents.some(e => e.urgency === 'overdue');
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const displayEvents = dayEvents.slice(0, 2);
                    const moreCount = dayEvents.length - 2;

                    return (
                      <motion.div
                        key={dateKey}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDateClick(day)}
                        className={`flex flex-col rounded p-1 cursor-pointer transition-all overflow-hidden backdrop-blur-md ${
                          isToday(day) 
                            ? 'bg-emerald-400/30 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20' 
                            : isSelected
                            ? 'bg-blue-400/30 border-2 border-blue-400 shadow-lg'
                            : isCurrentMonth
                            ? hasOverdue 
                              ? 'bg-red-400/20 border border-red-300/50'
                              : ''
                            : ''
                        }`}
                        style={!isToday(day) && !isSelected ? {
                          backgroundColor: isCurrentMonth 
                            ? (hasOverdue ? undefined : 'var(--theme-glass-bg, rgba(255,255,255,0.4))')
                            : 'var(--theme-glass-bg, rgba(255,255,255,0.2))',
                          borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))',
                          borderWidth: hasOverdue ? undefined : '1px'
                        } : undefined}
                      >
                        {/* Day Number Row */}
                        <div className="flex items-center justify-between flex-shrink-0">
                          <span 
                            className={`text-[10px] font-bold ${
                              isToday(day) ? 'text-emerald-600' : hasOverdue && isCurrentMonth ? 'text-red-600' : ''
                            }`}
                            style={!isToday(day) && !(hasOverdue && isCurrentMonth) ? { 
                              color: isCurrentMonth ? 'var(--theme-text-primary, #0f172a)' : 'var(--theme-text-muted, #94a3b8)' 
                            } : undefined}
                          >
                            {format(day, 'd')}
                          </span>
                          {moreCount > 0 && (
                            <span className="text-[7px] font-bold bg-slate-600 text-white px-0.5 rounded">
                              +{moreCount}
                            </span>
                          )}
                        </div>

                        {/* Avatars - Stack of 2 (non-clickable, clicking date card shows all members) */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-0 pointer-events-none min-h-0">
                          {displayEvents.map((event) => (
                            <div 
                              key={event.id} 
                              className="relative"
                            >
                              <Avatar className="w-5 h-5 border border-white shadow-sm">
                                <AvatarImage src={event.photo_url || undefined} alt={event.member_name} />
                                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-semibold text-[7px]">
                                  {event.member_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {/* Status Icon */}
                              <div className="absolute -bottom-0.5 -right-0.5">
                                {getStatusIcon(event)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Payment Tracker Table View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter & Export Bar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Filter Pills */}
              <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'all', label: 'All', count: tableData.length },
                  { id: 'overdue', label: 'Overdue', count: eventsByType.overdue.length, color: 'text-red-600' },
                  { id: 'due', label: 'Due', count: eventsByType.today.length + eventsByType.upcoming.length, color: 'text-amber-600' },
                  { id: 'paid', label: 'Paid', count: eventsByType.payments.length, color: 'text-green-600' },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setListFilter(filter.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      listFilter === filter.id
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md'
                        : ''
                    }`}
                    style={listFilter !== filter.id ? {
                      backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))',
                      color: 'var(--theme-text-primary, #0f172a)'
                    } : undefined}
                  >
                    {filter.label} <span className={filter.color || ''}>{filter.count}</span>
                  </button>
                ))}
              </div>
              
              {/* Sort Button */}
              <button
                onClick={() => setSortOrder(prev => 
                  prev === 'date-asc' ? 'date-desc' : prev === 'date-desc' ? 'amount-desc' : 'date-asc'
                )}
                className="p-2 rounded-xl"
                style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))' }}
              >
                <ArrowUpDown className="w-4 h-4" style={{ color: 'var(--theme-text-muted, #64748b)' }} />
              </button>
              
              {/* Export Button */}
              <button
                onClick={handleExport}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-semibold shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                <p className="text-[10px] font-medium text-red-600">Overdue</p>
                <p className="text-sm font-bold text-red-700"><AnimatedNumber value={monthStats.pendingAmount} prefix="₹" /></p>
              </div>
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                <p className="text-[10px] font-medium text-amber-600">Pending</p>
                <p className="text-sm font-bold text-amber-700"><AnimatedNumber value={monthStats.pendingCount} suffix=" members" /></p>
              </div>
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                <p className="text-[10px] font-medium text-green-600">Collected</p>
                <p className="text-sm font-bold text-green-700"><AnimatedNumber value={monthStats.paidAmount} prefix="₹" /></p>
              </div>
            </div>

            {/* Table */}
            <div 
              className="flex-1 rounded-2xl overflow-hidden border flex flex-col min-h-0"
              style={{ 
                backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.8))',
                borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.5))'
              }}
            >
              {/* Table Header */}
              <div 
                className="grid grid-cols-12 gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wide border-b flex-shrink-0"
                style={{ 
                  backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))',
                  borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))',
                  color: 'var(--theme-text-muted, #64748b)'
                }}
              >
                <div className="col-span-2">Date</div>
                <div className="col-span-4">Member</div>
                <div className="col-span-2">Plan</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2 text-center">Status</div>
              </div>

              {/* Table Body - Scrollable with hidden scrollbar */}
              <style>{`
                .calendar-list-scroll::-webkit-scrollbar {
                  display: none;
                }
                .calendar-list-scroll {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              <div className="calendar-list-scroll flex-1 overflow-y-auto">
                {tableData.length > 0 ? (
                  tableData.map((event, index) => {
                    const isPaid = event.event_type === 'payment';
                    const isOverdue = event.urgency === 'overdue';
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleMemberClick(event)}
                        className="grid grid-cols-12 gap-1 px-3 py-2.5 items-center cursor-pointer transition-colors border-b"
                        style={{ 
                          borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.2))',
                          backgroundColor: isOverdue ? 'rgba(239,68,68,0.05)' : isPaid ? 'rgba(16,185,129,0.05)' : 'transparent'
                        }}
                      >
                        {/* Date */}
                        <div className="col-span-2">
                          <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                            {format(new Date(event.event_date), 'dd')}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                            {format(new Date(event.event_date), 'MMM')}
                          </p>
                        </div>
                        
                        {/* Member */}
                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarImage src={event.photo_url || undefined} alt={event.member_name} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[10px] font-semibold">
                              {event.member_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                              {event.member_name}
                            </p>
                            <p className="text-[10px] truncate" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                              {event.member_phone}
                            </p>
                          </div>
                        </div>
                        
                        {/* Plan */}
                        <div className="col-span-2">
                          <p className="text-[10px] truncate" style={{ color: 'var(--theme-text-secondary, #475569)' }}>
                            {event.plan_name || 'No Plan'}
                          </p>
                        </div>
                        
                        {/* Amount */}
                        <div className="col-span-2 text-right">
                          <p className={`text-xs font-bold ${isOverdue ? 'text-red-600' : isPaid ? 'text-green-600' : ''}`}
                             style={!isOverdue && !isPaid ? { color: 'var(--theme-text-primary, #0f172a)' } : undefined}>
                            ₹{(event.amount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        
                        {/* Status */}
                        <div className="col-span-2 flex justify-center">
                          {isPaid ? (
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                              <UserCheck className="w-3 h-3 text-white" />
                            </div>
                          ) : isOverdue ? (
                            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                              <AlertCircle className="w-3 h-3 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                              <Clock className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                      No {listFilter === 'all' ? 'payment records' : listFilter + ' payments'} this month
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Events Popup - Compact Date Popup (Centered Modal) */}
      <AnimatePresence>
        {showEventsSheet && selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEventsSheet(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
              onClick={() => setShowEventsSheet(false)}
            >
              <motion.div 
                className="w-full max-w-[280px] rounded-xl overflow-hidden shadow-2xl max-h-[60vh] flex flex-col"
                style={{ backgroundColor: 'var(--theme-popup-bg)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Compact Header */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-2.5 text-white relative flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">
                      {format(selectedDate, 'EEE, dd MMM')}
                    </h3>
                    <p className="text-white/70 text-[10px]">
                      {selectedDateEvents.length} member{selectedDateEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowEventsSheet(false)}
                    className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>

                {/* Compact Member List */}
                <div className="flex-1 overflow-y-auto p-2" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                  {selectedDateEvents.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedDateEvents.map((event, index) => (
                        <CompactMemberItem key={event.id || index} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Calendar className="w-8 h-8 mx-auto mb-1.5" style={{ color: 'var(--theme-text-muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>No members</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unified Member Popup */}
      <UnifiedMemberPopup
        member={selectedMember}
        isOpen={showMemberPopup}
        onClose={handlePopupClose}
        onUpdate={handlePopupUpdate}
      />
    </div>
  );
}
