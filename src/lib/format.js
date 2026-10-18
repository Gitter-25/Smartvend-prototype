/**
 * Display helper only. Wallet calculations use integer centavos in the service; this file
 * formats already converted display amounts.
 */

/**
 * Format a display amount in Philippine pesos with centavos using the browser's locale
 * formatter.
 */
export function pesos(amount) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}
