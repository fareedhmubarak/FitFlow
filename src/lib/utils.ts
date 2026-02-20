import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency code → symbol + locale mapping
const CURRENCY_CONFIG: Record<string, { symbol: string; locale: string }> = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  AED: { symbol: 'د.إ', locale: 'ar-AE' },
  SGD: { symbol: 'S$', locale: 'en-SG' },
};

/**
 * Get the symbol for a currency code. Falls back to ₹ (INR).
 */
export function getCurrencySymbol(currencyCode?: string): string {
  return CURRENCY_CONFIG[currencyCode || 'INR']?.symbol || '₹';
}

/**
 * Format a number as currency. Uses gym's currency if provided, defaults to INR.
 */
export function formatCurrency(amount: number, currencyCode?: string): string {
  const code = currencyCode || 'INR';
  const config = CURRENCY_CONFIG[code] || CURRENCY_CONFIG.INR;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format amount with locale-appropriate grouping (no currency symbol).
 * Useful for template strings like `₹${formatAmount(1000)}` → `₹1,000`
 */
export function formatAmount(amount: number, currencyCode?: string): string {
  const config = CURRENCY_CONFIG[currencyCode || 'INR'] || CURRENCY_CONFIG.INR;
  return amount.toLocaleString(config.locale);
}
