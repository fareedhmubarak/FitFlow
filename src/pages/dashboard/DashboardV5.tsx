/**
 * Dashboard Variation 3: "Action-Driven"
 * ─────────────────────────────────────────
 * Philosophy: PushPress/Zen Planner — ultra-minimal header, today's "action card"
 * at top (like a notification), then a clean list sorted by highest amount.
 * Every element is tappable, everything drives an action.
 * Uses a single-column full-width layout for maximum readability.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { CalendarEvent } from '@/lib/gymService';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, ChevronRight, MessageCircle, Phone, Send, IndianRupee, ArrowRight } from 'lucide-react';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedMemberPopup, UnifiedMemberData } from '@/components/common/UnifiedMemberPopup';
import { isSameDay, startOfMonth, format, addMonths, subMonths, isBefore, startOfDay, isSameMonth, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useAppReady } from '@/contexts/AppReadyContext';
import { buildOwnerDailySummary, fetchPendingInstallmentsForSummary } from '@/lib/ownerSummary';
import { toast } from 'react-hot-toast';
import { useDashboardStats, useDashboardEvents } from '@/hooks/useDashboardData';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return '☀️';
  if (h < 17) return '🌤️';
  if (h < 21) return '🌅';
  return '🌙';
};

export default function DashboardV5() {
  const { gym } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setDataReady, isSplashComplete } = useAppReady();
  const [selectedMemberForPopup, setSelectedMemberForPopup] = useState<UnifiedMemberData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'tomorrow'>('overdue');

  const { data: stats = null, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useDashboardEvents(currentMonth);
  const loading = statsLoading && eventsLoading;

  const canGoNext = !isSameMonth(currentMonth, new Date());
  const actualToday = startOfDay(new Date());

  const uniqueEvents = useCallback((events: CalendarEvent[]) => {
    const seen = new Set();
    return events.filter(e => { const d = seen.has(e.member_id); seen.add(e.member_id); return !d; });
  }, []);

  useEffect(() => { if (!loading && gym?.id) setDataReady(); }, [loading, gym?.id, setDataReady]);

  const handleMemberClick = (event: CalendarEvent) => {
    setSelectedMemberForPopup({
      id: event.member_id, name: event.member_name, phone: event.member_phone,
      photo_url: event.photo_url, status: (event.status || 'active') as 'active' | 'inactive',
      membership_end_date: event.membership_end_date, next_due_date: event.membership_end_date,
      plan_name: event.plan_name, joining_date: event.joining_date,
      plan_amount: event.amount || 0, amount_due: event.amount || 0,
    });
    setIsModalOpen(true);
  };

  const handleWhatsApp = (e: React.MouseEvent, member: CalendarEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/91${member.member_phone}?text=${encodeURIComponent(`Hi ${member.member_name}, this is a reminder from ${gym?.name || 'the gym'} regarding your membership payment.`)}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, '_self');
  };

  const handleOwnerDailySummary = async () => {
    try {
      const pendingInstallments = await fetchPendingInstallmentsForSummary();
      const summaryData = {
        gymName: gym?.name || 'Gym', date: format(new Date(), 'yyyy-MM-dd'),
        dueToday: dueToday.map(m => ({ name: m.member_name, amount: m.amount || 0, phone: m.member_phone })),
        overdue: overdue.map(m => {
          const dd = m.next_payment_due_date ? startOfDay(new Date(m.next_payment_due_date)) : startOfDay(new Date(m.event_date));
          return { name: m.member_name, amount: m.amount || 0, phone: m.member_phone, daysOverdue: Math.max(0, Math.floor((actualToday.getTime() - dd.getTime()) / 86400000)) };
        }),
        dueTomorrow: dueTomorrow.map(m => ({ name: m.member_name, amount: m.amount || 0 })),
        todayCollections: stats?.today?.collections || 0, todayCollectionsCount: stats?.today?.collectionsCount || 0,
        monthCollections: stats?.thisMonth?.totalCollections || 0, activeMembers: stats?.members?.active || 0, pendingInstallments,
      };
      window.open(`https://wa.me/?text=${encodeURIComponent(buildOwnerDailySummary(summaryData))}`, '_blank');
      toast.success('Summary ready!');
    } catch { toast.error('Failed'); }
  };

  const monthStart = startOfMonth(currentMonth);
  const tomorrow = addDays(actualToday, 1);

  const dueToday = isSameMonth(currentMonth, actualToday)
    ? uniqueEvents(events.filter(e => {
        const d = e.next_payment_due_date ? startOfDay(new Date(e.next_payment_due_date)) : null;
        return (e.event_type === 'payment_due' || e.event_type === 'expiry') && d && isSameDay(d, actualToday);
      }))
    : [];

  const overdue = uniqueEvents(events.filter(e => {
    const d = e.next_payment_due_date ? startOfDay(new Date(e.next_payment_due_date)) : null;
    if (!d) return false;
    return (e.event_type === 'payment_due' || e.event_type === 'expiry') && isBefore(d, actualToday) && !isBefore(d, monthStart) && !isSameDay(d, actualToday);
  })).sort((a, b) => (b.amount || 0) - (a.amount || 0)); // Highest amount first

  const dueTomorrow = isSameMonth(currentMonth, actualToday)
    ? uniqueEvents(events.filter(e => {
        const d = e.next_payment_due_date ? startOfDay(new Date(e.next_payment_due_date)) : null;
        return (e.event_type === 'payment_due' || e.event_type === 'expiry') && d && isSameDay(d, tomorrow);
      }))
    : [];

  const overdueTotal = overdue.reduce((s, e) => s + (e.amount || 0), 0);
  const dueTodayTotal = dueToday.reduce((s, e) => s + (e.amount || 0), 0);
  const dueTomorrowTotal = dueTomorrow.reduce((s, e) => s + (e.amount || 0), 0);
  const monthCollected = stats?.thisMonth?.totalCollections || 0;

  // Auto-select tab based on which has data
  useEffect(() => {
    if (!eventsLoading) {
      if (overdue.length > 0) setActiveTab('overdue');
      else if (dueToday.length > 0) setActiveTab('today');
      else setActiveTab('tomorrow');
    }
  }, [eventsLoading, overdue.length, dueToday.length]);

  const tabs = [
    { key: 'overdue' as const, label: 'Overdue', count: overdue.length, amount: overdueTotal, color: 'red' },
    { key: 'today' as const, label: 'Today', count: dueToday.length, amount: dueTodayTotal, color: 'emerald' },
    { key: 'tomorrow' as const, label: 'Tomorrow', count: dueTomorrow.length, amount: dueTomorrowTotal, color: 'purple' },
  ];

  const activeMembers = activeTab === 'overdue' ? overdue : activeTab === 'today' ? dueToday : dueTomorrow;

  if (loading && isSplashComplete) {
    return (
      <div className='fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]' style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
        <div className="absolute top-[-25%] left-[-20%] w-[80%] h-[65%] rounded-full blur-3xl opacity-30 pointer-events-none animate-blob" style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }} />
        <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-25 pointer-events-none animate-blob animation-delay-4000" style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }} />
        <div className="relative z-10 p-4 space-y-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between"><div className="skeleton-shimmer h-9 w-32 rounded-xl" /><div className="skeleton-shimmer h-9 w-9 rounded-full" /></div>
          <div className="skeleton-shimmer h-20 rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton-shimmer h-16 rounded-xl" />)}</div>
          <div className="flex gap-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton-shimmer h-10 flex-1 rounded-full" />)}</div>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton-shimmer h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]' style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      <div className="fixed top-[-25%] left-[-20%] w-[80%] h-[65%] rounded-full blur-3xl opacity-50 pointer-events-none z-0 animate-blob" style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }} />
      <div className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }} />

      <div className='relative z-10 flex flex-col h-full'>

        {/* Ultra-compact header */}
        <header className='flex-shrink-0 px-4 flex items-center justify-between' style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.5rem' }}>
          <div className='flex items-center gap-2'>
            <span className='text-lg'>{getGreeting()}</span>
            <div>
              <p className='text-sm font-extrabold leading-tight' style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{gym?.name || 'Your Gym'}</p>
              <p className='text-[10px] font-medium' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{format(new Date(), 'EEE, d MMM')}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleOwnerDailySummary}
              className='w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm'>
              <Send className='w-3.5 h-3.5 text-white' />
            </motion.button>
            <UserProfileDropdown />
          </div>
        </header>

        {/* Scrollable */}
        <div className='flex-1 overflow-y-auto min-h-0 pb-20 scrollbar-hide' style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}>

          {/* Today's Action Card — what happened today, in one glance */}
          <div className='px-4 mb-3'>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className='backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg'
              style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.85))' }}>
              <div className='p-4'>
                <div className='flex items-baseline justify-between mb-1'>
                  <span className='text-[10px] font-bold uppercase tracking-widest' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Today's Collection</span>
                  <span className='text-[10px] font-semibold' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{stats?.today?.collectionsCount || 0} paid</span>
                </div>
                <p className='text-3xl font-black text-emerald-600 leading-none'>₹{(stats?.today?.collections || 0).toLocaleString('en-IN')}</p>
              </div>
              {/* Month bar */}
              <div className='bg-slate-50/80 px-4 py-2.5 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className='w-5 h-5 flex items-center justify-center'>
                    <ChevronLeft className='w-3.5 h-3.5 text-slate-400' />
                  </button>
                  <span className='text-[11px] font-bold' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{format(currentMonth, 'MMMM')}</span>
                  <button onClick={() => canGoNext && setCurrentMonth(prev => addMonths(prev, 1))} disabled={!canGoNext} className={`w-5 h-5 flex items-center justify-center ${!canGoNext ? 'opacity-30' : ''}`}>
                    <ChevronRight className='w-3.5 h-3.5 text-slate-400' />
                  </button>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='text-right'>
                    <p className='text-[8px] font-bold uppercase text-slate-400'>Month</p>
                    <p className='text-xs font-extrabold text-emerald-600'>₹{monthCollected.toLocaleString('en-IN')}</p>
                  </div>
                  <div className='w-px h-6 bg-slate-200' />
                  <div className='text-right'>
                    <p className='text-[8px] font-bold uppercase text-slate-400'>Active</p>
                    <p className='text-xs font-extrabold' style={{ color: 'var(--theme-text-primary, #334155)' }}>{stats?.members?.active || 0}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Segmented Tab Buttons */}
          <div className='px-4 mb-3'>
            <div className='flex gap-1.5 p-1 rounded-xl backdrop-blur-xl' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.5))' }}>
              {tabs.map(tab => {
                const isActive = activeTab === tab.key;
                const colorMap = { red: 'from-red-500 to-red-600', emerald: 'from-emerald-500 to-emerald-600', purple: 'from-purple-500 to-purple-600' };
                const textColorMap = { red: 'text-red-600', emerald: 'text-emerald-600', purple: 'text-purple-600' };
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 px-2 rounded-lg text-center transition-all duration-200 ${isActive ? 'bg-white shadow-sm' : ''}`}>
                    <div className='flex items-center justify-center gap-1'>
                      <span className={`text-[11px] font-bold ${isActive ? textColorMap[tab.color] : ''}`} style={!isActive ? { color: 'var(--theme-text-muted, #94a3b8)' } : {}}>
                        {tab.label}
                      </span>
                      {tab.count > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? `bg-gradient-to-r ${colorMap[tab.color]} text-white` : 'bg-slate-200 text-slate-500'}`}>
                          {tab.count}
                        </span>
                      )}
                    </div>
                    {isActive && tab.count > 0 && (
                      <p className={`text-[10px] font-extrabold mt-0.5 ${textColorMap[tab.color]}`}>{formatCurrency(tab.amount)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Member List */}
          <div className='px-4 space-y-1.5'>
            {eventsLoading ? (
              [...Array(6)].map((_, i) => <div key={i} className='skeleton-shimmer h-16 rounded-xl' />)
            ) : activeMembers.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className='backdrop-blur-xl rounded-2xl p-8 text-center shadow-sm' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.72))' }}>
                <div className='text-3xl mb-2'>{activeTab === 'overdue' ? '🎉' : activeTab === 'today' ? '✨' : '📅'}</div>
                <p className='text-sm font-bold' style={{ color: 'var(--theme-text-primary, #334155)' }}>
                  {activeTab === 'overdue' ? 'No overdue!' : activeTab === 'today' ? 'All caught up!' : 'Nothing tomorrow'}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode='wait'>
                <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                  {activeMembers.map((member, idx) => {
                    const dueDate = member.next_payment_due_date ? startOfDay(new Date(member.next_payment_due_date)) : startOfDay(new Date(member.event_date));
                    const daysOverdue = Math.max(0, Math.floor((actualToday.getTime() - dueDate.getTime()) / 86400000));
                    const isOverdue = activeTab === 'overdue';

                    return (
                      <motion.div key={member.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.15) }}
                        onClick={() => handleMemberClick(member)}
                        className='backdrop-blur-xl rounded-xl p-3 mb-1.5 cursor-pointer shadow-sm active:scale-[0.98] transition-transform'
                        style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.75))' }}>
                        <div className='flex items-center gap-3'>
                          <div className='relative'>
                            <Avatar className='w-10 h-10 border-2 border-white/70 shadow-md'>
                              <AvatarImage src={member.photo_url || undefined} />
                              <AvatarFallback className={`text-white text-xs font-bold ${isOverdue ? 'bg-gradient-to-br from-red-400 to-orange-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                                {member.member_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {isOverdue && daysOverdue > 10 && (
                              <div className='absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center'>
                                <span className='text-[7px] font-bold text-white'>!</span>
                              </div>
                            )}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-[13px] font-bold truncate' style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{member.member_name}</p>
                            <div className='flex items-center gap-1.5 mt-0.5'>
                              {member.plan_name && (
                                <span className='text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500'>{member.plan_name}</span>
                              )}
                              {isOverdue && (
                                <span className='text-[9px] font-bold text-red-500'>{daysOverdue}d late</span>
                              )}
                            </div>
                          </div>
                          <div className='flex flex-col items-end gap-1.5'>
                            <p className={`text-sm font-extrabold ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                              {formatCurrency(member.amount || 0)}
                            </p>
                            <div className='flex gap-1'>
                              <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => handleCall(e, member.member_phone)}
                                className='w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center'>
                                <Phone className='w-3 h-3 text-blue-600' />
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => handleWhatsApp(e, member)}
                                className='w-6 h-6 rounded-full bg-green-100 flex items-center justify-center'>
                                <MessageCircle className='w-3 h-3 text-green-600' />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className='flex-shrink-0'><BottomNavigation /></div>
      </div>

      <UnifiedMemberPopup member={selectedMemberForPopup} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        onUpdate={() => { refetchStats(); refetchEvents(); queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); queryClient.invalidateQueries({ queryKey: ['calendar-stats'] }); queryClient.invalidateQueries({ queryKey: ['members-with-due'] }); }}
      />
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}
