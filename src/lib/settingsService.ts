import { supabase, getCurrentGymId } from './supabase';
import { auditLogger } from './auditLogger';

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
  base_duration_months: number;
  bonus_duration_months?: number;
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

    auditLogger.logGymProfileUpdated(gymId, data.name || 'Gym', {}, updates as Record<string, unknown>);

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

    auditLogger.log({
      category: 'SETTINGS',
      action: 'settings_updated',
      resourceType: 'gym',
      resourceId: gymId,
      success: true,
      metadata: { type: 'logo_uploaded' },
    });

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

    auditLogger.log({
      category: 'SETTINGS',
      action: 'settings_updated',
      resourceType: 'gym',
      resourceId: gymId,
      success: true,
      metadata: { type: 'logo_removed' },
    });
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

    const bonusMonths = input.bonus_duration_months || 0;
    const totalDurationMonths = input.base_duration_months + bonusMonths;

    const { data, error } = await supabase
      .from('gym_membership_plans')
      .insert({
        gym_id: gymId,
        name: input.name,
        description: input.description || null,
        price: input.price,
        base_price: input.price,
        final_price: input.price,
        duration_months: totalDurationMonths,
        base_duration_months: input.base_duration_months,
        bonus_duration_months: bonusMonths,
        promo_type: bonusMonths > 0 ? 'promotional' : 'standard',
        is_active: input.is_active ?? true,
        features: input.features || [],
      })
      .select()
      .single();

    if (error) throw error;

    auditLogger.logPlanCreated(data.id, input.name, data as unknown as Record<string, unknown>);

    return data;
  },

  // Update membership plan
  async updateMembershipPlan(planId: string, updates: Partial<CreatePlanInput>): Promise<MembershipPlan> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    const bonusMonths = updates.bonus_duration_months || 0;
    const totalDurationMonths = (updates.base_duration_months || 1) + bonusMonths;

    const { data, error } = await supabase
      .from('gym_membership_plans')
      .update({
        name: updates.name,
        description: updates.description,
        price: updates.price,
        base_price: updates.price,
        final_price: updates.price,
        duration_months: totalDurationMonths,
        base_duration_months: updates.base_duration_months,
        bonus_duration_months: bonusMonths,
        promo_type: bonusMonths > 0 ? 'promotional' : 'standard',
        is_active: updates.is_active,
        features: updates.features,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('gym_id', gymId)
      .select()
      .single();

    if (error) throw error;

    auditLogger.logPlanUpdated(planId, updates.name || 'Plan', {}, data as unknown as Record<string, unknown>);

    return data;
  },

  // Delete membership plan
  async deleteMembershipPlan(planId: string): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym found');

    // Get plan name before deleting
    const { data: plan } = await supabase
      .from('gym_membership_plans')
      .select('name')
      .eq('id', planId)
      .eq('gym_id', gymId)
      .single();

    const { error } = await supabase
      .from('gym_membership_plans')
      .delete()
      .eq('id', planId)
      .eq('gym_id', gymId);

    if (error) throw error;

    auditLogger.logPlanDeleted(planId, plan?.name || 'Unknown');
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

    auditLogger.logPlanUpdated(planId, 'Plan', { is_active: !isActive }, { is_active: isActive });
  },
};
