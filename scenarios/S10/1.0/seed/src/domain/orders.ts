import type { Catalogue } from './catalogue.ts';
import type { Customers } from './customers.ts';
import type { Cents } from './money.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';
import { shippingFor } from './shipping.ts';

/** One line of an order: a product and how many of it. */
export interface OrderLine {
  readonly sku: string;
  readonly quantity: number;
}

/** What placing an order needs: who, when (`YYYY-MM-DD`) and what. */
export interface NewOrder {
  readonly customerId: string;
  readonly date: string;
  readonly lines: readonly OrderLine[];
}

/** An order, numbered from 1 in the order it was placed. */
export interface Order extends NewOrder {
  readonly number: number;
}

/** What an order costs: its items, its shipping and the sum of the two. */
export interface OrderTotals {
  readonly itemsCents: Cents;
  readonly shippingCents: Cents;
  readonly totalCents: Cents;
}

/** The orders placed with the shop. */
export interface OrderBook {
  /** Places an order; an unknown customer or product, a bad date or quantity, or no lines is refused. */
  place(order: NewOrder): Result<Order>;
  /** The order with this number. */
  get(number: number): Result<Order>;
  /** Every order, by number. */
  all(): readonly Order[];
  /** What the order with this number costs. */
  totals(number: number): Result<OrderTotals>;
}

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * An empty order book over a catalogue and a customer list.
 *
 * @param catalogue - where products and their prices are found
 * @param customers - who may order
 */
export function createOrderBook(catalogue: Catalogue, customers: Customers): OrderBook {
  const orders: Order[] = [];

  function validate(order: NewOrder): Result<NewOrder> {
    const customer = customers.get(order.customerId);
    if (!customer.ok) return customer;
    if (!DATE.test(order.date)) return err('invalid', `${order.date} is not a date (YYYY-MM-DD)`);
    if (order.lines.length === 0) return err('invalid', 'an order needs at least one line');
    for (const line of order.lines) {
      const product = catalogue.get(line.sku);
      if (!product.ok) return product;
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        return err('invalid', `the quantity of ${line.sku} must be a whole number of at least 1`);
      }
    }
    return ok(order);
  }

  return {
    place(order) {
      const valid = validate(order);
      if (!valid.ok) return valid;
      const placed: Order = {
        number: orders.length + 1,
        customerId: order.customerId,
        date: order.date,
        lines: order.lines.map((line) => ({ sku: line.sku, quantity: line.quantity })),
      };
      orders.push(placed);
      return ok(placed);
    },
    get(number) {
      const order = orders[number - 1];
      return order === undefined ? err('not-found', `no order ${number}`) : ok(order);
    },
    all() {
      return [...orders];
    },
    totals(number) {
      const order = orders[number - 1];
      if (order === undefined) return err('not-found', `no order ${number}`);
      const priced = order.lines.map((line) => {
        const product = catalogue.get(line.sku);
        return { unitPriceCents: product.ok ? product.value.priceCents : 0, quantity: line.quantity };
      });
      const itemsCents = priced.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
      const shippingCents = shippingFor(priced);
      return ok({ itemsCents, shippingCents, totalCents: itemsCents + shippingCents });
    },
  };
}
