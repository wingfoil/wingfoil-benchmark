---
id: determinism
name: determinism
type: directive
kind: custom
title: "Determinism"
format: 1
---

# Determinism

No wall-clock, randomness, or unordered iteration in context-building paths; prefer declared config.

In this project:

- The service never reads the clock. Dates are `YYYY-MM-DD` strings passed in by the caller (order date, ship date, cancel date); never call `new Date()` / `Date.now()` for business logic, and keep tests on fixed dates.
- No `Math.random()`. Order numbers (ORD-0001…) and invoice numbers (2026/0001…) come from counters in placement order.
- Results must not depend on object or Map iteration accident: where order matters (merged lines, allocation ties, reports) sort or tie-break explicitly, as `allocate` does (earlier weight first).
