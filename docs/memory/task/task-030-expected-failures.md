---
id: task-030-expected-failures
type: task
title: "Expected failures"
status: in-progress
release: v0.1
wave: W6
features: [F3.6]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-10, REQ-FMT-05, REQ-SCO-10]
---

## Context

Fifth and last task of wave **W6 — First scores** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
the "with expected failures marked" part of its "Ends with". The W6 plan-phase decisions are in
[task-026](task-026-oracle-suites-per-step.md).

Scope of F3.6:

- **Arms declare `provides` (REQ-FMT-10)** in `arm.yaml`, the harness capabilities the arm offers;
  the wingfoil arm at `3df305e` declares `workflow-engine: false` (K5: the v0.2 pre-release has no
  workflow engine). REQ-FMT-05 lists the arm's fields and gains `provides`.
- **Scenarios already declare `capabilities`** (REQ-FMT-04, task-001); nothing reads them yet.
- **A run is marked `expected failure` (REQ-SCO-10)** when the scenario's `capabilities` are not all in
  the arm's `provides`, naming the missing ones. The run is **executed normally** and **scored** —
  never skipped — and the mark is in its `run.json`, decided when the run is planned, and carried into
  its `score.json`.
- **Counted as a loss in aggregation** is W7's (F5.1; W6 plan-phase decision 6), carried in the
  release element.

Left to the design phase: `provides` as a map (`workflow-engine: false`, REQ-FMT-10's example) or a
list (its wording, `provides[]`), and what an undeclared capability means (not provided); whether the
capabilities an arm provides depend on the harness version it pins, so that a later WingFoil can
provide `workflow-engine` without a new arm; whether the baseline arms provide nothing, and so whether
every scenario with a capability is an expected failure there too — which REQ-SCO-10 implies and the
method page (W11) must then say; and whether `bench campaign validate` or the estimate should print the
expected failures a campaign will have.

**Done** means: a run of a T-scenario declaring `workflow-engine` in the wingfoil arm is executed,
scored, and marked `expected failure` naming `workflow-engine`; tests, coverage and lint pass. With
task-027 to task-029 done, this is W6's "Ends with".

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F3.6 "A scenario that needs a missing harness capability is an expected
  failure" — its "published as a loss" clause is W7's. **red-first**
- REQ-FMT-10 / REQ-FMT-05 — `provides` in `arm.yaml`, validated; an unknown key still refused.
  **red-first**
- REQ-SCO-10 — the mark and the missing capabilities in `run.json` and `score.json`; the run executed
  and scored. **red-first**

## Design

**Classification confirmed**, all red-first. Four questions the Context left open, each answered below
and each raised again at review: the shape of `provides`; which arms are checked; where `provides` is
tied to a harness version; what the command line says before a campaign runs.

### What the v0.1 scenarios ask for

Read from the approved specs, §7–8: S1, S2 and S3 need **no** capability ("any extra manual work shows up
in the cost metrics, not as an expected failure"); S8 needs **directive delivery**, which WingFoil `3df305e`
has (K5). So **no v0.1 run is an expected failure** in the wingfoil arm: F3.6 is built now for later
scenarios and harnesses (T10: the workflow engine), and shown here on a T-scenario.

### `provides` — a map (REQ-FMT-10, REQ-FMT-05)

```yaml
# arms/wingfoil/arm.yaml
provides:
  directive-delivery: true
  memory-lifecycle: true
  workflow-engine: false
  mcp-tools: false
```

A map of kebab-case capability to boolean, as REQ-FMT-10's example writes it (`workflow-engine: false`),
rather than a list: a `false` states a **known gap** of the harness, which the method page (W11) and a
reader of `run.json` can name, where a list could only be silent. An undeclared capability is **not
provided**, like a `false`. The wingfoil arm's entries are K5's facts about `3df305e`, nothing more.
REQ-FMT-05's list of fields gains `provides` (requirements 1.9).

### Which arms are checked — the harness arms only

REQ-SCO-10, read literally, marks a run whenever the scenario's capabilities are not all in the arm's
`provides`. The baseline arms provide nothing, so S8 — which needs directive delivery — would be an
"expected failure" in baseline and baseline-docs, although nothing is expected to fail there and no
harness lacks anything. F3.6 speaks of "the harness version under test", and its acceptance of "the
wingfoil arm". So: **only an arm with a harness (`requires`) is checked**; baseline and baseline-docs are
the reference and are never marked. REQ-SCO-10 is amended to say so (requirements 1.9).

### Where it is decided, and recorded

- **When the run is planned**, in the runner, from the scenario version and the arm — so a campaign knows
  it before anything runs. The run is **executed normally** (F3.6: "never skipped").
- **`run.json`** records `expected_failure: { missing: [..] }` for a marked run (sorted, the capabilities
  the arm does not provide), and the arm's `provides` for every run of a harness arm, so that a result
  says what was assumed of the harness it ran.
- **`score.json`** carries `expected_failure` — `null`, or `{ missing: [..] }` — always present, so W7's
  aggregation (the "loss", W6 plan-phase decision 6) never has to infer it from an absent key. The run's
  hidden tests and cost are scored as for any run.

### `provides` and the harness version

`provides` lives in `arm.yaml` (REQ-FMT-10) and describes the harness the arm is developed against —
`3df305e` today. It is **not** keyed by harness version: v0.1 pins one WingFoil per campaign, and the
arm's files are part of the repository's history. When the pinned WingFoil changes — before the
reference campaign, to the latest release (sequencer decision 3) — `provides` is re-assessed with it;
that joins the "before the campaign" items in the release element, beside re-running the MCP probe.

### What the command line says

- `bench campaign validate` lists, after its line, **one line per scenario version and arm that will be an
  expected failure**: `expected failure: T4@1.0 in wingfoil (missing workflow-engine)` — so the maintainer
  sees it before spending anything. Nothing is printed when there are none.
- `bench campaign run` logs the mark with the run's start; `bench score`'s line ends `; expected failure
  (missing workflow-engine)`.

### Where the code goes

`core/arm.ts` (the schema, `Arm.provides`), `arms/load.ts`; a pure `missingCapabilities(scenario, arm)` in
`arms/`, used by the runner at planning and by `campaign validate`; `run.json` in `runner/run.ts`;
`readStoredRun` and `score.json` in `results/` and `scoring/`. A fixture T4 declares `workflow-engine`;
`test/fixtures/arms/wingfoil/arm.yaml` gains `provides`. The benchmark's own `arms/wingfoil/arm.yaml` gets
K5's four entries.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `5445c1d`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W6 tasks of release v0.1` (`1551d03`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-030-expected-failures` → `5f2f25a`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
