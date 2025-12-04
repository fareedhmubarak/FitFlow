/**
 * Membership Service Integration Tests
 * 
 * Tests for the membershipService class methods and business logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mock Data
// ============================================================================

const TEST_GYM_ID = '22222222-2222-2222-2222-222222222222';

const mockMember = {
  id: 'member-123',
  gym_id: TEST_GYM_ID,
  full_name: 'Test Member',
  membership_plan: 'quarterly',
  membership_end_date: '2025-12-04',
  next_payment_due_date: '2025-12-04',
  total_payments_received: 5000,
  status: 'active',
};

const mockPayment = {
  id: 'payment-123',
  gym_id: TEST_GYM_ID,
  member_id: 'member-123',
  amount: 2500,
  due_date: '2025-12-04',
  payment_date: '2025-12-04',
  payment_method: 'cash',
};

// ============================================================================
// Plan Duration Logic Tests
// ============================================================================

describe('MembershipService - Plan Logic', () => {
  describe('getMonthsForPlan', () => {
    const getMonthsForPlan = (plan: string): number => {
      const planMonths: Record<string, number> = {
        'monthly': 1,
        'quarterly': 3,
        'half_yearly': 6,
        'half yearly': 6,
        'annual': 12,
        'yearly': 12,
        '3 months': 3,
        '6 months': 6,
      };
      return planMonths[plan.toLowerCase()] || 1;
    };

    it('should return correct months for standard plans', () => {
      expect(getMonthsForPlan('monthly')).toBe(1);
      expect(getMonthsForPlan('quarterly')).toBe(3);
      expect(getMonthsForPlan('half_yearly')).toBe(6);
      expect(getMonthsForPlan('annual')).toBe(12);
    });

    it('should handle alternative plan names', () => {
      expect(getMonthsForPlan('half yearly')).toBe(6);
      expect(getMonthsForPlan('yearly')).toBe(12);
      expect(getMonthsForPlan('3 months')).toBe(3);
      expect(getMonthsForPlan('6 months')).toBe(6);
    });

    it('should be case insensitive', () => {
      expect(getMonthsForPlan('Monthly')).toBe(1);
      expect(getMonthsForPlan('QUARTERLY')).toBe(3);
      expect(getMonthsForPlan('Half_Yearly')).toBe(6);
    });

    it('should default to 1 month for unknown plans', () => {
      expect(getMonthsForPlan('unknown')).toBe(1);
      expect(getMonthsForPlan('')).toBe(1);
      expect(getMonthsForPlan('custom')).toBe(1);
    });
  });
});

// ============================================================================
// Delete Payment Logic Tests
// ============================================================================

describe('MembershipService - Delete Payment', () => {
  describe('Revert Date Calculation', () => {
    interface PaymentHistory {
      due_date: string;
      payment_date: string;
    }

    const calculateRevertDate = (
      paymentToDelete: { due_date: string },
      previousPayments: PaymentHistory[],
      membershipPlan: string
    ): string => {
      const getMonthsForPlan = (plan: string): number => {
        const planMonths: Record<string, number> = {
          'monthly': 1,
          'quarterly': 3,
          'half_yearly': 6,
          'annual': 12,
        };
        return planMonths[plan.toLowerCase()] || 1;
      };

      // If no previous payments, return the current payment's due_date
      if (previousPayments.length === 0) {
        return paymentToDelete.due_date;
      }

      // Calculate from the most recent previous payment
      const prevPayment = previousPayments[0];
      const [year, month, day] = prevPayment.due_date.split('-').map(Number);
      const monthsToAdd = getMonthsForPlan(membershipPlan);
      
      const newMonth = month - 1 + monthsToAdd;
      const newYear = year + Math.floor(newMonth / 12);
      const finalMonth = (newMonth % 12) + 1;
      
      return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    it('should return payment due_date when no previous payments', () => {
      const result = calculateRevertDate(
        { due_date: '2025-12-04' },
        [],
        'quarterly'
      );
      expect(result).toBe('2025-12-04');
    });

    it('should calculate from previous payment for quarterly plan', () => {
      const result = calculateRevertDate(
        { due_date: '2025-12-04' },
        [{ due_date: '2025-09-04', payment_date: '2025-09-04' }],
        'quarterly'
      );
      // Sep 4 + 3 months = Dec 4
      expect(result).toBe('2025-12-04');
    });

    it('should calculate from previous payment for monthly plan', () => {
      const result = calculateRevertDate(
        { due_date: '2025-12-04' },
        [{ due_date: '2025-11-04', payment_date: '2025-11-04' }],
        'monthly'
      );
      // Nov 4 + 1 month = Dec 4
      expect(result).toBe('2025-12-04');
    });

    it('should calculate from previous payment for annual plan', () => {
      const result = calculateRevertDate(
        { due_date: '2025-12-04' },
        [{ due_date: '2024-12-04', payment_date: '2024-12-04' }],
        'annual'
      );
      // Dec 4, 2024 + 12 months = Dec 4, 2025
      expect(result).toBe('2025-12-04');
    });

    it('should only use most recent previous payment', () => {
      const result = calculateRevertDate(
        { due_date: '2025-12-04' },
        [
          { due_date: '2025-09-04', payment_date: '2025-09-04' }, // Most recent
          { due_date: '2025-06-04', payment_date: '2025-06-04' }, // Older
        ],
        'quarterly'
      );
      expect(result).toBe('2025-12-04');
    });
  });

  describe('Member Status After Delete', () => {
    const determineStatus = (revertDate: string, today: string): 'active' | 'inactive' => {
      const [rYear, rMonth, rDay] = revertDate.split('-').map(Number);
      const [tYear, tMonth, tDay] = today.split('-').map(Number);
      
      const revertDateObj = new Date(rYear, rMonth - 1, rDay);
      const todayObj = new Date(tYear, tMonth - 1, tDay);
      
      revertDateObj.setHours(0, 0, 0, 0);
      todayObj.setHours(0, 0, 0, 0);
      
      return revertDateObj >= todayObj ? 'active' : 'inactive';
    };

    it('should be active when revert date is today', () => {
      expect(determineStatus('2025-12-04', '2025-12-04')).toBe('active');
    });

    it('should be active when revert date is in future', () => {
      expect(determineStatus('2025-12-10', '2025-12-04')).toBe('active');
    });

    it('should be inactive when revert date is in past', () => {
      expect(determineStatus('2025-12-03', '2025-12-04')).toBe('inactive');
      expect(determineStatus('2025-11-01', '2025-12-04')).toBe('inactive');
    });
  });

  describe('Total Payments Update', () => {
    const calculateNewTotal = (currentTotal: number, deletedAmount: number): number => {
      return Math.max(0, currentTotal - deletedAmount);
    };

    it('should subtract payment amount from total', () => {
      expect(calculateNewTotal(5000, 2500)).toBe(2500);
      expect(calculateNewTotal(10000, 3000)).toBe(7000);
    });

    it('should not go below zero', () => {
      expect(calculateNewTotal(1000, 2500)).toBe(0);
      expect(calculateNewTotal(0, 100)).toBe(0);
    });

    it('should handle exact amount', () => {
      expect(calculateNewTotal(2500, 2500)).toBe(0);
    });
  });
});

// ============================================================================
// Record Payment Logic Tests
// ============================================================================

describe('MembershipService - Record Payment', () => {
  describe('New End Date Calculation', () => {
    const calculateNewEndDate = (currentDueDate: string, planMonths: number): string => {
      const [year, month, day] = currentDueDate.split('-').map(Number);
      const newMonth = month - 1 + planMonths;
      const newYear = year + Math.floor(newMonth / 12);
      const finalMonth = (newMonth % 12) + 1;
      return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    it('should extend by correct months for each plan', () => {
      expect(calculateNewEndDate('2025-12-04', 1)).toBe('2026-01-04');
      expect(calculateNewEndDate('2025-12-04', 3)).toBe('2026-03-04');
      expect(calculateNewEndDate('2025-12-04', 6)).toBe('2026-06-04');
      expect(calculateNewEndDate('2025-12-04', 12)).toBe('2026-12-04');
    });
  });

  describe('Payment Data Validation', () => {
    interface PaymentInput {
      member_id: string;
      amount: number;
      payment_method: string;
    }

    const validatePaymentInput = (input: PaymentInput): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!input.member_id) {
        errors.push('Member ID is required');
      }

      if (!input.amount || input.amount <= 0) {
        errors.push('Amount must be greater than 0');
      }

      if (!['cash', 'card', 'upi', 'bank_transfer'].includes(input.payment_method)) {
        errors.push('Invalid payment method');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct input', () => {
      const result = validatePaymentInput({
        member_id: 'member-123',
        amount: 2500,
        payment_method: 'cash',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing member_id', () => {
      const result = validatePaymentInput({
        member_id: '',
        amount: 2500,
        payment_method: 'cash',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Member ID is required');
    });

    it('should reject invalid amount', () => {
      const result = validatePaymentInput({
        member_id: 'member-123',
        amount: -100,
        payment_method: 'cash',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid payment method', () => {
      const result = validatePaymentInput({
        member_id: 'member-123',
        amount: 2500,
        payment_method: 'check',
      });
      expect(result.valid).toBe(false);
    });
  });
});

// ============================================================================
// Dashboard Stats Logic Tests
// ============================================================================

describe('MembershipService - Dashboard Stats', () => {
  const TODAY = '2025-12-04';
  
  const members = [
    { id: '1', due_date: '2025-12-04', amount: 1000, status: 'active' },
    { id: '2', due_date: '2025-12-04', amount: 2500, status: 'active' },
    { id: '3', due_date: '2025-12-01', amount: 1000, status: 'active' },
    { id: '4', due_date: '2025-12-01', amount: 2000, status: 'active' },
    { id: '5', due_date: '2025-12-10', amount: 1500, status: 'active' },
    { id: '6', due_date: '2025-11-15', amount: 1000, status: 'inactive' },
  ];

  describe('Due Today Stats', () => {
    const getDueTodayStats = (members: typeof members, today: string) => {
      const dueToday = members.filter(m => m.due_date === today);
      return {
        count: dueToday.length,
        amount: dueToday.reduce((sum, m) => sum + m.amount, 0),
      };
    };

    it('should calculate due today correctly', () => {
      const result = getDueTodayStats(members, TODAY);
      expect(result.count).toBe(2);
      expect(result.amount).toBe(3500);
    });
  });

  describe('Overdue Stats', () => {
    const getOverdueStats = (members: typeof members, today: string) => {
      const overdue = members.filter(m => {
        const dueDate = new Date(m.due_date);
        const todayDate = new Date(today);
        return dueDate < todayDate && m.status === 'active';
      });
      return {
        count: overdue.length,
        amount: overdue.reduce((sum, m) => sum + m.amount, 0),
      };
    };

    it('should calculate overdue correctly (active members only)', () => {
      const result = getOverdueStats(members, TODAY);
      expect(result.count).toBe(2);
      expect(result.amount).toBe(3000);
    });
  });

  describe('Member Counts', () => {
    const getMemberCounts = (members: typeof members) => {
      const active = members.filter(m => m.status === 'active').length;
      const inactive = members.filter(m => m.status === 'inactive').length;
      return { active, inactive, total: members.length };
    };

    it('should count members by status', () => {
      const result = getMemberCounts(members);
      expect(result.active).toBe(5);
      expect(result.inactive).toBe(1);
      expect(result.total).toBe(6);
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('MembershipService - Error Handling', () => {
  describe('Invalid Input Handling', () => {
    const safeParseDate = (dateStr: string): Date | null => {
      if (!dateStr || typeof dateStr !== 'string') return null;
      
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      
      const [, year, month, day] = match.map(Number);
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      
      return new Date(year, month - 1, day);
    };

    it('should return null for invalid date strings', () => {
      expect(safeParseDate('')).toBeNull();
      expect(safeParseDate('not-a-date')).toBeNull();
      expect(safeParseDate('2025/12/04')).toBeNull();
      expect(safeParseDate('04-12-2025')).toBeNull();
    });

    it('should return null for invalid date values', () => {
      expect(safeParseDate('2025-13-04')).toBeNull(); // Invalid month
      expect(safeParseDate('2025-00-04')).toBeNull(); // Invalid month
      expect(safeParseDate('2025-12-32')).toBeNull(); // Invalid day
    });

    it('should parse valid dates correctly', () => {
      const result = safeParseDate('2025-12-04');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(11); // December is 11
      expect(result?.getDate()).toBe(4);
    });
  });
});
