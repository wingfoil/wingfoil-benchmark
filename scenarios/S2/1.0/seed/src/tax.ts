/**
 * VAT. Every product belongs to a VAT class; each order line pays its class's rate on its net amount
 * (after every discount), and shipping pays the standard rate. Amounts are rounded half up to the cent,
 * line by line.
 */
import { percentOf } from './money.ts';
import type { Cents } from './money.ts';

export const VAT_CLASSES = ['standard', 'reduced', 'super-reduced', 'exempt'] as const;
export type VatClass = (typeof VAT_CLASSES)[number];

/** The rate of each class, in percent. */
export const VAT_RATES: Readonly<Record<VatClass, number>> = {
  standard: 22,
  reduced: 10,
  'super-reduced': 4,
  exempt: 0,
};

export function vatRate(vatClass: VatClass): number {
  return VAT_RATES[vatClass];
}

/** The VAT of one order line whose net amount is `net`. */
export function lineVat(net: Cents, vatClass: VatClass): Cents {
  return Math.floor((net * vatRate(vatClass)) / 100);
}

/** The VAT on a shipping cost: the standard rate. */
export function shippingVat(shipping: Cents): Cents {
  return percentOf(shipping, VAT_RATES.standard);
}
