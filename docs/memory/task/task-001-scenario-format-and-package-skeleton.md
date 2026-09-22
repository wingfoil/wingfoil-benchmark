---
id: task-001-scenario-format-and-package-skeleton
type: task
title: "Scenario format and package skeleton"
status: pending
release: v0.1
wave: W1
features: [F3.1]
acceptance: [scenarios.feature]
requirements: [REQ-ARC-01, REQ-ARC-02, REQ-ARC-03, REQ-ARC-05, REQ-FMT-04, REQ-NFR-04]
---

## Context

First task of wave **W1 — Skeleton** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md);
[07_sequencer.md](../../01_vision/07_sequencer.md) 1.1). The wave ends with "a trivial scenario runs in a
container from a campaign file". This task provides the first building block: the scenario format.

It also bootstraps the `wingfoil-benchmark` package, because every later task depends on it:

- TypeScript strict, Node.js ≥ 22.12, modules under `src/` (REQ-ARC-01). Only the modules this task
  needs are created (`core`, `scenario`); the others appear with the task that first uses them, so that
  no empty module exists.
- The downward dependency rule of REQ-ARC-02 is enforced by the linter from the first commit.
- Test runner, coverage threshold (80%) and lint are wired into `npm test` / `npm run lint`
  (REQ-NFR-04, testing and code-quality directives).
- `.wingfoil/dna.yaml` lists the modules created (REQ-ARC-05).

Scope of F3.1 here: the Zod schema of `scenario.yaml` (REQ-FMT-04) and a loader that reads
`scenarios/<id>/<version>/` (REQ-ARC-03) and resolves `seed` and step `prompt_file`s. The command
`bench scenario validate` and the leak scan belong to F3.2 (W4); scenario versioning to F3.4 (W4).

**Done** means: a scenario directory declaring every field of REQ-FMT-04 loads; one missing or
malformed field is rejected with a message naming the field; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). The package is new, so every criterion
is **red-first**.

- `scenarios.feature` @F3.1 "A scenario declares everything the runner and the scorer need" — a
  complete scenario directory loads with ID, version, seed, one prompt per step, oracle reference,
  primary and secondary categories, profiles, GQM questions and capabilities. **red-first**
- REQ-FMT-04 error path — a scenario with a missing required field, a step whose `prompt_file` does not
  exist, or a missing `seed` directory is rejected, naming the field or file. **red-first**
- REQ-ARC-02 — an import from a lower module to a higher one fails lint. **red-first**
- REQ-NFR-04 — `npm test` fails below 80% coverage. **red-first** (checked by configuration)

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `69ba5f3`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W1 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-001-scenario-format-and-package-skeleton` → `5dcfd91`. Declared: `draft → pending`, required fields checked,
  one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty stderr, 1 file,
  diff limited to `status: draft` → `status: pending`. Matches (subject without transition: N9).
