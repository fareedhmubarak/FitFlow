export type ExpenseCategory =
  | 'rent'
  | 'electricity'
  | 'salary'
  | 'equipment'
  | 'maintenance'
  | 'marketing'
  | 'supplements'
  | 'other';

export type ExpensePaymentMethod = 'cash' | 'upi' | 'bank_transfer';

export interface Expense {
  id: string;
  gym_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  receipt_image_url?: string | null;
  is_recurring: boolean;
  recurring_day?: number | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  receipt_image_url?: string | null;
  is_recurring?: boolean;
  recurring_day?: number | null;
  notes?: string | null;
}

export interface MonthlyPL {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  expensesByCategory: Record<ExpenseCategory, number>;
}

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; emoji: string }> = {
  rent: { label: 'Rent', emoji: '🏠' },
  electricity: { label: 'Electricity', emoji: '⚡' },
  salary: { label: 'Salary', emoji: '💰' },
  equipment: { label: 'Equipment', emoji: '🏋️' },
  maintenance: { label: 'Maintenance', emoji: '🔧' },
  marketing: { label: 'Marketing', emoji: '📢' },
  supplements: { label: 'Supplements', emoji: '💊' },
  other: { label: 'Other', emoji: '📦' },
};

export const EXPENSE_PAYMENT_METHODS: Record<ExpensePaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
};
