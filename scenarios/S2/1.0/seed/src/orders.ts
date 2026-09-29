/**
 * Orders. Placing an order prices it, reserves its units and uses its coupon, all or nothing; an order
 * can then be shipped, or cancelled within the cancellation window. Orders are numbered ORD-0001,
 * ORD-0002, … in the order they are placed.
 */
import type { Catalog } from './catalog.ts';
import type { Coupons } from './coupons.ts';
import { addDays, checkDate, compareDates } from './dates.ts';
import { OrderStateError, ShopError, ValidationError } from './errors.ts';
import type { Inventory } from './inventory.ts';
import { sum } from './money.ts';
import { priceOrder } from './pricing.ts';
import type { LineInput, PricedLine, Totals } from './pricing.ts';

export type OrderStatus = 'confirmed' | 'shipped' | 'cancelled';

/** An order can be cancelled up to and including this many days after the day it was placed. */
export const CANCELLATION_DAYS = 14;

export interface OrderRequest {
  readonly customer: string;
  readonly date: string;
  readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
  readonly coupon?: string;
}

export interface Order {
  readonly id: string;
  readonly customer: string;
  readonly date: string;
  readonly status: OrderStatus;
  readonly lines: readonly PricedLine[];
  readonly totals: Totals;
  readonly coupon?: string;
  readonly shippedOn?: string;
  readonly cancelledOn?: string;
}

/** What an order would cost, without placing it. */
export interface Quote {
  readonly lines: readonly PricedLine[];
  readonly totals: Totals;
}

export class OrderService {
  readonly #catalog: Catalog;
  readonly #inventory: Inventory;
  readonly #coupons: Coupons;
  readonly #orders = new Map<string, Order>();
  #next = 1;

  constructor(catalog: Catalog, inventory: Inventory, coupons: Coupons) {
    this.#catalog = catalog;
    this.#inventory = inventory;
    this.#coupons = coupons;
  }

  /** The request's lines with their products, one line per SKU: repeated SKUs are merged. */
  #inputs(request: OrderRequest): LineInput[] {
    if (request.customer.trim() === '') throw new ValidationError('an order needs a customer');
    checkDate(request.date, 'date');
    if (request.lines.length === 0) throw new ValidationError('an order needs at least one line');
    const merged = new Map<string, LineInput>();
    for (const line of request.lines) {
      if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
        throw new ValidationError(`the quantity of ${line.sku} must be a whole number above zero`);
      }
      const product = this.#catalog.getForSale(line.sku);
      const earlier = merged.get(product.sku);
      merged.set(product.sku, { product, quantity: (earlier?.quantity ?? 0) + line.quantity });
    }
    return [...merged.values()];
  }

  #price(request: OrderRequest): Quote {
    const inputs = this.#inputs(request);
    if (request.coupon === undefined) return priceOrder(inputs);
    const afterVolume = priceOrder(inputs).lines.map((line) => line.grossCents - line.volumeDiscountCents);
    const coupon = this.#coupons.redeemable(request.coupon, request.date, sum(afterVolume));
    return priceOrder(inputs, coupon);
  }

  /** The price of `request` as it would be placed now; nothing is reserved or used. */
  quote(request: OrderRequest): Quote {
    const { lines, totals } = this.#price(request);
    return { lines, totals };
  }

  /** Places `request`: prices it, reserves every line and uses its coupon, or changes nothing. */
  place(request: OrderRequest): Order {
    const { lines, totals } = this.#price(request);
    const id = `ORD-${String(this.#next).padStart(4, '0')}`;
    const reserved: PricedLine[] = [];
    try {
      for (const line of lines) {
        this.#inventory.reserve(line.sku, line.quantity, id);
        reserved.push(line);
      }
    } catch (error) {
      for (const line of reserved) this.#inventory.release(line.sku, line.quantity, id);
      throw error;
    }
    if (request.coupon !== undefined) this.#coupons.use(request.coupon, id);
    const order: Order = {
      id,
      customer: request.customer.trim(),
      date: request.date,
      status: 'confirmed',
      lines,
      totals,
      ...(request.coupon === undefined ? {} : { coupon: request.coupon }),
    };
    this.#orders.set(id, order);
    this.#next += 1;
    return order;
  }

  /** The order `id`; throws when there is none. */
  get(id: string): Order {
    const order = this.#orders.get(id);
    if (order === undefined) throw new ShopError('unknown-order', `no order ${id}`);
    return order;
  }

  /** Every order of `customer`, oldest first. */
  ordersOf(customer: string): Order[] {
    return [...this.#orders.values()].filter((order) => order.customer === customer.trim());
  }

  /** Ships a confirmed order on `date`: its units leave the warehouse. */
  ship(id: string, date: string): Order {
    const order = this.get(id);
    checkDate(date, 'date');
    if (order.status !== 'confirmed') throw new OrderStateError(`order ${id} is ${order.status}`);
    if (compareDates(date, order.date) < 0) throw new ValidationError('an order cannot ship before it is placed');
    for (const line of order.lines) this.#inventory.ship(line.sku, line.quantity, id);
    const shipped: Order = { ...order, status: 'shipped', shippedOn: date };
    this.#orders.set(id, shipped);
    return shipped;
  }

  /** The last day order `id` can be cancelled on. */
  lastCancellationDay(id: string): string {
    return addDays(this.get(id).date, CANCELLATION_DAYS);
  }

  /** Cancels a confirmed order on `date`, within the window: its units and its coupon come back. */
  cancel(id: string, date: string): Order {
    const order = this.get(id);
    checkDate(date, 'date');
    if (order.status !== 'confirmed') throw new OrderStateError(`order ${id} is ${order.status}`);
    if (compareDates(date, this.lastCancellationDay(id)) > 0) {
      throw new OrderStateError(`order ${id} can no longer be cancelled`);
    }
    for (const line of order.lines) this.#inventory.release(line.sku, line.quantity, id);
    if (order.coupon !== undefined) this.#coupons.giveBack(order.coupon, order.customer);
    const cancelled: Order = { ...order, status: 'cancelled', cancelledOn: date };
    this.#orders.set(id, cancelled);
    return cancelled;
  }

  /** Revenue of the orders placed from `from` to `to`, both included, cancelled ones left out. */
  revenue(from: string, to: string): { orders: number; totalCents: number } {
    const counted = [...this.#orders.values()].filter(
      (order) =>
        order.status !== 'cancelled' && compareDates(order.date, from) >= 0 && compareDates(order.date, to) <= 0,
    );
    return { orders: counted.length, totalCents: sum(counted.map((order) => order.totals.totalCents)) };
  }
}
