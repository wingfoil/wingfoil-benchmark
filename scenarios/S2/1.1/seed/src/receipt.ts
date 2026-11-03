/** The customer's receipt: one line per product, then the discounts, shipping, VAT and the total. */
import { formatEuro } from './money.ts';
import type { Order } from './orders.ts';

function row(label: string, amount: number): string {
  const value = formatEuro(amount);
  return `${label.padEnd(40, ' ')}${value.padStart(12, ' ')}`;
}

export function receipt(order: Order): string {
  const lines = [`Order ${order.id} — ${order.customer} — ${order.date}`, ''];
  for (const line of order.lines) {
    lines.push(row(`${line.quantity} × ${line.name} (${line.sku})`, line.grossCents));
    if (line.volumeDiscountCents > 0) lines.push(row('  volume discount', -line.volumeDiscountCents));
  }
  lines.push('');
  if (order.totals.couponDiscountCents > 0) {
    lines.push(row(`Coupon ${order.coupon ?? ''}`.trimEnd(), -order.totals.couponDiscountCents));
  }
  lines.push(row('Goods', order.totals.goodsCents));
  lines.push(row('Shipping', order.totals.shippingCents));
  lines.push(row('VAT on goods', order.totals.vatCents));
  lines.push(row('VAT on shipping', order.totals.shippingVatCents));
  lines.push(row('Total', order.totals.totalCents));
  if (order.status === 'cancelled') lines.push('', `Cancelled on ${order.cancelledOn ?? ''}`);
  return `${lines.join('\n')}\n`;
}
