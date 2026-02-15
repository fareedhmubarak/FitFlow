import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { auditLogger } from '../lib/auditLogger';

export interface Staff {
  id: string;
  gym_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'owner' | 'manager' | 'trainer' | 'receptionist';
  permissions: string[];
  photo_url: string | null;
  is_active: boolean;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
}

export type StaffRole = 'owner' | 'manager' | 'trainer' | 'receptionist';

export const STAFF_PERMISSIONS = {
  MANAGE_MEMBERS: 'manage_members',
  VIEW_MEMBERS: 'view_members',
  MANAGE_PAYMENTS: 'manage_payments',
  VIEW_PAYMENTS: 'view_payments',
  MANAGE_CLASSES: 'manage_classes',
  VIEW_CLASSES: 'view_classes',
  MANAGE_STAFF: 'manage_staff',
  VIEW_STAFF: 'view_staff',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_REPORTS: 'view_reports',
  CHECK_IN_MEMBERS: 'check_in_members',
} as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  owner: Object.values(STAFF_PERMISSIONS),
  manager: [
    STAFF_PERMISSIONS.MANAGE_MEMBERS,
    STAFF_PERMISSIONS.VIEW_MEMBERS,
    STAFF_PERMISSIONS.MANAGE_PAYMENTS,
    STAFF_PERMISSIONS.VIEW_PAYMENTS,
    STAFF_PERMISSIONS.MANAGE_CLASSES,
    STAFF_PERMISSIONS.VIEW_CLASSES,
    STAFF_PERMISSIONS.VIEW_STAFF,
    STAFF_PERMISSIONS.VIEW_REPORTS,
    STAFF_PERMISSIONS.CHECK_IN_MEMBERS,
  ],
  trainer: [
    STAFF_PERMISSIONS.VIEW_MEMBERS,
    STAFF_PERMISSIONS.VIEW_CLASSES,
    STAFF_PERMISSIONS.MANAGE_CLASSES,
    STAFF_PERMISSIONS.CHECK_IN_MEMBERS,
  ],
  receptionist: [
    STAFF_PERMISSIONS.VIEW_MEMBERS,
    STAFF_PERMISSIONS.MANAGE_PAYMENTS,
    STAFF_PERMISSIONS.VIEW_PAYMENTS,
    STAFF_PERMISSIONS.CHECK_IN_MEMBERS,
  ],
};

// Get all staff for the current gym
export function useStaff() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['staff', user?.gym_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_users')
        .select('*')
        .eq('gym_id', user?.gym_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Staff[];
    },
    enabled: !!user?.gym_id,
  });
}

// Get a single staff member by ID
export function useStaffMember(staffId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['staff', user?.gym_id, 'detail', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_users')
        .select('*')
        .eq('id', staffId)
        .eq('gym_id', user?.gym_id)
        .single();

      if (error) throw error;
      return data as Staff;
    },
    enabled: !!staffId && !!user?.gym_id,
  });
}

// Get active staff count
export function useActiveStaffCount() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['staff', user?.gym_id, 'active-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('gym_users')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', user?.gym_id)
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.gym_id,
  });
}

// Create a new staff member
export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (staffData: Omit<Staff, 'id' | 'gym_id' | 'created_at' | 'updated_at'>) => {
      // Use signUp with a temporary password — staff will reset via email
      // NOTE: admin.createUser requires service-role key which is not available in browser
      const tempPassword = crypto.randomUUID().slice(0, 16) + 'A1!';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: staffData.email,
        password: tempPassword,
        options: {
          data: {
            full_name: staffData.full_name,
            role: staffData.role,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      // Create gym user record
      const { data, error } = await supabase
        .from('gym_users')
        .insert({
          id: authData.user.id,
          gym_id: user?.gym_id,
          email: staffData.email,
          full_name: staffData.full_name,
          phone: staffData.phone,
          role: staffData.role,
          permissions: staffData.permissions || DEFAULT_ROLE_PERMISSIONS[staffData.role],
          photo_url: staffData.photo_url,
          is_active: staffData.is_active,
          hire_date: staffData.hire_date,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Send password reset email so staff can set their own password
      await supabase.auth.resetPasswordForEmail(staffData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      // Log staff creation
      auditLogger.logStaffCreated(data.id, staffData.full_name, {
        email: staffData.email,
        role: staffData.role,
        permissions: staffData.permissions,
      });
      
      return data as Staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

// Update a staff member
export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Staff> & { id: string }) => {
      if (!user?.gym_id) throw new Error('No gym ID found');

      // Get old data for audit
      const { data: oldStaff } = await supabase
        .from('gym_users')
        .select('*')
        .eq('id', id)
        .eq('gym_id', user.gym_id)
        .single();

      const { data, error } = await supabase
        .from('gym_users')
        .update(updates)
        .eq('id', id)
        .eq('gym_id', user.gym_id)
        .select()
        .single();

      if (error) throw error;
      
      // Log staff update
      auditLogger.logStaffUpdated(
        data.id,
        data.full_name,
        oldStaff || {},
        updates
      );
      
      return data as Staff;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff', data.id] });
    },
  });
}

// Deactivate a staff member (soft delete)
export function useDeactivateStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (staffId: string) => {
      const { data, error } = await supabase
        .from('gym_users')
        .update({ is_active: false })
        .eq('id', staffId)
        .eq('gym_id', user?.gym_id)
        .select()
        .single();

      if (error) throw error;

      // Log staff deactivation
      auditLogger.logStaffUpdated(
        staffId,
        data.full_name,
        { is_active: true },
        { is_active: false }
      );

      return data as Staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

// Delete a staff member (hard delete)
export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ staffId, staffName }: { staffId: string; staffName?: string }) => {
      const { error } = await supabase
        .from('gym_users')
        .delete()
        .eq('id', staffId)
        .eq('gym_id', user?.gym_id);

      if (error) throw error;
      
      // Log staff deletion
      auditLogger.logStaffDeleted(staffId, staffName || 'Unknown');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

// Check if current user has a specific permission
export function useHasPermission(permission: string): boolean {
  const { user } = useAuthStore();

  if (!user) return false;

  // Owners have all permissions
  if (user.role === 'owner') return true;

  return user.permissions?.includes(permission) || false;
}
