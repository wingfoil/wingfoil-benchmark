import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createShop, InactiveProductError, UnknownProductError, ValidationError } from '../src/index.ts';

describe('catalogue', () => {
  it('adds a product under its upper-case SKU', () => {
    const { catalog } = createShop();
    const product = catalog.add({ sku: 'MUG-01', name: 'Enamel mug', priceCents: 1290, vatClass: 'standard', weightGrams: 350 });
    assert.equal(product.sku, 'MUG-01');
    assert.equal(catalog.get('MUG-01').name, 'Enamel mug');
    assert.equal(catalog.get('  MUG-01 ').priceCents, 1290);
  });

  it('refuses a SKU twice, a malformed SKU and a zero price', () => {
    const { catalog } = createShop();
    catalog.add({ sku: 'MUG-01', name: 'Enamel mug', priceCents: 1290, vatClass: 'standard', weightGrams: 350 });
    assert.throws(() => catalog.add({ sku: 'MUG-01', name: 'Other', priceCents: 100, vatClass: 'standard', weightGrams: 1 }), ValidationError);
    assert.throws(() => catalog.add({ sku: 'MUG 02', name: 'Other', priceCents: 100, vatClass: 'standard', weightGrams: 1 }), ValidationError);
    assert.throws(() => catalog.add({ sku: 'MUG-03', name: 'Other', priceCents: 0, vatClass: 'standard', weightGrams: 1 }), ValidationError);
  });

  it('keeps a product that is no longer sold, and refuses to sell it', () => {
    const { catalog } = createShop();
    catalog.add({ sku: 'TEA-7', name: 'Green tea', priceCents: 650, vatClass: 'reduced', weightGrams: 100 });
    catalog.deactivate('TEA-7');
    assert.equal(catalog.get('TEA-7').active, false);
    assert.throws(() => catalog.getForSale('TEA-7'), InactiveProductError);
    assert.throws(() => catalog.get('TEA-8'), UnknownProductError);
  });
});
