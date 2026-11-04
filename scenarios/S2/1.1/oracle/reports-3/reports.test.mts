// S2's hidden tests for step 3, scored after step 3: the real report (M-D1), and the duplicate of a
// step-1 report told in other words, which passes once the step-1 fix is in place (M-D2, by outcome).
// Both fail on the seed.
// The code under test is imported inside each test (adr-004 decision 10). The API's own words (VAT
// classes, statuses, order numbers) are never quoted: they are in the seed, and the leak scan would take
// them for oracle literals.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const DEFECT = 'defect';
const DUPLICATE = 'duplicate';

async function shop() {
  const { createShop, VAT_RATES } = await import('../../seed/src/index.js');
  const vat = (rate: number) => Object.keys(VAT_RATES).find((name) => VAT_RATES[name] === rate);
  const s = createShop();
  s.catalog.add({ sku: 'RB-7', name: 'Rain boots', priceCents: 4500, vatClass: vat(22), weightGrams: 1400 });
  s.catalog.add({ sku: 'SK-3', name: 'Merino socks', priceCents: 1500, vatClass: vat(22), weightGrams: 90 });
  s.catalog.add({ sku: 'CP-1', name: 'Canvas cap', priceCents: 2000, vatClass: vat(22), weightGrams: 120 });
  for (const sku of ['RB-7', 'SK-3', 'CP-1']) s.inventory.restock(sku, 20);
  s.coupons.add({ code: 'Hazel', kind: 'fixed', value: 1000, validFrom: '2027-01-01', validUntil: '2027-12-31', singleUse: true });
  return s;
}

describe(DEFECT, () => {
  it(`${DEFECT} 3.1: cancelling an order gives its single-use coupon back`, async () => {
    const s = await shop();
    const first = s.orders.place({ customer: 'cust-34', date: '2027-09-09', lines: [{ sku: 'RB-7', quantity: 1 }], coupon: 'HAZEL' });
    s.orders.cancel(first.id, '2027-09-09');
    const second = s.orders.place({ customer: 'cust-34', date: '2027-09-09', lines: [{ sku: 'RB-7', quantity: 1 }], coupon: 'HAZEL' });
    assert.equal(second.totals.couponDiscountCents, 1000);
    assert.equal(s.coupons.usedBy('HAZEL'), second.id);
  });
});

describe(DUPLICATE, () => {
  it(`${DUPLICATE} 3.2: an order whose goods come to exactly the free-shipping amount ships free`, async () => {
    const s = await shop();
    const { totals } = s.orders.quote({ customer: 'cust-35', date: '2027-09-10', lines: [{ sku: 'SK-3', quantity: 2 }, { sku: 'CP-1', quantity: 1 }] });
    assert.equal(totals.goodsCents, 5000);
    assert.equal(totals.shippingCents, 0);
  });
});
