import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createShop, formatEuros } from '../src/index.ts';

function valueOf<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) assert.fail(JSON.stringify(result.error));
  return result.value;
}

function stocked() {
  const shop = createShop();
  valueOf(shop.catalogue.add({ sku: 'APL-1KG', name: 'Apples, 1 kg', priceCents: 349 }));
  valueOf(shop.catalogue.add({ sku: 'OIL-1L', name: 'Olive oil, 1 l', priceCents: 1290 }));
  valueOf(shop.catalogue.add({ sku: 'HAM-W', name: 'Whole ham', priceCents: 6400 }));
  valueOf(shop.customers.add({ id: 'c1', name: 'Mira Holt', email: 'mira@example.org', phone: '555-0101' }));
  return shop;
}

describe('order book', () => {
  it('numbers orders from 1 and keeps their lines', () => {
    const shop = stocked();
    const order = valueOf(shop.orders.place({ customerId: 'c1', date: '2026-10-02', lines: [{ sku: 'APL-1KG', quantity: 2 }] }));
    assert.equal(order.number, 1);
    assert.deepEqual(valueOf(shop.orders.get(1)).lines, [{ sku: 'APL-1KG', quantity: 2 }]);
  });

  it('charges shipping on a small order', () => {
    const shop = stocked();
    shop.orders.place({ customerId: 'c1', date: '2026-10-02', lines: [{ sku: 'OIL-1L', quantity: 1 }] });
    assert.deepEqual(valueOf(shop.orders.totals(1)), { itemsCents: 1290, shippingCents: 490, totalCents: 1780 });
  });

  it('ships a large order free', () => {
    const shop = stocked();
    shop.orders.place({ customerId: 'c1', date: '2026-10-03', lines: [{ sku: 'HAM-W', quantity: 1 }] });
    assert.equal(valueOf(shop.orders.totals(1)).shippingCents, 0);
  });

  it('refuses an unknown customer, product or a bad quantity', () => {
    const shop = stocked();
    assert.equal(shop.orders.place({ customerId: 'zz', date: '2026-10-02', lines: [{ sku: 'OIL-1L', quantity: 1 }] }).ok, false);
    assert.equal(shop.orders.place({ customerId: 'c1', date: '2026-10-02', lines: [{ sku: 'NOPE', quantity: 1 }] }).ok, false);
    assert.equal(shop.orders.place({ customerId: 'c1', date: '2026-10-02', lines: [{ sku: 'OIL-1L', quantity: 0 }] }).ok, false);
    assert.equal(shop.orders.all().length, 0);
  });

  it('formats amounts in euros', () => {
    assert.equal(formatEuros(1250), '12.50');
    assert.equal(formatEuros(5), '0.05');
  });
});
