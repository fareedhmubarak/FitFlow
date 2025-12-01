import { supabase, getCurrentGymId } from './supabase';
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
  async createMember(memberData: Omit<Member, 'id' | 'gym_id' | 'created_at' | 'updated_at'>): Promise<Member> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Calculate membership dates (for payment record only)
      const joiningDate = new Date(memberData.joining_date);
      const membershipEndDate = this.calculateMembershipEndDate(joiningDate, memberData.membership_plan);

      // Insert member with only the core fields that exist in the table
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
          // Don't throw - member was created successfully
        }
      }

      return data as Member;
    } catch (error) {
      console.error('Error creating member:', error);
      throw error;
    }
  }

  // Update member information
  async updateMember(memberId: string, updates: Partial<Member>): Promise<Member> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

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
      return data as Member;
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  // Toggle member active/inactive status
  async toggleMemberStatus(memberId: string, currentStatus: MemberStatus): Promise<MemberStatus> {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await this.updateMember(memberId, { status: newStatus });
      return newStatus;
    } catch (error) {
      console.error('Error toggling member status:', error);
      throw error;
    }
  }

  // Record a payment and extend membership
  async recordPayment(paymentData: {
    member_id: string;
    amount: number;
    payment_method: Payment['payment_method'];
    payment_date: string;
    due_date?: string;
    notes?: string;
    plan_type?: MembershipPlan;
  }): Promise<Payment> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get member details - only select columns that definitely exist
      const member = await supabase
        .from('gym_members')
        .select('joining_date, membership_plan')
        .eq('gym_id', gymId)
        .eq('id', paymentData.member_id)
        .single();

      if (member.error) throw member.error;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('gym_payments')
        .insert({
          gym_id: gymId,
          member_id: paymentData.member_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date,
          due_date: paymentData.due_date || paymentData.payment_date,
          notes: paymentData.notes
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update membership plan if changed
      if (paymentData.plan_type && paymentData.plan_type !== member.data.membership_plan) {
        await supabase
          .from('gym_members')
          .update({ membership_plan: paymentData.plan_type })
          .eq('gym_id', gymId)
          .eq('id', paymentData.member_id);
      }

      return payment as Payment;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  // Delete/revert a payment
  async deletePayment(paymentId: string): Promise<boolean> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get payment details
      const { data: payment, error: fetchError } = await supabase
        .from('gym_payments')
        .select('*')
        .eq('gym_id', gymId)
        .eq('id', paymentId)
        .single();

      if (fetchError || !payment) throw fetchError || new Error('Payment not found');

      // Get member details
      const { data: member } = await supabase
        .from('gym_members')
        .select('membership_plan, next_payment_due_date, total_payments_received')
        .eq('gym_id', gymId)
        .eq('id', payment.member_id)
        .single();

      if (!member) throw new Error('Member not found');

      // Calculate reverted end date by subtracting plan duration from current due date
      const currentDueDate = new Date(member.next_payment_due_date || new Date());
      const monthsToSubtract = this.getMonthsForPlan(member.membership_plan);
      const revertedEndDate = new Date(currentDueDate);
      revertedEndDate.setMonth(revertedEndDate.getMonth() - monthsToSubtract);

      // Update member record - revert the due date
      const { error: updateError } = await supabase
        .from('gym_members')
        .update({
          membership_end_date: revertedEndDate.toISOString().split('T')[0],
          next_payment_due_date: revertedEndDate.toISOString().split('T')[0],
          total_payments_received: Math.max(0, (member.total_payments_received || 0) - payment.amount),
          status: revertedEndDate < new Date() ? 'inactive' : 'active'
        })
        .eq('gym_id', gymId)
        .eq('id', payment.member_id);

      if (updateError) throw updateError;

      // Delete the payment record
      await supabase
        .from('gym_payments')
        .delete()
        .eq('gym_id', gymId)
        .eq('id', paymentId);

      // Update payment schedule back to pending
      await supabase
        .from('gym_payment_schedule')
        .update({
          status: 'pending',
          paid_at: null,
          paid_payment_id: null
        })
        .eq('gym_id', gymId)
        .eq('member_id', payment.member_id)
        .eq('paid_payment_id', paymentId);

      return true;
    } catch (error) {
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

      // In a real implementation, you would integrate with WhatsApp API here
      console.log(`Notification sent to ${member.phone} via WhatsApp: ${message}`);

      return true;
    } catch (error) {
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
}

// Export singleton instance
export const membershipService = MembershipService.getInstance();
