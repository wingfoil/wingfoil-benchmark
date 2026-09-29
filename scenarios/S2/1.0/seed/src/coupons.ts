/**
 * Coupons. A coupon takes a percentage or a fixed amount off an order; it is valid from its first day
 * to its last day, both included, and may require a minimum amount. A single-use coupon can be used by
 * one order only: placing the order uses it, and cancelling the order gives it back.
 */
import { CouponError, ValidationError } from './errors.ts';
import { checkDate, compareDates } from './dates.ts';
import { isCents } from './money.ts';
import type { Cents } from './money.ts';

export type CouponKind = 'percent' | 'fixed';

export interface Coupon {
  readonly code: string;
  readonly kind: CouponKind;
  /** A percentage for `percent`, cents for `fixed`. */
  readonly value: number;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly minimumCents: Cents;
  readonly singleUse: boolean;
}

export interface NewCoupon {
  readonly code: string;
  readonly kind: CouponKind;
  readonly value: number;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly minimumCents?: Cents;
  readonly singleUse?: boolean;
}

/** A coupon code in its canonical form: codes are case-insensitive. */
export function canonicalCode(code: string): string {
  return code.trim().toUpperCase();
}

export class Coupons {
  readonly #coupons = new Map<string, Coupon>();
  /** Single-use codes, by the order that used them. */
  readonly #usedBy = new Map<string, string>();

  add(coupon: NewCoupon): Coupon {
    const code = canonicalCode(coupon.code);
    if (code === '') throw new ValidationError('a coupon needs a code');
    if (this.#coupons.has(code)) throw new ValidationError(`coupon ${code} exists already`);
    if (coupon.kind === 'percent' && !(Number.isInteger(coupon.value) && coupon.value > 0 && coupon.value <= 100)) {
      throw new ValidationError('a percentage coupon takes 1 to 100 percent off');
    }
    if (coupon.kind === 'fixed' && !(isCents(coupon.value) && coupon.value > 0)) {
      throw new ValidationError('a fixed coupon takes a positive amount of cents off');
    }
    checkDate(coupon.validFrom, 'validFrom');
    checkDate(coupon.validUntil, 'validUntil');
    if (compareDates(coupon.validFrom, coupon.validUntil) > 0) {
      throw new ValidationError(`coupon ${code} ends before it starts`);
    }
    const added: Coupon = {
      code,
      kind: coupon.kind,
      value: coupon.value,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      minimumCents: coupon.minimumCents ?? 0,
      singleUse: coupon.singleUse ?? false,
    };
    this.#coupons.set(code, added);
    return added;
  }

  /** The coupon `code` if it can be used on `date` for an order of `amount`; a CouponError otherwise. */
  redeemable(code: string, date: string, amount: Cents): Coupon {
    const coupon = this.#coupons.get(canonicalCode(code));
    if (coupon === undefined) throw new CouponError(code, 'unknown code');
    if (compareDates(date, coupon.validFrom) < 0) throw new CouponError(coupon.code, 'not valid yet');
    if (compareDates(date, coupon.validUntil) >= 0) throw new CouponError(coupon.code, 'expired');
    if (amount < coupon.minimumCents) throw new CouponError(coupon.code, 'order below the minimum amount');
    if (coupon.singleUse && this.#usedBy.has(coupon.code)) throw new CouponError(coupon.code, 'already used');
    return coupon;
  }

  /** Records that `order` used `code`; only single-use coupons are tracked. */
  use(code: string, order: string): void {
    const coupon = this.#coupons.get(canonicalCode(code));
    if (coupon?.singleUse === true) this.#usedBy.set(coupon.code, order);
  }

  /** Gives a single-use coupon back, when `order` was the one that used it. */
  giveBack(code: string, order: string): void {
    const canonical = canonicalCode(code);
    if (this.#usedBy.get(canonical) === order) this.#usedBy.delete(canonical);
  }

  /** Whether a single-use coupon has been used, and by which order. */
  usedBy(code: string): string | undefined {
    return this.#usedBy.get(canonicalCode(code));
  }
}
