import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';
import { auditLogger } from '../lib/auditLogger';

interface PaymentFormData {
  member_id: string;
  member_name?: string; // For audit logging
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

      // Log payment creation
      auditLogger.logPaymentCreated(
        data.id,
        paymentData.member_id,
        paymentData.member_name || 'Unknown',
        paymentData.amount,
        paymentData.payment_method
      );

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
    mutationFn: async ({ paymentId, memberName, amount }: { paymentId: string; memberName?: string; amount?: number }) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Get payment info before deleting
      const { data: payment } = await supabase
        .from('gym_payments')
        .select('member_id, amount')
        .eq('id', paymentId)
        .eq('gym_id', gymId)
        .single();

      const { error } = await supabase
        .from('gym_payments')
        .delete()
        .eq('id', paymentId)
        .eq('gym_id', gymId);

      if (error) throw error;

      // Log payment deletion
      auditLogger.logPaymentDeleted(
        paymentId,
        payment?.member_id || 'unknown',
        memberName || 'Unknown',
        amount || payment?.amount || 0
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-by-month'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}
