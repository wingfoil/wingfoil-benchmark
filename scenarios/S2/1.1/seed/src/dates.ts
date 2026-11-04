/**
 * Dates are calendar days, written as ISO strings (`2026-03-14`) and read in UTC, so that a day is the
 * same day wherever the service runs. ISO dates of the same length compare as strings.
 */
import { ValidationError } from './errors.ts';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether `text` is a real calendar day written `YYYY-MM-DD`. */
export function isIsoDate(text: string): boolean {
  const match = ISO_DATE.exec(text);
  if (match === null) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

/** `text`, or a ValidationError naming `field` when it is not a calendar day. */
export function checkDate(text: string, field: string): string {
  if (!isIsoDate(text)) throw new ValidationError(`${field} must be a date written YYYY-MM-DD, got ${text}`);
  return text;
}

function toTime(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** The day `days` after `date` (before it, when negative). */
export function addDays(date: string, days: number): string {
  return new Date(toTime(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** How many days from `from` to `to`: 0 on the same day, negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS);
}

/** Negative, zero or positive as `a` is before, on or after `b`. */
export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
