// S2's hidden test for the false report of step 2, scored after steps 2 and 3 (M-D2, by outcome): the
// README says shipping pays VAT at the standard rate, so the behaviour reported is correct and must
// still be in place. It passes on the seed on purpose.
// The code under test is imported inside each test (adr-004 decision 10). The API's own words (VAT
// classes, statuses, order numbers) are never quoted: they are in the seed, and the leak scan would take
// them for oracle literals.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const FALSE_REPORT = 'false report';

describe(FALSE_REPORT, () => {
  it(`${FALSE_REPORT} 2.3: shipping pays VAT at the standard rate, apart from the goods`, async () => {
    const { createShop, VAT_RATES } = await import('../../seed/src/index.js');
    const vat = (rate: number) => Object.keys(VAT_RATES).find((name) => VAT_RATES[name] === rate);
    const s = createShop();
    s.catalog.add({ sku: 'FN-2', name: 'Fern print', priceCents: 1500, vatClass: vat(22), weightGrams: 300 });
    s.catalog.add({ sku: 'BK-5', name: 'Atlas of rivers', priceCents: 2000, vatClass: vat(4), weightGrams: 1600 });
    s.inventory.restock('FN-2', 10);
    s.inventory.restock('BK-5', 10);
    const light = s.orders.quote({ customer: 'cust-33', date: '2027-06-06', lines: [{ sku: 'FN-2', quantity: 1 }] });
    assert.deepEqual([light.totals.shippingCents, light.totals.shippingVatCents, light.totals.vatCents], [490, 108, 330]);
    const books = s.orders.quote({ customer: 'cust-33', date: '2027-06-06', lines: [{ sku: 'BK-5', quantity: 1 }] });
    assert.deepEqual([books.totals.shippingCents, books.totals.shippingVatCents, books.totals.vatCents], [890, 196, 80]);
    assert.equal(books.totals.totalCents, 2000 + 890 + 80 + 196);
  });
});
