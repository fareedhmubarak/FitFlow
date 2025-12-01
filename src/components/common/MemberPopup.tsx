import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CreditCard, Power, X, Phone, Calendar, Check, Loader2, Edit, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, addMonths } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MembershipPlan, PaymentMethod } from '@/types/database';

// Common member type that works with both Dashboard and MembersList
export interface MemberPopupData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo_url?: string | null;
  status: 'active' | 'inactive';
  plan_name?: string;
  plan_amount?: number;
  joining_date?: string;
  membership_end_date?: string;
  amount_due?: number;
}

interface MemberPopupProps {
  member: MemberPopupData | null;
  isOpen: boolean;
  onClose: () => void;
  onPayment?: (memberId: string, amount: number, planType: MembershipPlan, paymentMethod: PaymentMethod, paymentDate: string) => Promise<void>;
  onStatusToggle?: (memberId: string, currentStatus: 'active' | 'inactive') => Promise<void>;
  onEdit?: (memberId: string, data: { full_name: string; phone: string; email?: string }) => Promise<void>;
  onUpdate?: () => void;
  showEditOption?: boolean;
}

const membershipPlanOptions = [
  { value: 'monthly', label: 'Monthly', duration: 1, amount: 1000 },
  { value: 'quarterly', label: 'Quarterly', duration: 3, amount: 2500 },
  { value: 'half_yearly', label: 'Half Yearly', duration: 6, amount: 5000 },
  { value: 'annual', label: 'Annual', duration: 12, amount: 9000 }
];

export function MemberPopup({ 
  member, 
  isOpen, 
  onClose, 
  onPayment,
  onStatusToggle,
  onEdit,
  onUpdate,
  showEditOption = true
}: MemberPopupProps) {
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'payment' | 'edit'>('main');
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    plan_type: 'monthly' as MembershipPlan,
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
  });

  // Calculate next membership end date based on selected plan
  const getNextEndDate = () => {
    const startDate = member?.membership_end_date 
      ? new Date(member.membership_end_date) 
      : new Date();
    const plan = membershipPlanOptions.find(p => p.value === paymentForm.plan_type);
    return addMonths(startDate > new Date() ? startDate : new Date(), plan?.duration || 1);
  };

  // Initialize forms when member changes
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
      });
      
      setEditForm({
        full_name: member.name,
        phone: member.phone,
        email: member.email || '',
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
    const message = `Hi ${member.name}, this is a reminder regarding your membership payment of ₹${member.amount_due || member.plan_amount || 0}.`;
    window.open(`https://wa.me/91${member.phone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('WhatsApp opened');
  };

  const handleCall = () => {
    if (!member) return;
    window.open(`tel:${member.phone}`, '_self');
  };

  const handlePayment = async () => {
    if (!member || !onPayment || paymentForm.amount <= 0) return;
    
    setLoading(true);
    try {
      await onPayment(
        member.id,
        paymentForm.amount,
        paymentForm.plan_type,
        paymentForm.payment_method,
        paymentForm.payment_date
      );
      toast.success('Payment recorded successfully!');
      onUpdate?.();
      handleClose();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!member || !onStatusToggle) return;
    setLoading(true);
    try {
      await onStatusToggle(member.id, member.status);
      toast.success(member.status === 'active' ? 'Member deactivated' : 'Member activated');
      onUpdate?.();
      handleClose();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!member || !onEdit) return;
    if (!editForm.full_name.trim() || !editForm.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    
    setLoading(true);
    try {
      await onEdit(member.id, editForm);
      toast.success('Member updated successfully!');
      onUpdate?.();
      handleClose();
    } catch {
      toast.error('Failed to update member');
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
              className="w-full max-w-[340px] bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                {/* Main View */}
                {activeView === 'main' && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {/* Header with gradient */}
                    <div className="relative h-24 bg-gradient-to-r from-emerald-500 to-teal-500">
                      <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className="bg-white/30 backdrop-blur-md text-white text-lg font-bold">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-base font-bold truncate">{member.name}</h2>
                            <p className="text-white/80 text-xs">{member.phone}</p>
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
                            Amount
                          </div>
                          <p className="text-[11px] font-bold text-emerald-600">₹{(member.amount_due || member.plan_amount || 0).toLocaleString('en-IN')}</p>
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

                    {/* Action buttons */}
                    <div className="border-t border-gray-100 p-3 grid grid-cols-4 gap-2">
                      <button
                        onClick={handleWhatsApp}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-[8px] font-medium">WhatsApp</span>
                      </button>

                      <button
                        onClick={handleCall}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="text-[8px] font-medium">Call</span>
                      </button>

                      {showEditOption && onEdit && (
                        <button
                          onClick={() => setActiveView('edit')}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-[8px] font-medium">Edit</span>
                        </button>
                      )}

                      <button
                        onClick={() => setActiveView('payment')}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[8px] font-medium">Payment</span>
                      </button>
                    </div>

                    {/* Status toggle button */}
                    {onStatusToggle && (
                      <div className="px-3 pb-3">
                        <button
                          onClick={handleStatusToggle}
                          disabled={loading}
                          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors text-[10px] font-medium ${
                            member.status === 'active'
                              ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                              : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {member.status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Payment View */}
                {activeView === 'payment' && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* Payment Header */}
                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-500">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 text-white">
                          <h3 className="text-sm font-bold">Record Payment</h3>
                          <p className="text-[10px] text-white/80">{member.name}</p>
                        </div>
                        <button 
                          onClick={handleClose}
                          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
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
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
                        >
                          {membershipPlanOptions.map((plan) => (
                            <option key={plan.value} value={plan.value}>
                              {plan.label} ({plan.duration} {plan.duration === 1 ? 'month' : 'months'}) - ₹{plan.amount}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Next End Date Preview */}
                      <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-600 font-medium">Next Membership End Date</span>
                          <span className="text-[11px] font-bold text-emerald-700">
                            {format(getNextEndDate(), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
                          min="0"
                          step="100"
                        />
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Payment Method</label>
                        <select
                          value={paymentForm.payment_method}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
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
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
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
                          className="flex-1 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
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

                {/* Edit View */}
                {activeView === 'edit' && (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    {/* Edit Header */}
                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-amber-500 to-orange-500">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <Edit className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 text-white">
                          <h3 className="text-sm font-bold">Edit Member</h3>
                          <p className="text-[10px] text-white/80">{member.name}</p>
                        </div>
                        <button 
                          onClick={handleClose}
                          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Edit Form */}
                    <div className="p-3 space-y-3">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })}
                          maxLength={10}
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Email (Optional)</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="email@example.com"
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-gray-50"
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
                          onClick={handleEditSave}
                          disabled={loading}
                          className="flex-1 px-3 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Save Changes
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

export default MemberPopup;
