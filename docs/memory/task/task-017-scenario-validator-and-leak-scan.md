---
id: task-017-scenario-validator-and-leak-scan
type: task
title: "Scenario validator and leak scan"
status: in-progress
release: v0.1
wave: W4
features: [F3.2]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-08, REQ-CLI-04, REQ-FMT-04]
---

## Context

Second task of wave **W4 — Scenario hygiene** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It builds on task-016 (the hold-out's path and additions).

Scope of F3.2:

- **`bench scenario validate <id>@<version> [--holdout <path>]` (REQ-CLI-04).** The schema and the
  loader's checks (REQ-FMT-04, as `campaign validate` already runs them), then the leak scan.
- **The leak scan (REQ-FMT-08).** It fails when a step prompt names a harness or tool from a
  **declared list**, and when an **oracle literal** — an expected value or a test name of at least a
  **declared minimum length** — appears in the seed or in a prompt. With the hold-out configured, the
  hold-out oracles are scanned too, and their content is never printed: messages name only the file
  and the step. Where the list and the minimum length are declared, and what counts as an oracle
  literal in a test file, is this task's design.
- **W3's carry-overs (rel-v0-1, "Due before" W4):** a scenario's `arms/<arm>/` configuration must not
  leak into the seed or the prompts by content, not only by path (task-013 checks the path); a seed
  must not carry a `CLAUDE.md` or a `PROJECT_RULES.md`, which the runner would refuse only at run time.
- `scenarios.feature` names S1, S2 and S3, which are benchmark content (W7, W8): T-scenario fixtures
  stand in for them, as T1 did for S3 in W2 and T2 for S8 in W3.

**Done** means: `scenarios.feature` @F3.2 (three scenarios) passes; W4's "Ends with" — a scenario
validated, with its oracle kept outside the container — holds, checked as W4 plan-phase decision 4
(task-016) says; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `scenarios.feature` @F3.2 "A well-formed scenario passes the validator". **red-first**
- `scenarios.feature` @F3.2 @error "A step prompt that names a harness is rejected" — the message names
  the step and the offending text. **red-first**
- `scenarios.feature` @F3.2 @error "Oracle content that appears in the seed or the prompts is
  rejected" — with the hold-out configured; the message names the file and the step, without printing
  the hold-out content. **red-first**
- W3 carry-over — an `arms/<arm>/` text in the seed or a prompt is rejected; a seed `CLAUDE.md` or
  `PROJECT_RULES.md` is rejected. **red-first**

## Design

Builds on task-016: `bench scenario validate` exists, with the scenario's checks and the hold-out's
consistency; this task adds the leak scan to it (`validateScenario`, `src/cli/scenario.ts`) and the
`scenarios.feature` @F3.2 acceptance tests. **Classification confirmed:** all red-first.

### The declared list and the minimum length (REQ-FMT-08) — `scenarios/leak-scan.yaml`

Both are **declared in one versioned file of the repository**, `scenarios/leak-scan.yaml`, beside the
scenarios it applies to, and published with the method (it is part of what makes a scenario valid):

```yaml
# The leak scan's declarations (REQ-FMT-08).
harness_names: [WingFoil, OpenSpec, Spec Kit, spec-kit, BMAD, Kiro, Agent OS, Taskmaster]
oracle_literal_min_length: 8
```

- **Harness names**: WingFoil, and the tools of the competitor landscape (2026-09-22) the sequencer
  plans arms for (v0.2: Spec Kit, OpenSpec) or names as candidates, so that a prompt written today
  stays valid when those arms arrive. Matched case-insensitively, on word boundaries: `wingfoil`,
  `WINGFOIL` and `WingFoil's` match; `wingfoiling` does not.
- **Minimum length 8**: shorter literals (`ok`, `pending`, `id`) are words any seed contains; the
  number is a declaration, changed by editing the file, not the code.

A missing or malformed `leak-scan.yaml` is an issue of the command, not a silent default: the scan's
rules are the ones written down.

### What an oracle literal is

In every **oracle file** — the public tests (`oracle.public_tests`), the checks (`oracle.checks`) and,
with the hold-out configured, its additions (task-016) — the literals are the **quoted strings**
(`'…'`, `"…"`, and `` `…` `` without `${}`) of at least the minimum length. That covers both kinds
REQ-FMT-08 names: an expected value (`expect(x).toBe('Order 42 cancelled')`) and a test name
(`it('rejects an order already shipped', …)`). Two exclusions keep it from flagging what is not
oracle content:

- **module specifiers** (`from '…'`, `import('…')`, `require('…')`): a test imports the seed's code by
  path, and those paths are in the seed by construction;
- literals that are **only whitespace or punctuation**.

A literal is searched as an exact substring in every text file of the seed and in every step prompt.
Numbers are not literals in v0.1 (an expected `42` would match half of any seed): recorded as a known
limit of the scan, not hidden.

### What else leaks (W3's carry-overs)

- **A scenario's `arms/<arm>/` configuration** (K3, dl-005): its Markdown documents — the directives
  and the Memory elements, the rules and the decisions — are split into lines, after their
  frontmatter; each line of at least the minimum length, with heading marks and list bullets removed,
  is searched in the seed and the prompts. Its YAML files (`dna.yaml`, `roles.yaml`) are not scanned:
  the project description the DNA carries is meant to be in the seed's README too (S1's spec, task-014),
  and the rest is configuration, not prose a prompt could repeat.
