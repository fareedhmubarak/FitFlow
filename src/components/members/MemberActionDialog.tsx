import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  UserX, 
  UserCheck, 
  Edit, 
  CreditCard, 
  Phone, 
  X,
  History,
  Clock,
  Zap,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { membershipService } from '@/lib/membershipService';
import { getConsistentPersonPhoto } from '@/lib/memberPhoto';
import toast from 'react-hot-toast';
import PaymentRecordDialog from './PaymentRecordDialog';
import EditMemberDialog from './EditMemberDialog';

interface MemberData {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  photo_url?: string | null;
  membership_plan: string;
  plan_amount: number;
  status: 'active' | 'inactive';
  joining_date: string;
  membership_end_date?: string | null;
  next_payment_due_date?: string | null;
}

interface MemberActionDialogProps {
  member: MemberData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MemberActionDialog({ member, open, onOpenChange }: MemberActionDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!member) return null;

  // Calculate due status
  const nextDueDate = member.next_payment_due_date || member.membership_end_date;
  const dueDate = nextDueDate ? new Date(nextDueDate) : null;
  const today = new Date();
  
  const isDueToday = dueDate ? isToday(dueDate) : false;
  const isOverdue = dueDate ? isPast(dueDate) && !isToday(dueDate) : false;
  const isPaidUp = dueDate ? !isPast(dueDate) && !isToday(dueDate) : false;
  const daysOverdue = dueDate && isOverdue ? differenceInDays(today, dueDate) : 0;
  const daysUntilDue = dueDate && isPaidUp ? differenceInDays(dueDate, today) : 0;

  // Payment restriction: Allow payment only within 7 days of due date or when overdue
  const isPaymentAllowed = () => {
    // If no due date, allow payment (new member or data migration)
    if (!dueDate) return true;
    // Allow if overdue, due today, or within 7 days of due date
    return isOverdue || isDueToday || daysUntilDue <= 7;
  };
  
  const getDaysUntilPaymentAllowed = () => {
    if (!dueDate || isPaymentAllowed()) return 0;
    return daysUntilDue - 7;
  };

  const isActive = member.status === 'active';
  const photoUrl = member.photo_url || getConsistentPersonPhoto(member.id, member.gender);

  // Get plan short name
  const getPlanShortName = (plan: string) => {
    const planLower = plan.toLowerCase();
    if (planLower.includes('month') && !planLower.includes('3') && !planLower.includes('6') && !planLower.includes('12')) return '1M';
    if (planLower.includes('quarter') || planLower.includes('3')) return '3M';
    if (planLower.includes('half') || planLower.includes('6')) return '6M';
    if (planLower.includes('annual') || planLower.includes('year') || planLower.includes('12')) return '1Y';
    return plan.substring(0, 2).toUpperCase();
  };

