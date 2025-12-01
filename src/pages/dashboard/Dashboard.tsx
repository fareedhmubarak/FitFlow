import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { gymService, CalendarEvent, EnhancedDashboardStats } from '@/lib/gymService';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw, ChevronLeft, ChevronRight, LogOut, Phone, MessageCircle, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedMemberPopup, UnifiedMemberData } from '@/components/common/UnifiedMemberPopup';
import { isSameDay, endOfMonth, startOfMonth, format, addMonths, subMonths, isBefore, startOfDay, isSameMonth } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNavigation from '@/components/layout/BottomNavigation';

// Animated counter component for dopamine hit
const AnimatedNumber = ({ value, prefix = '', className = '' }: { value: number; prefix?: string; className?: string }) => {
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
  
  return <span className={className}>{prefix}{displayValue.toLocaleString('en-IN')}</span>;
};

// Get greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  if (hour < 21) return { text: 'Good Evening', emoji: '🌅' };
  return { text: 'Good Night', emoji: '🌙' };
};

export default function Dashboard() {
  const { gym, logout } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<EnhancedDashboardStats | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMemberForPopup, setSelectedMemberForPopup] = useState<UnifiedMemberData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Pull to refresh ref
  const containerRef = useRef<HTMLDivElement>(null);

  const canGoNext = !isSameMonth(currentMonth, new Date());
  const actualToday = startOfDay(new Date());
  const greeting = getGreeting();

  const uniqueEvents = (events: CalendarEvent[]) => {
    const seen = new Set();
    return events.filter(e => {
      const duplicate = seen.has(e.member_id);
      seen.add(e.member_id);
      return !duplicate;
    });
  };

  const loadData = useCallback(async () => {
    if (!gym?.id) return;
    try {
      const [statsData, eventsData] = await Promise.all([
        gymService.getEnhancedDashboardStats(),
        gymService.getCalendarEvents(startOfMonth(currentMonth), endOfMonth(currentMonth))
      ]);
      setStats(statsData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gym?.id, currentMonth]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    // Show success animation
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  const handleMemberClick = (event: CalendarEvent) => {
    // Convert CalendarEvent to UnifiedMemberData
    const memberData: UnifiedMemberData = {
      id: event.member_id,
      name: event.member_name,
      phone: event.member_phone,
      photo_url: event.photo_url,
      status: (event.status || 'active') as 'active' | 'inactive',
      membership_end_date: event.membership_end_date,
      plan_name: event.plan_name,
    };
    setSelectedMemberForPopup(memberData);
    setIsModalOpen(true);
  };

  const handleWhatsApp = (e: React.MouseEvent, member: CalendarEvent) => {
    e.stopPropagation();
    const message = `Hi ${member.member_name}, this is a reminder from ${gym?.name || 'the gym'} regarding your membership payment.`;
    window.open(`https://wa.me/91${member.member_phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, '_self');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const monthStart = startOfMonth(currentMonth);
  
  const dueToday = isSameMonth(currentMonth, actualToday) 
    ? uniqueEvents(events.filter(e => 
        (e.event_type === 'payment_due' || e.event_type === 'expiry') && 
        isSameDay(startOfDay(new Date(e.event_date)), actualToday)
      ))
    : [];

  const overdue = uniqueEvents(events.filter(e => {
    const eventDate = startOfDay(new Date(e.event_date));
    const isPaymentType = e.event_type === 'payment_due' || e.event_type === 'expiry';
    const isBeforeToday = isBefore(eventDate, actualToday);
    const isInCurrentMonth = !isBefore(eventDate, monthStart);
    const isNotToday = !isSameDay(eventDate, actualToday);
    return isPaymentType && isBeforeToday && isInCurrentMonth && isNotToday;
  }));

  const dueTodayTotal = dueToday.reduce((sum, e) => sum + (e.amount || 0), 0);
  const overdueTotal = overdue.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // Calculate collection progress (for gamification)
  const collectionTarget = (stats?.members?.active || 1) * 1000; // Assume avg ₹1000/member
  const collectionProgress = Math.min(((stats?.thisMonth?.totalCollections || 0) / collectionTarget) * 100, 100);

  if (loading) {
    return (
      <div className='fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex items-center justify-center font-[Urbanist]'>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className='flex flex-col items-center'
        >
          <motion.div 
            className='h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-400/40 flex items-center justify-center mb-4'
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
            </svg>
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 120 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className='h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full'
          />
          <p className='text-sm font-semibold text-gray-600 mt-3'>Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className='fixed inset-0 w-screen h-screen bg-[#E0F2FE] flex flex-col overflow-hidden font-[Urbanist]'
    >
      {/* Animated gradient blobs - extend into safe areas */}
      <motion.div 
        animate={{ 
          x: [0, 80, -60, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          repeatType: "reverse", 
          ease: "easeInOut" 
        }}
        style={{ borderRadius: '9999px' }}
        className="fixed top-[-15%] left-[-15%] w-[70%] h-[55%] bg-[#6EE7B7] rounded-full blur-[80px] opacity-50 pointer-events-none z-0" 
      />
      <motion.div 
        animate={{ 
          x: [0, -60, 80, 0],
          y: [0, 70, -40, 0],
          scale: [1, 1.3, 0.85, 1],
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          repeatType: "reverse", 
          ease: "easeInOut" 
        }}
        style={{ borderRadius: '9999px' }}
        className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] bg-[#FCA5A5] rounded-full blur-[80px] opacity-50 pointer-events-none z-0" 
      />
      
      {/* Success celebration overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 z-50 flex items-center justify-center pointer-events-none'
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className='bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl flex flex-col items-center'
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <Sparkles className='w-12 h-12 text-emerald-500 mb-2' />
              </motion.div>
              <p className='text-lg font-bold text-gray-800'>Refreshed!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className='relative z-10 flex flex-col h-full'>
        
        {/* Header */}
        <header className='flex-shrink-0 px-3 pb-1' style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className='w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-400/30'
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
                </svg>
              </motion.div>
              <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='text-sm font-bold text-gray-800'
                >
                  {gym?.name || "Gym"}
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className='text-[9px] text-gray-500 font-medium'
                >
                  {format(currentMonth, 'MMMM yyyy')}
                </motion.p>
              </div>
            </div>

            <div className='flex items-center gap-1'>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.85, rotate: 180 }}
                onClick={handleRefresh}
                disabled={refreshing}
                className='w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-md flex items-center justify-center'
              >
                <RefreshCw className={`w-3 h-3 text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
              
              <div className='flex items-center bg-white/20 backdrop-blur-md border border-white/30 rounded-full shadow-md overflow-hidden'>
                <motion.button 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                  whileTap={{ scale: 0.9 }} 
                  onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} 
                  className='w-6 h-6 flex items-center justify-center'
                >
                  <ChevronLeft className='w-3 h-3 text-gray-700' />
                </motion.button>
                <motion.button 
                  whileTap={canGoNext ? { scale: 0.9 } : undefined} 
                  onClick={() => canGoNext && setCurrentMonth(prev => addMonths(prev, 1))} 
                  disabled={!canGoNext}
                  className={`w-6 h-6 flex items-center justify-center ${!canGoNext ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <ChevronRight className='w-3 h-3 text-gray-700' />
                </motion.button>
              </div>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.85 }} 
                onClick={handleLogout} 
                className='w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-md flex items-center justify-center'
              >
                <LogOut className='w-3 h-3 text-gray-700' />
              </motion.button>
            </div>
          </div>
          
          {/* Greeting with emoji */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='mt-1.5 flex items-center gap-1.5'
          >
            <span className='text-base'>{greeting.emoji}</span>
            <span className='text-xs font-medium text-gray-600'>{greeting.text}!</span>
          </motion.div>
        </header>

        {/* Stats Cards with Progress */}
        <div className='flex-shrink-0 px-3 mb-2'>
          <div className='grid grid-cols-3 gap-1.5'>
            {/* Collected - with progress ring */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className='bg-white/25 backdrop-blur-md rounded-xl p-2 shadow-md border border-white/30 relative overflow-hidden'
            >
              {/* Progress bar at bottom */}
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-200/30'>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${collectionProgress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className='h-full bg-gradient-to-r from-emerald-400 to-emerald-500'
                />
              </div>
              <div className='flex items-center gap-1 mb-0.5'>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className='w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center'
                >
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </motion.div>
                <span className='text-[8px] text-gray-600 font-bold uppercase tracking-wider'>Collected</span>
              </div>
              <p className='text-sm font-extrabold text-emerald-600'>
                <AnimatedNumber value={stats?.thisMonth?.totalCollections || 0} prefix="₹" />
              </p>
            </motion.div>

            {/* Pending - with pulsing dot if has pending */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className='bg-white/25 backdrop-blur-md rounded-xl p-2 shadow-md border border-white/30 relative overflow-hidden'
            >
              {/* Progress bar at bottom */}
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-orange-200/30'>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((dueTodayTotal + overdueTotal) / Math.max(stats?.thisMonth?.totalCollections || 1, 1)) * 100, 100)}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className='h-full bg-gradient-to-r from-orange-400 to-amber-500'
                />
              </div>
              <div className='flex items-center gap-1 mb-0.5'>
                <div className='relative'>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                    className='w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center'
                  >
                    <div className='w-1 h-1 rounded-full bg-white'></div>
                  </motion.div>
                  {(dueTodayTotal + overdueTotal > 0) && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className='absolute inset-0 rounded-full bg-orange-400/40'
                    />
                  )}
                </div>
                <span className='text-[8px] text-gray-600 font-bold uppercase tracking-wider'>Pending</span>
              </div>
              <p className='text-sm font-extrabold text-orange-500'>
                <AnimatedNumber value={dueTodayTotal + overdueTotal} prefix="₹" />
              </p>
            </motion.div>

            {/* Active */}
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className='bg-white/25 backdrop-blur-md rounded-xl p-2 shadow-md border border-white/30 relative overflow-hidden'
            >
              {/* Progress bar at bottom */}
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-200/30'>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1, delay: 0.7 }}
                  className='h-full bg-gradient-to-r from-cyan-400 to-sky-500'
                />
              </div>
              <div className='flex items-center gap-1 mb-0.5'>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  className='w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center'
                >
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </motion.div>
                <span className='text-[8px] text-gray-600 font-bold uppercase tracking-wider'>Active</span>
                {(stats?.members?.active || 0) > 100 && (
                  <TrendingUp className='w-2.5 h-2.5 text-emerald-500' />
                )}
              </div>
              <p className='text-sm font-extrabold text-cyan-600'>
                <AnimatedNumber value={stats?.members?.active || 0} />
              </p>
            </motion.div>
          </div>
        </div>

        {/* Due Today & Overdue Sections */}
        <div className='flex-1 px-3 overflow-hidden min-h-0'>
          <div className='grid grid-cols-2 gap-2 h-full'>
            
            {/* Due Today Column */}
            <div className='flex flex-col h-full min-h-0'>
              <div className='flex-shrink-0 flex items-center gap-1 mb-1.5'>
                <motion.div 
                  animate={{ scale: dueToday.length > 0 ? [1, 1.4, 1] : 1, opacity: dueToday.length > 0 ? [1, 0.6, 1] : 1 }}
                  transition={{ duration: 1, repeat: dueToday.length > 0 ? Infinity : 0 }}
                  className='w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50'
                />
                <span className='text-[9px] font-bold text-gray-700 uppercase tracking-wide'>Due Today</span>
                <motion.span 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className='min-w-[16px] h-[16px] rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-[8px] font-bold flex items-center justify-center px-1 shadow-sm'
                >
                  {dueToday.length}
                </motion.span>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='text-[10px] font-extrabold text-emerald-600 ml-auto'
                >
                  {formatCurrency(dueTodayTotal)}
                </motion.span>
              </div>
              
              <div className='flex-1 overflow-y-auto min-h-0 space-y-1.5 pb-1 scrollbar-hide'>
                {dueToday.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className='bg-gradient-to-br from-emerald-100/30 to-teal-100/20 backdrop-blur-md rounded-xl p-4 text-center border border-white/30 shadow-sm'
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className='text-2xl mb-1'
                    >
                      ✨
                    </motion.div>
                    <p className='text-xs text-gray-600 font-semibold'>All clear!</p>
                    <p className='text-[10px] text-gray-400 mt-0.5'>No payments due today</p>
                  </motion.div>
                ) : (
                  dueToday.map((member, idx) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: idx * 0.08, type: "spring", stiffness: 300 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleMemberClick(member)}
                      className='bg-gradient-to-r from-violet-200/30 via-purple-100/20 to-pink-100/20 backdrop-blur-md rounded-xl p-2 cursor-pointer border border-white/30 shadow-md'
                    >
                      <div className='flex items-center gap-2 mb-1.5'>
                        <motion.div whileHover={{ scale: 1.1 }}>
                          <Avatar className='w-8 h-8 border border-white/50 shadow-md flex-shrink-0'>
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className='bg-gradient-to-br from-violet-400 to-purple-500 text-white text-[10px] font-bold'>
                              {member.member_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-[11px] font-bold text-gray-800 leading-tight truncate'>{member.member_name}</p>
                          <p className='text-[8px] text-gray-400 font-medium'>{format(new Date(member.event_date), 'MMM d')}</p>
                        </div>
                      </div>
                      <div className='flex items-center justify-between'>
                        <motion.p 
                          className='text-[12px] font-extrabold text-purple-700'
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {formatCurrency(member.amount || 0)}
                        </motion.p>
                        <div className='flex gap-1.5'>
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => handleWhatsApp(e, member)}
                            className='w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-md flex items-center justify-center'
                          >
                            <MessageCircle className='w-3 h-3 text-white' />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: -5 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => handleCall(e, member.member_phone)}
                            className='w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md flex items-center justify-center'
                          >
                            <Phone className='w-3 h-3 text-white' />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Overdue Column */}
            <div className='flex flex-col h-full min-h-0'>
              <div className='flex-shrink-0 flex items-center gap-1 mb-1.5'>
                <motion.div 
                  animate={{ scale: overdue.length > 0 ? [1, 1.4, 1] : 1, opacity: overdue.length > 0 ? [1, 0.6, 1] : 1 }}
                  transition={{ duration: 0.8, repeat: overdue.length > 0 ? Infinity : 0 }}
                  className='w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50'
                />
                <span className='text-[9px] font-bold text-gray-700 uppercase tracking-wide'>Overdue</span>
                <motion.span 
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className='min-w-[16px] h-[16px] rounded-full bg-gradient-to-br from-red-400 to-red-600 text-white text-[8px] font-bold flex items-center justify-center px-1 shadow-sm'
                >
                  {overdue.length}
                </motion.span>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='text-[10px] font-extrabold text-red-500 ml-auto'
                >
                  {formatCurrency(overdueTotal)}
                </motion.span>
              </div>
              
              <div className='flex-1 overflow-y-auto min-h-0 space-y-1.5 pb-1 scrollbar-hide'>
                {overdue.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className='bg-gradient-to-br from-sky-100/30 to-cyan-100/20 backdrop-blur-md rounded-xl p-4 text-center border border-white/30 shadow-sm'
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className='text-2xl mb-1'
                    >
                      🎉
                    </motion.div>
                    <p className='text-xs text-gray-600 font-semibold'>Awesome!</p>
                    <p className='text-[10px] text-gray-400 mt-0.5'>No overdue payments</p>
                  </motion.div>
                ) : (
                  overdue.map((member, idx) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: 20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: idx * 0.08, type: "spring", stiffness: 300 }}
                      whileHover={{ scale: 1.02, x: -5 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleMemberClick(member)}
                      className='bg-gradient-to-r from-red-200/30 via-orange-100/20 to-amber-100/20 backdrop-blur-md rounded-xl p-2 cursor-pointer border border-white/30 shadow-md'
                    >
                      <div className='flex items-center gap-2 mb-1.5'>
                        <motion.div whileHover={{ scale: 1.1 }}>
                          <Avatar className='w-8 h-8 border border-white/50 shadow-md flex-shrink-0'>
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className='bg-gradient-to-br from-red-400 to-orange-500 text-white text-[10px] font-bold'>
                              {member.member_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-[11px] font-bold text-gray-800 leading-tight truncate'>{member.member_name}</p>
                          <p className='text-[8px] text-red-400 font-medium'>{format(new Date(member.event_date), 'MMM d')}</p>
                        </div>
                      </div>
                      <div className='flex items-center justify-between'>
                        <motion.p 
                          className='text-[12px] font-extrabold text-red-600'
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {formatCurrency(member.amount || 0)}
                        </motion.p>
                        <div className='flex gap-1.5'>
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => handleWhatsApp(e, member)}
                            className='w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-md flex items-center justify-center'
                          >
                            <MessageCircle className='w-3 h-3 text-white' />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: -5 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => handleCall(e, member.member_phone)}
                            className='w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md flex items-center justify-center'
                          >
                            <Phone className='w-3 h-3 text-white' />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className='flex-shrink-0'>
          <BottomNavigation />
        </div>
      </div>

      <UnifiedMemberPopup 
        member={selectedMemberForPopup} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onUpdate={loadData}
      />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
