import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MessageCircle, Send, Cake, Receipt, Clock, CalendarClock,
  UserPlus, Users, ChevronRight, Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase, getCurrentGymId } from '@/lib/supabase';
import {
  MESSAGE_CATEGORIES,
  birthdayMessage,
  paymentReceiptMessage,
  paymentReminderMessage,
  expiryAlertMessage,
  welcomeMessage,
} from '@/lib/whatsappService';
import WhatsAppSendQueue from '@/components/common/WhatsAppSendQueue';
import { useMessageTemplates } from '@/lib/messageTemplates';
import { auditLogger } from '@/lib/auditLogger';
import type { Member, Payment } from '@/types/database';

// ── Category icons mapping ──────────────────────────────
const CATEGORY_ICONS: Record<string, typeof Cake> = {
  birthday: Cake,
  receipt: Receipt,
  reminder: Clock,
  expiry: CalendarClock,
  welcome: UserPlus,
};

const CATEGORY_COLORS: Record<string, string> = {
  birthday: 'from-pink-500 to-rose-500',
  receipt: 'from-green-500 to-emerald-600',
  reminder: 'from-orange-400 to-amber-500',
  expiry: 'from-purple-500 to-indigo-500',
  welcome: 'from-blue-500 to-cyan-500',
};

const CATEGORY_INLINE_COLORS: Record<string, { base: string; gradient: string; shadow: string }> = {
  birthday: { base: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #F43F5E)', shadow: 'rgba(236,72,153,0.3)' },
  receipt: { base: '#10B981', gradient: 'linear-gradient(135deg, #22C55E, #059669)', shadow: 'rgba(16,185,129,0.3)' },
  reminder: { base: '#F59E0B', gradient: 'linear-gradient(135deg, #FB923C, #F59E0B)', shadow: 'rgba(245,158,11,0.3)' },
  expiry: { base: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7, #6366F1)', shadow: 'rgba(168,85,247,0.3)' },
  welcome: { base: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #06B6D4)', shadow: 'rgba(59,130,246,0.3)' },
};

// ── Data fetching hooks ─────────────────────────────────

function useBirthdayMembersForSend() {
  const { gym } = useAuthStore();
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  return useQuery({
    queryKey: ['send-birthday-members', gym?.id, month, day],
    queryFn: async (): Promise<Member[]> => {
      const gymId = await getCurrentGymId();
      if (!gymId) return [];
      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .in('status', ['active', 'frozen'])
        .not('date_of_birth', 'is', null);
      if (error) throw error;
      return (data || []).filter((m: any) => {
        if (!m.date_of_birth) return false;
        const dob = new Date(m.date_of_birth);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
      }) as Member[];
    },
    enabled: !!gym?.id,
    staleTime: 60_000 * 30,
  });
}

function useTodayPayments() {
  const { gym } = useAuthStore();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  return useQuery({
    queryKey: ['send-today-payments', gym?.id, today],
    queryFn: async (): Promise<{ member: Member; payment: Payment }[]> => {
      const gymId = await getCurrentGymId();
      if (!gymId) return [];
      const { data, error } = await supabase
        .from('gym_payments')
        .select('*, member:gym_members(*)')
        .eq('gym_id', gymId)
        .eq('status', 'succeeded')
        .gte('paid_at', `${today}T00:00:00`)
        .lte('paid_at', `${today}T23:59:59`)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data || [])
        .filter((p: any) => p.member)
        .map((p: any) => ({ member: p.member as Member, payment: p as Payment }));
    },
    enabled: !!gym?.id,
    staleTime: 60_000 * 5,
  });
}

/** Local (device) date as YYYY-MM-DD, offset by N days — avoids UTC date shifts in India. */
function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function useOverdueMembers() {
  const { gym } = useAuthStore();
  const today = localDate(0);

  return useQuery({
    queryKey: ['send-overdue-members', gym?.id, today],
    queryFn: async (): Promise<Member[]> => {
      const gymId = await getCurrentGymId();
      if (!gymId) return [];
      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .lt('next_payment_due_date', today)
        .order('next_payment_due_date', { ascending: true });
      if (error) throw error;
      return (data || []) as Member[];
    },
    enabled: !!gym?.id,
    staleTime: 60_000 * 10,
  });
}

function useExpiringMembers() {
  const { gym } = useAuthStore();
  const todayStr = localDate(0);
  const weekStr = localDate(7);

  // "Renewal due" = next payment due date (same date the Dashboard uses)
  return useQuery({
    queryKey: ['send-renewals-due', gym?.id, todayStr],
    queryFn: async (): Promise<Member[]> => {
      const gymId = await getCurrentGymId();
      if (!gymId) return [];
      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .gte('next_payment_due_date', todayStr)
        .lte('next_payment_due_date', weekStr)
        .order('next_payment_due_date', { ascending: true });
      if (error) throw error;
      return (data || []) as Member[];
    },
    enabled: !!gym?.id,
    staleTime: 60_000 * 10,
  });
}

function useNewMembers() {
  const { gym } = useAuthStore();
  const today = localDate(0);

  return useQuery({
    queryKey: ['send-new-members', gym?.id, today],
    queryFn: async (): Promise<Member[]> => {
      const gymId = await getCurrentGymId();
      if (!gymId) return [];
      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .eq('joining_date', today)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Member[];
    },
    enabled: !!gym?.id,
    staleTime: 60_000 * 10,
  });
}

// ── Main component ──────────────────────────────────────

export default function SendMessages() {
  const navigate = useNavigate();
  const { gym } = useAuthStore();
  const { symbol } = useCurrency();
  const gymName = gym?.name || 'Our Gym';

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'expiry');
  type DueWindow = 'today' | '2days' | 'week';
  const [dueWindow, setDueWindow] = useState<DueWindow>(
    (searchParams.get('window') as DueWindow) || 'today'
  );
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueMembers, setQueueMembers] = useState<Member[]>([]);
  const [queueTitle, setQueueTitle] = useState('');
  const [queueGenerator, setQueueGenerator] = useState<(m: Member) => string>(() => () => '');

  // Fetch data for all categories
  const { data: birthdayMembers = [], isLoading: loadingBirthday } = useBirthdayMembersForSend();
  const { data: todayPayments = [], isLoading: loadingPayments } = useTodayPayments();
  const { getTemplate } = useMessageTemplates();
  const { data: overdueMembers = [], isLoading: loadingOverdue } = useOverdueMembers();
  const { data: renewalsDueAll = [], isLoading: loadingExpiring } = useExpiringMembers();
  const dueDayOf = (m: Member) => m.next_payment_due_date?.slice(0, 10) || '';
  const dueWindowCounts = {
    today: renewalsDueAll.filter((m) => dueDayOf(m) === localDate(0)).length,
    '2days': renewalsDueAll.filter((m) => dueDayOf(m) === localDate(2)).length,
    week: renewalsDueAll.length,
  };
  const expiringMembers = useMemo(() => {
    if (dueWindow === 'today') return renewalsDueAll.filter((m) => dueDayOf(m) === localDate(0));
    if (dueWindow === '2days') return renewalsDueAll.filter((m) => dueDayOf(m) === localDate(2));
    return renewalsDueAll;
  }, [renewalsDueAll, dueWindow]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: newMembers = [], isLoading: loadingNew } = useNewMembers();

  // Payment receipt members (deduplicated by member id)
  const receiptMembers = useMemo(() => {
    const seen = new Set<string>();
    return todayPayments.filter(({ member }) => {
      if (seen.has(member.id)) return false;
      seen.add(member.id);
      return !!member.phone;
    });
  }, [todayPayments]);

  // ── Counts per tab ──────────────────────────────────
  const counts: Record<string, number> = {
    birthday: birthdayMembers.length,
    receipt: receiptMembers.length,
    reminder: overdueMembers.length,
    expiry: expiringMembers.length,
    welcome: newMembers.length,
  };

  const isLoading: Record<string, boolean> = {
    birthday: loadingBirthday,
    receipt: loadingPayments,
    reminder: loadingOverdue,
    expiry: loadingExpiring,
    welcome: loadingNew,
  };

  // ── Get members for active tab ──────────────────────
  const activeMembers: Member[] = useMemo(() => {
    switch (activeTab) {
      case 'birthday': return birthdayMembers;
      case 'receipt': return receiptMembers.map((r) => r.member);
      case 'reminder': return overdueMembers;
      case 'expiry': return expiringMembers;
      case 'welcome': return newMembers;
      default: return [];
    }
  }, [activeTab, birthdayMembers, receiptMembers, overdueMembers, expiringMembers, newMembers]);

  // ── Generate message for a member ───────────────────
  const getMessageGenerator = (category: string): ((member: Member) => string) => {
    switch (category) {
      case 'birthday':
        return (m: Member) => birthdayMessage(m, gymName);
      case 'receipt':
        return (m: Member) => {
          const tp = todayPayments.find((p) => p.member.id === m.id);
          return tp
            ? paymentReceiptMessage(m, tp.payment, gymName, symbol, getTemplate('renewal'))
            : `Hi ${m.full_name}, thank you for your payment! - ${gymName}`;
        };
      case 'reminder':
        return (m: Member) => paymentReminderMessage(m, gymName, symbol, getTemplate('reminder'));
      case 'expiry':
        return (m: Member) => expiryAlertMessage(m, gymName, symbol, getTemplate('expiry'));
      case 'welcome':
        return (m: Member) => welcomeMessage(m, gymName, getTemplate('welcome'), { currencySymbol: symbol });
      default:
        return (m: Member) => `Hi ${m.full_name}! - ${gymName}`;
    }
  };

  // ── Open batch queue ────────────────────────────────
  const openQueue = (members: Member[], title: string, category: string) => {
    const phonemembers = members.filter((m) => m.phone);
    if (phonemembers.length === 0) return;
    setQueueMembers(phonemembers);
    setQueueTitle(title);
    setQueueGenerator(() => getMessageGenerator(category));
    setQueueOpen(true);
    auditLogger.log({
      category: 'NOTIFICATION',
      action: 'bulk_whatsapp_initiated' as any,
      resourceType: 'notification',
      resourceId: category,
      resourceName: title,
      success: true,
      metadata: { category, member_count: phonemembers.length },
    });
  };

  // ── Get subtitle for member in list ─────────────────
  const getMemberSubtitle = (member: Member): string => {
    switch (activeTab) {
      case 'birthday': {
        if (!member.date_of_birth) return '';
        const dob = new Date(member.date_of_birth);
        const age = new Date().getFullYear() - dob.getFullYear();
        return `Turns ${age} today 🎉`;
      }
      case 'receipt': {
        const tp = todayPayments.find((p) => p.member.id === member.id);
        return tp ? `${symbol}${tp.payment.amount.toLocaleString()} via ${(tp.payment.payment_method || 'cash').toUpperCase()}` : '';
      }
      case 'reminder': {
        if (!member.next_payment_due_date) return 'Payment overdue';
        const due = new Date(member.next_payment_due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        return days > 0 ? `${days} day(s) overdue` : 'Due today';
      }
      case 'expiry': {
        const due = dueDayOf(member);
        if (!due) return '';
        const days = Math.round((new Date(`${due}T00:00:00`).getTime() - new Date(`${localDate(0)}T00:00:00`).getTime()) / 86400000);
        const amt = member.plan_amount ? ` · ${symbol}${Number(member.plan_amount).toLocaleString('en-IN')}` : '';
        return (days <= 0 ? 'Due today' : `Due in ${days} day(s)`) + amt;
      }
      case 'welcome':
        return member.membership_plan ? member.membership_plan.replace('_', ' ') : 'New member';
      default:
        return '';
    }
  };

  const activeCat = MESSAGE_CATEGORIES.find((c) => c.id === activeTab)!;
  const totalToday = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div
      className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]"
      style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}
    >
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-16 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <div>
            <h1
              className="text-xl font-extrabold tracking-tight"
              style={{ color: 'var(--theme-text-primary, #1e293b)' }}
            >
              Send Messages
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              {totalToday} member{totalToday !== 1 ? 's' : ''} to message today
            </p>
          </div>
        </div>
      </header>

      {/* Category Tabs — Icon Grid */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div className="flex items-start justify-between gap-1">
          {MESSAGE_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id];
            const isActive = activeTab === cat.id;
            const count = counts[cat.id];
            const colors = CATEGORY_INLINE_COLORS[cat.id];
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className="flex flex-col items-center gap-1 flex-1 py-1 transition-all active:scale-95"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center relative transition-all"
                  style={isActive
                    ? { background: colors.gradient, boxShadow: `0 4px 12px ${colors.shadow}` }
                    : { backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', border: '1px solid rgba(255,255,255,0.4)' }
                  }
                >
                  <Icon className="w-5 h-5" style={{ color: isActive ? '#FFFFFF' : colors.base }} />
                  {count > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center"
                      style={isActive
                        ? { backgroundColor: '#FFFFFF', color: colors.base }
                        : { backgroundColor: colors.base, color: '#FFFFFF' }
                      }
                    >
                      {count}
                    </span>
                  )}
                </div>
                <span
                  className="text-[9px] font-bold leading-tight"
                  style={{ color: isActive ? colors.base : 'var(--theme-text-muted, #7a7a7a)' }}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Category Header + Send All */}
      <div className="flex-shrink-0 px-4 pt-2 pb-1">
        <div
          className="rounded-2xl p-3 shadow-sm border border-white/30"
          style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-bold"
                style={{ color: 'var(--theme-text-primary, #1e293b)' }}
              >
                {activeCat.emoji} {activeCat.label}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                {activeCat.description}
              </p>
            </div>
            {activeMembers.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() =>
                  openQueue(activeMembers, `${activeCat.emoji} ${activeCat.label}`, activeTab)
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[11px] font-bold shadow-md shadow-green-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                Send All ({activeMembers.filter((m) => m.phone).length})
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Renewal window switch */}
      {activeTab === 'expiry' && (
        <div className="flex-shrink-0 px-4 pt-2">
          <div className="flex gap-1.5">
            {([
              ['today', 'Today'],
              ['2days', 'In 2 days'],
              ['week', 'This week'],
            ] as [DueWindow, string][]).map(([key, label]) => {
              const active = dueWindow === key;
              return (
                <button
                  key={key}
                  onClick={() => setDueWindow(key)}
                  className={`flex-1 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'border-white/50'}`}
                  style={active ? undefined : { backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))', color: 'var(--theme-text-primary, #1e293b)' }}
                >
                  {label} ({dueWindowCounts[key]})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Member List */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-2 pb-24 space-y-1.5" style={{ overscrollBehavior: 'contain' }}>
        {isLoading[activeTab] ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: 'var(--theme-text-muted, #94a3b8)' }}
            />
          </div>
        ) : activeMembers.length === 0 ? (
          <div
            className="text-center py-12 rounded-2xl border border-white/30"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
              No members found
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
              {activeTab === 'birthday' && 'No birthdays today'}
              {activeTab === 'receipt' && 'No payments received today'}
              {activeTab === 'reminder' && 'No overdue payments'}
              {activeTab === 'expiry' && (dueWindow === 'today' ? 'No renewals due today' : dueWindow === '2days' ? 'No renewals due in 2 days' : 'No renewals due this week')}
              {activeTab === 'welcome' && 'No new members joined today'}
            </p>
          </div>
        ) : (
          activeMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              subtitle={getMemberSubtitle(member)}
              category={activeTab}
              onSend={() => openQueue([member], `Message to ${member.full_name}`, activeTab)}
            />
          ))
        )}
      </div>

      {/* WhatsApp Send Queue Modal */}
      <WhatsAppSendQueue
        isOpen={queueOpen}
        onClose={() => setQueueOpen(false)}
        members={queueMembers}
        messageGenerator={queueGenerator}
        title={queueTitle}
      />
    </div>
  );
}

// ── Member Row Component ────────────────────────────────

function MemberRow({
  member,
  subtitle,
  category,
  onSend,
}: {
  member: Member;
  subtitle: string;
  category: string;
  onSend: () => void;
}) {
  const gradient = CATEGORY_COLORS[category] || 'from-green-500 to-emerald-600';

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl shadow-sm border border-white/30"
      style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
    >
      <div
        className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
      >
        {member.full_name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-bold truncate"
          style={{ color: 'var(--theme-text-primary, #1e293b)' }}
        >
          {member.full_name}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
          {subtitle}
        </p>
      </div>
      {member.phone ? (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onSend}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-sm flex items-center justify-center flex-shrink-0"
        >
          <MessageCircle className="w-3.5 h-3.5 text-white" />
        </motion.button>
      ) : (
        <span className="text-[9px] text-gray-400 flex-shrink-0">No phone</span>
      )}
    </div>
  );
}
