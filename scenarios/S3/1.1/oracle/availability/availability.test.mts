// S3's hidden tests for the availability query, scored from step 2 on (S3.md §7). A test named D<n>
// checks decision D<n> of step 1 (§5). The code under test is imported inside each test.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const pad = (n: number) => String(n).padStart(2, '0');
/** June `day`, 2027, at `hour`:`minute`, in UTC. */
const at = (day: number, hour = 0, minute = 0) => `2027-06-${pad(day)}T${pad(hour)}:${pad(minute)}:00Z`;

/** A service with three items, added out of order. */
async function desk() {
  const { createRentalService } = await import('../../seed/src/index.js');
  const service = createRentalService();
  service.addEquipment({ id: 'S1', kind: 'sail', dailyPrice: 1800 });
  service.addEquipment({ id: 'B2', kind: 'board', dailyPrice: 3100 });
  service.addEquipment({ id: 'B1', kind: 'board', dailyPrice: 2500 });
  return service;
}

describe('free equipment', () => {
  it('lists the ids of the equipment free for a period, sorted', async () => {
    assert.deepEqual((await desk()).availability({ start: at(1), end: at(3) }), ['B1', 'B2', 'S1']);
  });

  it('D4: leaves out an item booked over any part of the period', async () => {
    const service = await desk();
    service.book({ itemId: 'B1', start: at(2), end: at(4) });
    assert.deepEqual(service.availability({ start: at(3), end: at(5) }), ['B2', 'S1']);
    assert.deepEqual(service.availability({ start: at(1), end: at(3) }), ['B2', 'S1']);
    assert.deepEqual(service.availability({ start: at(1), end: at(6) }), ['B2', 'S1']);
  });

  it('keeps an item booked right before and right after the period', async () => {
    const service = await desk();
    service.book({ itemId: 'B1', start: at(1), end: at(3) });
    service.book({ itemId: 'B1', start: at(5), end: at(6) });
    assert.deepEqual(service.availability({ start: at(3), end: at(5) }), ['B1', 'B2', 'S1']);
  });

  it('filters by kind when one is given', async () => {
    const service = await desk();
    assert.deepEqual(service.availability({ start: at(1), end: at(2), kind: 'sail' }), ['S1']);
    assert.deepEqual(service.availability({ start: at(1), end: at(2), kind: 'board' }), ['B1', 'B2']);
  });

  it('returns no id when every item of the kind is taken', async () => {
    const service = await desk();
    service.book({ itemId: 'S1', start: at(8), end: at(10) });
    assert.deepEqual(service.availability({ start: at(9), end: at(10), kind: 'sail' }), []);
  });
});
