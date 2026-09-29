// S3's hidden tests for the discount of step 3, scored from step 3 on (S3.md §7): 10% off rentals of 3
// days or more. The prices divide exactly. The code under test is imported inside each test.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const pad = (n: number) => String(n).padStart(2, '0');
/** June `day`, 2027, at `hour`:`minute`, in UTC. */
const at = (day: number, hour = 0, minute = 0) => `2027-06-${pad(day)}T${pad(hour)}:${pad(minute)}:00Z`;

async function desk() {
  const { createRentalService } = await import('../../seed/src/index.js');
  const service = createRentalService();
  service.addEquipment({ id: 'B1', kind: 'board', dailyPrice: 2500 });
  service.addEquipment({ id: 'B2', kind: 'board', dailyPrice: 3100 });
  service.addEquipment({ id: 'S1', kind: 'sail', dailyPrice: 1800 });
  return service;
}

describe('discount', () => {
  it('D1: takes 10% off a rental of 3 days, in integer cents', async () => {
    const total = (await desk()).quote({ itemId: 'B1', start: at(1), end: at(4) }).total;
    assert.equal(total, 6750);
    assert.ok(Number.isInteger(total));
  });

  it('takes 10% off a longer rental too', async () => {
    assert.equal((await desk()).quote({ itemId: 'S1', start: at(10), end: at(15) }).total, 8100);
  });

  it('leaves a rental of 2 days at its full price', async () => {
    assert.equal((await desk()).quote({ itemId: 'B1', start: at(1), end: at(3) }).total, 5000);
  });

  it('books a long rental at its reduced total', async () => {
    assert.equal((await desk()).book({ itemId: 'B2', start: at(20), end: at(24) }).total, 11160);
  });
});
