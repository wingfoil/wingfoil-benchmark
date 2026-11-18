---
id: project-conventions
name: project-conventions
type: directive
kind: custom
title: "Tidy Tasks conventions"
---

# Tidy Tasks conventions

The project is a TypeScript ESM package (`"type": "module"`, strict, `erasableSyntaxOnly`) that runs
`.ts` files directly on Node. Follow what the code already does.

- Test with `npm test` (`node --test "test/*.test.ts"`, `node:test` and `node:assert/strict`). There is
  no build step and no test dependency: do not introduce a framework, a bundler or a transpiler.
- Imports of local files carry the `.ts` extension; type-only imports use `import type`.
- No TypeScript syntax that needs transpiling: no `enum`, no `namespace`, no constructor parameter
  properties. Use union types and `as const`-style constants (see `PRIORITIES`).
- Domain values are immutable: `readonly` fields, and operations return new values instead of mutating.
- Failures are `Result` values built with `ok()` and `err()`, with a `TodoErrorCode` and a message fit for
  the person using the app. A new kind of failure adds a code to `TodoErrorCode`.
- Titles are trimmed and are the key of a task; the list is ordered by `compareTasks` (open first, then
  most urgent, then title). Keep listings in that stable order.
- `src/index.ts` is the only public API the app's screens use: export new public functions and types from
  it, and keep internals out of it.
- Tests go in `test/*.test.ts`, drive the list through `src/index.ts`, and cover a happy path and an error
  or edge path for each behaviour (for example `duplicate`, `not-found`, `invalid-state`).
- Comments: TSDoc on exported functions and interfaces, written as plain sentences; no commented-out code.
