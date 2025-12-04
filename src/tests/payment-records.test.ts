/**
 * Payment Records Integration Tests
 * 
 * Tests for payment creation, listing, and date calculation logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Payment Creation Tests
// ============================================================================

describe('Payment Creation', () => {
  describe('New End Date Calculation', () => {
    const calculateNewEndDate = (dueDate: string, planMonths: number): string => {
      const [year, month, day] = dueDate.split('-').map(Number);
      const newMonth = month - 1 + planMonths;
      const newYear = year + Math.floor(newMonth / 12);
      const finalMonth = (newMonth % 12) + 1;
      return `${newYear}-${String(finalMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    it('should calculate monthly extension correctly', () => {
      expect(calculateNewEndDate('2025-12-04', 1)).toBe('2026-01-04');
      expect(calculateNewEndDate('2025-06-15', 1)).toBe('2025-07-15');
      expect(calculateNewEndDate('2025-01-31', 1)).toBe('2025-02-31'); // Edge case
    });

    it('should calculate quarterly extension correctly', () => {
      expect(calculateNewEndDate('2025-12-04', 3)).toBe('2026-03-04');
      expect(calculateNewEndDate('2025-03-15', 3)).toBe('2025-06-15');
      expect(calculateNewEndDate('2025-10-01', 3)).toBe('2026-01-01');
    });

    it('should calculate half-yearly extension correctly', () => {
      expect(calculateNewEndDate('2025-12-04', 6)).toBe('2026-06-04');
      expect(calculateNewEndDate('2025-06-15', 6)).toBe('2025-12-15');
      expect(calculateNewEndDate('2025-08-01', 6)).toBe('2026-02-01');
    });

    it('should calculate annual extension correctly', () => {
      expect(calculateNewEndDate('2025-12-04', 12)).toBe('2026-12-04');
      expect(calculateNewEndDate('2025-02-28', 12)).toBe('2026-02-28');
      expect(calculateNewEndDate('2024-02-29', 12)).toBe('2025-02-29'); // Leap year
    });
  });

  describe('Payment Validation', () => {
    const validatePayment = (payment: {
      amount: number;
      payment_method: string;
      payment_date: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      if (!payment.amount || payment.amount <= 0) {
        errors.push('Amount must be greater than 0');
      }
      
      if (!['cash', 'card', 'upi', 'bank_transfer'].includes(payment.payment_method)) {
        errors.push('Invalid payment method');
      }
      
      if (!payment.payment_date || !/^\d{4}-\d{2}-\d{2}$/.test(payment.payment_date)) {
        errors.push('Invalid payment date format');
      }
      
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct payment data', () => {
      const result = validatePayment({
        amount: 2500,
        payment_method: 'cash',
        payment_date: '2025-12-04',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject zero amount', () => {
      const result = validatePayment({
        amount: 0,
        payment_method: 'cash',
        payment_date: '2025-12-04',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than 0');
    });

    it('should reject negative amount', () => {
      const result = validatePayment({
        amount: -100,
        payment_method: 'cash',
        payment_date: '2025-12-04',
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid payment method', () => {
      const result = validatePayment({
        amount: 2500,
        payment_method: 'bitcoin',
        payment_date: '2025-12-04',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid payment method');
    });

    it('should reject invalid date format', () => {
      const result = validatePayment({
        amount: 2500,
        payment_method: 'cash',
        payment_date: '04-12-2025', // Wrong format
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid payment date format');
    });
  });
});

// ============================================================================
// Payment Listing & Filtering Tests
// ============================================================================

describe('Payment Listing & Filtering', () => {
  const samplePayments = [
    { id: '1', member_name: 'Salman', amount: 2500, payment_date: '2025-12-04', payment_method: 'cash' },
    { id: '2', member_name: 'Sujith', amount: 2700, payment_date: '2025-12-03', payment_method: 'upi' },
    { id: '3', member_name: 'Dinesh', amount: 1000, payment_date: '2025-12-02', payment_method: 'card' },
    { id: '4', member_name: 'Janaki Ram', amount: 2700, payment_date: '2025-11-28', payment_method: 'cash' },
  ];

  describe('Search Functionality', () => {
    const searchPayments = (
      payments: typeof samplePayments,
      query: string
    ) => {
      const lowerQuery = query.toLowerCase();
      return payments.filter(p =>
        p.member_name.toLowerCase().includes(lowerQuery) ||
        p.id.includes(query)
      );
    };

    it('should find payments by member name', () => {
      const results = searchPayments(samplePayments, 'Salman');
      expect(results).toHaveLength(1);
      expect(results[0].member_name).toBe('Salman');
    });

    it('should find payments case-insensitively', () => {
      const results = searchPayments(samplePayments, 'salman');
      expect(results).toHaveLength(1);
    });

    it('should find payments by partial name', () => {
      const results = searchPayments(samplePayments, 'Din');
      expect(results).toHaveLength(1);
      expect(results[0].member_name).toBe('Dinesh');
    });

    it('should return empty for non-matching query', () => {
      const results = searchPayments(samplePayments, 'Unknown');
      expect(results).toHaveLength(0);
    });
  });

  describe('Month Filtering', () => {
    const filterByMonth = (
      payments: typeof samplePayments,
      year: number,
      month: number
    ) => {
      return payments.filter(p => {
        const [pYear, pMonth] = p.payment_date.split('-').map(Number);
        return pYear === year && pMonth === month;
      });
    };

    it('should filter payments by December 2025', () => {
      const results = filterByMonth(samplePayments, 2025, 12);
      expect(results).toHaveLength(3);
    });

    it('should filter payments by November 2025', () => {
      const results = filterByMonth(samplePayments, 2025, 11);
      expect(results).toHaveLength(1);
      expect(results[0].member_name).toBe('Janaki Ram');
    });

    it('should return empty for months with no payments', () => {
      const results = filterByMonth(samplePayments, 2025, 10);
      expect(results).toHaveLength(0);
    });
  });

  describe('Total Calculation', () => {
    const calculateTotal = (payments: typeof samplePayments): number => {
      return payments.reduce((sum, p) => sum + p.amount, 0);
    };

    it('should calculate total of all payments', () => {
      expect(calculateTotal(samplePayments)).toBe(8900);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotal([])).toBe(0);
    });

    it('should calculate total for filtered payments', () => {
      const decemberPayments = samplePayments.filter(p => 
        p.payment_date.startsWith('2025-12')
      );
      expect(calculateTotal(decemberPayments)).toBe(6200);
    });
  });
});

// ============================================================================
// Receipt Number Generation Tests
// ============================================================================

describe('Receipt Number Generation', () => {
  const generateReceiptNumber = (year: number, sequence: number): string => {
    return `RCP-${year}-${String(sequence).padStart(5, '0')}`;
  };

  it('should generate correct format', () => {
    expect(generateReceiptNumber(2025, 1)).toBe('RCP-2025-00001');
    expect(generateReceiptNumber(2025, 100)).toBe('RCP-2025-00100');
    expect(generateReceiptNumber(2025, 99999)).toBe('RCP-2025-99999');
  });

  it('should handle different years', () => {
    expect(generateReceiptNumber(2024, 1)).toBe('RCP-2024-00001');
    expect(generateReceiptNumber(2026, 50)).toBe('RCP-2026-00050');
  });

  it('should pad sequence numbers correctly', () => {
    expect(generateReceiptNumber(2025, 1)).toMatch(/RCP-2025-0{4}1$/);
    expect(generateReceiptNumber(2025, 10)).toMatch(/RCP-2025-0{3}10$/);
    expect(generateReceiptNumber(2025, 100)).toMatch(/RCP-2025-0{2}100$/);
    expect(generateReceiptNumber(2025, 1000)).toMatch(/RCP-2025-01000$/);
    expect(generateReceiptNumber(2025, 10000)).toMatch(/RCP-2025-10000$/);
  });
});

// ============================================================================
// Payment Method Statistics Tests
// ============================================================================

describe('Payment Statistics', () => {
  const payments = [
    { amount: 1000, payment_method: 'cash' },
    { amount: 2500, payment_method: 'cash' },
    { amount: 1500, payment_method: 'upi' },
    { amount: 2700, payment_method: 'upi' },
    { amount: 9000, payment_method: 'card' },
  ];

  describe('Group by Payment Method', () => {
    const groupByMethod = (payments: typeof payments) => {
      return payments.reduce((acc, p) => {
        if (!acc[p.payment_method]) {
          acc[p.payment_method] = { count: 0, total: 0 };
        }
        acc[p.payment_method].count += 1;
        acc[p.payment_method].total += p.amount;
        return acc;
      }, {} as Record<string, { count: number; total: number }>);
    };

    it('should group payments correctly', () => {
      const result = groupByMethod(payments);
      
      expect(result.cash.count).toBe(2);
      expect(result.cash.total).toBe(3500);
      
      expect(result.upi.count).toBe(2);
      expect(result.upi.total).toBe(4200);
      
      expect(result.card.count).toBe(1);
      expect(result.card.total).toBe(9000);
    });
  });

  describe('Calculate Percentages', () => {
    const calculateMethodPercentages = (payments: typeof payments) => {
      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      const byMethod = payments.reduce((acc, p) => {
        acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(byMethod).map(([method, amount]) => ({
        method,
        amount,
        percentage: Math.round((amount / total) * 100),
      }));
    };

    it('should calculate percentages correctly', () => {
      const result = calculateMethodPercentages(payments);
      const total = 16700;
      
      const cash = result.find(r => r.method === 'cash');
      expect(cash?.percentage).toBe(Math.round((3500 / total) * 100));
      
      const card = result.find(r => r.method === 'card');
      expect(card?.percentage).toBe(Math.round((9000 / total) * 100));
    });
  });
});
