import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutPlanService } from '@/lib/workoutPlanService';

export function useWorkoutPlans() {
  return useQuery({
    queryKey: ['workout-plans'],
    queryFn: () => workoutPlanService.getWorkoutPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWorkoutPlanDetail(planId?: string) {
  return useQuery({
    queryKey: ['workout-plans', planId],
    queryFn: () => workoutPlanService.getWorkoutPlanById(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWorkoutPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workoutPlanService.createWorkoutPlan.bind(workoutPlanService),
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
  return useQuery({
    queryKey: ['workout-assignments', memberId],
    queryFn: () => workoutPlanService.getMemberWorkoutAssignment(memberId!),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  });
}
