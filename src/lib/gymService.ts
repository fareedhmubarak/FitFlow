import { supabase, getCurrentGymId } from './supabase';
import { auditLogger } from './auditLogger';

// Types for enhanced gym service
export interface EnhancedDashboardStats {
  today: {
    collections: number;
    collectionsCount: number;
    newMembers: number;
    expiringToday: number;
    dueToday: number;
    dueTodayAmount: number;
  };
  thisWeek: {
    expiring: number;
    pendingPayments: number;
    pendingAmount: number;
  };
  thisMonth: {
    totalCollections: number;
    newMembers: number;
    renewals: number;
    churned: number;
  };
  members: {
    total: number;
    active: number;
    expired: number;
    inactive: number;
    multiMonthPlanCount: number;
  };
}

export interface ExpiringMember {
  id: string;
  full_name: string;
  phone: string;
  photo_url: string | null;
  membership_plan: string;
  plan_amount: number;
  membership_end_date: string;
  days_until_expiry: number;
}

export interface PendingPayment {
  id: string;
  full_name: string;
  phone: string;
  photo_url: string | null;
  membership_plan: string;
  plan_amount: number;
  next_payment_due_date: string;
  days_overdue: number;
}

export interface CalendarEvent {
  id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  photo_url: string | null;
  event_date: string;
  event_type: 'expiry' | 'payment_due' | 'birthday' | 'joined' | 'payment';
  event_title: string;
  amount: number | null;
  plan_name: string | null;
  urgency: 'overdue' | 'today' | 'upcoming' | 'future' | 'info';
  // Additional member details for popup
  membership_end_date?: string;
  joining_date?: string;
  status?: string;
}

export interface MembershipPlanWithPromo {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  duration_months: number;
  base_duration_months: number | null;
  bonus_duration_months: number;
  total_duration_months: number;
  price: number;
  base_price: number | null;
  final_price: number | null;
  discount_type: 'none' | 'percentage' | 'flat';
  discount_value: number;
  promo_type: 'standard' | 'promotional' | 'trial' | 'custom';
  promo_description: string | null;
  highlight_text: string | null;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  features: string[];
  display_order: number;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  member_name: string;
  member_phone: string | null;
  plan_name: string;
  amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  payment_date: string;
  valid_from: string;
  valid_until: string;
  next_due_date: string | null;
  shared_via_whatsapp: boolean;
  created_at: string;
}

export interface MemberWithPeriods {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  gender: 'male' | 'female' | 'other' | null;
  date_of_birth: string | null;
  photo_url: string | null;
  first_joining_date: string;
  joining_date: string;
  total_periods: number;
  lifetime_value: number;
  status: 'active' | 'inactive' | 'expired';
  membership_plan: string;
  plan_amount: number;
  membership_end_date: string | null;
  next_payment_due_date: string | null;
  current_period: {
    id: string;
    period_number: number;
    plan_name: string;
    start_date: string;
    end_date: string;
    paid_amount: number;
    status: string;
  } | null;
  periods: Array<{
    id: string;
    period_number: number;
    plan_name: string;
    start_date: string;
    end_date: string;
    paid_amount: number;
    status: string;
  }>;
}

class GymService {
  private static instance: GymService;

  static getInstance(): GymService {
    if (!GymService.instance) {
      GymService.instance = new GymService();
    }
    return GymService.instance;
  }

