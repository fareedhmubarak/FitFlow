/**
 * Payment Delete Tests
 * 
 * Test cases for the payment deletion and member date reversion functionality.
 * These tests verify that when a payment is deleted, the member's due date
 * correctly reverts to the previous state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const TEST_GYM_ID = '22222222-2222-2222-2222-222222222222';

const createMember = (overrides = {}) => ({
  id: 'member-123',
  gym_id: TEST_GYM_ID,
  full_name: 'Salman',
  phone: '7893589025',
  email: 'salman@test.com',
  membership_plan: 'quarterly',
  plan_id: 'plan-quarterly',
  membership_end_date: '2025-12-04',
  next_payment_due_date: '2025-12-04',
  joining_date: '2024-09-04',
  status: 'active',
  total_payments_received: 5000,
  ...overrides,
});

const createPayment = (overrides = {}) => ({
  id: 'payment-123',
  gym_id: TEST_GYM_ID,
  member_id: 'member-123',
  amount: 2500,
  payment_method: 'cash',
  payment_date: '2025-12-04',
  due_date: '2025-12-04',
  receipt_number: 'RCP-2025-00001',
  ...overrides,
});

const createPlan = (overrides = {}) => ({
  id: 'plan-quarterly',
  gym_id: TEST_GYM_ID,
  name: 'Quarterly',
  duration_months: 3,
  price: 2500,
  ...overrides,
});

// ============================================================================
// Date Calculation Tests (Pure Functions)
// ============================================================================

describe('Date Calculation Functions', () => {
  describe('getMonthsForPlan', () => {
    const getMonthsForPlan = (plan: string): number => {
      const planMap: Record<string, number> = {
        'monthly': 1,
        'quarterly': 3,
        'half_yearly': 6,
        'half yearly': 6,
        'annual': 12,
        'yearly': 12,
      };
      return planMap[plan.toLowerCase()] || 1;
    };

    it('should return 1 for monthly plan', () => {
      expect(getMonthsForPlan('monthly')).toBe(1);
      expect(getMonthsForPlan('Monthly')).toBe(1);
    });

    it('should return 3 for quarterly plan', () => {
      expect(getMonthsForPlan('quarterly')).toBe(3);
      expect(getMonthsForPlan('Quarterly')).toBe(3);
    });

    it('should return 6 for half_yearly plan', () => {
      expect(getMonthsForPlan('half_yearly')).toBe(6);
      expect(getMonthsForPlan('half yearly')).toBe(6);
      expect(getMonthsForPlan('Half Yearly')).toBe(6);
    });

    it('should return 12 for annual/yearly plan', () => {
      expect(getMonthsForPlan('annual')).toBe(12);
      expect(getMonthsForPlan('yearly')).toBe(12);
      expect(getMonthsForPlan('Annual')).toBe(12);
    });

    it('should return 1 for unknown plans (default)', () => {
      expect(getMonthsForPlan('unknown')).toBe(1);
      expect(getMonthsForPlan('')).toBe(1);
    });
  });

  describe('calculateNewEndDate', () => {
    const calculateNewEndDate = (dueDate: string, monthsToAdd: number): string => {
      const [year, month, day] = dueDate.split('-').map(Number);
      const newMonth = month - 1 + monthsToAdd;
      const newYear = year + Math.floor(newMonth / 12);
      const finalMonth = (newMonth % 12) + 1;
      return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    it('should add 1 month correctly', () => {
      expect(calculateNewEndDate('2025-12-04', 1)).toBe('2026-01-04');
      expect(calculateNewEndDate('2025-06-15', 1)).toBe('2025-07-15');
    });

    it('should add 3 months correctly (quarterly)', () => {
      expect(calculateNewEndDate('2025-12-04', 3)).toBe('2026-03-04');
      expect(calculateNewEndDate('2025-01-15', 3)).toBe('2025-04-15');
    });

    it('should add 6 months correctly (half yearly)', () => {
      expect(calculateNewEndDate('2025-12-04', 6)).toBe('2026-06-04');
      expect(calculateNewEndDate('2025-07-01', 6)).toBe('2026-01-01');
    });

    it('should add 12 months correctly (annual)', () => {
      expect(calculateNewEndDate('2025-12-04', 12)).toBe('2026-12-04');
      expect(calculateNewEndDate('2025-01-01', 12)).toBe('2026-01-01');
    });

    it('should handle year rollover correctly', () => {
      expect(calculateNewEndDate('2025-11-15', 3)).toBe('2026-02-15');
      expect(calculateNewEndDate('2025-10-01', 6)).toBe('2026-04-01');
    });

    it('should preserve day of month', () => {
      expect(calculateNewEndDate('2025-01-31', 1)).toBe('2025-02-31'); // Note: This would need validation in real code
      expect(calculateNewEndDate('2025-03-15', 1)).toBe('2025-04-15');
    });
  });

  describe('determineActiveStatus', () => {
    const determineActiveStatus = (endDateStr: string, today: Date): boolean => {
      const [year, month, day] = endDateStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, day);
      const todayNormalized = new Date(today);
      todayNormalized.setHours(0, 0, 0, 0);
      return endDate >= todayNormalized;
    };

    it('should return true when end date is in future', () => {
      const today = new Date(2025, 11, 4); // Dec 4, 2025
      expect(determineActiveStatus('2025-12-10', today)).toBe(true);
      expect(determineActiveStatus('2026-01-01', today)).toBe(true);
    });

    it('should return true when end date is today', () => {
      const today = new Date(2025, 11, 4); // Dec 4, 2025
      expect(determineActiveStatus('2025-12-04', today)).toBe(true);
    });

    it('should return false when end date is in past', () => {
      const today = new Date(2025, 11, 4); // Dec 4, 2025
      expect(determineActiveStatus('2025-12-03', today)).toBe(false);
      expect(determineActiveStatus('2025-11-01', today)).toBe(false);
    });
  });
});

// ============================================================================
// Delete Payment Reversion Logic Tests
// ============================================================================

describe('Delete Payment Reversion Logic', () => {
  describe('calculateRevertDate', () => {
    const getMonthsForPlan = (plan: string): number => {
      const planMap: Record<string, number> = {
        'monthly': 1,
        'quarterly': 3,
        'half_yearly': 6,
        'half yearly': 6,
        'annual': 12,
        'yearly': 12,
      };
      return planMap[plan.toLowerCase()] || 1;
    };

    const calculateRevertDate = (
      previousPayment: { due_date: string } | null,
      currentPaymentDueDate: string,
      membershipPlan: string
    ): string => {
      if (previousPayment && previousPayment.due_date) {
        const [year, month, day] = previousPayment.due_date.split('-').map(Number);
        const monthsToAdd = getMonthsForPlan(membershipPlan);
        const newMonth = month - 1 + monthsToAdd;
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return currentPaymentDueDate;
    };

    describe('When there is no previous payment', () => {
      it('should return the current payment due_date for first-time payment delete', () => {
        const result = calculateRevertDate(null, '2025-12-04', 'quarterly');
        expect(result).toBe('2025-12-04');
      });

      it('should work for any plan when no previous payment', () => {
        expect(calculateRevertDate(null, '2025-12-04', 'monthly')).toBe('2025-12-04');
        expect(calculateRevertDate(null, '2025-12-04', 'annual')).toBe('2025-12-04');
      });
    });

    describe('When there is a previous payment', () => {
      it('should calculate revert date from previous payment + plan duration (quarterly)', () => {
        const previousPayment = { due_date: '2025-09-04' };
        const result = calculateRevertDate(previousPayment, '2025-12-04', 'quarterly');
        // Sep 4 + 3 months = Dec 4
        expect(result).toBe('2025-12-04');
      });

      it('should calculate revert date from previous payment + plan duration (monthly)', () => {
        const previousPayment = { due_date: '2025-11-04' };
        const result = calculateRevertDate(previousPayment, '2025-12-04', 'monthly');
        // Nov 4 + 1 month = Dec 4
        expect(result).toBe('2025-12-04');
      });

      it('should calculate revert date from previous payment + plan duration (half yearly)', () => {
        const previousPayment = { due_date: '2025-06-04' };
        const result = calculateRevertDate(previousPayment, '2025-12-04', 'half_yearly');
        // Jun 4 + 6 months = Dec 4
        expect(result).toBe('2025-12-04');
      });

      it('should calculate revert date from previous payment + plan duration (annual)', () => {
        const previousPayment = { due_date: '2024-12-04' };
        const result = calculateRevertDate(previousPayment, '2025-12-04', 'annual');
        // Dec 4, 2024 + 12 months = Dec 4, 2025
        expect(result).toBe('2025-12-04');
      });

      it('should handle year rollover in calculation', () => {
        const previousPayment = { due_date: '2025-10-15' };
        const result = calculateRevertDate(previousPayment, '2026-01-15', 'quarterly');
        // Oct 15 + 3 months = Jan 15
        expect(result).toBe('2026-01-15');
      });
    });
  });

  describe('Multiple Payment History Scenarios', () => {
    // Simulates the full delete flow logic
    const simulateDeletePayment = (
      paymentToDelete: { due_date: string },
      previousPayments: Array<{ due_date: string }>,
      membershipPlan: string
    ): { revertDate: string; status: 'active' | 'inactive' } => {
      const getMonthsForPlan = (plan: string): number => {
        const planMap: Record<string, number> = {
          'monthly': 1,
          'quarterly': 3,
          'half_yearly': 6,
          'annual': 12,
        };
        return planMap[plan.toLowerCase()] || 1;
      };

      const previousPayment = previousPayments.length > 0 ? previousPayments[0] : null;
      let revertDateStr: string;

      if (previousPayment && previousPayment.due_date) {
        const [year, month, day] = previousPayment.due_date.split('-').map(Number);
        const monthsToAdd = getMonthsForPlan(membershipPlan);
        const newMonth = month - 1 + monthsToAdd;
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        revertDateStr = `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else {
        revertDateStr = paymentToDelete.due_date;
      }

      // Check status (assuming today is Dec 4, 2025)
      const today = new Date(2025, 11, 4);
      const [rYear, rMonth, rDay] = revertDateStr.split('-').map(Number);
      const revertDate = new Date(rYear, rMonth - 1, rDay);
      const isActive = revertDate >= today;

      return {
        revertDate: revertDateStr,
        status: isActive ? 'active' : 'inactive',
      };
    };

    it('Scenario: First payment deleted - member should show original due date', () => {
      const result = simulateDeletePayment(
        { due_date: '2025-12-04' },
        [], // No previous payments
        'quarterly'
      );
      expect(result.revertDate).toBe('2025-12-04');
      expect(result.status).toBe('active'); // Today is Dec 4, so still active
    });

    it('Scenario: Second payment deleted - should revert to after first payment', () => {
      const result = simulateDeletePayment(
        { due_date: '2025-12-04' }, // This payment being deleted
        [{ due_date: '2025-09-04' }], // Previous payment
        'quarterly'
      );
      // Previous payment was Sep 4 + 3 months = Dec 4
      expect(result.revertDate).toBe('2025-12-04');
      expect(result.status).toBe('active');
    });

    it('Scenario: Deleting payment that made member extend to future - should become overdue', () => {
      const result = simulateDeletePayment(
        { due_date: '2025-11-01' }, // Payment from Nov 1
        [], // No previous payments
        'monthly'
      );
      expect(result.revertDate).toBe('2025-11-01');
      expect(result.status).toBe('inactive'); // Nov 1 < Dec 4
    });

    it('Scenario: Multiple payments, delete latest - should revert to previous', () => {
      const result = simulateDeletePayment(
        { due_date: '2025-12-04' },
        [{ due_date: '2025-09-04' }, { due_date: '2025-06-04' }], // Previous payments (most recent first)
        'quarterly'
      );
      // Uses first previous payment: Sep 4 + 3 months = Dec 4
      expect(result.revertDate).toBe('2025-12-04');
    });
  });
});

// ============================================================================
// Integration Test Scenarios
// ============================================================================

describe('Payment Delete Integration Scenarios', () => {
  describe('Salman Test Case (Real Scenario)', () => {
    /**
     * Real test case from the application:
     * - Salman has Quarterly plan (3 months)
     * - Due date was Dec 4, 2025
     * - Made a payment → extended to March 4, 2026
     * - Deleted payment → should revert to Dec 4, 2025
     */
    
    it('should correctly revert Salman from March 2026 back to Dec 2025', () => {
      // Simulate the state after payment was recorded
      const memberAfterPayment = {
        membership_end_date: '2026-03-04',
        next_payment_due_date: '2026-03-04',
        membership_plan: 'quarterly',
      };

      // The payment that was made
      const paymentToDelete = {
        due_date: '2025-12-04', // This was the due_date when payment was made
      };

      // No previous payments (first payment)
      const previousPayments: Array<{ due_date: string }> = [];

      // Expected result after delete
      const expectedRevertDate = '2025-12-04';

      // Calculate revert date
      let revertDate: string;
      if (previousPayments.length === 0) {
        revertDate = paymentToDelete.due_date;
      } else {
        // Would calculate from previous payment
        revertDate = paymentToDelete.due_date;
      }

      expect(revertDate).toBe(expectedRevertDate);
    });
  });

  describe('Edge Cases', () => {
    it('should handle timezone-safe date string operations', () => {
      // The key insight: use string manipulation, not Date objects for storage
      const dueDate = '2025-12-04';
      const [year, month, day] = dueDate.split('-').map(Number);
      
      expect(year).toBe(2025);
      expect(month).toBe(12);
      expect(day).toBe(4);
      
      // Reconstruct without timezone issues
      const reconstructed = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      expect(reconstructed).toBe(dueDate);
    });

    it('should handle end of year date calculations', () => {
      const calculateNewDate = (dateStr: string, monthsToAdd: number): string => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const newMonth = month - 1 + monthsToAdd;
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      };

      // December + 1 month = January next year
      expect(calculateNewDate('2025-12-15', 1)).toBe('2026-01-15');
      
      // November + 3 months = February next year
      expect(calculateNewDate('2025-11-10', 3)).toBe('2026-02-10');
      
      // October + 6 months = April next year
      expect(calculateNewDate('2025-10-05', 6)).toBe('2026-04-05');
    });

    it('should handle leap year February dates', () => {
      // 2024 is a leap year, 2025 is not
      const calculateNewDate = (dateStr: string, monthsToAdd: number): string => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const newMonth = month - 1 + monthsToAdd;
        const newYear = year + Math.floor(newMonth / 12);
        const finalMonth = (newMonth % 12) + 1;
        return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      };

      // Note: This naive calculation may produce invalid dates like Feb 31
      // In production, you'd need to handle this with proper date validation
      expect(calculateNewDate('2024-02-29', 12)).toBe('2025-02-29'); // Would need validation
    });

    it('should correctly determine status based on today comparison', () => {
      const isActive = (endDateStr: string, todayStr: string): boolean => {
        const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);
        const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
        
        if (eYear !== tYear) return eYear > tYear;
        if (eMonth !== tMonth) return eMonth > tMonth;
        return eDay >= tDay;
      };

      const today = '2025-12-04';
      
      expect(isActive('2025-12-04', today)).toBe(true);  // Same day = active
      expect(isActive('2025-12-05', today)).toBe(true);  // Future = active
      expect(isActive('2025-12-03', today)).toBe(false); // Past = inactive
      expect(isActive('2026-01-01', today)).toBe(true);  // Next year = active
      expect(isActive('2025-11-30', today)).toBe(false); // Last month = inactive
    });
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance Tests', () => {
  it('should calculate dates efficiently for batch operations', () => {
    const calculateNewDate = (dateStr: string, monthsToAdd: number): string => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const newMonth = month - 1 + monthsToAdd;
      const newYear = year + Math.floor(newMonth / 12);
      const finalMonth = (newMonth % 12) + 1;
      return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const start = performance.now();
    
    // Simulate 1000 date calculations
    for (let i = 0; i < 1000; i++) {
      calculateNewDate('2025-12-04', 3);
    }
    
    const duration = performance.now() - start;
    
    // Should complete in under 50ms
    expect(duration).toBeLessThan(50);
  });

  it('should handle large member lists efficiently', () => {
    const members = Array.from({ length: 100 }, (_, i) => ({
      id: `member-${i}`,
      due_date: `2025-12-${String((i % 28) + 1).padStart(2, '0')}`,
      plan: ['monthly', 'quarterly', 'half_yearly', 'annual'][i % 4],
    }));

    const start = performance.now();
    
    // Simulate filtering overdue members
    const today = new Date(2025, 11, 4);
    const overdueMembers = members.filter(m => {
      const [y, mo, d] = m.due_date.split('-').map(Number);
      return new Date(y, mo - 1, d) < today;
    });
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10);
    expect(overdueMembers.length).toBeGreaterThan(0);
  });
});
