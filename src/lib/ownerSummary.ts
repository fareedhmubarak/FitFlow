import { format } from 'date-fns';
import { installmentService } from '@/lib/installmentService';
import type { CalendarEvent } from '@/lib/gymService';

export interface DailySummaryData {
  gymName: string;
  date: string;
  dueToday: Array<{ name: string; amount: number; phone: string }>;
  overdue: Array<{ name: string; amount: number; phone: string; daysOverdue: number }>;
  dueTomorrow: Array<{ name: string; amount: number }>;
  todayCollections: number;
  todayCollectionsCount: number;
  monthCollections: number;
  activeMembers: number;
  pendingInstallments: Array<{ name: string; amount: number; installmentNumber: number; totalInstallments: number }>;
}

/**
 * Build WhatsApp owner daily summary message
 */
export function buildOwnerDailySummary(data: DailySummaryData): string {
  const lines: string[] = [];
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  lines.push(`📊 Daily Summary - ${data.gymName}`);
  lines.push(`📅 ${today}`);
  lines.push('');

  // Stats overview
  lines.push(`💰 Today's Collections: ₹${data.todayCollections.toLocaleString('en-IN')} (${data.todayCollectionsCount} payments)`);
  lines.push(`📈 Month Total: ₹${data.monthCollections.toLocaleString('en-IN')}`);
  lines.push(`👥 Active Members: ${data.activeMembers}`);
  lines.push('');

  // Due Today
  if (data.dueToday.length > 0) {
    const dueTodayTotal = data.dueToday.reduce((s, m) => s + m.amount, 0);
    lines.push(`🟢 DUE TODAY (${data.dueToday.length}) - ₹${dueTodayTotal.toLocaleString('en-IN')}`);
    data.dueToday.forEach((m, i) => {
      lines.push(`  ${i + 1}. ${m.name} - ₹${m.amount.toLocaleString('en-IN')}`);
    });
    lines.push('');
  } else {
    lines.push('🟢 DUE TODAY: None');
    lines.push('');
  }

  // Overdue
  if (data.overdue.length > 0) {
    const overdueTotal = data.overdue.reduce((s, m) => s + m.amount, 0);
    lines.push(`🔴 OVERDUE (${data.overdue.length}) - ₹${overdueTotal.toLocaleString('en-IN')}`);
    data.overdue.forEach((m, i) => {
      lines.push(`  ${i + 1}. ${m.name} - ₹${m.amount.toLocaleString('en-IN')} (${m.daysOverdue}d late)`);
    });
    lines.push('');
  } else {
    lines.push('🔴 OVERDUE: None ✅');
    lines.push('');
  }

  // Due Tomorrow
  if (data.dueTomorrow.length > 0) {
    const dueTmrwTotal = data.dueTomorrow.reduce((s, m) => s + m.amount, 0);
    lines.push(`🟣 DUE TOMORROW (${data.dueTomorrow.length}) - ₹${dueTmrwTotal.toLocaleString('en-IN')}`);
    data.dueTomorrow.forEach((m, i) => {
      lines.push(`  ${i + 1}. ${m.name} - ₹${m.amount.toLocaleString('en-IN')}`);
    });
    lines.push('');
  }

  // Pending Installments
  if (data.pendingInstallments.length > 0) {
    lines.push(`📋 PENDING INSTALLMENTS (${data.pendingInstallments.length})`);
    data.pendingInstallments.forEach((m, i) => {
      lines.push(`  ${i + 1}. ${m.name} - ₹${m.amount.toLocaleString('en-IN')} (${m.installmentNumber}/${m.totalInstallments})`);
    });
    lines.push('');
  }

  lines.push('— Sent from FitFlow');

  return lines.join('\n');
}

/**
 * Fetch pending installments for the daily summary
 */
export async function fetchPendingInstallmentsForSummary(): Promise<DailySummaryData['pendingInstallments']> {
  try {
    const dueInstallments = await installmentService.getDueInstallments();
    return dueInstallments.map(d => ({
      name: d.member.full_name,
      amount: d.installment.amount,
      installmentNumber: d.installment.installment_number,
      totalInstallments: d.plan.num_installments,
    }));
  } catch {
    return [];
  }
}
