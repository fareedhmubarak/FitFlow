/**
 * Admin Monthly Overview – single-pane-of-glass for gym owners
 *
 * Shows all monthly activity: new joins, inactive, payments,
 * due-date issues, overdue, and actionable insights.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ArrowLeft, Search, Download, RefreshCw,
  ChevronLeft, ChevronRight, Users, UserPlus, UserMinus,
  CreditCard, AlertTriangle, Calendar, TrendingUp,
  CheckCircle2, XCircle, Clock, IndianRupee, Eye,
  X, Phone, MapPin, Tag, History, Zap, ChevronDown,
  RotateCcw, Ban, Wallet
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, isSameMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  fetchMonthlyOverview,
  type MonthlyOverviewData,
  type MonthlyMemberRow,
  type MemberCategory,
} from '@/lib/adminMonthlyService';

// ── Tab definitions ─────────────────────────────────────

type TabId = 'overview' | 'new_join' | 'inactive' | 'paid' | 'unpaid' | 'due_issues' | 'overdue';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
  categories: MemberCategory[];
  color: string;
  activeColor: string;
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'All', icon: Users, categories: [], color: 'text-slate-500', activeColor: 'bg-indigo-100 text-indigo-700' },
  { id: 'new_join', label: 'New', icon: UserPlus, categories: ['new_join'], color: 'text-emerald-500', activeColor: 'bg-emerald-100 text-emerald-700' },
  { id: 'inactive', label: 'Left', icon: UserMinus, categories: ['inactive'], color: 'text-red-500', activeColor: 'bg-red-100 text-red-700' },
  { id: 'paid', label: 'Paid', icon: CreditCard, categories: ['paid'], color: 'text-blue-500', activeColor: 'bg-blue-100 text-blue-700' },
  { id: 'unpaid', label: 'Unpaid', icon: Ban, categories: ['unpaid'], color: 'text-amber-500', activeColor: 'bg-amber-100 text-amber-700' },
  { id: 'due_issues', label: 'Due Issues', icon: AlertTriangle, categories: ['due_date_issue'], color: 'text-orange-500', activeColor: 'bg-orange-100 text-orange-700' },
  { id: 'overdue', label: 'Overdue', icon: Clock, categories: ['overdue'], color: 'text-rose-500', activeColor: 'bg-rose-100 text-rose-700' },
];

// ── Helpers ──────────────────────────────────────────────

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  try { return format(new Date(d + 'T00:00:00'), 'MMM d, yyyy'); } catch { return d; }
};

const fmtCurrency = (n: number | null | undefined) => {
  if (n === null || n === undefined) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
};

// ── Animated number ─────────────────────────────────────

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

// ── Component ────────────────────────────────────────────

export default function MonthlyOverviewPage() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlyOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MonthlyMemberRow | null>(null);

  // ── Fetch ──────────────────────────────────────

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

  // ── Filtering ──────────────────────────────────

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    let result = data.members;

    // Tab filter
    const tab = TABS.find(t => t.id === activeTab);
    if (tab && tab.categories.length > 0) {
      result = result.filter(m =>
        tab.categories.some(c => m.categories.includes(c))
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        m =>
          m.fullName.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.planName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [data, activeTab, searchQuery]);

  // ── Tab counts ─────────────────────────────────

  const tabCounts = useMemo(() => {
    if (!data) return {} as Record<TabId, number>;
    const counts: Record<string, number> = {};
    for (const tab of TABS) {
      if (tab.id === 'overview') {
        counts[tab.id] = data.members.length;
      } else {
        counts[tab.id] = data.members.filter(m =>
          tab.categories.some(c => m.categories.includes(c))
        ).length;
      }
    }
    return counts as Record<TabId, number>;
  }, [data]);

  // ── Month navigation ──────────────────────────

  const goMonth = (dir: -1 | 1) => {
    setCurrentMonth(prev => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
    setActiveTab('overview');
    setSearchQuery('');
  };

  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  // ── CSV Export ─────────────────────────────────

  const exportCSV = () => {
    if (!filteredMembers.length) return;
    const headers = [
      'Name', 'Phone', 'Status', 'Plan', 'Joined', 'Paid This Month',
      'Amount This Month', 'Total Paid', 'Stored Due', 'Expected Due',
      'Due Correct', 'Categories'
    ];
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
    a.download = `monthly-overview-${format(currentMonth, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-[Urbanist]">

      {/* ── Header ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-bold tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              ADMIN PANEL
            </div>
            <h1 className="text-lg font-bold">Monthly Overview</h1>
          </div>
        </div>

        {data?.gymName && (
          <p className="text-xs text-white/60 ml-11 mb-3">{data.gymName}</p>
        )}

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4 mt-1">
          <button
            onClick={() => goMonth(-1)}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[140px]">
            <p className="text-base font-bold">{format(currentMonth, 'MMMM yyyy')}</p>
            {isCurrentMonth && (
              <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                Current Month
              </span>
            )}
          </div>
          <button
            onClick={() => goMonth(1)}
            disabled={isCurrentMonth}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isCurrentMonth ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-white/15 hover:bg-white/25'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Row */}
        {!loading && stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-4 gap-2 mt-4"
          >
            <div className="bg-white/10 rounded-xl px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[8px] text-white/50 font-bold uppercase">Active</p>
              <p className="text-base font-extrabold"><AnimatedNum value={stats.totalActive} /></p>
            </div>
            <div className="bg-emerald-500/20 rounded-xl px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[8px] text-emerald-200 font-bold uppercase">New</p>
              <p className="text-base font-extrabold text-emerald-100"><AnimatedNum value={stats.newJoins} /></p>
            </div>
            <div className="bg-blue-500/20 rounded-xl px-2 py-2 text-center backdrop-blur-sm">
              <p className="text-[8px] text-blue-200 font-bold uppercase">Paid</p>
              <p className="text-base font-extrabold text-blue-100"><AnimatedNum value={stats.membersPaid} /></p>
            </div>
            <div className={`rounded-xl px-2 py-2 text-center backdrop-blur-sm ${
              (stats.dueDateIssues > 0) ? 'bg-red-500/25' : 'bg-white/10'
            }`}>
              <p className={`text-[8px] font-bold uppercase ${
                stats.dueDateIssues > 0 ? 'text-red-200' : 'text-white/50'
              }`}>Issues</p>
              <p className={`text-base font-extrabold ${
                stats.dueDateIssues > 0 ? 'text-red-100' : 'text-white/70'
              }`}><AnimatedNum value={stats.dueDateIssues} /></p>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Stat Cards Grid ────────────────────── */}
      {!loading && stats && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 pt-4 pb-2"
        >
          <div className="grid grid-cols-3 gap-2">
            <StatMini icon={TrendingUp} label="Collected" value={fmtCurrency(stats.totalCollected)} color="emerald" />
            <StatMini icon={UserMinus} label="Left" value={String(stats.madeInactive)} color="red" />
            <StatMini icon={RotateCcw} label="Reactivated" value={String(stats.reactivated)} color="violet" />
            <StatMini icon={Ban} label="Unpaid" value={String(stats.membersUnpaid)} color="amber" />
            <StatMini icon={Clock} label="Overdue" value={String(stats.overdue)} color="rose" />
            <StatMini icon={Tag} label="No Plan" value={String(stats.noPlan)} color="slate" />
          </div>
        </motion.div>
      )}

      {/* ── Controls ───────────────────────────── */}
      <div className="px-4 py-2 bg-white/50 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10">
        {/* Search + Actions */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, phone, plan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
            />
          </div>
          <button onClick={exportCSV} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors" title="Export CSV">
            <Download className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button onClick={fetchData} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {TABS.map(tab => {
            const count = tabCounts[tab.id] ?? 0;
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap shrink-0 ${
                  isActive ? tab.activeColor : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                <span className={`ml-0.5 text-[9px] ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Member List ────────────────────────── */}
      <div className="px-4 pt-3 pb-28">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-100 p-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="h-2 bg-slate-100 rounded w-1/3" />
                  </div>
                  <div className="h-5 w-14 bg-slate-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-500 font-semibold">{error}</p>
            <button onClick={fetchData} className="mt-3 text-xs text-indigo-600 font-bold underline">
              Retry
            </button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No members match this filter</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 font-semibold mb-1">
              Showing {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            </p>
            {filteredMembers.map((member, idx) => (
              <MemberCard
                key={member.id}
                member={member}
                index={idx}
                onSelect={setSelectedMember}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Popup ───────────────────────── */}
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

// ── StatMini Card ────────────────────────────────────────

function StatMini({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  };
  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-500', red: 'text-red-500', violet: 'text-violet-500',
    amber: 'text-amber-500', rose: 'text-rose-500', slate: 'text-slate-400',
    blue: 'text-blue-500', orange: 'text-orange-500',
  };

  return (
    <div className={`rounded-xl px-2.5 py-2 border ${colorMap[color] || colorMap.slate}`}>
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className={`w-3 h-3 ${iconColorMap[color] || 'text-slate-400'}`} />
        <span className="text-[9px] font-bold uppercase tracking-wide opacity-60">{label}</span>
      </div>
      <p className="text-sm font-extrabold">{value}</p>
    </div>
  );
}

// ── Member Card ──────────────────────────────────────────

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.4) }}
      onClick={() => onSelect(m)}
      className={`rounded-xl border shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform ${
        hasIssue
          ? 'bg-orange-50/50 border-orange-200'
          : isOverdue
            ? 'bg-red-50/40 border-red-200'
            : 'bg-white border-slate-100'
      }`}
    >
      <div className="px-3 py-2.5 flex items-center gap-2.5">
        {/* Avatar */}
        <div className="relative shrink-0">
          {m.photoUrl ? (
            <img src={m.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              m.status === 'active' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {m.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Status dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
            m.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-slate-800 truncate">{m.fullName}</p>
            {m.joinedThisMonth && (
              <span className="text-[8px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
            )}
            {m.madeInactiveThisMonth && (
              <span className="text-[8px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">LEFT</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate">{m.planName} • {fmtCurrency(m.planAmount)}</p>
        </div>

        {/* Right side: payment & indicator */}
        <div className="text-right shrink-0">
          {m.paidThisMonth ? (
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[10px] font-bold">{fmtCurrency(m.amountPaidThisMonth)}</span>
            </div>
          ) : m.status === 'active' ? (
            <div className="flex items-center gap-1 text-amber-500">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-bold">Unpaid</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">Inactive</span>
          )}

          {/* Due date status icon */}
          {hasIssue && (
            <div className="flex items-center gap-0.5 mt-0.5 justify-end">
              <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
              <span className="text-[8px] text-orange-500 font-bold">Due Issue</span>
            </div>
          )}
          {isOverdue && !hasIssue && (
            <div className="flex items-center gap-0.5 mt-0.5 justify-end">
              <Clock className="w-2.5 h-2.5 text-rose-500" />
              <span className="text-[8px] text-rose-500 font-bold">Overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* Category badges */}
      {m.categories.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {m.categories.map(c => (
            <CategoryBadge key={c} category={c} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Category Badge ───────────────────────────────────────

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

// ── Member Detail Popup ──────────────────────────────────

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
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 flex items-center gap-3 border-b border-slate-100">
          {m.photoUrl ? (
            <img src={m.photoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xl font-bold text-white">
              {m.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800 truncate">{m.fullName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>{m.status}</span>
              {m.gender && (
                <span className="text-[10px] text-slate-400">{m.gender}</span>
              )}
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

        {/* Category badges */}
        {m.categories.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-1">
            {m.categories.map(c => (
              <CategoryBadge key={c} category={c} />
            ))}
          </div>
        )}

        {/* Membership info */}
        <div className="px-4 py-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Membership Info
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="Plan" value={m.planName} />
            <InfoCell label="Plan Amount" value={fmtCurrency(m.planAmount)} />
            <InfoCell label="Joined" value={fmtDate(m.joiningDate)} />
            <InfoCell label="Joining Day" value={`Day ${m.joiningDay}`} />
            <InfoCell label="Plan Duration" value={m.planTotalMonths ? `${m.planTotalMonths} months` : '—'} />
            <InfoCell label="End Date" value={fmtDate(m.membershipEndDate)} />
          </div>
        </div>

        {/* Due Date Audit */}
        <div className={`mx-4 rounded-xl p-3 mb-3 ${
          hasIssue
            ? 'bg-orange-50 border border-orange-200'
            : 'bg-emerald-50 border border-emerald-100'
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
              <p className={`font-bold ${hasIssue ? 'text-red-600' : 'text-slate-700'}`}>
                {fmtDate(m.storedNextDue)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold">Expected Due</p>
              <p className="font-bold text-emerald-700">{fmtDate(m.expectedNextDue)}</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5">{m.dueDateNote}</p>

          {/* Action for issues */}
          {hasIssue && (
            <div className="mt-2.5 p-2 bg-white rounded-lg border border-orange-100">
              <p className="text-[10px] font-bold text-orange-700 mb-1">💡 Recommended Action</p>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                The stored due date doesn't match the expected calculation.
                Go to the member's profile and verify the payment history.
                Re-record the latest payment or contact support to trigger a recalculation.
              </p>
              <button
                onClick={() => onNavigate(m.id)}
                className="mt-2 w-full py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-bold hover:bg-orange-600 transition-colors"
              >
                Open Member Profile →
              </button>
            </div>
          )}
        </div>

        {/* Payment Summary */}
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

        {/* Payment History */}
        {m.payments.length > 0 && (
          <div className="px-4 pb-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Payment History (Last 10)
            </h3>
            <div className="space-y-1">
              {m.payments.slice(0, 10).map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 rounded-lg text-[10px]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">
                      {i + 1}
                    </div>
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

        {/* Quick Actions */}
        <div className="px-4 pb-6 pt-2 border-t border-slate-100">
          <button
            onClick={() => onNavigate(m.id)}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            View Full Profile
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Info Cell ────────────────────────────────────────────

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg py-1.5 px-2.5 ${highlight ? 'bg-red-50 border border-red-100' : 'bg-slate-50'}`}>
      <p className="text-[9px] text-slate-400 font-semibold">{label}</p>
      <p className={`text-[11px] font-bold truncate ${highlight ? 'text-red-600' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}
