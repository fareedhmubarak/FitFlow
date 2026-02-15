import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, History, Loader2, UserCheck, UserMinus, CreditCard,
  Clock, ArrowRightLeft, CalendarClock, IndianRupee, AlertTriangle,
  RotateCcw, ChevronDown
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { membershipService } from '@/lib/membershipService';

interface MembershipHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
}

export default function MembershipHistoryModal({
  isOpen,
  onClose,
  memberId,
  memberName,
}: MembershipHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && memberId) {
      fetchTimeline();
    }
  }, [isOpen, memberId]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const result = await membershipService.getMemberUnifiedTimeline(memberId);
      setMember(result.member);
      setTimeline(result.timeline);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const fmtCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const planDuration = (m: any) => {
    const p = m?.gym_membership_plans;
    if (!p) return null;
    const months = p.duration_months || p.base_duration_months || 0;
    const bonus = p.bonus_duration_months || 0;
    if (bonus > 0) return `${p.base_duration_months}+${bonus} months`;
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  const statusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'active') return { bg: 'bg-emerald-100 text-emerald-700', label: 'Active' };
    if (s === 'expired') return { bg: 'bg-amber-100 text-amber-700', label: 'Expired' };
    return { bg: 'bg-red-100 text-red-700', label: status || 'Unknown' };
  };

  // ── Event row renderer ──────────────────────────────────

  const daysBetween = (a: string, b: string) => {
    try { return differenceInDays(new Date(b), new Date(a)); } catch { return 0; }
  };

  const renderGapChip = (days: number) => {
    if (days <= 1) return null;
    const label = days < 30 ? `${days} days later` 
                : days < 365 ? `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} later`
                : `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m later`;
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="flex flex-col items-center shrink-0">
          <div className="w-px h-2 bg-slate-200" />
          <ChevronDown className="w-3 h-3 text-slate-300" />
        </div>
        <span className="text-[9px] font-semibold text-slate-300 tracking-wide uppercase">
          {label}
        </span>
      </div>
    );
  };

  const renderTimelineEntry = (entry: any, idx: number) => {
    const prevEntry = idx > 0 ? timeline[idx - 1] : null;
    const gap = prevEntry ? daysBetween(prevEntry.date, entry.date) : 0;

    return (
      <div key={entry.id}>
        {renderGapChip(gap)}
        {entry.type === 'payment' ? renderPaymentRow(entry, idx) : renderEventRow(entry, idx)}
      </div>
    );
  };

  const renderPaymentRow = (e: any, idx: number) => {
    const daysLate = e.days_late || 0;
    const isLate = daysLate > 0;
    const isEarly = daysLate < 0;
    const isReactivation = !!e.reactivation;

    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.03 }}
        className="relative flex gap-3 group"
      >
        {/* Timeline dot */}
        <div className="flex flex-col items-center pt-1 shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white z-10 ${
            isReactivation ? 'bg-blue-500' : 'bg-emerald-500'
          }`} />
          {idx < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
        </div>

        {/* Content */}
        <div className="flex-1 pb-4 min-w-0">
          {/* Date line */}
          <div className="text-[10px] text-slate-400 font-medium mb-1">
            {fmtDate(e.payment_date)}
          </div>

          {/* Payment card */}
          <div className={`rounded-lg border shadow-sm px-3 py-2 ${
            isReactivation ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'
          }`}>
            {/* Label + amount row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1 rounded-md ${isReactivation ? 'bg-blue-100' : 'bg-emerald-50'}`}>
                  {isReactivation 
                    ? <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                    : <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${
                    isReactivation ? 'text-blue-600' : 'text-emerald-600'
                  }`}>{e.payment_label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-800">{fmtCurrency(e.amount)}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{e.payment_method?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 bg-white/80 px-1.5 py-0.5 rounded-md shrink-0">
                #{e.payment_index}
              </span>
            </div>

            {/* Timing details */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[10px] ml-8">
              <span className={`font-semibold ${isLate ? 'text-red-500' : isEarly ? 'text-emerald-600' : 'text-blue-500'}`}>
                {isLate && <><AlertTriangle className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />{e.payment_timing}</>}
                {isEarly && e.payment_timing}
                {!isLate && !isEarly && 'Paid on time'}
              </span>
            </div>

            {/* Reactivation details if merged */}
            {isReactivation && e.reactivation?.new_value && (
              <div className="mt-2 pt-2 border-t border-blue-100/50 ml-8 text-[10px] text-slate-500">
                <div className="flex items-center gap-1 mb-0.5">
                  <UserCheck className="w-3 h-3 text-blue-500" />
                  <span className="font-bold text-blue-600">Reactivated</span>
                </div>
                {e.reactivation.new_value.plan && (
                  <span>Plan: {e.reactivation.new_value.plan}</span>
                )}
                {e.reactivation.new_value.next_payment_due_date && (
                  <span className="ml-2">• Next due: {fmtDate(e.reactivation.new_value.next_payment_due_date)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderEventRow = (e: any, idx: number) => {
    const { icon, color, dotColor, title } = getEventMeta(e.subtype);

    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.03 }}
        className="relative flex gap-3 group"
      >
        {/* Timeline dot */}
        <div className="flex flex-col items-center pt-1 shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white z-10`} />
          {idx < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
        </div>

        {/* Content */}
        <div className="flex-1 pb-4 min-w-0">
          <div className="text-[10px] text-slate-400 font-medium mb-1">
            {fmtDate(e.date)}
          </div>

          <div className={`rounded-lg border px-3 py-2 ${color}`}>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-white/60">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800">{title}</p>
                {e.description && (
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{e.description}</p>
                )}
              </div>
            </div>

            {/* Show reason for inactive */}
            {e.new_value?.reason && (
              <p className="text-[10px] text-slate-400 mt-1 ml-8">
                Reason: <span className="capitalize">{e.new_value.reason.replace(/_/g, ' ')}</span>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const getEventMeta = (subtype: string) => {
    switch (subtype) {
      case 'member_created':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
          color: 'bg-emerald-50 border-emerald-100',
          dotColor: 'bg-emerald-500',
          title: 'Joined Gym',
        };
      case 'status_changed_to_inactive':
        return {
          icon: <UserMinus className="w-3.5 h-3.5 text-red-600" />,
          color: 'bg-red-50 border-red-100',
          dotColor: 'bg-red-500',
          title: 'Marked Inactive',
        };
      case 'member_reactivated':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-blue-600" />,
          color: 'bg-blue-50 border-blue-100',
          dotColor: 'bg-blue-500',
          title: 'Reactivated',
        };
      case 'base_date_shifted':
        return {
          icon: <CalendarClock className="w-3.5 h-3.5 text-purple-600" />,
          color: 'bg-purple-50 border-purple-100',
          dotColor: 'bg-purple-500',
          title: 'Due Date Shifted',
        };
      case 'initial_payment_reversed':
        return {
          icon: <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />,
          color: 'bg-amber-50 border-amber-100',
          dotColor: 'bg-amber-500',
          title: 'Payment Reversed',
        };
      case 'payment_deleted':
        return {
          icon: <CreditCard className="w-3.5 h-3.5 text-red-600" />,
          color: 'bg-red-50 border-red-100',
          dotColor: 'bg-red-400',
          title: 'Payment Deleted',
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
          color: 'bg-white border-slate-100',
          dotColor: 'bg-slate-400',
          title: subtype?.replace(/_/g, ' ') || 'Event',
        };
    }
  };

  // ── Summary card helpers ────────────────────────────────

  const totalPaid = timeline
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const paymentCount = timeline.filter((t) => t.type === 'payment').length;

  // ── Render ──────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[251] flex items-center justify-center p-4"
            style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
            onClick={onClose}
          >
            <div
              className="w-[90vw] max-w-[400px] max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ────────────────────────── */}
              <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 px-4 pt-4 pb-3 shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors z-10"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>

                <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-bold tracking-wider mb-0.5">
                  <History className="w-3 h-3" />
                  MEMBER TIMELINE
                </div>
                <h3 className="text-lg font-bold text-white truncate pr-8">{memberName}</h3>
              </div>

              {/* ── Content ───────────────────────── */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <>
                    {/* Summary strip */}
                    {member && (
                      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
                        {/* Row 1: Plan + Status */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {member.gym_membership_plans?.name && (
                              <span className="text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                                {member.gym_membership_plans.name}
                                {planDuration(member) && (
                                  <span className="text-slate-400 font-normal ml-1">• {planDuration(member)}</span>
                                )}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusBadge(member.status).bg}`}>
                            {statusBadge(member.status).label}
                          </span>
                        </div>

                        {/* Row 2: Key stats */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Joined</p>
                            <p className="text-[11px] font-bold text-slate-700">
                              {fmtDate(member.first_joining_date || member.joining_date)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Total Paid</p>
                            <p className="text-[11px] font-bold text-emerald-700">{fmtCurrency(totalPaid)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Next Due</p>
                            <p className="text-[11px] font-bold text-slate-700">
                              {member.next_payment_due_date ? fmtDate(member.next_payment_due_date) : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="px-4 pt-4 pb-2">
                      {timeline.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-xs text-slate-400 italic">No history recorded yet.</p>
                        </div>
                      ) : (
                        <div className="relative">
                          {timeline.map((entry, idx) => renderTimelineEntry(entry, idx))}
                        </div>
                      )}
                    </div>

                    {/* Footer stats bar */}
                    {paymentCount > 0 && (
                      <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{paymentCount} payment{paymentCount !== 1 ? 's' : ''} • {timeline.length - paymentCount} event{(timeline.length - paymentCount) !== 1 ? 's' : ''}</span>
                        <span className="font-bold text-emerald-600">{fmtCurrency(totalPaid)} total</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Close button ──────────────────── */}
              <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-xs"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
