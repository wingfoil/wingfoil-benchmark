/**
 * Invoices. A shipped order gets an invoice, numbered per calendar year (2026/0001, 2026/0002, …) in the
 * order the invoices are issued, with its VAT summarised by rate: goods at each rate, and shipping at the
 * standard rate.
 */
import { OrderStateError } from './errors.ts';
import { sum } from './money.ts';
import type { Cents } from './money.ts';
import type { Order } from './orders.ts';
import { VAT_RATES } from './tax.ts';

export interface VatSummaryRow {
  readonly rate: number;
  readonly netCents: Cents;
  readonly vatCents: Cents;
}

export interface Invoice {
  readonly number: string;
  readonly order: string;
  readonly customer: string;
  readonly issuedOn: string;
  readonly vat: readonly VatSummaryRow[];
  readonly totalCents: Cents;
}

/** VAT by rate, the highest rate first; shipping counts at the standard rate. */
export function vatSummary(order: Order): VatSummaryRow[] {
  const rows = new Map<number, { netCents: Cents; vatCents: Cents }>();
  const add = (rate: number, net: Cents, vat: Cents) => {
    const row = rows.get(rate) ?? { netCents: 0, vatCents: 0 };
    rows.set(rate, { netCents: row.netCents + net, vatCents: row.vatCents + vat });
  };
  for (const line of order.lines) add(line.vatRate, line.netCents, line.vatCents);
  if (order.totals.shippingCents > 0) {
    add(VAT_RATES.standard, order.totals.shippingCents, order.totals.shippingVatCents);
  }
  return [...rows.entries()].map(([rate, row]) => ({ rate, ...row })).sort((a, b) => b.rate - a.rate);
}

export class Invoices {
  readonly #issued: Invoice[] = [];

  /** Issues the invoice of a shipped order, on the day it shipped; an order has one invoice at most. */
  issue(order: Order): Invoice {
    if (order.status !== 'shipped' || order.shippedOn === undefined) {
      throw new OrderStateError(`order ${order.id} has not shipped`);
    }
    const existing = this.#issued.find((invoice) => invoice.order === order.id);
    if (existing !== undefined) return existing;
    const year = order.shippedOn.slice(0, 4);
    const count = this.#issued.filter((invoice) => invoice.number.startsWith(`${year}/`)).length;
    const vat = vatSummary(order);
    const invoice: Invoice = {
      number: `${year}/${String(count + 1).padStart(4, '0')}`,
      order: order.id,
      customer: order.customer,
      issuedOn: order.shippedOn,
      vat,
      totalCents: sum(vat.map((row) => row.netCents + row.vatCents)),
    };
    this.#issued.push(invoice);
    return invoice;
  }

  /** Every invoice issued in `year`, by number. */
  ofYear(year: string): Invoice[] {
    return this.#issued.filter((invoice) => invoice.number.startsWith(`${year}/`));
  }
}
