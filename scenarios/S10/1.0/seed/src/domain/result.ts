/** Why an operation on the order book failed: a code for programs, a message for people. */
export interface ShopError {
  readonly code: ShopErrorCode;
  readonly message: string;
}

/** The kinds of failure the order book reports. */
export type ShopErrorCode = 'not-found' | 'duplicate' | 'invalid';

/** The outcome of an operation that can fail: its value, or the reason it failed. */
export type Result<T, E = ShopError> =
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
 * @param message - what went wrong, for the person using the shop
 */
export function err(code: ShopErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}
