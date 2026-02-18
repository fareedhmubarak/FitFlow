import { supabase, getCurrentGymId } from './supabase';

export interface MembershipFreeze {
  id: string;
  gym_id: string;
  member_id: string;
  freeze_start: string;
  freeze_end?: string | null;
  freeze_days?: number | null;
  reason?: string | null;
  original_end_date?: string | null;
  original_next_due_date?: string | null;
  extended_end_date?: string | null;
  extended_next_due_date?: string | null;
  created_by?: string | null;
  created_at: string;
}

class FreezeService {
  private static instance: FreezeService;

  static getInstance(): FreezeService {
    if (!FreezeService.instance) {
      FreezeService.instance = new FreezeService();
    }
    return FreezeService.instance;
  }

  async freezeMembership(memberId: string, reason?: string, freezeStart?: string): Promise<MembershipFreeze> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    // Get current member data
    const { data: member, error: mErr } = await supabase
      .from('gym_members')
      .select('membership_end_date, next_payment_due_date, status')
      .eq('id', memberId)
      .eq('gym_id', gymId)
      .single();

    if (mErr) throw mErr;
    if (member.status === 'frozen') throw new Error('Member is already frozen');

    const start = freezeStart || new Date().toISOString().split('T')[0];

    // Insert freeze record
    const { data: freeze, error: fErr } = await supabase
      .from('gym_membership_freezes')
      .insert({
        gym_id: gymId,
        member_id: memberId,
        freeze_start: start,
        reason: reason || null,
        original_end_date: member.membership_end_date || null,
        original_next_due_date: member.next_payment_due_date || null,
      })
      .select()
      .single();

    if (fErr) throw fErr;

    // Update member status to frozen
    const { error: uErr } = await supabase
      .from('gym_members')
      .update({ status: 'frozen', updated_at: new Date().toISOString() })
      .eq('id', memberId)
      .eq('gym_id', gymId);

    if (uErr) throw uErr;

    return freeze as MembershipFreeze;
  }

  async unfreezeMembership(memberId: string): Promise<void> {
    const gymId = await getCurrentGymId();
    if (!gymId) throw new Error('No gym ID found');

    // Get active freeze record
    const { data: freeze, error: fErr } = await supabase
      .from('gym_membership_freezes')
      .select('*')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .is('freeze_end', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fErr) throw fErr;

    const freezeStart = new Date(freeze.freeze_start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const freezeDays = Math.max(1, Math.ceil((today.getTime() - freezeStart.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate extended dates
    let extEndDate: string | null = null;
    let extDueDate: string | null = null;

    if (freeze.original_end_date) {
      const orig = new Date(freeze.original_end_date);
      orig.setDate(orig.getDate() + freezeDays);
      extEndDate = orig.toISOString().split('T')[0];
    }
    if (freeze.original_next_due_date) {
      const orig = new Date(freeze.original_next_due_date);
      orig.setDate(orig.getDate() + freezeDays);
      extDueDate = orig.toISOString().split('T')[0];
    }

    // Update freeze record
    const { error: uFErr } = await supabase
      .from('gym_membership_freezes')
      .update({
        freeze_end: today.toISOString().split('T')[0],
        freeze_days: freezeDays,
        extended_end_date: extEndDate,
        extended_next_due_date: extDueDate,
      })
      .eq('id', freeze.id)
      .eq('gym_id', gymId);

    if (uFErr) throw uFErr;

    // Update member: status back to active, extend dates
    const memberUpdate: Record<string, unknown> = {
      status: 'active',
      updated_at: new Date().toISOString(),
    };
    if (extEndDate) memberUpdate.membership_end_date = extEndDate;
    if (extDueDate) memberUpdate.next_payment_due_date = extDueDate;

    const { error: uMErr } = await supabase
      .from('gym_members')
      .update(memberUpdate)
      .eq('id', memberId)
      .eq('gym_id', gymId);

    if (uMErr) throw uMErr;
  }

  async getMemberFreezeHistory(memberId: string): Promise<MembershipFreeze[]> {
    const gymId = await getCurrentGymId();
    if (!gymId) return [];

    const { data, error } = await supabase
      .from('gym_membership_freezes')
      .select('*')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MembershipFreeze[];
  }

  async getActiveFreeze(memberId: string): Promise<MembershipFreeze | null> {
    const gymId = await getCurrentGymId();
    if (!gymId) return null;

    const { data, error } = await supabase
      .from('gym_membership_freezes')
      .select('*')
      .eq('gym_id', gymId)
      .eq('member_id', memberId)
      .is('freeze_end', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as MembershipFreeze | null;
  }
}

export const freezeService = FreezeService.getInstance();
