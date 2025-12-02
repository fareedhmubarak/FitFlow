import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CreditCard, Power, X, Phone, Calendar, Check, Loader2, AlertTriangle, Edit, History, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, addMonths } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { membershipService } from '@/lib/membershipService';
import { ProgressHistoryModal } from '@/components/members/ProgressHistoryModal';
import { AddProgressModal } from '@/components/members/AddProgressModal';
import type { MembershipPlan, PaymentMethod } from '@/types/database';

// Generic member type that works with both Dashboard CalendarEvent and MembersList Member
export interface UnifiedMemberData {
  id: string;
  name: string;
  phone: string;
  photo_url?: string | null;
  status: 'active' | 'inactive';
  plan_name?: string;
  plan_amount?: number;
  amount_due?: number;
  joining_date?: string;
  membership_end_date?: string;
  next_due_date?: string; // Add next_due_date for payment restriction
}

interface UnifiedMemberPopupProps {
  member: UnifiedMemberData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  gymName?: string;
  showEditButton?: boolean;
  onEdit?: (member: UnifiedMemberData) => void;
}

const membershipPlanOptions = [
  { value: 'monthly', label: 'Monthly', duration: 1, amount: 1000 },
  { value: 'quarterly', label: 'Quarterly', duration: 3, amount: 2500 },
  { value: 'half_yearly', label: 'Half Yearly', duration: 6, amount: 5000 },
  { value: 'annual', label: 'Annual', duration: 12, amount: 9000 }
];

