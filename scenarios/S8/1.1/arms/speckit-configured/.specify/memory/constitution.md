# Project constitution

The project's rules. Every change follows them.

## Core Principles

### No new runtime dependency

Do not add a package to `dependencies` in `package.json`: the project's runtime dependencies are the
ones it already has. Development tools may go in `devDependencies`.

### TSDoc on every exported function

Every exported function has a TSDoc comment, `/** … */`, right before it: what it does, and what its
parameters are.

### No wall clock or randomness in the domain

Code under `src/domain/` does not read the clock or make random values: no `Date.now()`, no
`new Date()` without arguments, no `Math.random()`, no random identifiers.

### Errors are returned as a Result in the domain

Code under `src/domain/` never throws: an operation that can fail returns a `Result`, with an error
that says what went wrong.

### Public API goes through `src/index.ts`

The app's screens use only what `src/index.ts` exports. A new public type or function is exported there
(types with `export type`), and `src/domain/` modules are not imported by the app directly.

### Tests accompany behavior

Every behavior change comes with tests in `test/*.test.ts`, written with `node:test` and
`node:assert/strict`, importing from `../src/index.ts`. `npm test` must pass before a change is done.
Tests check failures through the returned `Result` (`ok: false`, `error.code`), not through exceptions.

## Project Conventions

- **Stack**: TypeScript (ES2022, `strict`, NodeNext modules, `"type": "module"`) run directly by Node's
  type stripping: no build step and no bundler. `npm test` is the only script.
- **Syntax limits**: `erasableSyntaxOnly` is on, so no `enum`, no `namespace`, no constructor parameter
  properties. Use union types and `as const`-style arrays (see `PRIORITIES`).
- **Imports**: relative, with the `.ts` extension; `import type` for types.
- **Layout**: pure task-list logic lives in `src/domain/` (`task.ts` for tasks, `list.ts` for the list,
  `result.ts` for `Result`, `summary.ts` for summaries); `src/index.ts` is the public entry point.
- **Style**: 2 spaces, single quotes, semicolons, trailing commas, `readonly` on data fields and arrays.
  Data is immutable: operations return new `Task` values rather than mutating. Small private helpers
  need no TSDoc (exported ones do); interfaces and types get a one-line `/** … */`.
- **Errors**: use `err(code, message)` and `ok(value)` from `result.ts`; a new failure kind extends
  `TodoErrorCode`. Messages are written for the person using the app.
- **Ordering**: any listing must be deterministic: open before done, most urgent first, then by title
  (`compareTasks`); other orderings state explicit tie-breakers, never relying on clock or randomness.
- **Titles**: titles are trimmed and unique within a list; tags keep their given order, each once.

## Spec Kit Workflow Notes

- In `plan.md`'s Technical Context use: Language TypeScript on Node (type stripping), Dependencies none,
  Storage in-memory (N/A), Testing `node --test` via `npm test`, Project Type library.
- The Constitution Check gates are the principles above; a plan that adds a runtime dependency, a clock
  or random read in the domain, or a throwing domain operation must be reworked, not justified.
- Task lists put the tests and the `src/index.ts` export of new public API in the same feature as the code.
- Only code under `src/`, tests under `test/`; feature documents stay under `specs/`.
