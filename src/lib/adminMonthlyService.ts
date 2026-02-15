/**
 * Admin Monthly Overview – service layer
 *
 * Single-call fetch that grabs members + payments + plans + history
 * for a given month, then computes every stat an owner needs.
 */

import { supabase, getCurrentGymId } from '@/lib/supabase';
import { format, addMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

// ── Public types ─────────────────────────────────────────

export interface MonthlyMemberRow {
  id: string;
  fullName: string;
  phone: string;
  photoUrl: string | null;
  status: 'active' | 'inactive';
  gender: string | null;
  joiningDate: string;
  joiningDay: number;
  membershipEndDate: string | null;
  // Plan
  planId: string | null;
  planName: string;
  planTotalMonths: number;
  planAmount: number;
  // Payments
  payments: PaymentRecord[];
  paymentCount: number;
  totalPaid: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  paidThisMonth: boolean;
  amountPaidThisMonth: number;
  // Due date audit
  storedNextDue: string | null;
  expectedNextDue: string | null;
  dueDateCorrect: boolean;
  dueDateNote: string;
  // Flags
  joinedThisMonth: boolean;
  madeInactiveThisMonth: boolean;
  reactivatedThisMonth: boolean;
  // Category for quick filtering
  categories: MemberCategory[];
}

export type MemberCategory =
  | 'new_join'
  | 'inactive'
  | 'reactivated'
  | 'paid'
  | 'unpaid'
  | 'due_date_issue'
  | 'no_plan'
  | 'no_payment'
  | 'overdue';

export interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: number;
  method: string;
  createdAt: string;
}

export interface MonthlyStats {
  totalActive: number;
  totalInactive: number;
  newJoins: number;
  madeInactive: number;
  reactivated: number;
  membersPaid: number;
  membersUnpaid: number;
  totalCollected: number;
  dueDateIssues: number;
  noPlan: number;
  noPayments: number;
  overdue: number;
}

export interface MonthlyOverviewData {
  stats: MonthlyStats;
  members: MonthlyMemberRow[];
  gymName: string;
  monthLabel: string;
}

// ── Internal plan type ───────────────────────────────────

interface PlanInfo {
  id: string;
  name: string;
  baseMonths: number;
  bonusMonths: number;
  totalMonths: number;
  price: number;
}

// ── Due date replay (mirrors DB trigger) ─────────────────

function replayDueDateLogic(
  joiningDate: string,
  totalMonths: number,
  payments: { payment_date: string; created_at: string }[],
  historyEvents: { change_type: string; created_at: string; new_value: Record<string, string> | null }[],
): { expectedNextDue: string | null; note: string } {
  if (payments.length === 0) return { expectedNextDue: null, note: 'No payments' };

  let currentJoining = joiningDate;
  let nextDue: Date | null = null;

  const reactivations = historyEvents
    .filter(e => e.change_type === 'member_reactivated')
    .map(e => ({
      date: e.created_at.substring(0, 10),
      newJoining: e.new_value?.joining_date || null,
    }));

  const sorted = [...payments].sort((a, b) => {
    const cmp = a.payment_date.localeCompare(b.payment_date);
    return cmp !== 0 ? cmp : a.created_at.localeCompare(b.created_at);
  });

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const match = reactivations.find(r => r.date === p.payment_date);
    if (match?.newJoining) currentJoining = match.newJoining;

    const joiningDay = new Date(currentJoining + 'T00:00:00').getDate();
    const isFirst =
      i === 0 ||
      nextDue === null ||
      nextDue <= new Date(currentJoining + 'T00:00:00');

    let raw: Date;
    if (isFirst) {
      raw = addMonths(new Date(currentJoining + 'T00:00:00'), totalMonths);
    } else {
      raw = addMonths(nextDue!, totalMonths);
    }

    const lastDay = new Date(raw.getFullYear(), raw.getMonth() + 1, 0).getDate();
    raw.setDate(Math.min(joiningDay, lastDay));
    nextDue = raw;
  }

  if (!nextDue) return { expectedNextDue: null, note: 'Calculation failed' };

  const hasReactivation = reactivations.length > 0;
  return {
    expectedNextDue: format(nextDue, 'yyyy-MM-dd'),
    note: hasReactivation
      ? `Reactivated ${reactivations.length}x`
      : sorted.length === 1
        ? 'Single payment'
        : `${sorted.length} payments`,
  };
}

