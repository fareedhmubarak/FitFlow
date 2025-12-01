/**
 * Database Type Definitions
 * Auto-generated types for type-safe database operations
 */

// ============================================
// TABLE TYPES
// ============================================

export interface GymGym {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  language: 'en' | 'te' | 'ta' | 'hi';
  timezone: string;
  currency: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GymUser {
  id: string;
  gym_id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'owner' | 'staff';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GymMember {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  gender: 'male' | 'female' | 'other' | null;
  height: string | null;
  weight: string | null;
  photo_url: string | null;
  joining_date: string; // Date string
  membership_plan: 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  plan_amount: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface GymPayment {
  id: string;
  gym_id: string;
  member_id: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'card' | 'bank_transfer';
  payment_date: string; // Date string
  due_date: string; // Date string
  days_late: number;
  notes: string | null;
  receipt_number: string | null;
  created_at: string;
}

export interface GymPaymentSchedule {
  id: string;
  gym_id: string;
  member_id: string;
  due_date: string; // Date string
  amount_due: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// JOINED TYPES (with relations)
// ============================================

export interface PaymentWithMember extends GymPayment {
  gym_members: Pick<GymMember, 'id' | 'full_name' | 'phone' | 'photo_url'> | null;
}

export interface PaymentScheduleWithMember extends GymPaymentSchedule {
  gym_members: Pick<GymMember, 'id' | 'full_name' | 'phone' | 'photo_url' | 'membership_plan'> | null;
}

// ============================================
// FUNCTION RETURN TYPES
// ============================================

export interface CalendarDataRow {
  due_date: string;
  member_id: string;
  member_name: string;
  member_photo: string | null;
  amount_due: number;
  payment_status: 'paid' | 'upcoming' | 'due_today' | 'overdue' | 'overdue_multiple';
  days_overdue: number;
}

export interface DashboardStats {
  total_members: {
    active: number;
    inactive: number;
    total: number;
  };
  due_today: {
    count: number;
    amount: number;
    members: Array<{
      id: string;
      name: string;
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
      photo: string | null;
      amount: number;
      due_date: string;
      days_overdue: number;
    }>;
  };
  revenue_this_month: number;
}

// ============================================
// INPUT TYPES (for creates/updates)
// ============================================

export interface CreateMemberInput {
  full_name: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  height?: string;
  weight?: string;
  photo_url?: string;
  joining_date: string;
  membership_plan: 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  plan_amount: number;
  status?: 'active' | 'inactive';
}

export interface UpdateMemberInput {
  full_name?: string;
  phone?: string;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  height?: string;
  weight?: string;
  photo_url?: string;
  joining_date?: string;
  membership_plan?: 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  plan_amount?: number;
  status?: 'active' | 'inactive';
}

export interface CreatePaymentInput {
  member_id: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'card' | 'bank_transfer';
  payment_date: string;
  due_date: string;
  notes?: string;
}

export interface UpdateGymInput {
  name?: string;
  email?: string;
  phone?: string;
  language?: 'en' | 'te' | 'ta' | 'hi';
  timezone?: string;
  currency?: string;
  logo_url?: string;
}

// ============================================
// FILTER TYPES
// ============================================

export interface MemberFilters {
  status?: 'active' | 'inactive';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PaymentFilters {
  memberId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface PaymentScheduleFilters {
  memberId?: string;
  year?: number;
  month?: number;
  status?: 'pending' | 'paid' | 'overdue';
}

// ============================================
// UTILITY TYPES
// ============================================

export type MembershipPlan = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
export type MemberStatus = 'active' | 'inactive';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer';
export type PaymentScheduleStatus = 'pending' | 'paid' | 'overdue';
export type Language = 'en' | 'te' | 'ta' | 'hi';

// Plan duration mapping
export const PLAN_DURATIONS: Record<MembershipPlan, number> = {
  monthly: 30,
  quarterly: 90,
  half_yearly: 180,
  annual: 365
};
