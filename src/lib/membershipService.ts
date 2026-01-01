import { supabase, getCurrentGymId } from './supabase';
import { auditLogger } from './auditLogger';
import { addMonths, subDays, format } from 'date-fns';
import type { Member, Payment, PaymentSchedule, MembershipPlan, MemberStatus } from '@/types/database';

export interface MembershipPlanConfig {
  id: string;
  plan_name: string;
  plan_type: 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  duration_months: number;
  price: number;
  grace_period_days: number;
  late_fee_per_day: number;
  max_late_fee: number;
  is_active: boolean;
}

export interface DashboardStats {
  due_today: {
    count: number;
    amount: number;
    members: Array<{
      id: string;
      name: string;
      phone: string | null;
      photo: string | null;
      amount: number;
    }>;
  };
  overdue_this_month: {
    count: number;
    amount: number;
    members: Array<{
      id: string;
      name: string;
      phone: string | null;
      photo: string | null;
      amount: number;
      due_date: string;
      days_overdue: number;
    }>;
  };
  total_members: {
    active: number;
    inactive: number;
    total: number;
  };
  revenue_this_month: number;
}

export interface CalendarPaymentData {
  due_date: string;
  member_id: string;
  member_name: string;
  member_photo: string | null;
  amount_due: number;
  payment_status: 'paid' | 'upcoming' | 'due_today' | 'overdue' | 'overdue_multiple';
  days_overdue: number;
}

class MembershipService {
  private static instance: MembershipService;

  static getInstance(): MembershipService {
    if (!MembershipService.instance) {
      MembershipService.instance = new MembershipService();
    }
    return MembershipService.instance;
  }

