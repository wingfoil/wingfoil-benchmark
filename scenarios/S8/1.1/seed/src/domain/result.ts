/** Why an operation on the task list failed: a code for programs, a message for people. */
export interface TodoError {
  readonly code: TodoErrorCode;
  readonly message: string;
}

/** The kinds of failure the task list reports. */
export type TodoErrorCode = 'not-found' | 'duplicate' | 'invalid-state';

/** The outcome of an operation that can fail: its value, or the reason it failed. */
export type Result<T, E = TodoError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * A successful result.
 *
 * @param value - what the operation produced
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * A failed result.
 *
 * @param code - the kind of failure
 * @param message - what went wrong, for the person using the app
 */
export function err(code: TodoErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}

/**
 * The value of `result`, or `fallback` when it failed.
 *
 * @param result - the outcome to read
 * @param fallback - what to use instead of a failure
 */
export function valueOr<T>(result: Result<T>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
