import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CreditCard, Power, X, Phone, Calendar, Check, Loader2, Lock, Clock } from 'lucide-react';
import { gymService, type CalendarEvent } from '@/lib/gymService';
import { toast } from 'react-hot-toast';
import { format, addMonths } from 'date-fns';
import type { MembershipPlan, PaymentMethod } from '@/types/database';

interface MemberActionModalProps {
  member: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const membershipPlanOptions = [
  { value: 'monthly', label: 'Monthly', duration: 1, amount: 1000 },
  { value: 'quarterly', label: 'Quarterly', duration: 3, amount: 2500 },
  { value: 'half_yearly', label: 'Half Yearly', duration: 6, amount: 5000 },
  { value: 'annual', label: 'Annual', duration: 12, amount: 9000 }
];

export function MemberActionModal({ member, isOpen, onClose, onUpdate }: MemberActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'payment'>('main');
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    plan_type: 'monthly' as MembershipPlan,
    notes: ''
  });

  // Calculate next membership end date based on selected plan
  // BUG FIX: Always extend from the due date (event_date), not today's date
  // This ensures the membership cycle follows the joining date anchor
  const getNextEndDate = () => {
    // Use the actual due date being paid for (event_date), falling back to membership_end_date
    // For overdue members, this ensures next due date follows the original schedule
    // e.g., Member joined Nov 1, due Dec 1, paying on Dec 7 -> next due Jan 1 (not Jan 7)
    const dueDate = member?.event_date || member?.membership_end_date;
    const startDate = dueDate ? new Date(dueDate) : new Date();
    const plan = membershipPlanOptions.find(p => p.value === paymentForm.plan_type);
    return addMonths(startDate, plan?.duration || 1);
  };

  // Initialize payment form when member changes
  React.useEffect(() => {
    if (member) {
      // Map plan_name to membership plan type
      const planType = member.plan_name?.toLowerCase().includes('annual') ? 'annual' :
                      member.plan_name?.toLowerCase().includes('half') ? 'half_yearly' :
                      member.plan_name?.toLowerCase().includes('quarter') ? 'quarterly' : 'monthly';
      const plan = membershipPlanOptions.find(p => p.value === planType);
      setPaymentForm({
        amount: member.amount || plan?.amount || 1000,
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        plan_type: planType as MembershipPlan,
        notes: ''
      });
      setActiveView('main');
    }
  }, [member]);

  const handleClose = () => {
    setActiveView('main');
    setLoading(false);
    onClose();
  };

  const handleWhatsApp = () => {
    if (!member) return;
    const message = `Hi ${member.member_name}, this is a reminder regarding your membership payment of ₹${member.amount || 0}.`;
    window.open(`https://wa.me/91${member.member_phone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('WhatsApp opened');
  };

  const handleCall = () => {
    if (!member) return;
    window.open(`tel:${member.member_phone}`, '_self');
  };

  const handlePayment = async () => {
    if (!member || paymentForm.amount <= 0) return;
    
    setLoading(true);
    try {
      await gymService.addPayment({
        member_id: member.member_id,
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        plan_duration_months: membershipPlanOptions.find(p => p.value === paymentForm.plan_type)?.duration || 1
      });
      toast.success('Payment recorded successfully!');
      onUpdate();
      handleClose();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!member) return;
    setLoading(true);
    try {
      await gymService.updateMemberStatus(member.member_id, 'inactive');
      toast.success('Member deactivated');
      onUpdate();
      handleClose();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getMembershipStatus = () => {
    if (!member) return { text: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    
    if (member.membership_end_date) {
      const endDate = new Date(member.membership_end_date);
      const today = new Date();
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilEnd <= 0) {
        return { text: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100' };
      } else if (daysUntilEnd <= 7) {
        return { text: `${daysUntilEnd} days left`, color: 'text-amber-600', bgColor: 'bg-amber-100' };
      } else {
        return { text: 'Active', color: 'text-emerald-600', bgColor: 'bg-emerald-100' };
      }
    }
    
    return { 
      text: member.status === 'active' ? 'Active' : 'Inactive', 
      color: member.status === 'active' ? 'text-emerald-600' : 'text-red-600', 
      bgColor: member.status === 'active' ? 'bg-emerald-100' : 'bg-red-100' 
    };
  };

  // Payment restriction: Allow payment only within 7 days of due date or when overdue
  const isPaymentAllowed = () => {
    if (!member) return false;
    const dueDate = member.membership_end_date;
    // If no due date, allow payment (new member or data migration)
    if (!dueDate) return true;
    
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Allow if overdue, due today, or within 7 days of due date
    return daysUntilDue <= 7;
  };

  const getDaysUntilPaymentAllowed = () => {
    if (!member) return 0;
    const dueDate = member.membership_end_date;
    if (!dueDate || isPaymentAllowed()) return 0;
    
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysUntilDue - 7);
  };

  if (!member) return null;
  
  const status = getMembershipStatus();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Centered Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div 
              className="w-full max-w-[340px] bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {activeView === 'main' && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {/* Header with gradient */}
                    <div className="relative h-24 bg-gradient-to-r from-violet-500 to-purple-600">
                      <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <div className="flex items-center gap-2.5">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.member_name} className="w-12 h-12 rounded-full object-cover border-2 border-white" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-lg font-bold">
                              {member.member_name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h2 className="text-base font-bold truncate">{member.member_name}</h2>
                            <p className="text-white/80 text-xs">{member.member_phone}</p>
                          </div>
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color} ${status.bgColor}`}>
                            {status.text}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Member details */}
                    <div className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-gray-500 text-[9px] font-medium mb-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            Plan
                          </div>
                          <p className="text-[11px] font-bold text-gray-900 capitalize">
                            {(member.plan_name || 'Monthly').replace('_', ' ')}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-gray-500 text-[9px] font-medium mb-0.5">
                            <CreditCard className="w-2.5 h-2.5" />
                            Amount Due
                          </div>
                          <p className="text-[11px] font-bold text-purple-600">₹{(member.amount || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {member.joining_date && (
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-gray-500 text-[9px] font-medium mb-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              Joined
                            </div>
                            <p className="text-[11px] text-gray-900">
                              {format(new Date(member.joining_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                        {member.membership_end_date && (
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-gray-500 text-[9px] font-medium mb-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              Valid Until
                            </div>
                            <p className="text-[11px] text-gray-900">
                              {format(new Date(member.membership_end_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons - 3 buttons only (no Edit) */}
                    <div className="border-t border-gray-100 p-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={handleWhatsApp}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-[9px] font-medium">WhatsApp</span>
                      </button>

                      <button
                        onClick={handleCall}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="text-[9px] font-medium">Call</span>
                      </button>

                      <button
                        onClick={() => setActiveView('payment')}
                        disabled={!isPaymentAllowed()}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                          isPaymentAllowed()
                            ? 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isPaymentAllowed() ? (
                          <CreditCard className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                        <span className="text-[9px] font-medium">
                          {isPaymentAllowed() ? 'Payment' : `${getDaysUntilPaymentAllowed()}d`}
                        </span>
                      </button>
                    </div>

                    {/* Deactivate button */}
                    <div className="px-3 pb-3">
                      <button
                        onClick={handleDeactivate}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors text-[10px] font-medium"
                      >
                        <Power className="w-3.5 h-3.5" />
                        Deactivate Member
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeView === 'payment' && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* Payment Header */}
                    <div className="p-3 border-b border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-900">Record Payment</h3>
                          <p className="text-[10px] text-gray-500">{member.member_name}</p>
                        </div>
                        <button 
                          onClick={handleClose}
                          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Payment Form */}
                    <div className="p-3 space-y-3">
                      {/* Plan Selection */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Membership Plan</label>
                        <select
                          value={paymentForm.plan_type}
                          onChange={(e) => {
                            const plan = membershipPlanOptions.find(p => p.value === e.target.value);
                            setPaymentForm({
                              ...paymentForm,
                              plan_type: e.target.value as MembershipPlan,
                              amount: plan?.amount || 1000
                            });
                          }}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                        >
                          {membershipPlanOptions.map((plan) => (
                            <option key={plan.value} value={plan.value}>
                              {plan.label} ({plan.duration} {plan.duration === 1 ? 'month' : 'months'}) - ₹{plan.amount}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Next End Date Preview */}
                      <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-purple-600 font-medium">Next Membership End Date</span>
                          <span className="text-[11px] font-bold text-purple-700">
                            {format(getNextEndDate(), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>

                      {/* Amount - Read Only (set by plan) */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Amount (₹)</label>
                        <div className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-gray-100 text-gray-700 font-semibold">
                          ₹{paymentForm.amount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Payment Method</label>
                        <select
                          value={paymentForm.payment_method}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      </div>

                      {/* Payment Date */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Payment Date</label>
                        <input
                          type="date"
                          value={paymentForm.payment_date}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Notes (Optional)</label>
                        <textarea
                          value={paymentForm.notes}
                          onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                          placeholder="Add any notes..."
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 resize-none"
                          rows={2}
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setActiveView('main')}
                          className="flex-1 px-3 py-2 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={handlePayment}
                          disabled={loading || paymentForm.amount <= 0}
                          className="flex-1 px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Record Payment
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
