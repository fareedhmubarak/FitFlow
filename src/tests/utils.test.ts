/**
 * Utility Functions Tests
 * 
 * Tests for utility/helper functions used across the application.
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Currency Formatting Tests
// ============================================================================

describe('Currency Formatting', () => {
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  it('should format currency with Indian locale', () => {
    expect(formatCurrency(1000)).toBe('₹1,000');
    expect(formatCurrency(10000)).toBe('₹10,000');
    expect(formatCurrency(100000)).toBe('₹1,00,000');
    expect(formatCurrency(1000000)).toBe('₹10,00,000');
  });

  it('should handle small amounts', () => {
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency(100)).toBe('₹100');
    expect(formatCurrency(999)).toBe('₹999');
  });

  it('should handle decimal amounts', () => {
    const formatWithDecimals = (amount: number): string => {
      return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };
    
    expect(formatWithDecimals(1000.50)).toBe('₹1,000.50');
  });
});

// ============================================================================
// Phone Number Formatting Tests
// ============================================================================

describe('Phone Number Formatting', () => {
  const formatPhone = (phone: string | null): string => {
    if (!phone) return 'N/A';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Indian phone format: XXXXX XXXXX
    if (digits.length === 10) {
      return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    
    return phone;
  };

  it('should format 10-digit Indian numbers', () => {
    expect(formatPhone('7893589025')).toBe('78935 89025');
    expect(formatPhone('9876543210')).toBe('98765 43210');
  });

  it('should handle null values', () => {
    expect(formatPhone(null)).toBe('N/A');
  });

  it('should return original for non-standard formats', () => {
    expect(formatPhone('+91 7893589025')).toBe('+91 7893589025'); // 12 digits
    expect(formatPhone('789')).toBe('789');
  });
});

// ============================================================================
// Name Initials Tests
// ============================================================================

describe('Name Initials', () => {
  const getInitials = (name: string): string => {
    if (!name) return '?';
    
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  it('should get single initial for single name', () => {
    expect(getInitials('Salman')).toBe('S');
    expect(getInitials('dinesh')).toBe('D');
  });

  it('should get first and last initials for full name', () => {
    expect(getInitials('Salman Khan')).toBe('SK');
    expect(getInitials('Mohan Kumar')).toBe('MK');
    expect(getInitials('Dhanujay Reddy')).toBe('DR');
  });

  it('should handle multiple middle names', () => {
    expect(getInitials('Janaki Ram Kumar')).toBe('JK');
    expect(getInitials('N. Babu Rao')).toBe('NR');
  });

  it('should handle empty input', () => {
    expect(getInitials('')).toBe('?');
  });

  it('should handle extra spaces', () => {
    expect(getInitials('  Salman   Khan  ')).toBe('SK');
  });
});

// ============================================================================
// Plan Name Normalization Tests
// ============================================================================

describe('Plan Name Normalization', () => {
  const normalizePlanName = (name: string): string => {
    const normalized = name.toLowerCase().trim();
    
    const mappings: Record<string, string> = {
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      '3 months': 'Quarterly',
      'half yearly': 'Half Yearly',
      'half_yearly': 'Half Yearly',
      '6 months': 'Half Yearly',
      'annual': 'Annual',
      'yearly': 'Annual',
      '12 months': 'Annual',
    };
    
    return mappings[normalized] || name;
  };

  it('should normalize standard names', () => {
    expect(normalizePlanName('monthly')).toBe('Monthly');
    expect(normalizePlanName('QUARTERLY')).toBe('Quarterly');
    expect(normalizePlanName('half_yearly')).toBe('Half Yearly');
    expect(normalizePlanName('annual')).toBe('Annual');
  });

  it('should handle alternative names', () => {
    expect(normalizePlanName('3 months')).toBe('Quarterly');
    expect(normalizePlanName('6 months')).toBe('Half Yearly');
    expect(normalizePlanName('12 months')).toBe('Annual');
    expect(normalizePlanName('yearly')).toBe('Annual');
  });

  it('should return original for unknown names', () => {
    expect(normalizePlanName('Custom Plan')).toBe('Custom Plan');
  });
});

// ============================================================================
// Search/Filter Tests
// ============================================================================

describe('Search & Filter', () => {
  const members = [
    { id: '1', name: 'Salman Khan', phone: '7893589025', plan: 'quarterly' },
    { id: '2', name: 'Sujith Kumar', phone: '9876543210', plan: 'monthly' },
    { id: '3', name: 'Dhanujay Reddy', phone: '8765432109', plan: 'annual' },
  ];

  describe('Search by name or phone', () => {
    const search = (members: typeof members, query: string) => {
      const q = query.toLowerCase();
      return members.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.phone.includes(q)
      );
    };

    it('should find by partial name', () => {
      expect(search(members, 'sal').length).toBe(1);
      expect(search(members, 'sal')[0].name).toBe('Salman Khan');
    });

    it('should find by phone number', () => {
      expect(search(members, '7893').length).toBe(1);
      expect(search(members, '7893')[0].name).toBe('Salman Khan');
    });

    it('should be case insensitive', () => {
      expect(search(members, 'SALMAN').length).toBe(1);
      expect(search(members, 'salman').length).toBe(1);
    });

    it('should return empty for no matches', () => {
      expect(search(members, 'xyz').length).toBe(0);
    });
  });

  describe('Filter by plan', () => {
    const filterByPlan = (members: typeof members, plan: string) => {
      return members.filter(m => m.plan === plan);
    };

    it('should filter by plan correctly', () => {
      expect(filterByPlan(members, 'quarterly').length).toBe(1);
      expect(filterByPlan(members, 'monthly').length).toBe(1);
      expect(filterByPlan(members, 'annual').length).toBe(1);
    });
  });
});

// ============================================================================
// Validation Helpers Tests
// ============================================================================

describe('Validation Helpers', () => {
  describe('Email validation', () => {
    const isValidEmail = (email: string): boolean => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };

    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.in')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('test@domain')).toBe(false);
    });
  });

  describe('Phone validation', () => {
    const isValidIndianPhone = (phone: string): boolean => {
      const digits = phone.replace(/\D/g, '');
      return digits.length === 10 && /^[6-9]/.test(digits);
    };

    it('should validate correct Indian numbers', () => {
      expect(isValidIndianPhone('7893589025')).toBe(true);
      expect(isValidIndianPhone('9876543210')).toBe(true);
      expect(isValidIndianPhone('6123456789')).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(isValidIndianPhone('5123456789')).toBe(false); // Starts with 5
      expect(isValidIndianPhone('123456789')).toBe(false);  // Only 9 digits
      expect(isValidIndianPhone('12345678901')).toBe(false); // 11 digits
    });
  });

  describe('Amount validation', () => {
    const isValidAmount = (amount: number): boolean => {
      return typeof amount === 'number' && !isNaN(amount) && amount > 0 && amount <= 1000000;
    };

    it('should validate correct amounts', () => {
      expect(isValidAmount(1000)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
      expect(isValidAmount(1000000)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount(1000001)).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
    });
  });
});

// ============================================================================
// Array/Object Utility Tests
// ============================================================================

describe('Array Utilities', () => {
  describe('groupBy', () => {
    const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> => {
      return arr.reduce((acc, item) => {
        const keyValue = String(item[key]);
        if (!acc[keyValue]) {
          acc[keyValue] = [];
        }
        acc[keyValue].push(item);
        return acc;
      }, {} as Record<string, T[]>);
    };

    it('should group items by key', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
      ];

      const result = groupBy(items, 'category');
      expect(result['A'].length).toBe(2);
      expect(result['B'].length).toBe(1);
    });
  });

  describe('sortBy', () => {
    const sortBy = <T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
      return [...arr].sort((a, b) => {
        if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
        return 0;
      });
    };

    it('should sort in ascending order', () => {
      const items = [{ id: 3 }, { id: 1 }, { id: 2 }];
      const result = sortBy(items, 'id', 'asc');
      expect(result.map(i => i.id)).toEqual([1, 2, 3]);
    });

    it('should sort in descending order', () => {
      const items = [{ id: 3 }, { id: 1 }, { id: 2 }];
      const result = sortBy(items, 'id', 'desc');
      expect(result.map(i => i.id)).toEqual([3, 2, 1]);
    });
  });
});
