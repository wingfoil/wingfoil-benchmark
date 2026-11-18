---
id: order-service-rules
name: order-service-rules
type: directive
kind: custom
title: "Order-service business rules and conventions"
format: 1
---

# Order-service business rules and conventions

Project: TypeScript library (Node 22.18+, ESM, strict, `erasableSyntaxOnly`), no runtime dependency. Public API is `src/index.ts`; `createShop()` wires a shop. Test with `npm test`.

## README is the specification

- The "Business rules" section of `README.md` is authoritative: when code and README disagree, the README is right. Read it before any change and check every behaviour against it. Do not edit the README's rules to match code.
- If a request contradicts a README rule, flag it instead of silently choosing.

## Money, dates, rounding

- Amounts are integer euro cents (`Cents`), never floats. Percentages are integer percents applied with `percentOf` / `divideHalfUp` (round half up). Do not use `Math.round`, `toFixed` or floating division on money; split amounts with `allocate`.
- Dates are `YYYY-MM-DD`; use `src/dates.ts` helpers (`checkDate`, `compareDates`, `addDays`). Periods include both end days.
- SKUs and coupon codes are case-insensitive, trimmed; normalize via `canonicalSku` / `canonicalCode`; SKUs are shown upper case.

## Rules that are easy to get wrong

- Order of computation: volume discount (10+ units, 10% per line) → coupon on subtotal after volume discounts (fixed coupon capped at subtotal; minimum checked after volume discounts) → all discounts capped at 50% of gross, coupon reduced to fit → free shipping at goods >= €50.00 after discounts, before VAT.
- VAT is per line on net after all discounts (coupon spread proportionally via `allocate`), rounded half up per line; shipping VAT 22% on its own line. Total = goods + shipping + VAT goods + VAT shipping.
- Stock: placing reserves, shipping takes off hand, cancelling returns units; refused orders reserve nothing. Low stock is fewer than 5 available.
- Orders: merge duplicate SKUs; quantity a whole number > 0; shipped can't be cancelled and cancelled can't ship; cancel allowed through day 14 after placement; cancelling gives back a single-use coupon.
- Invoices: one per shipped order, dated the ship day, numbered per year.
- Rule thresholds live in exported named constants (e.g. `CANCELLATION_DAYS`, `LOW_STOCK_THRESHOLD`); change them there, do not scatter literals.

## Code conventions

- Match existing style: single quotes, 2-space indent, semicolons, JSDoc on exported functions/classes, relative imports ending in `.ts`, `import type` for types.
- Errors are subclasses of `ShopError` in `src/errors.ts`; throw the most specific one (ValidationError, OutOfStockError, CouponError, OrderStateError, ...).
- Anything consumers use must be exported from `src/index.ts`.
- Do not add runtime dependencies or a build step; do not use TS features unsupported by native type stripping (enums, namespaces, parameter properties).

## Tests

- Tests live in `test/<area>.test.ts`, use `node:test` and `node:assert/strict`, build a shop via `createShop()` with fixed dates, and import from `../src/index.ts`.
- Every rule change needs a test for the normal case and a boundary (e.g. day 14 vs 15, exactly 50.00, 0.5 cent rounding, 9 vs 10 units). Run `npm test` before finishing.
