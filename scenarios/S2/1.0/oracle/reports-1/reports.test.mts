// S2's hidden tests for the three reports of step 1, scored after steps 1, 2 and 3: one test per
// reported symptom (M-D1). Each fails on the seed and passes once its symptom is gone; at step 3 they
// also show that the step-1 fixes are still in place.
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
  s.catalog.add({ sku: 'WT-9', name: 'Wool throw', priceCents: 3900, vatClass: vat(22), weightGrams: 800 });
  s.catalog.add({ sku: 'HX-2', name: 'Hexagon tile', priceCents: 1250, vatClass: vat(22), weightGrams: 200 });
  s.catalog.add({ sku: 'CL-1', name: 'Clay coaster', priceCents: 199, vatClass: vat(22), weightGrams: 60 });
  s.catalog.add({ sku: 'SP-6', name: 'Saffron pouch', priceCents: 1005, vatClass: vat(10), weightGrams: 20 });
  for (const sku of ['WT-9', 'HX-2', 'CL-1', 'SP-6']) s.inventory.restock(sku, 30);
  return s;
}

const request = (lines: { sku: string; quantity: number }[]) => ({ customer: 'cust-31', date: '2027-02-03', lines });

describe(DEFECT, () => {
  it(`${DEFECT} 1.1: a product code in lower case finds its product`, async () => {
    const s = await shop();
    assert.equal(s.catalog.get(' wt-9 ').sku, 'WT-9');
    const placed = s.orders.place(request([{ sku: 'wt-9', quantity: 1 }, { sku: 'Hx-2', quantity: 1 }]));
    assert.deepEqual(placed.lines.map((l: { sku: string }) => l.sku), ['WT-9', 'HX-2']);
  });

  it(`${DEFECT} 1.2: goods of exactly the free-shipping amount ship free`, async () => {
    const s = await shop();
    const { totals } = s.orders.quote(request([{ sku: 'HX-2', quantity: 4 }]));
    assert.equal(totals.goodsCents, 5000);
    assert.equal(totals.shippingCents, 0);
  });

  it(`${DEFECT} 1.3: a line's VAT is rounded half up to the cent`, async () => {
    const s = await shop();
    const { lines, totals } = s.orders.quote(request([{ sku: 'CL-1', quantity: 1 }, { sku: 'SP-6', quantity: 1 }]));
    assert.deepEqual(lines.map((l: { vatCents: number }) => l.vatCents), [44, 101]);
    assert.equal(totals.vatCents, 145);
  });
});
