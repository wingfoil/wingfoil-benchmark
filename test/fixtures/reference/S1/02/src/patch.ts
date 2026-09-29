/** JSON Patch (RFC 6902): the six operations, applied to a copy of the document. */
import { arrayIndex, parsePointer, resolvePointer, resolveTokens } from './pointer.js';

interface Operation {
  readonly op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  readonly path: string;
  readonly value?: unknown;
  readonly from?: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** JSON equality: objects by their members whatever their order, arrays in order. */
function equal(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => equal(item, b[i]))
    );
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && equal(a[key], b[key]))
    );
  }
  return a === b;
}

/** The container of the last token of `path`, and that token. */
function parentOf(document: unknown, path: string): { parent: unknown; key: string } | undefined {
  const tokens = parsePointer(path);
  const key = tokens.pop();
  return key === undefined ? undefined : { parent: resolveTokens(document, tokens), key };
}

function add(document: unknown, path: string, value: unknown): unknown {
  const target = parentOf(document, path);
  if (target === undefined) return value;
  const { parent, key } = target;
  if (Array.isArray(parent)) parent.splice(arrayIndex(key, parent.length, true), 0, value);
  else if (isObject(parent)) parent[key] = value;
  else throw new Error(`cannot add to ${path}`);
  return document;
}

function remove(document: unknown, path: string): unknown {
  const target = parentOf(document, path);
  if (target === undefined) throw new Error('cannot remove the whole document');
  const { parent, key } = target;
  if (Array.isArray(parent)) parent.splice(arrayIndex(key, parent.length, false), 1);
  else if (isObject(parent) && Object.hasOwn(parent, key)) Reflect.deleteProperty(parent, key);
  else throw new Error(`no value to remove at ${path}`);
  return document;
}

function apply(document: unknown, operation: Operation): unknown {
  const { op, path } = operation;
  switch (op) {
    case 'add':
      return add(document, path, structuredClone(operation.value));
    case 'remove':
      return remove(document, path);
    case 'replace':
      resolvePointer(document, path);
      return parsePointer(path).length === 0
        ? structuredClone(operation.value)
        : add(remove(document, path), path, structuredClone(operation.value));
    case 'move': {
      const from = operation.from as string;
      const value = resolvePointer(document, from);
      return from === path ? document : add(remove(document, from), path, value);
    }
    case 'copy':
      return add(document, path, structuredClone(resolvePointer(document, operation.from as string)));
    case 'test':
      if (!equal(resolvePointer(document, path), operation.value)) throw new Error(`test failed at ${path}`);
      return document;
  }
}

/**
 * `document` with `patch` applied, as a new value: the input is never changed. Throws when the patch
 * is not an array, or when an operation fails.
 */
export function applyPatch(document: unknown, patch: unknown): unknown {
  if (!Array.isArray(patch)) throw new Error('a JSON Patch must be an array of operations');
  return (patch as Operation[]).reduce<unknown>(apply, structuredClone(document));
}
