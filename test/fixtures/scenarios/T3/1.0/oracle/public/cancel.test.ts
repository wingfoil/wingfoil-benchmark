import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Hidden tests run under node:test with tsx (REQ-SCO-02), and import the code under test inside the
// test (adr-004): a snapshot without it fails this test, never the whole file.
describe('cancelling an order', () => {
  it('marks a pending order as cancelled', async () => {
    const { cancel } = await import('../../seed/src/orders.js');
    assert.equal(cancel({ id: 'o-1', status: 'pending' }).status, 'cancelled');
  });
});
