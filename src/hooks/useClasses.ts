import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface Class {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  instructor: string;
  capacity: number;
  duration: number; // in minutes
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassSchedule {
  id: string;
  class_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_active: boolean;
  created_at: string;
  class?: Class;
}

export interface Booking {
  id: string;
  class_schedule_id: string;
  member_id: string;
  booking_date: string;
  status: 'confirmed' | 'cancelled' | 'attended' | 'no_show';
  created_at: string;
  class_schedule?: ClassSchedule;
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
  };
}

// Get all classes for the current gym
export function useClasses() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['classes', user?.gym_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('gym_id', user?.gym_id)
        .order('name');

      if (error) throw error;
      return data as Class[];
    },
    enabled: !!user?.gym_id,
  });
}

// Get a single class by ID
export function useClass(classId: string) {
  return useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (error) throw error;
      return data as Class;
    },
    enabled: !!classId,
  });
}

// Get class schedules
export function useClassSchedules(classId?: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['class_schedules', user?.gym_id, classId],
    queryFn: async () => {
      let query = supabase
        .from('class_schedules')
        .select(
          `
          *,
          class:classes(*)
        `
        )
        .eq('is_active', true);

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query.order('day_of_week').order('start_time');

      if (error) throw error;
      return data as ClassSchedule[];
    },
    enabled: !!user?.gym_id,
  });
}

// Get bookings for a specific class schedule
export function useBookings(classScheduleId: string, date?: string) {
  return useQuery({
    queryKey: ['bookings', classScheduleId, date],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(
          `
          *,
          class_schedule:class_schedules(*),
          member:members(id, first_name, last_name, photo_url)
        `
        )
        .eq('class_schedule_id', classScheduleId);

      if (date) {
        query = query.eq('booking_date', date);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!classScheduleId,
  });
}

// Create a new class
export function useCreateClass() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (classData: Omit<Class, 'id' | 'gym_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          ...classData,
          gym_id: user?.gym_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Class;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

// Update a class
export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Class> & { id: string }) => {
      const { data, error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Class;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class', data.id] });
    },
  });
}

// Delete a class
export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

// Create a class schedule
export function useCreateClassSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      scheduleData: Omit<ClassSchedule, 'id' | 'created_at'>
    ) => {
      const { data, error } = await supabase
        .from('class_schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (error) throw error;
      return data as ClassSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_schedules'] });
    },
  });
}

// Create a booking
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      bookingData: Omit<Booking, 'id' | 'created_at'>
    ) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// Cancel a booking
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
