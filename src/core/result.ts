/** One reason why an input was rejected: where (a field path or a file) and why. */
export interface Issue {
  readonly path: string;
  readonly message: string;
}

/** The outcome of an operation whose failures are expected, such as validating a file. */
export type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly Issue[] };

/** A successful result carrying `value`. */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

/** A failed result carrying the `issues` that explain why. */
export function fail<T>(issues: readonly Issue[]): Result<T> {
  return { ok: false, issues };
}

/** Render a field path as `steps[1].prompt_file`. */
export function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((key, index) => (typeof key === 'number' ? `[${key}]` : `${index === 0 ? '' : '.'}${String(key)}`))
    .join('');
}
