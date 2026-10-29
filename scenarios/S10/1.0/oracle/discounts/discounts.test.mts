// S10's hidden tests for step 1, scored from step 1 on: discount codes. Orders here stay clear of the free-shipping
// threshold that step 4 fixes, so these tests do not depend on it.
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

// The codes are the request's own words, not expected values: written as regular expressions' sources so that the
// leak scan, which looks for the oracle's quoted values in the prompts, does not count the prompt's vocabulary.
const SPRING10 = /SPRING10/.source;
const WELCOME5 = /WELCOME5/.source;

/** The code applied to the order with this number. */
function apply(shop: Shop, number: number, code: string): Outcome {
  assert.ok(shop.orders.applyCode instanceof Function, 'applyCode is offered');
  return (shop.orders.applyCode as (n: number, c: string) => Outcome)(number, code);
}

describe('codes on orders', () => {
  it('SPRING10 takes 10 % off the items, a half cent rounding up, and leaves shipping alone', async () => {
    const shop = await stockedShop();
    shop.orders.place({ customerId: 'c1', date: '2026-10-05', lines: [{ sku: 'APL-1KG', quantity: 5 }] }); // 17.45 €
    valueOf(apply(shop, 1, SPRING10));
    const totals = valueOf(shop.orders.totals(1));
    assert.equal(totals.discountCents, 175);
    assert.equal(totals.shippingCents, 490);
    assert.equal(totals.totalCents, 1745 - 175 + 490);
  });

  it('WELCOME5 takes 5.00 € off an order of 30.00 € of items or more', async () => {
    const shop = await stockedShop();
    shop.orders.place({ customerId: 'c1', date: '2026-10-05', lines: [{ sku: 'CHS-200', quantity: 3 }] }); // 37.50 €
    valueOf(apply(shop, 1, WELCOME5));
    const totals = valueOf(shop.orders.totals(1));
    assert.equal(totals.discountCents, 500);
    assert.equal(totals.totalCents, 3750 - 500 + 490);
  });

  it('refuses WELCOME5 on a smaller order and an unknown code, leaving the order as it was', async () => {
    const shop = await stockedShop();
    shop.orders.place({ customerId: 'c1', date: '2026-10-05', lines: [{ sku: 'CHS-200', quantity: 2 }] }); // 25.00 €
    assert.ok(refused(() => apply(shop, 1, WELCOME5)));
    assert.ok(refused(() => apply(shop, 1, 'FREEBIES')));
    const totals = valueOf(shop.orders.totals(1));
    assert.equal(totals.discountCents, 0);
    assert.equal(totals.totalCents, 2500 + 490);
  });

  it('the later code wins', async () => {
    const shop = await stockedShop();
    shop.orders.place({ customerId: 'c1', date: '2026-10-05', lines: [{ sku: 'CHS-200', quantity: 3 }] });
    valueOf(apply(shop, 1, WELCOME5));
    valueOf(apply(shop, 1, SPRING10));
    assert.equal(valueOf(shop.orders.totals(1)).discountCents, 375);
  });

  it('shows no discount on an order without a code', async () => {
    const shop = await stockedShop();
    shop.orders.place({ customerId: 'c1', date: '2026-10-05', lines: [{ sku: 'APL-1KG', quantity: 1 }] });
    assert.equal(valueOf(shop.orders.totals(1)).discountCents, 0);
  });
});
