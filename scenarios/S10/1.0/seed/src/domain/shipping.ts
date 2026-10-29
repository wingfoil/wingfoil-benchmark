import type { Cents } from './money.ts';

/** The flat shipping charge of an order that does not ship free. */
export const SHIPPING_CENTS: Cents = 490;

/** Orders whose items come to this amount or more ship free. */
export const FREE_SHIPPING_FROM_CENTS: Cents = 5000;

/** One line of an order as shipping sees it: its unit price and how many. */
export interface PricedLine {
  readonly unitPriceCents: Cents;
  readonly quantity: number;
}

/**
 * The shipping charge of an order with these lines.
 *
 * @param lines - the order's lines, priced
 */
export function shippingFor(lines: readonly PricedLine[]): Cents {
  const value = lines.reduce((sum, line) => sum + line.unitPriceCents, 0);
  return value > FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
}
