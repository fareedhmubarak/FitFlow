import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Loader2, ArrowLeft, Search,
  CheckCircle2, XCircle, Download, RefreshCw,
  LayoutGrid, Table2
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { format, addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase, getCurrentGymId } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────

interface PlanInfo {
  id: string;
  name: string;
  base_months: number;
  bonus_months: number;
  total_months: number;
}

interface MemberAuditRow {
  memberId: string;
  fullName: string;
  phone: string;
  status: string;
  joiningDate: string;
  joiningDay: number;
  planName: string;
  totalMonths: number;
  paymentCount: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  storedNextDue: string | null;
  storedEndDate: string | null;
  expectedNextDue: string | null;
  isCorrect: boolean;
  note: string;
}

// ── Trigger replay logic (mirrors calculate_next_due_date_on_payment) ──

function replayTriggerLogic(
  joiningDate: string,
  totalMonths: number,
  payments: { payment_date: string; created_at: string }[],
  historyEvents: { change_type: string; created_at: string; new_value: Record<string, string> | null }[]
): { expectedNextDue: string | null; note: string } {
  if (payments.length === 0) return { expectedNextDue: null, note: 'No payments' };

  // Track current joining_date (may change on reactivation)
  let currentJoining = joiningDate;
  let nextDue: Date | null = null;

  // Build a chronological list of events to understand reactivations
  const reactivations = historyEvents
    .filter(e => e.change_type === 'member_reactivated')
    .map(e => ({
      date: e.created_at.substring(0, 10),
      newJoining: e.new_value?.joining_date || null,
      newBaseDay: e.new_value?.base_day || null,
    }));

  // Sort payments by payment_date then created_at
  const sortedPayments = [...payments].sort((a, b) => {
    const cmp = a.payment_date.localeCompare(b.payment_date);
    return cmp !== 0 ? cmp : a.created_at.localeCompare(b.created_at);
  });

  for (let i = 0; i < sortedPayments.length; i++) {
    const p = sortedPayments[i];
    const paymentDateStr = p.payment_date;

    // Check if this payment coincides with a reactivation
    const matchingReactivation = reactivations.find(r => r.date === paymentDateStr);
    if (matchingReactivation && matchingReactivation.newJoining) {
      // Reactivation resets the joining date
      currentJoining = matchingReactivation.newJoining;
    }

    const currentJoiningDay = new Date(currentJoining + 'T00:00:00').getDate();
    const paymentCount = i + 1; // count including this one

    // Replicate trigger's first-payment detection:
    // First payment if: count <= 1, or nextDue is null, or nextDue <= joiningDate
    const isFirstPayment =
      paymentCount <= 1 ||
      nextDue === null ||
      (nextDue && nextDue <= new Date(currentJoining + 'T00:00:00'));

    let rawNextDue: Date;
    if (isFirstPayment) {
      rawNextDue = addMonths(new Date(currentJoining + 'T00:00:00'), totalMonths);
    } else {
      rawNextDue = addMonths(nextDue!, totalMonths);
    }

    // Day anchoring: adjust to joining_day (or last day of month)
    const lastDayOfMonth = new Date(
      rawNextDue.getFullYear(),
      rawNextDue.getMonth() + 1,
      0
    ).getDate();
    const targetDay = Math.min(currentJoiningDay, lastDayOfMonth);
    rawNextDue.setDate(targetDay);

    nextDue = rawNextDue;
  }

  if (!nextDue) return { expectedNextDue: null, note: 'Calculation failed' };

  const expectedStr = format(nextDue, 'yyyy-MM-dd');
  const hasReactivation = reactivations.length > 0;
  const note = hasReactivation
    ? `Reactivated ${reactivations.length}x`
    : sortedPayments.length === 1
      ? 'Single payment'
      : `${sortedPayments.length} payments`;

  return { expectedNextDue: expectedStr, note };
}

// ── Component ────────────────────────────────────────────

