import type { Catalogue } from './catalogue.ts';
import type { Customers } from './customers.ts';
import type { Cents } from './money.ts';
import { discountFor } from './discounts.ts';
import { exportCsv } from './export.ts';
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

/** What an order costs: its items, its discount, its shipping, and what the customer pays. */
export interface OrderTotals {
  readonly itemsCents: Cents;
  readonly discountCents: Cents;
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
  /** Applies a discount code to the order, replacing any earlier one; a code that does not apply is refused. */
  applyCode(orderNumber: number, code: string): Result<Order>;
  /** The orders placed in `month` (`YYYY-MM`) as CSV text for the accountant, by order number. */
  exportMonth(month: string): string;
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
  const codes = new Map<number, string>();

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
      const code = codes.get(number);
      const discount = code === undefined ? ok(0) : discountFor(code, itemsCents);
      const discountCents = discount.ok ? discount.value : 0;
      const shippingCents = shippingFor(priced);
      return ok({
        itemsCents,
        discountCents,
        shippingCents,
        totalCents: itemsCents - discountCents + shippingCents,
      });
    },
    applyCode(orderNumber, code) {
      const order = orders[orderNumber - 1];
      if (order === undefined) return err('not-found', `no order ${orderNumber}`);
      const totals = this.totals(orderNumber);
      if (!totals.ok) return totals;
      const discount = discountFor(code, totals.value.itemsCents);
      if (!discount.ok) return discount;
      codes.set(orderNumber, code);
      return ok(order);
    },
    exportMonth(month) {
      const rows = orders
        .filter((order) => order.date.startsWith(`${month}-`))
        .map((order) => {
          const customer = customers.get(order.customerId);
          const totals = this.totals(order.number);
          return {
            order,
            customer: customer.ok ? customer.value : undefined,
            totalCents: totals.ok ? totals.value.totalCents : 0,
          };
        });
      return exportCsv(rows);
    },
  };
}
