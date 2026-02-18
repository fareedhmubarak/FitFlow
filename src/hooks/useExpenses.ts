import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { expenseService } from '@/lib/expenseService';
import type { CreateExpenseInput } from '@/types/expense';

export function useExpenses(year: number, month: number) {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['expenses', gym?.id, year, month],
    queryFn: () => expenseService.getExpenses(year, month),
    enabled: !!gym?.id,
    staleTime: 30_000,
  });
}

export function useMonthlyPL(year: number, month: number) {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['monthly-pl', gym?.id, year, month],
    queryFn: () => expenseService.getMonthlyPL(year, month),
    enabled: !!gym?.id,
    staleTime: 30_000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExpenseInput) => expenseService.createExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-pl'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateExpenseInput> }) =>
      expenseService.updateExpense(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-pl'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expenseService.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-pl'] });
    },
  });
}
