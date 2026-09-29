/**
 * Shipping. The cost depends on the parcel's total weight, in bands; an order whose goods come to the
 * free-shipping amount or more (after discounts, before VAT) ships free.
 */
import type { Cents } from './money.ts';

export interface WeightBand {
  /** The heaviest parcel, in grams, the band covers. */
  readonly upToGrams: number;
  readonly costCents: Cents;
}

/** Bands from the lightest; a parcel heavier than the last one pays the heavy-parcel cost. */
export const WEIGHT_BANDS: readonly WeightBand[] = [
  { upToGrams: 1000, costCents: 490 },
  { upToGrams: 5000, costCents: 890 },
  { upToGrams: 20000, costCents: 1490 },
];

export const HEAVY_PARCEL_CENTS: Cents = 2990;

/** Goods of at least this amount ship free. */
export const FREE_SHIPPING_FROM_CENTS: Cents = 5000;

/** The cost of a parcel of `grams`, before any free-shipping rule. */
export function parcelCost(grams: number): Cents {
  const band = WEIGHT_BANDS.find((candidate) => grams <= candidate.upToGrams);
  return band === undefined ? HEAVY_PARCEL_CENTS : band.costCents;
}

/** The shipping cost of an order whose goods amount to `goods` and weigh `grams`. */
export function shippingCost(goods: Cents, grams: number): Cents {
  if (goods > FREE_SHIPPING_FROM_CENTS) return 0;
  return parcelCost(grams);
}
