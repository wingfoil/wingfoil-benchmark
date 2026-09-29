// S2's hidden tests for the two real reports of step 2, scored after steps 2 and 3 (M-D1). Each fails
// on the seed and passes once its symptom is gone.
// The code under test is imported inside each test (adr-004 decision 10). The API's own words (VAT
// classes, statuses, order numbers) are never quoted: they are in the seed, and the leak scan would take
// them for oracle literals.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const DEFECT = 'defect';

async function shop() {
  const { createShop, VAT_RATES } = await import('../../seed/src/index.js');
  const vat = (rate: number) => Object.keys(VAT_RATES).find((name) => VAT_RATES[name] === rate);
  const s = createShop();
  s.catalog.add({ sku: 'NB-4', name: 'Dotted notebook', priceCents: 500, vatClass: vat(22), weightGrams: 180 });
  s.catalog.add({ sku: 'GL-8', name: 'Glass carafe', priceCents: 2400, vatClass: vat(22), weightGrams: 700 });
  s.inventory.restock('NB-4', 40);
  s.inventory.restock('GL-8', 40);
  s.coupons.add({ code: 'Juniper', kind: 'percent', value: 10, validFrom: '2027-01-01', validUntil: '2027-12-31' });
  s.coupons.add({ code: 'Willow', kind: 'percent', value: 15, validFrom: '2027-11-01', validUntil: '2027-11-30' });
  return s;
}

describe(DEFECT, () => {
  it(`${DEFECT} 2.1: a percentage coupon applies to the subtotal after volume discounts`, async () => {
    const s = await shop();
    const { totals } = s.orders.quote({ customer: 'cust-32', date: '2027-04-04', lines: [{ sku: 'NB-4', quantity: 12 }], coupon: 'JUNIPER' });
    assert.equal(totals.volumeDiscountCents, 600);
    assert.equal(totals.couponDiscountCents, 540);
    assert.equal(totals.goodsCents, 4860);
  });

  it(`${DEFECT} 2.2: a coupon is valid on its last day`, async () => {
    const s = await shop();
    const { totals } = s.orders.quote({ customer: 'cust-32', date: '2027-11-30', lines: [{ sku: 'GL-8', quantity: 1 }], coupon: 'WILLOW' });
    assert.equal(totals.couponDiscountCents, 360);
  });
});
