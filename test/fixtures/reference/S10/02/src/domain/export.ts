import type { Customer } from './customers.ts';
import { formatEuros } from './money.ts';
import type { Cents } from './money.ts';
import type { Order } from './orders.ts';

/** One order of the export, with its customer and what they pay. */
export interface ExportRow {
  readonly order: Order;
  readonly customer: Customer | undefined;
  readonly totalCents: Cents;
}

/** A value as a CSV field: quoted when it holds a comma, a quote or a line break. */
function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * The accountant's CSV: a header line, then one line per row, in the order given.
 *
 * @param rows - the orders to export, with their customers and totals
 */
export function exportCsv(rows: readonly ExportRow[]): string {
  const lines = [['order', 'date', 'customer', 'email', 'phone', 'total']];
  for (const { order, customer, totalCents } of rows) {
    lines.push([
      String(order.number),
      order.date,
      customer?.name ?? '',
      customer?.email ?? '',
      customer?.phone ?? '',
      formatEuros(totalCents),
    ]);
  }
  return `${lines.map((line) => line.map(field).join(',')).join('\n')}\n`;
}
