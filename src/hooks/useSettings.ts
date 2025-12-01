import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface GymSettings {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  timezone: string;
  currency: string;
  features: {
    enable_classes: boolean;
    enable_diet_plans: boolean;
    enable_pt_sessions: boolean;
    enable_supplements: boolean;
    enable_biometric: boolean;
    enable_mobile_app: boolean;
    enable_whatsapp: boolean;
    enable_email: boolean;
  };
  notifications: {
    email_enabled: boolean;
    sms_enabled: boolean;
    whatsapp_enabled: boolean;
    payment_reminders: boolean;
    membership_expiry: boolean;
    class_reminders: boolean;
    birthday_wishes: boolean;
  };
  created_at: string;
  updated_at: string;
}

// Get gym settings
export function useGymSettings() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['gym_settings', user?.gym_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', user?.gym_id)
        .single();

      if (error) throw error;
      return data as GymSettings;
    },
    enabled: !!user?.gym_id,
  });
}

// Update general settings
export function useUpdateGeneralSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (settings: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      timezone?: string;
      currency?: string;
    }) => {
      const { data, error } = await supabase
        .from('gyms')
        .update(settings)
        .eq('id', user?.gym_id)
        .select()
        .single();

      if (error) throw error;
      return data as GymSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym_settings'] });
    },
  });
}

// Update branding settings
export function useUpdateBrandingSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (settings: {
      logo_url?: string;
      primary_color?: string;
      secondary_color?: string;
    }) => {
      const { data, error } = await supabase
        .from('gyms')
        .update(settings)
        .eq('id', user?.gym_id)
        .select()
        .single();

      if (error) throw error;
      return data as GymSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym_settings'] });
    },
  });
}

// Update feature settings
export function useUpdateFeatureSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (features: Partial<GymSettings['features']>) => {
      // Get current features first
      const { data: currentData } = await supabase
        .from('gyms')
        .select('features')
        .eq('id', user?.gym_id)
        .single();

      const updatedFeatures = {
        ...currentData?.features,
        ...features,
      };

      const { data, error } = await supabase
        .from('gyms')
        .update({ features: updatedFeatures })
        .eq('id', user?.gym_id)
        .select()
        .single();

      if (error) throw error;
      return data as GymSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym_settings'] });
    },
  });
}

// Update notification settings
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (notifications: Partial<GymSettings['notifications']>) => {
      // Get current notifications first
      const { data: currentData } = await supabase
        .from('gyms')
        .select('notifications')
        .eq('id', user?.gym_id)
        .single();

      const updatedNotifications = {
        ...currentData?.notifications,
        ...notifications,
      };

      const { data, error } = await supabase
        .from('gyms')
        .update({ notifications: updatedNotifications })
        .eq('id', user?.gym_id)
        .select()
        .single();

      if (error) throw error;
      return data as GymSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym_settings'] });
    },
  });
}

// Upload logo
export function useUploadLogo() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (file: File) => {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.gym_id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('logos').getPublicUrl(fileName);

      // Update gym settings
      const { data, error } = await supabase
        .from('gyms')
        .update({ logo_url: publicUrl })
        .eq('id', user?.gym_id)
        .select()
        .single();

      if (error) throw error;
      return data as GymSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gym_settings'] });
    },
  });
}

// Get available timezones
export function useTimezones() {
  return useQuery({
    queryKey: ['timezones'],
    queryFn: async () => {
      return [
        'Asia/Kolkata',
        'Asia/Dubai',
        'America/New_York',
        'America/Chicago',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Singapore',
        'Asia/Tokyo',
        'Australia/Sydney',
      ];
    },
  });
}

// Get available currencies
export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      return [
        { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
        { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
      ];
    },
  });
}