export default function PaymentAuditPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MemberAuditRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'correct' | 'mismatch'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [gymName, setGymName] = useState('');

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    setLoading(true);
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID');

      // Fetch gym name
      const { data: gymData } = await supabase
        .from('gym_gyms')
        .select('name')
        .eq('id', gymId)
        .single();
      setGymName(gymData?.name || '');

      // Fetch all data in parallel
      const [membersRes, paymentsRes, historyRes, plansRes] = await Promise.all([
        supabase
          .from('gym_members')
          .select('id, full_name, phone, status, joining_date, plan_id, next_payment_due_date, membership_end_date')
          .eq('gym_id', gymId)
          .in('status', ['active', 'expired', 'inactive'])
          .order('full_name'),
        supabase
          .from('gym_payments')
          .select('id, member_id, payment_date, amount, created_at')
          .eq('gym_id', gymId)
          .order('payment_date', { ascending: true }),
        supabase
          .from('gym_member_history')
          .select('id, member_id, change_type, created_at, new_value')
          .eq('gym_id', gymId),
        supabase
          .from('gym_membership_plans')
          .select('id, name, duration_months, base_duration_months, bonus_duration_months')
          .eq('gym_id', gymId),
      ]);

      const members = membersRes.data || [];
      const allPayments = paymentsRes.data || [];
      const allHistory = historyRes.data || [];
      const plans = (plansRes.data || []).map((p: Record<string, unknown>) => {
        const baseMo = (p.base_duration_months as number | null) ?? (p.duration_months as number | null) ?? 1;
        const bonusMo = (p.bonus_duration_months as number | null) ?? 0;
        return {
          id: p.id as string,
          name: p.name as string,
          base_months: baseMo,
          bonus_months: bonusMo,
          total_months: baseMo + bonusMo,
        };
      }) as PlanInfo[];

      // Index payments and history by member
      const paymentsByMember = new Map<string, typeof allPayments>();
      for (const p of allPayments) {
        if (!paymentsByMember.has(p.member_id)) paymentsByMember.set(p.member_id, []);
        paymentsByMember.get(p.member_id)!.push(p);
      }
      const historyByMember = new Map<string, typeof allHistory>();
      for (const h of allHistory) {
        if (!historyByMember.has(h.member_id)) historyByMember.set(h.member_id, []);
        historyByMember.get(h.member_id)!.push(h);
      }
      const planMap = new Map(plans.map(p => [p.id, p]));

      // Build audit rows
      const auditRows: MemberAuditRow[] = [];

      for (const m of members) {
        const plan = m.plan_id ? planMap.get(m.plan_id) : null;
        const memberPayments = paymentsByMember.get(m.id) || [];
        const memberHistory = historyByMember.get(m.id) || [];

        // Skip members with no plan or no payments
        if (!plan || memberPayments.length === 0) {
          if (m.status === 'active' || m.status === 'expired') {
            auditRows.push({
              memberId: m.id,
              fullName: m.full_name,
              phone: m.phone || '',
              status: m.status,
              joiningDate: m.joining_date,
              joiningDay: new Date(m.joining_date + 'T00:00:00').getDate(),
              planName: plan?.name || 'No plan',
              totalMonths: plan?.total_months || 0,
              paymentCount: memberPayments.length,
              lastPaymentDate: null,
              lastPaymentAmount: null,
              storedNextDue: m.next_payment_due_date,
              storedEndDate: m.membership_end_date,
              expectedNextDue: null,
              isCorrect: memberPayments.length === 0, // No payments = nothing to verify
              note: memberPayments.length === 0 ? 'No payments recorded' : 'No plan assigned',
            });
          }
          continue;
        }

        // Replay trigger logic
        const { expectedNextDue, note } = replayTriggerLogic(
          m.joining_date,
          plan.total_months,
          memberPayments.map(p => ({ payment_date: p.payment_date, created_at: p.created_at })),
          memberHistory
        );

        // Sort payments to get last
        const sortedPayments = [...memberPayments].sort(
          (a, b) => a.payment_date.localeCompare(b.payment_date)
        );
        const lastPayment = sortedPayments[sortedPayments.length - 1];

        const isCorrect = m.next_payment_due_date === expectedNextDue;

        auditRows.push({
          memberId: m.id,
          fullName: m.full_name,
          phone: m.phone || '',
          status: m.status,
          joiningDate: m.joining_date,
          joiningDay: new Date(m.joining_date + 'T00:00:00').getDate(),
          planName: plan.name,
          totalMonths: plan.total_months,
          paymentCount: memberPayments.length,
          lastPaymentDate: lastPayment?.payment_date || null,
          lastPaymentAmount: lastPayment ? parseFloat(lastPayment.amount) : null,
          storedNextDue: m.next_payment_due_date,
          storedEndDate: m.membership_end_date,
          expectedNextDue,
          isCorrect,
          note,
        });
      }

      setRows(auditRows);
    } catch (error) {
      console.error('Audit error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering ──────────────────────────────────────────

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filterStatus === 'correct') result = result.filter(r => r.isCorrect);
    if (filterStatus === 'mismatch') result = result.filter(r => !r.isCorrect);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        r => r.fullName.toLowerCase().includes(q) || r.phone.includes(q)
      );
    }
    return result;
  }, [rows, filterStatus, searchQuery]);

  const correctCount = rows.filter(r => r.isCorrect).length;
  const mismatchCount = rows.filter(r => !r.isCorrect).length;

  // ── Helpers ────────────────────────────────────────────

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d + 'T00:00:00'), 'MMM d, yyyy'); } catch { return d; }
  };

  const fmtCurrency = (n: number | null) => {
    if (n === null || n === undefined) return '—';
    return formatCurrency(n);
  };

  const exportCSV = () => {
    const headers = [
      'Name', 'Phone', 'Status', 'Plan', 'Duration (months)', 'Joining Date',
      'Joining Day', 'Payments', 'Last Paid', 'Last Amount',
      'Stored Next Due', 'Expected Next Due', 'Result', 'Notes'
    ];
    const csvRows = filteredRows.map(r => [
      r.fullName, r.phone, r.status, r.planName, r.totalMonths,
      r.joiningDate, r.joiningDay, r.paymentCount,
      r.lastPaymentDate || '', r.lastPaymentAmount ?? '',
      r.storedNextDue || '', r.expectedNextDue || '',
      r.isCorrect ? 'CORRECT' : 'MISMATCH', r.note
    ]);
    const csv = [headers, ...csvRows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen font-[Urbanist] pb-24" style={{ background: 'var(--theme-bg, linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 50%, #fdf2f8 100%))' }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-4 pt-16 pb-2"
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary, #1e293b)' }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
              Payment Audit
            </h1>
            {gymName && (
              <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{gymName}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* View toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
              title={viewMode === 'card' ? 'Switch to table' : 'Switch to cards'}
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
            <button
              onClick={exportCSV}
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
            </button>
            <button
              onClick={runAudit}
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
              title="Re-run audit"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Stat Cards */}
      {!loading && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-2">
            {/* Total */}
            <div
              className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-400 to-violet-500 rounded-t-2xl" />
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                  <ShieldCheck className="w-2 h-2 text-white" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Total</span>
              </div>
              <p className="text-sm font-extrabold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{rows.length}</p>
            </div>

            {/* Correct */}
            <div
              className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-2xl" />
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <CheckCircle2 className="w-2 h-2 text-white" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Correct</span>
              </div>
              <p className="text-sm font-extrabold text-emerald-600">{correctCount}</p>
            </div>

            {/* Mismatch */}
            <div
              className="rounded-2xl p-2.5 shadow-md relative overflow-hidden border border-white/40"
              style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl ${mismatchCount > 0 ? 'bg-gradient-to-r from-red-400 to-rose-500' : 'bg-gradient-to-r from-slate-300 to-slate-400'}`} />
              <div className="flex items-center gap-1 mb-0.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${mismatchCount > 0 ? 'bg-gradient-to-br from-red-400 to-rose-500' : 'bg-gradient-to-br from-slate-300 to-slate-400'}`}>
                  <XCircle className="w-2 h-2 text-white" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>Mismatch</span>
              </div>
              <p className={`text-sm font-extrabold ${mismatchCount > 0 ? 'text-red-600' : ''}`} style={mismatchCount === 0 ? { color: 'var(--theme-text-muted, #94a3b8)' } : undefined}>{mismatchCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--theme-text-muted, #94a3b8)' }} />
            <input
              type="text"
              placeholder="Search name or phone..."
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

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {(['all', 'mismatch', 'correct'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm border ${
                filterStatus === f
                  ? f === 'mismatch'
                    ? 'bg-red-500 text-white border-red-500'
                    : f === 'correct'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-800 text-white border-slate-800'
                  : 'border-white/50 hover:border-white/70'
              }`}
              style={filterStatus !== f ? {
                backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))',
                color: 'var(--theme-text-secondary, #64748b)',
              } : undefined}
            >
              {f === 'all' ? `All (${rows.length})` : f === 'mismatch' ? `Mismatch (${mismatchCount})` : `Correct (${correctCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Member Cards / Table */}
      <div className="px-4 pt-1 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
            <p className="text-xs" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Running audit...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>No members match the filter.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ── TABLE VIEW ── */
          <div
            className="rounded-2xl border border-white/30 shadow-sm overflow-hidden"
            style={{ backgroundColor: 'var(--theme-card-bg, rgba(255,255,255,0.85))' }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_0.6fr_0.7fr_0.7fr_36px] gap-1 px-2.5 py-2 text-[8px] font-bold uppercase tracking-wide border-b"
              style={{ color: 'var(--theme-text-muted, #94a3b8)', borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}
            >
              <span>Name</span>
              <span>Plan</span>
              <span>Stored Due</span>
              <span>Expected</span>
              <span className="text-center">OK</span>
            </div>
            {/* Table rows */}
            <div className="divide-y" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.15))' }}>
              {filteredRows.map((row, idx) => (
                <motion.div
                  key={row.memberId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                  className={`grid grid-cols-[1fr_0.6fr_0.7fr_0.7fr_36px] gap-1 px-2.5 py-2 items-center text-[10px] ${
                    !row.isCorrect ? 'bg-red-50/40' : idx % 2 === 0 ? 'bg-transparent' : 'bg-white/30'
                  }`}
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <p className="font-bold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{row.fullName}</p>
                    <p className="text-[8px] truncate" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{row.phone}</p>
                  </div>
                  {/* Plan */}
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{row.planName}</p>
                    <p className="text-[8px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{row.totalMonths}mo</p>
                  </div>
                  {/* Stored Due */}
                  <p className={`font-bold text-[9px] ${!row.isCorrect ? 'text-red-600' : ''}`} style={row.isCorrect ? { color: 'var(--theme-text-primary, #1e293b)' } : undefined}>
                    {fmtDate(row.storedNextDue)}
                  </p>
                  {/* Expected */}
                  <p className="font-bold text-[9px] text-emerald-600">{fmtDate(row.expectedNextDue)}</p>
                  {/* Verdict */}
                  <div className="flex justify-center">
                    {row.isCorrect
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      : <XCircle className="w-3.5 h-3.5 text-red-500" />
                    }
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* ── CARD VIEW ── */
          <div className="grid grid-cols-2 gap-2">
            {filteredRows.map((row, idx) => (
              <motion.div
                key={row.memberId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.015, 0.4) }}
                className={`rounded-2xl border shadow-sm overflow-hidden border-l-[3px] ${
                  row.isCorrect
                    ? 'border-l-emerald-400 border-white/30'
                    : 'border-l-red-400 border-red-200/60'
                }`}
                style={{ backgroundColor: row.isCorrect ? 'var(--theme-card-bg, rgba(255,255,255,0.85))' : 'rgba(254,226,226,0.35)' }}
              >
                {/* Name + Status row */}
                <div className="px-2.5 pt-2 pb-1 flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold truncate" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{row.fullName}</p>
                    <p className="text-[9px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{row.planName} · {row.totalMonths}mo</p>
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    row.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    row.status === 'expired' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {row.status}
                  </span>
                </div>

                {/* Due date comparison */}
                <div className="px-2.5 pb-1.5">
                  <div className="grid grid-cols-2 gap-x-2 text-[9px]">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Stored</p>
                      <p className={`font-bold ${row.isCorrect ? '' : 'text-red-600'}`} style={row.isCorrect ? { color: 'var(--theme-text-primary, #1e293b)' } : undefined}>
                        {fmtDate(row.storedNextDue)}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Expected</p>
                      <p className="font-bold text-emerald-600">{fmtDate(row.expectedNextDue)}</p>
                    </div>
                  </div>
                </div>

                {/* Footer: Note + Verdict */}
                <div className="px-2.5 pb-2 flex items-center justify-between border-t" style={{ borderColor: 'var(--theme-glass-border, rgba(255,255,255,0.3))' }}>
                  <span className="text-[8px] pt-1" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{row.note}</span>
                  <div className={`pt-1 flex items-center gap-0.5 text-[8px] font-bold ${row.isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                    {row.isCorrect
                      ? <CheckCircle2 className="w-2.5 h-2.5" />
                      : <XCircle className="w-2.5 h-2.5" />
                    }
                    <span>{row.isCorrect ? 'OK' : 'FIX'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
