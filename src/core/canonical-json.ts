/**
 * `value` as JSON with the keys of every object sorted (by UTF-16 code unit, JavaScript's default
 * order), arrays in their order and no whitespace (REQ-FMT-02). Equal data gives equal text, whatever
 * the key order or formatting of the file it was parsed from.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}
