/**
 * The rental desk of the school: equipment, quotes and bookings, kept in memory.
 * The school's rules are in DECISIONS.md.
 */

export type Kind = 'board' | 'sail';

const KINDS: readonly Kind[] = ['board', 'sail'];
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** An ISO-8601 time in UTC: a date, a time to the minute at least, and `Z`. */
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

export interface Equipment {
  readonly id: string;
  readonly kind: Kind;
  /** Euro cents for one day. */
  readonly dailyPrice: number;
  /** Euro cents for one hour; without it the item is rented by the day only. */
  readonly hourlyPrice?: number;
}

export interface RentalRequest {
  readonly itemId: string;
  readonly start: string;
  readonly end: string;
}

export interface Quote {
  readonly itemId: string;
  readonly start: string;
  readonly end: string;
  /** Euro cents. */
  readonly total: number;
}

export interface Booking extends Quote {
  readonly id: string;
}

export interface AvailabilityQuery {
  readonly start: string;
  readonly end: string;
  readonly kind?: Kind;
}

export interface Cancellation {
  readonly bookingId: string;
  /** Euro cents given back. */
  readonly refund: number;
}

interface Period {
  readonly from: number;
  readonly to: number;
}

interface Held extends Period {
  readonly booking: Booking;
  cancelled: boolean;
}

function instant(text: unknown, name: string): number {
  if (typeof text !== 'string' || !UTC.test(text)) throw new Error(`${name} must be an ISO-8601 time in UTC`);
  const time = Date.parse(text);
  if (Number.isNaN(time)) throw new Error(`${name} is not a valid time`);
  return time;
}

function cents(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number of cents`);
  }
  return value;
}

function iso(time: number): string {
  return new Date(time).toISOString();
}

function overlaps(a: Period, b: Period): boolean {
  return a.from < b.to && b.from < a.to;
}

export function createRentalService() {
  const items = new Map<string, Equipment>();
  const held: Held[] = [];
  let bookings = 0;

  function periodOf(start: unknown, end: unknown): Period {
    const from = instant(start, 'start');
    const to = instant(end, 'end');
    if (to <= from) throw new Error('a period must end after it starts');
    return { from, to };
  }

  function wholeDays(period: Period): boolean {
    return period.from % DAY === 0 && period.to % DAY === 0;
  }

  function wholeHours(period: Period): boolean {
    return period.from % HOUR === 0 && period.to % HOUR === 0;
  }

  function priceOf(item: Equipment, period: Period): number {
    if (wholeDays(period)) {
      const days = (period.to - period.from) / DAY;
      const full = days * item.dailyPrice;
      // Rentals of 3 days or more cost 10% less.
      if (days >= 3) return Math.round(full * 0.9);
      return full;
    }
    // A rental shorter than a day, on whole hours, is priced by the hour.
    if (wholeHours(period) && period.to - period.from < DAY) {
      if (item.hourlyPrice === undefined) throw new Error(`${item.id} cannot be rented by the hour`);
      return ((period.to - period.from) / HOUR) * item.hourlyPrice;
    }
    throw new Error('a rental covers whole days, or whole hours within less than a day');
  }

  function isFree(itemId: string, period: Period): boolean {
    return !held.some(
      (entry) => !entry.cancelled && entry.booking.itemId === itemId && overlaps(entry, period),
    );
  }

  function quoteFor(request: RentalRequest): { quote: Quote; period: Period } {
    const item = items.get(request.itemId);
    if (item === undefined) throw new Error(`unknown item ${String(request.itemId)}`);
    const period = periodOf(request.start, request.end);
    const total = priceOf(item, period);
    return { quote: { itemId: item.id, start: iso(period.from), end: iso(period.to), total }, period };
  }

  return {
    addEquipment(item: Equipment): void {
      if (typeof item.id !== 'string' || item.id === '') throw new Error('an item needs an id');
      if (items.has(item.id)) throw new Error(`item ${item.id} already exists`);
      if (!KINDS.includes(item.kind)) throw new Error(`unknown kind ${String(item.kind)}`);
      cents(item.dailyPrice, 'dailyPrice');
      if (item.hourlyPrice !== undefined) cents(item.hourlyPrice, 'hourlyPrice');
      items.set(item.id, { ...item });
    },

    quote(request: RentalRequest): Quote {
      return quoteFor(request).quote;
    },

    book(request: RentalRequest): Booking {
      const { quote, period } = quoteFor(request);
      if (!isFree(quote.itemId, period)) throw new Error(`${quote.itemId} is already booked in that period`);
      bookings += 1;
      const booking = { id: `B${bookings}`, ...quote };
      held.push({ ...period, booking, cancelled: false });
      return booking;
    },

    availability(query: AvailabilityQuery): string[] {
      const period = periodOf(query.start, query.end);
      if (query.kind !== undefined && !KINDS.includes(query.kind))
        throw new Error(`unknown kind ${String(query.kind)}`);
      return [...items.values()]
        .filter((item) => query.kind === undefined || item.kind === query.kind)
        .filter((item) => isFree(item.id, period))
        .map((item) => item.id)
        .sort();
    },

    cancel(bookingId: string, at: string): Cancellation {
      const entry = held.find((candidate) => candidate.booking.id === bookingId);
      if (entry === undefined) throw new Error(`unknown booking ${String(bookingId)}`);
      if (entry.cancelled) throw new Error(`booking ${bookingId} is already cancelled`);
      const when = instant(at, 'at');
      entry.cancelled = true;
      // D5, stated in step 1: less than 24 hours before the start, no refund; otherwise all of it.
      const refund = entry.from - when < DAY ? 0 : entry.booking.total;
      return { bookingId, refund };
    },
  };
}

export type RentalService = ReturnType<typeof createRentalService>;
