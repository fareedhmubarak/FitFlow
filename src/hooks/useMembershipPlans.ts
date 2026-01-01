import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';
import { settingsService } from '../lib/settingsService';

export function useMembershipPlans() {
  return useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      return await settingsService.getMembershipPlans();
    },
  });
}
