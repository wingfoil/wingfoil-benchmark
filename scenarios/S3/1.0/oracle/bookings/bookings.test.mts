// S3's hidden tests for inventory, quotes and bookings, scored after every step (S3.md §7). A test named
// D<n> checks decision D<n> of step 1 (§5), so that M-F1 can read decisions by name. The code under test
// is imported inside each test (adr-004 decision 10), so that a snapshot without it fails every test.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const pad = (n: number) => String(n).padStart(2, '0');
/** June `day`, 2027, at `hour`:`minute`, in UTC. */
const at = (day: number, hour = 0, minute = 0) => `2027-06-${pad(day)}T${pad(hour)}:${pad(minute)}:00Z`;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** A service with three items. Every total asserted here is of 2 days or less, below step 3's discount. */
async function desk() {
  const { createRentalService } = await import('../../seed/src/index.js');
  const service = createRentalService();
  service.addEquipment({ id: 'B1', kind: 'board', dailyPrice: 2500 });
  service.addEquipment({ id: 'B2', kind: 'board', dailyPrice: 3100 });
  service.addEquipment({ id: 'S1', kind: 'sail', dailyPrice: 1800 });
  return service;
}

/** `actual` is an ISO-8601 time in UTC, the instant `expected` names. */
function sameInstant(actual: unknown, expected: string): void {
  assert.match(String(actual), ISO_UTC);
  assert.equal(Date.parse(String(actual)), Date.parse(expected));
}

describe('rental desk', () => {
  it('D1: a quote totals the daily price over the days, in integer cents', async () => {
    const service = await desk();
    const quote = service.quote({ itemId: 'B1', start: at(1), end: at(3) });
    assert.equal(quote.total, 5000);
    assert.ok(Number.isInteger(quote.total));
    assert.equal(service.quote({ itemId: 'S1', start: at(10), end: at(11) }).total, 1800);
  });

  it('D1: a booking costs what its quote said, in integer cents', async () => {
    const service = await desk();
    const quoted = service.quote({ itemId: 'B2', start: at(1), end: at(3) }).total;
    const booking = service.book({ itemId: 'B2', start: at(1), end: at(3) });
    assert.equal(booking.total, 6200);
    assert.equal(booking.total, quoted);
    assert.equal(booking.itemId, 'B2');
  });

  it('D2: a quote gives its period back as UTC ISO-8601 times', async () => {
    const quote = (await desk()).quote({ itemId: 'B1', start: at(4), end: at(6) });
    sameInstant(quote.start, at(4));
    sameInstant(quote.end, at(6));
  });

  it('D2: a booking gives its period back as UTC ISO-8601 times', async () => {
    const booking = (await desk()).book({ itemId: 'S1', start: at(7), end: at(8) });
    sameInstant(booking.start, at(7));
    sameInstant(booking.end, at(8));
  });

  it('D3: a period that is neither whole days nor whole hours is refused', async () => {
    const service = await desk();
    assert.throws(() => service.quote({ itemId: 'B1', start: at(1, 10, 30), end: at(1, 12) }));
    assert.throws(() => service.book({ itemId: 'B1', start: at(1, 10, 30), end: at(1, 12) }));
  });

  it('D4: the same item is refused over any period overlapping one of its bookings', async () => {
    const service = await desk();
    service.book({ itemId: 'B1', start: at(10), end: at(13) });
    assert.throws(() => service.book({ itemId: 'B1', start: at(12), end: at(14) }));
    assert.throws(() => service.book({ itemId: 'B1', start: at(11), end: at(12) }));
    assert.throws(() => service.book({ itemId: 'B1', start: at(10), end: at(13) }));
  });

  it('D4: back-to-back bookings of the same item are both accepted', async () => {
    const service = await desk();
    service.book({ itemId: 'B1', start: at(10), end: at(12) });
    service.book({ itemId: 'B1', start: at(12), end: at(14) });
    service.book({ itemId: 'B1', start: at(8), end: at(10) });
  });

  it('books different items over the same period', async () => {
    const service = await desk();
    service.book({ itemId: 'B1', start: at(20), end: at(22) });
    service.book({ itemId: 'B2', start: at(20), end: at(22) });
    service.book({ itemId: 'S1', start: at(20), end: at(22) });
  });

  it('gives each booking an id of its own', async () => {
    const service = await desk();
    const first = service.book({ itemId: 'B1', start: at(1), end: at(2) });
    const second = service.book({ itemId: 'B1', start: at(2), end: at(3) });
    assert.equal(typeof first.id, 'string');
    assert.notEqual(first.id, second.id);
  });

  it('refuses an unknown item', async () => {
    const service = await desk();
    assert.throws(() => service.quote({ itemId: 'X9', start: at(1), end: at(2) }));
    assert.throws(() => service.book({ itemId: 'X9', start: at(1), end: at(2) }));
  });

  it('refuses a period that ends where it starts, or before', async () => {
    const service = await desk();
    assert.throws(() => service.quote({ itemId: 'B1', start: at(3), end: at(3) }));
    assert.throws(() => service.book({ itemId: 'B1', start: at(3), end: at(1) }));
  });
});
