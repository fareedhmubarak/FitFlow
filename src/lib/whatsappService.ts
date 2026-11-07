import type { Member, Payment } from '@/types/database';
import { DEFAULT_BODIES, buildMessage, reminderVars, fmtDate, prettyPlan } from '@/lib/messageTemplates';

const planLabel = (m: Member) =>
  (m as unknown as { plan_name?: string }).plan_name || prettyPlan(m.membership_plan);
const money = (symbol: string, n?: number | string | null) =>
  `${symbol}${Number(n || 0).toLocaleString('en-IN')}`;

export interface MessageCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const MESSAGE_CATEGORIES: MessageCategory[] = [
  { id: 'birthday', label: 'Birthday Wishes', emoji: '🎂', description: 'Members with birthdays today' },
  { id: 'receipt', label: 'Payment Receipts', emoji: '💰', description: "Today's successful payments" },
  { id: 'reminder', label: 'Payment Reminders', emoji: '⏰', description: 'Members with overdue payments' },
  { id: 'expiry', label: 'Expiring Soon', emoji: '📋', description: 'Memberships expiring within 7 days' },
  { id: 'welcome', label: 'Welcome Members', emoji: '🏋️', description: 'Members who joined today' },
];

// ── Message generators ──────────────────────────────────

export function birthdayMessage(member: Member, gymName: string): string {
  return (
    `Happy Birthday ${member.full_name}! 🎂🎉\n\n` +
    `Wishing you a wonderful year ahead! Stay fit & healthy 💪\n\n` +
    `- ${gymName}`
  );
}

export function paymentReceiptMessage(
  member: Member,
  payment: Payment,
  gymName: string,
  currencySymbol: string,
  body: string = DEFAULT_BODIES.renewal(gymName),
): string {
  const validUntil = member.next_payment_due_date || member.membership_end_date || null;
  return buildMessage('renewal', body, {
    member_name: member.full_name,
    gym_name: gymName,
    amount: money(currencySymbol, payment.amount),
    plan: planLabel(member),
    payment_date: fmtDate(payment.paid_at || (payment as { payment_date?: string }).payment_date || new Date()),
    payment_method: (payment.payment_method || 'cash').toUpperCase(),
    valid_until: fmtDate(validUntil),
  });
}

export function paymentReminderMessage(
  member: Member,
  gymName: string,
  currencySymbol: string,
  body: string = DEFAULT_BODIES.reminder(gymName),
): string {
  return buildMessage('reminder', body, {
    member_name: member.full_name,
    gym_name: gymName,
    amount: money(currencySymbol, member.plan_amount),
    ...reminderVars(member.next_payment_due_date || member.membership_end_date),
  });
}

export function expiryAlertMessage(
  member: Member,
  gymName: string,
): string {
  const endDate = member.membership_end_date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysLeft = 0;
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    daysLeft = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  if (daysLeft === 0) {
    return (
      `Hi ${member.full_name}! 🏋️\n\n` +
      `Your gym membership at ${gymName} expires *TODAY*.\n\n` +
      `Please renew to continue enjoying our facilities.\n\n` +
      `Thank you! 🙏`
    );
  }

  return (
    `Hi ${member.full_name}! 🏋️\n\n` +
    `Your gym membership at ${gymName} expires in *${daysLeft} day(s)*.\n\n` +
    `Please renew before expiry to continue your fitness journey.\n\n` +
    `Thank you! 🙏`
  );
}

export function latePaymentClarificationMessage(params: {
  memberName: string;
  gymName: string;
  currencySymbol: string;
  amount: number;
  dueDate: Date;
  paymentDate: Date;
  daysLate: number;
  nextDueDate?: Date | null;
}): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  let msg =
    `Hi ${params.memberName}! 🏋️\n\n` +
    `✅ We received your payment of ${params.currencySymbol}${params.amount.toLocaleString()} on ${fmt(params.paymentDate)}. Thank you!\n\n` +
    `📌 *A quick note about your billing cycle:*\n` +
    `Your payment was due on *${fmt(params.dueDate)}* and was received *${params.daysLate} day${params.daysLate === 1 ? '' : 's'} late*.\n\n`;

  if (params.nextDueDate) {
    msg += `As per your membership cycle, your next payment is still due on *${fmt(params.nextDueDate)}*.\n\n`;
  }

  msg +=
    `Paying on or before your due date keeps your membership running without interruption. Thank you for understanding! 🙏\n\n` +
    `- ${params.gymName}`;
  return msg;
}

export function welcomeMessage(
  member: Member,
  gymName: string,
  body: string = DEFAULT_BODIES.welcome(gymName),
  opts: { currencySymbol?: string; plan?: string; amount?: number | null; validUntil?: string | null } = {},
): string {
  return buildMessage('welcome', body, {
    member_name: member.full_name,
    gym_name: gymName,
    plan: opts.plan || planLabel(member),
    amount: money(opts.currencySymbol || '₹', opts.amount ?? member.plan_amount),
    joining_date: fmtDate(member.joining_date),
    valid_until: fmtDate(opts.validUntil ?? member.membership_end_date),
  });
}
