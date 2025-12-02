import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { auditLogger } from '../lib/auditLogger';

export interface CheckIn {
  id: string;
  gym_id: string;
  member_id: string;
  check_in_time: string;
  check_out_time: string | null;
  check_in_method: 'qr_code' | 'manual' | 'card';
  notes: string | null;
  created_at: string;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    membership_status: string;
  };
}

export type CheckInMethod = 'qr_code' | 'manual' | 'card';

// Get today's check-ins
export function useTodayCheckIns() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['check-ins', user?.gym_id, 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('check_ins')
        .select(
          `
          *,
          member:members(id, first_name, last_name, photo_url, membership_status)
        `
        )
        .eq('gym_id', user?.gym_id)
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data as CheckIn[];
    },
    enabled: !!user?.gym_id,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

// Get check-ins for a specific date
export function useCheckInsByDate(date: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['check-ins', user?.gym_id, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select(
          `
          *,
          member:members(id, first_name, last_name, photo_url, membership_status)
        `
        )
        .eq('gym_id', user?.gym_id)
        .gte('check_in_time', `${date}T00:00:00`)
        .lte('check_in_time', `${date}T23:59:59`)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data as CheckIn[];
    },
    enabled: !!user?.gym_id && !!date,
  });
}

// Get check-in stats for today
export function useTodayCheckInStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['check-ins', user?.gym_id, 'today-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Get all check-ins for today
      const { data, error } = await supabase
        .from('check_ins')
        .select('check_in_time, check_out_time')
        .eq('gym_id', user?.gym_id)
        .gte('check_in_time', `${today}T00:00:00`)
        .lte('check_in_time', `${today}T23:59:59`);

      if (error) throw error;

      const totalCheckIns = data.length;
      const currentlyInside = data.filter((c) => !c.check_out_time).length;

      // Calculate average duration
      const completedSessions = data.filter((c) => c.check_out_time);
      let avgDuration = 0;

      if (completedSessions.length > 0) {
        const totalMinutes = completedSessions.reduce((sum, session) => {
          const checkIn = new Date(session.check_in_time);
          const checkOut = new Date(session.check_out_time!);
          const duration = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
          return sum + duration;
        }, 0);
        avgDuration = totalMinutes / completedSessions.length;
      }

      return {
        totalCheckIns,
        currentlyInside,
        avgDuration: Math.round(avgDuration),
      };
    },
    enabled: !!user?.gym_id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Get member check-in history
export function useMemberCheckIns(memberId: string, limit: number = 10) {
  return useQuery({
    queryKey: ['check-ins', 'member', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('member_id', memberId)
        .order('check_in_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as CheckIn[];
    },
    enabled: !!memberId,
  });
}

// Get currently checked-in members
export function useCurrentlyCheckedIn() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['check-ins', user?.gym_id, 'currently-inside'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select(
          `
          *,
          member:members(id, first_name, last_name, photo_url, membership_status)
        `
        )
        .eq('gym_id', user?.gym_id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data as CheckIn[];
    },
    enabled: !!user?.gym_id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Create a check-in
export function useCreateCheckIn() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (checkInData: {
      member_id: string;
      check_in_method: CheckInMethod;
      notes?: string;
    }) => {
      // First, check if member is already checked in
      const { data: existingCheckIn } = await supabase
        .from('check_ins')
        .select('id')
        .eq('gym_id', user?.gym_id)
        .eq('member_id', checkInData.member_id)
        .is('check_out_time', null)
        .single();

      if (existingCheckIn) {
        throw new Error('Member is already checked in');
      }

      // Create new check-in
      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          gym_id: user?.gym_id,
          member_id: checkInData.member_id,
          check_in_time: new Date().toISOString(),
          check_in_method: checkInData.check_in_method,
          notes: checkInData.notes || null,
        })
        .select(
          `
          *,
          member:members(id, first_name, last_name, photo_url, membership_status)
        `
        )
        .single();

      if (error) throw error;
      
      // Log check-in
      const memberName = data.member 
        ? `${data.member.first_name} ${data.member.last_name}`
        : 'Unknown';
      auditLogger.logCheckIn(checkInData.member_id, memberName, checkInData.check_in_method);
      
      return data as CheckIn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
    },
  });
}

// Create a check-out
export function useCreateCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, memberName }: { memberId: string; memberName?: string }) => {
      // Find the active check-in
      const { data: checkIn, error: findError } = await supabase
        .from('check_ins')
        .select('id')
        .eq('member_id', memberId)
        .is('check_out_time', null)
        .single();

      if (findError || !checkIn) {
        throw new Error('No active check-in found for this member');
      }

      // Update check-out time
      const { data, error } = await supabase
        .from('check_ins')
        .update({ check_out_time: new Date().toISOString() })
        .eq('id', checkIn.id)
        .select()
        .single();

      if (error) throw error;
      
      // Log check-out
      auditLogger.logCheckOut(memberId, memberName || 'Unknown');
      
      return data as CheckIn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
    },
  });
}

// Get check-in stats for date range
export function useCheckInStatsByRange(startDate: string, endDate: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['check-ins', user?.gym_id, 'stats', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('check_in_time')
        .eq('gym_id', user?.gym_id)
        .gte('check_in_time', `${startDate}T00:00:00`)
        .lte('check_in_time', `${endDate}T23:59:59`);

      if (error) throw error;

      // Group by date
      const checkInsByDate: Record<string, number> = {};
      data.forEach((checkIn) => {
        const date = checkIn.check_in_time.split('T')[0];
        checkInsByDate[date] = (checkInsByDate[date] || 0) + 1;
      });

      return {
        total: data.length,
        byDate: Object.entries(checkInsByDate).map(([date, count]) => ({
          date,
          count,
        })),
      };
    },
    enabled: !!user?.gym_id && !!startDate && !!endDate,
  });
}

// Delete a check-in (admin only)
export function useDeleteCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkInId: string) => {
      const { error } = await supabase.from('check_ins').delete().eq('id', checkInId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-ins'] });
    },
  });
}
