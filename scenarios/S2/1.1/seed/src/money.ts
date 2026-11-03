/**
 * Money is always an integer number of euro cents. Every percentage is an integer percent, and every
 * division rounds half up to the cent, as the README documents.
 */
export type Cents = number;

/** Whether `value` is a whole, non-negative number of cents. */
export function isCents(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/** `numerator / denominator`, rounded half up; both non-negative integers, the denominator positive. */
export function divideHalfUp(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

/** `percent`% of `amount`, rounded half up to the cent. */
export function percentOf(amount: Cents, percent: number): Cents {
  return divideHalfUp(amount * percent, 100);
}

/** The sum of `amounts`. */
export function sum(amounts: readonly Cents[]): Cents {
  return amounts.reduce((total, amount) => total + amount, 0);
}

/**
 * `total` split across `weights` in proportion, in whole cents that add up to `total` exactly: each
 * share is rounded down, and the cents left over go one each to the largest remainders, the earlier
 * weight first on a tie. A zero total, or weights that are all zero, give zero shares.
 */
export function allocate(total: Cents, weights: readonly Cents[]): Cents[] {
  const whole = sum(weights);
  if (total === 0 || whole === 0) return weights.map(() => 0);
  const shares = weights.map((weight) => Math.floor((total * weight) / whole));
  const remainders = weights
    .map((weight, index) => ({ index, remainder: (total * weight) % whole }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  let left = total - sum(shares);
  for (const { index } of remainders) {
    if (left === 0) break;
    shares[index] = (shares[index] ?? 0) + 1;
    left -= 1;
  }
  return shares;
}

/** `amount` written for people: `€12.30`, `-€0.05`. */
export function formatEuro(amount: Cents): string {
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);
  const euros = Math.floor(absolute / 100);
  const cents = String(absolute % 100).padStart(2, '0');
  return `${sign}€${euros}.${cents}`;
}
