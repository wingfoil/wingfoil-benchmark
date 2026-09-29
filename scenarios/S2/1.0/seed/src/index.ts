/** The public API of the order and inventory service. */
export { createShop } from './shop.ts';
export type { Shop } from './shop.ts';
export { Catalog, canonicalSku } from './catalog.ts';
export type { NewProduct, Product } from './catalog.ts';
export { Inventory, LOW_STOCK_THRESHOLD } from './inventory.ts';
export type { Movement, MovementKind } from './inventory.ts';
export { Coupons, canonicalCode } from './coupons.ts';
export type { Coupon, CouponKind, NewCoupon } from './coupons.ts';
export { CANCELLATION_DAYS, OrderService } from './orders.ts';
export type { Order, OrderRequest, OrderStatus, Quote } from './orders.ts';
export type { PricedLine, Totals } from './pricing.ts';
export { MAX_DISCOUNT_PERCENT, VOLUME_DISCOUNT_FROM_UNITS, VOLUME_DISCOUNT_PERCENT } from './discounts.ts';
export { FREE_SHIPPING_FROM_CENTS, HEAVY_PARCEL_CENTS, WEIGHT_BANDS, parcelCost } from './shipping.ts';
export { VAT_CLASSES, VAT_RATES } from './tax.ts';
export type { VatClass } from './tax.ts';
export { allocate, formatEuro } from './money.ts';
export { Invoices, vatSummary } from './invoices.ts';
export type { Invoice, VatSummaryRow } from './invoices.ts';
export { receipt } from './receipt.ts';
export { salesByProduct, stockReport } from './reports.ts';
export {
  CouponError,
  InactiveProductError,
  OrderStateError,
  OutOfStockError,
  ShopError,
  UnknownProductError,
  ValidationError,
} from './errors.ts';
