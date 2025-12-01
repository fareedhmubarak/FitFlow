import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';

interface PaymentFormData {
  member_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer';
  payment_date: string;
  due_date: string;
  notes?: string;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_payments')
        .insert({
          gym_id: gymId,
          member_id: paymentData.member_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date,
          due_date: paymentData.due_date,
          notes: paymentData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-by-month'] });
      queryClient.invalidateQueries({ queryKey: ['payments-by-date'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useUpdatePayment(paymentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: Partial<PaymentFormData>) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_payments')
        .update({
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date,
          due_date: paymentData.due_date,
          notes: paymentData.notes,
        })
        .eq('id', paymentId)
        .eq('gym_id', gymId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-by-month'] });
      queryClient.invalidateQueries({ queryKey: ['payments-by-date'] });
      queryClient.invalidateQueries({ queryKey: ['payment', paymentId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { error } = await supabase
        .from('gym_payments')
        .delete()
        .eq('id', paymentId)
        .eq('gym_id', gymId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-by-month'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}
