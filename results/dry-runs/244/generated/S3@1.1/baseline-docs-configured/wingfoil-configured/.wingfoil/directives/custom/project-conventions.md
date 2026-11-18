---
id: project-conventions
name: project-conventions
type: directive
kind: custom
title: "lakeside-desk conventions"
format: 1
---

# lakeside-desk conventions

Project: the booking desk of the Lakeside Windsurf School (windsurf lessons and board/sail rentals, April to October).
Read `README.md` first; it is the project's statement of purpose and of any rule it gives. Follow it over these notes.

- Language and runtime: TypeScript (strict, ES2022, NodeNext, ESM via `"type": "module"`) on Node.js. Source lives in `src/`; `tsc` emits to `dist/`. Do not commit `dist/` or `node_modules/` (both are git-ignored).
- Relative imports use the NodeNext form, with the `.js` extension in the specifier.
- No runtime dependencies: use the standard library; do not add packages to `dependencies`.
- Tests: run `npm test` (`node --test`) and keep it green before finishing. Use `node:test` and `node:assert`; no external test framework.
- Domain logic (prices, availability, season dates, durations) must be pure and deterministic: take the date/time as an argument instead of reading the clock, and test the season boundaries (April start, October end) and the edge cases.
- Keep changes scoped to the request; do not alter unrelated files, `package.json` or `tsconfig.json` unless the request needs it.
