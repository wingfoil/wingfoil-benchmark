import { describe, expect, it } from 'vitest';

import { approximateTokens, TOKEN_METHOD } from '../../../src/core/index.js';

describe('the token approximation (REQ-RUN-12)', () => {
  it('is the UTF-8 byte count divided by four, rounded up', () => {
    expect(approximateTokens('')).toBe(0);
    expect(approximateTokens('abcd')).toBe(1);
    expect(approximateTokens('abcde')).toBe(2);
  });

  it('counts bytes, not characters, so a text in any language is measured the same way', () => {
    expect(approximateTokens('è')).toBe(1); // 2 bytes
    expect(approximateTokens('€€€€')).toBe(3); // 12 bytes
    expect(approximateTokens('😀')).toBe(1); // 4 bytes
  });

  it("names itself, so that a recorded number is never read as the model's own count", () => {
    expect(TOKEN_METHOD).toEqual({ name: 'bytes-div-4', version: 1 });
  });
});
