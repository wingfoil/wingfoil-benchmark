/** JSON Merge Patch (RFC 7386). */

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** `target` merged with `patch`, as a new value: `null` removes a member, an object merges, anything else replaces. */
export function applyMergePatch(target: unknown, patch: unknown): unknown {
  if (!isObject(patch)) return structuredClone(patch);
  const result: Record<string, unknown> = isObject(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) Reflect.deleteProperty(result, key);
    else result[key] = applyMergePatch(result[key], value);
  }
  return result;
}
