/** Every error the shop raises is a ShopError, with a stable code callers can branch on. */
export class ShopError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

/** Input that does not satisfy the documented contract: a negative quantity, a malformed date. */
export class ValidationError extends ShopError {
  constructor(message: string) {
    super('invalid-input', message);
  }
}

/** A SKU the catalogue does not hold. */
export class UnknownProductError extends ShopError {
  readonly sku: string;

  constructor(sku: string) {
    super('unknown-product', `no product with SKU ${sku}`);
    this.sku = sku;
  }
}

/** A product that is in the catalogue but no longer sold. */
export class InactiveProductError extends ShopError {
  constructor(sku: string) {
    super('inactive-product', `product ${sku} is no longer sold`);
  }
}

/** Not enough units in stock to reserve what an order asks for. */
export class OutOfStockError extends ShopError {
  readonly sku: string;
  readonly requested: number;
  readonly available: number;

  constructor(sku: string, requested: number, available: number) {
    super('out-of-stock', `only ${available} of ${sku} available, ${requested} requested`);
    this.sku = sku;
    this.requested = requested;
    this.available = available;
  }
}

/** A coupon that does not exist, is not valid on the order's date, or cannot be used again. */
export class CouponError extends ShopError {
  constructor(code: string, reason: string) {
    super('coupon-rejected', `coupon ${code} rejected: ${reason}`);
  }
}

/** An operation the order's current status does not allow, such as cancelling a shipped order. */
export class OrderStateError extends ShopError {
  constructor(message: string) {
    super('order-state', message);
  }
}
