/**
 * Database Utilities - Efficient Supabase queries without MCP
 * This replaces MCP server with direct, token-efficient database access
 */

import { supabase, getCurrentGymId } from './supabase';

// ============================================
// TABLE INTROSPECTION
// ============================================

/**
 * Get all tables in the public schema
 */
export async function getAllTables() {
  const { data, error } = await supabase.rpc('get_all_tables');

  if (error) {
    // Fallback: Query information_schema
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    return tables?.map(t => t.table_name) || [];
  }

  return data || [];
}

/**
 * Get table schema (columns, types, constraints)
 */
export async function getTableSchema(tableName: string) {
  const { data, error } = await supabase
    .rpc('get_table_schema', { table_name: tableName });

  if (error) {
    console.error('Error fetching table schema:', error);
    return null;
  }

  return data;
}

/**
 * Get all foreign key relationships
 */
export async function getForeignKeyRelationships() {
  const { data, error } = await supabase
    .rpc('get_foreign_key_relationships');

  if (error) {
    console.error('Error fetching relationships:', error);
    return [];
  }

  return data || [];
}

// ============================================
// GYM OPERATIONS
// ============================================

export async function getGymById(gymId: string) {
  const { data, error } = await supabase
    .from('gym_gyms')
    .select('*')
    .eq('id', gymId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateGym(gymId: string, updates: any) {
  const { data, error } = await supabase
    .from('gym_gyms')
    .update(updates)
    .eq('id', gymId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// MEMBER OPERATIONS
// ============================================

export async function getMembers(filters?: {
  status?: 'active' | 'inactive';
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  let query = supabase
    .from('gym_members')
    .select('*', { count: 'exact' })
    .eq('gym_id', gymId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return { members: data || [], count: count || 0 };
}

export async function getMemberById(memberId: string) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  const { data, error } = await supabase
    .from('gym_members')
    .select('*')
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .single();

  if (error) throw error;
  return data;
}

export async function createMember(memberData: any) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  const { data, error } = await supabase
    .from('gym_members')
    .insert({ ...memberData, gym_id: gymId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMember(memberId: string, updates: any) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  const { data, error } = await supabase
    .from('gym_members')
    .update(updates)
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// PAYMENT OPERATIONS
// ============================================

export async function getPayments(filters?: {
  memberId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  let query = supabase
    .from('gym_payments')
    .select(`
      *,
      gym_members (
        id,
        full_name,
        phone,
        photo_url
      )
    `)
    .eq('gym_id', gymId);

  if (filters?.memberId) {
    query = query.eq('member_id', filters.memberId);
  }

  if (filters?.startDate) {
    query = query.gte('payment_date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('payment_date', filters.endDate);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order('payment_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPayment(paymentData: any) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  const { data, error } = await supabase
    .from('gym_payments')
    .insert({ ...paymentData, gym_id: gymId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// PAYMENT SCHEDULE OPERATIONS
// ============================================

export async function getPaymentSchedule(filters?: {
  memberId?: string;
  year?: number;
  month?: number;
  status?: 'pending' | 'paid' | 'overdue';
}) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  let query = supabase
    .from('gym_payment_schedule')
    .select(`
      *,
      gym_members (
        id,
        full_name,
        phone,
        photo_url,
        membership_plan
      )
    `)
    .eq('gym_id', gymId);

  if (filters?.memberId) {
    query = query.eq('member_id', filters.memberId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.year && filters?.month) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0];
    query = query.gte('due_date', startDate).lte('due_date', endDate);
  }

  const { data, error } = await query.order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get calendar data for a specific month (uses optimized DB function)
 */
export async function getCalendarData(year: number, month: number) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  const { data, error } = await supabase
    .rpc('get_calendar_data', {
      p_gym_id: gymId,
      p_year: year,
      p_month: month
    });

  if (error) throw error;
  return data || [];
}

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * Get dashboard statistics (uses optimized DB function)
 */
export async function getDashboardStats(date?: string) {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  const { data, error } = await supabase
    .rpc('get_dashboard_stats', {
      p_gym_id: gymId,
      p_date: date || new Date().toISOString().split('T')[0]
    });

  if (error) throw error;
  return data;
}

/**
 * Get basic stats manually (fallback if function doesn't exist)
 */
export async function getBasicStats() {
  const gymId = await getCurrentGymId();
  if (!gymId) throw new Error('No gym ID found');

  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString().split('T')[0];

  // Get member counts
  const { count: activeMembers } = await supabase
    .from('gym_members')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('status', 'active');

  const { count: totalMembers } = await supabase
    .from('gym_members')
    .select('*', { count: 'exact', head: true })
    .eq('gym_id', gymId);

  // Get due today
  const { data: dueToday } = await supabase
    .from('gym_payment_schedule')
    .select(`
      *,
      gym_members (
        id,
        full_name,
        photo_url
      )
    `)
    .eq('gym_id', gymId)
    .eq('due_date', today)
    .in('status', ['pending', 'overdue']);

  // Get overdue this month
  const { data: overdueThisMonth } = await supabase
    .from('gym_payment_schedule')
    .select(`
      *,
      gym_members (
        id,
        full_name,
        photo_url
      )
    `)
    .eq('gym_id', gymId)
    .eq('status', 'overdue')
    .gte('due_date', startOfMonth)
    .lte('due_date', endOfMonth);

  // Get revenue this month
  const { data: paymentsThisMonth } = await supabase
    .from('gym_payments')
    .select('amount')
    .eq('gym_id', gymId)
    .gte('payment_date', startOfMonth)
    .lte('payment_date', endOfMonth);

  const revenueThisMonth = paymentsThisMonth?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return {
    total_members: {
      active: activeMembers || 0,
      inactive: (totalMembers || 0) - (activeMembers || 0),
      total: totalMembers || 0
    },
    due_today: {
      count: dueToday?.length || 0,
      amount: dueToday?.reduce((sum, d) => sum + Number(d.amount_due), 0) || 0,
      members: dueToday || []
    },
    overdue_this_month: {
      count: overdueThisMonth?.length || 0,
      amount: overdueThisMonth?.reduce((sum, d) => sum + Number(d.amount_due), 0) || 0,
      members: overdueThisMonth || []
    },
    revenue_this_month: revenueThisMonth
  };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate payment schedule for a member
 */
export async function generatePaymentSchedule(memberId: string, monthsAhead: number = 12) {
  const { data, error } = await supabase
    .rpc('generate_payment_schedule', {
      p_member_id: memberId,
      p_months_ahead: monthsAhead
    });

  if (error) throw error;
  return data;
}

/**
 * Execute raw SQL query (use with caution)
 */
export async function executeRawQuery(query: string, params?: any) {
  const { data, error } = await supabase.rpc('execute_sql', {
    query_text: query,
    query_params: params
  });

  if (error) throw error;
  return data;
}
