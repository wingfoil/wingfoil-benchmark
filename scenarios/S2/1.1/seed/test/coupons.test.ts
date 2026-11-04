import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CouponError, createShop } from '../src/index.ts';

function shop() {
  const s = createShop();
  s.catalog.add({ sku: 'PEN-4', name: 'Fountain pen', priceCents: 2000, vatClass: 'standard', weightGrams: 50 });
  s.inventory.restock('PEN-4', 20);
  s.coupons.add({ code: 'SPRING', kind: 'percent', value: 10, validFrom: '2026-03-01', validUntil: '2026-03-31' });
  s.coupons.add({ code: 'FIVEOFF', kind: 'fixed', value: 500, validFrom: '2026-01-01', validUntil: '2026-12-31', minimumCents: 3000 });
  return s;
}

describe('coupons', () => {
  it('takes a percentage off, whatever the case of the code', () => {
    const { orders } = shop();
    const order = orders.place({ customer: 'c-1', date: '2026-03-15', lines: [{ sku: 'PEN-4', quantity: 2 }], coupon: 'spring' });
    assert.equal(order.totals.couponDiscountCents, 400);
    assert.equal(order.totals.goodsCents, 3600);
  });

  it('takes a fixed amount off above its minimum, and refuses it below', () => {
    const { orders } = shop();
    assert.equal(orders.quote({ customer: 'c-1', date: '2026-06-01', lines: [{ sku: 'PEN-4', quantity: 2 }], coupon: 'FIVEOFF' }).totals.couponDiscountCents, 500);
    assert.throws(() => orders.quote({ customer: 'c-1', date: '2026-06-01', lines: [{ sku: 'PEN-4', quantity: 1 }], coupon: 'FIVEOFF' }), CouponError);
  });

  it('refuses a coupon before its first day and after its last', () => {
    const { orders } = shop();
    const request = { customer: 'c-1', lines: [{ sku: 'PEN-4', quantity: 1 }], coupon: 'SPRING' };
    assert.throws(() => orders.quote({ ...request, date: '2026-02-28' }), CouponError);
    assert.throws(() => orders.quote({ ...request, date: '2026-04-01' }), CouponError);
  });

  it('lets a single-use coupon be used once', () => {
    const { orders, coupons } = shop();
    coupons.add({ code: 'ONCE', kind: 'fixed', value: 100, validFrom: '2026-01-01', validUntil: '2026-12-31', singleUse: true });
    orders.place({ customer: 'c-1', date: '2026-05-05', lines: [{ sku: 'PEN-4', quantity: 1 }], coupon: 'ONCE' });
    assert.equal(coupons.usedBy('ONCE'), 'ORD-0001');
    assert.throws(() => orders.place({ customer: 'c-2', date: '2026-05-05', lines: [{ sku: 'PEN-4', quantity: 1 }], coupon: 'ONCE' }), CouponError);
  });
});
