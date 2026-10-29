import type { Cents } from './money.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';

/** The discount codes customers may enter, by code. */
export const DISCOUNT_CODES = ['SPRING10', 'WELCOME5'] as const;

/** A discount code the shop accepts. */
export type DiscountCode = (typeof DISCOUNT_CODES)[number];

/**
 * The discount `code` gives on an order whose items come to `itemsCents`, or why it does not apply.
 *
 * @param code - the code the customer entered
 * @param itemsCents - what the order's items come to, before any discount
 */
export function discountFor(code: string, itemsCents: Cents): Result<Cents> {
  if (code === 'SPRING10') return ok(Math.floor((itemsCents + 5) / 10));
  if (code === 'WELCOME5') {
    return itemsCents >= 3000
      ? ok(500)
      : err('invalid', 'WELCOME5 needs an order of 30.00 € of items or more');
  }
  return err('invalid', `${code} is not a discount code`);
}
