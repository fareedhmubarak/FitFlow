import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CreditCard, Power, X, Phone, Calendar, Check, Loader2, AlertTriangle, Edit, History, TrendingUp, Clock, RefreshCw, ArrowRight, SplitSquareVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, addMonths } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { membershipService } from '@/lib/membershipService';
import { ProgressHistoryModal } from '@/components/members/ProgressHistoryModal';
import { AddProgressModal } from '@/components/members/AddProgressModal';
import ImagePreviewModal from '@/components/common/ImagePreviewModal';
import MarkInactiveDialog from '@/components/members/MarkInactiveDialog';
import RejoinMemberModal from '@/components/members/RejoinMemberModal';
import MembershipHistoryModal from '@/components/members/MembershipHistoryModal';
import InstallmentPlanModal from '@/components/members/InstallmentPlanModal';
import InstallmentTrackerModal from '@/components/members/InstallmentTrackerModal';
import { useMembershipPlans } from '@/hooks/useMembershipPlans';
import type { MembershipPlan, PaymentMethod } from '@/types/database';
import { auditLogger } from '@/lib/auditLogger';

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
  deactivated_at?: string; // Date when member was marked inactive
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

// Plans will be loaded dynamically from database

export function UnifiedMemberPopup({ member, isOpen, onClose, onUpdate, gymName, showEditButton = false, onEdit }: UnifiedMemberPopupProps) {
  const navigate = useNavigate();
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'payment' | 'confirmDeactivate'>('main');
  const [showProgressHistory, setShowProgressHistory] = useState(false);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showInactiveDialog, setShowInactiveDialog] = useState(false);
  const [showRejoinModal, setShowRejoinModal] = useState(false);
  const [isRejoinLoading, setIsRejoinLoading] = useState(false);
  const [showMembershipHistory, setShowMembershipHistory] = useState(false);
  const [showInstallmentPlan, setShowInstallmentPlan] = useState(false);
  const [showInstallmentTracker, setShowInstallmentTracker] = useState(false);
  const [progressRefreshTrigger, setProgressRefreshTrigger] = useState(0);
  const [shiftBaseDate, setShiftBaseDate] = useState(false);
  const [shiftToDate, setShiftToDate] = useState(new Date().toISOString().split('T')[0]); // Custom date for shift
  const [showShiftConfirmation, setShowShiftConfirmation] = useState(false);
  const [paymentStep, setPaymentStep] = useState<1 | 2 | 3>(1); // Multi-step wizard: 1=Plan, 2=Method+Shift, 3=Confirm
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    plan_id: undefined as string | undefined,
    plan_type: 'monthly' as MembershipPlan,
    notes: ''
  });

  // Helper to derive legacy membership_plan enum from duration
  const getMembershipPlanType = (months: number): 'monthly' | 'quarterly' | 'half_yearly' | 'annual' => {
    if (months <= 1) return 'monthly';
    if (months <= 3) return 'quarterly';
    if (months <= 6) return 'half_yearly';
    return 'annual';
  };

  // Separate plans into regular and special
  const { regularPlans, specialPlans } = useMemo(() => {
    if (!plans) return { regularPlans: [], specialPlans: [] };
    
    const allPlans = plans
      .filter(plan => plan.is_active)
      .map(plan => {
        const baseMonths = (plan as any).base_duration_months || (plan as any).duration_months || 1;
        const bonusMonths = (plan as any).bonus_duration_months || 0;
        const totalMonths = baseMonths + bonusMonths;
        
        let label = plan.name;
        if (bonusMonths > 0) {
          label = `${plan.name} (${baseMonths}+${bonusMonths})`;
        }
        
        return {
          id: plan.id,
          label: label,
          amount: plan.price,
          totalMonths: totalMonths,
          bonusMonths: bonusMonths,
          membershipPlanEnum: getMembershipPlanType(totalMonths), // Legacy enum for database
        };
      })
      .sort((a, b) => a.amount - b.amount);
    
    const regular = allPlans.filter(p => p.bonusMonths === 0);
    const special = allPlans.filter(p => p.bonusMonths > 0);
    
    return { regularPlans: regular, specialPlans: special };
  }, [plans]);

  // Check if payment is OVERDUE (past due date) - for showing shift base date option
  const isPaymentOverdue = () => {
    if (!member) return false;
    const dueDate = member.next_due_date || member.membership_end_date;
    if (!dueDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    
    return today > dueDateObj;
  };

  // Get days overdue for display
  const getDaysOverdue = () => {
    if (!member) return 0;
    const dueDate = member.next_due_date || member.membership_end_date;
    if (!dueDate) return 0;
    
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    const daysOverdue = Math.ceil((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysOverdue);
  };

  // Get current base day from joining date
  const getCurrentBaseDay = () => {
    if (!member?.joining_date) return 1;
    return new Date(member.joining_date).getDate();
  };

  // Get new base day (from selected shift date, not just today)
  const getNewBaseDay = () => {
    return new Date(shiftToDate).getDate();
  };

  // Calculate next due date based on whether we're shifting or keeping current base
  const getNextDueDateWithShift = (shift: boolean) => {
    const plan = plans?.find(p => p.id === paymentForm.plan_id);
    const totalMonths = plan ? ((plan as any).base_duration_months || (plan as any).duration_months || 1) + ((plan as any).bonus_duration_months || 0) : 1;
    
    // START DATE LOGIC:
    // If shifting, start from the selected shift date (today or custom)
    // If NOT shifting (normal renewal), start from the NEXT DUE DATE (to ensure continuity/back-filling)
    // If no next due date exists, fallback to today.
    let startDate: Date;
    let baseDay: number;

    if (shift) {
        startDate = new Date(shiftToDate);
        baseDay = startDate.getDate();
    } else {
        // Use next_due_date if available (preferred), else valid_until, else today
        const existingDueDate = member?.next_due_date || member?.membership_end_date;
        startDate = existingDueDate ? new Date(existingDueDate) : new Date();
        baseDay = getCurrentBaseDay();
    }
    
    // Calculate next month from START DATE
    const nextDate = new Date(startDate);
    nextDate.setMonth(nextDate.getMonth() + totalMonths);
    
    // Ensure day matches base day (e.g. 31st -> 30th/28th if needed)
    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    nextDate.setDate(Math.min(baseDay, lastDayOfMonth));
    
    return nextDate;
  };

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

  // Get actual days until due date (for display)
  const getDaysUntilDue = () => {
    if (!member) return 0;
    
    const dueDate = member.next_due_date || member.membership_end_date;
    if (!dueDate) return 0;
    
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    return Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Check if Mark Inactive is allowed (only for expired members)
  // Active members with valid memberships should not be marked inactive
  const isMarkInactiveAllowed = () => {
    if (!member) return false;
    if (member.status === 'inactive') return false; // Already inactive
    
    const membershipEndDate = member.membership_end_date;
    if (!membershipEndDate) return true; // No end date = can mark inactive
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(membershipEndDate);
    endDate.setHours(0, 0, 0, 0);
    
    // Only allow if membership has expired (end date is in the past or today)
    return endDate <= today;
  };

  // Get days until membership expires (for showing in tooltip)
  const getDaysUntilExpiry = () => {
    if (!member?.membership_end_date) return 0;
    
    const today = new Date();
    const endDate = new Date(member.membership_end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysUntilExpiry);
  };

  // Calculate next membership end date based on selected plan
  // BUG FIX: Always extend from the due date, not today's date
  // This ensures the membership cycle follows the joining date anchor
  const getNextEndDate = () => {
    // Use the actual due date (next_due_date or membership_end_date)
    // For overdue members, this ensures next due date follows the original schedule
    // e.g., Member joined Nov 1, due Dec 1, paying on Dec 7 -> next due Jan 1 (not Jan 7)
    const dueDate = member?.next_due_date || member?.membership_end_date;
    const startDate = dueDate ? new Date(dueDate) : new Date();
    const plan = plans?.find(p => p.id === paymentForm.plan_id);
    const totalMonths = plan ? ((plan as any).base_duration_months || (plan as any).duration_months || 1) + ((plan as any).bonus_duration_months || 0) : 1;
    return addMonths(startDate, totalMonths);
  };

  // Initialize payment form when member changes
  useEffect(() => {
    if (member && plans) {
      // Try to find matching plan by name
      const matchingPlan = plans.find(p => 
        p.name.toLowerCase() === member.plan_name?.toLowerCase() ||
        member.plan_name?.toLowerCase().includes(p.name.toLowerCase())
      );
      
      if (matchingPlan) {
        setPaymentForm({
          amount: member.amount_due || member.plan_amount || (matchingPlan as any).price || 1000,
          plan_id: matchingPlan.id,
          payment_method: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          plan_type: matchingPlan.name as MembershipPlan,
          notes: ''
        });
      } else if (regularPlans.length > 0) {
        // Fallback to first regular plan
        setPaymentForm({
          amount: member.amount_due || member.plan_amount || regularPlans[0].amount || 1000,
          plan_id: regularPlans[0].id,
          payment_method: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          plan_type: regularPlans[0].label as MembershipPlan,
          notes: ''
        });
      }
      setActiveView('main');
      setShiftBaseDate(false);
      setShiftToDate(new Date().toISOString().split('T')[0]);
      setShowShiftConfirmation(false);
      setPaymentStep(1);
    }
  }, [member]);

  const handleClose = () => {
    setActiveView('main');
    setLoading(false);
    setShiftBaseDate(false);
    setShiftToDate(new Date().toISOString().split('T')[0]);
    setShowShiftConfirmation(false);
    setPaymentStep(1);
    onClose();
  };

  const handleWhatsApp = () => {
    if (!member) return;
    const message = `Hi ${member.name}, this is a reminder from ${gymName || 'the gym'} regarding your membership payment.`;
    window.open(`https://wa.me/91${member.phone}?text=${encodeURIComponent(message)}`, '_blank');
    auditLogger.logWhatsAppShared(member.id, member.name, 'payment_reminder');
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
    
    // If trying to shift base date without confirmation, show confirmation dialog
    if (shiftBaseDate && !showShiftConfirmation) {
      setShowShiftConfirmation(true);
      return;
    }
    
    setLoading(true);
    try {
      // Calculate correct plan type enum
      let planTypeEnum = paymentForm.plan_type;
      const selectedPlan = plans?.find(p => p.id === paymentForm.plan_id);
      if (selectedPlan) {
        const baseMonths = (selectedPlan as any).base_duration_months || (selectedPlan as any).duration_months || 1;
        const bonusMonths = (selectedPlan as any).bonus_duration_months || 0;
        planTypeEnum = getMembershipPlanType(baseMonths + bonusMonths);
      }

      await membershipService.recordPayment({
        member_id: member.id,
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        plan_id: paymentForm.plan_id,
        plan_type: planTypeEnum,
        notes: paymentForm.notes,
        shift_base_date: shiftBaseDate,
        new_base_day: shiftBaseDate ? getNewBaseDay() : undefined
      });
      
      // Build WhatsApp confirmation message
      const planLabel = selectedPlan?.name || paymentForm.plan_type || 'Membership';
      const validUntil = format(getNextDueDateWithShift(shiftBaseDate), 'MMMM d, yyyy');
      const paymentDateFormatted = format(new Date(paymentForm.payment_date + 'T00:00:00'), 'MMMM d, yyyy');
      const confirmationMsg = [
        `✅ Payment Received - ${gymName || 'Gym'}`,
        ``,
        `Hi ${member.name},`,
        `Your payment of ₹${paymentForm.amount.toLocaleString('en-IN')} via ${paymentForm.payment_method.toUpperCase()} has been received.`,
        ``,
        `📋 Plan: ${planLabel}`,
        `📅 Payment Date: ${paymentDateFormatted}`,
        `✅ Valid Until: ${validUntil}`,
        ``,
        `Thank you! 💪`,
      ].join('\n');

      // Open WhatsApp with confirmation
      window.open(
        `https://wa.me/91${member.phone}?text=${encodeURIComponent(confirmationMsg)}`,
        '_blank'
      );
      auditLogger.logWhatsAppShared(member.id, member.name, 'payment_confirmation');

      if (shiftBaseDate) {
        toast.success(`Payment recorded! Cycle shifted to ${getNewBaseDay()}${getOrdinalSuffix(getNewBaseDay())} of each month.`, { duration: 5000 });
      } else {
        toast.success('Payment recorded successfully!');
      }
      onUpdate();
      handleClose();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
      setShowShiftConfirmation(false);
    }
  };

  // Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Handle marking member as inactive with reason
  const handleMarkInactive = async (reason: string, notes: string) => {
    if (!member) return;
    setLoading(true);
    try {
      await membershipService.markMemberInactive(member.id, reason, notes);
      toast.success('Member marked as inactive');
      setShowInactiveDialog(false);
      onUpdate();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate member');
    } finally {
      setLoading(false);
    }
  };

  // Handle activating an inactive member - opens the rejoin modal
  const handleActivateMember = () => {
    if (!member) return;
    if (member.status !== 'inactive') return;
    // Open the rejoin modal
    setShowRejoinModal(true);
  };

  // Handle rejoin member - process reactivation with plan and payment
  const handleRejoinMember = async (planId: string, amount: number, paymentMethod: string, startDate: string) => {
    if (!member) return;
    setIsRejoinLoading(true);
    try {
      await membershipService.rejoinMember(member.id, planId, amount, paymentMethod, startDate);
      
      // Build WhatsApp confirmation for rejoin
      const selectedPlan = plans?.find(p => p.id === planId);
      const planLabel = selectedPlan?.name || 'Membership';
      const rejoinMsg = [
        `🎉 Welcome Back - ${gymName || 'Gym'}`,
        ``,
        `Hi ${member.name},`,
        `Your membership has been reactivated!`,
        `Payment of ₹${amount.toLocaleString('en-IN')} via ${paymentMethod.toUpperCase()} received.`,
        ``,
        `📋 Plan: ${planLabel}`,
        `📅 Start Date: ${format(new Date(startDate + 'T00:00:00'), 'MMMM d, yyyy')}`,
        ``,
        `Welcome back! 💪`,
      ].join('\n');

      window.open(
        `https://wa.me/91${member.phone}?text=${encodeURIComponent(rejoinMsg)}`,
        '_blank'
      );
      auditLogger.logWhatsAppShared(member.id, member.name, 'rejoin_confirmation');

      toast.success(`Welcome back, ${member.name}! Member reactivated successfully.`, {
        duration: 4000,
        icon: '🎉',
      });
      setShowRejoinModal(false);
      onUpdate();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate member');
    } finally {
      setIsRejoinLoading(false);
    }
  };

  const getMembershipStatus = () => {
    if (!member) return { text: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    
    if (member.membership_end_date) {
      const endDate = new Date(member.membership_end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilEnd < 0) {
        // Only show Expired for OVERDUE (past due date)
        return { text: 'Expired', color: 'text-red-600', bgColor: 'bg-red-100' };
      } else if (daysUntilEnd === 0) {
        // Due today - show Due Today instead of Expired
        return { text: 'Due Today', color: 'text-amber-600', bgColor: 'bg-amber-100' };
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

          {/* Centered Modal - with viewport-based scaling for small screens */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pb-20"
            style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}
            onClick={handleClose}
          >
            <motion.div 
              className="w-[90vw] max-w-[320px] max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl popup-scale"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
              }}
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
                    {/* Header with emerald gradient - compact */}
                    <div className="relative h-20 bg-gradient-to-br from-emerald-500 to-teal-600">
                      <button
                        onClick={handleClose}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <div className="flex items-center gap-2.5">
                          <Avatar 
                            className="w-11 h-11 border-2 border-white shadow-lg cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => member.photo_url && setShowImagePreview(true)}
                          >
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className="bg-white/30 backdrop-blur-md text-white text-lg font-bold">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-base font-bold truncate">{member.name}</h2>
                            <p className="text-white/80 text-xs">{member.phone}</p>
                          </div>
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color} ${status.bgColor}`}>
                            {status.text}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Member details - compact with glassy cards */}
                    <div className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2 backdrop-blur-sm bg-slate-100 dark:bg-slate-700/70">
                          <div className="flex items-center gap-1 text-[10px] font-medium mb-0.5 text-slate-500 dark:text-slate-400">
                            <CreditCard className="w-2.5 h-2.5" />
                            {member.status === 'inactive' ? 'Previous Plan' : 'Plan'}
                          </div>
                          <p className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                            {(member.plan_name || 'Monthly').replace('_', ' ')}
                          </p>
                        </div>
                        <div className="rounded-lg p-2 backdrop-blur-sm bg-slate-100 dark:bg-slate-700/70">
                          <div className="flex items-center gap-1 text-[10px] font-medium mb-0.5 text-slate-500 dark:text-slate-400">
                            <CreditCard className="w-2.5 h-2.5" />
                            {member.status === 'inactive' ? 'Previous Amount' : 'Amount'}
                          </div>
                          <p className="text-xs font-bold text-emerald-600">
                            ₹{(member.amount_due || member.plan_amount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {member.joining_date && (
                          <div className="rounded-lg p-2 backdrop-blur-sm bg-slate-100 dark:bg-slate-700/70">
                            <div className="flex items-center gap-1 text-[10px] font-medium mb-0.5 text-slate-500 dark:text-slate-400">
                              <Calendar className="w-2.5 h-2.5" />
                              {member.status === 'inactive' ? 'Previous Joined' : 'Joined'}
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {format(new Date(member.joining_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                        {/* For inactive members, show deactivated_at; for active, show membership_end_date */}
                        {member.status === 'inactive' ? (
                          (member.deactivated_at || member.membership_end_date) && (
                            <div className="rounded-lg p-2 backdrop-blur-sm bg-red-50 dark:bg-red-900/30">
                              <div className="flex items-center gap-1 text-[10px] font-medium mb-0.5 text-red-500">
                                <Calendar className="w-2.5 h-2.5" />
                                Deactivated
                              </div>
                              <p className="text-xs font-semibold text-red-600">
                                {format(new Date(member.deactivated_at || member.membership_end_date!), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )
                        ) : (
                          member.membership_end_date && (
                            <div className="rounded-lg p-2 backdrop-blur-sm bg-slate-100 dark:bg-slate-700/70">
                              <div className="flex items-center gap-1 text-[10px] font-medium mb-0.5 text-slate-500 dark:text-slate-400">
                                <Calendar className="w-2.5 h-2.5" />
                                Valid Until
                              </div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                {format(new Date(member.membership_end_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Action buttons - compact 4 or 5 buttons grid */}
                    <div className={`px-3 pb-3 grid gap-1.5 ${showEditButton ? 'grid-cols-5' : 'grid-cols-4'}`}>
                      <button
                        onClick={handleWhatsApp}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg bg-green-50/80 text-green-600 hover:bg-green-100 transition-colors backdrop-blur-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-[8px] font-semibold">WhatsApp</span>
                      </button>

                      <button
                        onClick={handleCall}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg bg-blue-50/80 text-blue-600 hover:bg-blue-100 transition-colors backdrop-blur-sm"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="text-[8px] font-semibold">Call</span>
                      </button>

                      {showEditButton && onEdit && (
                        <button
                          onClick={() => {
                            if (member.status === 'active') {
                              onEdit(member);
                              handleClose();
                            }
                          }}
                          disabled={member.status === 'inactive'}
                          title={member.status === 'inactive' ? 'Cannot edit inactive member' : 'Edit member details'}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors backdrop-blur-sm ${
                            member.status === 'inactive'
                              ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed'
                              : 'bg-purple-50/80 text-purple-600 hover:bg-purple-100'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-[8px] font-semibold">Edit</span>
                        </button>
                      )}

                      {/* Payment History - goes to payment records page */}
                      <button
                        onClick={handlePaymentHistory}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-100/80 text-slate-600 hover:bg-slate-200 transition-colors backdrop-blur-sm"
                        title="View payment records"
                      >
                        <History className="w-4 h-4" />
                        <span className="text-[8px] font-semibold">Payments</span>
                      </button>

                      <button
                        onClick={() => {
                          if (member.status === 'inactive') {
                            handleActivateMember();
                          } else if (isMarkInactiveAllowed()) {
                            setShowInactiveDialog(true);
                          }
                        }}
                        disabled={loading || (member.status === 'active' && !isMarkInactiveAllowed())}
                        title={
                          member.status === 'active' && !isMarkInactiveAllowed() 
                            ? `Can't mark inactive - membership valid for ${getDaysUntilExpiry()} more days` 
                            : member.status === 'active' ? 'Mark member as inactive' : 'Reactivate member'
                        }
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors backdrop-blur-sm relative ${
                          member.status === 'inactive'
                            ? 'bg-emerald-50/80 text-emerald-600 hover:bg-emerald-100'
                            : isMarkInactiveAllowed()
                              ? 'bg-red-50/80 text-red-600 hover:bg-red-100' 
                              : 'bg-slate-100/80 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        <span className="text-[8px] font-semibold">
                          {member.status === 'active' ? 'Mark Inactive' : 'Reactivate'}
                        </span>
                        {member.status === 'active' && !isMarkInactiveAllowed() && getDaysUntilExpiry() > 0 && (
                          <span className="absolute -top-1 -right-1 bg-slate-400 text-white text-[6px] font-bold px-1 py-0.5 rounded-full">
                            {getDaysUntilExpiry()}d
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Track Progress Button - moved to middle */}
                    <div className="px-3 pb-1.5">
                      <button
                        onClick={() => member.status === 'active' && setShowProgressHistory(true)}
                        disabled={member.status === 'inactive'}
                        title={member.status === 'inactive' ? 'Cannot track progress for inactive member' : 'View progress history'}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all duration-200 ${
                          member.status === 'inactive'
                            ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 shadow-md shadow-purple-500/20'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">Track Progress</span>
                      </button>
                    </div>

                    {/* Membership Timeline Link - Link for all members */}
                    <div className="px-3 pb-1 text-center">
                      <button
                        onClick={() => setShowMembershipHistory(true)}
                        className={`inline-flex items-center justify-center gap-1 text-xs transition-colors ${
                          member.status === 'inactive' 
                            ? 'text-amber-600 hover:text-amber-700' 
                            : 'text-slate-500 hover:text-emerald-600'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span className="underline">View membership history</span>
                      </button>
                    </div>

                    {/* Payment Button - PROMINENT position at bottom */}
                    {/* For inactive members, show reactivate prompt */}
                    <div className="px-3 pb-3">
                      {member.status === 'inactive' ? (
                        <p className="text-[10px] text-center text-slate-500">
                          Click <span className="font-semibold text-emerald-600">Reactivate</span> to start a new membership
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <button
                            onClick={() => isPaymentAllowed() && setActiveView('payment')}
                            disabled={!isPaymentAllowed()}
                            className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-colors shadow-md relative ${
                              isPaymentAllowed()
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                            title={!isPaymentAllowed() ? `Payment available in ${getDaysUntilPaymentAllowed()} days` : 'Record payment'}
                          >
                            <CreditCard className="w-4 h-4" />
                            <span className="text-sm font-bold">
                              {isPaymentAllowed() ? 'Record Payment' : `Payment in ${getDaysUntilDue()} days`}
                            </span>
                          </button>
                          
                          {/* Installment buttons row */}
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => isPaymentAllowed() && setShowInstallmentPlan(true)}
                              disabled={!isPaymentAllowed()}
                              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-semibold transition-colors ${
                                isPaymentAllowed()
                                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <SplitSquareVertical className="w-3 h-3" />
                              Pay in Installments
                            </button>
                            <button
                              onClick={() => setShowInstallmentTracker(true)}
                              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                              <SplitSquareVertical className="w-3 h-3" />
                              View
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeView === 'payment' && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-3"
                  >
                    {/* Header with back button and step indicator */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (paymentStep > 1) {
                              setPaymentStep((paymentStep - 1) as 1 | 2 | 3);
                            } else {
                              setActiveView('main');
                            }
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                          style={{ backgroundColor: 'rgba(241, 245, 249, 0.8)' }}
                        >
                          <X className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }} />
                        </button>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary, #1e293b)' }}>
                            {paymentStep === 1 && 'Select Plan'}
                            {paymentStep === 2 && 'Payment Details'}
                            {paymentStep === 3 && 'Confirm Payment'}
                          </h3>
                          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>{member.name}</p>
                        </div>
                      </div>
                      {/* Step Indicator */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              step === paymentStep
                                ? 'bg-emerald-500 w-4'
                                : step < paymentStep
                                ? 'bg-emerald-300'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {/* STEP 1: Select Plan */}
                      {paymentStep === 1 && (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <div className="mb-4">
                            <label className="text-[10px] font-medium mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Select Plan</label>
                            {plansLoading ? (
                              <div className="text-center py-4 text-sm text-gray-500">Loading plans...</div>
                            ) : (regularPlans.length === 0 && specialPlans.length === 0) ? (
                              <div className="text-center py-4 text-sm text-red-500">No active plans available.</div>
                            ) : (
                              <div className="space-y-2">
                                {/* Regular Plans Row - Max 4 per row */}
                                {regularPlans.length > 0 && (
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {regularPlans.map((plan) => (
                                      <button
                                        key={plan.id}
                                        onClick={() => setPaymentForm({ 
                                          ...paymentForm, 
                                          plan_id: plan.id,
                                          plan_type: plan.label as MembershipPlan,
                                          amount: plan.amount 
                                        })}
                                        className={`p-2 rounded-xl border-2 transition-all text-center backdrop-blur-sm ${
                                          paymentForm.plan_id === plan.id
                                            ? 'border-emerald-500 bg-emerald-50/80'
                                            : 'border-slate-200/80 bg-slate-50/50'
                                        }`}
                                      >
                                        <p className="text-[10px] font-bold leading-tight line-clamp-2 break-words" style={{ color: paymentForm.plan_id === plan.id ? '#1e293b' : 'var(--theme-text-primary, #1e293b)' }}>{plan.label}</p>
                                        <p className="text-[9px] text-emerald-600 font-semibold mt-1">₹{plan.amount.toLocaleString('en-IN')}</p>
                                        <p className="text-[8px] opacity-70 mt-0.5">{plan.totalMonths} month{plan.totalMonths !== 1 ? 's' : ''}</p>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Special Plans Row - Max 4 per row */}
                                {specialPlans.length > 0 && (
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {specialPlans.map((plan) => (
                                      <button
                                        key={plan.id}
                                        onClick={() => setPaymentForm({ 
                                          ...paymentForm, 
                                          plan_id: plan.id,
                                          plan_type: plan.label as MembershipPlan,
                                          amount: plan.amount 
                                        })}
                                        className={`p-2 rounded-xl border-2 transition-all text-center backdrop-blur-sm ${
                                          paymentForm.plan_id === plan.id
                                            ? 'border-emerald-500 bg-emerald-50/80'
                                            : 'border-emerald-200/80 bg-slate-50/50'
                                        }`}
                                      >
                                        <p className="text-[10px] font-bold leading-tight line-clamp-2 break-words" style={{ color: paymentForm.plan_id === plan.id ? '#1e293b' : 'var(--theme-text-primary, #1e293b)' }}>{plan.label}</p>
                                        <p className="text-[9px] text-emerald-600 font-semibold mt-1">₹{plan.amount.toLocaleString('en-IN')}</p>
                                        <p className="text-[8px] opacity-70 mt-0.5">{plan.totalMonths} months</p>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Amount Display */}
                          <div className="mb-4 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/60">
                            <p className="text-[10px] text-emerald-600 font-medium">Amount to Pay</p>
                            <p className="text-2xl font-bold text-emerald-700">₹{paymentForm.amount.toLocaleString('en-IN')}</p>
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={() => setPaymentStep(2)}
                            disabled={paymentForm.amount <= 0}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            Continue
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}

                      {/* STEP 2: Payment Method + Shift Cycle */}
                      {paymentStep === 2 && (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          {/* Payment Method */}
                          <div className="mb-4">
                            <label className="text-[10px] font-medium mb-2 block" style={{ color: 'var(--theme-text-muted, #64748b)' }}>Payment Method</label>
                            <div className="flex gap-2">
                              {(['cash', 'upi', 'card'] as PaymentMethod[]).map((method) => (
                                <button
                                  key={method}
                                  onClick={() => setPaymentForm({ ...paymentForm, payment_method: method })}
                                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                                    paymentForm.payment_method === method
                                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-700'
                                      : 'border-slate-200/80 text-slate-600'
                                  }`}
                                >
                                  {method}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Shift Payment Cycle Option - Only for overdue */}
                          {isPaymentOverdue() && (
                            <div className="mb-4">
                              <div className={`p-3 rounded-xl border-2 transition-all ${
                                shiftBaseDate 
                                  ? 'border-blue-400 bg-blue-50/90' 
                                  : 'border-slate-200/80 bg-slate-50/70'
                              }`}>
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={() => setShiftBaseDate(!shiftBaseDate)}
                                    className={`mt-0.5 w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                                      shiftBaseDate ? 'bg-blue-500' : 'bg-slate-300'
                                    }`}
                                  >
                                    <motion.div
                                      className="w-5 h-5 bg-white rounded-full shadow-md"
                                      animate={{ x: shiftBaseDate ? 22 : 2 }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <RefreshCw className={`w-4 h-4 ${shiftBaseDate ? 'text-blue-600' : 'text-slate-500'}`} />
                                      <span className={`text-xs font-bold ${shiftBaseDate ? 'text-blue-700' : 'text-slate-700'}`}>
                                        Shift Payment Cycle
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Change monthly due date to a new date
                                    </p>
                                  </div>
                                </div>

                                {/* Date Picker - Shows when toggle is on */}
                                <AnimatePresence>
                                  {shiftBaseDate && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="mt-3 pt-3 border-t border-blue-200/60"
                                    >
                                      <label className="block text-[10px] font-semibold text-blue-700 mb-1">
                                        Shift to date:
                                      </label>
                                      <input
                                        type="date"
                                        value={shiftToDate}
                                        onChange={(e) => setShiftToDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-white text-sm text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 [color-scheme:light]"
                                      />
                                      <div className="flex items-center justify-center gap-3 mt-2 text-center">
                                        <div className="p-2 rounded-lg bg-slate-100/80">
                                          <p className="text-[8px] text-slate-500 font-medium">CURRENT</p>
                                          <p className="text-lg font-bold text-slate-600">
                                            {getCurrentBaseDay()}<sup className="text-[8px]">{getOrdinalSuffix(getCurrentBaseDay())}</sup>
                                          </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-blue-500" />
                                        <div className="p-2 rounded-lg bg-blue-100/80 border border-blue-300/50">
                                          <p className="text-[8px] text-blue-600 font-medium">NEW</p>
                                          <p className="text-lg font-bold text-blue-700">
                                            {getNewBaseDay()}<sup className="text-[8px]">{getOrdinalSuffix(getNewBaseDay())}</sup>
                                          </p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          )}

                          {/* Next Button */}
                          <button
                            onClick={() => setPaymentStep(3)}
                            className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 ${
                              shiftBaseDate
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/20'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20'
                            }`}
                          >
                            Review & Confirm
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}

                      {/* STEP 3: Confirmation */}
                      {paymentStep === 3 && (
                        <motion.div
                          key="step3"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          {/* Summary Card */}
                          <div className="mb-4 p-4 rounded-xl bg-slate-50/90 border border-slate-200/60">
                            <h4 className="text-xs font-bold text-slate-700 mb-3">Payment Summary</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] text-slate-500">Plan</span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {plans?.find(p => p.id === paymentForm.plan_id)?.name || paymentForm.plan_type}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] text-slate-500">Amount</span>
                                <span className="text-sm font-bold text-emerald-600">₹{paymentForm.amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] text-slate-500">Method</span>
                                <span className="text-xs font-semibold text-slate-700 capitalize">{paymentForm.payment_method}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] text-slate-500">Valid Until</span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {format(getNextDueDateWithShift(shiftBaseDate), 'MMMM d, yyyy')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Shift Cycle Warning */}
                          {shiftBaseDate && (
                            <div className="mb-4 p-3 rounded-xl bg-blue-50/95 border border-blue-200/70">
                              <div className="flex items-start gap-2">
                                <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold text-blue-800">Payment Cycle Will Change</p>
                                  <p className="text-[10px] text-blue-700 mt-0.5">
                                    Due date changes from {getCurrentBaseDay()}{getOrdinalSuffix(getCurrentBaseDay())} to {getNewBaseDay()}{getOrdinalSuffix(getNewBaseDay())} of each month
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Confirm Button */}
                          <button
                            onClick={handlePayment}
                            disabled={loading}
                            className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 ${
                              shiftBaseDate
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/20'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20'
                            }`}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                {shiftBaseDate ? 'Confirm & Shift Cycle' : 'Confirm Payment'}
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
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

      {/* Image Preview Modal */}
      {member && (
        <ImagePreviewModal
          isOpen={showImagePreview}
          imageUrl={member.photo_url || null}
          memberName={member.name}
          onClose={() => setShowImagePreview(false)}
        />
      )}

      {/* Mark Inactive Dialog */}
      {member && (
        <MarkInactiveDialog
          isOpen={showInactiveDialog}
          onClose={() => setShowInactiveDialog(false)}
          onConfirm={handleMarkInactive}
          memberName={member.name}
          isLoading={loading}
        />
      )}

      {/* Rejoin Member Modal - for reactivating inactive members */}
      {member && member.status === 'inactive' && (
        <RejoinMemberModal
          isOpen={showRejoinModal}
          onClose={() => setShowRejoinModal(false)}
          member={{
            id: member.id,
            full_name: member.name,
            phone: member.phone,
            email: null,
            photo_url: member.photo_url || null,
            gender: null,
            status: member.status,
            first_joining_date: member.joining_date || new Date().toISOString(),
            joining_date: member.joining_date || new Date().toISOString(),
            total_periods: 1,
            lifetime_value: 0,
            periods: [],
          }}
          onRejoin={handleRejoinMember}
          isLoading={isRejoinLoading}
        />
      )}

      {/* Membership History Modal - shows joining/leaving timeline */}
      {member && (
        <MembershipHistoryModal
          isOpen={showMembershipHistory}
          onClose={() => setShowMembershipHistory(false)}
          memberId={member.id}
          memberName={member.name}
        />
      )}

      {/* Installment Plan Modal - create new installment plan */}
      {member && (
        <InstallmentPlanModal
          isOpen={showInstallmentPlan}
          onClose={() => setShowInstallmentPlan(false)}
          memberId={member.id}
          memberName={member.name}
          currentPlanName={member.plan_name}
          currentPlanAmount={member.plan_amount}
          onSuccess={() => {
            onUpdate();
            handleClose();
          }}
        />
      )}

      {/* Installment Tracker Modal - view and pay existing installments */}
      {member && (
        <InstallmentTrackerModal
          isOpen={showInstallmentTracker}
          onClose={() => setShowInstallmentTracker(false)}
          memberId={member.id}
          memberName={member.name}
          onUpdate={onUpdate}
        />
      )}
    </AnimatePresence>
  );
}

export default UnifiedMemberPopup;
