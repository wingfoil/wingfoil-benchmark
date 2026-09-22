---
id: task-001-scenario-format-and-package-skeleton
type: task
title: "Scenario format and package skeleton"
status: backlog
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

Classification confirmed in the design phase. The package is new, so every criterion is
**red-first**: no behaviour exists yet that a characterization test could pin.

- `scenarios.feature` @F3.1 "A scenario declares everything the runner and the scorer need" — a
  complete scenario directory loads with ID, version, seed, one prompt per step, oracle reference,
  primary and secondary categories, profiles, GQM questions and capabilities. **red-first**
- REQ-FMT-04 error path — a scenario with a missing required field, a step whose `prompt_file` does not
  exist, or a missing `seed` directory is rejected, naming the field or file. **red-first**
- REQ-ARC-02 — an import from a lower module to a higher one fails lint. **red-first**
- REQ-NFR-04 — `npm test` fails below 80% coverage. **red-first** (checked by configuration)
- Acceptance traceability (W1 default 2) — every Gherkin scenario tagged with a feature of a task that
  has started (`in-progress` or later) has an acceptance test named after it. **red-first**

## Design

### W1 technical decisions

Approved by the approver in the W1 plan phase ("technical defaults 1-11", approval commits
`ef68c8c`, `ea6c461`, `29ead9f`). They apply to task-001, task-002 and task-003.

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

### Package

- `package.json`: `"type": "module"`; scripts `build` (`tsc -p tsconfig.build.json`), `typecheck`,
  `test` (`vitest run --coverage`), `lint` (`eslint .` and `prettier --check .`), `format`.
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `module`/`moduleResolution` `nodenext`,
  target ES2023. `tsconfig.build.json` compiles `src/` only.
- Layout: `src/<module>/index.ts` is each module's public surface; other modules import only that
  file. Tests live in `test/unit/<module>/`, `test/acceptance/`, `test/fixtures/`.

### Modules created (REQ-ARC-01, REQ-ARC-05)

- **`core`**: `result.ts` (`Result<T> = { ok: true; value: T } | { ok: false; issues: Issue[] }`,
  `Issue = { path: string; message: string }`) and `scenario.ts` (the Zod schema of `scenario.yaml`
  and its inferred types). No imports from other modules.
- **`scenario`**: `loadScenario(scenariosRoot, id, version): Result<Scenario>`. It reads
  `<scenariosRoot>/<id>/<version>/scenario.yaml`, validates it with the `core` schema, then checks the
  file system. It returns the parsed scenario with absolute, resolved paths. Validation failures are
  expected outcomes and come back as `issues`; only programming errors throw.

`.wingfoil/dna.yaml` gets `modules: core, scenario` and `paths.sources: [src]`, `paths.tests: [test]`.

### `scenario.yaml` schema (REQ-FMT-04)

| Field | Rule |
|---|---|
| `id` | `^[A-Z][A-Z0-9]*$` (S1, S8, M1, T0), equal to the directory name |
| `version` | `^\d+\.\d+$`, equal to the directory name |
| `categories.primary` | one of `A`–`G` |
| `categories.secondary` | list of `A`–`G`, without the primary and without duplicates (may be empty) |
| `profiles` | non-empty list of `solo-developer`, `code-reviewer`, `team-developer`, `tech-lead`, `non-technical-manager`, `architect` (personas §2) |
| `gqm` | non-empty list of `Q-<A–G><n>` or `G-X<n>` |
| `capabilities` | list of kebab-case names, e.g. `workflow-engine` (REQ-FMT-10 vocabulary); may be empty |
| `seed` | relative directory; must exist |
| `steps` | non-empty list of `{ n, prompt_file }`; `n` runs 1, 2, 3 … in order; each file must exist |
| `oracle.public_tests` | relative directory; must exist |
| `oracle.checks` | list of relative files (content checks, REQ-SCO-06); each must exist; default empty |
| `oracle.third_party` | list of `{ name, url, commit (40-hex SHA), license (SPDX id) }`; default empty |
| `holdout` | boolean: whether hold-out additions are expected |

Unknown keys are rejected (strict objects), so that a typo never silently drops a field. Every path is
relative and must stay inside the scenario version directory: absolute paths and `..` segments are
rejected. This keeps a scenario self-contained, which F2.1's isolation relies on. Issues are reported
in a stable order: schema issues first, in schema order, then file-system issues in declaration
order (determinism directive).

### REQ-ARC-02 lint rule

`eslint.config.js` has one `no-restricted-imports` block per module directory, listing the modules
it must not import:

- `core` → every other module;
- `campaign`, `scenario`, `arms`, `agents`, `results` → `runner`, `scoring`, `site`, `cli` and each
  other (they depend on `core` only);
- `runner` → `scoring`, `site`, `cli`; `scoring` → `runner`, `site`, `cli`; `site` → `runner`,
  `scoring`, `cli`.

The rule is declared for all eleven modules now, so that each later task only adds code. The
red-first test lints in-memory sources (ESLint's `Linter` API with the project config) and asserts a
violation for `src/core/x.ts` importing `../scenario/index.js`, and none for the reverse.

### Acceptance traceability test

`test/acceptance/traceability.test.ts` parses the `.feature` files in
`docs/02_specification/acceptance/` (scenario titles and `@F` tags, with a small line parser: no
Gherkin library needed for this) and the task elements in `docs/memory/task/` (frontmatter `features`
and `status`). For every task whose status is `in-progress` or later, every scenario tagged with one
of its features must match an acceptance test title `@<feature> <scenario title>`. Acceptance test
titles are collected by a static scan of `test/acceptance/*.test.ts`.

### Fixture

`test/fixtures/scenarios/T0/1.0/`: the trivial scenario (one step that asks to create a file; an
empty public test directory; `holdout: false`). task-003 runs it in a container. Error-path
fixtures are built in temporary directories by the tests themselves, so that every broken variant is
visible next to its assertion.

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
- `npx wingfoil memory approve task-001-scenario-format-and-package-skeleton --reason "…"` → `ef68c8c`, run after the approver's explicit
  consent in chat. Declared: `pending → backlog` gate, approver role checked, subject with
  `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0, empty
  stderr, subject `wf(task): approve task-001-scenario-format-and-package-skeleton [pending → backlog]`, both trailers present, 1-line diff.
  Matches.
