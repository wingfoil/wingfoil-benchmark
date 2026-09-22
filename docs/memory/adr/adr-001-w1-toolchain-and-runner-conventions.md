---
id: adr-001-w1-toolchain-and-runner-conventions
type: adr
title: "W1 toolchain and runner conventions"
status: pending
---

## Context

Wave W1 of release v0.1 bootstraps the benchmark's code (task-001, task-002, task-003).
[requirements.md](../../02_specification/requirements.md) 1.1 fixes the architecture (REQ-ARC-01..05),
the formats and the runner, but not the toolchain nor several conventions the three tasks share.

In the W1 plan phase the agent proposed eleven technical defaults in the conversation with the
approver, who accepted them ("technical defaults 1-11 of the W1 plan phase accepted", approval commits
`ef68c8c`, `ea6c461`, `29ead9f`). Their first written record is the W1 section of task-001's Design,
written right after the acceptance (`c1085fe`); that transcription adds two design-time details, the
`npx` check in default 1 and the pinned tool versions (delta 2 below). This ADR records the defaults
as the benchmark's architectural baseline.

## Decision

The eleven defaults, quoted from their first written record (task-001 Design at `c1085fe`):

1. One package `wingfoil-benchmark` at the repository root, ESM, compiled with `tsc` into `dist/`,
   `bin: { bench: dist/cli/main.js }` (added by task-002, with the first command). Verified during
   design: `npx <bin>` resolves a package's own `bin` (npm 11.6.2), so no fallback is needed.
2. Vitest with v8 coverage, 80% threshold on lines, branches, functions and statements. Acceptance
   tests are Vitest files under `test/acceptance/`, one `it` per Gherkin scenario, named
   `@<feature> <scenario title>`. A traceability test enforces the mapping (see below).
3. ESLint flat config with typescript-eslint strict, plus Prettier. REQ-ARC-02 is enforced with
   `no-restricted-imports`, configured per module directory.
4. `zod` and `yaml` (eemeli). Canonical JSON for REQ-FMT-02 is hand-written (task-002).
5. Docker image: versioned Dockerfile, `node:22-bookworm` pinned by digest, git, Claude Code at
   `agent.version`, installed and never invoked in W1 (task-003).
6. Docker and git are called through ports around the CLI (`execFile`), not dockerode. Container user
   `node`, workspace at `/workspace`, default network in W1 (task-003).
7. The agent adapter is chosen by `agent.name`. In W1 only `fake` is registered; `claude-code` is
   refused with exit 1 "agent not available" (task-002, task-003).
8. The trivial scenario and campaign are test fixtures: `test/fixtures/scenarios/T0/1.0/` and
   `test/fixtures/campaigns/smoke.yaml`.
9. Run workspaces under `runs/<campaign-id>/<n>/` (git-ignored). Execution numbering reads
   `results/<campaign-id>/`; W1 creates only that directory skeleton.
10. Tests against the real Docker live in `npm run test:docker`, outside `npm test` and coverage.
11. Node 22 (22.21.0 on the maintainer's machine). No CI in W1.

Pinned tool versions (checked on npm on 2026-09-22): TypeScript **6.0.3**, not 7.0.2, because
typescript-eslint 8.70.1 requires `typescript >=4.8.4 <6.1.0`; Vitest and `@vitest/coverage-v8`
5.0.1; ESLint 10.11.0 with `@eslint/js` 10.0.1 and typescript-eslint 8.70.1; Prettier 3.9.8; zod
4.6.5; yaml 2.9.1; `@types/node` 22.x, matching the runtime. Exact versions are locked by
`package-lock.json`.

In default 2, "see below" points to the traceability test described in task-001's Design, where
this text was first written.

## Deltas since acceptance (for the approver's decision)

Changes made during task-001 that depart from, or add to, the accepted text. Each needs the
approver's decision together with this ADR.

1. **Default 3, how REQ-ARC-02 is enforced.** The accepted text says `no-restricted-imports`,
   configured per module directory. Review round 1 of task-001 proved that path patterns cannot
   enforce the rule: they missed dynamic imports, deep imports that bypass `index.ts` and `.mts`
   files, and flagged subfolders named like modules. The implementation is now a local ESLint rule,
   `eslint/module-boundaries.js`, that resolves every import against `src/`. The intent of default 3
   is unchanged: ESLint flat config, typescript-eslint strict, Prettier, and REQ-ARC-02 in lint. The
   rule is type-checked and under the same 80% coverage threshold as `src/`.
2. **Pinned tool versions (addition).** The block after default 11 was written at design time, not
   proposed with the defaults. Its one choice beyond "latest" is TypeScript 6.0.3 instead of 7.0.2,
   because typescript-eslint 8.70.1 requires `typescript <6.1.0`.

## Consequences

- Every later task inherits these conventions. Changing one is a new ADR that supersedes this one.
- Acceptance tests do not execute the `.feature` files directly (cucumber-js was the alternative); the
  traceability test is what keeps the two in step.
- TypeScript stays below 7 until typescript-eslint supports it.
