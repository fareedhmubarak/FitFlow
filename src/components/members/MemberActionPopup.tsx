import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  User,
  CreditCard,
  Power,
  Edit3,
  Calendar,
  Phone,
  Mail,
  Check,
  Loader2,
  Lock,
  Clock
} from 'lucide-react';
import type { Member, Payment, PaymentMethod, MembershipPlan } from '@/types/database';
import { membershipService } from '@/lib/membershipService';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, differenceInDays, isPast, isToday } from 'date-fns';

interface MemberActionPopupProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated?: () => void;
}

export default function MemberActionPopup({ member, isOpen, onClose, onMemberUpdated }: MemberActionPopupProps) {
  const [activeAction, setActiveAction] = useState<'view' | 'notify' | 'status' | 'edit' | 'payment'>('view');
  const [loading, setLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    plan_type: 'monthly' as MembershipPlan
  });
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    membership_plan: 'monthly' as MembershipPlan,
    plan_amount: 0
  });

  // Initialize forms when member changes
  React.useEffect(() => {
    if (member) {
      setEditForm({
        full_name: member.full_name,
        phone: member.phone,
        email: member.email || '',
        membership_plan: member.membership_plan,
        plan_amount: member.plan_amount
      });
      setPaymentForm({
        amount: member.plan_amount,
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
        plan_type: member.membership_plan
      });
    }
  }, [member]);

  const handleClose = () => {
    setActiveAction('view');
    setLoading(false);
    setNotificationMessage('');
    onClose();
  };

  const handleNotify = async () => {
    if (!member || !notificationMessage.trim()) return;

    setLoading(true);
    try {
      const success = await membershipService.sendNotification(
        member.id,
        'custom',
        notificationMessage
      );

      if (success) {
        alert('Notification sent successfully!');
        setNotificationMessage('');
        setActiveAction('view');
      } else {
        alert('Failed to send notification. Please try again.');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!member) return;

    setLoading(true);
    try {
      const newStatus = await membershipService.toggleMemberStatus(member.id, member.status);
      if (onMemberUpdated) onMemberUpdated();
      alert(`Member status changed to ${newStatus}`);
      setActiveAction('view');
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Error updating member status');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!member || paymentForm.amount <= 0) return;

    setLoading(true);
    try {
      await membershipService.recordPayment({
        member_id: member.id,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes,
        plan_type: paymentForm.plan_type
      });

      if (onMemberUpdated) onMemberUpdated();
      alert('Payment recorded successfully!');
      setActiveAction('view');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!member || !editForm.full_name.trim() || !editForm.phone.trim()) return;

    setLoading(true);
    try {
      await membershipService.updateMember(member.id, {
        full_name: editForm.full_name,
        phone: editForm.phone,
        email: editForm.email,
        membership_plan: editForm.membership_plan,
        plan_amount: editForm.plan_amount
      });

      if (onMemberUpdated) onMemberUpdated();
      alert('Member updated successfully!');
      setActiveAction('view');
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Error updating member');
    } finally {
      setLoading(false);
    }
  };

  const getMembershipStatus = () => {
    if (!member) return { text: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-100' };

    if (member.status === 'active' && member.membership_end_date) {
      const endDate = new Date(member.membership_end_date);
      const today = new Date();
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilEnd <= 0) {
        return { text: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100' };
      } else if (daysUntilEnd <= 7) {
        return { text: `${daysUntilEnd} days left`, color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      } else {
        return { text: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
      }
    }

    return { text: member.status === 'active' ? 'Active' : 'Inactive', color: member.status === 'active' ? 'text-green-600' : 'text-red-600', bgColor: member.status === 'active' ? 'bg-green-100' : 'bg-red-100' };
  };

  // Payment restriction: Allow payment only within 7 days of due date or when overdue
  const isPaymentAllowed = () => {
    if (!member) return false;
    const dueDate = member.next_payment_due_date || member.membership_end_date;
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
    const dueDate = member.next_payment_due_date || member.membership_end_date;
    if (!dueDate || isPaymentAllowed()) return 0;
    
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysUntilDue - 7);
  };

  if (!member) return null;

  const status = getMembershipStatus();
  const membershipPlanOptions = [
    { value: 'monthly', label: 'Monthly (1 month)', duration: '1 month' },
    { value: 'quarterly', label: 'Quarterly (3 months)', duration: '3 months' },
    { value: 'half_yearly', label: 'Half Yearly (6 months)', duration: '6 months' },
    { value: 'annual', label: 'Annual (12 months)', duration: '12 months' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[380px] mx-auto [&>button]:hidden">
        <AnimatePresence mode="wait">
          {activeAction === 'view' && (
            <motion.div
              key="view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--theme-popup-bg)' }}
            >
              {/* Header with member info */}
              <div className="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-3">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-white" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-2xl font-bold">
                        {member.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">{member.full_name}</h2>
                      <p className="text-white/80 text-sm">{member.phone}</p>
                      <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}>
                        {status.text}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Member details */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                    <div className="flex items-center gap-2 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                      <Calendar className="w-3 h-3" />
                      Plan
                    </div>
                    <p className="text-sm font-bold capitalize" style={{ color: 'var(--theme-text-primary)' }}>
                      {member.membership_plan.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                    <div className="flex items-center gap-2 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                      <CreditCard className="w-3 h-3" />
                      Amount
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>₹{member.plan_amount.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {member.email && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                    <div className="flex items-center gap-2 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                      <Mail className="w-3 h-3" />
                      Email
                    </div>
                    <p className="text-sm truncate" style={{ color: 'var(--theme-text-primary)' }}>{member.email}</p>
                  </div>
                )}

                {member.membership_end_date && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                    <div className="flex items-center gap-2 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                      <Calendar className="w-3 h-3" />
                      Membership Valid Until
                    </div>
                    <p className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                      {format(new Date(member.membership_end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}

                <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--theme-card-bg)' }}>
                  <div className="flex items-center gap-2 text-xs font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>
                    <Calendar className="w-3 h-3" />
                    Joined On
                  </div>
                  <p className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>
                    {format(new Date(member.joining_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t p-4 grid grid-cols-2 gap-3" style={{ borderColor: 'var(--theme-glass-border)' }}>
                <button
                  onClick={() => setActiveAction('notify')}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  <span className="text-xs font-medium">Notify</span>
                </button>

                <button
                  onClick={() => setActiveAction('status')}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors"
                >
                  <Power className="w-5 h-5" />
                  <span className="text-xs font-medium">
                    {member.status === 'active' ? 'Deactivate' : 'Activate'}
                  </span>
                </button>

                <button
                  onClick={() => setActiveAction('edit')}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  <Edit3 className="w-5 h-5" />
                  <span className="text-xs font-medium">Edit</span>
                </button>

                <button
                  onClick={() => setActiveAction('payment')}
                  disabled={!isPaymentAllowed()}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                    isPaymentAllowed()
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isPaymentAllowed() ? (
                    <CreditCard className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  <span className="text-xs font-medium">
                    {isPaymentAllowed() ? 'Payment' : `${getDaysUntilPaymentAllowed()}d`}
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {activeAction === 'notify' && (
            <motion.div
              key="notify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--theme-popup-bg)' }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--theme-glass-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Send Notification</h3>
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>To {member.full_name}</p>
                  </div>
                  <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-secondary)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text-secondary)' }}>Message</label>
                  <textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                    rows={4}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveAction('view')}
                    className="flex-1 px-4 py-2 border rounded-lg transition-colors"
                    style={{ borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNotify}
                    disabled={loading || !notificationMessage.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeAction === 'status' && (
            <motion.div
              key="status"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--theme-popup-bg)' }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--theme-glass-border)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.status === 'active' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                    <Power className={`w-5 h-5 ${member.status === 'active' ? 'text-yellow-600' : 'text-green-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {member.status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{member.full_name}</p>
                  </div>
                  <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-secondary)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className={`rounded-lg p-4 ${member.status === 'active' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className={`text-sm ${member.status === 'active' ? 'text-red-700' : 'text-green-700'}`}>
                    {member.status === 'active'
                      ? 'This member will be marked as inactive and will not appear in active member lists. They will still be able to reactivate their membership when they return.'
                      : 'This member will be marked as active and will appear in active member lists.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveAction('view')}
                    className="flex-1 px-4 py-2 border rounded-lg transition-colors"
                    style={{ borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStatusToggle}
                    disabled={loading}
                    className={`flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 ${member.status === 'active' ? 'bg-red-600' : 'bg-green-600'}`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                     member.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeAction === 'edit' && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--theme-popup-bg)' }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--theme-glass-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Edit3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Edit Member</h3>
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{member.full_name}</p>
                  </div>
                  <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-secondary)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Membership Plan</label>
                  <select
                    value={editForm.membership_plan}
                    onChange={(e) => {
                      const plan = membershipPlanOptions.find(p => p.value === e.target.value);
                      setEditForm({
                        ...editForm,
                        membership_plan: e.target.value as MembershipPlan,
                        plan_amount: plan?.label.includes('Monthly') ? 1000 :
                                   plan?.label.includes('Quarterly') ? 2500 :
                                   plan?.label.includes('Half') ? 5000 : 7500
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                  >
                    {membershipPlanOptions.map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label} - ₹{plan.label.includes('Monthly') ? 1000 :
                                            plan.label.includes('Quarterly') ? 2500 :
                                            plan.label.includes('Half') ? 5000 : 7500}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Plan Amount</label>
                  <input
                    type="number"
                    value={editForm.plan_amount}
                    onChange={(e) => setEditForm({ ...editForm, plan_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                    min="0"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveAction('view')}
                    className="flex-1 px-4 py-2 border rounded-lg transition-colors"
                    style={{ borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={loading || !editForm.full_name.trim() || !editForm.phone.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeAction === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: 'var(--theme-popup-bg)' }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'var(--theme-glass-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Record Payment</h3>
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{member.full_name}</p>
                  </div>
                  <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-secondary)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Amount</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                    min="0"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Plan Type (extends membership)</label>
                  <select
                    value={paymentForm.plan_type}
                    onChange={(e) => {
                      const plan = membershipPlanOptions.find(p => p.value === e.target.value);
                      setPaymentForm({
                        ...paymentForm,
                        plan_type: e.target.value as MembershipPlan,
                        amount: plan?.label.includes('Monthly') ? 1000 :
                               plan?.label.includes('Quarterly') ? 2500 :
                               plan?.label.includes('Half') ? 5000 : 7500
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                  >
                    {membershipPlanOptions.map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label} - {plan.duration}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text-secondary)' }}>Notes (Optional)</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Add any notes about this payment..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-primary)' }}
                    rows={2}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveAction('view')}
                    className="flex-1 px-4 py-2 border rounded-lg transition-colors"
                    style={{ borderColor: 'var(--theme-glass-border)', color: 'var(--theme-text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={loading || paymentForm.amount <= 0}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Record Payment'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}