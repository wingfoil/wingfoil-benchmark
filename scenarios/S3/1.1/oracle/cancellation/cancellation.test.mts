// S3's hidden tests for cancellations, scored after step 5 (S3.md §7). Step 5 gives the contract and not
// the policy: the refunds must follow D5, stated once in step 1. The code under test is imported inside
// each test.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const pad = (n: number) => String(n).padStart(2, '0');
/** June `day`, 2027, at `hour`:`minute`, in UTC. */
const at = (day: number, hour = 0, minute = 0) => `2027-06-${pad(day)}T${pad(hour)}:${pad(minute)}:00Z`;

async function desk() {
  const { createRentalService } = await import('../../seed/src/index.js');
  const service = createRentalService();
  service.addEquipment({ id: 'B1', kind: 'board', dailyPrice: 2500, hourlyPrice: 900 });
  service.addEquipment({ id: 'S1', kind: 'sail', dailyPrice: 1800 });
  return service;
}

describe('cancelling a booking', () => {
  it('D5: cancelling 24 hours or more before the start refunds the whole total', async () => {
    const service = await desk();
    const booking = service.book({ itemId: 'B1', start: at(10), end: at(12) });
    assert.deepEqual(service.cancel(booking.id, at(7)), { bookingId: booking.id, refund: 5000 });
  });

  it('D5: cancelling less than 24 hours before the start refunds nothing', async () => {
    const service = await desk();
    const booking = service.book({ itemId: 'B1', start: at(10), end: at(12) });
    assert.equal(service.cancel(booking.id, at(9, 12)).refund, 0);
  });

  it('D5: cancelling after the start refunds nothing', async () => {
    const service = await desk();
    const booking = service.book({ itemId: 'S1', start: at(10), end: at(12) });
    assert.equal(service.cancel(booking.id, at(11)).refund, 0);
  });

  it('D5: an hourly booking follows the same policy', async () => {
    const service = await desk();
    const early = service.book({ itemId: 'B1', start: at(15, 14), end: at(15, 16) });
    const late = service.book({ itemId: 'B1', start: at(16, 14), end: at(16, 16) });
    assert.equal(service.cancel(early.id, at(13, 9)).refund, 1800);
    assert.equal(service.cancel(late.id, at(16, 9)).refund, 0);
  });

  it('D1: refunds a discounted booking its total, in integer cents', async () => {
    const service = await desk();
    const booking = service.book({ itemId: 'B1', start: at(20), end: at(23) });
    const refund = service.cancel(booking.id, at(1)).refund;
    assert.equal(refund, 6750);
    assert.ok(Number.isInteger(refund));
  });

  it('frees the equipment of a cancelled booking', async () => {
    const service = await desk();
    const booking = service.book({ itemId: 'S1', start: at(5), end: at(7) });
    service.cancel(booking.id, at(1));
    service.book({ itemId: 'S1', start: at(5), end: at(7) });
  });

  it('refuses to cancel an unknown booking, or one already cancelled', async () => {
    const service = await desk();
    assert.throws(() => service.cancel('no-such-booking', at(1)));
    const booking = service.book({ itemId: 'S1', start: at(5), end: at(7) });
    service.cancel(booking.id, at(1));
    assert.throws(() => service.cancel(booking.id, at(1)));
  });
});
