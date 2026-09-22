---
id: adr-001-w1-toolchain-and-runner-conventions
type: adr
title: "W1 toolchain and runner conventions"
status: draft
---

## Context

Wave W1 of release v0.1 bootstraps the benchmark's code (tasks task-001, task-002, task-003).
[requirements.md](../../02_specification/requirements.md) 1.1 fixes the architecture (REQ-ARC-01..05),
the formats and the runner, but not the toolchain nor several conventions the three tasks share. The
approver accepted eleven technical defaults in the W1 plan phase (approval commits `ef68c8c`,
`ea6c461`, `29ead9f`); this ADR records them as the benchmark's architectural baseline.

## Decision

1. **Package:** one ESM package `wingfoil-benchmark` at the repository root, compiled with `tsc` into
   `dist/`; `bin: { bench: dist/cli/main.js }`, run as `npx bench` (verified: npm resolves a package's
   own `bin`).
2. **Tests:** Vitest with v8 coverage, threshold 80% on lines, branches, functions and statements.
   Acceptance tests are Vitest tests named `@<feature> <scenario title>`, one per Gherkin scenario of
   `docs/02_specification/acceptance/`; a traceability test enforces the mapping for every started
   task.
3. **Lint:** ESLint flat config with typescript-eslint strict, and Prettier. REQ-ARC-02 is enforced by
   lint rules per module directory.
4. **Libraries:** `zod` for schemas, `yaml` for YAML; canonical JSON (REQ-FMT-02) is hand-written.
5. **Run image:** a versioned Dockerfile from `node:22-bookworm` pinned by digest, with git and Claude
   Code at the campaign's `agent.version`.
6. **Ports:** Docker and git are called through port interfaces around their CLIs (`execFile`), never
   through client libraries (REQ-ARC-04). Container user `node`, workspace at `/workspace`.
7. **Agents:** the adapter is chosen by the campaign's `agent.name`. Until W2 only `fake` exists; any
   other agent is refused ("agent not available"), so no real agent can start by accident.
8. **Test scenario:** trivial scenario and campaign are test fixtures (`test/fixtures/`), never
   benchmark content in `scenarios/` or `campaigns/`.
9. **Working data:** run workspaces under `runs/<campaign-id>/<n>/` (git-ignored); execution numbers
   are read from `results/<campaign-id>/`.
10. **Docker tests:** tests against the real Docker run with `npm run test:docker`, outside `npm test`
    and coverage.
11. **Runtime:** Node 22. No CI until a release needs it.

Tool versions are locked by `package-lock.json`. TypeScript is held at 6.0.x, because
typescript-eslint 8.70 supports `typescript <6.1`.

## Consequences

- Every later task inherits these conventions; changing one is a new ADR that supersedes this one.
- Acceptance tests do not execute the `.feature` files directly (cucumber-js was the alternative);
  the traceability test is what keeps the two in step.
- Holding TypeScript below 7 is revisited when typescript-eslint supports it.
