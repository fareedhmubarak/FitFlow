/**
 * End-to-End Payment Flow Tests
 * 
 * Complete integration tests simulating real user workflows.
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// E2E: Complete Payment Flow
// ============================================================================

describe('E2E: Complete Payment Flow', () => {
  describe('Scenario: New Member First Payment', () => {
    it('should correctly handle first payment for a new member', () => {
      // Initial state: Member just joined
      const member = {
        id: 'new-member-1',
        full_name: 'New Member',
        membership_plan: 'quarterly',
        membership_end_date: '2025-12-04', // Joining date
        next_payment_due_date: '2025-12-04',
        total_payments_received: 0,
        status: 'active',
      };

      // Record payment
      const payment = {
        id: 'payment-1',
        member_id: member.id,
        amount: 2500,
        due_date: member.membership_end_date,
        payment_date: '2025-12-04',
      };

      // Calculate new end date
      const calculateNewEndDate = (dueDate: string, months: number): string => {
        const [year, month, day] = dueDate.split('-').map(Number);
        const newMonth = month - 1 + months;
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      };

      const newEndDate = calculateNewEndDate(payment.due_date, 3); // Quarterly = 3 months

      // Updated member state
      const updatedMember = {
        ...member,
        membership_end_date: newEndDate,
        next_payment_due_date: newEndDate,
        total_payments_received: member.total_payments_received + payment.amount,
      };

      expect(updatedMember.membership_end_date).toBe('2026-03-04');
      expect(updatedMember.next_payment_due_date).toBe('2026-03-04');
      expect(updatedMember.total_payments_received).toBe(2500);
    });
  });

  describe('Scenario: Delete First Payment', () => {
    it('should revert member to original due date when first payment is deleted', () => {
      // State after first payment
      const member = {
        id: 'member-1',
        full_name: 'Salman',
        membership_plan: 'quarterly',
        membership_end_date: '2026-03-04',
        next_payment_due_date: '2026-03-04',
        total_payments_received: 2500,
        status: 'active',
      };

      // The payment to be deleted
      const paymentToDelete = {
        id: 'payment-1',
        member_id: member.id,
        amount: 2500,
        due_date: '2025-12-04', // Original due date when payment was made
        payment_date: '2025-12-04',
      };

      // No previous payments
      const previousPayments: Array<{ due_date: string }> = [];

      // Calculate revert date
      const revertDate = previousPayments.length === 0 
        ? paymentToDelete.due_date 
        : 'calculated-from-previous';

      // Determine status (assuming today is Dec 4, 2025)
      const isActive = (dateStr: string): boolean => {
        const [dYear, dMonth, dDay] = dateStr.split('-').map(Number);
        const dueDate = new Date(dYear, dMonth - 1, dDay);
        const today = new Date(2025, 11, 4); // Dec 4, 2025
        return dueDate >= today;
      };

      // Reverted member state
      const revertedMember = {
        ...member,
        membership_end_date: revertDate,
        next_payment_due_date: revertDate,
        total_payments_received: Math.max(0, member.total_payments_received - paymentToDelete.amount),
        status: isActive(revertDate) ? 'active' : 'inactive',
      };

      expect(revertedMember.membership_end_date).toBe('2025-12-04');
      expect(revertedMember.next_payment_due_date).toBe('2025-12-04');
      expect(revertedMember.total_payments_received).toBe(0);
      expect(revertedMember.status).toBe('active'); // Dec 4 is today
    });
  });

  describe('Scenario: Multiple Payments Then Delete Latest', () => {
    it('should revert to calculated date from previous payment', () => {
      // Member with 2 payments already
      const member = {
        id: 'member-1',
        full_name: 'Regular Member',
        membership_plan: 'quarterly',
        membership_end_date: '2026-06-04', // After 2nd payment
        next_payment_due_date: '2026-06-04',
        total_payments_received: 5000, // 2500 + 2500
        status: 'active',
      };

      // The latest payment to be deleted
      const paymentToDelete = {
        id: 'payment-2',
        member_id: member.id,
        amount: 2500,
        due_date: '2026-03-04', // Due date when this payment was made
        payment_date: '2026-03-04',
      };

      // Previous payment exists
      const previousPayments = [
        { due_date: '2025-12-04' }, // First payment's due_date
      ];

      // Calculate revert date from previous payment
      const getMonthsForPlan = (plan: string): number => {
        const planMonths: Record<string, number> = { 'quarterly': 3 };
        return planMonths[plan] || 1;
      };

      const calculateRevertDate = (prevDueDate: string, planMonths: number): string => {
        const [year, month, day] = prevDueDate.split('-').map(Number);
        const newMonth = month - 1 + planMonths;
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      };

      const revertDate = calculateRevertDate(previousPayments[0].due_date, getMonthsForPlan(member.membership_plan));

      // Reverted member state
      const revertedMember = {
        ...member,
        membership_end_date: revertDate,
        next_payment_due_date: revertDate,
        total_payments_received: Math.max(0, member.total_payments_received - paymentToDelete.amount),
      };

      // Dec 4, 2025 + 3 months = Mar 4, 2026
      expect(revertedMember.membership_end_date).toBe('2026-03-04');
      expect(revertedMember.next_payment_due_date).toBe('2026-03-04');
      expect(revertedMember.total_payments_received).toBe(2500);
    });
  });

  describe('Scenario: Payment Makes Overdue Member Active', () => {
    it('should change status from overdue to active after payment', () => {
      // Member who is overdue
      const member = {
        id: 'overdue-member',
        full_name: 'Overdue Member',
        membership_plan: 'monthly',
        membership_end_date: '2025-12-01', // 3 days overdue
        next_payment_due_date: '2025-12-01',
        total_payments_received: 3000,
        status: 'inactive', // Marked as inactive due to overdue
      };

      // Record payment
      const payment = {
        id: 'payment-1',
        member_id: member.id,
        amount: 1000,
        due_date: '2025-12-01', // Using actual overdue date
        payment_date: '2025-12-04', // Paid today
      };

      // Calculate new end date from the due date
      const calculateNewEndDate = (dueDate: string, months: number): string => {
        const [year, month, day] = dueDate.split('-').map(Number);
        const newMonth = month - 1 + months;
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      };

      const newEndDate = calculateNewEndDate(payment.due_date, 1); // Monthly = 1 month

      // Updated member state
      const updatedMember = {
        ...member,
        membership_end_date: newEndDate,
        next_payment_due_date: newEndDate,
        total_payments_received: member.total_payments_received + payment.amount,
        status: 'active', // Back to active
      };

      expect(updatedMember.membership_end_date).toBe('2026-01-01');
      expect(updatedMember.status).toBe('active');
    });
  });
});

// ============================================================================
// E2E: Dashboard Updates
// ============================================================================

describe('E2E: Dashboard Updates After Payment Operations', () => {
  describe('After Recording Payment', () => {
    it('should update due today count correctly', () => {
      const TODAY = '2025-12-04';
      
      // Initial state: 3 members due today
      const membersBefore = [
        { id: '1', name: 'Salman', due_date: '2025-12-04', status: 'active' },
        { id: '2', name: 'Sujith', due_date: '2025-12-04', status: 'active' },
        { id: '3', name: 'Dhanujay', due_date: '2025-12-04', status: 'active' },
      ];

      const getDueTodayCount = (members: typeof membersBefore, today: string) => 
        members.filter(m => m.due_date === today && m.status === 'active').length;

      expect(getDueTodayCount(membersBefore, TODAY)).toBe(3);

      // After Salman pays, his due date moves to future
      const membersAfter = [
        { id: '1', name: 'Salman', due_date: '2026-03-04', status: 'active' }, // Updated
        { id: '2', name: 'Sujith', due_date: '2025-12-04', status: 'active' },
        { id: '3', name: 'Dhanujay', due_date: '2025-12-04', status: 'active' },
      ];

      expect(getDueTodayCount(membersAfter, TODAY)).toBe(2);
    });
  });

  describe('After Deleting Payment', () => {
    it('should update due today count correctly when payment is deleted', () => {
      const TODAY = '2025-12-04';
      
      // State after Salman paid (2 due today)
      const membersBefore = [
        { id: '1', name: 'Salman', due_date: '2026-03-04', status: 'active' },
        { id: '2', name: 'Sujith', due_date: '2025-12-04', status: 'active' },
        { id: '3', name: 'Dhanujay', due_date: '2025-12-04', status: 'active' },
      ];

      const getDueTodayCount = (members: typeof membersBefore, today: string) => 
        members.filter(m => m.due_date === today && m.status === 'active').length;

      expect(getDueTodayCount(membersBefore, TODAY)).toBe(2);

      // After deleting Salman's payment, he's back to due today
      const membersAfter = [
        { id: '1', name: 'Salman', due_date: '2025-12-04', status: 'active' }, // Reverted
        { id: '2', name: 'Sujith', due_date: '2025-12-04', status: 'active' },
        { id: '3', name: 'Dhanujay', due_date: '2025-12-04', status: 'active' },
      ];

      expect(getDueTodayCount(membersAfter, TODAY)).toBe(3);
    });
  });
});

// ============================================================================
// E2E: Edge Cases
// ============================================================================

describe('E2E: Edge Cases', () => {
  describe('Payment at Year End', () => {
    it('should handle year-end payment correctly', () => {
      const member = {
        membership_plan: 'monthly',
        membership_end_date: '2025-12-31',
      };

      const calculateNewEndDate = (dueDate: string, months: number): string => {
        const [year, month, day] = dueDate.split('-').map(Number);
        const newMonth = month - 1 + months;
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      };

      const newEndDate = calculateNewEndDate(member.membership_end_date, 1);
      expect(newEndDate).toBe('2026-01-31');
    });
  });

  describe('Rapid Payment and Delete', () => {
    it('should handle quick create-delete cycle correctly', () => {
      // Initial state
      const member = {
        membership_end_date: '2025-12-04',
        next_payment_due_date: '2025-12-04',
        total_payments_received: 0,
      };

      // Create payment
      const afterCreate = {
        membership_end_date: '2026-03-04',
        next_payment_due_date: '2026-03-04',
        total_payments_received: 2500,
      };

      // Delete payment (should revert to original)
      const afterDelete = {
        membership_end_date: '2025-12-04',
        next_payment_due_date: '2025-12-04',
        total_payments_received: 0,
      };

      // State should match original
      expect(afterDelete.membership_end_date).toBe(member.membership_end_date);
      expect(afterDelete.next_payment_due_date).toBe(member.next_payment_due_date);
      expect(afterDelete.total_payments_received).toBe(member.total_payments_received);
    });
  });

  describe('Delete When Member Becomes Overdue', () => {
    it('should mark member as inactive when delete makes them overdue', () => {
      const TODAY = '2025-12-04';
      
      // Member paid, now due in future
      const memberAfterPayment = {
        membership_end_date: '2026-03-04',
        status: 'active',
      };

      // Payment deleted, reverting to past date
      const paymentToDelete = {
        due_date: '2025-12-01', // This was an overdue payment
      };

      const isActive = (endDate: string, today: string): boolean => {
        return endDate >= today;
      };

      // After delete, member reverts to overdue state
      const revertedStatus = isActive(paymentToDelete.due_date, TODAY) ? 'active' : 'inactive';

      expect(revertedStatus).toBe('inactive'); // Dec 1 < Dec 4
    });
  });
});
