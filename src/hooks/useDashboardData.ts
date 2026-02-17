import { useQuery } from '@tanstack/react-query';
import { gymService } from '@/lib/gymService';
import { useAuthStore } from '@/stores/authStore';
import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * React Query hook for Dashboard data.
 * - Caches stats + events so navigating back is instant.
 * - staleTime 30 s avoids refetching on every re-mount.
 * - Manual refetch() available for pull-to-refresh.
 */
export function useDashboardStats() {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['dashboard-stats', gym?.id],
    queryFn: () => gymService.getEnhancedDashboardStats(),
    enabled: !!gym?.id,
    staleTime: 30_000,       // 30 s — dashboard data changes slowly
    gcTime: 5 * 60_000,      // keep in cache 5 min
    refetchOnWindowFocus: true,
  });
}

export function useDashboardEvents(currentMonth: Date) {
  const { gym } = useAuthStore();
  const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

  return useQuery({
    queryKey: ['dashboard-events', gym?.id, monthKey],
    queryFn: () =>
      gymService.getCalendarEvents(
        startOfMonth(currentMonth),
        endOfMonth(currentMonth),
      ),
    enabled: !!gym?.id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}
