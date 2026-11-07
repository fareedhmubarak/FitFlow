import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// ─────────────────────────────────────────────────────────────
// Customisable WhatsApp message templates (per gym)
// Stored in gym_notification_templates (RLS: own gym only).
// ─────────────────────────────────────────────────────────────

export type TemplateType = 'welcome' | 'renewal' | 'reminder';

export interface TemplateMeta {
  type: TemplateType;
  title: string;
  description: string;
  placeholders: string[];
}

export const PLACEHOLDER_HELP: Record<string, string> = {
  member_name: 'Member name',
  gym_name: 'Gym name',
  plan: 'Plan name',
  amount: 'Amount (with ₹)',
  joining_date: 'Joining date',
  payment_date: 'Payment date',
  payment_method: 'Cash / UPI …',
  valid_until: 'Membership valid until',
  due_date: 'Payment due date',
  days_overdue: 'Days overdue (number)',
  due_status: '"is due today" / "is 3 day(s) overdue" …',
};

export const TEMPLATE_META: TemplateMeta[] = [
  {
    type: 'welcome',
    title: 'Welcome (new member)',
    description: 'Sent after a new member is added',
    placeholders: ['member_name', 'gym_name', 'plan', 'joining_date'],
  },
  {
    type: 'renewal',
    title: 'Renewal / Payment received',
    description: 'Sent after a payment, renewal or rejoin',
    placeholders: ['member_name', 'gym_name', 'amount', 'plan', 'payment_date', 'payment_method', 'valid_until'],
  },
  {
    type: 'reminder',
    title: 'Payment reminder',
    description: 'Sent for due / overdue payments',
    placeholders: ['member_name', 'gym_name', 'amount', 'due_date', 'days_overdue', 'due_status'],
  },
];

export const DEFAULT_TEMPLATES: Record<TemplateType, string> = {
  welcome:
    `Welcome to {gym_name}, {member_name}! 🎉💪\n\n` +
    `We're excited to have you on board! Here's to your fitness journey! 🏋️\n\n` +
    `If you have any questions, feel free to ask.\n\n` +
    `See you at the gym! 🙏`,
  renewal:
    `✅ Payment Received - {gym_name}\n\n` +
    `Hi {member_name},\n` +
    `Your payment of {amount} via {payment_method} has been received.\n\n` +
    `📋 Plan: {plan}\n` +
    `📅 Payment Date: {payment_date}\n` +
    `✅ Valid Until: {valid_until}\n\n` +
    `Thank you! 💪`,
  reminder:
    `Hi {member_name}! 🏋️\n\n` +
    `Your payment of {amount} at {gym_name} {due_status}.\n\n` +
    `Please clear your dues to continue your membership.\n\n` +
    `Thank you! 🙏`,
};

export type TemplateVars = Partial<Record<keyof typeof PLACEHOLDER_HELP, string | number | null | undefined>>;

/** Replace {placeholder} (or {{placeholder}}) tokens. Unknown tokens are left as-is. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{?\s*([a-z_]+)\s*\}?\}/gi, (match, key: string) => {
    const k = key.toLowerCase();
    if (!(k in PLACEHOLDER_HELP)) return match; // not a placeholder — keep text as typed
    const value = vars[k as keyof TemplateVars];
    return value === undefined || value === null ? '' : String(value);
  });
}

// ── Formatting helpers shared by all senders ──────────────────
export function fmtDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value;
  if (isNaN(d.getTime())) return '';
  return format(d, 'dd MMM yyyy');
}

/** Builds the reminder variables (due_status, days_overdue, due_date) from a due date. */
export function reminderVars(dueDate?: string | Date | null): Pick<TemplateVars, 'due_date' | 'days_overdue' | 'due_status'> {
  if (!dueDate) return { due_date: '', days_overdue: 0, due_status: 'is due' };
  const due = typeof dueDate === 'string' ? new Date(dueDate.length === 10 ? `${dueDate}T00:00:00` : dueDate) : new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - due.getTime()) / 86400000);
  const due_status =
    diff > 0 ? `is *${diff} day(s) overdue*` : diff === 0 ? 'is due *today*' : `is due on *${fmtDate(due)}*`;
  return { due_date: fmtDate(due), days_overdue: Math.max(0, diff), due_status };
}

// ── Data access ───────────────────────────────────────────────
type TemplateMap = Partial<Record<TemplateType, string>>;

export async function fetchTemplates(gymId: string): Promise<TemplateMap> {
  const { data, error } = await supabase
    .from('gym_notification_templates')
    .select('type, message_template, is_active, updated_at')
    .eq('gym_id', gymId)
    .in('type', ['welcome', 'renewal', 'reminder'])
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const map: TemplateMap = {};
  for (const row of data || []) {
    const type = row.type as TemplateType;
    if (row.is_active !== false && !map[type] && row.message_template?.trim()) {
      map[type] = row.message_template;
    }
  }
  return map;
}

export async function saveTemplate(gymId: string, type: TemplateType, text: string): Promise<void> {
  const meta = TEMPLATE_META.find((m) => m.type === type)!;
  const { data: existing, error: findError } = await supabase
    .from('gym_notification_templates')
    .select('id')
    .eq('gym_id', gymId)
    .eq('type', type)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase
      .from('gym_notification_templates')
      .update({ message_template: text, is_active: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('gym_notification_templates').insert({
      gym_id: gymId,
      type,
      name: meta.title,
      message_template: text,
      is_active: true,
      channels: ['whatsapp'],
    });
    if (error) throw error;
  }
}

export async function resetTemplate(gymId: string, type: TemplateType): Promise<void> {
  const { error } = await supabase
    .from('gym_notification_templates')
    .delete()
    .eq('gym_id', gymId)
    .eq('type', type);
  if (error) throw error;
}

export const templatesQueryKey = (gymId?: string | null) => ['message-templates', gymId] as const;

/**
 * Returns the gym's templates (custom or default) and a `render` helper.
 * Cached per gym, so it is cheap to call from many components.
 */
export function useMessageTemplates() {
  const gymId = useAuthStore((s) => s.user?.gym_id ?? s.gym?.id ?? null);
  const query = useQuery({
    queryKey: templatesQueryKey(gymId),
    queryFn: () => fetchTemplates(gymId!),
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });

  const getTemplate = (type: TemplateType) => query.data?.[type] || DEFAULT_TEMPLATES[type];
  const render = (type: TemplateType, vars: TemplateVars) => renderTemplate(getTemplate(type), vars);

  return { ...query, custom: query.data || {}, getTemplate, render };
}
