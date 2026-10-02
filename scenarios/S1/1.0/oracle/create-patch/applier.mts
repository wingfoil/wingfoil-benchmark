// The suite's own JSON Patch applier (RFC 6902), so that step 5 scores createPatch alone, never the
// agent's applyPatch (task-050). Strict: an unknown op, a bad pointer, a missing target or a failed
// test throws. It works on a copy and returns the result.

type Json = unknown;

function unescape(token: string): string {
  if (/~[^01]|~$/.test(token)) throw new Error('bad escape');
  return token.replaceAll('~1', '/').replaceAll('~0', '~');
}

function tokens(path: unknown): string[] {
  if (typeof path !== 'string') throw new Error('bad path');
  if (path === '') return [];
  if (!path.startsWith('/')) throw new Error('bad path');
  return path.slice(1).split('/').map(unescape);
}

function isObject(value: Json): value is Record<string, Json> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function same(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && same(a[k], b[k]));
  }
  return false;
}

function index(array: Json[], token: string, allowEnd: boolean): number {
  if (allowEnd && token === '-') return array.length;
  if (!/^(0|[1-9][0-9]*)$/.test(token)) throw new Error('bad index');
  const i = Number(token);
  if (i > array.length || (!allowEnd && i === array.length)) throw new Error('out of range');
  return i;
}

function parent(doc: Json, path: string[]): Json {
  let node = doc;
  for (const token of path.slice(0, -1)) {
    if (Array.isArray(node)) node = node[index(node, token, false)];
    else if (isObject(node) && Object.hasOwn(node, token)) node = node[token];
    else throw new Error('no target');
  }
  return node;
}

function get(doc: Json, path: string[]): Json {
  if (path.length === 0) return doc;
  const node = parent(doc, path);
  const last = path[path.length - 1]!;
  if (Array.isArray(node)) return node[index(node, last, false)];
  if (isObject(node) && Object.hasOwn(node, last)) return node[last];
  throw new Error('no target');
}

function add(doc: Json, path: string[], value: Json): Json {
  if (path.length === 0) return value;
  const node = parent(doc, path);
  const last = path[path.length - 1]!;
  if (Array.isArray(node)) node.splice(index(node, last, true), 0, value);
  else if (isObject(node)) node[last] = value;
  else throw new Error('no target');
  return doc;
}

function remove(doc: Json, path: string[]): Json {
  if (path.length === 0) throw new Error('root removed');
  const node = parent(doc, path);
  const last = path[path.length - 1]!;
  if (Array.isArray(node)) node.splice(index(node, last, false), 1);
  else if (isObject(node) && Object.hasOwn(node, last)) delete node[last];
  else throw new Error('no target');
  return doc;
}

/** `doc` with `patch` applied, as a new value; throws on anything RFC 6902 calls an error. */
export function apply(doc: Json, patch: Json): Json {
  if (!Array.isArray(patch)) throw new Error('not an array');
  let result = structuredClone(doc);
  for (const operation of patch) {
    if (!isObject(operation)) throw new Error('bad op');
    const path = tokens(operation.path);
    switch (operation.op) {
      case 'add':
        if (!('value' in operation)) throw new Error('no value');
        result = add(result, path, structuredClone(operation.value));
        break;
      case 'remove':
        result = remove(result, path);
        break;
      case 'replace':
        if (!('value' in operation)) throw new Error('no value');
        get(result, path);
        result = path.length === 0 ? structuredClone(operation.value) : add(remove(result, path), path, structuredClone(operation.value));
        break;
      case 'move': {
        const from = tokens(operation.from);
        if (path.length > from.length && from.every((t, i) => path[i] === t)) throw new Error('into itself');
        const value = get(result, from);
        result = add(remove(result, from), path, value);
        break;
      }
      case 'copy':
        result = add(result, path, structuredClone(get(result, tokens(operation.from))));
        break;
      case 'test':
        if (!('value' in operation) || !same(get(result, path), operation.value)) throw new Error('test failed');
        break;
      default:
        throw new Error('bad op');
    }
  }
  return result;
}
