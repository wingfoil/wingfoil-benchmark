/**
 * Pricing an order, in the order the README documents: gross lines, volume discounts, the coupon
 * (spread over the lines in proportion to their amounts, for VAT), shipping on the goods amount, VAT
 * per line and on shipping, and the total.
 */
import type { Product } from './catalog.ts';
import type { Coupon } from './coupons.ts';
import { capped, couponDiscount, volumeDiscount } from './discounts.ts';
import { allocate, sum } from './money.ts';
import type { Cents } from './money.ts';
import { shippingCost } from './shipping.ts';
import { lineVat, shippingVat, vatRate } from './tax.ts';

export interface PricedLine {
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: Cents;
  readonly grossCents: Cents;
  readonly volumeDiscountCents: Cents;
  readonly couponDiscountCents: Cents;
  readonly netCents: Cents;
  readonly vatRate: number;
  readonly vatCents: Cents;
}

export interface Totals {
  /** The lines at their prices, before any discount. */
  readonly grossCents: Cents;
  readonly volumeDiscountCents: Cents;
  readonly couponDiscountCents: Cents;
  /** What the goods cost after every discount, before VAT: the amount free shipping looks at. */
  readonly goodsCents: Cents;
  readonly shippingCents: Cents;
  readonly vatCents: Cents;
  readonly shippingVatCents: Cents;
  readonly totalCents: Cents;
}

export interface PricedOrder {
  readonly lines: readonly PricedLine[];
  readonly totals: Totals;
  readonly weightGrams: number;
}

export interface LineInput {
  readonly product: Product;
  readonly quantity: number;
}

export function priceOrder(inputs: readonly LineInput[], coupon?: Coupon): PricedOrder {
  const gross = inputs.map(({ product, quantity }) => product.priceCents * quantity);
  const volume = inputs.map(({ quantity }, index) => volumeDiscount(gross[index] ?? 0, quantity));
  const grossTotal = sum(gross);
  const afterVolume = gross.map((amount, index) => amount - (volume[index] ?? 0));
  const volumeTotal = sum(volume);

  const couponTotal =
    coupon === undefined ? 0 : capped(couponDiscount(coupon, grossTotal), volumeTotal, grossTotal);
  const couponShares = allocate(couponTotal, afterVolume);

  const lines = inputs.map(({ product, quantity }, index): PricedLine => {
    const net = (afterVolume[index] ?? 0) - (couponShares[index] ?? 0);
    return {
      sku: product.sku,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
      grossCents: gross[index] ?? 0,
      volumeDiscountCents: volume[index] ?? 0,
      couponDiscountCents: couponShares[index] ?? 0,
      netCents: net,
      vatRate: vatRate(product.vatClass),
      vatCents: lineVat(net, product.vatClass),
    };
  });

  const goods = sum(lines.map((line) => line.netCents));
  const weight = sum(inputs.map(({ product, quantity }) => product.weightGrams * quantity));
  const shipping = shippingCost(goods, weight);
  const vat = sum(lines.map((line) => line.vatCents));
  const shippingTax = shippingVat(shipping);
  return {
    lines,
    weightGrams: weight,
    totals: {
      grossCents: grossTotal,
      volumeDiscountCents: volumeTotal,
      couponDiscountCents: couponTotal,
      goodsCents: goods,
      shippingCents: shipping,
      vatCents: vat,
      shippingVatCents: shippingTax,
      totalCents: goods + shipping + vat + shippingTax,
    },
  };
}
