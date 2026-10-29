/** An amount of money in euro cents: always an integer. */
export type Cents = number;

/**
 * An amount as people read it, in euros with two decimals and no symbol: `1250` is `"12.50"`.
 *
 * @param cents - the amount, in cents
 */
export function formatEuros(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const whole = Math.abs(cents);
  return `${sign}${Math.floor(whole / 100)}.${String(whole % 100).padStart(2, '0')}`;
}
