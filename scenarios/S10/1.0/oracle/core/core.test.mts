// S10's hidden tests on every step: the seed's own behaviour still stands. The code under test is imported
// inside each test.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** What the order book's methods return: the seed's result shape. */
interface Outcome {
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: { readonly message?: string };
}

/** The shop of the snapshot under test, through its public API, as far as these tests use it. */
interface Shop {
  readonly catalogue: { add(product: { sku: string; name: string; priceCents: number }): Outcome };
  readonly customers: { add(customer: { id: string; name: string; email: string; phone: string }): Outcome };
  readonly orders: {
    place(order: { customerId: string; date: string; lines: { sku: string; quantity: number }[] }): Outcome;
    get(number: number): Outcome;
    all(): unknown[];
    totals(number: number): Outcome;
    applyCode?(orderNumber: number, code: string): Outcome;
    exportMonth?(month: string): string;
  };
}

/** A shop of the snapshot under test, stocked with the products and customers these tests use. */
async function stockedShop(): Promise<Shop> {
  const { createShop } = (await import('../../seed/src/index.js')) as { createShop: () => Shop };
  const shop = createShop();
  for (const product of [
    { sku: 'APL-1KG', name: 'Apples, bag of 1 kg', priceCents: 349 },
    { sku: 'OIL-1L', name: 'Olive oil, one litre', priceCents: 1700 },
    { sku: 'CHS-200', name: 'Cheese, 200 g', priceCents: 1250 },
    { sku: 'HAM-W', name: 'Ham, whole leg', priceCents: 6400 },
    { sku: 'BSK-25', name: 'Gift basket', priceCents: 2500 },
    { sku: 'WIN-50', name: 'Red wine', priceCents: 5000 },
  ]) {
    valueOf(shop.catalogue.add(product));
  }
  valueOf(shop.customers.add({ id: 'c1', name: 'Mirela Holt', email: 'mirela.holt@example.org', phone: '555-0111' }));
  valueOf(shop.customers.add({ id: 'c2', name: 'Teo Brandt', email: 'teo.brandt@example.net', phone: '555-0177' }));
  return shop;
}

/** A value the snapshot returns, read field by field. */
type View = Readonly<Record<string, unknown>>;

/** The value of a successful result; the test fails on anything else. */
function valueOf(result: Outcome): View {
  assert.equal(result?.ok, true, JSON.stringify(result));
  return result.value as View;
}

/** Whether `call` was refused: a returned failed result or a thrown error both count. */
function refused(call: () => Outcome): boolean {
  try {
    return call()?.ok === false;
  } catch {
    return true;
  }
}

describe('orders', () => {
  it('numbers each order from one, keeping its lines', async () => {
    const shop = await stockedShop();
    const order = valueOf(shop.orders.place({ customerId: 'c1', date: '2026-10-04', lines: [{ sku: 'APL-1KG', quantity: 2 }] }));
    assert.equal(order.number, 1);
    assert.deepEqual(valueOf(shop.orders.get(1)).lines, [{ sku: 'APL-1KG', quantity: 2 }]);
  });

  it('charges 4.90 € shipping on a small order, and none on a large one', async () => {
    const shop = await stockedShop();
    shop.orders.place({ customerId: 'c1', date: '2026-10-04', lines: [{ sku: 'CHS-200', quantity: 1 }] });
    shop.orders.place({ customerId: 'c1', date: '2026-10-04', lines: [{ sku: 'HAM-W', quantity: 1 }] });
    const small = valueOf(shop.orders.totals(1));
    assert.equal(small.itemsCents, 1250);
    assert.equal(small.shippingCents, 490);
    assert.equal(small.totalCents, 1740);
    assert.equal(valueOf(shop.orders.totals(2)).shippingCents, 0);
  });

  it('refuses an unknown customer, an unknown product, a bad date or quantity, and places nothing', async () => {
    const shop = await stockedShop();
    assert.ok(refused(() => shop.orders.place({ customerId: 'zz', date: '2026-10-04', lines: [{ sku: 'OIL-1L', quantity: 1 }] })));
    assert.ok(refused(() => shop.orders.place({ customerId: 'c1', date: '2026-10-04', lines: [{ sku: 'NOPE', quantity: 1 }] })));
    assert.ok(refused(() => shop.orders.place({ customerId: 'c1', date: '2026-13-02', lines: [{ sku: 'OIL-1L', quantity: 1 }] })));
    assert.ok(refused(() => shop.orders.place({ customerId: 'c1', date: '2026-10-04', lines: [{ sku: 'OIL-1L', quantity: 0 }] })));
    assert.equal(shop.orders.all().length, 0);
  });
});
