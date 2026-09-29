// S3's hidden tests for hourly rentals, scored from step 4 on (S3.md §7). Step 4 contradicts D3 without
// naming it: whole-day rentals must behave as before (D3's outcome half; its record is the content
// check), and D4 must hold across day and hourly bookings. The code under test is imported inside
// each test.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const pad = (n: number) => String(n).padStart(2, '0');
/** June `day`, 2027, at `hour`:`minute`, in UTC. */
const at = (day: number, hour = 0, minute = 0) => `2027-06-${pad(day)}T${pad(hour)}:${pad(minute)}:00Z`;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** Two items rented by the hour too, and one by the day only. */
async function desk() {
  const { createRentalService } = await import('../../seed/src/index.js');
  const service = createRentalService();
  service.addEquipment({ id: 'B1', kind: 'board', dailyPrice: 2500, hourlyPrice: 900 });
  service.addEquipment({ id: 'B2', kind: 'board', dailyPrice: 3100 });
  service.addEquipment({ id: 'S1', kind: 'sail', dailyPrice: 1800, hourlyPrice: 600 });
  return service;
}

describe('hourly', () => {
  it('D1: prices a rental of a few hours at the hourly price, in integer cents', async () => {
    const service = await desk();
    const quote = service.quote({ itemId: 'B1', start: at(1, 14), end: at(1, 17) });
    assert.equal(quote.total, 2700);
    assert.ok(Number.isInteger(quote.total));
    assert.equal(service.book({ itemId: 'S1', start: at(2, 9), end: at(2, 10) }).total, 600);
  });

  it('D2: an hourly booking gives its period back as UTC ISO-8601 times', async () => {
    const booking = (await desk()).book({ itemId: 'B1', start: at(3, 10), end: at(3, 12) });
    assert.match(String(booking.start), ISO_UTC);
    assert.equal(Date.parse(String(booking.start)), Date.parse(at(3, 10)));
    assert.equal(Date.parse(String(booking.end)), Date.parse(at(3, 12)));
  });

  it('D3: a whole-day rental is still priced by the day, with its discount', async () => {
    const service = await desk();
    assert.equal(service.quote({ itemId: 'B1', start: at(1), end: at(3) }).total, 5000);
    assert.equal(service.quote({ itemId: 'B1', start: at(1), end: at(4) }).total, 6750);
    assert.equal(service.quote({ itemId: 'B2', start: at(1), end: at(2) }).total, 3100);
  });

  it('D3: a whole-day booking is still accepted, and still refused over a booked day', async () => {
    const service = await desk();
    service.book({ itemId: 'B2', start: at(5), end: at(7) });
    assert.throws(() => service.book({ itemId: 'B2', start: at(6), end: at(8) }));
  });

  it('D3: a period off the hour is still refused', async () => {
    const service = await desk();
    assert.throws(() => service.quote({ itemId: 'B1', start: at(1, 10, 30), end: at(1, 12) }));
  });

  it('D4: an hourly booking inside a booked day is refused', async () => {
    const service = await desk();
    service.book({ itemId: 'B1', start: at(10), end: at(11) });
    assert.throws(() => service.book({ itemId: 'B1', start: at(10, 10), end: at(10, 12) }));
  });

  it('D4: a day booking over a booked hour is refused', async () => {
    const service = await desk();
    service.book({ itemId: 'S1', start: at(12, 9), end: at(12, 11) });
    assert.throws(() => service.book({ itemId: 'S1', start: at(12), end: at(13) }));
  });

  it('D4: overlapping hourly bookings of an item are refused, back-to-back ones are not', async () => {
    const service = await desk();
    service.book({ itemId: 'B1', start: at(14, 10), end: at(14, 12) });
    assert.throws(() => service.book({ itemId: 'B1', start: at(14, 11), end: at(14, 13) }));
    service.book({ itemId: 'B1', start: at(14, 12), end: at(14, 14) });
  });

  it('D4: availability leaves out an item booked for some hours of the period', async () => {
    const service = await desk();
    service.book({ itemId: 'S1', start: at(16, 9), end: at(16, 11) });
    assert.deepEqual(service.availability({ start: at(16), end: at(17), kind: 'sail' }), []);
  });

  it('refuses to rent by the hour an item with no hourly price', async () => {
    const service = await desk();
    assert.throws(() => service.quote({ itemId: 'B2', start: at(1, 9), end: at(1, 12) }));
  });
});