  // Get enhanced dashboard statistics
  async getEnhancedDashboardStats(): Promise<EnhancedDashboardStats> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekEnd = weekFromNow.toISOString().split('T')[0];
      
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // Get all members
      const { data: members, error: membersError } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId);

      if (membersError) throw membersError;

      // Get today's payments
      const { data: todayPayments } = await supabase
        .from('gym_payments')
        .select('amount')
        .eq('gym_id', gymId)
        .eq('payment_date', today);

      // Get this month's payments
      const { data: monthPayments } = await supabase
        .from('gym_payments')
        .select('amount, member_id, payment_date')
        .eq('gym_id', gymId)
        .gte('payment_date', monthStartStr)
        .lte('payment_date', today);

      // Calculate stats
      const todayCollections = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const monthCollections = monthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Members joining this month
      const newMembersMonth = members?.filter(m => m.joining_date >= monthStartStr).length || 0;
      const newMembersToday = members?.filter(m => m.joining_date === today).length || 0;

      // Expiring today and this week
      const expiringToday = members?.filter(m => 
        m.status === 'active' && m.membership_end_date === today
      ).length || 0;

      const expiringThisWeek = members?.filter(m => 
        m.status === 'active' && 
        m.membership_end_date >= today && 
        m.membership_end_date <= weekEnd
      ).length || 0;

      // Due today
      const dueToday = members?.filter(m => 
        m.status === 'active' && m.next_payment_due_date === today
      ) || [];
      const dueTodayAmount = dueToday.reduce((sum, m) => sum + Number(m.plan_amount || 0), 0);

      // Pending payments (overdue)
      const pendingPayments = members?.filter(m => 
        m.status === 'active' && 
        m.next_payment_due_date && 
        m.next_payment_due_date < today
      ) || [];
      const pendingAmount = pendingPayments.reduce((sum, m) => sum + Number(m.plan_amount || 0), 0);

      // Member status counts
      const activeMembers = members?.filter(m => m.status === 'active').length || 0;
      const inactiveMembers = members?.filter(m => m.status === 'inactive').length || 0;
      const expiredMembers = members?.filter(m => 
        m.status === 'active' && m.membership_end_date && m.membership_end_date < today
      ).length || 0;

      // Multi-month plan members (3M/6M/12M - quarterly, half_yearly, annual)
      const multiMonthPlanCount = members?.filter(m => 
        m.status === 'active' && 
        m.membership_plan && 
        ['quarterly', 'half_yearly', 'annual'].includes(m.membership_plan.toLowerCase())
      ).length || 0;

      // Renewals this month (payments from existing members)
      const renewals = monthPayments?.filter(p => {
        const member = members?.find(m => m.id === p.member_id);
        return member && member.joining_date < monthStartStr;
      }).length || 0;

      return {
        today: {
          collections: todayCollections,
          collectionsCount: todayPayments?.length || 0,
          newMembers: newMembersToday,
          expiringToday,
          dueToday: dueToday.length,
          dueTodayAmount,
        },
        thisWeek: {
          expiring: expiringThisWeek,
          pendingPayments: pendingPayments.length,
          pendingAmount,
        },
        thisMonth: {
          totalCollections: monthCollections,
          newMembers: newMembersMonth,
          renewals,
          churned: 0, // Would need history tracking for accurate count
        },
        members: {
          total: members?.length || 0,
          active: activeMembers,
          expired: expiredMembers,
          inactive: inactiveMembers,
          multiMonthPlanCount,
        },
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        today: { collections: 0, collectionsCount: 0, newMembers: 0, expiringToday: 0, dueToday: 0, dueTodayAmount: 0 },
        thisWeek: { expiring: 0, pendingPayments: 0, pendingAmount: 0 },
        thisMonth: { totalCollections: 0, newMembers: 0, renewals: 0, churned: 0 },
        members: { total: 0, active: 0, expired: 0, inactive: 0, multiMonthPlanCount: 0 },
      };
    }
  }

  // Get expiring members this week
  async getExpiringThisWeek(limit: number = 10): Promise<ExpiringMember[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekEnd = weekFromNow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('gym_members')
        .select('id, full_name, phone, photo_url, membership_plan, plan_amount, membership_end_date')
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .gte('membership_end_date', today)
        .lte('membership_end_date', weekEnd)
        .order('membership_end_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const todayDate = new Date(today);
      return (data || []).map(m => ({
        ...m,
        days_until_expiry: Math.ceil((new Date(m.membership_end_date).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      console.error('Error fetching expiring members:', error);
      return [];
    }
  }

  // Get pending payments (overdue)
  async getPendingPayments(limit: number = 10): Promise<PendingPayment[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('gym_members')
        .select('id, full_name, phone, photo_url, membership_plan, plan_amount, next_payment_due_date')
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .lt('next_payment_due_date', today)
        .order('next_payment_due_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const todayDate = new Date(today);
      return (data || []).map(m => ({
        ...m,
        days_overdue: Math.ceil((todayDate.getTime() - new Date(m.next_payment_due_date).getTime()) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      return [];
    }
  }

  // Get calendar events for a date range
  async getCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const events: CalendarEvent[] = [];

      // Get members with expiry in range
      const { data: expiringMembers } = await supabase
        .from('gym_members')
        .select('id, full_name, phone, photo_url, membership_plan, plan_amount, membership_end_date, joining_date, status')
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .gte('membership_end_date', startStr)
        .lte('membership_end_date', endStr);

      expiringMembers?.forEach(m => {
        const urgency = m.membership_end_date < today ? 'overdue' : 
                       m.membership_end_date === today ? 'today' : 
                       new Date(m.membership_end_date) <= new Date(new Date().setDate(new Date().getDate() + 7)) ? 'upcoming' : 'future';
        events.push({
          id: `expiry-${m.id}`,
          member_id: m.id,
          member_name: m.full_name,
          member_phone: m.phone,
          photo_url: m.photo_url,
          event_date: m.membership_end_date,
          event_type: 'expiry',
          event_title: `Expires: ${m.full_name}`,
          amount: m.plan_amount,
          plan_name: m.membership_plan,
          urgency,
          membership_end_date: m.membership_end_date,
          joining_date: m.joining_date,
          status: m.status,
        });
      });

      // Get members with payment due in range
      const { data: dueMembers } = await supabase
        .from('gym_members')
        .select('id, full_name, phone, photo_url, membership_plan, plan_amount, next_payment_due_date, membership_end_date, joining_date, status')
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .gte('next_payment_due_date', startStr)
        .lte('next_payment_due_date', endStr);

      dueMembers?.forEach(m => {
        const urgency = m.next_payment_due_date < today ? 'overdue' : 
                       m.next_payment_due_date === today ? 'today' : 
                       new Date(m.next_payment_due_date) <= new Date(new Date().setDate(new Date().getDate() + 7)) ? 'upcoming' : 'future';
        events.push({
          id: `due-${m.id}`,
          member_id: m.id,
          member_name: m.full_name,
          member_phone: m.phone,
          photo_url: m.photo_url,
          event_date: m.next_payment_due_date,
          event_type: 'payment_due',
          event_title: `Due: ${m.full_name}`,
          amount: m.plan_amount,
          plan_name: m.membership_plan,
          urgency,
          membership_end_date: m.membership_end_date,
          joining_date: m.joining_date,
          status: m.status,
        });
      });

      // Get payments made in range
      const { data: payments } = await supabase
        .from('gym_payments')
        .select('id, member_id, amount, payment_date')
        .eq('gym_id', gymId)
        .gte('payment_date', startStr)
        .lte('payment_date', endStr);

      if (payments && payments.length > 0) {
        const memberIds = [...new Set(payments.map(p => p.member_id))];
        const { data: paymentMembers } = await supabase
          .from('gym_members')
          .select('id, full_name, phone, photo_url, membership_plan, membership_end_date, joining_date, status')
          .in('id', memberIds);

        payments.forEach(p => {
          const member = paymentMembers?.find(m => m.id === p.member_id);
          if (member) {
            events.push({
              id: `payment-${p.id}`,
              member_id: p.member_id,
              member_name: member.full_name,
              member_phone: member.phone,
              photo_url: member.photo_url,
              event_date: p.payment_date,
              event_type: 'payment',
              event_title: `Paid: ${member.full_name}`,
              amount: p.amount,
              plan_name: member.membership_plan,
              urgency: 'info',
              membership_end_date: member.membership_end_date,
              joining_date: member.joining_date,
              status: member.status,
            });
          }
        });
      }

      // Sort by date
      events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

      return events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  // Check if phone number exists (for rejoin flow)
  async checkMemberByPhone(phone: string): Promise<MemberWithPeriods | null> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data: member, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .eq('phone', phone)
        .maybeSingle();

      if (error) throw error;
      if (!member) return null;

      // Get membership periods
      const { data: periods } = await supabase
        .from('gym_membership_periods')
        .select('*')
        .eq('member_id', member.id)
        .order('period_number', { ascending: false });

      const currentPeriod = periods?.find(p => p.status === 'active') || periods?.[0] || null;

      return {
        ...member,
        current_period: currentPeriod ? {
          id: currentPeriod.id,
          period_number: currentPeriod.period_number,
          plan_name: currentPeriod.plan_name,
          start_date: currentPeriod.start_date,
          end_date: currentPeriod.end_date,
          paid_amount: currentPeriod.paid_amount,
          status: currentPeriod.status,
        } : null,
        periods: (periods || []).map(p => ({
          id: p.id,
          period_number: p.period_number,
          plan_name: p.plan_name,
          start_date: p.start_date,
          end_date: p.end_date,
          paid_amount: p.paid_amount,
          status: p.status,
        })),
      };
    } catch (error) {
      console.error('Error checking member by phone:', error);
      return null;
    }
  }

  // Rejoin existing member
  async rejoinMember(memberId: string, planId: string, startDate: string, paidAmount: number, paymentMethod: string): Promise<boolean> {
    const startTime = performance.now();
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('gym_membership_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) throw new Error('Plan not found');

      // Get member current data
      const { data: member, error: memberError } = await supabase
        .from('gym_members')
        .select('total_periods, full_name')
        .eq('id', memberId)
        .single();

      if (memberError || !member) throw new Error('Member not found');

      // Calculate end date
      const totalMonths = (plan.base_duration_months || plan.duration_months) + (plan.bonus_duration_months || 0);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + totalMonths);
      const endDateStr = endDate.toISOString().split('T')[0];

      const nextPaymentDue = new Date(endDate);
      nextPaymentDue.setDate(nextPaymentDue.getDate() + 1);
      const nextPaymentDueStr = nextPaymentDue.toISOString().split('T')[0];

      const newPeriodNumber = (member.total_periods || 0) + 1;

      // Create new period
      const { data: period, error: periodError } = await supabase
        .from('gym_membership_periods')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          period_number: newPeriodNumber,
          plan_id: planId,
          plan_name: plan.name,
          plan_duration_months: totalMonths,
          plan_amount: plan.final_price || plan.price,
          bonus_months: plan.bonus_duration_months || 0,
          discount_amount: 0,
          paid_amount: paidAmount,
          start_date: startDate,
          end_date: endDateStr,
          next_payment_due: nextPaymentDueStr,
          status: 'active',
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Update member
      const { error: updateError } = await supabase
        .from('gym_members')
        .update({
          status: 'active',
          plan_id: planId,
          membership_plan: plan.name,
          plan_amount: plan.final_price || plan.price,
          joining_date: startDate,
          membership_end_date: endDateStr,
          next_payment_due_date: nextPaymentDueStr,
          current_period_id: period.id,
          total_periods: newPeriodNumber,
          lifetime_value: supabase.rpc('add_to_lifetime_value', { member_id: memberId, amount: paidAmount }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId);

      if (updateError) throw updateError;

      // Record payment
      await supabase
        .from('gym_payments')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          amount: paidAmount,
          payment_method: paymentMethod,
          payment_date: startDate,
          due_date: startDate,
          notes: `Rejoin - Period #${newPeriodNumber}`,
        });

      // Log successful rejoin
      const duration = performance.now() - startTime;
      auditLogger.logMemberRejoined(memberId, member.full_name, plan.name, paidAmount);
      auditLogger.logPaymentCreated(`rejoin-${memberId}-${Date.now()}`, memberId, member.full_name, paidAmount, paymentMethod);

      return true;
    } catch (error) {
      auditLogger.logError('MEMBER', 'member_rejoined', (error as Error).message, { memberId, planId });
      console.error('Error rejoining member:', error);
      throw error;
    }
  }

  // Get membership plans with promotional info
  async getMembershipPlans(): Promise<MembershipPlanWithPromo[]> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_membership_plans')
        .select('*')
        .eq('gym_id', gymId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      return (data || []).map(p => ({
        ...p,
        total_duration_months: (p.base_duration_months || p.duration_months) + (p.bonus_duration_months || 0),
      }));
    } catch (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
  }

  // Create promotional plan
  async createPromotionalPlan(planData: {
    name: string;
    description?: string;
    base_duration_months: number;
    bonus_duration_months: number;
    base_price: number;
    discount_type: 'none' | 'percentage' | 'flat';
    discount_value: number;
    promo_description?: string;
    highlight_text?: string;
    valid_from?: string;
    valid_until?: string;
    max_uses?: number;
  }): Promise<MembershipPlanWithPromo> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Calculate final price
      let finalPrice = planData.base_price;
      if (planData.discount_type === 'percentage') {
        finalPrice = planData.base_price * (1 - planData.discount_value / 100);
      } else if (planData.discount_type === 'flat') {
        finalPrice = planData.base_price - planData.discount_value;
      }

      const { data, error } = await supabase
        .from('gym_membership_plans')
        .insert({
          gym_id: gymId,
          name: planData.name,
          description: planData.description,
          duration_months: planData.base_duration_months,
          base_duration_months: planData.base_duration_months,
          bonus_duration_months: planData.bonus_duration_months,
          price: planData.base_price,
          base_price: planData.base_price,
          final_price: finalPrice,
          discount_type: planData.discount_type,
          discount_value: planData.discount_value,
          promo_type: planData.bonus_duration_months > 0 || planData.discount_type !== 'none' ? 'promotional' : 'standard',
          promo_description: planData.promo_description,
          highlight_text: planData.highlight_text,
          valid_from: planData.valid_from,
          valid_until: planData.valid_until,
          max_uses: planData.max_uses,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Log plan creation
      auditLogger.logPlanCreated(data.id, planData.name, {
        duration_months: planData.base_duration_months,
        bonus_months: planData.bonus_duration_months,
        price: finalPrice,
        discount_type: planData.discount_type,
      });

      return data;
    } catch (error) {
      auditLogger.logError('PLAN', 'plan_created', (error as Error).message, { planName: planData.name });
      console.error('Error creating plan:', error);
      throw error;
    }
  }

  // Add payment
  async addPayment(paymentData: {
    member_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    plan_duration_months?: number;
    notes?: string;
    member_name?: string;
  }): Promise<unknown> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    try {
      const { data, error } = await supabase
        .from('gym_payments')
        .insert({
          gym_id: gymId,
          member_id: paymentData.member_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date,
          notes: paymentData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Log payment creation
      auditLogger.logPaymentCreated(
        data.id,
        paymentData.member_id,
        paymentData.member_name || 'Unknown',
        paymentData.amount,
        paymentData.payment_method
      );

      return data;
    } catch (error) {
      auditLogger.logError('PAYMENT', 'payment_created', (error as Error).message, {
        member_id: paymentData.member_id,
        amount: paymentData.amount,
      });
      throw error;
    }
  }

  // Update member details
  async updateMember(memberId: string, updates: { full_name?: string; phone?: string }): Promise<void> {
    try {
      // Get old data for audit
      const { data: oldMember } = await supabase
        .from('gym_members')
        .select('full_name, phone')
        .eq('id', memberId)
        .single();

      const { error } = await supabase
        .from('gym_members')
        .update(updates)
        .eq('id', memberId);
      
      if (error) throw error;

      // Log member update
      auditLogger.logMemberUpdated(
        memberId,
        updates.full_name || oldMember?.full_name || 'Unknown',
        oldMember || {},
        updates
      );
    } catch (error) {
      auditLogger.logError('MEMBER', 'member_updated', (error as Error).message, { memberId, updates });
      throw error;
    }
  }

  // Update member status
  async updateMemberStatus(memberId: string, status: string): Promise<void> {
    try {
      // Get old data for audit
      const { data: member } = await supabase
        .from('gym_members')
        .select('full_name, status')
        .eq('id', memberId)
        .single();

      const { error } = await supabase
        .from('gym_members')
        .update({ status })
        .eq('id', memberId);
      
      if (error) throw error;

      // Log status change
      auditLogger.logMemberStatusChanged(
        memberId,
        member?.full_name || 'Unknown',
        member?.status || 'unknown',
        status
      );
    } catch (error) {
      auditLogger.logError('MEMBER', 'member_status_changed', (error as Error).message, { memberId, status });
      throw error;
    }
  }

  // Generate receipt
  async generateReceipt(paymentId: string): Promise<Receipt> {
    try {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get payment details
      const { data: payment, error: paymentError } = await supabase
        .from('gym_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) throw new Error('Payment not found');

      // Get member details
      const { data: member, error: memberError } = await supabase
        .from('gym_members')
        .select('full_name, phone, membership_plan, membership_end_date, next_payment_due_date')
        .eq('id', payment.member_id)
        .single();

      if (memberError || !member) throw new Error('Member not found');

      // Generate receipt number
      const { data: receiptNumber } = await supabase.rpc('generate_receipt_number', { p_gym_id: gymId });

      // Calculate validity dates (assuming payment was for current period)
      const paymentDate = new Date(payment.payment_date);
      const validFrom = paymentDate.toISOString().split('T')[0];
      const validUntil = member.membership_end_date || paymentDate.toISOString().split('T')[0];

      // Create receipt
      const { data: receipt, error: receiptError } = await supabase
        .from('gym_receipts')
        .insert({
          gym_id: gymId,
          payment_id: paymentId,
          member_id: payment.member_id,
          receipt_number: receiptNumber || `RCP-${Date.now()}`,
          member_name: member.full_name,
          member_phone: member.phone,
          plan_name: member.membership_plan,
          amount: payment.amount,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: payment.amount,
          payment_method: payment.payment_method,
          payment_date: payment.payment_date,
          valid_from: validFrom,
          valid_until: validUntil,
          next_due_date: member.next_payment_due_date,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Log receipt generation
      auditLogger.logReceiptGenerated(receipt.id, payment.member_id, member.full_name, payment.amount);

      return receipt;
    } catch (error) {
      auditLogger.logError('RECEIPT', 'receipt_generated', (error as Error).message, { paymentId });
      console.error('Error generating receipt:', error);
      throw error;
    }
  }

  // Send WhatsApp message (via wa.me link generation)
  generateWhatsAppLink(phone: string, message: string): string {
    // Clean phone number (remove spaces, dashes, etc.)
    let cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Add country code if not present (assuming India)
    if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
      cleanPhone = '91' + cleanPhone;
    } else if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }

  // Generate reminder message
  generateReminderMessage(memberName: string, type: 'expiry' | 'payment_due' | 'payment_overdue', details: {
    daysUntil?: number;
    daysOverdue?: number;
    amount?: number;
    planName?: string;
    gymName?: string;
  }): string {
    const gymName = details.gymName || 'our gym';

    switch (type) {
      case 'expiry':
        if (details.daysUntil === 0) {
          return `Hi ${memberName}! 🏋️\n\nYour gym membership at ${gymName} expires *TODAY*.\n\nPlease renew to continue enjoying our facilities.\n\nThank you! 🙏`;
        }
        return `Hi ${memberName}! 🏋️\n\nYour gym membership at ${gymName} expires in *${details.daysUntil} day(s)*.\n\nPlease renew before expiry to continue your fitness journey.\n\nThank you! 🙏`;

      case 'payment_due':
        return `Hi ${memberName}! 🏋️\n\nYour payment of ₹${details.amount?.toLocaleString('en-IN')} for ${details.planName} is due *today* at ${gymName}.\n\nPlease make the payment at your earliest convenience.\n\nThank you! 🙏`;

      case 'payment_overdue':
        return `Hi ${memberName}! 🏋️\n\nYour payment of ₹${details.amount?.toLocaleString('en-IN')} at ${gymName} is *${details.daysOverdue} day(s) overdue*.\n\nPlease clear your dues to continue your membership.\n\nThank you! 🙏`;

      default:
        return `Hi ${memberName}! 🏋️\n\nThis is a reminder from ${gymName}.\n\nThank you! 🙏`;
    }
  }
}

export const gymService = GymService.getInstance();
