import { useQuery } from '@tanstack/react-query';
import { gymService } from '@/lib/gymService';
import { useAuthStore } from '@/stores/authStore';
import { startOfMonth, endOfMonth } from 'date-fns';
import { supabase, getCurrentGymId } from '@/lib/supabase';
import type { Member } from '@/types/database';

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
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,      // keep in cache 5 min
    refetchOnWindowFocus: false,
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
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch members whose birthday is today (month+day match).
 */
export function useBirthdayMembers() {
  const { gym } = useAuthStore();
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  return useQuery({
    queryKey: ['birthday-members', gym?.id, month, day],
    queryFn: async (): Promise<Member[]> => {
      const gymId = await getCurrentGymId();
      if (!gymId) return [];

      // Supabase doesn't support EXTRACT on date columns via JS client,
      // so we fetch active members with a date_of_birth and filter client-side.
      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .in('status', ['active', 'frozen'])
        .not('date_of_birth', 'is', null);

      if (error) throw error;

      return (data || []).filter((m: any) => {
        if (!m.date_of_birth) return false;
        const dob = new Date(m.date_of_birth);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
      }) as Member[];
    },
    enabled: !!gym?.id,
    staleTime: 60_000 * 60, // birthdays change once a day
    gcTime: 60_000 * 60,
  });
}

/**
 * Fetch members with birthdays in the next N days.
 */
export function useUpcomingBirthdays(daysAhead: number = 7) {
  const { gym } = useAuthStore();

  return useQuery({
    queryKey: ['upcoming-birthdays', gym?.id, daysAhead],
    queryFn: async (): Promise<Member[]> => {
      const gymId = await getCurrentGymId();
      if (!gymId) return [];

      const { data, error } = await supabase
        .from('gym_members')
        .select('*')
        .eq('gym_id', gymId)
        .in('status', ['active', 'frozen'])
        .not('date_of_birth', 'is', null);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return (data || []).filter((m: any) => {
        if (!m.date_of_birth) return false;
        const dob = new Date(m.date_of_birth);
        // Use current year for comparison
        const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        // If birthday already passed this year, check next year
        if (thisYearBday < today) {
          thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
        }
        const diffDays = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= daysAhead;
      }) as Member[];
    },
    enabled: !!gym?.id,
    staleTime: 60_000 * 60,
    gcTime: 60_000 * 60,
  });
}
