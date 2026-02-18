import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { dietPlanService } from '@/lib/dietPlanService';
import type { CreateDietPlanInput } from '@/types/dietPlan';

export function useDietPlans() {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['diet-plans', gym?.id],
    queryFn: () => dietPlanService.getDietPlans(),
    enabled: !!gym?.id,
    staleTime: 60_000,
  });
}

export function useDietPlanDetail(planId: string | undefined) {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['diet-plan', gym?.id, planId],
    queryFn: () => dietPlanService.getDietPlanById(planId!),
    enabled: !!gym?.id && !!planId,
    staleTime: 60_000,
  });
}

export function useCreateDietPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDietPlanInput) => dietPlanService.createDietPlan(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diet-plans'] }),
  });
}

export function useDeleteDietPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dietPlanService.deleteDietPlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diet-plans'] }),
  });
}

export function useAssignDietPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, planId, notes }: { memberId: string; planId: string; notes?: string }) =>
      dietPlanService.assignDietPlan(memberId, planId, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member-diet'] }),
  });
}

export function useMemberDietAssignment(memberId: string | undefined) {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['member-diet', gym?.id, memberId],
    queryFn: () => dietPlanService.getMemberDietAssignment(memberId!),
    enabled: !!gym?.id && !!memberId,
    staleTime: 60_000,
  });
}
