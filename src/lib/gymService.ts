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
    uniqueMembersPaid: number;
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
  event_date: string; // Joining date day (for calendar positioning)
  event_type: 'expiry' | 'payment_due' | 'birthday' | 'joined' | 'payment';
  event_title: string;
  amount: number | null;
  plan_name: string | null;
  urgency: 'overdue' | 'today' | 'upcoming' | 'future' | 'info';
  // Additional member details for popup
  membership_end_date?: string;
  joining_date?: string;
  next_payment_due_date?: string; // Actual payment due date (for dashboard filtering)
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
      
      // Unique members who paid this month (for Paid card)
      const uniqueMembersPaidThisMonth = new Set(monthPayments?.map(p => p.member_id) || []).size;

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
          uniqueMembersPaid: uniqueMembersPaidThisMonth, // Count of unique members who paid this month
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
        thisMonth: { totalCollections: 0, newMembers: 0, renewals: 0, uniqueMembersPaid: 0, churned: 0 },
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

      // Use local date formatting to avoid timezone issues with toISOString()
      // toISOString() converts to UTC which can shift dates backwards in timezones ahead of UTC
      const formatLocalDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startStr = formatLocalDate(startDate);
      const endStr = formatLocalDate(endDate);
      const today = formatLocalDate(new Date());

      const events: CalendarEvent[] = [];

      // HELPER: Format date for display
      const formatDisplayDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      };

      // 1. Get ALL active members to ensure everyone appears on the calendar
      // We anchor them to their JOINING DATE (Day of month)
      const { data: activeMembers } = await supabase
        .from('gym_members')
        .select('id, full_name, phone, photo_url, membership_plan, plan_amount, membership_end_date, next_payment_due_date, joining_date, status, last_payment_date')
        .eq('gym_id', gymId)
        .eq('status', 'active');

      if (activeMembers) {
        // Debug: Count members who joined on the 1st
        const membersOn1st = activeMembers.filter(m => {
          if (!m.joining_date) return false;
          const joinDate = new Date(m.joining_date);
          return joinDate.getDate() === 1;
        });
        console.log(`[Calendar] Total active members: ${activeMembers.length}, Members who joined on 1st: ${membersOn1st.length}`);
        
        activeMembers.forEach(m => {
          // Calculate the "Anchor Date" for this month based on joining_date
          try {
            if (!m.joining_date) return;
            
            const joinDate = new Date(m.joining_date);
            const anchorDay = joinDate.getDate(); // 1-31
            
            // Create date for the current view month
            // We use the startDate's month/year as the target view
            const viewDate = new Date(startDate);
            const targetYear = viewDate.getFullYear();
            const targetMonth = viewDate.getMonth();
            
            // Construct the anchor date for this month
            const anchorDateObj = new Date(targetYear, targetMonth, anchorDay);
            
            // Handle day overflow (e.g. Feb 30 -> Mar 2)
            if (anchorDateObj.getMonth() !== targetMonth) {
               // Clamp to end of month (e.g. Feb 28/29)
               anchorDateObj.setDate(0); 
            }
            
            const anchorDateStr = formatLocalDate(anchorDateObj);
            
            // Debug: Log date calculations for members who joined on 1st
            if (anchorDay === 1) {
              console.log(`[Calendar Debug] Member: ${m.full_name}, joining_date: ${m.joining_date}, anchorDay: ${anchorDay}, anchorDateStr: ${anchorDateStr}, startStr: ${startStr}, endStr: ${endStr}, inRange: ${anchorDateStr >= startStr && anchorDateStr <= endStr}`);
            }
            
            // Only add if it falls within the requested range
            if (anchorDateStr >= startStr && anchorDateStr <= endStr) {
              
              // Determine Status & Urgency
              let eventType: CalendarEvent['event_type'] = 'payment_due';
              let urgency: CalendarEvent['urgency'] = 'info';
              let title = '';
              
              const dueDate = m.next_payment_due_date;
              const endDate = m.membership_end_date;
              const planType = m.membership_plan?.toLowerCase() || '';
              const isMultiMonthPlan = ['quarterly', 'half_yearly', 'annual'].includes(planType);
              
              // Normalize dates for comparison (remove time components)
              const dueDateNormalized = dueDate ? dueDate.split('T')[0] : null;
              const endDateNormalized = endDate ? endDate.split('T')[0] : null;
              
              // Check if multi-month plan member has already paid (should show green)
              // Criteria: 3/6/12 month plan + membership still active + has payment record
              const isPaidMultiMonth = isMultiMonthPlan && 
                                      endDateNormalized && 
                                      endDateNormalized >= today &&
                                      m.last_payment_date !== null;
              
              // Logic to determine what to show on the card
              // Priority: Paid multi-month plans (GREEN) > Due Today > Overdue > Expires Today > Due Later > Expired > Active
              // IMPORTANT: "Due Today" takes priority over "Expired" - if payment is due today, show it even if membership expired
              if (isPaidMultiMonth) {
                // PAID MULTI-MONTH PLAN (Green) - Already paid for current period
                eventType = 'payment';
                urgency = 'info';
                title = m.membership_plan ? `${m.membership_plan.charAt(0).toUpperCase() + m.membership_plan.slice(1)} Plan` : 'Active';
              } else if (dueDateNormalized === today) {
                // DUE TODAY - Check this BEFORE overdue/expired to ensure it shows even if membership expired
                eventType = 'payment_due';
                urgency = 'today';
                title = 'Due Today';
              } else if (dueDateNormalized && dueDateNormalized < today) {
                // OVERDUE
                eventType = 'payment_due';
                urgency = 'overdue';
                title = `Overdue: ${formatDisplayDate(dueDate)}`;
              } else if (endDateNormalized === today) {
                 // EXPIRES TODAY
                 eventType = 'expiry';
                 urgency = 'today';
                 title = 'Expires Today';
              } else if (dueDateNormalized && dueDateNormalized >= startStr && dueDateNormalized <= endStr) {
                // DUE LATER THIS MONTH
                eventType = 'payment_due';
                urgency = 'upcoming';
                title = `Due: ${formatDisplayDate(dueDate)}`;
              } else if (endDateNormalized && endDateNormalized < today) {
                // EXPIRED (only if not due today)
                eventType = 'expiry';
                urgency = 'overdue';
                title = `Expired: ${formatDisplayDate(endDate)}`;
              } else {
                // ACTIVE / REGULAR MEMBER (Info)
                eventType = 'payment_due';
                urgency = 'info';
                title = m.membership_plan ? `${m.membership_plan.charAt(0).toUpperCase() + m.membership_plan.slice(1)} Plan` : 'Active';
              }

              // ALWAYS use anchor date (joining date day) for event_date
              // Members appear on the same day of month as their joining date
              const eventDate = anchorDateStr;

              events.push({
                id: `status-${m.id}-${eventDate}`,
                member_id: m.id,
                member_name: m.full_name,
                member_phone: m.phone,
                photo_url: m.photo_url,
                event_date: eventDate, // Joining date day (for calendar positioning)
                event_type: eventType,
                event_title: title,
                amount: m.plan_amount,
                plan_name: m.membership_plan,
                urgency: urgency,
                membership_end_date: m.membership_end_date,
                joining_date: m.joining_date,
                next_payment_due_date: m.next_payment_due_date, // Actual due date (for dashboard filtering)
                status: m.status,
              });
              
              // Debug: Log events for Jan 1st
              if (eventDate === '2026-01-01') {
                console.log(`[Calendar] Created event for ${m.full_name} on ${eventDate}, urgency: ${urgency}, type: ${eventType}`);
              }
            }
          } catch (e) {
            console.error('Error processing member for calendar:', m.id, e);
          }
        });
        
        // Debug: Count events for Jan 1st
        const eventsOnJan1 = events.filter(e => e.event_date === '2026-01-01');
        console.log(`[Calendar] Total events created: ${events.length}, Events on Jan 1st: ${eventsOnJan1.length}`);
      }

      // NOTE: Payment transaction events are intentionally NOT added here.
      // Members are shown ONLY on their joining date anchor to prevent duplicate/displaced appearances.
      // Payment history can be viewed in member details popup.

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
        .eq('gym_id', gymId)
        .single();

      if (planError || !plan) throw new Error('Plan not found');

      // Get member current data
      const { data: member, error: memberError } = await supabase
        .from('gym_members')
        .select('total_periods, full_name, lifetime_value')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

      if (memberError || !member) throw new Error('Member not found');

      // Calculate end date - parse date parts to avoid timezone issues
      const totalMonths = (plan.base_duration_months || plan.duration_months) + (plan.bonus_duration_months || 0);
      const [year, month, day] = startDate.split('-').map(Number);
      
      // Next due date is exactly N months from start date (same day number)
      const nextDueDate = new Date(year, month - 1 + totalMonths, day);
      const nextDueDateStr = `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, '0')}-${String(nextDueDate.getDate()).padStart(2, '0')}`;
      
      // Membership end date is 1 day before next due date
      const membershipEndDate = new Date(nextDueDate);
      membershipEndDate.setDate(membershipEndDate.getDate() - 1);
      const endDateStr = `${membershipEndDate.getFullYear()}-${String(membershipEndDate.getMonth() + 1).padStart(2, '0')}-${String(membershipEndDate.getDate()).padStart(2, '0')}`;

      // DEBUG: Log the calculated dates
      console.log('🔥 GYMSERVICE REJOIN DEBUG:', {
        startDate,
        year, month, day,
        totalMonths,
        endDateStr,
        nextDueDateStr
      });

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
          next_payment_due: nextDueDateStr,
          status: 'active',
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Update member — set dates to START DATE so the DB trigger
      // calculates the correct next_payment_due_date from scratch.
      // If we set them to the final calculated date, the trigger would
      // add ANOTHER N months on top → double-counting bug!
      const { error: updateError } = await supabase
        .from('gym_members')
        .update({
          status: 'active',
          plan_id: planId,
          membership_plan: plan.name,
          plan_amount: plan.final_price || plan.price,
          joining_date: startDate,
          membership_end_date: startDate,       // Trigger will recalculate
          next_payment_due_date: startDate,     // Trigger will recalculate
          current_period_id: period.id,
          total_periods: newPeriodNumber,
          // Don't set lifetime_value here — trigger adds payment.amount automatically
          last_payment_date: startDate,
          last_payment_amount: paidAmount,
          deactivated_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .eq('gym_id', gymId);

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
          due_date: paymentData.payment_date,  // Required for schedule trigger matching
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
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get old data for audit
      const { data: oldMember } = await supabase
        .from('gym_members')
        .select('full_name, phone')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

      const { error } = await supabase
        .from('gym_members')
        .update(updates)
        .eq('id', memberId)
        .eq('gym_id', gymId);
      
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
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get old data for audit
      const { data: member } = await supabase
        .from('gym_members')
        .select('full_name, status')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

      const { error } = await supabase
        .from('gym_members')
        .update({ status })
        .eq('id', memberId)
        .eq('gym_id', gymId);
      
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
        .eq('gym_id', gymId)
        .single();

      if (paymentError || !payment) throw new Error('Payment not found');

      // Get member details
      const { data: member, error: memberError } = await supabase
        .from('gym_members')
        .select('full_name, phone, membership_plan, membership_end_date, next_payment_due_date')
        .eq('id', payment.member_id)
        .eq('gym_id', gymId)
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
