/**
 * Dashboard Variation 1: "Command Center"
 * ─────────────────────────────────────────
 * Philosophy: Stripe/Razorpay — single hero metric (collection ring),
 * compact header, priority-sorted overdue, collapsible empty states.
 * The owner opens the app and in <1s knows: "Am I on track today?"
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { CalendarEvent } from '@/lib/gymService';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, ChevronRight, MessageCircle, Send, Users, TrendingUp, AlertTriangle, CheckCircle2, ArrowUpRight } from 'lucide-react';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UnifiedMemberPopup, UnifiedMemberData } from '@/components/common/UnifiedMemberPopup';
import { isSameDay, startOfMonth, format, addMonths, subMonths, isBefore, startOfDay, isSameMonth, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useAppReady } from '@/contexts/AppReadyContext';
import { buildOwnerDailySummary, fetchPendingInstallmentsForSummary } from '@/lib/ownerSummary';
import { toast } from 'react-hot-toast';
import { useDashboardStats, useDashboardEvents } from '@/hooks/useDashboardData';

// ── Animated ring chart ──
const CollectionRing = ({ collected, target, size = 100 }: { collected: number; target: number; size?: number }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = target > 0 ? Math.min((collected / target) * 100, 100) : 0;
  const strokeDash = (percentage / 100) * circumference;

  return (
    <div className='relative' style={{ width: size, height: size }}>
      <svg width={size} height={size} className='-rotate-90'>
        <circle cx={size / 2} cy={size / 2} r={radius} fill='none' stroke='rgba(148,163,184,0.15)' strokeWidth={8} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill='none'
          stroke='url(#ringGradient)' strokeWidth={8} strokeLinecap='round'
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${strokeDash} ${circumference - strokeDash}` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id='ringGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
            <stop offset='0%' stopColor='#34d399' />
            <stop offset='100%' stopColor='#06b6d4' />
          </linearGradient>
        </defs>
      </svg>
      <div className='absolute inset-0 flex flex-col items-center justify-center'>
        <span className='text-xl font-extrabold' style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{Math.round(percentage)}%</span>
        <span className='text-[9px] font-medium' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>collected</span>
      </div>
    </div>
  );
};

// ── Greeting ──
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
};

export default function DashboardV3() {
  const { gym } = useAuthStore();
  const navigate = useNavigate();
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
    return events.filter(e => {
      const dup = seen.has(e.member_id);
      seen.add(e.member_id);
      return !dup;
    });
  }, []);

  useEffect(() => {
    if (!loading && gym?.id) setDataReady();
  }, [loading, gym?.id, setDataReady]);

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
    const message = `Hi ${member.member_name}, this is a reminder from ${gym?.name || 'the gym'} regarding your membership payment.`;
    window.open(`https://wa.me/91${member.member_phone}?text=${encodeURIComponent(message)}`, '_blank');
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
      toast.success('Daily summary ready!');
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
  })).sort((a, b) => (b.amount || 0) - (a.amount || 0)); // Sort by amount desc — highest priority first

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

  // Combine due today + overdue into single priority list
  const allActionable = [...dueToday.map(m => ({ ...m, _type: 'today' as const })), ...overdue.map(m => ({ ...m, _type: 'overdue' as const }))];

  if (loading && isSplashComplete) {
    return (
      <div className='fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]' style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
        <div className="absolute top-[-25%] left-[-20%] w-[80%] h-[65%] rounded-full blur-3xl opacity-30 pointer-events-none animate-blob" style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }} />
        <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-25 pointer-events-none animate-blob animation-delay-4000" style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }} />
        <div className="relative z-10 p-4 space-y-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="skeleton-shimmer h-9 w-32 rounded-xl" />
            <div className="skeleton-shimmer h-9 w-9 rounded-full" />
          </div>
          <div className="flex justify-center"><div className="skeleton-shimmer h-28 w-28 rounded-full" /></div>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton-shimmer h-14 rounded-xl" />)}
          </div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton-shimmer h-14 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]' style={{ backgroundColor: 'var(--theme-bg, #E0F2FE)' }}>
      {/* Background */}
      <div className="fixed top-[-25%] left-[-20%] w-[80%] h-[65%] rounded-full blur-3xl opacity-50 pointer-events-none z-0 animate-blob" style={{ backgroundColor: 'var(--theme-blob-1, #6EE7B7)' }} />
      <div className="fixed bottom-[-15%] right-[-15%] w-[70%] h-[55%] rounded-full blur-3xl opacity-40 pointer-events-none z-0 animate-blob animation-delay-4000" style={{ backgroundColor: 'var(--theme-blob-2, #FCA5A5)' }} />

      <div className='relative z-10 flex flex-col h-full'>
        {/* ── Compact Header: 1 row ── */}
        <header className='flex-shrink-0 px-4 pb-2 flex items-center justify-between' style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div>
            <p className='text-sm font-bold' style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Good {getGreeting()} <span className='text-lg'>👋</span></p>
            <p className='text-[11px] font-medium' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{gym?.name || 'Your Gym'}</p>
          </div>
          <div className='flex items-center gap-2'>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleOwnerDailySummary}
              className='w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm'>
              <Send className='w-3.5 h-3.5 text-white' />
            </motion.button>
            <UserProfileDropdown />
          </div>
        </header>

        {/* ── Scrollable Content ── */}
        <div className='flex-1 overflow-y-auto min-h-0 pb-20 scrollbar-hide' style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}>

          {/* Hero: Collection Ring + Key Numbers */}
          <div className='px-4 mb-4'>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className='backdrop-blur-xl rounded-3xl p-4 shadow-lg'
              style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.82))' }}
            >
              <div className='flex items-center gap-4'>
                <CollectionRing collected={monthCollected} target={monthTarget} size={96} />
                <div className='flex-1 space-y-1.5'>
                  <div>
                    <p className='text-[10px] font-semibold uppercase tracking-wider' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>This month</p>
                    <p className='text-lg font-extrabold text-emerald-600'>₹{monthCollected.toLocaleString('en-IN')}</p>
                  </div>
                  <div className='h-px bg-slate-200/50' />
                  <div className='flex gap-3'>
                    <div>
                      <p className='text-[9px] uppercase font-bold' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Pending</p>
                      <p className='text-xs font-extrabold text-orange-500'>₹{(overdueTotal + dueTodayTotal).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className='text-[9px] uppercase font-bold' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Today</p>
                      <p className='text-xs font-extrabold text-blue-600'>₹{(stats?.today?.collections || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Stats Strip */}
          <div className='px-4 mb-4'>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className='grid grid-cols-4 gap-2'>
              {[
                { label: 'Active', value: stats?.members?.active || 0, color: 'text-emerald-600', icon: Users },
                { label: 'New', value: stats?.thisMonth?.newMembers || 0, color: 'text-blue-600', icon: ArrowUpRight },
                { label: 'Due Today', value: dueToday.length, color: 'text-amber-600', icon: CheckCircle2 },
                { label: 'Overdue', value: overdue.length, color: 'text-red-600', icon: AlertTriangle },
              ].map((item, i) => (
                <div key={i} className='backdrop-blur-xl rounded-xl p-2 text-center shadow-sm' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.72))' }}>
                  <item.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${item.color}`} />
                  <p className={`text-sm font-extrabold ${item.color}`}>{item.value}</p>
                  <p className='text-[8px] font-bold uppercase tracking-wider' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{item.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Month Nav */}
          <div className='px-4 mb-3 flex items-center justify-between'>
            <span className='text-xs font-bold uppercase tracking-wider' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
              Payment Queue
            </span>
            <div className='flex items-center backdrop-blur-md rounded-full shadow-sm overflow-hidden' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.6))' }}>
              <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className='w-7 h-7 flex items-center justify-center'>
                <ChevronLeft className='w-3.5 h-3.5' style={{ color: 'var(--theme-text-primary, #334155)' }} />
              </button>
              <span className='px-2 text-[11px] font-semibold' style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{format(currentMonth, 'MMM yyyy')}</span>
              <button onClick={() => canGoNext && setCurrentMonth(prev => addMonths(prev, 1))} disabled={!canGoNext}
                className={`w-7 h-7 flex items-center justify-center ${!canGoNext ? 'opacity-30' : ''}`}>
                <ChevronRight className='w-3.5 h-3.5' style={{ color: 'var(--theme-text-primary, #334155)' }} />
              </button>
            </div>
          </div>

          {/* ── Priority Queue: Single unified list ── */}
          <div className='px-4 space-y-2'>
            {eventsLoading ? (
              [...Array(6)].map((_, i) => <div key={i} className='skeleton-shimmer h-14 rounded-xl' />)
            ) : allActionable.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className='backdrop-blur-md rounded-2xl p-6 text-center shadow-sm' style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.7))' }}>
                <div className='text-3xl mb-2'>🎉</div>
                <p className='text-sm font-bold' style={{ color: 'var(--theme-text-primary, #334155)' }}>All caught up!</p>
                <p className='text-xs mt-1' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>No payments due or overdue</p>
              </motion.div>
            ) : (
              allActionable.map((member, idx) => {
                const isOverdue = member._type === 'overdue';
                const dueDate = member.next_payment_due_date ? startOfDay(new Date(member.next_payment_due_date)) : startOfDay(new Date(member.event_date));
                const daysOverdue = Math.max(0, Math.floor((actualToday.getTime() - dueDate.getTime()) / 86400000));

                return (
                  <motion.div key={member.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.2), duration: 0.15 }}
                    onClick={() => handleMemberClick(member)}
                    className={`backdrop-blur-md rounded-xl p-2.5 cursor-pointer shadow-sm ${
                      isOverdue ? 'border-l-3 border-red-400' : 'border-l-3 border-emerald-400'
                    }`}
                    style={{ backgroundColor: 'var(--theme-glass-bg, rgba(255,255,255,0.72))', borderLeftWidth: '3px' }}
                  >
                    <div className='flex items-center gap-2.5'>
                      <Avatar className='w-9 h-9 border-2 border-white/60 shadow-sm flex-shrink-0'>
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className={`text-white text-[11px] font-bold ${isOverdue ? 'bg-gradient-to-br from-red-400 to-orange-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                          {member.member_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-1.5'>
                          <p className='text-xs font-bold truncate' style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{member.member_name}</p>
                          {isOverdue && (
                            <span className='text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0'>
                              {daysOverdue}d
                            </span>
                          )}
                          {!isOverdue && (
                            <span className='text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0'>
                              TODAY
                            </span>
                          )}
                        </div>
                        <p className='text-[10px] font-medium' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{member.plan_name || 'Membership'}</p>
                      </div>
                      <p className={`text-xs font-extrabold flex-shrink-0 ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(member.amount || 0)}
                      </p>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => handleWhatsApp(e, member)}
                        className='w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-sm flex items-center justify-center flex-shrink-0'>
                        <MessageCircle className='w-3 h-3 text-white' />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })
            )}

            {/* Tomorrow Preview */}
            {dueTomorrow.length > 0 && !eventsLoading && (
              <div className='pt-3'>
                <p className='text-[10px] font-bold uppercase tracking-wider mb-2' style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                  Tomorrow — {dueTomorrow.length} member{dueTomorrow.length > 1 ? 's' : ''} · {formatCurrency(dueTomorrowTotal)}
                </p>
                <div className='flex -space-x-2'>
                  {dueTomorrow.slice(0, 8).map(m => (
                    <Avatar key={m.id} className='w-7 h-7 border-2 border-white shadow-sm'>
                      <AvatarImage src={m.photo_url || undefined} />
                      <AvatarFallback className='bg-gradient-to-br from-purple-400 to-purple-500 text-white text-[9px] font-bold'>
                        {m.member_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {dueTomorrow.length > 8 && (
                    <div className='w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center'>
                      <span className='text-[8px] font-bold text-slate-500'>+{dueTomorrow.length - 8}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Nav */}
        <div className='flex-shrink-0'><BottomNavigation /></div>
      </div>

      <UnifiedMemberPopup member={selectedMemberForPopup} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        onUpdate={() => { refetchStats(); refetchEvents(); queryClient.invalidateQueries({ queryKey: ['calendar-events'] }); queryClient.invalidateQueries({ queryKey: ['calendar-stats'] }); queryClient.invalidateQueries({ queryKey: ['members-with-due'] }); }}
      />
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}
