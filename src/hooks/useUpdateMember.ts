import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentGymId } from '../lib/supabase';
import { auditLogger } from '../lib/auditLogger';

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

      // Get old data for audit
      const { data: oldMember } = await supabase
        .from('gym_members')
        .select('*')
        .eq('id', memberId)
        .eq('gym_id', gymId)
        .single();

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

      // Log member update
      auditLogger.logMemberUpdated(
        memberId,
        data.full_name,
        oldMember || {},
        memberData
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['members', 'detail', memberId] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, memberName }: { memberId: string; memberName?: string }) => {
      const gymId = await getCurrentGymId();
      if (!gymId) throw new Error('No gym ID found');

      // Run both soft-deletes in PARALLEL for faster execution
      const [memberResult, scheduleResult] = await Promise.all([
        // Soft delete member
        supabase
          .from('gym_members')
          .update({ status: 'deleted' })
          .eq('id', memberId)
          .eq('gym_id', gymId),
        // Soft delete related payment schedules
        supabase
          .from('gym_payment_schedule')
          .update({ status: 'deleted' })
          .eq('member_id', memberId)
          .eq('gym_id', gymId)
      ]);

      if (memberResult.error) throw memberResult.error;
      // Schedule deletion is non-critical, just log if it fails
      if (scheduleResult.error) {
        console.warn('Failed to delete payment schedules:', scheduleResult.error);
      }

      // Log member deletion
      auditLogger.logMemberDeleted(memberId, memberName || 'Unknown');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
