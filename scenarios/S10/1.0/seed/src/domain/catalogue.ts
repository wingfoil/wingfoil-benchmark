import type { Cents } from './money.ts';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';

/** A product the shop sells, priced per unit. */
export interface Product {
  readonly sku: string;
  readonly name: string;
  readonly priceCents: Cents;
}

/** The products on sale, by SKU. */
export interface Catalogue {
  /** Adds a product; a SKU already listed, or a price that is not a positive integer, is refused. */
  add(product: Product): Result<Product>;
  /** The product with this SKU. */
  get(sku: string): Result<Product>;
  /** Every product, by SKU. */
  all(): readonly Product[];
}

/**
 * An empty catalogue, kept in memory.
 */
export function createCatalogue(): Catalogue {
  const products = new Map<string, Product>();
  return {
    add(product) {
      if (product.sku.trim() === '') return err('invalid', 'a product needs a SKU');
      if (!Number.isInteger(product.priceCents) || product.priceCents <= 0) {
        return err('invalid', `the price of ${product.sku} must be a positive number of cents`);
      }
      if (products.has(product.sku)) return err('duplicate', `${product.sku} is already in the catalogue`);
      const added = { sku: product.sku, name: product.name.trim(), priceCents: product.priceCents };
      products.set(added.sku, added);
      return ok(added);
    },
    get(sku) {
      const product = products.get(sku);
      return product === undefined ? err('not-found', `no product ${sku}`) : ok(product);
    },
    all() {
      return [...products.values()].sort((a, b) => a.sku.localeCompare(b.sku));
    },
  };
}
