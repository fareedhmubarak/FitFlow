import { useQuery } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Member } from '../types/database';

interface UseMembersFilters {
  status?: string;
  planId?: string;
  search?: string;
}

export function useMembers(filters?: UseMembersFilters) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['members', user?.gym_id, filters],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      let query = supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,member_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Member[];
    },
  });
}

export function useMember(memberId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['members', user?.gym_id, 'detail', memberId],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

      if (error) throw error;

      return data as Member;
    },
    enabled: !!memberId,
  });
}

export function useMemberPayments(memberId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['payments', user?.gym_id, 'member', memberId],
    queryFn: async () => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_payments')
        .select('*')
        .eq('member_id', memberId)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!memberId,
  });
}

// useMemberCheckIns is defined in useCheckIn.ts — import from there
// Re-export for backward compatibility
export { useMemberCheckIns } from './useCheckIn';
