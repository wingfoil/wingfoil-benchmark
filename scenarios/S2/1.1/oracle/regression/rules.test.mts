// S2's hidden regression suite, after every step (M-D3): the README's rules that hold on the seed. Each
// test passes on the seed on purpose; one that fails at a later step is a regression. Written anew, with
// data of its own, not copied from the seed's visible tests. The code under test is imported inside each
// test (adr-004 decision 10). The API's own words — its VAT classes, its statuses, its order numbers —
// are in the seed too, so they are never quoted here: the leak scan would take them for oracle literals.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const RULE = 'rule';

async function shop() {
  const { createShop, VAT_RATES } = await import('../../seed/src/index.js');
  /** The VAT class whose rate is `rate` percent. */
  const vat = (rate: number) => Object.keys(VAT_RATES).find((name) => VAT_RATES[name] === rate);
  const s = createShop();
  s.catalog.add({ sku: 'QX-71', name: 'Walnut tray', priceCents: 2500, vatClass: vat(22), weightGrams: 900 });
  s.catalog.add({ sku: 'QX-72', name: 'Linen napkin', priceCents: 300, vatClass: vat(22), weightGrams: 40 });
  s.catalog.add({ sku: 'KB-3', name: 'Rye crackers', priceCents: 400, vatClass: vat(4), weightGrams: 250 });
  s.catalog.add({ sku: 'ZN-5', name: 'Cast iron pan', priceCents: 4000, vatClass: vat(22), weightGrams: 4200 });
  for (const sku of ['QX-71', 'QX-72', 'KB-3', 'ZN-5']) s.inventory.restock(sku, 50);
  s.coupons.add({ code: 'Maple', kind: 'percent', value: 20, validFrom: '2027-05-01', validUntil: '2027-05-31' });
  s.coupons.add({ code: 'Birch', kind: 'fixed', value: 9000, validFrom: '2027-01-01', validUntil: '2027-12-31' });
  s.coupons.add({ code: 'Elm', kind: 'fixed', value: 300, validFrom: '2027-01-01', validUntil: '2027-12-31', minimumCents: 2000 });
  s.coupons.add({ code: 'Oak', kind: 'fixed', value: 100, validFrom: '2027-01-01', validUntil: '2027-12-31', singleUse: true });
  return s;
}

const line = (sku: string, quantity: number) => ({ sku, quantity });
const order = (lines: { sku: string; quantity: number }[], extra: Record<string, unknown> = {}) => ({
  customer: 'cust-8',
  date: '2027-05-10',
  lines,
  ...extra,
});

