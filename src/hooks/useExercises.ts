import { useQuery } from '@tanstack/react-query';
import { exerciseService } from '@/lib/exerciseService';

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: () => exerciseService.getExercises(),
    staleTime: 10 * 60_000, // 10 min — exercises rarely change
  });
}
