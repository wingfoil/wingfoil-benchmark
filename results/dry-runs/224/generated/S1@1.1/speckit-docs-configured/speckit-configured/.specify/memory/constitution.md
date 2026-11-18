# json-toolkit Constitution

json-toolkit is a small TypeScript library, with no runtime dependency, of building blocks for services that store,
exchange and update JSON: configuration files, API payloads and stored records. Other projects of the team import it.

## Core Principles

### I. Published Standards Are the Specification
The library's behaviour MUST follow the published standards it implements, not convenience or guesswork. Examples:
JSON (RFC 8259), JSON Pointer (RFC 6901), JSON Patch (RFC 6902), JSON Merge Patch (RFC 7396), and any other
standard a feature names. A spec, plan or task that touches such a feature MUST name the standard and the section
it relies on. Where the standard states a rule (error conditions, ordering, escaping, null handling, atomicity),
implement that rule exactly and do not substitute a looser or "friendlier" behaviour. If a request conflicts with
the standard, surface the conflict instead of silently deviating.

### II. Zero Runtime Dependencies
`package.json` MUST NOT gain `dependencies`. Use only the language and the Node.js standard library. Dev-only
tooling (for example TypeScript) belongs in `devDependencies` and only when needed.

### III. Test-First, Standards-Driven (NON-NEGOTIABLE)
Tests are written before the implementation and are seen to fail first. Tests use the built-in Node runner
(`node --test`, via `npm test`) and live next to or under a `test`/`tests` directory using `node:test` and
`node:assert`. Cover the standard's own examples and edge cases (empty input, escaping, invalid input, array and
object boundaries, `null` versus missing), not only the happy path.

### IV. Safe With Untrusted and Shared Data
Inputs are often payloads from outside. Functions MUST NOT mutate their arguments unless their name and
documentation say so; update operations return new values and leave the input unchanged, including when they
fail part-way. Guard against prototype pollution (`__proto__`, `constructor`, `prototype` keys) and never
assume input is well-formed: reject it with a clear, typed error.

### V. Stable, Typed Public API
The library is imported by other projects, so the public API is a contract. Code is strict TypeScript
(`strict: true`, ES2022, NodeNext modules, so relative imports carry the `.js` extension), emits declarations,
and avoids `any`. Public functions are exported from the `src` entry point and have doc comments stating the
standard they implement. Breaking changes require a major version bump and an explicit note in the spec.

### VI. Simplicity
Small, focused, pure functions. No speculative features, frameworks or abstractions beyond what the request needs.

## Project Constraints

- Language and runtime: TypeScript (ESM, `"type": "module"`) on Node.js; sources in `src/`, build output in `dist/`
  (not committed, as is `node_modules`).
- Commands: `npm test` runs `node --test`. Type-check or build with `tsc` when TypeScript is available.
- Keep `README.md` accurate when public behaviour changes.

## Development Workflow

- Read this constitution and `README.md` before changing anything. Follow the Spec Kit skills in
  `.claude/skills/` (specify, clarify, plan, tasks, implement); Spec Kit work lives under `specs/`.
- Every plan MUST include a Constitution Check against the principles above, in particular I (standard and
  section named), III (tests first) and IV (no mutation).
- A change is done when tests pass and the type-check is clean.

## Governance

This constitution supersedes other practices. Amendments are made through `/speckit-constitution`, with a version
bump and a note of the reason. Plans and reviews MUST verify compliance, and any deviation MUST be justified in
writing in the plan.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08