describe(RULE, () => {
  it(`${RULE} 1: a SKU is shown in upper case and read without its surrounding spaces`, async () => {
    const s = await shop();
    assert.equal(s.catalog.get(' QX-71  ').sku, 'QX-71');
    assert.equal(s.orders.place(order([line('  ZN-5 ', 1)])).lines[0].sku, 'ZN-5');
  });

  it(`${RULE} 2: a product no longer sold cannot be ordered`, async () => {
    const s = await shop();
    s.catalog.deactivate('KB-3');
    assert.throws(() => s.orders.place(order([line('KB-3', 1)])));
    assert.equal(s.catalog.get('KB-3').active, false);
  });

  it(`${RULE} 3: an order above the stock is refused and reserves nothing`, async () => {
    const s = await shop();
    assert.throws(() => s.orders.place(order([line('QX-72', 3), line('QX-71', 51)])));
    assert.equal(s.inventory.available('QX-72'), 50);
    assert.equal(s.inventory.available('QX-71'), 50);
  });

  it(`${RULE} 4: two lines of one SKU are merged`, async () => {
    const s = await shop();
    const placed = s.orders.place(order([line('KB-3', 2), line('KB-3', 5)]));
    assert.deepEqual(placed.lines.map((l: { sku: string; quantity: number }) => [l.sku, l.quantity]), [['KB-3', 7]]);
  });

  it(`${RULE} 5: the volume discount starts at 10 units, on that line only`, async () => {
    const s = await shop();
    const placed = s.orders.quote(order([line('QX-72', 10), line('KB-3', 9)]));
    assert.deepEqual(placed.lines.map((l: { volumeDiscountCents: number }) => l.volumeDiscountCents), [300, 0]);
  });

  it(`${RULE} 6: shipping by weight band, below the free-shipping amount`, async () => {
    const s = await shop();
    const cost = (lines: { sku: string; quantity: number }[]) => s.orders.quote(order(lines)).totals.shippingCents;
    assert.equal(cost([line('KB-3', 4)]), 490); // 1000 g
    assert.equal(cost([line('KB-3', 4), line('QX-72', 1)]), 890); // 1040 g
    assert.equal(s.orders.quote(order([line('ZN-5', 1), line('QX-72', 1)])).totals.shippingCents, 890); // 4240 g
  });

  it(`${RULE} 7: a heavy parcel of goods well above the free-shipping amount ships free`, async () => {
    const s = await shop();
    assert.equal(s.orders.quote(order([line('ZN-5', 5)])).totals.shippingCents, 0);
  });

  it(`${RULE} 8: VAT line by line at each class's rate, and the total adds everything up`, async () => {
    const s = await shop();
    const { lines, totals } = s.orders.quote(order([line('QX-71', 1), line('KB-3', 5)]));
    assert.deepEqual(lines.map((l: { vatCents: number }) => l.vatCents), [550, 80]);
    assert.equal(totals.vatCents, 630);
    assert.equal(
      totals.totalCents,
      totals.goodsCents + totals.shippingCents + totals.vatCents + totals.shippingVatCents,
    );
  });

  it(`${RULE} 9: a percentage coupon inside its period, the code in any case`, async () => {
    const s = await shop();
    const { totals } = s.orders.quote(order([line('QX-71', 1)], { coupon: 'mAPLE' }));
    assert.equal(totals.couponDiscountCents, 500);
    assert.equal(totals.goodsCents, 2000);
  });

  it(`${RULE} 10: a coupon is refused the day before its first day and the day after its last`, async () => {
    const s = await shop();
    assert.throws(() => s.orders.quote(order([line('QX-71', 1)], { coupon: 'MAPLE', date: '2027-04-30' })));
    assert.throws(() => s.orders.quote(order([line('QX-71', 1)], { coupon: 'MAPLE', date: '2027-06-01' })));
  });

  it(`${RULE} 11: a coupon's minimum amount`, async () => {
    const s = await shop();
    assert.throws(() => s.orders.quote(order([line('QX-72', 6)], { coupon: 'ELM' })));
    assert.equal(s.orders.quote(order([line('QX-72', 7)], { coupon: 'ELM' })).totals.couponDiscountCents, 300);
  });

  it(`${RULE} 12: all discounts together take at most half of the gross amount`, async () => {
    const s = await shop();
    const { totals } = s.orders.quote(order([line('ZN-5', 2)], { coupon: 'BIRCH' }));
    assert.equal(totals.couponDiscountCents, 4000);
    assert.equal(totals.goodsCents, 4000);
  });

  it(`${RULE} 13: a single-use coupon serves one order`, async () => {
    const s = await shop();
    s.orders.place(order([line('QX-72', 1)], { coupon: 'OAK' }));
    assert.throws(() => s.orders.place(order([line('QX-72', 1)], { coupon: 'OAK', customer: 'cust-9' })));
  });

  it(`${RULE} 14: cancelling on the 14th day returns the units; the 15th day is too late`, async () => {
    const s = await shop();
    const first = s.orders.place(order([line('QX-71', 4)]));
    const second = s.orders.place(order([line('QX-71', 1)]));
    s.orders.cancel(first.id, '2027-05-24');
    assert.equal(s.inventory.available('QX-71'), 49);
    assert.throws(() => s.orders.cancel(second.id, '2027-05-25'));
  });

  it(`${RULE} 15: a shipped order cannot be cancelled, nor a cancelled one shipped`, async () => {
    const s = await shop();
    const shipped = s.orders.place(order([line('KB-3', 1)]));
    s.orders.ship(shipped.id, '2027-05-11');
    assert.throws(() => s.orders.cancel(shipped.id, '2027-05-12'));
    const cancelled = s.orders.place(order([line('KB-3', 1)]));
    s.orders.cancel(cancelled.id, '2027-05-11');
    assert.throws(() => s.orders.ship(cancelled.id, '2027-05-12'));
    assert.equal(s.inventory.onHand('KB-3'), 49);
  });

  it(`${RULE} 16: orders and invoices are numbered in sequence`, async () => {
    const s = await shop();
    const a = s.orders.place(order([line('ZN-5', 1)]));
    const b = s.orders.place(order([line('ZN-5', 1)]));
    assert.match(a.id, /^ORD-0001$/);
    assert.match(b.id, /^ORD-0002$/);
    const invoice = s.invoices.issue(s.orders.ship(b.id, '2027-05-12'));
    assert.equal(invoice.number, '2027/0001');
    assert.equal(invoice.totalCents, s.orders.get(b.id).totals.totalCents);
  });
});
