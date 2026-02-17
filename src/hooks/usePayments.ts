import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface PaymentsByDateResult {
  date: string;
  payments: any[];
  totalAmount: number;
  memberCount: number;
  statuses: {
    succeeded: number;
    pending: number;
    failed: number;
  };
}

export function usePaymentsByMonth(year: number, month: number) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['payments-by-month', user?.gym_id, year, month],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));

      const { data, error } = await supabase
        .from('gym_payments')
        .select(`
          *,
          member:gym_members(
            id,
            full_name,
            email,
            phone,
            photo_url
          )
        `)
        .eq('gym_id', gymId)
        .gte('due_date', format(start, 'yyyy-MM-dd'))
        .lte('due_date', format(end, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Group by date
      const paymentsByDate: Record<string, PaymentsByDateResult> = {};

      (data || []).forEach((payment) => {
        const date = payment.due_date;
        if (!paymentsByDate[date]) {
          paymentsByDate[date] = {
            date,
            payments: [],
            totalAmount: 0,
            memberCount: 0,
            statuses: { succeeded: 0, pending: 0, failed: 0 },
          };
        }

        paymentsByDate[date].payments.push(payment);
        paymentsByDate[date].totalAmount += Number(payment.amount);
        paymentsByDate[date].memberCount += 1;

        // Derive status from paid_date since gym_payments has no status column
        if (payment.paid_date) {
          paymentsByDate[date].statuses.succeeded += 1;
        } else {
          const today = format(new Date(), 'yyyy-MM-dd');
          if (payment.due_date < today) {
            paymentsByDate[date].statuses.failed += 1;
          } else {
            paymentsByDate[date].statuses.pending += 1;
          }
        }
      });

      return paymentsByDate;
    },
  });
}

export function usePaymentsByDate(date: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['payments-by-date', user?.gym_id, date],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_payments')
        .select(`
          *,
          member:gym_members(
            id,
            full_name,
            email,
            phone,
            photo_url
          )
        `)
        .eq('gym_id', gymId)
        .eq('due_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!date,
  });
}

export function usePayments() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['payments', user?.gym_id, 'all'],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_payments')
        .select(`
          *,
          member:gym_members(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data || [];
    },
  });
}

export function usePayment(paymentId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['payments', user?.gym_id, 'detail', paymentId],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_payments')
        .select(`
          *,
          member:gym_members(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('id', paymentId)
        .eq('gym_id', gymId)
        .single();

      if (error) throw error;

      return data;
    },
    enabled: !!paymentId,
  });
}
