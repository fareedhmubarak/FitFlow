import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Check, Loader2, Calendar, CreditCard, SplitSquareVertical, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useMembershipPlans } from '@/hooks/useMembershipPlans';
import { installmentService } from '@/lib/installmentService';
import type { PaymentMethod } from '@/types/database';
import type { InstallmentPlanWithDetails } from '@/lib/installmentService';

interface InstallmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  currentPlanName?: string;
  currentPlanAmount?: number;
  onSuccess: (plan: InstallmentPlanWithDetails) => void;
}

export default function InstallmentPlanModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  currentPlanName,
  currentPlanAmount,
  onSuccess,
}: InstallmentPlanModalProps) {
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const [form, setForm] = useState({
    plan_id: '' as string,
    total_amount: 0,
    num_installments: 2,
    frequency_days: 30,
    payment_method: 'cash' as PaymentMethod,
    first_payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Separate plans
  const { regularPlans, specialPlans } = useMemo(() => {
    if (!plans) return { regularPlans: [], specialPlans: [] };
    const allPlans = plans
      .filter((plan: any) => plan.is_active)
      .map((plan: any) => {
        const baseMonths = plan.base_duration_months || plan.duration_months || 1;
        const bonusMonths = plan.bonus_duration_months || 0;
        const totalMonths = baseMonths + bonusMonths;
        let label = plan.name;
        if (bonusMonths > 0) label = `${plan.name} (${baseMonths}+${bonusMonths})`;
        return { id: plan.id, label, amount: plan.price, totalMonths, bonusMonths };
      })
      .sort((a: any, b: any) => a.amount - b.amount);

    return {
      regularPlans: allPlans.filter((p: any) => p.bonusMonths === 0),
      specialPlans: allPlans.filter((p: any) => p.bonusMonths > 0),
    };
  }, [plans]);

  // Calculate per-installment amount
  const installmentAmount = useMemo(() => {
    if (form.total_amount <= 0 || form.num_installments <= 0) return 0;
    return Math.floor((form.total_amount / form.num_installments) * 100) / 100;
  }, [form.total_amount, form.num_installments]);

  const lastInstallmentAmount = useMemo(() => {
    if (form.total_amount <= 0 || form.num_installments <= 0) return 0;
    return +(form.total_amount - installmentAmount * (form.num_installments - 1)).toFixed(2);
  }, [form.total_amount, form.num_installments, installmentAmount]);

  // Generate installment schedule for preview
  const schedule = useMemo(() => {
    const items = [];
    for (let i = 1; i <= form.num_installments; i++) {
      const daysOffset = (i - 1) * form.frequency_days;
      const [y, m, d] = form.first_payment_date.split('-').map(Number);
      const startDate = new Date(y, m - 1, d);
      const dueDate = addDays(startDate, daysOffset);
      const amount = i === form.num_installments ? lastInstallmentAmount : installmentAmount;
      items.push({ number: i, due_date: dueDate, amount, status: i === 1 ? 'First Payment' : 'Pending' });
    }
    return items;
  }, [form.num_installments, form.frequency_days, form.first_payment_date, installmentAmount, lastInstallmentAmount]);

  // Initialize plan when opening
  React.useEffect(() => {
    if (isOpen && plans) {
      const matching = plans.find((p: any) =>
        p.name.toLowerCase() === currentPlanName?.toLowerCase()
      );
      if (matching) {
        setForm(f => ({ ...f, plan_id: matching.id, total_amount: (matching as any).price }));
      } else if (regularPlans.length > 0) {
        setForm(f => ({ ...f, plan_id: regularPlans[0].id, total_amount: regularPlans[0].amount }));
      }
      setStep(1);
      setShowSchedule(false);
    }
  }, [isOpen, plans]);

  const handleSubmit = async () => {
    if (!form.plan_id || form.total_amount <= 0 || form.num_installments < 2) return;
    setLoading(true);
    try {
      const result = await installmentService.createInstallmentPlan({
        member_id: memberId,
        plan_id: form.plan_id,
        total_amount: form.total_amount,
        num_installments: form.num_installments,
        frequency_days: form.frequency_days,
        first_payment_method: form.payment_method,
        first_payment_date: form.first_payment_date,
        notes: form.notes || undefined,
      });
      toast.success(`Installment plan created! First payment of ₹${installmentAmount.toLocaleString('en-IN')} recorded.`, { duration: 4000 });
      onSuccess(result);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create installment plan');
    } finally {
      setLoading(false);
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
          className="w-[90vw] max-w-[340px] max-h-[85vh] rounded-2xl overflow-y-auto shadow-2xl bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (step > 1) setStep((step - 1) as 1 | 2 | 3);
                    else onClose();
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <SplitSquareVertical className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-bold text-slate-800">
                      {step === 1 && 'Installment Plan'}
                      {step === 2 && 'Payment Details'}
                      {step === 3 && 'Confirm Plan'}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500">{memberName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-colors ${
                      s === step ? 'bg-orange-500 w-4' : s < step ? 'bg-orange-300 w-2' : 'bg-slate-200 w-2'
                    }`}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1: Select Plan & Installment Config */}
              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Plan Selection */}
                  <label className="text-[10px] font-medium text-slate-500 mb-2 block">Select Plan</label>
                  {plansLoading ? (
                    <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {regularPlans.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {regularPlans.map((plan: any) => (
                            <button
                              key={plan.id}
                              onClick={() => setForm({ ...form, plan_id: plan.id, total_amount: plan.amount })}
                              className={`p-2 rounded-xl border-2 transition-all text-center ${
                                form.plan_id === plan.id
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-slate-200 bg-slate-50/50'
                              }`}
                            >
                              <p className="text-[10px] font-bold text-slate-800 leading-tight line-clamp-2">{plan.label}</p>
                              <p className="text-[9px] text-emerald-600 font-semibold mt-1">₹{plan.amount.toLocaleString('en-IN')}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      {specialPlans.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {specialPlans.map((plan: any) => (
                            <button
                              key={plan.id}
                              onClick={() => setForm({ ...form, plan_id: plan.id, total_amount: plan.amount })}
                              className={`p-2 rounded-xl border-2 transition-all text-center ${
                                form.plan_id === plan.id
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-emerald-200 bg-slate-50/50'
                              }`}
                            >
                              <p className="text-[10px] font-bold text-slate-800 leading-tight line-clamp-2">{plan.label}</p>
                              <p className="text-[9px] text-emerald-600 font-semibold mt-1">₹{plan.amount.toLocaleString('en-IN')}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Number of Installments */}
                  <div className="mb-3">
                    <label className="text-[10px] font-medium text-slate-500 mb-1.5 block">Number of Installments</label>
                    <div className="flex gap-1.5">
                      {[2, 3, 4, 6].map((n) => (
                        <button
                          key={n}
                          onClick={() => setForm({ ...form, num_installments: n })}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                            form.num_installments === n
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frequency */}
                  <div className="mb-4">
                    <label className="text-[10px] font-medium text-slate-500 mb-1.5 block">Installment Frequency</label>
                    <div className="flex gap-2">
                      {[{ value: 15, label: 'Every 15 days' }, { value: 30, label: 'Monthly' }].map((freq) => (
                        <button
                          key={freq.value}
                          onClick={() => setForm({ ...form, frequency_days: freq.value })}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                            form.frequency_days === freq.value
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Per-installment preview */}
                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-200/60 mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-orange-600 font-medium">Total Amount</span>
                      <span className="text-sm font-bold text-orange-700">₹{form.total_amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-orange-600 font-medium">Per Installment</span>
                      <span className="text-lg font-bold text-orange-700">₹{installmentAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[9px] text-orange-500 mt-1">
                      {form.num_installments} payments × ₹{installmentAmount.toLocaleString('en-IN')} every {form.frequency_days} days
                    </p>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!form.plan_id || form.total_amount <= 0}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* STEP 2: Payment Method & Start Date */}
              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="text-[10px] font-medium text-slate-500 mb-2 block">First Payment Method</label>
                    <div className="flex gap-2">
                      {(['cash', 'upi', 'card'] as PaymentMethod[]).map((method) => (
                        <button
                          key={method}
                          onClick={() => setForm({ ...form, payment_method: method })}
                          className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                            form.payment_method === method
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* First Payment Date */}
                  <div className="mb-4">
                    <label className="text-[10px] font-medium text-slate-500 mb-1.5 block">First Payment Date</label>
                    <input
                      type="date"
                      value={form.first_payment_date}
                      onChange={(e) => setForm({ ...form, first_payment_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 [color-scheme:light]"
                    />
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="text-[10px] font-medium text-slate-500 mb-1.5 block">Notes (optional)</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="e.g. Student discount, arranged by trainer"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Schedule Preview Toggle */}
                  <button
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-600">View Payment Schedule</span>
                    </div>
                    {showSchedule ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  <AnimatePresence>
                    {showSchedule && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          {schedule.map((item) => (
                            <div key={item.number} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                  item.number === 1 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {item.number}
                                </span>
                                <span className="text-slate-600">{format(item.due_date, 'MMM d, yyyy')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">₹{item.amount.toLocaleString('en-IN')}</span>
                                {item.number === 1 && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-semibold">TODAY</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setStep(3)}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                    Review & Confirm <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* STEP 3: Confirm */}
              {step === 3 && (
                <motion.div
                  key="s3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 mb-3">Installment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">Plan</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {[...regularPlans, ...specialPlans].find((p: any) => p.id === form.plan_id)?.label || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">Total Amount</span>
                        <span className="text-sm font-bold text-slate-800">₹{form.total_amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">Installments</span>
                        <span className="text-xs font-semibold text-slate-700">{form.num_installments}x ₹{installmentAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">Frequency</span>
                        <span className="text-xs font-semibold text-slate-700">Every {form.frequency_days} days</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">First Payment</span>
                        <span className="text-xs font-semibold capitalize text-slate-700">
                          ₹{installmentAmount.toLocaleString('en-IN')} via {form.payment_method}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-500">Start Date</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {format(new Date(form.first_payment_date + 'T00:00:00'), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200/60">
                    <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700">
                      First payment of ₹{installmentAmount.toLocaleString('en-IN')} will be recorded now. 
                      Membership will be activated immediately. Remaining {form.num_installments - 1} payments can be collected on schedule.
                    </p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Plan...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Create Plan & Pay ₹{installmentAmount.toLocaleString('en-IN')}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
