import { describe, expect, it } from 'vitest';

import { canonicalJson } from '../../../src/core/index.js';

describe('canonicalJson', () => {
  it('sorts object keys at every level and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 1], c: null } })).toBe('{"a":{"c":null,"d":[3,1]},"b":1}');
  });

  it('sorts keys by code point, not by locale', () => {
    expect(canonicalJson({ b: 1, B: 2, a: 3, é: 4 })).toBe('{"B":2,"a":3,"b":1,"é":4}');
  });

  it('serializes strings, numbers and booleans as JSON does', () => {
    expect(canonicalJson(['x"y', 1.5, true, false])).toBe('["x\\"y",1.5,true,false]');
  });
});
