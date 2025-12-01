import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, Gift, IndianRupee, UserCheck, X, AlertCircle, Phone, MessageCircle, Users, TrendingUp, CreditCard } from 'lucide-react';
import { gymService, CalendarEvent, EnhancedDashboardStats } from '@/lib/gymService';
import { GymLoader } from '@/components/ui/GymLoader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedMemberPopup, type UnifiedMemberData } from '@/components/common/UnifiedMemberPopup';

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventsSheet, setShowEventsSheet] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
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

  // Calculate stats from events
  const monthStats = useMemo(() => {
    if (!events) return { pendingCount: 0, pendingAmount: 0, paidCount: 0, paidAmount: 0 };
    
    const pendingEvents = events.filter(e => e.event_type === 'payment_due' || e.urgency === 'overdue');
    const paidEvents = events.filter(e => e.event_type === 'payment');
    
    return {
      pendingCount: pendingEvents.length,
      pendingAmount: pendingEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
      paidCount: paidEvents.length,
      paidAmount: paidEvents.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  }, [events]);

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

  // Navigation
  const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
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
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <span className="ml-auto text-sm text-slate-500">{count} member{count !== 1 ? 's' : ''}</span>
    </div>
  );

  // Member Card Component for List View and Sheet
  const MemberCard = ({ event, showDate = false }: { event: CalendarEvent; showDate?: boolean }) => {
    const status = getStatusBadge(event);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleMemberClick(event)}
        className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-lg cursor-pointer hover:bg-white/80 transition-all"
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
              <h4 className="font-semibold text-slate-800 truncate text-sm">{event.member_name}</h4>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">{event.event_title}</p>
            {showDate && (
              <p className="text-[10px] text-slate-400">{format(new Date(event.event_date), 'dd MMM')}</p>
            )}
          </div>
          
          {event.amount && (
            <p className={`text-sm font-bold ${event.urgency === 'overdue' ? 'text-red-600' : event.event_type === 'payment' ? 'text-green-600' : 'text-slate-700'}`}>
              ₹{event.amount.toLocaleString('en-IN')}
            </p>
          )}
        </div>
        
        <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://wa.me/91${event.member_phone}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-50 rounded-lg text-green-600 text-xs font-medium"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${event.member_phone}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 rounded-lg text-blue-600 text-xs font-medium"
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
    <div className="fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden font-[Urbanist]" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Animated Background Blobs - extend into safe areas */}
      <motion.div
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        style={{ borderRadius: '9999px' }}
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none z-0"
      />
      <motion.div
        animate={{
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        style={{ borderRadius: '9999px' }}
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none z-0"
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-3 pb-2 relative z-10"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            Calendar
          </h1>
          <div className="flex items-center gap-1.5">
            {/* View Toggle */}
            <div className="flex bg-white/60 backdrop-blur-xl border border-white/40 rounded-full p-0.5">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  viewMode === 'calendar' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                    : 'text-slate-600'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                    : 'text-slate-600'
                }`}
              >
                List
              </button>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goToToday}
              className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full shadow-lg shadow-emerald-500/30"
            >
              Today
            </motion.button>
          </div>
        </div>

        {/* Stats Cards - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {/* Active Members */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2.5 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] font-medium opacity-90">Active Members</span>
            </div>
            <p className="text-xl font-bold">{stats?.members?.active || 0}</p>
          </div>

          {/* Multi-Month Plans */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] font-medium opacity-90">Multi-Month Plans</span>
            </div>
            <p className="text-xl font-bold">
              {stats?.thisMonth?.renewals || 0}
              <span className="text-[10px] font-normal opacity-80 ml-1">3/6/12 mo</span>
            </p>
          </div>

          {/* Pending Dues */}
          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-2.5 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] font-medium opacity-90">Pending Dues</span>
            </div>
            <p className="text-lg font-bold">
              ₹{(monthStats.pendingAmount / 1000).toFixed(0)}k
              <span className="text-[10px] font-normal opacity-80 ml-1">({monthStats.pendingCount})</span>
            </p>
          </div>

          {/* Paid This Month */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-2.5 text-white">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="w-3.5 h-3.5 opacity-80" />
              <span className="text-[10px] font-medium opacity-90">Paid This Month</span>
            </div>
            <p className="text-lg font-bold">
              ₹{(stats?.thisMonth?.totalCollections || 0) >= 1000 
                ? `${((stats?.thisMonth?.totalCollections || 0) / 1000).toFixed(0)}k` 
                : stats?.thisMonth?.totalCollections || 0}
              <span className="text-[10px] font-normal opacity-80 ml-1">({monthStats.paidCount})</span>
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goToPreviousMonth}
            className="w-8 h-8 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </motion.button>
          <h2 className="text-base font-semibold text-slate-800">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goToNextMonth}
            className="w-8 h-8 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden px-2 relative z-10">
        {viewMode === 'calendar' ? (
          <>
            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-1 flex-shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-semibold text-slate-500 py-0.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid - Outlook Style with Square Cells */}
            <div className="flex-1 grid gap-1" style={{ gridTemplateRows: `repeat(${calendarWeeks.length}, 1fr)` }}>
              {calendarWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    // Only show events for current month days
                    const dayEvents = isCurrentMonth ? (eventsByDate[dateKey] || []) : [];
                    const hasOverdue = dayEvents.some(e => e.urgency === 'overdue');
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const displayEvents = dayEvents.slice(0, 2);
                    const moreCount = dayEvents.length - 2;

                    return (
                      <motion.div
                        key={dateKey}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDateClick(day)}
                        className={`flex flex-col rounded-lg p-1 cursor-pointer transition-all overflow-hidden ${
                          isToday(day) 
                            ? 'bg-emerald-100 border-2 border-emerald-500 shadow-md' 
                            : isSelected
                            ? 'bg-blue-100 border-2 border-blue-400'
                            : isCurrentMonth
                            ? hasOverdue 
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-white/70 backdrop-blur-sm border border-white/60'
                            : 'bg-white/30 border border-white/20'
                        }`}
                      >
                        {/* Day Number Row */}
                        <div className="flex items-center justify-between flex-shrink-0">
                          <span className={`text-[10px] font-bold ${
                            isToday(day) 
                              ? 'text-emerald-700' 
                              : isCurrentMonth 
                              ? hasOverdue ? 'text-red-700' : 'text-slate-700'
                              : 'text-slate-400'
                          }`}>
                            {format(day, 'd')}
                          </span>
                          {moreCount > 0 && (
                            <span className="text-[8px] font-bold bg-slate-600 text-white px-1 py-0.5 rounded">
                              +{moreCount}
                            </span>
                          )}
                        </div>

                        {/* Avatars - Stack of 2 */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-0.5">
                          {displayEvents.map((event) => (
                            <div 
                              key={event.id} 
                              className="relative"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMemberClick(event);
                              }}
                            >
                              <Avatar className="w-6 h-6 border border-white shadow-sm">
                                <AvatarImage src={event.photo_url || undefined} alt={event.member_name} />
                                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-semibold text-[8px]">
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
          /* List View */
          <div className="flex-1 overflow-auto space-y-4 pb-4">
            {/* Overdue Section */}
            {eventsByType.overdue.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <SectionHeader 
                  icon={<AlertCircle className="w-4 h-4" />} 
                  title="Overdue" 
                  count={eventsByType.overdue.length} 
                  color="bg-red-500" 
                />
                <div className="space-y-2">
                  {eventsByType.overdue.map(event => (
                    <MemberCard key={event.id} event={event} showDate />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Today Section */}
            {eventsByType.today.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <SectionHeader 
                  icon={<Clock className="w-4 h-4" />} 
                  title="Due Today" 
                  count={eventsByType.today.length} 
                  color="bg-amber-500" 
                />
                <div className="space-y-2">
                  {eventsByType.today.map(event => (
                    <MemberCard key={event.id} event={event} />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Upcoming Section */}
            {eventsByType.upcoming.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <SectionHeader 
                  icon={<Calendar className="w-4 h-4" />} 
                  title="Upcoming" 
                  count={eventsByType.upcoming.length} 
                  color="bg-blue-500" 
                />
                <div className="space-y-2">
                  {eventsByType.upcoming.map(event => (
                    <MemberCard key={event.id} event={event} showDate />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Birthdays Section */}
            {eventsByType.birthdays.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <SectionHeader 
                  icon={<Gift className="w-4 h-4" />} 
                  title="Birthdays" 
                  count={eventsByType.birthdays.length} 
                  color="bg-purple-500" 
                />
                <div className="space-y-2">
                  {eventsByType.birthdays.map(event => (
                    <MemberCard key={event.id} event={event} showDate />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Recent Payments Section */}
            {eventsByType.payments.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <SectionHeader 
                  icon={<UserCheck className="w-4 h-4" />} 
                  title="Payments" 
                  count={eventsByType.payments.length} 
                  color="bg-green-500" 
                />
                <div className="space-y-2">
                  {eventsByType.payments.map(event => (
                    <MemberCard key={event.id} event={event} showDate />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Empty State */}
            {events?.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No events this month</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Events Popup - for date clicks (Centered Modal) */}
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
              onClick={() => setShowEventsSheet(false)}
            >
              <motion.div 
                className="w-full max-w-[360px] bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white relative">
                  <button 
                    onClick={() => setShowEventsSheet(false)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <h3 className="font-bold text-lg">
                    {format(selectedDate, 'EEEE')}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {format(selectedDate, 'dd MMMM yyyy')}
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    {selectedDateEvents.length} member{selectedDateEvents.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Events List */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                  {selectedDateEvents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDateEvents.map(event => (
                        <MemberCard key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400">No members on this day</p>
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
