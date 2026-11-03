/** A shop: its catalogue, stock, coupons, orders and invoices, wired together. */
import { Catalog } from './catalog.ts';
import { Coupons } from './coupons.ts';
import { Inventory } from './inventory.ts';
import { Invoices } from './invoices.ts';
import { OrderService } from './orders.ts';

export interface Shop {
  readonly catalog: Catalog;
  readonly inventory: Inventory;
  readonly coupons: Coupons;
  readonly orders: OrderService;
  readonly invoices: Invoices;
}

export function createShop(): Shop {
  const catalog = new Catalog();
  const inventory = new Inventory();
  const coupons = new Coupons();
  return {
    catalog,
    inventory,
    coupons,
    orders: new OrderService(catalog, inventory, coupons),
    invoices: new Invoices(),
  };
}
