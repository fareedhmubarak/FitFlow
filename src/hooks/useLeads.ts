import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { auditLogger } from '../lib/auditLogger';

export interface Lead {
  id: string;
  gym_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  source: 'walk_in' | 'website' | 'referral' | 'social_media' | 'advertisement' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'negotiation' | 'converted' | 'lost';
  interested_in: string | null;
  notes: string | null;
  follow_up_date: string | null;
  assigned_to: string | null;
  converted_member_id: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadSource = 'walk_in' | 'website' | 'referral' | 'social_media' | 'advertisement' | 'other';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'converted' | 'lost';

// Get all leads for the current gym
export function useLeads(status?: LeadStatus) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['leads', user?.gym_id, status],
    queryFn: async () => {
      let query = supabase
        .from('gym_leads')
        .select('*')
        .eq('gym_id', user?.gym_id);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user?.gym_id,
  });
}

// Get a single lead by ID
export function useLead(leadId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['leads', user?.gym_id, 'detail', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_leads')
        .select('*')
        .eq('id', leadId)
        .eq('gym_id', user?.gym_id)
        .single();

      if (error) throw error;
      return data as Lead;
    },
    enabled: !!leadId && !!user?.gym_id,
  });
}

// Get leads stats
export function useLeadsStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['leads', user?.gym_id, 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_leads')
        .select('status')
        .eq('gym_id', user?.gym_id);

      if (error) throw error;

      const stats = {
        total: data.length,
        new: data.filter((l) => l.status === 'new').length,
        contacted: data.filter((l) => l.status === 'contacted').length,
        qualified: data.filter((l) => l.status === 'qualified').length,
        negotiation: data.filter((l) => l.status === 'negotiation').length,
        converted: data.filter((l) => l.status === 'converted').length,
        lost: data.filter((l) => l.status === 'lost').length,
        conversionRate:
          data.length > 0
            ? ((data.filter((l) => l.status === 'converted').length / data.length) * 100).toFixed(1)
            : '0',
      };

      return stats;
    },
    enabled: !!user?.gym_id,
  });
}

// Get leads by source
export function useLeadsBySource() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['leads', user?.gym_id, 'by-source'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_leads')
        .select('source')
        .eq('gym_id', user?.gym_id);

      if (error) throw error;

      const sourceCount: Record<string, number> = {};
      data.forEach((lead) => {
        sourceCount[lead.source] = (sourceCount[lead.source] || 0) + 1;
      });

      return Object.entries(sourceCount).map(([source, count]) => ({
        source,
        count,
      }));
    },
    enabled: !!user?.gym_id,
  });
}

// Get leads requiring follow-up
export function useFollowUpLeads() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['leads', user?.gym_id, 'follow-up'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('gym_leads')
        .select('*')
        .eq('gym_id', user?.gym_id)
        .lte('follow_up_date', today)
        .in('status', ['new', 'contacted', 'qualified', 'negotiation'])
        .order('follow_up_date');

      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user?.gym_id,
  });
}

// Create a new lead
export function useCreateLead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (leadData: Omit<Lead, 'id' | 'gym_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('gym_leads')
        .insert({
          ...leadData,
          gym_id: user?.gym_id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Log lead creation
      auditLogger.logLeadCreated(data.id, `${leadData.first_name} ${leadData.last_name}`, {
        phone: leadData.phone,
        email: leadData.email,
        source: leadData.source,
        status: leadData.status,
        interested_in: leadData.interested_in,
      });
      
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Update a lead
export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      if (!user?.gym_id) throw new Error('No gym ID found');

      // Get old data for audit
      const { data: oldLead } = await supabase
        .from('gym_leads')
        .select('*')
        .eq('id', id)
        .eq('gym_id', user.gym_id)
        .single();

      const { data, error } = await supabase
        .from('gym_leads')
        .update(updates)
        .eq('id', id)
        .eq('gym_id', user.gym_id)
        .select()
        .single();

      if (error) throw error;
      
      // Log lead update
      auditLogger.logLeadUpdated(
        data.id,
        `${data.first_name} ${data.last_name}`,
        oldLead || {},
        updates
      );
      
      return data as Lead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', user?.gym_id, 'detail', data.id] });
    },
  });
}

// Convert lead to member
export function useConvertLead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ leadId, memberId }: { leadId: string; memberId: string }) => {
      if (!user?.gym_id) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_leads')
        .update({
          status: 'converted',
          converted_member_id: memberId,
        })
        .eq('id', leadId)
        .eq('gym_id', user.gym_id)
        .select()
        .single();

      if (error) throw error;
      
      // Log lead conversion
      auditLogger.logLeadConverted(
        leadId,
        `${data.first_name} ${data.last_name}`,
        memberId
      );
      
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Mark lead as lost
export function useMarkLeadLost() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: string; reason: string }) => {
      if (!user?.gym_id) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_leads')
        .update({
          status: 'lost',
          lost_reason: reason,
        })
        .eq('id', leadId)
        .eq('gym_id', user.gym_id)
        .select()
        .single();

      if (error) throw error;

      // Log lead marked as lost
      auditLogger.logLeadUpdated(
        leadId,
        `${data.first_name} ${data.last_name}`,
        { status: 'active' },
        { status: 'lost', lost_reason: reason }
      );

      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Delete a lead
export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ leadId, leadName }: { leadId: string; leadName?: string }) => {
      if (!user?.gym_id) throw new Error('No gym ID found');

      const { error } = await supabase
        .from('gym_leads')
        .delete()
        .eq('id', leadId)
        .eq('gym_id', user.gym_id);

      if (error) throw error;
      
      // Log lead deletion
      auditLogger.logLeadDeleted(leadId, leadName || 'Unknown');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Update follow-up date
export function useUpdateFollowUpDate() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ leadId, followUpDate }: { leadId: string; followUpDate: string }) => {
      if (!user?.gym_id) throw new Error('No gym ID found');

      const { data, error } = await supabase
        .from('gym_leads')
        .update({ follow_up_date: followUpDate })
        .eq('id', leadId)
        .eq('gym_id', user.gym_id)
        .select()
        .single();

      if (error) throw error;
      
      // Log follow-up scheduled
      auditLogger.logLeadFollowUp(
        leadId,
        `${data.first_name} ${data.last_name}`,
        { follow_up_date: followUpDate }
      );
      
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
