/** A JSON Patch (RFC 6902) from one document to another: only what changed, never the whole again. */

type Operation =
  | { readonly op: 'add' | 'replace'; readonly path: string; readonly value: unknown }
  | { readonly op: 'remove'; readonly path: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, i) => equal(item, b[i]));
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && equal(a[key], b[key]))
    );
  }
  return false;
}

/** One reference token, escaped as RFC 6901 says. */
function token(key: string | number): string {
  return String(key).replaceAll('~', '~0').replaceAll('/', '~1');
}

/** The operations that turn the array `from` into `to` at `path`: an LCS of equal items, the rest edited in place. */
function diffArray(from: readonly unknown[], to: readonly unknown[], path: string, ops: Operation[]): void {
  const n = from.length;
  const m = to.length;
  // lcs[i * (m + 1) + j]: the longest common run of equal items in from[i..] and to[j..].
  const lcs = new Array<number>((n + 1) * (m + 1)).fill(0);
  const at2 = (i: number, j: number): number => lcs[i * (m + 1) + j] ?? 0;
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i * (m + 1) + j] = equal(from[i], to[j])
        ? at2(i + 1, j + 1) + 1
        : Math.max(at2(i + 1, j), at2(i, j + 1));
  let i = 0;
  let j = 0;
  let at = 0;
  while (i < n || j < m) {
    if (i < n && j < m && equal(from[i], to[j])) {
      i++;
      j++;
      at++;
    } else if (i < n && j < m && at2(i + 1, j + 1) === at2(i, j)) {
      diff(from[i], to[j], `${path}/${at}`, ops);
      i++;
      j++;
      at++;
    } else if (j < m && (i === n || at2(i, j + 1) >= at2(i + 1, j))) {
      ops.push({ op: 'add', path: `${path}/${at}`, value: structuredClone(to[j]) });
      j++;
      at++;
    } else {
      ops.push({ op: 'remove', path: `${path}/${at}` });
      i++;
    }
  }
}

function diff(from: unknown, to: unknown, path: string, ops: Operation[]): void {
  if (equal(from, to)) return;
  if (isObject(from) && isObject(to)) {
    for (const key of Object.keys(from))
      if (!Object.hasOwn(to, key)) ops.push({ op: 'remove', path: `${path}/${token(key)}` });
    for (const [key, value] of Object.entries(to)) {
      if (Object.hasOwn(from, key)) diff(from[key], value, `${path}/${token(key)}`, ops);
      else ops.push({ op: 'add', path: `${path}/${token(key)}`, value: structuredClone(value) });
    }
    return;
  }
  if (Array.isArray(from) && Array.isArray(to)) {
    diffArray(from, to, path, ops);
    return;
  }
  ops.push({ op: 'replace', path, value: structuredClone(to) });
}

/** A patch that turns `from` into `to`; neither is changed. */
export function createPatch(from: unknown, to: unknown): Operation[] {
  const ops: Operation[] = [];
  diff(from, to, '', ops);
  return ops;
}