  // WhatsApp Notification
  const handleWhatsAppNotify = () => {
    const message = encodeURIComponent(
      `Hi ${member.full_name},\n\nThis is a reminder from the gym regarding your membership.\n\n` +
      `${isOverdue 
        ? `Your payment was due on ${format(dueDate!, 'dd MMM yyyy')} (${daysOverdue} days overdue).` 
        : isDueToday 
          ? `Your payment is due today.`
          : `Your next payment is due on ${format(dueDate!, 'dd MMM yyyy')}.`
      }\n\n` +
      `Amount: ₹${member.plan_amount.toLocaleString('en-IN')}\n\n` +
      `Please visit the gym to renew your membership.\n\nThank you!`
    );
    const phone = member.phone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      await membershipService.toggleMemberStatus(member.id, member.status);
      toast.success(`Member ${member.status === 'active' ? 'deactivated' : 'activated'}`);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['due-payments'] });
      onOpenChange(false);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsToggling(false);
    }
  };

  // Edit Member
  const handleEdit = () => {
    setShowEditDialog(true);
  };

  // Make Payment
  const handlePayment = () => {
    setShowPaymentDialog(true);
  };

  // View History
  const handleHistory = () => {
    onOpenChange(false);
    navigate(`/payments/records?member=${member.id}`);
  };

  // Call member
  const handleCall = () => {
    window.open(`tel:${member.phone}`, '_self');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none w-[90vw] max-w-[340px] mx-auto [&>button]:hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white/95 backdrop-blur-2xl rounded-[28px] overflow-hidden shadow-2xl border border-white/60"
          >
            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>

            {/* Compact Header */}
            <div className="relative pt-4 pb-3 px-4">
              <div className="flex items-center gap-3">
                {/* Avatar with status ring */}
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-white shadow-md">
                    <AvatarImage src={photoUrl} alt={member.full_name} />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-emerald-400 to-cyan-400 text-white font-bold">
                      {member.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status indicator */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`} />
                </div>

                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-slate-800 truncate">{member.full_name}</h2>
                  <button 
                    onClick={handleCall}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    {member.phone}
                  </button>
                </div>

                {/* Plan Badge */}
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-full">
                    {getPlanShortName(member.membership_plan)}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    ₹{member.plan_amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Bar - Compact */}
            <div className={`mx-4 mb-3 rounded-xl p-2.5 flex items-center justify-between ${
              isOverdue 
                ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-100' 
                : isDueToday 
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100'
                  : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isOverdue 
                    ? 'bg-red-100' 
                    : isDueToday 
                      ? 'bg-amber-100'
                      : 'bg-emerald-100'
                }`}>
                  <Clock className={`w-4 h-4 ${
                    isOverdue 
                      ? 'text-red-600' 
                      : isDueToday 
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`} />
                </div>
                <div>
                  <p className={`text-[10px] font-medium ${
                    isOverdue ? 'text-red-500' : isDueToday ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {isOverdue ? `OVERDUE ${daysOverdue}D` : isDueToday ? 'DUE TODAY' : isPaidUp ? `PAID • ${daysUntilDue}D LEFT` : 'NEXT DUE'}
                  </p>
                  <p className={`text-xs font-semibold ${
                    isOverdue ? 'text-red-700' : isDueToday ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {dueDate ? format(dueDate, 'dd MMM yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Quick Pay Button - Only show when payment is allowed */}
              {isPaymentAllowed() && (isOverdue || isDueToday) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePayment}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1 ${
                    isOverdue 
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-md shadow-red-500/30' 
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-amber-500/30'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  PAY
                </motion.button>
              )}
            </div>

            {/* Action Grid - 2x2 Compact */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-4 gap-2">
                {/* WhatsApp */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWhatsAppNotify}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 hover:shadow-md transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-sm">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[9px] font-semibold text-green-700">Message</span>
                </motion.button>

                {/* Edit */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEdit}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-md transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                    <Edit className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[9px] font-semibold text-blue-700">Edit</span>
                </motion.button>

                {/* History */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleHistory}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 hover:shadow-md transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-sm">
                    <History className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[9px] font-semibold text-purple-700">History</span>
                </motion.button>

                {/* Toggle Status */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirmDeactivate(true)}
                  disabled={isToggling}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border hover:shadow-md transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-100'
                      : 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-500 to-red-500'
                      : 'bg-gradient-to-br from-teal-500 to-cyan-500'
                  }`}>
                    {isToggling ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isActive ? (
                      <UserX className="w-4 h-4 text-white" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold ${isActive ? 'text-orange-700' : 'text-teal-700'}`}>
                    {isActive ? 'Pause' : 'Resume'}
                  </span>
                </motion.button>
              </div>

              {/* Full Width Payment Button - Only enabled when payment is allowed */}
              {isPaidUp && (
                isPaymentAllowed() ? (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handlePayment}
                    className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 border border-emerald-400 flex items-center justify-center gap-2 text-white text-xs font-medium shadow-md"
                  >
                    <CreditCard className="w-4 h-4" />
                    Renew Now
                  </motion.button>
                ) : (
                  <div className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
                    <Clock className="w-4 h-4" />
                    Payment available in {getDaysUntilPaymentAllowed()} days
                  </div>
                )
              )}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Payment Recording Dialog */}
      <PaymentRecordDialog
        member={member}
        open={showPaymentDialog}
        onOpenChange={(open: boolean) => {
          setShowPaymentDialog(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['members'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['due-payments'] });
            queryClient.invalidateQueries({ queryKey: ['payment-records'] });
            onOpenChange(false);
          }
        }}
      />

      {/* Edit Member Dialog */}
      <EditMemberDialog
        member={member}
        open={showEditDialog}
        onOpenChange={(open: boolean) => {
          setShowEditDialog(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['members'] });
          }
        }}
      />

      {/* Confirm Deactivate Dialog */}
      <AnimatePresence>
        {showConfirmDeactivate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmDeactivate(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            >
              <div 
                className="w-full max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Warning Icon */}
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-red-100' : 'bg-emerald-100'
                  }`}>
                    <AlertTriangle className={`w-8 h-8 ${
                      isActive ? 'text-red-600' : 'text-emerald-600'
                    }`} />
                  </div>
                </div>

                {/* Title & Message */}
                <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
                  {isActive ? 'Deactivate Member?' : 'Activate Member?'}
                </h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                  {isActive 
                    ? `Are you sure you want to deactivate ${member.full_name}? They will no longer have access to the gym.`
                    : `Are you sure you want to activate ${member.full_name}? They will regain access to the gym.`
                  }
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmDeactivate(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowConfirmDeactivate(false);
                      await handleToggleStatus();
                    }}
                    disabled={isToggling}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 shadow-lg shadow-red-500/30'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30'
                    } disabled:opacity-50`}
                  >
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        {isActive ? 'Deactivate' : 'Activate'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
