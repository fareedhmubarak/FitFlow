import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';

// Types (inline to avoid import issues)
type MembershipPlan = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
type Gender = 'male' | 'female' | 'other';
type MemberStatus = 'active' | 'inactive';

interface MemberFormData {
  full_name?: string;
  phone?: string;
  email?: string;
  gender?: Gender;
  height?: string;
  weight?: string;
  status?: MemberStatus;
}

export function useUpdateMember(memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData: Partial<MemberFormData>) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_members')
        .update({
          full_name: memberData.full_name,
          email: memberData.email,
          phone: memberData.phone,
          gender: memberData.gender,
          height: memberData.height,
          weight: memberData.weight,
          status: memberData.status,
        })
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      const { error } = await supabase
        .from('gym_members')
        .delete()
        .eq('id', memberId)
        .eq('gym_id', gymId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
