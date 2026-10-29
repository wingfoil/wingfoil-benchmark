// S10's hidden tests for step 4: the free-shipping threshold, 50.00 € of items or more, quantities included.
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

describe('free shipping', () => {
  it('ships free an order whose items come to exactly 50.00 €', async () => {
    const shop = await stockedShop();
    shop.orders.place({ customerId: 'c1', date: '2026-10-20', lines: [{ sku: 'WIN-50', quantity: 1 }] });
    const totals = valueOf(shop.orders.totals(1));
    assert.equal(totals.shippingCents, 0);
    assert.equal(totals.totalCents, 5000);
  });

  it('ships free an order that reaches 50.00 € only through quantities', async () => {
    const shop = await stockedShop();
    shop.orders.place({ customerId: 'c1', date: '2026-10-20', lines: [{ sku: 'OIL-1L', quantity: 3 }] });
    assert.equal(valueOf(shop.orders.totals(1)).shippingCents, 0);
    shop.orders.place({ customerId: 'c2', date: '2026-10-20', lines: [{ sku: 'BSK-25', quantity: 2 }] });
    assert.equal(valueOf(shop.orders.totals(2)).shippingCents, 0);
  });

});
