/**
 * Dashboard Variation 2: "Metric-First"
 * ─────────────────────────────────────────
 * Philosophy: Mindbody/GlofoxPro — Full-width financial summary card,
 * horizontal member count pills, segregated due/overdue with severity tiers.
 * Owner gets a "business health" snapshot before any action items.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { CalendarEvent } from '@/lib/gymService';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, ChevronRight, MessageCircle, Send, TrendingDown, TrendingUp, Clock, Zap } from 'lucide-react';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedMemberPopup, UnifiedMemberData } from '@/components/common/UnifiedMemberPopup';
import { isSameDay, startOfMonth, format, addMonths, subMonths, isBefore, startOfDay, isSameMonth, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useAppReady } from '@/contexts/AppReadyContext';
import { buildOwnerDailySummary, fetchPendingInstallmentsForSummary } from '@/lib/ownerSummary';
import { toast } from 'react-hot-toast';
import { useDashboardStats, useDashboardEvents } from '@/hooks/useDashboardData';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};

export default function DashboardV4() {
  const { gym } = useAuthStore();
  const queryClient = useQueryClient();
  const { setDataReady, isSplashComplete } = useAppReady();
  const [selectedMemberForPopup, setSelectedMemberForPopup] = useState<UnifiedMemberData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    } catch { toast.error('Failed to generate summary'); }
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
  }));

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
  const monthTarget = overdueTotal + dueTodayTotal + monthCollected;
  const collectionRate = monthTarget > 0 ? Math.round((monthCollected / monthTarget) * 100) : 100;

  // Severity tiers for overdue
  const criticalOverdue = overdue.filter(e => {
    const d = e.next_payment_due_date ? startOfDay(new Date(e.next_payment_due_date)) : startOfDay(new Date(e.event_date));
    return Math.floor((actualToday.getTime() - d.getTime()) / 86400000) > 10;
  });
  const recentOverdue = overdue.filter(e => {
    const d = e.next_payment_due_date ? startOfDay(new Date(e.next_payment_due_date)) : startOfDay(new Date(e.event_date));
    return Math.floor((actualToday.getTime() - d.getTime()) / 86400000) <= 10;
  });

  if (loading && isSplashComplete) {
    return (
      <div className='fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]' style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
        <div className="absolute top-[-25%] left-[-20%] w-[80%] h-[65%] rounded-full blur-3xl opacity-30 pointer-events-none animate-blob" style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }} />
        <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-25 pointer-events-none animate-blob animation-delay-4000" style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }} />
        <div className="relative z-10 p-4 space-y-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between"><div className="skeleton-shimmer h-10 w-40 rounded-xl" /><div className="skeleton-shimmer h-9 w-9 rounded-full" /></div>
          <div className="skeleton-shimmer h-32 rounded-2xl" />
          <div className="flex gap-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton-shimmer h-10 flex-1 rounded-full" />)}</div>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton-shimmer h-14 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const MemberRow = ({ member, isOverdue, daysLabel }: { member: CalendarEvent; isOverdue: boolean; daysLabel: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      onClick={() => handleMemberClick(member)}
      className='flex items-center gap-2.5 py-2 px-1 cursor-pointer active:bg-white/30 rounded-lg transition-colors'
    >
      <Avatar className='w-9 h-9 border-2 border-white/60 shadow-sm flex-shrink-0'>
        <AvatarImage src={member.photo_url || undefined} />
        <AvatarFallback className={`text-white text-[11px] font-bold ${isOverdue ? 'bg-gradient-to-br from-red-400 to-orange-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
          {member.member_name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className='flex-1 min-w-0'>
        <p className='text-[13px] font-bold truncate' style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{member.member_name}</p>
        <p className='text-[10px] font-medium' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{daysLabel}</p>
      </div>
      <p className={`text-xs font-extrabold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>{formatCurrency(member.amount || 0)}</p>
      <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => handleWhatsApp(e, member)}
        className='w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-sm flex items-center justify-center flex-shrink-0'>
        <MessageCircle className='w-3 h-3 text-white' />
      </motion.button>
    </motion.div>
  );

  return (
    <div className='fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]' style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      <div className="fixed top-[-25%] left-[-20%] w-[80%] h-[65%] rounded-full blur-3xl opacity-50 pointer-events-none z-0 animate-blob" style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }} />
      <div className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }} />

      <div className='relative z-10 flex flex-col h-full'>

        {/* Header */}
        <header className='flex-shrink-0 px-4 pb-1 flex items-center justify-between' style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div>
            <p className='text-base font-extrabold' style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{getGreeting()}</p>
            <p className='text-[11px] font-medium -mt-0.5' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{format(new Date(), 'EEEE, d MMM')}</p>
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

          {/* Financial Summary Card */}
          <div className='px-4 mb-3 pt-2'>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className='backdrop-blur-xl rounded-2xl p-4 shadow-lg relative overflow-hidden'
              style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.85))' }}>

              {/* Month & nav */}
              <div className='flex items-center justify-between mb-3'>
                <span className='text-[10px] font-bold uppercase tracking-widest' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{format(currentMonth, 'MMMM yyyy')}</span>
                <div className='flex items-center gap-1'>
                  <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className='w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100'>
                    <ChevronLeft className='w-3.5 h-3.5' style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                  </button>
                  <button onClick={() => canGoNext && setCurrentMonth(prev => addMonths(prev, 1))} disabled={!canGoNext}
                    className={`w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 ${!canGoNext ? 'opacity-30' : ''}`}>
                    <ChevronRight className='w-3.5 h-3.5' style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                  </button>
                </div>
              </div>

              {/* Hero number */}
              <div className='mb-3'>
                <p className='text-2xl font-black text-emerald-600 leading-none'>₹{monthCollected.toLocaleString('en-IN')}</p>
                <p className='text-[10px] font-semibold mt-1' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>collected this month</p>
              </div>

              {/* Progress bar */}
              <div className='h-2 rounded-full bg-slate-200/60 overflow-hidden mb-2'>
                <motion.div initial={{ width: 0 }} animate={{ width: `${collectionRate}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${collectionRate >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : collectionRate >= 40 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                />
              </div>

              {/* Sub-metrics */}
              <div className='grid grid-cols-3 gap-2'>
                <div className='text-center'>
                  <p className='text-xs font-extrabold text-blue-600'>₹{(stats?.today?.collections || 0).toLocaleString('en-IN')}</p>
                  <p className='text-[8px] font-bold uppercase text-slate-400'>Today</p>
                </div>
                <div className='text-center'>
                  <p className='text-xs font-extrabold text-orange-500'>₹{(overdueTotal + dueTodayTotal).toLocaleString('en-IN')}</p>
                  <p className='text-[8px] font-bold uppercase text-slate-400'>Pending</p>
                </div>
                <div className='text-center'>
                  <p className='text-xs font-extrabold text-purple-600'>₹{dueTomorrowTotal.toLocaleString('en-IN')}</p>
                  <p className='text-[8px] font-bold uppercase text-slate-400'>Tomorrow</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Member Count Pills */}
          <div className='px-4 mb-4'>
            <div className='flex gap-2 overflow-x-auto scrollbar-hide'>
              {[
                { label: 'Active', value: stats?.members?.active || 0, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                { label: 'Expired', value: stats?.members?.expired || 0, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                { label: 'New', value: stats?.thisMonth?.newMembers || 0, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                { label: 'Churned', value: stats?.thisMonth?.churned || 0, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
              ].map((pill, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${pill.bg} ${pill.border} flex-shrink-0`}>
                  <span className={`text-sm font-extrabold ${pill.text}`}>{pill.value}</span>
                  <span className={`text-[10px] font-semibold ${pill.text} opacity-70`}>{pill.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Due Today Section */}
          {dueToday.length > 0 && (
            <div className='px-4 mb-4'>
              <div className='flex items-center gap-2 mb-2'>
                <Zap className='w-3.5 h-3.5 text-amber-500' />
                <span className='text-xs font-bold uppercase tracking-wider' style={{ color: 'var(--theme-text-primary, #334155)' }}>Due Today</span>
                <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'>{dueToday.length}</span>
                <span className='ml-auto text-xs font-extrabold text-amber-600'>{formatCurrency(dueTodayTotal)}</span>
              </div>
              <div className='backdrop-blur-xl rounded-xl px-2 divide-y divide-slate-100/50' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.72))' }}>
                {dueToday.map(m => <MemberRow key={m.id} member={m} isOverdue={false} daysLabel='Due today' />)}
              </div>
            </div>
          )}

          {/* Overdue — Critical (>10 days) */}
          {criticalOverdue.length > 0 && (
            <div className='px-4 mb-4'>
              <div className='flex items-center gap-2 mb-2'>
                <TrendingDown className='w-3.5 h-3.5 text-red-500' />
                <span className='text-xs font-bold uppercase tracking-wider' style={{ color: 'var(--theme-text-primary, #334155)' }}>Critical Overdue</span>
                <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700'>{criticalOverdue.length}</span>
                <span className='ml-auto text-xs font-extrabold text-red-600'>{formatCurrency(criticalOverdue.reduce((s, e) => s + (e.amount || 0), 0))}</span>
              </div>
              <div className='backdrop-blur-xl rounded-xl px-2 divide-y divide-slate-100/50 border border-red-200/50' style={{ backgroundColor: 'rgba(254,226,226,0.3)' }}>
                {criticalOverdue.map(m => {
                  const d = m.next_payment_due_date ? startOfDay(new Date(m.next_payment_due_date)) : startOfDay(new Date(m.event_date));
                  const days = Math.floor((actualToday.getTime() - d.getTime()) / 86400000);
                  return <MemberRow key={m.id} member={m} isOverdue daysLabel={`${days} days overdue`} />;
                })}
              </div>
            </div>
          )}

          {/* Overdue — Recent (<=10 days) */}
          {recentOverdue.length > 0 && (
            <div className='px-4 mb-4'>
              <div className='flex items-center gap-2 mb-2'>
                <Clock className='w-3.5 h-3.5 text-orange-500' />
                <span className='text-xs font-bold uppercase tracking-wider' style={{ color: 'var(--theme-text-primary, #334155)' }}>Recently Overdue</span>
                <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700'>{recentOverdue.length}</span>
                <span className='ml-auto text-xs font-extrabold text-orange-600'>{formatCurrency(recentOverdue.reduce((s, e) => s + (e.amount || 0), 0))}</span>
              </div>
              <div className='backdrop-blur-xl rounded-xl px-2 divide-y divide-slate-100/50' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.72))' }}>
                {recentOverdue.map(m => {
                  const d = m.next_payment_due_date ? startOfDay(new Date(m.next_payment_due_date)) : startOfDay(new Date(m.event_date));
                  const days = Math.floor((actualToday.getTime() - d.getTime()) / 86400000);
                  return <MemberRow key={m.id} member={m} isOverdue daysLabel={`${days} days overdue`} />;
                })}
              </div>
            </div>
          )}

          {/* Tomorrow preview */}
          {dueTomorrow.length > 0 && (
            <div className='px-4 mb-4'>
              <div className='flex items-center gap-2 mb-2'>
                <TrendingUp className='w-3.5 h-3.5 text-purple-500' />
                <span className='text-xs font-bold uppercase tracking-wider' style={{ color: 'var(--theme-text-primary, #334155)' }}>Tomorrow</span>
                <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700'>{dueTomorrow.length}</span>
                <span className='ml-auto text-xs font-extrabold text-purple-600'>{formatCurrency(dueTomorrowTotal)}</span>
              </div>
              <div className='backdrop-blur-xl rounded-xl px-2 divide-y divide-slate-100/50' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.72))' }}>
                {dueTomorrow.slice(0, 5).map(m => <MemberRow key={m.id} member={m} isOverdue={false} daysLabel='Due tomorrow' />)}
                {dueTomorrow.length > 5 && (
                  <div className='py-2 text-center'>
                    <span className='text-[10px] font-bold text-purple-500'>+{dueTomorrow.length - 5} more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!eventsLoading && dueToday.length === 0 && overdue.length === 0 && (
            <div className='px-4'>
              <div className='backdrop-blur-xl rounded-2xl p-8 text-center shadow-sm' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.72))' }}>
                <div className='text-4xl mb-2'>✨</div>
                <p className='text-sm font-bold' style={{ color: 'var(--theme-text-primary, #334155)' }}>You're all caught up!</p>
                <p className='text-xs mt-1' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>No pending payments for this month</p>
              </div>
            </div>
          )}

          {eventsLoading && (
            <div className='px-4 space-y-2'>
              {[...Array(5)].map((_, i) => <div key={i} className='skeleton-shimmer h-14 rounded-xl' />)}
            </div>
          )}
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