// ── Main fetch function ──────────────────────────────────

export async function fetchMonthlyOverview(month: Date): Promise<MonthlyOverviewData> {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID');

  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthLabel = format(month, 'MMMM yyyy');

  // Parallel data fetch
  const [gymRes, membersRes, paymentsRes, historyRes, plansRes] = await Promise.all([
    supabase.from('gym_gyms').select('name').eq('id', gymId).single(),
    supabase
      .from('gym_members')
      .select('id, full_name, phone, photo_url, status, gender, joining_date, plan_id, plan_amount, membership_end_date, next_payment_due_date, last_payment_date, last_payment_amount, created_at, updated_at')
      .eq('gym_id', gymId)
      .order('full_name'),
    supabase
      .from('gym_payments')
      .select('id, member_id, payment_date, amount, payment_method, created_at')
      .eq('gym_id', gymId)
      .order('payment_date', { ascending: true }),
    supabase
      .from('gym_member_history')
      .select('id, member_id, change_type, created_at, new_value')
      .eq('gym_id', gymId),
    supabase
      .from('gym_membership_plans')
      .select('id, name, price, final_price, duration_months, base_duration_months, bonus_duration_months')
      .eq('gym_id', gymId),
  ]);

  const gymName = gymRes.data?.name || '';
  const allMembers = membersRes.data || [];
  const allPayments = paymentsRes.data || [];
  const allHistory = historyRes.data || [];

  // Build plan map
  const planMap = new Map<string, PlanInfo>();
  for (const p of plansRes.data || []) {
    const base = (p as any).base_duration_months ?? (p as any).duration_months ?? 1;
    const bonus = (p as any).bonus_duration_months ?? 0;
    planMap.set(p.id, {
      id: p.id,
      name: p.name,
      baseMonths: base,
      bonusMonths: bonus,
      totalMonths: base + bonus,
      price: (p as any).final_price ?? (p as any).price ?? 0,
    });
  }

  // Index payments & history by member
  const paymentsByMember = new Map<string, typeof allPayments>();
  for (const p of allPayments) {
    const arr = paymentsByMember.get(p.member_id) || [];
    arr.push(p);
    paymentsByMember.set(p.member_id, arr);
  }

  const historyByMember = new Map<string, typeof allHistory>();
  for (const h of allHistory) {
    const arr = historyByMember.get(h.member_id) || [];
    arr.push(h);
    historyByMember.set(h.member_id, arr);
  }

  // Payments this month by member
  const monthPaymentsByMember = new Map<string, typeof allPayments>();
  for (const p of allPayments) {
    if (p.payment_date >= monthStart && p.payment_date <= monthEnd) {
      const arr = monthPaymentsByMember.get(p.member_id) || [];
      arr.push(p);
      monthPaymentsByMember.set(p.member_id, arr);
    }
  }

  // History events this month
  const monthHistoryByMember = new Map<string, typeof allHistory>();
  for (const h of allHistory) {
    const hDate = h.created_at.substring(0, 10);
    if (hDate >= monthStart && hDate <= monthEnd) {
      const arr = monthHistoryByMember.get(h.member_id) || [];
      arr.push(h);
      monthHistoryByMember.set(h.member_id, arr);
    }
  }

  // Build member rows
  const members: MonthlyMemberRow[] = [];
  const stats: MonthlyStats = {
    totalActive: 0,
    totalInactive: 0,
    newJoins: 0,
    madeInactive: 0,
    reactivated: 0,
    membersPaid: 0,
    membersUnpaid: 0,
    totalCollected: 0,
    dueDateIssues: 0,
    noPlan: 0,
    noPayments: 0,
    overdue: 0,
  };

  for (const m of allMembers) {
    const plan = m.plan_id ? planMap.get(m.plan_id) : null;
    const memberPayments = paymentsByMember.get(m.id) || [];
    const memberHistory = historyByMember.get(m.id) || [];
    const monthPayments = monthPaymentsByMember.get(m.id) || [];
    const monthHistory = monthHistoryByMember.get(m.id) || [];

    // Determine flags
    const joinedThisMonth = m.joining_date >= monthStart && m.joining_date <= monthEnd;
    const madeInactiveThisMonth = monthHistory.some(
      h => h.change_type === 'status_change' && (h.new_value as any)?.status === 'inactive',
    ) || (m.status === 'inactive' && m.updated_at?.substring(0, 10) >= monthStart && m.updated_at?.substring(0, 10) <= monthEnd);
    const reactivatedThisMonth = monthHistory.some(h => h.change_type === 'member_reactivated');
    const paidThisMonth = monthPayments.length > 0;
    const amountPaidThisMonth = monthPayments.reduce((s, p) => s + Number(p.amount), 0);

    // Due date audit
    let dueDateCorrect = true;
    let expectedNextDue: string | null = null;
    let dueDateNote = '';

    if (!plan) {
      dueDateNote = 'No plan assigned';
      dueDateCorrect = m.status !== 'active'; // active without plan = issue
    } else if (memberPayments.length === 0) {
      dueDateNote = 'No payments recorded';
      dueDateCorrect = m.status !== 'active';
    } else {
      const result = replayDueDateLogic(
        m.joining_date,
        plan.totalMonths,
        memberPayments.map(p => ({ payment_date: p.payment_date, created_at: p.created_at })),
        memberHistory,
      );
      expectedNextDue = result.expectedNextDue;
      dueDateNote = result.note;
      dueDateCorrect = m.next_payment_due_date === expectedNextDue;
    }

    // Categories
    const categories: MemberCategory[] = [];
    if (joinedThisMonth) categories.push('new_join');
    if (madeInactiveThisMonth) categories.push('inactive');
    if (reactivatedThisMonth) categories.push('reactivated');
    if (paidThisMonth) categories.push('paid');
    if (m.status === 'active' && !paidThisMonth) categories.push('unpaid');
    if (!dueDateCorrect && m.status === 'active') categories.push('due_date_issue');
    if (!plan && m.status === 'active') categories.push('no_plan');
    if (memberPayments.length === 0 && m.status === 'active') categories.push('no_payment');
    if (
      m.status === 'active' &&
      m.next_payment_due_date &&
      m.next_payment_due_date < today
    ) {
      categories.push('overdue');
    }

    // Payment records for this member
    const paymentRecords: PaymentRecord[] = memberPayments.map(p => ({
      id: p.id,
      paymentDate: p.payment_date,
      amount: Number(p.amount),
      method: p.payment_method || 'unknown',
      createdAt: p.created_at,
    }));

    // Sorted descending for display
    paymentRecords.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    const lastPayment = paymentRecords[0] ?? null;

    members.push({
      id: m.id,
      fullName: m.full_name,
      phone: m.phone || '',
      photoUrl: m.photo_url,
      status: m.status,
      gender: m.gender,
      joiningDate: m.joining_date,
      joiningDay: new Date(m.joining_date + 'T00:00:00').getDate(),
      membershipEndDate: m.membership_end_date,
      planId: m.plan_id,
      planName: plan?.name || 'No plan',
      planTotalMonths: plan?.totalMonths || 0,
      planAmount: plan?.price ?? Number(m.plan_amount) ?? 0,
      payments: paymentRecords,
      paymentCount: memberPayments.length,
      totalPaid: memberPayments.reduce((s, p) => s + Number(p.amount), 0),
      lastPaymentDate: lastPayment?.paymentDate || null,
      lastPaymentAmount: lastPayment?.amount || null,
      paidThisMonth,
      amountPaidThisMonth,
      storedNextDue: m.next_payment_due_date,
      expectedNextDue,
      dueDateCorrect,
      dueDateNote,
      joinedThisMonth,
      madeInactiveThisMonth,
      reactivatedThisMonth,
      categories,
    });

    // Aggregate stats
    if (m.status === 'active') stats.totalActive++;
    if (m.status === 'inactive') stats.totalInactive++;
    if (joinedThisMonth) stats.newJoins++;
    if (madeInactiveThisMonth) stats.madeInactive++;
    if (reactivatedThisMonth) stats.reactivated++;
    if (paidThisMonth) {
      stats.membersPaid++;
      stats.totalCollected += amountPaidThisMonth;
    }
    if (m.status === 'active' && !paidThisMonth) stats.membersUnpaid++;
    if (!dueDateCorrect && m.status === 'active') stats.dueDateIssues++;
    if (!plan && m.status === 'active') stats.noPlan++;
    if (memberPayments.length === 0 && m.status === 'active') stats.noPayments++;
    if (m.status === 'active' && m.next_payment_due_date && m.next_payment_due_date < today) {
      stats.overdue++;
    }
  }

  return { stats, members, gymName, monthLabel };
}
