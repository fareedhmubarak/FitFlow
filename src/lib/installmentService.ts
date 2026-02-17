import { supabase, getCurrentGymId } from './supabase';
import { auditLogger } from './auditLogger';
import { membershipService } from './membershipService';
import { addDays, format, isBefore, isToday, startOfDay } from 'date-fns';

// ============================================================
// TYPES
// ============================================================

export interface InstallmentPlan {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string | null;
  total_amount: number;
  num_installments: number;
  installment_amount: number;
  frequency_days: number;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  paid_count: number;
  paid_amount: number;
  remaining_amount: number;
  first_payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  gym_id: string;
  installment_plan_id: string;
  member_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  payment_id: string | null;
  paid_date: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallmentPlanWithDetails extends InstallmentPlan {
  installments: Installment[];
  member?: {
    id: string;
    full_name: string;
    phone: string;
    photo_url: string | null;
  };
}

export interface CreateInstallmentPlanInput {
  member_id: string;
  plan_id: string;
  total_amount: number;
  num_installments: number;
  frequency_days: number; // 15 or 30
  first_payment_method: string;
  first_payment_date: string; // YYYY-MM-DD
  notes?: string;
}

export interface DueInstallmentInfo {
  installment: Installment;
  plan: InstallmentPlan;
  member: {
    id: string;
    full_name: string;
    phone: string;
    photo_url: string | null;
    plan_amount: number;
  };
  days_overdue: number;
}

// ============================================================
// SERVICE
// ============================================================

class InstallmentService {
  private static instance: InstallmentService;

  static getInstance(): InstallmentService {
    if (!InstallmentService.instance) {
      InstallmentService.instance = new InstallmentService();
    }
    return InstallmentService.instance;
  }

  /**
   * Create an installment plan and record the first installment payment.
   * 
   * Flow:
   * 1. Create the installment plan record
   * 2. Create all individual installment records with due dates
   * 3. Record the FIRST installment as a real gym_payment (this activates the membership via trigger)
   * 4. Mark first installment as paid
   * 5. Return the complete plan with installments
   */
  async createInstallmentPlan(input: CreateInstallmentPlanInput): Promise<InstallmentPlanWithDetails> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    // Calculate per-installment amount (handle rounding)
    const baseAmount = Math.floor((input.total_amount / input.num_installments) * 100) / 100;
    // Last installment picks up any rounding remainder
    const lastAmount = +(input.total_amount - baseAmount * (input.num_installments - 1)).toFixed(2);

