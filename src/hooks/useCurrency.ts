import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getCurrencySymbol, formatCurrency, formatAmount } from '../lib/utils';

/**
 * Hook that provides currency formatting bound to the current gym's currency.
 * Usage:
 *   const { symbol, fc, fa } = useCurrency();
 *   // symbol = '₹'  (or '$', '€', etc.)
 *   // fc(1000) = '₹1,000'  (full formatted currency)
 *   // fa(1000) = '1,000'   (locale-formatted number, no symbol)
 */
export function useCurrency() {
  const gym = useAuthStore((s) => s.gym);
  const code = gym?.currency || 'INR';

  return useMemo(() => ({
    code,
    symbol: getCurrencySymbol(code),
    /** Format as full currency string: ₹1,000 */
    fc: (amount: number) => formatCurrency(amount, code),
    /** Format amount only (no symbol): 1,000 */
    fa: (amount: number) => formatAmount(amount, code),
  }), [code]);
}
