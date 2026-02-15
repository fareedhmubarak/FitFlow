import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Loader2, ArrowLeft, Search,
  CheckCircle2, XCircle, Download, RefreshCw, Info
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase, getCurrentGymId } from '@/lib/supabase';

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
    return `₹${n.toLocaleString('en-IN')}`;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-[Urbanist]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-bold tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              ADMIN PANEL
            </div>
            <h1 className="text-lg font-bold">Payment Due Date Audit</h1>
          </div>
        </div>

        {gymName && (
          <p className="text-xs text-white/60 ml-11">{gymName}</p>
        )}

        {/* Stats bar */}
        {!loading && (
          <div className="flex gap-3 mt-3 ml-11">
            <div className="bg-white/10 rounded-lg px-3 py-1.5 text-center">
              <p className="text-[9px] text-white/50 font-bold uppercase">Total</p>
              <p className="text-sm font-bold">{rows.length}</p>
            </div>
            <div className="bg-emerald-500/20 rounded-lg px-3 py-1.5 text-center">
              <p className="text-[9px] text-emerald-200 font-bold uppercase">Correct</p>
              <p className="text-sm font-bold text-emerald-200">{correctCount}</p>
            </div>
            <div className={`rounded-lg px-3 py-1.5 text-center ${mismatchCount > 0 ? 'bg-red-500/20' : 'bg-white/10'}`}>
              <p className={`text-[9px] font-bold uppercase ${mismatchCount > 0 ? 'text-red-200' : 'text-white/50'}`}>Mismatch</p>
              <p className={`text-sm font-bold ${mismatchCount > 0 ? 'text-red-200' : 'text-white/70'}`}>{mismatchCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-2">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          {/* Export */}
          <button
            onClick={exportCSV}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
          </button>
          {/* Refresh */}
          <button
            onClick={runAudit}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
            title="Re-run audit"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {(['all', 'mismatch', 'correct'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${
                filterStatus === f
                  ? f === 'mismatch'
                    ? 'bg-red-100 text-red-700'
                    : f === 'correct'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {f === 'all' ? `All (${rows.length})` : f === 'mismatch' ? `Mismatch (${mismatchCount})` : `Correct (${correctCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-3 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-[10px] text-indigo-600 leading-relaxed">
          This replays the trigger logic for each payment to verify the calculated <strong>Next Due Date</strong>. 
          The last column shows whether the stored value matches what the trigger should have computed.
        </p>
      </div>

      {/* Table */}
      <div className="px-4 pt-3 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
            <p className="text-xs text-slate-400">Running audit across all members...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-slate-400">No members match the filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRows.map((row, idx) => (
              <motion.div
                key={row.memberId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                className={`rounded-xl border shadow-sm overflow-hidden ${
                  row.isCorrect
                    ? 'bg-white border-slate-100'
                    : 'bg-red-50/50 border-red-200'
                }`}
              >
                {/* Row header */}
                <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded-full ${row.isCorrect ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {row.isCorrect
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        : <XCircle className="w-3.5 h-3.5 text-red-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{row.fullName}</p>
                      <p className="text-[10px] text-slate-400">{row.phone}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      row.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      row.status === 'expired' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                </div>

                {/* Data grid */}
                <div className="px-3 pb-2.5">
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-[10px]">
                    <div>
                      <p className="text-slate-400 font-semibold">Plan</p>
                      <p className="font-bold text-slate-700 truncate">{row.planName}</p>
                      <p className="text-slate-400">{row.totalMonths}mo</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Joined</p>
                      <p className="font-bold text-slate-700">{fmtDate(row.joiningDate)}</p>
                      <p className="text-slate-400">Day {row.joiningDay}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Payments</p>
                      <p className="font-bold text-slate-700">{row.paymentCount}</p>
                      {row.lastPaymentAmount !== null && (
                        <p className="text-slate-400">Last {fmtCurrency(row.lastPaymentAmount)}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-slate-400 font-semibold">Last Paid</p>
                      <p className="font-bold text-slate-700">{fmtDate(row.lastPaymentDate)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Stored Due</p>
                      <p className={`font-bold ${row.isCorrect ? 'text-slate-700' : 'text-red-600'}`}>
                        {fmtDate(row.storedNextDue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-semibold">Expected Due</p>
                      <p className={`font-bold ${row.isCorrect ? 'text-emerald-600' : 'text-emerald-700'}`}>
                        {fmtDate(row.expectedNextDue)}
                      </p>
                    </div>
                  </div>

                  {/* Note + verdict */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                    <span className="text-[9px] text-slate-400">{row.note}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      row.isCorrect
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {row.isCorrect ? '✓ CORRECT' : '✗ MISMATCH'}
                    </span>
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
