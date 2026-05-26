/**
 * Combined Reports Page – Monthly Overview + Revenue/Membership/Attendance Reports
 *
 * Top-level tabs: Overview (member-level monthly data) | Revenue | Membership | Attendance
 * Monthly Overview UI is the base design.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Download, RefreshCw,
  ChevronLeft, ChevronRight, Users, UserPlus, UserMinus,
  CreditCard, AlertTriangle, TrendingUp,
  CheckCircle2, XCircle, Clock, Eye,
  X, Phone, Tag, History,
  Ban, Wallet, LayoutGrid, Table2, MapPin
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  fetchMonthlyOverview,
  type MonthlyOverviewData,
  type MonthlyMemberRow,
  type MemberCategory,
} from '@/lib/adminMonthlyService';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '@/lib/supabase';
import { auditLogger } from '@/lib/auditLogger';
import UserProfileDropdown from '@/components/common/UserProfileDropdown';
import { ThumbnailImage } from '@/components/common/ThumbnailImage';

// ═══════════════════════════════════════════════════════════
// Report Data Hooks
// ═══════════════════════════════════════════════════════════

function useRevenueData(months: number = 6) {
  return useQuery({
    queryKey: ['reports', 'revenue', months],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');
      const results: { month: string; amount: number }[] = [];
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const target = subMonths(now, i);
        const start = format(startOfMonth(target), 'yyyy-MM-dd');
        const end = format(endOfMonth(target), 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from('gym_payments')
          .select('amount')
          .eq('gym_id', gymId)
          .gte('payment_date', start)
          .lte('payment_date', end);
        if (error) throw error;
        const total = (data || []).reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
        results.push({ month: format(target, 'MMM'), amount: total });
      }
      return results;
    },
  });
}

function useMembershipData(months: number = 6) {
  return useQuery({
    queryKey: ['reports', 'membership', months],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');
      const results: { month: string; new: number; active: number; churned: number }[] = [];
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const target = subMonths(now, i);
        const start = format(startOfMonth(target), 'yyyy-MM-dd');
        const end = format(endOfMonth(target), 'yyyy-MM-dd');
        const { count: newCount } = await supabase
          .from('gym_members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .gte('joining_date', start)
          .lte('joining_date', end);
        const { count: activeCount } = await supabase
          .from('gym_members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .eq('status', 'active')
          .lte('joining_date', end);
        const { count: churnedCount } = await supabase
          .from('gym_members')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .eq('status', 'inactive')
          .gte('deactivated_at', start)
          .lte('deactivated_at', end);
        results.push({
          month: format(target, 'MMM'),
          new: newCount || 0,
          active: activeCount || 0,
          churned: churnedCount || 0,
        });
      }
      return results;
    },
  });
}

function useAttendanceData(months: number = 6) {
  return useQuery({
    queryKey: ['reports', 'attendance', months],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');
      const results: { month: string; checkIns: number; uniqueMembers: number }[] = [];
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const target = subMonths(now, i);
        const start = format(startOfMonth(target), "yyyy-MM-dd'T'00:00:00");
        const end = format(endOfMonth(target), "yyyy-MM-dd'T'23:59:59");
        const { data, error } = await supabase
          .from('gym_check_ins')
          .select('member_id')
          .eq('gym_id', gymId)
          .gte('check_in_time', start)
          .lte('check_in_time', end);
        if (error) throw error;
        const uniqueMembers = new Set((data || []).map((d: { member_id: string }) => d.member_id)).size;
        results.push({
          month: format(target, 'MMM'),
          checkIns: (data || []).length,
          uniqueMembers,
        });
      }
      return results;
    },
  });
}

// ═══════════════════════════════════════════════════════════
// Monthly Overview Types & Config
// ═══════════════════════════════════════════════════════════

type TabId = 'overview' | 'new_join' | 'inactive' | 'paid' | 'unpaid' | 'due_issues' | 'overdue';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  categories: MemberCategory[];
}

const MEMBER_TABS: TabDef[] = [
  { id: 'overview', label: 'All', icon: Users, categories: [] },
  { id: 'new_join', label: 'New', icon: UserPlus, categories: ['new_join'] },
  { id: 'inactive', label: 'Left', icon: UserMinus, categories: ['inactive'] },
  { id: 'paid', label: 'Paid', icon: CreditCard, categories: ['paid'] },
  { id: 'unpaid', label: 'Unpaid', icon: Ban, categories: ['unpaid'] },
  { id: 'due_issues', label: 'Due Issues', icon: AlertTriangle, categories: ['due_date_issue'] },
  { id: 'overdue', label: 'Overdue', icon: Clock, categories: ['overdue'] },
];

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  try { return format(new Date(d + 'T00:00:00'), 'MMM d, yyyy'); } catch { return d; }
};

const fmtCurrency = (n: number | null | undefined) => {
  if (n === null || n === undefined) return '—';
  return formatCurrency(n);
};

function AnimatedNum({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const steps = 20;
    const inc = value / steps;
    let current = 0;
    const iv = setInterval(() => {
      current += inc;
      if (current >= value) { setDisplay(value); clearInterval(iv); }
      else setDisplay(Math.round(current));
    }, 25);
    return () => clearInterval(iv);
  }, [value]);
  return <span className={className}>{display}</span>;
}

// ═══════════════════════════════════════════════════════════
// Top-level section type
// ═══════════════════════════════════════════════════════════

type SectionId = 'members' | 'revenue' | 'membership' | 'attendance';

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'members', label: 'Overview', icon: Users },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'membership', label: 'Membership', icon: UserPlus },
  { id: 'attendance', label: 'Attendance', icon: MapPin },
];

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const { symbol, fc } = useCurrency();

  // Section state
  const [activeSection, setActiveSection] = useState<SectionId>('members');

  // Monthly Overview state
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlyOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedMember, setSelectedMember] = useState<MonthlyMemberRow | null>(null);

  // Report hooks
  const { data: revenueData, isLoading: revenueLoading } = useRevenueData(6);
  const { data: membershipData, isLoading: membershipLoading } = useMembershipData(6);
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceData(6);

  // Revenue computed values
  const totalRevenue = useMemo(() => (revenueData || []).reduce((s, d) => s + d.amount, 0), [revenueData]);
  const avgMonthly = useMemo(() => revenueData?.length ? Math.round(totalRevenue / revenueData.length) : 0, [totalRevenue, revenueData]);
  const maxRevenue = useMemo(() => Math.max(...(revenueData || []).map(d => d.amount), 1), [revenueData]);
  const growthRate = useMemo(() => {
    if (!revenueData || revenueData.length < 2) return 0;
    const last = revenueData[revenueData.length - 1].amount;
    const prev = revenueData[revenueData.length - 2].amount;
    if (prev === 0) return 0;
    return Math.round(((last - prev) / prev) * 100);
  }, [revenueData]);

  // Monthly Overview fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMonthlyOverview(currentMonth);
      setData(result);
    } catch (e: any) {
      console.error('Monthly overview fetch error:', e);
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtering
  const filteredMembers = useMemo(() => {
    if (!data) return [];
    let result = data.members;
    const tab = MEMBER_TABS.find(t => t.id === activeTab);
    if (tab && tab.categories.length > 0) {
      result = result.filter(m => tab.categories.some(c => m.categories.includes(c)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        m => m.fullName.toLowerCase().includes(q) || m.phone.includes(q) || m.planName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, activeTab, searchQuery]);

  const tabCounts = useMemo(() => {
    if (!data) return {} as Record<TabId, number>;
    const counts: Record<string, number> = {};
    for (const tab of MEMBER_TABS) {
      if (tab.id === 'overview') {
        counts[tab.id] = data.members.length;
      } else {
        counts[tab.id] = data.members.filter(m => tab.categories.some(c => m.categories.includes(c))).length;
      }
    }
    return counts as Record<TabId, number>;
  }, [data]);

  const goMonth = (dir: -1 | 1) => {
    setCurrentMonth(prev => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
    setActiveTab('overview');
    setSearchQuery('');
  };

  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  // CSV Export
  const exportCSV = () => {
    if (activeSection === 'members') {
      if (!filteredMembers.length) return;
      const headers = ['Name', 'Phone', 'Status', 'Plan', 'Joined', 'Paid This Month', 'Amount This Month', 'Total Paid', 'Stored Due', 'Expected Due', 'Due Correct', 'Categories'];
      const csvRows = filteredMembers.map(m => [
        m.fullName, m.phone, m.status, m.planName, m.joiningDate,
        m.paidThisMonth ? 'Yes' : 'No', m.amountPaidThisMonth, m.totalPaid,
        m.storedNextDue || '', m.expectedNextDue || '',
        m.dueDateCorrect ? 'Yes' : 'No', m.categories.join(', ')
      ]);
      const csv = [headers, ...csvRows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports-members-${format(currentMonth, 'yyyy-MM')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      auditLogger.logDataExported('members_report', 'csv', filteredMembers.length);
    } else if (activeSection === 'revenue' && revenueData) {
      const headers = ['Month', 'Revenue'];
      const csvRows = revenueData.map(d => [d.month, d.amount]);
      const csv = [headers, ...csvRows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports-revenue-${format(new Date(), 'yyyy-MM')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      auditLogger.logDataExported('revenue_report', 'csv', revenueData.length);
    }
  };

  const stats = data?.stats;

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex flex-col overflow-hidden font-[Urbanist]" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>

      {/* ── Header ─────────────────────────────── */}
      <header
        className="flex-shrink-0 px-4 pt-16 pb-1"
      >
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/more')}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
              Reports
            </h1>
            {data?.gymName && (
              <p className="text-[11px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{data.gymName}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {activeSection === 'members' && (
              <button
                onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
                style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
              >
                <AnimatePresence mode="wait">
                  {viewMode === 'card' ? (
                    <motion.div key="table" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
                      <Table2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
                    </motion.div>
                  ) : (
                    <motion.div key="grid" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
                      <LayoutGrid className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )}
            <button
              onClick={exportCSV}
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <Download className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
            </button>
            <button
              onClick={fetchData}
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
            </button>
            <UserProfileDropdown />
          </div>
        </div>

        {/* ── Top Section Tabs ──────────────────── */}
        <div className="flex gap-2 flex-wrap pb-2 -mx-1 px-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <motion.button
                key={section.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md'
                    : 'bg-white/60 hover:bg-white/80'
                }`}
                style={!isActive ? { color: 'var(--theme-text-secondary, #64748b)' } : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{section.label}</span>
              </motion.button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 pb-24" style={{ overscrollBehavior: 'contain' }}>

      {/* ═══════════════════════════════════════════ */}
      {/* MEMBERS SECTION (Monthly Overview)         */}
      {/* ═══════════════════════════════════════════ */}
      {activeSection === 'members' && (
        <>
          {/* Month Selector */}
          <div className="flex items-center justify-center gap-3 py-1 px-4">
            <button
              onClick={() => goMonth(-1)}
              className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
            </button>
            <div className="text-center min-w-[130px]">
              <p className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                {format(currentMonth, 'MMMM yyyy')}
              </p>
              {isCurrentMonth && (
                <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Current Month
                </span>
              )}
            </div>
            <button
              onClick={() => goMonth(1)}
              disabled={isCurrentMonth}
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm border border-white/50 transition-transform ${
                isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'
              }`}
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
            </button>
          </div>

          {/* Stat Cards Grid */}
          {!loading && stats && (
            <div
              className="px-4 pt-2 pb-2"
            >
              <div className="grid grid-cols-3 gap-2">
                <StatMini icon={Users} label="Active" value={stats.totalActive} gradient="from-emerald-400 to-teal-500" valueColor="text-emerald-600" />
                <StatMini icon={TrendingUp} label="Collected" value={stats.totalCollected} isCurrency gradient="from-blue-400 to-indigo-500" valueColor="text-blue-600" />
                <StatMini icon={CreditCard} label="Paid" value={stats.membersPaid} gradient="from-violet-400 to-purple-500" valueColor="text-violet-600" />
                <StatMini icon={Ban} label="Unpaid" value={stats.membersUnpaid} gradient="from-amber-400 to-orange-500" valueColor="text-amber-600" />
                <StatMini icon={Clock} label="Overdue" value={stats.overdue} gradient="from-rose-400 to-red-500" valueColor="text-rose-600" />
                <StatMini icon={Tag} label="No Plan" value={stats.noPlan} gradient="from-slate-400 to-slate-500" valueColor="" />
              </div>
            </div>
          )}

          {/* Search + Tabs */}
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                <input
                  type="text"
                  placeholder="Search name, phone, plan..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{
                    backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.7))',
                    borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))',
                    color: 'var(--theme-text-primary, #1e293b)',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pb-1">
              <div className="relative flex-1">
                <select
                  value={activeTab}
                  onChange={e => setActiveTab(e.target.value as TabId)}
                  className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border shadow-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{
                    backgroundColor: 'var(--theme-input-bg, rgba(255,255,255,0.7))',
                    borderColor: 'var(--theme-input-border, rgba(255,255,255,0.5))',
                    color: 'var(--theme-text-primary, #1e293b)',
                  }}
                >
                  {MEMBER_TABS.map(tab => {
                    const count = tabCounts[tab.id] ?? 0;
                    return (
                      <option key={tab.id} value={tab.id}>
                        {tab.label} ({count})
                      </option>
                    );
                  })}
                </select>
                <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
              </div>
            </div>
          </div>

          {/* Member List */}
          <div className="px-4 pt-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/30 p-2.5 animate-pulse" style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-slate-200 rounded w-3/4" />
                        <div className="h-2 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-sm text-red-500 font-semibold">{error}</p>
                <button onClick={fetchData} className="mt-3 text-xs text-indigo-600 font-bold underline">Retry</button>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
                <p className="text-sm" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>No members match this filter</p>
              </div>
            ) : viewMode === 'table' ? (
              <div
                className="rounded-2xl border border-white/30 shadow-sm overflow-hidden"
                style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
              >
                <div
                  className="grid grid-cols-[1fr_0.5fr_0.55fr_44px] gap-1 px-2.5 py-2 text-[8px] font-bold uppercase tracking-wide border-b"
                  style={{ color: 'var(--theme-text-muted, #94a3b8)', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}
                >
                  <span>Member</span>
                  <span>Plan</span>
                  <span>Payment</span>
                  <span className="text-center">Status</span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.15))' }}>
                  {filteredMembers.map((m, idx) => {
                    const hasIssue = m.categories.includes('due_date_issue');
                    const isOverdue = m.categories.includes('overdue');
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className={`grid grid-cols-[1fr_0.5fr_0.55fr_44px] gap-1 px-2.5 py-2 items-center text-[10px] cursor-pointer active:bg-slate-50/50 transition-colors ${
                          hasIssue ? 'bg-orange-50/30' : isOverdue ? 'bg-red-50/30' : idx % 2 === 0 ? 'bg-transparent' : 'bg-white/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="relative shrink-0">
                            <ThumbnailImage
                              src={m.photoUrl}
                              name={m.fullName}
                              fallbackClassName={`w-7 h-7 rounded-full text-[9px] ${
                                m.status === 'active' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                              }`}
                              className="w-7 h-7 rounded-full ring-1 ring-white/50"
                            />
                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white ${
                              m.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{m.fullName}</p>
                            <div className="flex items-center gap-1">
                              {m.joinedThisMonth && <span className="text-[7px] font-bold bg-emerald-100 text-emerald-700 px-1 py-0 rounded-full">NEW</span>}
                              {m.madeInactiveThisMonth && <span className="text-[7px] font-bold bg-red-100 text-red-700 px-1 py-0 rounded-full">LEFT</span>}
                              {!m.joinedThisMonth && !m.madeInactiveThisMonth && (
                                <p className="text-[8px] truncate" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{m.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{m.planName}</p>
                          <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{fmtCurrency(m.planAmount)}</p>
                        </div>
                        <div className="min-w-0">
                          {m.paidThisMonth ? (
                            <p className="font-bold text-emerald-600 text-[9px]">{fmtCurrency(m.amountPaidThisMonth)}</p>
                          ) : m.status === 'active' ? (
                            <p className="font-bold text-amber-500 text-[9px]">Unpaid</p>
                          ) : (
                            <p className="text-[9px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>—</p>
                          )}
                          {isOverdue && <p className="text-[7px] font-bold text-rose-500">Overdue</p>}
                          {hasIssue && !isOverdue && <p className="text-[7px] font-bold text-orange-500">Due Issue</p>}
                        </div>
                        <div className="flex justify-center">
                          {m.paidThisMonth ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : hasIssue ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                          ) : isOverdue ? (
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                          ) : m.status === 'active' ? (
                            <Ban className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredMembers.map((member, idx) => (
                  <MemberCard key={member.id} member={member} index={idx} onSelect={setSelectedMember} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* REVENUE SECTION                            */}
      {/* ═══════════════════════════════════════════ */}
      {activeSection === 'revenue' && (
        <div
          className="px-4 pt-3 space-y-3"
        >
          <div className="grid grid-cols-3 gap-2">
            <div
              className="rounded-2xl p-3 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-t-2xl" />
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Total Revenue</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                {revenueLoading ? '...' : fc(totalRevenue)}
              </p>
              <p className="text-[9px] font-semibold text-emerald-600 mt-1">Last 6 months</p>
            </div>
            <div
              className="rounded-2xl p-3 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-2xl" />
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Avg Monthly</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                {revenueLoading ? '...' : fc(avgMonthly)}
              </p>
              <p className="text-[9px] font-semibold text-blue-600 mt-1">Per month</p>
            </div>
            <div
              className="rounded-2xl p-3 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-400 to-fuchsia-500 rounded-t-2xl" />
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Growth Rate</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                {revenueLoading ? '...' : `${growthRate >= 0 ? '+' : ''}${growthRate}%`}
              </p>
              <p className="text-[9px] font-semibold text-purple-600 mt-1">Month over month</p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div
            className="rounded-2xl p-4 shadow-md border border-white/40"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>Revenue Trend</h3>
            {revenueLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="flex items-end justify-between h-48 gap-3">
                {(revenueData || []).map((d, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 to-cyan-500 rounded-t-xl shadow-md transition-all duration-500"
                      style={{ height: `${(d.amount / maxRevenue) * 100}%`, minHeight: d.amount > 0 ? '8px' : '2px' }}
                    />
                    <p className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{d.month}</p>
                    <p className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                      {symbol}{d.amount >= 1000 ? `${(d.amount / 1000).toFixed(0)}k` : d.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MEMBERSHIP SECTION                         */}
      {/* ═══════════════════════════════════════════ */}
      {activeSection === 'membership' && (
        <div
          className="px-4 pt-3 space-y-3"
        >
          <div className="grid grid-cols-3 gap-2">
            <div
              className="rounded-2xl p-3 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-400 to-indigo-500 rounded-t-2xl" />
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>New Members</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                {membershipLoading ? '...' : (membershipData || []).reduce((sum, d) => sum + d.new, 0)}
              </p>
              <p className="text-[9px] font-semibold text-blue-600 mt-1">Last 6 months</p>
            </div>
            <div
              className="rounded-2xl p-3 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-2xl" />
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Active Now</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                {membershipLoading ? '...' : (membershipData && membershipData.length > 0 ? membershipData[membershipData.length - 1].active : 0)}
              </p>
              <p className="text-[9px] font-semibold text-emerald-600 mt-1">Current</p>
            </div>
            <div
              className="rounded-2xl p-3 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-400 to-pink-500 rounded-t-2xl" />
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Churned</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                {membershipLoading ? '...' : (membershipData || []).reduce((sum, d) => sum + d.churned, 0)}
              </p>
              <p className="text-[9px] font-semibold text-red-600 mt-1">Last 6 months</p>
            </div>
          </div>

          {/* Membership Table */}
          <div
            className="rounded-2xl shadow-md border border-white/40 overflow-hidden"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            {membershipLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Month</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>New</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Active</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Churned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.15))' }}>
                    {(membershipData || []).map((d, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{d.month}</td>
                        <td className="px-4 py-3 text-sm text-right text-emerald-600 font-bold">+{d.new}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{d.active}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">-{d.churned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ATTENDANCE SECTION                         */}
      {/* ═══════════════════════════════════════════ */}
      {activeSection === 'attendance' && (
        <div
          className="px-4 pt-3 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-2xl p-3 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-400 to-amber-500 rounded-t-2xl" />
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Total Check-ins</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                {attendanceLoading ? '...' : (attendanceData || []).reduce((sum, d) => sum + d.checkIns, 0)}
              </p>
              <p className="text-[9px] font-semibold text-orange-600 mt-1">Last 6 months</p>
            </div>
            <div
              className="rounded-2xl p-3 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-400 to-cyan-500 rounded-t-2xl" />
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Avg Unique/Month</p>
              <p className="text-lg font-extrabold mt-1" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>
                {attendanceLoading ? '...' : (attendanceData && attendanceData.length > 0 ? Math.round(attendanceData.reduce((sum, d) => sum + d.uniqueMembers, 0) / attendanceData.length) : 0)}
              </p>
              <p className="text-[9px] font-semibold text-teal-600 mt-1">Who checked in</p>
            </div>
          </div>

          {/* Attendance Table */}
          <div
            className="rounded-2xl shadow-md border border-white/40 overflow-hidden"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            {attendanceLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Month</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Check-ins</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Unique Members</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.15))' }}>
                    {(attendanceData || []).map((d, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{d.month}</td>
                        <td className="px-4 py-3 text-sm text-right text-orange-600 font-bold">{d.checkIns}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: 'var(--theme-text-primary, #0f172a)' }}>{d.uniqueMembers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* ── Member Detail Popup ───────────────────── */}
      <AnimatePresence>
        {selectedMember && (
          <MemberDetailPopup
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            onNavigate={(id) => navigate(`/members/${id}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function StatMini({
  icon: Icon, label, value, gradient, valueColor, isCurrency,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  gradient: string;
  valueColor: string;
  isCurrency?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40"
      style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${gradient} rounded-t-2xl`} />
      <div className="flex items-center gap-1 mb-0.5">
        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-2 h-2 text-white" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{label}</span>
      </div>
      <p className={`text-sm font-extrabold ${valueColor}`} style={!valueColor ? { color: 'var(--theme-text-muted, #94a3b8)' } : undefined}>
        {isCurrency ? fmtCurrency(value) : <AnimatedNum value={value} />}
      </p>
    </div>
  );
}

function MemberCard({
  member: m,
  index,
  onSelect,
}: {
  member: MonthlyMemberRow;
  index: number;
  onSelect: (m: MonthlyMemberRow) => void;
}) {
  const hasIssue = m.categories.includes('due_date_issue');
  const isOverdue = m.categories.includes('overdue');

  return (
    <div
      onClick={() => onSelect(m)}
      className={`rounded-2xl border shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform border-l-[3px] ${
        hasIssue
          ? 'border-l-orange-400 border-orange-200/60'
          : isOverdue
            ? 'border-l-red-400 border-red-200/60'
            : m.paidThisMonth
              ? 'border-l-emerald-400 border-white/30'
              : m.status === 'active'
                ? 'border-l-amber-400 border-white/30'
                : 'border-l-slate-300 border-white/30'
      }`}
      style={{
        backgroundColor: hasIssue
          ? 'rgba(255,237,213,0.35)'
          : isOverdue
            ? 'rgba(254,226,226,0.35)'
            : 'var(--theme-card-bg, rgba(255,255,255,0.85))'
      }}
    >
      <div className="px-2.5 pt-2 pb-1 flex items-center gap-2">
        <div className="relative shrink-0">
          <ThumbnailImage
            src={m.photoUrl}
            name={m.fullName}
            fallbackClassName={`w-8 h-8 rounded-full text-[10px] ring-2 ${
              m.status === 'active'
                ? m.paidThisMonth ? 'bg-indigo-100 text-indigo-600 ring-emerald-300/40' : 'bg-indigo-100 text-indigo-600 ring-amber-300/40'
                : 'bg-slate-100 text-slate-400 ring-white/50'
            }`}
            className={`w-8 h-8 rounded-full ring-2 ${
              m.paidThisMonth ? 'ring-emerald-300/40' : isOverdue ? 'ring-red-300/40' : 'ring-white/50'
            }`}
          />
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white ${
            m.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'
          }`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{m.fullName}</p>
          <p className="text-[9px] truncate" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{m.planName} · {fmtCurrency(m.planAmount)}</p>
        </div>
      </div>

      <div className="px-2.5 pb-1.5 flex items-center justify-between">
        {m.paidThisMonth ? (
          <div className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-[9px] font-bold">{fmtCurrency(m.amountPaidThisMonth)}</span>
          </div>
        ) : m.status === 'active' ? (
          <div className="flex items-center gap-1 text-amber-500">
            <Clock className="w-3 h-3" />
            <span className="text-[9px] font-bold">Unpaid</span>
          </div>
        ) : (
          <span className="text-[9px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Inactive</span>
        )}
        {hasIssue && (
          <span className="text-[7px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Due Issue</span>
        )}
        {isOverdue && !hasIssue && (
          <span className="text-[7px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">Overdue</span>
        )}
      </div>

      {m.categories.length > 0 && (
        <div className="px-2.5 pb-2 pt-0.5 flex flex-wrap gap-0.5 border-t" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
          {m.categories.map(c => (
            <CategoryBadge key={c} category={c} />
          ))}
        </div>
      )}
    </div>
  );
}

const CATEGORY_STYLES: Record<MemberCategory, { bg: string; text: string; label: string }> = {
  new_join: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'New Join' },
  inactive: { bg: 'bg-red-100', text: 'text-red-700', label: 'Inactive' },
  reactivated: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Reactivated' },
  paid: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Paid' },
  unpaid: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Unpaid' },
  due_date_issue: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Due Issue' },
  no_plan: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'No Plan' },
  no_payment: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'No Payment' },
  overdue: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Overdue' },
};

function CategoryBadge({ category }: { category: MemberCategory }) {
  const style = CATEGORY_STYLES[category];
  if (!style) return null;
  return (
    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function MemberDetailPopup({
  member: m,
  onClose,
  onNavigate,
}: {
  member: MonthlyMemberRow;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const hasIssue = m.categories.includes('due_date_issue');

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--theme-popup-bg, #ffffff)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-4 pb-3 flex items-center gap-3 border-b border-slate-100">
          <ThumbnailImage
            src={m.photoUrl}
            name={m.fullName}
            size="md"
            fallbackClassName="w-14 h-14 rounded-2xl from-indigo-500 to-violet-500 text-xl"
            className="w-14 h-14 rounded-2xl"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800 truncate">{m.fullName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>{m.status}</span>
              {m.gender && <span className="text-[10px] text-slate-400">{m.gender}</span>}
            </div>
            {m.phone && (
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Phone className="w-2.5 h-2.5" /> {m.phone}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {m.categories.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-1">
            {m.categories.map(c => <CategoryBadge key={c} category={c} />)}
          </div>
        )}

        <div className="px-4 py-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Membership Info</h3>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="Plan" value={m.planName} />
            <InfoCell label="Plan Amount" value={fmtCurrency(m.planAmount)} />
            <InfoCell label="Joined" value={fmtDate(m.joiningDate)} />
            <InfoCell label="Joining Day" value={`Day ${m.joiningDay}`} />
            <InfoCell label="Plan Duration" value={m.planTotalMonths ? `${m.planTotalMonths} months` : '—'} />
            <InfoCell label="End Date" value={fmtDate(m.membershipEndDate)} />
          </div>
        </div>

        <div className={`mx-4 rounded-xl p-3 mb-3 ${
          hasIssue ? 'bg-orange-50 border border-orange-200' : 'bg-emerald-50 border border-emerald-100'
        }`}>
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            {hasIssue ? (
              <><AlertTriangle className="w-3 h-3 text-orange-500" /> <span className="text-orange-700">Due Date Issue Found</span></>
            ) : (
              <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> <span className="text-emerald-700">Due Date Correct</span></>
            )}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-slate-400 font-semibold">Stored Due</p>
              <p className={`font-bold ${hasIssue ? 'text-red-600' : 'text-slate-700'}`}>{fmtDate(m.storedNextDue)}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Expected Due</p>
              <p className="font-bold text-emerald-700">{fmtDate(m.expectedNextDue)}</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5">{m.dueDateNote}</p>

          {hasIssue && (
            <div className="mt-2.5 p-2 bg-white rounded-lg border border-orange-100">
              <p className="text-[10px] font-bold text-orange-700 mb-1">Recommended Action</p>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                The stored due date doesn't match the expected calculation.
                Go to the member's profile and verify the payment history.
              </p>
              <button
                onClick={() => onNavigate(m.id)}
                className="mt-2 w-full py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-bold hover:bg-orange-600 transition-colors"
              >
                Open Member Profile
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pb-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Wallet className="w-3 h-3" /> Payment Summary
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <InfoCell label="Total Payments" value={String(m.paymentCount)} />
            <InfoCell label="Total Paid" value={fmtCurrency(m.totalPaid)} />
            <InfoCell label="This Month" value={m.paidThisMonth ? fmtCurrency(m.amountPaidThisMonth) : 'Not paid'} highlight={!m.paidThisMonth && m.status === 'active'} />
          </div>
        </div>

        {m.payments.length > 0 && (
          <div className="px-4 pb-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Payment History (Last 10)
            </h3>
            <div className="space-y-1">
              {m.payments.slice(0, 10).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 rounded-lg text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">{i + 1}</div>
                    <span className="font-semibold text-slate-700">{fmtDate(p.paymentDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 uppercase">{p.method}</span>
                    <span className="font-bold text-slate-800">{fmtCurrency(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-6 pt-2 border-t border-slate-100">
          <button
            onClick={() => onNavigate(m.id)}
            className="w-full py-2.5 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
            style={{ background: '#000000', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          >
            <Eye className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            View Full Profile
          </button>
        </div>
      </motion.div>
    </>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg py-1.5 px-2.5 ${highlight ? 'bg-red-50 border border-red-100' : ''}`}
      style={!highlight ? { backgroundColor: 'var(--theme-input-bg, rgba(241,245,249,0.8))' } : undefined}
    >
      <p className="text-[9px] font-semibold" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{label}</p>
      <p className={`text-[11px] font-bold truncate ${highlight ? 'text-red-600' : ''}`} style={!highlight ? { color: 'var(--theme-text-primary, #1e293b)' } : undefined}>{value}</p>
    </div>
  );
}
