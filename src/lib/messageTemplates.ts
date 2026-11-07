import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// ─────────────────────────────────────────────────────────────
// Customisable WhatsApp messages (per gym)
//
// The gym owner edits ONLY plain text (no codes / placeholders).
// The app automatically adds, in fixed positions:
//   • a greeting with the member's name  (top)
//   • the membership / payment details   (bottom)
// so nothing the owner types can break the dynamic parts.
//
// Stored in gym_notification_templates (RLS: own gym only).
// ─────────────────────────────────────────────────────────────

export type TemplateType = 'welcome' | 'renewal' | 'expiry' | 'reminder';

export interface TemplateMeta {
  type: TemplateType;
  title: string;
  description: string;
  autoInfo: string; // what the app adds automatically (shown in settings)
}

export const TEMPLATE_META: TemplateMeta[] = [
  {
    type: 'welcome',
    title: 'Welcome (new member)',
    description: 'Sent after a new member is added',
    autoInfo: 'Member name, plan, amount paid, start date and valid-until date are added automatically.',
  },
  {
    type: 'renewal',
    title: 'Renewal / Payment received',
    description: 'Sent after a payment, renewal or rejoin',
    autoInfo: 'Member name, amount paid, payment method, plan, payment date and valid-until date are added automatically.',
  },
  {
    type: 'expiry',
    title: 'Renewal due (before expiry)',
    description: 'Sent on the due date or a few days before',
    autoInfo: 'Member name, plan, amount, due date and days left are added automatically.',
  },
  {
    type: 'reminder',
    title: 'Overdue reminder',
    description: 'Sent when a payment is already overdue',
    autoInfo: 'Member name, amount due, due date and overdue days are added automatically.',
  },
];

/** Default gym text (used until the gym saves its own). */
export const DEFAULT_BODIES: Record<TemplateType, (gymName: string) => string> = {
  welcome: (gym) =>
    `Welcome to ${gym}! 💪\n\n` +
    `We're excited to have you on board. Here's to your fitness journey! 🏋️\n` +
    `If you have any questions, feel free to ask.\n\n` +
    `See you at the gym! 🙏`,
  renewal: (gym) =>
    `Thank you for your payment at ${gym}! 💪\n` +
    `Keep up the great work.`,
  expiry: (gym) =>
    `Your membership at ${gym} is due for renewal. ⏰\n` +
    `Renew on time to keep your fitness journey going without a break! 💪\n\n` +
    `Thank you! 🙏`,
  reminder: (gym) =>
    `This is a friendly reminder from ${gym}.\n` +
    `Please clear your dues to continue your membership.\n\n` +
    `Thank you! 🙏`,
};

/** Values the app fills in automatically. */
export interface TemplateVars {
  member_name?: string | null;
  gym_name?: string | null;
  plan?: string | null;
  amount?: string | null;
  joining_date?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  valid_until?: string | null;
  due_date?: string | null;
  days_overdue?: number | null;
  due_status?: string | null; // plain text e.g. "3 day(s) overdue", "Due today"
}

const LEGACY_KEYS = new Set([
  'member_name', 'gym_name', 'plan', 'amount', 'joining_date', 'payment_date',
  'payment_method', 'valid_until', 'due_date', 'days_overdue', 'due_status',
]);

