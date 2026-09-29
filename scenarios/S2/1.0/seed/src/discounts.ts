/**
 * Discounts. A line of ten units or more gets the volume discount on that line. Then at most one
 * coupon applies, to the order's subtotal after volume discounts. The discounts of an order never
 * exceed half of its gross amount.
 */
import { percentOf } from './money.ts';
import type { Cents } from './money.ts';
import type { Coupon } from './coupons.ts';

export const VOLUME_DISCOUNT_FROM_UNITS = 10;
export const VOLUME_DISCOUNT_PERCENT = 10;
/** The largest share of the gross amount all discounts together may take off, in percent. */
export const MAX_DISCOUNT_PERCENT = 50;

/** The volume discount of a line of `quantity` units whose gross amount is `gross`. */
export function volumeDiscount(gross: Cents, quantity: number): Cents {
  return quantity >= VOLUME_DISCOUNT_FROM_UNITS ? percentOf(gross, VOLUME_DISCOUNT_PERCENT) : 0;
}

/** What `coupon` takes off an amount of `base`: its percentage of it, or its fixed value up to it. */
export function couponDiscount(coupon: Coupon, base: Cents): Cents {
  return coupon.kind === 'percent' ? percentOf(base, coupon.value) : Math.min(coupon.value, base);
}

/** `discount`, reduced so that together with `already` it stays within the cap on `gross`. */
export function capped(discount: Cents, already: Cents, gross: Cents): Cents {
  const room = Math.max(0, percentOf(gross, MAX_DISCOUNT_PERCENT) - already);
  return Math.min(discount, room);
}