export function UnifiedMemberPopup({ member, isOpen, onClose, onUpdate, gymName, showEditButton = false, onEdit }: UnifiedMemberPopupProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'payment' | 'confirmDeactivate'>('main');
  const [showProgressHistory, setShowProgressHistory] = useState(false);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [progressRefreshTrigger, setProgressRefreshTrigger] = useState(0);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    plan_type: 'monthly' as MembershipPlan,
    notes: ''
  });

  // Check if payment is allowed (only when due date is near or passed)
  // Allow payment 7 days before due date or anytime after
  const isPaymentAllowed = () => {
    if (!member) return false;
    
    // If no membership end date/next due date, allow payment (new member or data migration)
    const dueDate = member.next_due_date || member.membership_end_date;
    if (!dueDate) return true;
    
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Allow payment if within 7 days of due date or past due
    return daysUntilDue <= 7;
  };

  // Get days until payment is allowed
  const getDaysUntilPaymentAllowed = () => {
    if (!member) return 0;
    
    const dueDate = member.next_due_date || member.membership_end_date;
    if (!dueDate) return 0;
    
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Payment allowed 7 days before due, so subtract 7
    return Math.max(0, daysUntilDue - 7);
  };

  // Calculate next membership end date based on selected plan
  const getNextEndDate = () => {
    const startDate = member?.membership_end_date 
      ? new Date(member.membership_end_date) 
      : new Date();
    const plan = membershipPlanOptions.find(p => p.value === paymentForm.plan_type);
    return addMonths(startDate > new Date() ? startDate : new Date(), plan?.duration || 1);
  };

  // Initialize payment form when member changes
  useEffect(() => {
    if (member) {
      const planType = member.plan_name?.toLowerCase().includes('annual') ? 'annual' :
                      member.plan_name?.toLowerCase().includes('half') ? 'half_yearly' :
                      member.plan_name?.toLowerCase().includes('quarter') ? 'quarterly' : 'monthly';
      const plan = membershipPlanOptions.find(p => p.value === planType);
      setPaymentForm({
        amount: member.amount_due || member.plan_amount || plan?.amount || 1000,
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
    const message = `Hi ${member.name}, this is a reminder from ${gymName || 'the gym'} regarding your membership payment.`;
    window.open(`https://wa.me/91${member.phone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('WhatsApp opened');
  };

  const handleCall = () => {
    if (!member) return;
    window.open(`tel:${member.phone}`, '_self');
  };

  const handlePaymentHistory = () => {
    if (!member) return;
    // Navigate to payment records page with member filter
    handleClose();
    navigate(`/payments/records?member=${member.id}&name=${encodeURIComponent(member.name)}`);
  };

  const handlePayment = async () => {
    if (!member || paymentForm.amount <= 0) return;
    
    setLoading(true);
    try {
      await membershipService.recordPayment({
        member_id: member.id,
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        plan_type: paymentForm.plan_type,
        notes: paymentForm.notes
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

  const handleToggleStatus = async () => {
    if (!member) return;
    setLoading(true);
    try {
      const newStatus = member.status === 'active' ? 'inactive' : 'active';
      await membershipService.toggleMemberStatus(member.id, member.status);
      toast.success(`Member ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
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
        return { text: `${daysUntilEnd}d left`, color: 'text-amber-600', bgColor: 'bg-amber-100' };
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Centered Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div 
              className="w-full max-w-[340px] rounded-3xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--theme-popup-bg, #ffffff)' }}
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
                    {/* Header with emerald gradient */}
                    <div className="relative h-28 bg-gradient-to-br from-emerald-500 to-teal-600">
                      <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-14 h-14 border-2 border-white shadow-lg">
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className="bg-white/30 backdrop-blur-md text-white text-xl font-bold">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold truncate">{member.name}</h2>
                            <p className="text-white/80 text-sm">{member.phone}</p>
                          </div>
                          <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.color} ${status.bgColor}`}>
                            {status.text}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Member details */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--theme-card-bg, #f8fafc)' }}>
                          <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                            <CreditCard className="w-3 h-3" />
                            Plan
                          </div>
                          <p className="text-sm font-bold capitalize" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                            {(member.plan_name || 'Monthly').replace('_', ' ')}
                          </p>
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--theme-card-bg, #f8fafc)' }}>
                          <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                            <CreditCard className="w-3 h-3" />
                            Amount
                          </div>
                          <p className="text-sm font-bold text-emerald-600">
                            ₹{(member.amount_due || member.plan_amount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {(member.joining_date || member.membership_end_date) && (
                        <div className="grid grid-cols-2 gap-3">
                          {member.joining_date && (
                            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--theme-card-bg, #f8fafc)' }}>
                              <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                                <Calendar className="w-3 h-3" />
                                Joined
                              </div>
                              <p className="text-sm" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                                {format(new Date(member.joining_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )}
                          {member.membership_end_date && (
                            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--theme-card-bg, #f8fafc)' }}>
                              <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                                <Calendar className="w-3 h-3" />
                                Valid Until
                              </div>
                              <p className="text-sm" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                                {format(new Date(member.membership_end_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons - 4 or 5 buttons grid depending on showEditButton */}
                    <div className={`px-4 pb-4 grid gap-2 ${showEditButton ? 'grid-cols-5' : 'grid-cols-4'}`}>
                      <button
                        onClick={handleWhatsApp}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">WhatsApp</span>
                      </button>

                      <button
                        onClick={handleCall}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Phone className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">Call</span>
                      </button>

                      {showEditButton && onEdit && (
                        <button
                          onClick={() => {
                            onEdit(member);
                            handleClose();
                          }}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                        >
                          <Edit className="w-5 h-5" />
                          <span className="text-[10px] font-semibold">Edit</span>
                        </button>
                      )}

                      <button
                        onClick={() => isPaymentAllowed() && setActiveView('payment')}
                        disabled={!isPaymentAllowed()}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors relative ${
                          isPaymentAllowed()
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title={!isPaymentAllowed() ? `Payment available in ${getDaysUntilPaymentAllowed()} days` : 'Record payment'}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">Payment</span>
                        {!isPaymentAllowed() && getDaysUntilPaymentAllowed() > 0 && (
                          <span className="absolute -top-1 -right-1 bg-slate-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            {getDaysUntilPaymentAllowed()}d
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setActiveView('confirmDeactivate')}
                        disabled={loading}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                          member.status === 'active' 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        <Power className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">
                          {member.status === 'active' ? 'Deactivate' : 'Activate'}
                        </span>
                      </button>
                    </div>

                    {/* Payment History Button - Full Width */}
                    <div className="px-4 pb-2">
                      <button
                        onClick={handlePaymentHistory}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <History className="w-4 h-4" />
                        <span className="text-sm font-semibold">View Payment History</span>
                      </button>
                    </div>

                    {/* Progress Tracking Button */}
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => setShowProgressHistory(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-colors shadow-lg shadow-purple-500/30"
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-semibold">Track Progress</span>
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
                    className="p-4"
                  >
                    {/* Back button and title */}
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={() => setActiveView('main')}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ backgroundColor: 'var(--theme-card-bg, #f1f5f9)' }}
                      >
                        <X className="w-4 h-4" style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
                      </button>
                      <div>
                        <h3 className="font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>Record Payment</h3>
                        <p className="text-xs" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{member.name}</p>
                      </div>
                    </div>

                    {/* Plan selection */}
                    <div className="mb-4">
                      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Select Plan</label>
                      <div className="grid grid-cols-2 gap-2">
                        {membershipPlanOptions.map((plan) => (
                          <button
                            key={plan.value}
                            onClick={() => setPaymentForm({ 
                              ...paymentForm, 
                              plan_type: plan.value as MembershipPlan,
                              amount: plan.amount 
                            })}
                            className={`p-3 rounded-xl border-2 transition-all text-left ${
                              paymentForm.plan_type === plan.value
                                ? 'border-emerald-500 bg-emerald-50'
                                : ''
                            }`}
                            style={paymentForm.plan_type !== plan.value ? { 
                              borderColor: 'var(--theme-glass-border, #e2e8f0)',
                              backgroundColor: 'var(--theme-card-bg, transparent)'
                            } : undefined}
                          >
                            <p className="text-sm font-bold" style={{ color: paymentForm.plan_type === plan.value ? '#1e293b' : 'var(--theme-text-primary, #1e293b)' }}>{plan.label}</p>
                            <p className="text-xs text-emerald-600 font-semibold">₹{plan.amount.toLocaleString('en-IN')}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Amount (₹)</label>
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border-2 focus:border-emerald-500 focus:outline-none text-lg font-bold"
                        style={{ 
                          backgroundColor: 'var(--theme-input-bg, #ffffff)',
                          borderColor: 'var(--theme-input-border, #e2e8f0)',
                          color: 'var(--theme-text-primary, #1e293b)'
                        }}
                      />
                    </div>

                    {/* Payment method */}
                    <div className="mb-4">
                      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Payment Method</label>
                      <div className="flex gap-2">
                        {(['cash', 'upi', 'card'] as PaymentMethod[]).map((method) => (
                          <button
                            key={method}
                            onClick={() => setPaymentForm({ ...paymentForm, payment_method: method })}
                            className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                              paymentForm.payment_method === method
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : ''
                            }`}
                            style={paymentForm.payment_method !== method ? { 
                              borderColor: 'var(--theme-glass-border, #e2e8f0)',
                              color: 'var(--theme-text-secondary, #64748b)'
                            } : undefined}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* New end date preview */}
                    <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs text-emerald-600 font-medium">New membership valid until:</p>
                      <p className="text-lg font-bold text-emerald-700">
                        {format(getNextEndDate(), 'MMMM d, yyyy')}
                      </p>
                    </div>

                    {/* Submit button */}
                    <button
                      onClick={handlePayment}
                      disabled={loading || paymentForm.amount <= 0}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Record Payment
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* Confirm Deactivate View */}
                {activeView === 'confirmDeactivate' && (
                  <motion.div
                    key="confirmDeactivate"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6"
                  >
                    {/* Warning Icon */}
                    <div className="flex justify-center mb-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        member.status === 'active' 
                          ? 'bg-red-100' 
                          : 'bg-emerald-100'
                      }`}>
                        <AlertTriangle className={`w-8 h-8 ${
                          member.status === 'active' 
                            ? 'text-red-600' 
                            : 'text-emerald-600'
                        }`} />
                      </div>
                    </div>

                    {/* Title & Message */}
                    <h3 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                      {member.status === 'active' ? 'Deactivate Member?' : 'Activate Member?'}
                    </h3>
                    <p className="text-sm text-center mb-6" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                      {member.status === 'active' 
                        ? `Are you sure you want to deactivate ${member.name}? They will no longer have access to the gym.`
                        : `Are you sure you want to activate ${member.name}? They will regain access to the gym.`
                      }
                    </p>

                    {/* Member Info */}
                    <div className="flex items-center gap-3 p-3 rounded-xl mb-6" style={{ backgroundColor: 'var(--theme-card-bg, #f8fafc)' }}>
                      <Avatar className="w-10 h-10 border-2 border-white shadow">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>{member.name}</p>
                        <p className="text-xs" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{member.phone}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActiveView('main')}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
                        style={{ 
                          backgroundColor: 'var(--theme-card-bg, #f1f5f9)',
                          color: 'var(--theme-text-secondary, #475569)'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleToggleStatus}
                        disabled={loading}
                        className={`flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 ${
                          member.status === 'active'
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 shadow-lg shadow-red-500/30'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30'
                        } disabled:opacity-50`}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Power className="w-4 h-4" />
                            {member.status === 'active' ? 'Deactivate' : 'Activate'}
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}

      {/* Progress History Modal */}
      {member && (
        <ProgressHistoryModal
          isOpen={showProgressHistory}
          onClose={() => setShowProgressHistory(false)}
          memberId={member.id}
          memberName={member.name}
          memberPhone={member.phone}
          onAddProgress={() => {
            setShowProgressHistory(false);
            setShowAddProgress(true);
          }}
          refreshTrigger={progressRefreshTrigger}
        />
      )}

      {/* Add Progress Modal */}
      {member && (
        <AddProgressModal
          isOpen={showAddProgress}
          onClose={() => setShowAddProgress(false)}
          memberId={member.id}
          memberName={member.name}
          onSuccess={() => {
            setShowAddProgress(false);
            setProgressRefreshTrigger(prev => prev + 1); // Trigger refresh
            setShowProgressHistory(true);
          }}
        />
      )}
    </AnimatePresence>
  );
}

export default UnifiedMemberPopup;
