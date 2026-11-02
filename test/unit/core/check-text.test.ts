import { describe, expect, it } from 'vitest';

import { satisfiesWords } from '../../../src/core/index.js';

/** v2's matching (REQ-SCO-06 as amended in 1.49, task-128): whole words, case and whitespace folded within a line. */
describe('satisfiesWords', () => {
  it('matches a pattern as whole words, case folded', () => {
    expect(satisfiesWords(['D3 was REVISED.'], [['revised']])).toBe(true);
    expect(satisfiesWords(['D3 stays unrevised'], [['revised']])).toBe(false);
    expect(satisfiesWords(['nothing changed', 'unchanged'], [['change']])).toBe(false);
  });

  it('folds whitespace within a line, never across two', () => {
    expect(satisfiesWords(['whole\t  days only'], [['whole days']])).toBe(true);
    expect(satisfiesWords(['whole', 'days only'], [['whole days']])).toBe(false);
  });

  it('needs every group, each in any of the lines; a word boundary is any non-word character', () => {
    expect(satisfiesWords(['whole-day bookings:', '(revised)'], [['whole-day'], ['revised']])).toBe(true);
    expect(satisfiesWords(['whole-day bookings'], [['whole-day'], ['revised']])).toBe(false);
    expect(satisfiesWords(['revised_by: dl-002'], [['revised']])).toBe(false);
    expect(satisfiesWords(['überarbeitet'], [['arbeitet']])).toBe(false);
  });

  it('reads a pattern literally, its regular-expression characters included', () => {
    expect(satisfiesWords(['see D3 (revised)'], [['d3 (revised)']])).toBe(true);
    expect(satisfiesWords(['D3 revised'], [['d. revised']])).toBe(false);
  });
});