/** Backward compatibility: fill any {placeholder} an older saved text may contain. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{?\s*([a-z_]+)\s*\}?\}/gi, (match, key: string) => {
    const k = key.toLowerCase();
    if (!LEGACY_KEYS.has(k)) return match;
    const v = vars[k as keyof TemplateVars];
    return v === undefined || v === null ? '' : String(v);
  });
}

const line = (label: string, value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : `${label}: ${value}`;

function detailsBlock(type: TemplateType, v: TemplateVars): string {
  let title = '';
  let rows: (string | null)[] = [];
  if (type === 'welcome') {
    title = '📋 *Membership Details*';
    rows = [line('Plan', v.plan), line('Amount Paid', v.amount), line('Start Date', v.joining_date), line('Valid Until', v.valid_until)];
  } else if (type === 'renewal') {
    title = '🧾 *Payment Details*';
    rows = [
      line('Amount Paid', v.amount), line('Payment Method', v.payment_method), line('Plan', v.plan),
      line('Payment Date', v.payment_date), line('Valid Until', v.valid_until),
    ];
  } else if (type === 'expiry') {
    title = '📅 *Renewal Details*';
    rows = [line('Plan', v.plan), line('Amount', v.amount), line('Due Date', v.due_date), line('Status', v.due_status)];
  } else {
    title = '💰 *Payment Details*';
    rows = [line('Amount Due', v.amount), line('Due Date', v.due_date), line('Status', v.due_status)];
  }
  const filled = rows.filter(Boolean);
  return filled.length ? [title, ...filled].join('\n') : '';
}

const GREETING_EMOJI: Record<TemplateType, string> = { welcome: '🎉', renewal: '✅', expiry: '⏰', reminder: '👋' };

/** The automatic parts on their own (used for the settings preview). */
export function autoParts(type: TemplateType, vars: TemplateVars) {
  return {
    greeting: vars.member_name ? `Hi *${vars.member_name}*! ${GREETING_EMOJI[type]}` : '',
    details: detailsBlock(type, vars),
  };
}

/**
 * Builds the final WhatsApp message:
 *   greeting (auto) + gym's own text + details (auto) + extra note (auto, e.g. late payment).
 */
export function buildMessage(type: TemplateType, body: string, vars: TemplateVars, extraNote?: string): string {
  const usesNamePlaceholder = /\{\{?\s*member_name\s*\}?\}/i.test(body);
  const greeting = !usesNamePlaceholder && vars.member_name ? `Hi *${vars.member_name}*! ${GREETING_EMOJI[type]}` : '';
  return [greeting, renderTemplate(body, vars).trim(), detailsBlock(type, vars), extraNote?.trim()]
    .filter(Boolean)
    .join('\n\n');
}

// ── Formatting helpers shared by all senders ──────────────────
export function fmtDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value;
  if (isNaN(d.getTime())) return '';
  return format(d, 'dd MMM yyyy');
}

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: '3 Months',
  half_yearly: '6 Months',
  annual: 'Yearly',
  yearly: 'Yearly',
};
export const prettyPlan = (plan?: string | null) => (plan ? PLAN_LABELS[plan] || plan : '');

/** Due date + plain-text status for reminders. */
export function reminderVars(dueDate?: string | Date | null): Pick<TemplateVars, 'due_date' | 'days_overdue' | 'due_status'> {
  if (!dueDate) return { due_date: '', days_overdue: 0, due_status: '' };
  const due = typeof dueDate === 'string' ? new Date(dueDate.length === 10 ? `${dueDate}T00:00:00` : dueDate) : new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - due.getTime()) / 86400000);
  const due_status = diff > 0 ? `${diff} day(s) overdue` : diff === 0 ? 'Due today' : `Due in ${-diff} day(s)`;
  return { due_date: fmtDate(due), days_overdue: Math.max(0, diff), due_status };
}

// ── Data access ───────────────────────────────────────────────
type TemplateMap = Partial<Record<TemplateType, string>>;

export async function fetchTemplates(gymId: string): Promise<TemplateMap> {
  const { data, error } = await supabase
    .from('gym_notification_templates')
    .select('type, message_template, is_active, updated_at')
    .eq('gym_id', gymId)
    .in('type', ['welcome', 'renewal', 'expiry', 'reminder'])
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
 * The gym's message texts (custom or default) plus `render(type, vars)`
 * which builds the full WhatsApp message. Cached per gym.
 */
export function useMessageTemplates() {
  const gymId = useAuthStore((s) => s.user?.gym_id ?? s.gym?.id ?? null);
  const gymName = useAuthStore((s) => s.gym?.name) || 'our gym';
  const query = useQuery({
    queryKey: templatesQueryKey(gymId),
    queryFn: () => fetchTemplates(gymId!),
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000,
  });

  /** The gym's own text for this message type (custom or default). */
  const getTemplate = (type: TemplateType) => query.data?.[type] || DEFAULT_BODIES[type](gymName);
  const render = (type: TemplateType, vars: TemplateVars, extraNote?: string) =>
    buildMessage(type, getTemplate(type), { gym_name: gymName, ...vars }, extraNote);

  return { ...query, custom: query.data || {}, gymName, getTemplate, render };
}
