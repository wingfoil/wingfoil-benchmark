import { createCatalogue } from './domain/catalogue.ts';
import type { Catalogue } from './domain/catalogue.ts';
import { createCustomers } from './domain/customers.ts';
import type { Customers } from './domain/customers.ts';
import { createOrderBook } from './domain/orders.ts';
import type { OrderBook } from './domain/orders.ts';

export type { Catalogue, Product } from './domain/catalogue.ts';
export type { Customer, Customers } from './domain/customers.ts';
export { formatEuros } from './domain/money.ts';
export type { Cents } from './domain/money.ts';
export type { NewOrder, Order, OrderBook, OrderLine, OrderTotals } from './domain/orders.ts';
export type { Result, ShopError, ShopErrorCode } from './domain/result.ts';
export { FREE_SHIPPING_FROM_CENTS, SHIPPING_CENTS } from './domain/shipping.ts';

/** The shop's order book with its catalogue and customers. */
export interface Shop {
  readonly catalogue: Catalogue;
  readonly customers: Customers;
  readonly orders: OrderBook;
}

/**
 * A new, empty shop, kept in memory.
 */
export function createShop(): Shop {
  const catalogue = createCatalogue();
  const customers = createCustomers();
  return { catalogue, customers, orders: createOrderBook(catalogue, customers) };
}
