import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { settingsService } from '../lib/settingsService';

export function useMembershipPlans() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['membership-plans', user?.gym_id],
    queryFn: async () => {
      return await settingsService.getMembershipPlans();
    },
    staleTime: 5 * 60_000, // Plans rarely change — cache 5 min
  });
}
