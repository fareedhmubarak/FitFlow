import { supabase, getCurrentGymId } from './supabase';
import type { Expense, CreateExpenseInput, MonthlyPL, ExpenseCategory } from '@/types/expense';
import { auditLogger } from './auditLogger';

class ExpenseService {
  private static instance: ExpenseService;

  static getInstance(): ExpenseService {
    if (!ExpenseService.instance) {
      ExpenseService.instance = new ExpenseService();
    }
    return ExpenseService.instance;
  }

  async getExpenses(year: number, month: number): Promise<Expense[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) return [];

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day of month

    const { data, error } = await supabase
      .from('gym_expenses')
      .select('*')
      .eq('gym_id', gymId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return (data || []) as Expense[];
  }

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { data, error } = await supabase
      .from('gym_expenses')
      .insert({ gym_id: gymId, ...input })
      .select()
      .single();

    if (error) throw error;
    auditLogger.logExpenseCreated(data.id, input.category, input.amount, input.description);
    return data as Expense;
  }

  async updateExpense(id: string, input: Partial<CreateExpenseInput>): Promise<Expense> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { data, error } = await supabase
      .from('gym_expenses')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('gym_id', gymId)
      .select()
      .single();

    if (error) throw error;
    auditLogger.logExpenseUpdated(id, data.description || '', {}, input as Record<string, unknown>);
    return data as Expense;
  }

  async deleteExpense(id: string): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const { error } = await supabase
      .from('gym_expenses')
      .delete()
      .eq('id', id)
      .eq('gym_id', gymId);

    if (error) throw error;
    auditLogger.logExpenseDeleted(id, '', 0);
  }

  async getMonthlyPL(year: number, month: number): Promise<MonthlyPL> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // Get income from payments
    const { data: payments, error: payError } = await supabase
      .from('gym_payments')
      .select('amount')
      .eq('gym_id', gymId)
      .eq('status', 'succeeded')
      .gte('paid_at', `${startDate}T00:00:00`)
      .lte('paid_at', `${endDate}T23:59:59`);

    if (payError) throw payError;

    const totalIncome = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    // Get expenses
    const { data: expenses, error: expError } = await supabase
      .from('gym_expenses')
      .select('amount, category')
      .eq('gym_id', gymId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (expError) throw expError;

    const expensesByCategory: Record<ExpenseCategory, number> = {
      rent: 0, electricity: 0, salary: 0, equipment: 0,
      maintenance: 0, marketing: 0, supplements: 0, other: 0,
    };

    let totalExpenses = 0;
    for (const exp of expenses || []) {
      totalExpenses += exp.amount || 0;
      const cat = exp.category as ExpenseCategory;
      if (cat in expensesByCategory) {
        expensesByCategory[cat] += exp.amount || 0;
      }
    }

    return {
      month,
      year,
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      expensesByCategory,
    };
  }
}

export const expenseService = ExpenseService.getInstance();
