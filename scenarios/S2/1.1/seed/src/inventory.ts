/**
 * Stock levels. Units are reserved when an order is placed, so the available stock of a SKU is what is
 * on hand minus what placed orders hold; shipping an order takes its units off hand, and cancelling it
 * returns them. Every change is kept as a movement, for the stock report.
 */
import { OutOfStockError, ValidationError } from './errors.ts';

export type MovementKind = 'restock' | 'reserve' | 'release' | 'ship' | 'adjust';

export interface Movement {
  readonly sku: string;
  readonly kind: MovementKind;
  readonly quantity: number;
  readonly reference: string;
}

/** A SKU falls below this many available units: it shows in the low-stock report. */
export const LOW_STOCK_THRESHOLD = 5;

function checkQuantity(quantity: number): number {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new ValidationError(`a quantity must be a whole number above zero, got ${quantity}`);
  }
  return quantity;
}

export class Inventory {
  readonly #onHand = new Map<string, number>();
  readonly #reserved = new Map<string, number>();
  readonly #movements: Movement[] = [];

  #record(sku: string, kind: MovementKind, quantity: number, reference: string): void {
    this.#movements.push({ sku, kind, quantity, reference });
  }

  /** Units physically in the warehouse. */
  onHand(sku: string): number {
    return this.#onHand.get(sku) ?? 0;
  }

  /** Units held by placed orders not yet shipped. */
  reserved(sku: string): number {
    return this.#reserved.get(sku) ?? 0;
  }

  /** Units that can still be ordered. */
  available(sku: string): number {
    return this.onHand(sku) - this.reserved(sku);
  }

  restock(sku: string, quantity: number, reference = 'restock'): void {
    this.#onHand.set(sku, this.onHand(sku) + checkQuantity(quantity));
    this.#record(sku, 'restock', quantity, reference);
  }

  /** Reserves `quantity` units for `reference`, or throws OutOfStockError and reserves nothing. */
  reserve(sku: string, quantity: number, reference: string): void {
    checkQuantity(quantity);
    const available = this.available(sku);
    if (quantity > available) throw new OutOfStockError(sku, quantity, available);
    this.#reserved.set(sku, this.reserved(sku) + quantity);
    this.#record(sku, 'reserve', quantity, reference);
  }

  /** Returns units reserved for `reference` to the available stock. */
  release(sku: string, quantity: number, reference: string): void {
    checkQuantity(quantity);
    if (quantity > this.reserved(sku)) throw new ValidationError(`cannot release more of ${sku} than is reserved`);
    this.#reserved.set(sku, this.reserved(sku) - quantity);
    this.#record(sku, 'release', quantity, reference);
  }

  /** Takes reserved units off hand, as they leave the warehouse. */
  ship(sku: string, quantity: number, reference: string): void {
    checkQuantity(quantity);
    if (quantity > this.reserved(sku)) throw new ValidationError(`cannot ship more of ${sku} than is reserved`);
    this.#reserved.set(sku, this.reserved(sku) - quantity);
    this.#onHand.set(sku, this.onHand(sku) - quantity);
    this.#record(sku, 'ship', quantity, reference);
  }

  /** Corrects the units on hand after a count; never below what is reserved. */
  adjust(sku: string, onHand: number, reference = 'stock count'): void {
    if (!Number.isSafeInteger(onHand) || onHand < this.reserved(sku)) {
      throw new ValidationError(`${sku} cannot hold fewer units than are reserved`);
    }
    this.#record(sku, 'adjust', onHand - this.onHand(sku), reference);
    this.#onHand.set(sku, onHand);
  }

  /** SKUs whose available stock is below LOW_STOCK_THRESHOLD, with it. */
  lowStock(skus: readonly string[]): { sku: string; available: number }[] {
    return skus
      .map((sku) => ({ sku, available: this.available(sku) }))
      .filter(({ available }) => available < LOW_STOCK_THRESHOLD);
  }

  /** Every movement of `sku`, oldest first. */
  movements(sku: string): Movement[] {
    return this.#movements.filter((movement) => movement.sku === sku);
  }
}