  // Get membership plans configuration
  async getMembershipPlans(): Promise<MembershipPlanConfig[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_membership_plans')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .order('duration_months');

      if (error) throw error;
      return data as MembershipPlanConfig[];
    } catch (error) {
      console.error('Error fetching membership plans:', error);
      return [];
    }
  }

  // Get members with next due information
  async getMembersWithDueInfo(): Promise<(Member & { next_due_date?: string; days_until_due?: number; is_overdue?: boolean })[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .order('full_name');

      if (error) throw error;

      return (data as any[]).map(member => {
        // Use next_payment_due_date directly from member record
        const nextDueDate = member.next_payment_due_date;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = nextDueDate ? new Date(nextDueDate) : null;
        if (dueDate) dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
        const isOverdue = dueDate ? dueDate < today : false;

        return {
          ...member,
          next_due_date: nextDueDate,
          days_until_due: daysUntilDue,
          is_overdue: isOverdue
        };
      });
    } catch (error) {
      console.error('Error fetching members with due info:', error);
      return [];
    }
  }

  // Get member with full payment history
  async getMemberWithPayments(memberId: string): Promise<Member & {
    payment_schedules?: PaymentSchedule[],
    payments?: Payment[],
    membership_end_date?: string,
    next_payment_due_date?: string
  }> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get member data
      const { data: member, error: memberError } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;

      // Get payment schedule separately
      const { data: schedules } = await supabase
        .from('gym_payment_schedule')
        .select('*')
        .eq('member_id', memberId)
        .order('due_date', { ascending: false });

      // Get payments separately
      const { data: payments } = await supabase
        .from('gym_payments')
        .select('*')
        .eq('member_id', memberId)
        .order('payment_date', { ascending: false });

      return {
        ...member,
        payment_schedules: schedules || [],
        payments: payments || [],
      } as Member & {
        payment_schedules: PaymentSchedule[],
        payments: Payment[],
        membership_end_date: string,
        next_payment_due_date: string
      };
    } catch (error) {
      console.error('Error fetching member with payments:', error);
      throw error;
    }
  }

  // Create a new member with proper membership setup
  // OPTIMIZED: Uses single RPC call when available (reduces 4-5 DB calls to 1)
  async createMember(memberData: Omit<Member, 'id' | 'gym_id' | 'created_at' | 'updated_at'>): Promise<Member> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Try optimized RPC first (single DB call for member + payment)
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_member_with_payment', {
          p_gym_id: gymId,
          p_full_name: memberData.full_name,
          p_phone: memberData.phone,
          p_email: memberData.email || null,
          p_gender: memberData.gender || null,
          p_height: memberData.height || null,
          p_weight: memberData.weight || null,
          p_photo_url: memberData.photo_url || null,
          p_joining_date: memberData.joining_date,
          p_membership_plan: memberData.membership_plan,
          p_plan_amount: memberData.plan_amount,
          p_payment_method: 'cash'
        });

        if (!rpcError && rpcResult?.success && rpcResult?.member) {
          console.log('✅ Member created via optimized RPC (single call!)');
          
          const member = rpcResult.member as Member;
          
          // Audit log async (fire-and-forget - don't wait)
          auditLogger.logMemberCreated(member.id, memberData.full_name, {
            phone: memberData.phone,
            membership_plan: memberData.membership_plan,
            plan_amount: memberData.plan_amount,
          });
          
          return member;
        }
        
        // If RPC returned an error, throw it
        if (rpcResult?.error) {
          throw new Error(rpcResult.error);
        }
      } catch (rpcErr: any) {
        // RPC function doesn't exist yet - fall back to original method
        if (rpcErr.message?.includes('function') || rpcErr.code === '42883') {
          console.log('RPC not available, using standard method');
        } else {
          throw rpcErr; // Re-throw other errors (like duplicate phone)
        }
      }

      // FALLBACK: Original method (multiple DB calls)
      const { data, error } = await supabase
        .from('gym_members')
        .insert({
          gym_id: gymId,
          full_name: memberData.full_name,
          phone: memberData.phone,
          email: memberData.email || null,
          gender: memberData.gender || null,
          height: memberData.height || null,
          weight: memberData.weight || null,
          photo_url: memberData.photo_url || null,
          joining_date: memberData.joining_date,
          membership_plan: memberData.membership_plan,
          plan_amount: memberData.plan_amount,
          status: memberData.status || 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Record initial payment if payment was made
      if (memberData.plan_amount > 0) {
        try {
          await this.recordPayment({
            member_id: data.id,
            amount: memberData.plan_amount,
            payment_method: 'cash',
            payment_date: memberData.joining_date,
            due_date: memberData.joining_date,
            plan_type: memberData.membership_plan
          });
          console.log('Initial payment recorded successfully');
        } catch (paymentError) {
          console.error('Error recording initial payment:', paymentError);
        }
      }

      auditLogger.logMemberCreated(data.id, memberData.full_name, {
        phone: memberData.phone,
        email: memberData.email,
        membership_plan: memberData.membership_plan,
        plan_amount: memberData.plan_amount,
        joining_date: memberData.joining_date,
        status: memberData.status || 'active',
      });

      return data as Member;
    } catch (error) {
      auditLogger.logError('MEMBER', 'member_created', (error as Error).message, {
        name: memberData.full_name,
        phone: memberData.phone,
      });
      console.error('Error creating member:', error);
      throw error;
    }
  }

  // Update member information
  async updateMember(memberId: string, updates: Partial<Member>): Promise<Member> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get old data for audit
      const { data: oldMember } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .eq('id', memberId)
        .single();

      // If plan is being updated, recalculate dates
      if (updates.membership_plan) {
        const member = await this.getMemberWithPayments(memberId);
        const newEndDate = this.calculateMembershipEndDate(
          new Date(member.membership_start_date || member.joining_date),
          updates.membership_plan
        );

        updates.membership_end_date = newEndDate.toISOString().split('T')[0];
        updates.next_payment_due_date = this.calculateNextPaymentDueDate(
          newEndDate,
          updates.membership_plan
        ).toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('gym_members')
        .update(updates)
        .eq('gym_id', gymId)
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;

      // Log member update
      auditLogger.logMemberUpdated(
        memberId,
        data.full_name,
        oldMember || {},
        updates
      );

      return data as Member;
    } catch (error) {
      auditLogger.logError('MEMBER', 'member_updated', (error as Error).message, { memberId });
      console.error('Error updating member:', error);
      throw error;
    }
  }

  // Toggle member active/inactive status
  async toggleMemberStatus(memberId: string, currentStatus: MemberStatus): Promise<MemberStatus> {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      // Get member name for logging
      const { data: member } = await supabase
        .from('gym_members')
        .select('full_name')
        .eq('id', memberId)
        .single();

      await this.updateMember(memberId, { status: newStatus });
      
      // Log status change
      auditLogger.logMemberStatusChanged(
        memberId,
        member?.full_name || 'Unknown',
        currentStatus,
        newStatus
      );

      return newStatus;
    } catch (error) {
      auditLogger.logError('MEMBER', 'member_status_changed', (error as Error).message, { memberId, currentStatus });
      console.error('Error toggling member status:', error);
      throw error;
    }
  }

  // Record a payment and extend membership
  // NEW: Supports shifting the base date (joining day) for payment cycle adjustment
  async recordPayment(paymentData: {
    member_id: string;
    amount: number;
    payment_method: Payment['payment_method'];
    payment_date: string;
    due_date?: string;
    notes?: string;
    plan_type?: MembershipPlan;
    shift_base_date?: boolean;  // NEW: If true, shift payment cycle to payment_date's day
    new_base_day?: number;      // NEW: Optional specific day (1-31) to use as new base
  }): Promise<Payment> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get member details - only select columns that definitely exist
      const member = await supabase
        .from('gym_members')
        .select('joining_date, membership_plan, full_name, membership_end_date, next_payment_due_date, plan_id')
        .eq('gym_id', gymId)
        .eq('id', paymentData.member_id)
        .single();

      if (member.error) throw member.error;

      const oldJoiningDate = member.data.joining_date;
      let newJoiningDate = oldJoiningDate;
      let baseDateShifted = false;

      // Handle base date shift if requested
      if (paymentData.shift_base_date) {
        // Get the new base day from payment_date or specified day
        const paymentDateObj = new Date(paymentData.payment_date);
        const newBaseDay = paymentData.new_base_day || paymentDateObj.getDate();
        
        // Create new joining date with the new day but keep original month/year context
        // We update joining_date to reflect the new anchor day
        const oldJoiningDateObj = new Date(oldJoiningDate);
        const lastDayOfOldMonth = new Date(
          oldJoiningDateObj.getFullYear(),
          oldJoiningDateObj.getMonth() + 1,
          0
        ).getDate();
        
        // Set the new day (handle month edge cases)
        oldJoiningDateObj.setDate(Math.min(newBaseDay, lastDayOfOldMonth));
        newJoiningDate = oldJoiningDateObj.toISOString().split('T')[0];
        baseDateShifted = true;

        // Log the base date change in member history
        await supabase
          .from('gym_member_history')
          .insert({
            gym_id: gymId,
            member_id: paymentData.member_id,
            change_type: 'base_date_shifted',
            old_value: { 
              joining_date: oldJoiningDate,
              base_day: new Date(oldJoiningDate).getDate()
            },
            new_value: { 
              joining_date: newJoiningDate,
              base_day: newBaseDay,
              shifted_on_payment_date: paymentData.payment_date
            },
            description: `Payment cycle shifted from day ${new Date(oldJoiningDate).getDate()} to day ${newBaseDay}`
          });

        console.log(`📅 Base date shifted: ${oldJoiningDate} → ${newJoiningDate} (Day ${new Date(oldJoiningDate).getDate()} → Day ${newBaseDay})`);
      }

      // Calculate new membership dates based on (potentially shifted) base day
      const planType = paymentData.plan_type || member.data.membership_plan;
      
      // Try to fetch plan from database if plan_id exists (to get bonus months)
      let monthsToAdd = this.getMonthsForPlan(planType); // Default fallback
      
      if (member.data.plan_id) {
        try {
          const { data: plan } = await supabase
            .from('gym_membership_plans')
            .select('base_duration_months, bonus_duration_months, duration_months')
            .eq('id', member.data.plan_id)
            .single();
          
          if (plan) {
            const baseMonths = plan.base_duration_months || plan.duration_months || 1;
            const bonusMonths = plan.bonus_duration_months || 0;
            monthsToAdd = baseMonths + bonusMonths;
            console.log(`✅ Using plan duration from DB: ${baseMonths} + ${bonusMonths} = ${monthsToAdd} months`);
          }
        } catch (planError) {
          console.warn('Could not fetch plan, using default duration:', planError);
          // Fall back to hardcoded value
        }
      }
      
      // Calculate next due date from payment date using the base day
      const paymentDateObj = new Date(paymentData.payment_date);
      const baseDay = baseDateShifted 
        ? (paymentData.new_base_day || paymentDateObj.getDate())
        : new Date(oldJoiningDate).getDate();
      
      // Next due date = payment month + plan months, using the base day
      const nextDueDateObj = new Date(paymentDateObj);
      nextDueDateObj.setMonth(nextDueDateObj.getMonth() + monthsToAdd);
      const lastDayOfNextMonth = new Date(
        nextDueDateObj.getFullYear(),
        nextDueDateObj.getMonth() + 1,
        0
      ).getDate();
      nextDueDateObj.setDate(Math.min(baseDay, lastDayOfNextMonth));
      
      // Membership end date is same as next due date (or day before, depending on business logic)
      const nextDueDateStr = nextDueDateObj.toISOString().split('T')[0];

      // Create payment record with notes about base date shift
      const paymentNotes = baseDateShifted 
        ? `${paymentData.notes || ''} [Payment cycle shifted to day ${baseDay}]`.trim()
        : paymentData.notes;

      const { data: payment, error: paymentError } = await supabase
        .from('gym_payments')
        .insert({
          gym_id: gymId,
          member_id: paymentData.member_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date,
          due_date: paymentData.due_date || paymentData.payment_date,
          notes: paymentNotes
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Build member update object
      const memberUpdates: Record<string, any> = {
        membership_end_date: nextDueDateStr,
        next_payment_due_date: nextDueDateStr,
        last_payment_date: paymentData.payment_date,
        last_payment_amount: paymentData.amount
      };

      // Update joining_date if base date was shifted
      if (baseDateShifted) {
        memberUpdates.joining_date = newJoiningDate;
      }

      // Update membership plan if changed
      if (paymentData.plan_type && paymentData.plan_type !== member.data.membership_plan) {
        memberUpdates.membership_plan = paymentData.plan_type;
      }

      // Update member record
      await supabase
        .from('gym_members')
        .update(memberUpdates)
        .eq('gym_id', gymId)
        .eq('id', paymentData.member_id);

      // Log payment creation
      auditLogger.logPaymentCreated(
        payment.id,
        paymentData.member_id,
        member.data.full_name,
        paymentData.amount,
        paymentData.payment_method
      );

      return payment as Payment;
    } catch (error) {
      auditLogger.logError('PAYMENT', 'payment_created', (error as Error).message, {
        member_id: paymentData.member_id,
        amount: paymentData.amount,
      });
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  // Delete/revert a payment
  // Returns { memberDeleted: boolean, memberDeactivated: boolean } to indicate what happened to the member
  // When first payment is deleted, member is marked inactive (not deleted) - can be reactivated via Rejoin
  async deletePayment(paymentId: string): Promise<{ success: boolean; memberDeleted: boolean; memberDeactivated?: boolean }> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get payment details including the due_date it was for
      const { data: payment, error: fetchError } = await supabase
        .from('gym_payments')
        .select('*')
        .eq('gym_id', gymId)
        .eq('id', paymentId)
        .single();

      if (fetchError || !payment) throw fetchError || new Error('Payment not found');

      // Get member details for logging
      const { data: memberInfo } = await supabase
        .from('gym_members')
        .select('full_name, membership_plan, joining_date, total_payments_received')
        .eq('gym_id', gymId)
        .eq('id', payment.member_id)
        .single();

      if (!memberInfo) throw new Error('Member not found');

      // Count total payments for this member to check if this is the only/first payment
      const { count: totalPaymentCount } = await supabase
        .from('gym_payments')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('member_id', payment.member_id);

      // Find the PREVIOUS payment for this member (before this one)
      const { data: previousPayments } = await supabase
        .from('gym_payments')
        .select('due_date, payment_date')
        .eq('gym_id', gymId)
        .eq('member_id', payment.member_id)
        .neq('id', paymentId)
        .order('payment_date', { ascending: false })
        .limit(1);
      
      const previousPayment = previousPayments && previousPayments.length > 0 ? previousPayments[0] : null;
      const isOnlyPayment = !previousPayment && (totalPaymentCount === 1);

      // If this is the ONLY payment (initial payment from member creation),
      // Mark member as INACTIVE instead of deleting (preserve member data for audit trail)
      // User can reactivate through the Rejoin flow which creates a new payment
      // IMPORTANT: Both operations (mark inactive + delete payment) must succeed together
      if (isOnlyPayment) {
        const deactivatedAt = new Date().toISOString();
        
        // STEP 1: Delete the payment record FIRST
        const { error: deletePaymentError } = await supabase
          .from('gym_payments')
          .delete()
          .eq('gym_id', gymId)
          .eq('id', paymentId);

        if (deletePaymentError) {
          console.error('Error deleting payment:', deletePaymentError);
          throw new Error(`Failed to delete payment: ${deletePaymentError.message}`);
        }

        // STEP 2: Delete payment schedule records
        const { error: deleteScheduleError } = await supabase
          .from('gym_payment_schedule')
          .delete()
          .eq('gym_id', gymId)
          .eq('member_id', payment.member_id);

        if (deleteScheduleError) {
          console.error('Error deleting payment schedule:', deleteScheduleError);
          // Non-critical - continue
        }

        // STEP 3: Mark member as INACTIVE
        const { error: memberUpdateError } = await supabase
          .from('gym_members')
          .update({
            status: 'inactive',
            deactivated_at: deactivatedAt,
            total_payments_received: 0,
            membership_end_date: null,
            next_payment_due_date: null
          })
          .eq('gym_id', gymId)
          .eq('id', payment.member_id);

        if (memberUpdateError) {
          console.error('Error marking member as inactive:', memberUpdateError);
          // CRITICAL: Payment was deleted but member update failed
          // We should log this for manual intervention
          throw new Error(`Payment deleted but failed to mark member as inactive: ${memberUpdateError.message}`);
        }

        // STEP 4: Log to history (non-critical, wrapped in try-catch)
        try {
          await supabase
            .from('gym_member_history')
            .insert({
              gym_id: gymId,
              member_id: payment.member_id,
              change_type: 'initial_payment_reversed',
              old_value: { 
                status: 'active',
                payment_id: paymentId,
                payment_amount: payment.amount,
                payment_date: payment.payment_date
              },
              new_value: { 
                status: 'inactive',
                deactivated_at: deactivatedAt,
                reason: 'initial_payment_reversed'
              },
              description: `First payment of ₹${payment.amount} deleted - member marked inactive. Can be reactivated through Rejoin flow.`
            });
        } catch (historyError) {
          // Non-critical - just log the error
          console.error('Error logging to member history (non-critical):', historyError);
        }

        // Log payment deletion
        auditLogger.logPaymentDeleted(paymentId, payment.member_id, memberInfo.full_name, payment.amount);
        
        // Log status change (member marked inactive, not deleted)
        auditLogger.logMemberStatusChanged(
          payment.member_id,
          memberInfo.full_name,
          'active',
          'inactive'
        );

        console.log(`📋 First payment deleted for ${memberInfo.full_name} - member marked inactive (not deleted)`);

        // Return new response indicating member was deactivated, not deleted
        return { success: true, memberDeleted: false, memberDeactivated: true };
      }

      // Otherwise, just revert the due date (existing behavior)
      let revertDateStr: string;

      if (previousPayment && previousPayment.due_date) {
        // If there's a previous payment, calculate the end date from that payment's due date + plan duration
        // Use date parts to avoid timezone issues
        const [year, month, day] = previousPayment.due_date.split('-').map(Number);
        const monthsToAdd = this.getMonthsForPlan(memberInfo.membership_plan);
        const newMonth = month - 1 + monthsToAdd; // JavaScript months are 0-indexed
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        revertDateStr = `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else {
        // No previous payment - revert to the original due_date from this payment being deleted
        // This is the date the member was due BEFORE they made this payment
        // Use the string directly to avoid timezone issues
        revertDateStr = payment.due_date;
      }

      // Determine if member should be active or inactive
      // Parse the revert date carefully to avoid timezone issues
      const [rYear, rMonth, rDay] = revertDateStr.split('-').map(Number);
      const revertDate = new Date(rYear, rMonth - 1, rDay); // Local date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      const isActive = revertDate >= today;

      // Update member record - revert the due date
      const { error: updateError } = await supabase
        .from('gym_members')
        .update({
          membership_end_date: revertDateStr,
          next_payment_due_date: revertDateStr,
          total_payments_received: Math.max(0, (memberInfo.total_payments_received || 0) - payment.amount),
          status: isActive ? 'active' : 'inactive'
        })
        .eq('gym_id', gymId)
        .eq('id', payment.member_id);

      if (updateError) throw updateError;

      // SINGLE RECORD APPROACH: Update the ONE schedule record to reflect reverted due date
      // First, get the current schedule record to log the change
      const { data: currentSchedule } = await supabase
        .from('gym_payment_schedule')
        .select('id, due_date, status')
        .eq('gym_id', gymId)
        .eq('member_id', payment.member_id)
        .single();

      const scheduleStatus = isActive ? 'pending' : 'overdue';
      
      if (currentSchedule) {
        // Update the schedule record
        const { error: scheduleUpdateError } = await supabase
          .from('gym_payment_schedule')
          .update({
            due_date: revertDateStr,
            status: scheduleStatus,
            paid_at: null,
            paid_payment_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSchedule.id);

        if (scheduleUpdateError) {
          console.error('Error updating payment schedule:', scheduleUpdateError);
        }

        // Log the change to history table for audit trail (non-critical)
        try {
          await supabase
            .from('gym_payment_schedule_history')
            .insert({
              gym_id: gymId,
              member_id: payment.member_id,
              schedule_id: currentSchedule.id,
              old_due_date: currentSchedule.due_date,
              new_due_date: revertDateStr,
              old_status: currentSchedule.status,
              new_status: scheduleStatus,
              change_type: 'payment_deleted',
              payment_id: paymentId
            });
        } catch (historyError) {
          // Non-critical - history table might not exist
          console.error('Error logging to schedule history (non-critical):', historyError);
        }
      }

      // Delete the payment record
      const { error: deleteError } = await supabase
        .from('gym_payments')
        .delete()
        .eq('gym_id', gymId)
        .eq('id', paymentId);

      if (deleteError) throw deleteError;

      // Log payment deletion
      auditLogger.logPaymentDeleted(paymentId, payment.member_id, memberInfo.full_name, payment.amount);

      return { success: true, memberDeleted: false };
    } catch (error) {
      auditLogger.logError('PAYMENT', 'payment_deleted', (error as Error).message, { paymentId });
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  // Get dashboard statistics
  async getDashboardStats(forDate?: Date): Promise<DashboardStats> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Use provided date or today
      const targetDate = forDate || new Date();
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { p_gym_id: gymId, p_date: dateStr });

      if (error) throw error;
      return data as DashboardStats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return empty stats on error
      return {
        due_today: { count: 0, amount: 0, members: [] },
        overdue_this_month: { count: 0, amount: 0, members: [] },
        total_members: { active: 0, inactive: 0, total: 0 },
        revenue_this_month: 0
      };
    }
  }

  // Get calendar data
  async getCalendarData(startDate: Date, endDate: Date): Promise<CalendarPaymentData[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // The RPC takes year and month, not date range
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1; // JS months are 0-indexed

      const { data, error } = await supabase
        .rpc('get_calendar_data', {
          p_gym_id: gymId,
          p_year: year,
          p_month: month
        });

      if (error) throw error;
      return data as CalendarPaymentData[];
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      return [];
    }
  }

  // Send notification to member
  async sendNotification(memberId: string, type: 'payment_reminder' | 'welcome' | 'custom', customMessage?: string): Promise<boolean> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get member details
      const { data: member } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .eq('id', memberId)
        .single();

      if (!member) throw new Error('Member not found');

      // Prepare notification message
      let message = '';
      switch (type) {
        case 'payment_reminder':
          message = `Hi ${member.full_name}, this is a reminder that your gym membership payment is due. Please pay at your earliest convenience.`;
          break;
        case 'welcome':
          message = `Welcome to the gym, ${member.full_name}! We're excited to have you join our community.`;
          break;
        case 'custom':
          message = customMessage || '';
          break;
      }

      // Create notification record
      const { error } = await supabase
        .from('notifications')
        .insert({
          gym_id: gymId,
          recipient_type: 'member',
          recipient_ids: [memberId],
          channels: ['whatsapp'],
          message: message,
          status: 'pending',
          scheduled_for: new Date().toISOString()
        });

      if (error) throw error;

      // Log notification sent
      auditLogger.logNotificationSent(memberId, member.full_name, type, 'whatsapp');

      // In a real implementation, you would integrate with WhatsApp API here
      console.log(`Notification sent to ${member.phone} via WhatsApp: ${message}`);

      return true;
    } catch (error) {
      auditLogger.logError('NOTIFICATION', 'notification_sent', (error as Error).message, { memberId, type });
      console.error('Error sending notification:', error);
      return false;
    }
  }

  // Helper methods
  
  /**
   * Calculate next due date based on JOINING DATE
   * Rule: The DAY of joining is the anchor for ALL future due dates
   * Example: Join Nov 1, Monthly -> Due: Dec 1, Jan 1, Feb 1...
   * Even if payment is made on Dec 5, next due is still Jan 1
   * 
   * @param joiningDate - The original joining date (anchor)
   * @param currentDueDate - The current due date being paid for
   * @param planType - The membership plan type
   */
  private calculateNextDueDateFromJoining(
    joiningDate: Date, 
    currentDueDate: Date, 
    planType: MembershipPlan
  ): Date {
    const joiningDay = joiningDate.getDate();
    const monthsToAdd = this.getMonthsForPlan(planType);
    
    // Start from current due date and add plan duration
    const nextDate = new Date(currentDueDate);
    nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
    
    // Get the last day of the target month
    const lastDayOfMonth = new Date(
      nextDate.getFullYear(), 
      nextDate.getMonth() + 1, 
      0
    ).getDate();
    
    // Set the day to joining day, handling month-end edge cases
    // e.g., if joining day is 31 but month has only 30 days
    nextDate.setDate(Math.min(joiningDay, lastDayOfMonth));
    
    return nextDate;
  }

  /**
   * Calculate membership end date (day before next due date)
   */
  private calculateMembershipEndDate(startDate: Date, planType: MembershipPlan): Date {
    const endDate = new Date(startDate);
    switch (planType) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'half_yearly':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 'annual':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }
    return endDate;
  }

  private calculateNextPaymentDueDate(endDate: Date, planType: MembershipPlan): Date {
    return this.calculateMembershipEndDate(endDate, planType);
  }

  private getMonthsForPlan(planType: MembershipPlan): number {
    switch (planType) {
      case 'monthly': return 1;
      case 'quarterly': return 3;
      case 'half_yearly': return 6;
      case 'annual': return 12;
      default: return 1;
    }
  }

  // Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
  private getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  private async createPaymentScheduleForMember(memberId: string, gymId: string, nextDueDate: Date): Promise<void> {
    try {
      // Get the member's plan amount
      const { data: member } = await supabase
        .from('gym_members')
        .select('plan_amount')
        .eq('id', memberId)
        .single();

      const planAmount = member?.plan_amount || 1000;

      // Check if schedule already exists for this date
      const { data: existing } = await supabase
        .from('gym_payment_schedule')
        .select('id')
        .eq('gym_id', gymId)
        .eq('member_id', memberId)
        .eq('due_date', nextDueDate.toISOString().split('T')[0])
        .single();

      // Only create if doesn't exist
      if (!existing) {
        await supabase
          .from('gym_payment_schedule')
          .insert({
            gym_id: gymId,
            member_id: memberId,
            due_date: nextDueDate.toISOString().split('T')[0],
            amount_due: planAmount,
            status: 'pending'
          });
      }
    } catch (error) {
      console.error('Error creating payment schedule:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  // Get due payments for notifications
  async getDuePayments(daysAhead: number = 3): Promise<Array<{ member: Member; daysUntilDue: number }>> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('gym_payment_schedule')
        .select(`
          *,
          gym_members (*)
        `)
        .eq('gym_id', gymId)
        .eq('status', 'pending')
        .lte('due_date', targetDate.toISOString().split('T')[0])
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date');

      if (error) throw error;

      return (data as any[]).map(schedule => ({
        member: schedule.gym_members,
        daysUntilDue: Math.ceil((new Date(schedule.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      console.error('Error fetching due payments:', error);
      return [];
    }
  }

  // Mark member as inactive with reason tracking
  async markMemberInactive(memberId: string, reason: string, notes?: string): Promise<void> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get member details
      const { data: member, error: memberError } = await supabase
        .from('gym_members')
        .select('full_name, current_period_id, status')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

      if (memberError || !member) throw memberError || new Error('Member not found');
      if (member.status === 'inactive') throw new Error('Member is already inactive');

      // Close current period if exists
      if (member.current_period_id) {
        await supabase
          .from('gym_membership_periods')
          .update({
            status: 'closed',
            end_reason: reason,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', member.current_period_id);
      }

      // Update member status - record the actual deactivation date
      const deactivatedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('gym_members')
        .update({
          status: 'inactive',
          current_period_id: null,
          deactivated_at: deactivatedAt, // Store the actual deactivation date
          updated_at: deactivatedAt,
        })
        .eq('id', memberId)
        .eq('gym_id', gymId);

      if (updateError) throw updateError;

      // Log to member history
      await supabase
        .from('gym_member_history')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          change_type: 'status_changed_to_inactive',
          old_value: { status: 'active' },
          new_value: { status: 'inactive', reason, notes },
          description: `Member marked inactive. Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`,
        });

      // Log audit
      auditLogger.logMemberStatusChanged(memberId, member.full_name, 'active', 'inactive');

    } catch (error) {
      auditLogger.logError('MEMBER', 'mark_inactive', (error as Error).message, { memberId, reason });
      console.error('Error marking member inactive:', error);
      throw error;
    }
  }

  // Get membership periods for a member (for viewing history)
  async getMemberPeriods(memberId: string): Promise<{
    member: {
      id: string;
      full_name: string;
      phone: string;
      photo_url: string | null;
      status: 'active' | 'inactive';
      first_joining_date: string;
      joining_date: string;
      deactivated_at: string | null;
      total_periods: number;
    } | null;
    periods: Array<{
      id: string;
      period_number: number;
      plan_name: string;
      start_date: string;
      end_date: string;
      paid_amount: number;
      status: string;
      end_reason?: string;
      notes?: string;
    }>;
  }> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get member data
      const { data: member, error: memberError } = await supabase
        .from('gym_members')
        .select('id, full_name, phone, photo_url, status, first_joining_date, joining_date, deactivated_at, total_periods')
        .eq('gym_id', gymId)
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;

      // Get membership periods
      const { data: periods, error: periodsError } = await supabase
        .from('gym_membership_periods')
        .select('id, period_number, plan_name, start_date, end_date, paid_amount, status, end_reason, notes')
        .eq('member_id', memberId)
        .order('period_number', { ascending: false });

      if (periodsError) throw periodsError;

      return {
        member: member ? {
          ...member,
          status: member.status as 'active' | 'inactive',
        } : null,
        periods: periods || [],
      };
    } catch (error) {
      console.error('Error fetching member periods:', error);
      return { member: null, periods: [] };
    }
  }

  // Check if phone number exists (for rejoin flow)
  async checkMemberByPhone(phone: string): Promise<{
    exists: boolean;
    member: {
      id: string;
      full_name: string;
      phone: string;
      email: string | null;
      photo_url: string | null;
      gender: string | null;
      status: 'active' | 'inactive';
      first_joining_date: string;
      joining_date: string;
      total_periods: number;
      lifetime_value: number;
      membership_plan: string;
      plan_amount: number;
      periods: Array<{
        id: string;
        period_number: number;
        plan_name: string;
        start_date: string;
        end_date: string;
        paid_amount: number;
        status: string;
      }>;
    } | null;
  }> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Normalize phone - remove all non-digit characters
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);

      const { data: member, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (error) throw error;
      if (!member) return { exists: false, member: null };

      // Get membership periods
      const { data: periods } = await supabase
        .from('gym_membership_periods')
        .select('*')
        .eq('member_id', member.id)
        .order('period_number', { ascending: false });

      return {
        exists: true,
        member: {
          id: member.id,
          full_name: member.full_name,
          phone: member.phone,
          email: member.email,
          photo_url: member.photo_url,
          gender: member.gender,
          status: member.status,
          first_joining_date: member.first_joining_date || member.joining_date,
          joining_date: member.joining_date,
          total_periods: member.total_periods || 1,
          lifetime_value: member.lifetime_value || 0,
          membership_plan: member.membership_plan,
          plan_amount: member.plan_amount,
          periods: (periods || []).map(p => ({
            id: p.id,
            period_number: p.period_number,
            plan_name: p.plan_name,
            start_date: p.start_date,
            end_date: p.end_date,
            paid_amount: p.paid_amount,
            status: p.status,
          })),
        },
      };
    } catch (error) {
      console.error('Error checking member by phone:', error);
      return { exists: false, member: null };
    }
  }

  // Rejoin an inactive member with new plan and payment
  async rejoinMember(
    memberId: string,
    planType: string, // Plan type like 'monthly', 'quarterly', 'half_yearly', 'annual'
    paidAmount: number,
    paymentMethod: string,
    startDate: string
  ): Promise<{ success: boolean; member?: Member }> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Static plan options (same as Add Member)
      const PLAN_CONFIGS: Record<string, { name: string; duration: number; amount: number }> = {
        'monthly': { name: 'Monthly', duration: 1, amount: 1000 },
        'quarterly': { name: 'Quarterly', duration: 3, amount: 2500 },
        'half_yearly': { name: 'Half Yearly', duration: 6, amount: 5000 },
        'annual': { name: 'Annual', duration: 12, amount: 7500 },
      };

      const planConfig = PLAN_CONFIGS[planType];
      if (!planConfig) throw new Error(`Invalid plan type: ${planType}`);

      // Get member current data
      const { data: member, error: memberError } = await supabase
        .from('gym_members')
        .select('*')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

      if (memberError || !member) throw new Error('Member not found');
      if (member.status === 'active') throw new Error('Member is already active');

      // Calculate end date - parse date parts to avoid timezone issues
      const [year, month, day] = startDate.split('-').map(Number);
      const startDateObj = new Date(year, month - 1, day); // month is 0-indexed
      
      // Use date-fns for robust month addition
      const nextDueDate = addMonths(startDateObj, planConfig.duration);
      
      // Membership end date is 1 day before next due date
      const membershipEndDate = subDays(nextDueDate, 1);
      
      const nextDueDateStr = format(nextDueDate, 'yyyy-MM-dd');
      const membershipEndDateStr = format(membershipEndDate, 'yyyy-MM-dd');

      // DEBUG: Log the calculated dates
      console.log('🔥 REJOIN DEBUG:', {
        startDate,
        year, month, day,
        planDuration: planConfig.duration,
        startDateObj: startDateObj.toString(),
        nextDueDateStr,
        membershipEndDateStr
      });

      const newPeriodNumber = (member.total_periods || 0) + 1;

      // Create new period
      const { data: period, error: periodError } = await supabase
        .from('gym_membership_periods')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          period_number: newPeriodNumber,
          plan_name: planConfig.name,
          plan_duration_months: planConfig.duration,
          plan_amount: paidAmount,
          bonus_months: 0,
          discount_amount: 0,
          paid_amount: paidAmount,
          start_date: startDate,
          end_date: membershipEndDateStr,
          next_payment_due: nextDueDateStr,
          status: 'active',
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // IMPORTANT: Record payment FIRST
      // The payment insert triggers update_member_status_on_payment() in PostgreSQL
      // which calculates WRONG dates for reactivation (adds months to existing next_due_date)
      // We then update member AFTER to override with correct dates
      const { data: payment, error: paymentError } = await supabase
        .from('gym_payments')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          amount: paidAmount,
          payment_method: paymentMethod,
          payment_date: startDate,
          due_date: startDate,
          notes: `Reactivation - Period #${newPeriodNumber} (${planConfig.name})`,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error recording rejoin payment:', paymentError);
        // Don't throw - continue with member update
      }

      // Update member AFTER payment insert to OVERRIDE the trigger's wrong dates
      // The trigger updates lifetime_value, total_payments_received, last_payment_date, last_payment_amount
      // So we don't need to set those - just override the wrong dates
      const { data: updatedMember, error: updateError } = await supabase
        .from('gym_members')
        .update({
          status: 'active',
          membership_plan: planType,
          plan_amount: paidAmount,
          joining_date: startDate,
          membership_start_date: startDate,
          membership_end_date: membershipEndDateStr,   // OVERRIDE trigger's wrong date
          next_payment_due_date: nextDueDateStr,        // OVERRIDE trigger's wrong date
          current_period_id: period.id,
          total_periods: newPeriodNumber,
          deactivated_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update or create payment schedule
      const { data: existingSchedule } = await supabase
        .from('gym_payment_schedule')
        .select('id')
        .eq('gym_id', gymId)
        .eq('member_id', memberId)
        .maybeSingle();

      if (existingSchedule) {
        await supabase
          .from('gym_payment_schedule')
          .update({
            due_date: nextDueDateStr,
            amount_due: paidAmount,
            status: 'pending',
            paid_payment_id: null,
            paid_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSchedule.id);
      } else {
        await supabase
          .from('gym_payment_schedule')
          .insert({
            gym_id: gymId,
            member_id: memberId,
            due_date: nextDueDateStr,
            amount_due: paidAmount,
            status: 'pending',
          });
      }

      // Calculate old and new base days for audit trail
      const oldJoiningDate = member.joining_date;
      const oldBaseDay = oldJoiningDate ? new Date(oldJoiningDate).getDate() : null;
      const newBaseDay = startDateObj.getDate();

      // Log to member history with complete joining_date audit trail
      await supabase
        .from('gym_member_history')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          change_type: 'member_reactivated',
          old_value: { 
            status: 'inactive',
            joining_date: oldJoiningDate,
            base_day: oldBaseDay,
            deactivated_at: member.deactivated_at
          },
          new_value: { 
            status: 'active', 
            plan: planConfig.name, 
            period_number: newPeriodNumber,
            paid_amount: paidAmount,
            joining_date: startDate,
            base_day: newBaseDay,
            membership_end_date: membershipEndDateStr,
            next_payment_due_date: nextDueDateStr
          },
          description: `Member reactivated with ${planConfig.name} plan. Period #${newPeriodNumber}. Paid ₹${paidAmount}. Payment cycle: ${newBaseDay}${this.getOrdinalSuffix(newBaseDay)} of each month.`,
        });

      // Log audit
      auditLogger.logMemberStatusChanged(memberId, member.full_name, 'inactive', 'active');
      auditLogger.logPaymentCreated(
        payment?.id || `rejoin-${memberId}-${Date.now()}`,
        memberId,
        member.full_name,
        paidAmount,
        paymentMethod
      );

      return { success: true, member: updatedMember as Member };
    } catch (error) {
      auditLogger.logError('MEMBER', 'rejoin_member', (error as Error).message, { memberId, planType });
      console.error('Error rejoining member:', error);
      throw error;
    }
  }
  // Get raw history events for timeline
  async getMemberHistoryEvents(memberId: string): Promise<any[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_member_history')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false }); // Newest first for UI

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching member history events:', error);
      return [];
    }
  }
}

// Export singleton instance
export const membershipService = MembershipService.getInstance();
