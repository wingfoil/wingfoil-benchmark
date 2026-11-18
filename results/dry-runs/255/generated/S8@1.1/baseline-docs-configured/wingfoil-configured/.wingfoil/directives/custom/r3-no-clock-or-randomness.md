---
id: r3-no-clock-or-randomness
name: r3-no-clock-or-randomness
type: directive
kind: custom
title: "No wall clock or randomness in the domain"
---

# No wall clock or randomness in the domain

Code under `src/domain/` does not read the clock or make random values: no `Date.now()`, no
`new Date()` without arguments, no `Math.random()`, no random identifiers.
