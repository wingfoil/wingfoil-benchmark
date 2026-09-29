# Decisions

The school's rules for the rental module, as the product owner stated them.

- **D1 — Money** is an integer number of euro cents.
- **D2 — Times** are in UTC, as ISO-8601 strings.
- **D3 — Bookings cover whole days only:** a period starts and ends at midnight UTC.
  **Revised in the hourly-rentals change:** a rental shorter than a day, starting and ending on the
  hour, is now also accepted and priced by the hour. Whole-day rentals are unchanged.
- **D4 — No double booking:** the same item cannot be booked twice for overlapping periods, whether
  booked by the day or by the hour.
- **D5 — Cancellation policy:** a booking cancelled less than 24 hours before its start gets no refund;
  otherwise the full amount is refunded. Implemented by `cancel`.
