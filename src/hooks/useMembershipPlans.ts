import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';

export function useMembershipPlans() {
  return useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .order('amount', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });
}
