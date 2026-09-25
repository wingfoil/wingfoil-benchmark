import { describe, expect, it } from 'vitest';

import { cancel } from '../../seed/src/orders.js';

describe('cancelling an order', () => {
  it('marks a pending order as cancelled', () => {
    expect(cancel({ id: 'o-1', status: 'pending' }).status).toBe('cancelled');
  });
});
