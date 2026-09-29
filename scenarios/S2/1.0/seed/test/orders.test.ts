import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createShop, OrderStateError, OutOfStockError, receipt } from '../src/index.ts';

function shop() {
  const s = createShop();
  s.catalog.add({ sku: 'MUG-01', name: 'Enamel mug', priceCents: 1000, vatClass: 'standard', weightGrams: 300 });
  s.catalog.add({ sku: 'TEA-7', name: 'Green tea', priceCents: 500, vatClass: 'reduced', weightGrams: 100 });
  s.inventory.restock('MUG-01', 40);
  s.inventory.restock('TEA-7', 40);
  return s;
}

describe('orders', () => {
  it('prices a small order: goods, shipping by weight, VAT per line and on shipping', () => {
    const { orders } = shop();
    const order = orders.place({ customer: 'c-1', date: '2026-03-02', lines: [{ sku: 'MUG-01', quantity: 2 }, { sku: 'TEA-7', quantity: 2 }] });
    assert.equal(order.id, 'ORD-0001');
    assert.deepEqual(order.totals, {
      grossCents: 3000,
      volumeDiscountCents: 0,
      couponDiscountCents: 0,
      goodsCents: 3000,
      shippingCents: 490,
      vatCents: 440 + 100,
      shippingVatCents: 108,
      totalCents: 3000 + 490 + 540 + 108,
    });
  });

  it('ships a large order free', () => {
    const { orders } = shop();
    const order = orders.place({ customer: 'c-1', date: '2026-03-02', lines: [{ sku: 'MUG-01', quantity: 8 }] });
    assert.equal(order.totals.goodsCents, 8000);
    assert.equal(order.totals.shippingCents, 0);
  });

  it('gives 10% off a line of 10 units or more', () => {
    const { orders } = shop();
    const order = orders.place({ customer: 'c-1', date: '2026-03-02', lines: [{ sku: 'TEA-7', quantity: 10 }] });
    assert.equal(order.lines[0]?.volumeDiscountCents, 500);
    assert.equal(order.totals.goodsCents, 4500);
  });

  it('merges two lines of the same product', () => {
    const { orders } = shop();
    const order = orders.place({ customer: 'c-1', date: '2026-03-02', lines: [{ sku: 'TEA-7', quantity: 1 }, { sku: 'TEA-7', quantity: 3 }] });
    assert.equal(order.lines.length, 1);
    assert.equal(order.lines[0]?.quantity, 4);
  });

  it('reserves stock, and refuses an order above it without reserving anything', () => {
    const { orders, inventory } = shop();
    orders.place({ customer: 'c-1', date: '2026-03-02', lines: [{ sku: 'MUG-01', quantity: 5 }] });
    assert.equal(inventory.available('MUG-01'), 35);
    assert.throws(
      () => orders.place({ customer: 'c-2', date: '2026-03-02', lines: [{ sku: 'TEA-7', quantity: 1 }, { sku: 'MUG-01', quantity: 36 }] }),
      OutOfStockError,
    );
    assert.equal(inventory.available('TEA-7'), 40);
  });

  it('cancels within 14 days and returns the units; not later, and not once shipped', () => {
    const { orders, inventory } = shop();
    const first = orders.place({ customer: 'c-1', date: '2026-03-02', lines: [{ sku: 'MUG-01', quantity: 3 }] });
    orders.cancel(first.id, '2026-03-10');
    assert.equal(inventory.available('MUG-01'), 40);
    const second = orders.place({ customer: 'c-1', date: '2026-03-02', lines: [{ sku: 'MUG-01', quantity: 1 }] });
    assert.throws(() => orders.cancel(second.id, '2026-03-30'), OrderStateError);
    orders.ship(second.id, '2026-03-03');
    assert.throws(() => orders.cancel(second.id, '2026-03-04'), OrderStateError);
    assert.equal(inventory.onHand('MUG-01'), 39);
  });

  it('writes a receipt with every amount', () => {
    const { orders } = shop();
    const text = receipt(orders.place({ customer: 'c-1', date: '2026-03-02', lines: [{ sku: 'MUG-01', quantity: 1 }] }));
    assert.match(text, /1 × Enamel mug \(MUG-01\)\s+€10\.00/);
    assert.match(text, /Total\s+€/);
  });
});
