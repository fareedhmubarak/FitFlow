import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CreditCard, History, UserCheck, UserMinus, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { membershipService } from '@/lib/membershipService';

interface MembershipHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
}

interface Period {
  id: string;
  period_number: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  paid_amount: number;
  status: string;
  end_reason?: string;
  notes?: string;
}

interface MemberData {
  id: string;
  full_name: string;
  phone: string;
  photo_url: string | null;
  status: 'active' | 'inactive';
  first_joining_date: string;
  joining_date: string;
  deactivated_at: string | null;
  total_periods: number;
}

export default function MembershipHistoryModal({
  isOpen,
  onClose,
  memberId,
  memberName,
}: MembershipHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberData | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && memberId) {
      fetchHistory();
    }
  }, [isOpen, memberId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch both periods (for member summary) and specific history events
      const [periodsResult, historyResult] = await Promise.all([
        membershipService.getMemberPeriods(memberId),
        membershipService.getMemberHistoryEvents(memberId)
      ]);
      
      setMember(periodsResult.member);
      // Sort events ASCENDING (Oldest first) as requested
      setEvents([...historyResult].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    } catch (error) {
      console.error('Error fetching membership history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    if (type.includes('created') || type.includes('joined')) return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
    if (type.includes('inactive')) return <UserMinus className="w-3.5 h-3.5 text-red-600" />;
    if (type.includes('reactivated') || type.includes('rejoin')) return <UserCheck className="w-3.5 h-3.5 text-blue-600" />;
    if (type.includes('payment')) return <CreditCard className="w-3.5 h-3.5 text-amber-600" />;
    return <Clock className="w-3.5 h-3.5 text-slate-500" />;
  };

  const getEventColor = (type: string) => {
    if (type.includes('created') || type.includes('joined')) return 'bg-emerald-50 border-emerald-100';
    if (type.includes('inactive')) return 'bg-red-50 border-red-100';
    if (type.includes('reactivated') || type.includes('rejoin')) return 'bg-blue-50 border-blue-100';
    return 'bg-white border-slate-100';
  };

  const getEventTitle = (event: any) => {
    switch (event.change_type) {
      case 'member_created': return 'Joined Gym';
      case 'member_joined': return 'Joined Gym';
      case 'status_changed_to_inactive': return 'Marked Inactive';
      case 'member_reactivated': return 'Rejoined / Reactivated';
      case 'payment_created': return 'Payment Recorded';
      default: return event.change_type.replace(/_/g, ' ');
    }
  };

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

          {/* Modal - CONSISTENT WIDTH */}
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
              className="w-[90vw] max-w-[380px] max-h-[75vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="relative bg-slate-900 p-4 shrink-0">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                style={{ zIndex: 10 }}
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>

              <div className="flex items-center gap-2 text-white/70 text-[10px] font-bold tracking-wider mb-1">
                <History className="w-3 h-3" />
                TIMELINE
              </div>
              <h3 className="text-lg font-bold text-white truncate pr-8">{memberName}</h3>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  {/* Summary Stats - Compact Row */}
                  {member && (
                    <div className="flex divide-x divide-slate-100 bg-white rounded-xl shadow-sm border border-slate-100 mb-5 overflow-hidden">
                      <div className="flex-1 p-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Joined</p>
                        <p className="text-xs font-bold text-slate-800">
                          {format(new Date(member.first_joining_date || member.joining_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex-1 p-3 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Status</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                           member.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Events Timeline */}
                  <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {events.length === 0 ? (
                      <div className="text-center py-8 px-4 pl-0">
                        <p className="text-xs text-slate-500 italic">No history events recorded yet.</p>
                      </div>
                    ) : (
                      events.map((event, idx) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="relative pl-6"
                        >
                          {/* Dot on timeline */}
                          <div className={`absolute left-[-5px] top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${
                            event.change_type.includes('inactive') ? 'bg-red-500' :
                            event.change_type.includes('reactivated') ? 'bg-blue-500' :
                            'bg-emerald-500'
                          }`}></div>

                          {/* Date Label */}
                          <div className="text-[10px] font-semibold text-slate-400 mb-1 ml-0.5">
                            {format(new Date(event.created_at), 'MMMM d, yyyy')} • {format(new Date(event.created_at), 'h:mm a')}
                          </div>

                          {/* Card */}
                          <div className={`rounded-xl border p-3 shadow-sm ${getEventColor(event.change_type)}`}>
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 p-1.5 rounded-full bg-white shadow-sm">
                                {getEventIcon(event.change_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                  {getEventTitle(event)}
                                </h4>
                                <p className="text-xs text-slate-600 mt-1 leading-snug">
                                  {event.description}
                                </p>
                                
                                {/* Show JSON details if needed, compactly */}
                                {event.new_value?.reason && (
                                  <div className="mt-2 text-[10px] bg-white/50 p-1.5 rounded border border-slate-100/50">
                                    <span className="font-semibold">Reason:</span> {event.new_value.reason.replace(/_/g, ' ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-white border-t border-slate-100">
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
