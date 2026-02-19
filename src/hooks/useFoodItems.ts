import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foodItemService } from '@/lib/foodItemService';
import type { FoodItem } from '@/types/dietPlan';

export function useFoodItems() {
  return useQuery({
    queryKey: ['food-items'],
    queryFn: () => foodItemService.getFoodItems(),
    staleTime: 5 * 60_000, // 5 min — food items rarely change
  });
}

export function useAddFoodItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: Omit<FoodItem, 'id'>) => foodItemService.addFoodItem(item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['food-items'] }),
  });
}
