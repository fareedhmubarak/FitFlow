/**
 * FitFlow E2E Test Configuration
 * 
 * This file contains test data, credentials, and helper functions
 * used across all E2E tests.
 */

// ============================================================================
// GYM CREDENTIALS - Each gym is completely isolated
// ============================================================================

export const GYMS = {
  RAMESH: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Ramesh Gym',
    email: 'ramesh@fitflow.demo',
    password: 'Demo@123',
    expectedMemberCount: 26,
  },
  SAMRIN: {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Samrin Gym',
    email: 'samrin@fitflow.demo',
    password: 'Demo@123',
    expectedMemberCount: 26,
  },
  ITHRIS: {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Ithris Gym',
    email: 'ithris@fitflow.demo',
    password: 'Demo@123',
    expectedMemberCount: 26,
  },
  NIZAM: {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Nizam Gym',
    email: 'nizam@fitflow.demo',
    password: 'Demo@123',
    expectedMemberCount: 26,
  },
  SHEIK: {
    id: '4528581b-8cca-4b01-bd29-ccc3abd5176d',
    name: "Sheik's Gym",
    email: 'sheik@fitflow.demo', // Update with actual email
    password: 'Demo@123',
    expectedMemberCount: 29,
  },
} as const;

// ============================================================================
// MEMBERSHIP PLANS
// ============================================================================

export const PLANS = {
  MONTHLY: { name: 'Monthly', price: 1000, months: 1 },
  QUARTERLY: { name: 'Quarterly', price: 2500, months: 3 },
  HALF_YEARLY: { name: 'Half Yearly', price: 4500, months: 6 },
  ANNUAL: { name: 'Annual', price: 9000, months: 12 },
} as const;

// ============================================================================
// TEST MEMBER DATA
// ============================================================================

export const TEST_MEMBERS = {
  NEW_MEMBER: {
    full_name: 'Test Member E2E',
    phone: '9999888877',
    email: 'test.e2e@example.com',
    gender: 'male',
    membership_plan: 'Quarterly',
  },
  EDIT_MEMBER: {
    full_name: 'Edit Test Member',
    phone: '8888777766',
    email: 'edit.test@example.com',
    gender: 'female',
    membership_plan: 'Monthly',
  },
} as const;

// ============================================================================
// API ENDPOINTS TO VERIFY
// ============================================================================

export const API_ENDPOINTS = {
  MEMBERS: '/rest/v1/gym_members',
  PAYMENTS: '/rest/v1/gym_payments',
  PLANS: '/rest/v1/gym_membership_plans',
  AUDIT_LOGS: '/rest/v1/audit_logs',
  DEBUG_LOGS: '/rest/v1/debug_logs',
} as const;

// ============================================================================
// SELECTORS - Common UI elements
// ============================================================================

export const SELECTORS = {
  // Auth
  LOGIN_EMAIL: 'input[type="email"]',
  LOGIN_PASSWORD: 'input[type="password"]',
  LOGIN_BUTTON: 'button:has-text("Sign In")',
  LOGOUT_BUTTON: 'button:has-text("Logout")',
  
  // Navigation
  NAV_HOME: 'a[href="/"]',
  NAV_MEMBERS: 'a[href="/members"]',
  NAV_CALENDAR: 'a[href="/calendar"]',
  NAV_PAYMENTS: 'a[href="/payments/records"]',
  NAV_SETTINGS: 'a[href="/settings"]',
  
  // Dashboard
  DASHBOARD_DUE_TODAY: 'text=DUE TODAY',
  DASHBOARD_OVERDUE: 'text=OVERDUE',
  DASHBOARD_COLLECTED: 'text=COLLECTED',
  DASHBOARD_PENDING: 'text=PENDING',
  DASHBOARD_ACTIVE: 'text=ACTIVE',
  
  // Members
  ADD_MEMBER_BUTTON: 'button:has-text("Add Member")',
  MEMBER_CARD: '[data-testid="member-card"]',
  MEMBER_NAME_INPUT: 'input[name="full_name"]',
  MEMBER_PHONE_INPUT: 'input[name="phone"]',
  MEMBER_EMAIL_INPUT: 'input[name="email"]',
  MEMBER_SAVE_BUTTON: 'button:has-text("Save")',
  
  // Payments
  PAYMENT_BUTTON: 'button:has-text("Payment")',
  PAYMENT_AMOUNT: 'input[type="number"]',
  RECORD_PAYMENT_BUTTON: 'button:has-text("Record Payment")',
  DELETE_PAYMENT_BUTTON: 'button:has-text("Delete")',
  CONFIRM_DELETE_BUTTON: 'button:has-text("Delete"):not(:has-text("Cancel"))',
  
  // Settings
  GYM_NAME_INPUT: 'input[name="gym_name"]',
  SAVE_SETTINGS_BUTTON: 'button:has-text("Save")',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate expected end date after payment
 */
export function calculateEndDate(dueDate: string, months: number): string {
  const [year, month, day] = dueDate.split('-').map(Number);
  const newMonth = month - 1 + months;
  const newYear = year + Math.floor(newMonth / 12);
  const finalMonth = (newMonth % 12) + 1;
  return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Format date for display comparison
 */
export function formatDateForDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
}

/**
 * Get today's date string
 */
export function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
