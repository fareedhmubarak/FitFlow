import { supabase, getCurrentGymId } from './supabase';

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
  language: string;
  timezone: string;
  currency: string;
  settings: {
    grace_period_days?: number;
    invoice_prefix?: string;
    gst_number?: string;
    operating_hours?: {
      [key: string]: { open: string; close: string; closed?: boolean };
    };
  } | null;
}

export interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number | null;
  billing_cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'one_time';
  is_active: boolean;
  display_order: number;
  features: string[];
  created_at: string;
}

export interface CreatePlanInput {
  name: string;
  description?: string | null;
  price: number;
  duration_days: number;
  billing_cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'one_time';
  is_active?: boolean;
  features?: string[];
}

export const settingsService = {
  // Fetch gym settings
  async getGymSettings(): Promise<GymSettings | null> {
    const gymId = await getCurrentGymId();
    if (!gymId) return null;

    const { data, error } = await supabase
      .from('gym_gyms')
      .select('*')
      .eq('id', gymId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update gym profile
  async updateGymProfile(updates: Partial<GymSettings>): Promise<GymSettings> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    const { data, error } = await supabase
      .from('gym_gyms')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        pincode: updates.pincode,
        currency: updates.currency,
        timezone: updates.timezone,
        settings: updates.settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gymId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Upload gym logo
  async uploadLogo(file: File): Promise<string> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 2MB limit.');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${gymId}/logo-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('gym-logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('gym-logos')
      .getPublicUrl(data.path);

    // Update gym record with new logo URL
    await supabase
      .from('gym_gyms')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', gymId);

    return publicUrl;
  },

  // Remove gym logo
  async removeLogo(): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    await supabase
      .from('gym_gyms')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', gymId);
  },

  // Fetch membership plans
  async getMembershipPlans(): Promise<MembershipPlan[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) return [];

    const { data, error } = await supabase
      .from('gym_membership_plans')
      .select('*')
      .eq('gym_id', gymId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create membership plan
  async createMembershipPlan(input: CreatePlanInput): Promise<MembershipPlan> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    const { data, error } = await supabase
      .from('gym_membership_plans')
      .insert({
        gym_id: gymId,
        name: input.name,
        description: input.description || null,
        price: input.price,
        duration_days: input.duration_days,
        billing_cycle: input.billing_cycle,
        is_active: input.is_active ?? true,
        features: input.features || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update membership plan
  async updateMembershipPlan(planId: string, updates: Partial<CreatePlanInput>): Promise<MembershipPlan> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    const { data, error } = await supabase
      .from('gym_membership_plans')
      .update({
        name: updates.name,
        description: updates.description,
        price: updates.price,
        duration_days: updates.duration_days,
        billing_cycle: updates.billing_cycle,
        is_active: updates.is_active,
        features: updates.features,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('gym_id', gymId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete membership plan
  async deleteMembershipPlan(planId: string): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    const { error } = await supabase
      .from('gym_membership_plans')
      .delete()
      .eq('id', planId)
      .eq('gym_id', gymId);

    if (error) throw error;
  },

  // Toggle plan active status
  async togglePlanActive(planId: string, isActive: boolean): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    const { error } = await supabase
      .from('gym_membership_plans')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('gym_id', gymId);

    if (error) throw error;
  },
};
