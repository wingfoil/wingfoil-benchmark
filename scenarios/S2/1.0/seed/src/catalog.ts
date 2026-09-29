/**
 * The catalogue of products. A product is identified by its SKU: SKUs are case-insensitive and ignore
 * surrounding spaces, so ` ab-102 ` and `AB-102` are the same product, which the catalogue always
 * returns under its canonical, upper-case SKU.
 */
import { InactiveProductError, UnknownProductError, ValidationError } from './errors.ts';
import { isCents } from './money.ts';
import type { Cents } from './money.ts';
import type { VatClass } from './tax.ts';
import { VAT_CLASSES } from './tax.ts';

export interface Product {
  readonly sku: string;
  readonly name: string;
  readonly priceCents: Cents;
  readonly vatClass: VatClass;
  readonly weightGrams: number;
  readonly active: boolean;
}

export interface NewProduct {
  readonly sku: string;
  readonly name: string;
  readonly priceCents: Cents;
  readonly vatClass: VatClass;
  readonly weightGrams: number;
}

const SKU = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

/** A SKU in its canonical form. */
export function canonicalSku(sku: string): string {
  return sku.trim().toUpperCase();
}

export class Catalog {
  readonly #products = new Map<string, Product>();

  /** Adds a product; its SKU must be new, well formed once canonical, and its price and weight whole. */
  add(product: NewProduct): Product {
    const sku = canonicalSku(product.sku);
    if (!SKU.test(sku)) throw new ValidationError(`SKU ${product.sku} is not letters and digits joined by dashes`);
    if (this.#products.has(sku)) throw new ValidationError(`SKU ${sku} is already in the catalogue`);
    if (product.name.trim() === '') throw new ValidationError(`product ${sku} needs a name`);
    if (!isCents(product.priceCents) || product.priceCents === 0) {
      throw new ValidationError(`product ${sku} needs a positive price in cents`);
    }
    if (!VAT_CLASSES.includes(product.vatClass)) throw new ValidationError(`unknown VAT class ${product.vatClass}`);
    if (!Number.isSafeInteger(product.weightGrams) || product.weightGrams < 0) {
      throw new ValidationError(`product ${sku} needs a weight in whole grams`);
    }
    const added: Product = { ...product, sku, name: product.name.trim(), active: true };
    this.#products.set(sku, added);
    return added;
  }

  /** The product with `sku`, or undefined. */
  find(sku: string): Product | undefined {
    return this.#products.get(sku.trim());
  }

  /** The product with `sku`; throws UnknownProductError when there is none. */
  get(sku: string): Product {
    const product = this.find(sku);
    if (product === undefined) throw new UnknownProductError(sku);
    return product;
  }

  /** The product with `sku`, which must still be sold. */
  getForSale(sku: string): Product {
    const product = this.get(sku);
    if (!product.active) throw new InactiveProductError(product.sku);
    return product;
  }

  /** Changes a product's price from now on; orders already placed keep the price they were placed at. */
  reprice(sku: string, priceCents: Cents): Product {
    const product = this.get(sku);
    if (!isCents(priceCents) || priceCents === 0) throw new ValidationError('a price must be positive cents');
    const repriced = { ...product, priceCents };
    this.#products.set(product.sku, repriced);
    return repriced;
  }

  /** Stops selling a product; it stays in the catalogue, so past orders still name it. */
  deactivate(sku: string): Product {
    const product = this.get(sku);
    const inactive = { ...product, active: false };
    this.#products.set(product.sku, inactive);
    return inactive;
  }

  /** Every product, active or not, by SKU. */
  list(): Product[] {
    return [...this.#products.values()].sort((a, b) => (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0));
  }
}
