import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Loader2, Calendar, CreditCard, SplitSquareVertical,
  AlertCircle, Ban, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { installmentService } from '@/lib/installmentService';
import type { InstallmentPlanWithDetails, Installment } from '@/lib/installmentService';
import type { PaymentMethod } from '@/types/database';

interface InstallmentTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onUpdate: () => void;
}

export default function InstallmentTrackerModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  onUpdate,
}: InstallmentTrackerModalProps) {
  const [plans, setPlans] = useState<InstallmentPlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [cancellingPlanId, setCancellingPlanId] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await installmentService.getMemberInstallmentPlans(memberId);
      setPlans(data);
    } catch {
      toast.error('Failed to load installment plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && memberId) fetchPlans();
  }, [isOpen, memberId]);

  const handlePayInstallment = async (installment: Installment) => {
    setPayingId(installment.id);
    try {
      await installmentService.payInstallment(
        installment.id,
        payMethod,
        new Date().toISOString().split('T')[0]
      );
      toast.success(`Installment ${installment.installment_number} paid!`);
      await fetchPlans();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  const handleCancelPlan = async (planId: string) => {
    setCancellingPlanId(planId);
    try {
      await installmentService.cancelInstallmentPlan(planId);
      toast.success('Installment plan cancelled');
      await fetchPlans();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel plan');
    } finally {
      setCancellingPlanId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">PAID</span>;
      case 'overdue':
        return <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">OVERDUE</span>;
      case 'pending':
        return <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">PENDING</span>;
      case 'waived':
        return <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">WAIVED</span>;
      default:
        return null;
    }
  };

  const getPlanStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">ACTIVE</span>;
      case 'completed':
        return <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">COMPLETED</span>;
      case 'cancelled':
        return <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">CANCELLED</span>;
      case 'defaulted':
        return <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">DEFAULTED</span>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className="fixed inset-0 z-[111] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          className="w-[90vw] max-w-[360px] max-h-[85vh] rounded-2xl overflow-y-auto shadow-2xl bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SplitSquareVertical className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Installments</h3>
                <p className="text-[10px] text-slate-500">{memberName}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8">
                <SplitSquareVertical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No installment plans</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => {
                  const nextPending = plan.installments.find(
                    (i) => i.status === 'pending' || i.status === 'overdue'
                  );
                  const progressPct = plan.num_installments > 0
                    ? Math.round((plan.paid_count / plan.num_installments) * 100)
                    : 0;

                  return (
                    <div key={plan.id} className="rounded-xl border border-slate-200 overflow-hidden">
                      {/* Plan Header */}
                      <div className="p-3 bg-slate-50 border-b border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              ₹{plan.total_amount.toLocaleString('en-IN')} in {plan.num_installments} installments
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Created {format(new Date(plan.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          {getPlanStatusBadge(plan.status)}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPct}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-slate-600">{plan.paid_count}/{plan.num_installments}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[9px] text-slate-500">
                            Paid: ₹{plan.paid_amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-orange-600 font-semibold">
                            Remaining: ₹{plan.remaining_amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Installments List */}
                      <div className="divide-y divide-slate-100">
                        {plan.installments.map((inst) => (
                          <div key={inst.id} className={`p-3 flex items-center justify-between ${
                            inst.status === 'overdue' ? 'bg-red-50/50' : ''
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                inst.status === 'paid'
                                  ? 'bg-emerald-500 text-white'
                                  : inst.status === 'overdue'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {inst.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : inst.installment_number}
                              </span>
                              <div>
                                <p className="text-[11px] font-semibold text-slate-700">
                                  ₹{inst.amount.toLocaleString('en-IN')}
                                </p>
                                <p className="text-[9px] text-slate-500">
                                  {inst.status === 'paid' && inst.paid_date
                                    ? `Paid ${format(new Date(inst.paid_date), 'MMM d')}`
                                    : `Due ${format(new Date(inst.due_date), 'MMM d, yyyy')}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(inst.status)}
                              {(inst.status === 'pending' || inst.status === 'overdue') && plan.status === 'active' && (
                                <button
                                  onClick={() => handlePayInstallment(inst)}
                                  disabled={payingId === inst.id}
                                  className="px-2.5 py-1 rounded-lg bg-orange-500 text-white text-[9px] font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {payingId === inst.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CreditCard className="w-3 h-3" />
                                  )}
                                  Pay
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Cancel button for active plans */}
                      {plan.status === 'active' && (
                        <div className="p-3 border-t border-slate-200 bg-slate-50">
                          {/* Payment method for next installment */}
                          {nextPending && (
                            <div className="mb-2">
                              <label className="text-[9px] font-medium text-slate-500 mb-1 block">Payment Method for Next</label>
                              <div className="flex gap-1.5">
                                {(['cash', 'upi', 'card'] as PaymentMethod[]).map((m) => (
                                  <button
                                    key={m}
                                    onClick={() => setPayMethod(m)}
                                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-semibold capitalize transition-all ${
                                      payMethod === m
                                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                                        : 'border-slate-200 text-slate-500'
                                    }`}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleCancelPlan(plan.id)}
                            disabled={cancellingPlanId === plan.id}
                            className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-red-500 hover:text-red-600 font-semibold transition-colors"
                          >
                            {cancellingPlanId === plan.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            Cancel Remaining Installments
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
