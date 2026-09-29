/** JSON Pointer (RFC 6901): a pointer's reference tokens, and the value it refers to. */

/** The reference tokens of `pointer`, unescaped: `~1` to `/`, then `~0` to `~`. */
export function parsePointer(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new Error(`invalid JSON Pointer: ${JSON.stringify(pointer)}`);
  return pointer
    .slice(1)
    .split('/')
    .map((token) => {
      if (/~(?![01])/.test(token))
        throw new Error(`invalid escape in JSON Pointer: ${JSON.stringify(pointer)}`);
      return token.replaceAll('~1', '/').replaceAll('~0', '~');
    });
}

/** An array index token: digits without a leading zero, below `length` — or equal to it, or `-`, when `end` is allowed. */
export function arrayIndex(token: string, length: number, end: boolean): number {
  if (end && token === '-') return length;
  if (!/^(0|[1-9][0-9]*)$/.test(token)) throw new Error(`invalid array index: ${JSON.stringify(token)}`);
  const index = Number(token);
  if (index > (end ? length : length - 1)) throw new Error(`array index out of range: ${token}`);
  return index;
}

/** The value `tokens` lead to in `document`. */
export function resolveTokens(document: unknown, tokens: readonly string[]): unknown {
  let current = document;
  for (const token of tokens) {
    if (Array.isArray(current)) current = current[arrayIndex(token, current.length, false)];
    else if (current !== null && typeof current === 'object' && Object.hasOwn(current, token)) {
      current = (current as Record<string, unknown>)[token];
    } else throw new Error(`no value at ${JSON.stringify(token)}`);
  }
  return current;
}

/** The value `pointer` refers to in `document`; throws when the pointer is invalid or does not resolve. */
export function resolvePointer(document: unknown, pointer: string): unknown {
  return resolveTokens(document, parsePointer(pointer));
}
