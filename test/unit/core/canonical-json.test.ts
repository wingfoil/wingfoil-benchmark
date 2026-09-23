import { describe, expect, it } from 'vitest';

import { canonicalJson } from '../../../src/core/index.js';

describe('canonicalJson', () => {
  it('sorts object keys at every level and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 1], c: null } })).toBe('{"a":{"c":null,"d":[3,1]},"b":1}');
  });

  it('sorts keys by UTF-16 code unit, not by locale or code point (RFC 8785)', () => {
    expect(canonicalJson({ b: 1, B: 2, a: 3, é: 4 })).toBe('{"B":2,"a":3,"b":1,"é":4}');
    // U+1F600 is a surrogate pair, so it sorts before U+FFFF by code unit and after it by code point.
    expect(canonicalJson({ '\uFFFF': 1, '\u{1F600}': 2 })).toBe('{"\u{1F600}":2,"\uFFFF":1}');
  });

  it('serializes strings, numbers and booleans as JSON does', () => {
    expect(canonicalJson(['x"y', 1.5, true, false])).toBe('["x\\"y",1.5,true,false]');
  });
});