    // Step 1: Create installment plan
    const { data: plan, error: planError } = await supabase
      .from('gym_installment_plans')
      .insert({
        gym_id: gymId,
        member_id: input.member_id,
        plan_id: input.plan_id,
        total_amount: input.total_amount,
        num_installments: input.num_installments,
        installment_amount: baseAmount,
        frequency_days: input.frequency_days,
        status: 'active',
        paid_count: 0,
        paid_amount: 0,
        remaining_amount: input.total_amount,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (planError) throw new Error(`Failed to create installment plan: ${planError.message}`);

    // Step 2: Create individual installment records
    const installments: Array<{
      gym_id: string;
      installment_plan_id: string;
      member_id: string;
      installment_number: number;
      amount: number;
      due_date: string;
      status: string;
    }> = [];

    for (let i = 1; i <= input.num_installments; i++) {
      const daysOffset = (i - 1) * input.frequency_days;
      const [y, m, d] = input.first_payment_date.split('-').map(Number);
      const startDate = new Date(y, m - 1, d);
      const dueDate = addDays(startDate, daysOffset);
      const amount = i === input.num_installments ? lastAmount : baseAmount;

      installments.push({
        gym_id: gymId,
        installment_plan_id: plan.id,
        member_id: input.member_id,
        installment_number: i,
        amount,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'pending',
      });
    }

    const { data: createdInstallments, error: instError } = await supabase
      .from('gym_installments')
      .insert(installments)
      .select();

    if (instError) throw new Error(`Failed to create installments: ${instError.message}`);

    // Step 3: Record first installment as a real payment
    // This triggers the membership activation (due date calculation, etc.)
    const firstInstallment = createdInstallments.find(i => i.installment_number === 1)!;
    
    // Fetch the plan details for plan_type enum derivation
    let planTypeEnum: 'monthly' | 'quarterly' | 'half_yearly' | 'annual' = 'monthly';
    if (input.plan_id) {
      try {
        const { data: memberPlan } = await supabase
          .from('gym_membership_plans')
          .select('base_duration_months, bonus_duration_months, duration_months')
          .eq('id', input.plan_id)
          .single();
        
        if (memberPlan) {
          const totalMonths = (memberPlan.base_duration_months || memberPlan.duration_months || 1) + 
                             (memberPlan.bonus_duration_months || 0);
          if (totalMonths <= 1) planTypeEnum = 'monthly';
          else if (totalMonths <= 3) planTypeEnum = 'quarterly';
          else if (totalMonths <= 6) planTypeEnum = 'half_yearly';
          else planTypeEnum = 'annual';
        }
      } catch {
        // Use default
      }
    }

    // Record the first payment through membershipService (which handles trigger, member update, etc.)
    const payment = await membershipService.recordPayment({
      member_id: input.member_id,
      amount: firstInstallment.amount,
      payment_method: input.first_payment_method as any,
      payment_date: input.first_payment_date,
      due_date: input.first_payment_date,
      plan_id: input.plan_id,
      plan_type: planTypeEnum,
      notes: `Installment 1/${input.num_installments} (Total: ₹${input.total_amount})`,
    });

    // Step 4: Mark first installment as paid + link to payment
    await supabase
      .from('gym_installments')
      .update({
        status: 'paid',
        payment_id: payment.id,
        paid_date: input.first_payment_date,
        payment_method: input.first_payment_method,
        updated_at: new Date().toISOString(),
      })
      .eq('id', firstInstallment.id);

    // Update plan tracking
    await supabase
      .from('gym_installment_plans')
      .update({
        paid_count: 1,
        paid_amount: firstInstallment.amount,
        remaining_amount: +(input.total_amount - firstInstallment.amount).toFixed(2),
        first_payment_id: payment.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id);

    // Audit log
    auditLogger.log({
      category: 'PAYMENT',
      action: 'payment_created',
      resourceType: 'installment_plan',
      resourceId: plan.id,
      success: true,
      metadata: {
        member_id: input.member_id,
        total_amount: input.total_amount,
        num_installments: input.num_installments,
        first_payment_amount: firstInstallment.amount,
      },
    });

    // Return complete plan
    return {
      ...plan,
      paid_count: 1,
      paid_amount: firstInstallment.amount,
      remaining_amount: +(input.total_amount - firstInstallment.amount).toFixed(2),
      first_payment_id: payment.id,
      installments: createdInstallments.map(inst => ({
        ...inst,
        status: inst.id === firstInstallment.id ? 'paid' : inst.status,
        payment_id: inst.id === firstInstallment.id ? payment.id : null,
        paid_date: inst.id === firstInstallment.id ? input.first_payment_date : null,
        payment_method: inst.id === firstInstallment.id ? input.first_payment_method : null,
      })) as Installment[],
    };
  }

  /**
   * Record payment for a specific installment
   */
  async payInstallment(
    installmentId: string,
    paymentMethod: string,
    paymentDate: string,
    notes?: string
  ): Promise<Installment> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    // Get the installment
    const { data: installment, error: fetchError } = await supabase
      .from('gym_installments')
      .select('*, gym_installment_plans(*)')
      .eq('id', installmentId)
      .eq('gym_id', gymId)
      .single();

    if (fetchError || !installment) throw new Error('Installment not found');
    if (installment.status === 'paid') throw new Error('This installment is already paid');

    const plan = installment.gym_installment_plans as InstallmentPlan;

    // Record as a gym_payment (but NOT through membershipService.recordPayment 
    // because we don't want to re-trigger membership date extension for subsequent installments)
    const { data: payment, error: payError } = await supabase
      .from('gym_payments')
      .insert({
        gym_id: gymId,
        member_id: installment.member_id,
        amount: installment.amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        due_date: installment.due_date,
        notes: `Installment ${installment.installment_number}/${plan.num_installments}${notes ? ' - ' + notes : ''}`,
      })
      .select()
      .single();

    if (payError) throw new Error(`Failed to record payment: ${payError.message}`);

    // Mark installment as paid
    const { data: updatedInstallment, error: updateError } = await supabase
      .from('gym_installments')
      .update({
        status: 'paid',
        payment_id: payment.id,
        paid_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', installmentId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to update installment: ${updateError.message}`);

    // Update plan tracking
    const newPaidCount = plan.paid_count + 1;
    const newPaidAmount = +(plan.paid_amount + installment.amount).toFixed(2);
    const newRemaining = +(plan.total_amount - newPaidAmount).toFixed(2);
    const isCompleted = newPaidCount >= plan.num_installments;

    await supabase
      .from('gym_installment_plans')
      .update({
        paid_count: newPaidCount,
        paid_amount: newPaidAmount,
        remaining_amount: newRemaining,
        status: isCompleted ? 'completed' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id);

    // Also update the member's total_payments_received and lifetime_value
    const { data: member } = await supabase
      .from('gym_members')
      .select('total_payments_received, lifetime_value, last_payment_date, last_payment_amount')
      .eq('id', installment.member_id)
      .single();

    if (member) {
      await supabase
        .from('gym_members')
        .update({
          total_payments_received: +(member.total_payments_received || 0) + installment.amount,
          lifetime_value: +(member.lifetime_value || 0) + installment.amount,
          last_payment_date: paymentDate,
          last_payment_amount: installment.amount,
        })
        .eq('id', installment.member_id);
    }

    auditLogger.log({
      category: 'PAYMENT',
      action: 'payment_created',
      resourceType: 'installment',
      resourceId: installmentId,
      success: true,
      metadata: {
        installment_number: installment.installment_number,
        plan_id: plan.id,
        member_id: installment.member_id,
        amount: installment.amount,
        is_completed: isCompleted,
      },
    });

    return updatedInstallment as Installment;
  }

  /**
   * Get all installment plans for a member
   */
  async getMemberInstallmentPlans(memberId: string): Promise<InstallmentPlanWithDetails[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { data: plans, error } = await supabase
      .from('gym_installment_plans')
      .select(`
        *,
        installments:gym_installments(*)
      `)
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (plans || []).map(p => ({
      ...p,
      installments: (p.installments || []).sort(
        (a: any, b: any) => a.installment_number - b.installment_number
      ),
    })) as InstallmentPlanWithDetails[];
  }

  /**
   * Get a single installment plan with all details
   */
  async getInstallmentPlan(planId: string): Promise<InstallmentPlanWithDetails | null> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { data, error } = await supabase
      .from('gym_installment_plans')
      .select(`
        *,
        installments:gym_installments(*),
        member:member_id(id, full_name, phone, photo_url)
      `)
      .eq('id', planId)
      .eq('gym_id', gymId)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      installments: (data.installments || []).sort(
        (a: any, b: any) => a.installment_number - b.installment_number
      ),
      member: data.member,
    } as InstallmentPlanWithDetails;
  }

  /**
   * Get all pending/overdue installments across all members (for dashboard)
   */
  async getDueInstallments(): Promise<DueInstallmentInfo[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const today = format(new Date(), 'yyyy-MM-dd');

    // Get pending installments that are due today or overdue
    const { data, error } = await supabase
      .from('gym_installments')
      .select(`
        *,
        gym_installment_plans(*),
        gym_members!member_id(id, full_name, phone, photo_url, plan_amount)
      `)
      .eq('gym_id', gymId)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', today)
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((item: any) => {
      const dueDate = new Date(item.due_date);
      const todayDate = startOfDay(new Date());
      const daysOverdue = Math.max(0, Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        installment: {
          id: item.id,
          gym_id: item.gym_id,
          installment_plan_id: item.installment_plan_id,
          member_id: item.member_id,
          installment_number: item.installment_number,
          amount: item.amount,
          due_date: item.due_date,
          status: item.status,
          payment_id: item.payment_id,
          paid_date: item.paid_date,
          payment_method: item.payment_method,
          notes: item.notes,
          created_at: item.created_at,
          updated_at: item.updated_at,
        },
        plan: item.gym_installment_plans,
        member: item.gym_members,
        days_overdue: daysOverdue,
      };
    }) as DueInstallmentInfo[];
  }

  /**
   * Get upcoming installments (due in the next N days)
   */
  async getUpcomingInstallments(daysAhead: number = 7): Promise<DueInstallmentInfo[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const today = format(new Date(), 'yyyy-MM-dd');
    const futureDate = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('gym_installments')
      .select(`
        *,
        gym_installment_plans(*),
        gym_members!member_id(id, full_name, phone, photo_url, plan_amount)
      `)
      .eq('gym_id', gymId)
      .eq('status', 'pending')
      .gt('due_date', today)
      .lte('due_date', futureDate)
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((item: any) => {
      const dueDate = new Date(item.due_date);
      const todayDate = startOfDay(new Date());
      const daysUntilDue = Math.floor((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        installment: item,
        plan: item.gym_installment_plans,
        member: item.gym_members,
        days_overdue: -daysUntilDue, // negative = days until due
      };
    }) as DueInstallmentInfo[];
  }

  /**
   * Update overdue installments (call periodically or on app open)
   * Marks pending installments with past due dates as 'overdue'
   */
  async updateOverdueInstallments(): Promise<number> {
    const gymId = await getCurrentGymId();
    if (!gymId) return 0;

    const today = format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('gym_installments')
      .update({ status: 'overdue', updated_at: new Date().toISOString() })
      .eq('gym_id', gymId)
      .eq('status', 'pending')
      .lt('due_date', today)
      .select('id');

    if (error) {
      console.error('Error updating overdue installments:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Cancel an installment plan (only if not all paid)
   */
  async cancelInstallmentPlan(planId: string): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    // Get the plan
    const { data: plan, error } = await supabase
      .from('gym_installment_plans')
      .select('*')
      .eq('id', planId)
      .eq('gym_id', gymId)
      .single();

    if (error || !plan) throw new Error('Plan not found');
    if (plan.status === 'completed') throw new Error('Cannot cancel a completed plan');

    // Cancel all pending installments
    await supabase
      .from('gym_installments')
      .update({ status: 'waived', updated_at: new Date().toISOString() })
      .eq('installment_plan_id', planId)
      .eq('gym_id', gymId)
      .in('status', ['pending', 'overdue']);

    // Mark plan as cancelled
    await supabase
      .from('gym_installment_plans')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', planId);

    auditLogger.log({
      category: 'PAYMENT',
      action: 'payment_deleted',
      resourceType: 'installment_plan',
      resourceId: planId,
      success: true,
      metadata: {
        member_id: plan.member_id,
        paid_amount: plan.paid_amount,
        remaining_amount: plan.remaining_amount,
        action_type: 'cancelled',
      },
    });
  }

  /**
   * Check if a member has an active installment plan
   */
  async hasActiveInstallmentPlan(memberId: string): Promise<{
    hasActive: boolean;
    plan: InstallmentPlanWithDetails | null;
  }> {
    const gymId = await getCurrentGymId();
    if (!gymId) return { hasActive: false, plan: null };

    const { data, error } = await supabase
      .from('gym_installment_plans')
      .select(`
        *,
        installments:gym_installments(*)
      `)
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return { hasActive: false, plan: null };

    return {
      hasActive: true,
      plan: {
        ...data,
        installments: (data.installments || []).sort(
          (a: any, b: any) => a.installment_number - b.installment_number
        ),
      } as InstallmentPlanWithDetails,
    };
  }
}

export const installmentService = InstallmentService.getInstance();
