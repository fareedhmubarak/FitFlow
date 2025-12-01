// Database types for FitFlow Gym Management System
// Aligned with gym_ prefix schema

// ==========================================
// CORE TYPES
// ==========================================

export type Language = 'en' | 'te' | 'ta' | 'hi';
export type MembershipPlan = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
export type MemberStatus = 'active' | 'inactive';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
export type PaymentScheduleStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'skipped';
export type Gender = 'male' | 'female' | 'other';
export type UserRole = 'owner' | 'staff';

// ==========================================
// TABLE INTERFACES
// ==========================================

export interface Gym {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  language: Language;
  timezone: string;
  currency: string;
  logo_url?: string | null;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GymUser {
  id: string;
  gym_id: string;
  auth_user_id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  role: UserRole;
  is_active: boolean;
  permissions?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  gym_id: string;
  member_number?: string | null;
  full_name: string;
  phone: string;
  email?: string | null;
  date_of_birth?: string | Date | null;
  gender?: Gender | null;
  height?: string | null; // e.g., "5'10" or "178cm"
  weight?: string | null; // e.g., "75kg"
  photo_url?: string | null;
  qr_code?: string | null;

  // Address fields
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;

  // Additional member information
  tags?: string[] | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  blood_group?: string | null;
  medical_conditions?: string | null;
  preferred_language?: string | null;

  // Membership tracking fields
  status: MemberStatus;
  membership_start_date?: string | null;
  membership_end_date?: string | null;
  next_payment_due_date?: string | null;

  // Payment tracking
  total_payments_received?: number;
  last_payment_date?: string | null;
  last_payment_amount?: number;

  // Original fields for compatibility
  joining_date: string; // DATE (CRITICAL for all calculations)
  membership_plan: MembershipPlan;
  plan_amount: number; // DECIMAL(10,2)

  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  subscription_id?: string | null;

  amount: number;
  currency: string;

  // Payment details
  status: PaymentStatus;
  payment_method: PaymentMethod;
  last4?: string | null;

  // Stripe/Razorpay integration
  stripe_payment_intent_id?: string | null;
  stripe_invoice_id?: string | null;
  stripe_charge_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;

  // Receipt and invoicing
  receipt_url?: string | null;
  invoice_number?: string | null;

  description?: string | null;

  // Dates
  due_date?: string | null; // DATE
  paid_at?: string | null; // TIMESTAMPTZ
  refunded_at?: string | null; // TIMESTAMPTZ
  refund_amount?: number | null;
  refund_reason?: string | null;

  // New membership system fields
  payment_type?: 'membership' | 'late_fee' | 'penalty' | 'upgrade' | 'other';
  extends_membership_to?: string | null; // New end date after this payment
  payment_schedule_id?: string | null;

  // Flags
  is_active?: boolean;
  automatically_generated?: boolean;

  created_at: string;
}

export interface PaymentSchedule {
  id: string;
  gym_id: string;
  member_id: string;

  // Schedule details
  schedule_date: string; // DATE
  amount: number;
  status: PaymentScheduleStatus;

  // Payment details
  payment_id?: string | null;
  paid_at?: string | null; // TIMESTAMPTZ
  late_fee_applied?: number;
  grace_period_end?: Date | null;

  // Membership extension details
  extends_membership_from?: Date | null;
  extends_membership_to?: Date | null;
  membership_plan?: MembershipPlan;

  created_at: string;
  updated_at: string;
}

// ==========================================
// EXTENDED TYPES WITH RELATIONS
// ==========================================

export interface MemberWithNextDue extends Member {
  next_due_date?: string;
  next_amount_due?: number;
  next_payment_status?: PaymentScheduleStatus;
  days_until_due?: number;
}

export interface PaymentWithMember extends Payment {
  member: Member;
}

export interface PaymentScheduleWithMember extends PaymentSchedule {
  member: Member;
}

// ==========================================
// DASHBOARD STATS (from get_dashboard_stats function)
// ==========================================

export interface DashboardStats {
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
  total_members: {
    active: number;
    inactive: number;
    total: number;
  };
  revenue_this_month: number;
}

// ==========================================
// CALENDAR DATA (from get_calendar_data function)
// ==========================================

export type CalendarPaymentStatus = 
  | 'paid'
  | 'upcoming'
  | 'due_today'
  | 'overdue'
  | 'overdue_multiple';

export interface CalendarDayData {
  due_date: string;
  member_id: string;
  member_name: string;
  member_photo: string | null;
  amount_due: number;
  payment_status: CalendarPaymentStatus;
  days_overdue: number;
}

// Group calendar data by date
export interface CalendarDataByDate {
  [date: string]: CalendarDayData[];
}

// ==========================================
// FORM TYPES
// ==========================================

export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  gymName: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface MemberFormData {
  full_name: string;
  phone: string;
  email?: string;
  gender?: Gender;
  height?: string;
  weight?: string;
  joining_date: string;
  membership_plan: MembershipPlan;
  plan_amount: number;
  photo_url?: string;
  preferred_language?: string;
  status?: 'active' | 'inactive';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface MemberForm extends MemberFormData {
  id?: string;
  date_of_birth?: string | Date | null;
  tags?: string[] | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  blood_group?: string | null;
  medical_conditions?: string | null;
  subscriptionData?: Record<string, unknown>;
}

export interface PaymentFormData {
  member_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  due_date: string;
  notes?: string;
}

export interface GymSettingsFormData {
  name: string;
  email?: string;
  phone?: string;
  language: Language;
  logo_url?: string;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// FILTER & SORT TYPES
// ==========================================

export interface MemberFilters {
  status?: MemberStatus;
  membership_plan?: MembershipPlan;
  search?: string; // Search by name or phone
}

export type MemberSortField = 'full_name' | 'joining_date' | 'plan_amount';
export type SortDirection = 'asc' | 'desc';

export interface PaymentFilters {
  member_id?: string;
  payment_method?: PaymentMethod;
  date_from?: string;
  date_to?: string;
}

// ==========================================
// MEMBERSHIP PLAN CONSTANTS
// ==========================================

export const MEMBERSHIP_PLANS: Record<MembershipPlan, { label: string; days: number; defaultAmount: number }> = {
  monthly: { label: 'Monthly', days: 30, defaultAmount: 1000 },
  quarterly: { label: 'Quarterly (3 months)', days: 90, defaultAmount: 2500 },
  half_yearly: { label: 'Half Yearly (6 months)', days: 180, defaultAmount: 5000 },
  annual: { label: 'Annual (12 months)', days: 365, defaultAmount: 7500 },
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
};

export const LANGUAGES: Record<Language, string> = {
  en: 'English',
  te: 'Telugu',
  ta: 'Tamil',
  hi: 'Hindi',
};

// ==========================================
// UTILITY TYPES
// ==========================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Make all fields optional (for partial updates)
export type PartialUpdate<T> = Partial<T>;

// Omit certain fields (for forms)
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
