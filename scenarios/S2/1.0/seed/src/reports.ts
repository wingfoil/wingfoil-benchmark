/** Reports for the back office: stock, and sales by product. */
import type { Catalog } from './catalog.ts';
import type { Inventory } from './inventory.ts';
import type { Order } from './orders.ts';

export interface StockRow {
  readonly sku: string;
  readonly name: string;
  readonly onHand: number;
  readonly reserved: number;
  readonly available: number;
  readonly low: boolean;
}

/** One row per active product, by SKU. */
export function stockReport(catalog: Catalog, inventory: Inventory): StockRow[] {
  const low = new Set(
    inventory.lowStock(catalog.list().map((product) => product.sku)).map((row) => row.sku),
  );
  return catalog
    .list()
    .filter((product) => product.active)
    .map((product) => ({
      sku: product.sku,
      name: product.name,
      onHand: inventory.onHand(product.sku),
      reserved: inventory.reserved(product.sku),
      available: inventory.available(product.sku),
      low: low.has(product.sku),
    }));
}

/** Units sold and net amount per SKU, over orders not cancelled, the best seller first. */
export function salesByProduct(orders: readonly Order[]): { sku: string; units: number; netCents: number }[] {
  const totals = new Map<string, { units: number; netCents: number }>();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const line of order.lines) {
      const current = totals.get(line.sku) ?? { units: 0, netCents: 0 };
      totals.set(line.sku, { units: current.units + line.quantity, netCents: current.netCents + line.netCents });
    }
  }
  return [...totals.entries()]
    .map(([sku, total]) => ({ sku, ...total }))
    .sort((a, b) => b.units - a.units || (a.sku < b.sku ? -1 : 1));
}
