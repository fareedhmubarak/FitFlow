import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { workoutPlanService } from '@/lib/workoutPlanService';

export function useWorkoutPlans() {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['workout-plans', gym?.id],
    queryFn: () => workoutPlanService.getWorkoutPlans(),
    enabled: !!gym?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorkoutPlanDetail(planId?: string) {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['workout-plans', gym?.id, planId],
    queryFn: () => workoutPlanService.getWorkoutPlanById(planId!),
    enabled: !!gym?.id && !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWorkoutPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof workoutPlanService.createWorkoutPlan>[0]) =>
      workoutPlanService.createWorkoutPlan(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout-plans'] }),
  });
}

export function useDeleteWorkoutPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workoutPlanService.deleteWorkoutPlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout-plans'] }),
  });
}

export function useAssignWorkoutPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, planId, notes }: { memberId: string; planId: string; notes?: string }) =>
      workoutPlanService.assignWorkoutPlan(memberId, planId, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workout-assignments'] }),
  });
}

export function useMemberWorkoutAssignment(memberId?: string) {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['workout-assignments', gym?.id, memberId],
    queryFn: () => workoutPlanService.getMemberWorkoutAssignment(memberId!),
    enabled: !!gym?.id && !!memberId,
    staleTime: 5 * 60 * 1000,
  });
}