- **Reserved names in the seed**: a `CLAUDE.md` or a `.claude/` at any depth (Claude Code reads them);
  a `.wingfoil/` at any depth (it would make any arm a wingfoil arm); `PROJECT_RULES.md` or `.mcp.json`
  at the seed's root (the runner writes the first; the agent would read the second).

### Messages (REQ-FMT-08)

One issue per finding, in a stable order (prompts by step, then seed files by path; findings by the
oracle file, then by position):

- harness name: `steps[1].prompt_file: names the harness 'WingFoil'` — the step and the offending text,
  as `scenarios.feature` asks;
- oracle literal: `steps[1].prompt_file: holds a literal of the hold-out file hidden/a.test.ts` or
  `seed: src/orders.ts holds a literal of oracle/public/a.test.ts` — the file and the step, **never the
  literal**, for the hold-out as REQ-FMT-08 requires and for the public oracle too, so that one rule
  covers both;
- arm configuration: `steps[0].prompt_file: repeats a line of arms/wingfoil/.wingfoil/directives/custom/no-throw.md`;
- reserved name: `seed: holds CLAUDE.md, which a run's setup reserves`.

### Code

- `core/leak-scan.ts`: the schema of `leak-scan.yaml`.
- `scenario/leak-scan.ts`: `oracleLiterals(text)` (pure), `armLines(text)` (pure), and
  `scanScenario(scenario, declarations, holdout?)`, which reads the files and returns the issues. The
  hold-out's content is read here, into memory, and never leaves it except as a file name.
- `cli/scenario.ts`: loads `scenarios/leak-scan.yaml` from the root and runs the scan after the
  hold-out's consistency.

### Fixture and tests

- **T3** (`test/fixtures/scenarios/T3/1.0/`), standing in for S1, S2 and S3: a seed, two prompts, a
  public oracle test with an expected value and test names, `holdout: true`. The acceptance tests copy
  it to a temporary repository and change what each scenario needs; the hold-out is built there too.
- **Acceptance** (`test/acceptance/scenarios.test.ts`): the three `@F3.2` scenarios.
- **Unit:** the literal extraction (quotes, template literals, specifiers, the minimum), the harness
  match (case, word boundaries), the arm lines, each reserved name, the declarations file (missing,
  malformed), the order of issues, and — for every hold-out finding — that its content reaches no
  output.
- The benchmark's own `scenarios/leak-scan.yaml` is loaded by a test, as `arms/` is.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `146ff23`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W4 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-017-scenario-validator-and-leak-scan` → `7ae96fa`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
