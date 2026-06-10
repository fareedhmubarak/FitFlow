import type { Member, Payment } from '@/types/database';

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
): string {
  const paidDate = payment.paid_at
    ? new Date(payment.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Today';

  const nextDue = member.next_payment_due_date
    ? new Date(member.next_payment_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : member.membership_end_date
      ? new Date(member.membership_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

  let msg =
    `Hi ${member.full_name}! 🏋️\n\n` +
    `✅ *Payment Received*\n` +
    `Amount: ${currencySymbol}${payment.amount.toLocaleString()}\n` +
    `Date: ${paidDate}\n` +
    `Method: ${(payment.payment_method || 'cash').toUpperCase()}\n`;

  if (payment.invoice_number) {
    msg += `Receipt #: ${payment.invoice_number}\n`;
  }

  if (nextDue) {
    msg += `\n📅 *Next Due*: ${nextDue}\n`;
  }

  msg += `\nThank you for your payment!\n- ${gymName}`;
  return msg;
}

export function paymentReminderMessage(
  member: Member,
  gymName: string,
  currencySymbol: string,
): string {
  const dueDate = member.next_payment_due_date || member.membership_end_date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysOverdue = 0;
  if (dueDate) {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const amount = member.plan_amount || 0;

  if (daysOverdue > 0) {
    return (
      `Hi ${member.full_name}! 🏋️\n\n` +
      `Your payment of ${currencySymbol}${amount.toLocaleString()} at ${gymName} is *${daysOverdue} day(s) overdue*.\n\n` +
      `Please clear your dues to continue your membership.\n\n` +
      `Thank you! 🙏`
    );
  }

  return (
    `Hi ${member.full_name}! 🏋️\n\n` +
    `Your payment of ${currencySymbol}${amount.toLocaleString()} is due *today* at ${gymName}.\n\n` +
    `Please make the payment at your earliest convenience.\n\n` +
    `Thank you! 🙏`
  );
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

export function welcomeMessage(member: Member, gymName: string): string {
  return (
    `Welcome to ${gymName}, ${member.full_name}! 🎉💪\n\n` +
    `We're excited to have you on board! Here's to your fitness journey! 🏋️\n\n` +
    `If you have any questions, feel free to ask.\n\n` +
    `See you at the gym! 🙏`
  );
}
