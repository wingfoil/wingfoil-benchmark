---
id: task-033-s2-injected-bug-scenario
type: task
title: "S2 injected-bug scenario"
status: backlog
release: v0.1
wave: W7
features: [F6.2]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-SCO-01, REQ-SCO-02, REQ-SCO-06]
---

## Context

Third task of wave **W7 — First content** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), the S2
half of its "Ends with" ("S1 and S2 scored in all three arms"); the wave's "Ends with" holds after it.
The W7 plan-phase decisions are in
[task-031](task-031-third-party-oracle-material-pinned-by-commit-or-sha256.md). It follows
`scenario-authoring` from goal to validate; calibrate and register are calibration's (decision 3).

Scope: **S2@1.0** as [S2.md](../../02_specification/scenarios/S2.md) specifies it, in
`scenarios/S2/1.0/`:

- **Goal:** the card of S2.md §1 (categories D and F, Q-D1–Q-D3 and Q-F1, `capabilities: []` — §7).
- **Seed** (§3): a purpose-written order and inventory module of about 1,000–1,500 lines (products and
  SKUs, stock, orders with lines, discounts, VAT, shipping, cancellation) with its public API, a README
  documenting the business rules (the false report's rule among them), a visible test suite green on
  the seed that catches none of the defects, and **six injected defects** of the six kinds §3 lists.
  Nothing in names, comments or history hints at them; one initial commit.
- **Prompts** (§5): three batches of user reports written as symptoms — 3 real; 2 real and 1 false; 1
  real and 1 duplicate of a step-1 defect in other words — asking only to handle them.
- **Public oracle** (§6): one defect test per reported symptom, failing on the seed and passing once the
  symptom is gone, each in the suite of the steps from its report on; the seed suite and a public
  regression suite (M-D3); a test that the documented behaviour behind the false report is still in
  place at the end; the step-1 fix still in place after step 3. Suites and their `after_steps` are this
  task's design.
- **Content checks** (§6, decision 6): the false report's related code left unchanged, and the
  duplicate identified as already fixed in any git-tracked file or commit of step 3, declared as
  `oracle.checks` in REQ-SCO-06's form — case-insensitive patterns on content, never a harness's path or
  format (F4.8). Written and validated here; **scored in W8** by F4.8.
- **Hold-out only** (§6, in `WingFoil2-Benchmark-HoldOut`): the **answer key** (where each defect is,
  and what it is), variant tests per defect, an extended regression suite — and, by decision 5, the
  reference fixes and the fake sessions that replay them. This repository describes the defect *kinds*
  only.
- **Validate:** `bench scenario validate S2@1.0 --holdout <path>` clean. S2.md §8 asks the leak scan to
  check the reports against the answer key: with the answer key under a hold-out suite, its quoted
  strings are scanned against the prompts; what the scan cannot see (words shorter than 8 characters,
  numbers such as a wrong total or a boundary date) is checked by a documented review of the reports,
  recorded here without the answer key's content.
- **For the wave check (decision 4):** an automated `scenarios.feature` @F6.2 example, with the hold-out
  configured: validation passes, a dry run in each of the three arms with the fake replaying the
  reference fixes, the public oracle scoring each without errors. Without a hold-out the example is
  skipped and says why.

Constraints W4 and W6 left for scenario content (as in task-032): hidden tests import the code under
test inside the test, are registered unconditionally with unique names, and a defect test passes
nothing on the seed (adr-004 decision 10); the seed has no dependency, and its visible suite runs with
no install and no network, in the run container and in the scoring image; the seed's README and
visible tests hold no literal of the hidden tests of 8 characters or more — a real constraint here,
since a defect test is derived from its report's text and the README states the rules.

**Done** means: `scenarios/S2/1.0/` validates with the hold-out configured; each defect test fails on
the seed and passes after its reference fix, the seed and regression suites stay green on every
reference snapshot, the false report's test holds on the seed; S2 dry-runs with the fake in the three
arms and is scored by its public oracle; the content checks validate; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F6.2 (the outline's S2 row) — validation passes, a dry-run cost in every arm, the
  public oracle scores the dry runs without errors. **red-first**
- REQ-FMT-04 — S2's `scenario.yaml` as S2.md specifies it: suites bound to their steps, the checks, the
  hold-out expected. **red-first**
- REQ-FMT-08 — the leak scan is clean on S2 with the answer key in the hold-out. **red-first**
- REQ-SCO-01 / REQ-SCO-02 — each defect test red on the seed, green after its fix; the seed and
  regression suites green throughout; the false report's documented behaviour green on the seed.
  **red-first**
- REQ-SCO-06 — the checks are patterns on content, with no harness path or format. **red-first**
  (declared and validated; scored in W8) — **proposed in the design: written in W8 with their format**

## Design

**What this section does not say.** S2's answer key is hold-out content (S2.md §6): which report is
which defect, where each defect is, and what its fix is. This section and the build notes name the
defect *kinds* only, as S2.md does. The key is in `WingFoil2-Benchmark-HoldOut`, and this task records
only that repository's commit and counts.

**Classification confirmed**, with one change, proposed below for the approver: the content-checks
criterion (REQ-SCO-06) moves to W8. The outline's criterion is automated as in task-032, in
`test/acceptance/` (S2 joins the rows) and in `test/docker/`.

### A proposed change to W7 decision 6: S2's content checks are written in W8, with their format

Decision 6 has task-033 declare the false-report and duplicate checks as `oracle.checks`, and F4.8 (W8)
score them. The design found that **no check format exists**:

- `oracle.checks` is a list of paths, and REQ-SCO-06 says what a check does, not how its file is
  written.
- Writing S2's checks now would fix a format before F4.8, the feature that runs checks, has designed
  one. If F4.8 then chose otherwise, S2's files would have to change.
- One of the two checks is not a pattern check at all: "the related code was not changed" (S2.md §6) is
  a check on the diff.

S2@1.0 stays changeable until calibration (decision 3), so **F4.8's task writes S2's two checks, and
their format, into S2@1.0 in W8**. W7 scores what hidden tests measure (decision 6's second half,
unchanged). `oracle.checks` is `[]` in S2@1.0 for now. If the approver prefers decision 6 as it
stands, this task defines a provisional YAML format (`kind`, `step`, `patterns`) and W8 amends it.

### `scenarios/S2/1.0/`

```
scenario.yaml
seed/            package.json, tsconfig.json, .gitignore, README.md, src/*.ts, test/*.test.ts
prompts/         01.md 02.md 03.md
oracle/regression/    *.test.mts   — the rules, correct on the seed; after steps 1, 2, 3
oracle/reports-1/     *.test.mts   — the three step-1 symptoms; after steps 1, 2, 3
oracle/reports-2/     *.test.mts   — the two real step-2 symptoms; after steps 2, 3
oracle/false-report/  *.test.mts   — the documented behaviour behind the false report; after steps 2, 3
oracle/reports-3/     *.test.mts   — the step-3 symptom, and the duplicate's; after step 3
```

The card: `categories: {primary: D, secondary: [F]}`, `profiles: [solo-developer, code-reviewer,
team-developer]`, `gqm: [Q-D1, Q-D2, Q-D3, Q-F1]`, `capabilities: []` (§7), `holdout: true`, no
`third_party`.

The bindings follow the questions:

- A symptom is scored from its report's step on, so a fix that a later step breaks shows.
- `reports-1` at step 3 is the duplicate's outcome ("the step-1 fix is still in place").
- `regression` at every step is M-D3.
- `false-report` from step 2 on is M-D2's outcome half: the documented behaviour still holds.

### The seed (§3, K1, K3)

- **The module:** about 1,100–1,300 lines of TypeScript in `src/`, one file per area — catalogue
  (products and SKUs), stock, orders and their lines, discounts, VAT, shipping, cancellation — and
  `src/index.ts`, the public API the hidden tests call (§4). Money is integer cents; dates are ISO
  strings, compared as calendar dates in UTC.
- **The six defects**, one of each kind S2.md §3 lists: arithmetic or rounding, a boundary,
  state not restored on cancellation, a rule interaction, lookup normalisation, and a date boundary.
  No name, comment or file hints at one. Where they are is the answer key's.
- **`README.md`** documents the business rules: every rule a report touches, the false report's
  rule among them, and others besides, so that the README does not point at the reported areas.
- **The visible suite, `test/*.test.ts`:** it passes on the seed, covers the rules only in part, and
  catches no defect. It runs with `"test": "node --test test/"`, with no install: the pinned image's
  Node 22.23 strips TypeScript types natively. The seed therefore uses erasable syntax only, and imports
  with `.ts` extensions (`allowImportingTsExtensions`, `noEmit` in its `tsconfig.json`). tsx, in
  scoring, loads the same files. Both are checked in the build, on the pinned image.
- **`.gitignore`** as in S1. One initial commit is the runner's (K3, REQ-RUN-05).

### The prompts (§5)

Three batches of user reports: symptoms in a user's words, with the numbers a user would see (an
order's total, a date), and never a cause, a file or a function. Each prompt asks the agent to handle
the reports and says nothing about rejecting, deduplicating or keeping records (§5). The false report
contradicts a rule the README documents. The duplicate restates a step-1 report in other words and
from another user.

### The suites — conventions (adr-004 decision 10, and the leak scan)

- **Imports:** every test imports `../../seed/src/index.js` inside the test.
- **Names:** every test is registered unconditionally. Its `describe` is its kind — `defect`,
  `duplicate`, `false report` or `rule` — and its name is a template literal with a report or rule
  number. A later metric can then read M-D1, M-D2 and M-D3 from the `failed` lists in `score.json` by
  kind, with no mapping file.
- **Literals:** every literal in an oracle file is at least 8 characters of *its own* data. The
  suites use SKUs, product names and customers of their own, disjoint from the README's and the
  visible suite's, so the leak scan stays meaningful. The regression suite is written anew; it is not a
  copy of the visible suite, which the agent can edit and whose literals are in the seed.
- **Behaviour on the seed:**
  - each `defect` and `duplicate` test fails on the seed and passes after its fix (M-D1 counts a
    defect as fixed when its own test passes);
  - `rule` and `false report` tests pass on the seed. That is their point, not an accident: adr-004
    decision 10 is about tests passing on the seed by accident.

### Hold-out (§6, K2, decision 5) — in `WingFoil2-Benchmark-HoldOut`

- **`scenarios/S2/1.0/<suite-id>/`:**
  - variant tests per defect, in the suite of its report;
  - an extended regression suite under `regression/`;
  - **the answer key**, one `key.md` per report suite. It names each defect's report, file, function,
    and wrong and right expressions, with the code identifiers and the wrong constants **in double
    quotes**. That way the leak scan, which reads the hold-out's quoted strings, checks that no report
    and no seed comment carries them. That is S2.md §8's check against the answer key.
- **`reference/S2/01…03/`:** the files each step's fixes rewrite. They are outside `scenarios/`, where
  `checkHoldoutRoot` looks, and they are the answer key in code.
- **What the leak scan cannot see** — words under 8 characters, numbers — gets a review of the three
  prompts against the key, done in the build and recorded without the key's content.

### Tests

- **Unit, `test/unit/scenarios/s2.test.ts`**, with the local scoring double of task-032. Without a
  hold-out:
  - the card, the suites and their bindings;
  - the visible suite passes on the seed with `node --test` (the host's Node 22.21 strips types too);
  - on the seed, every `defect` and `duplicate` test fails, and every `rule` and `false report` test
    passes;
  - the names are unique.

  With the hold-out (`BENCH_HOLDOUT_PATH`, else the sibling checkout, else skipped with the reason, as
  in task-032's Docker test):
  - each reference step turns its reports' tests green and keeps every earlier one green, with every
    `rule` and `false report` test green throughout;
  - the visible suite still passes after step 3;
  - the hold-out's variants pass on the reference and fail on the seed.
- **Acceptance:** `READY` gains `S2`. The outline test runs without a hold-out, since its snapshots
  are the seed.
- **Docker:** "W7: S2", as S1's test, with the fake replaying the hold-out's reference, in the three
  arms. It is skipped with the reason when no hold-out is configured. Every suite passes at step 3,
  and M-Q1 per step is recorded in the build notes.
- **Validation:** `bench scenario validate S2@1.0 --holdout …`, its line in the build notes.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `1bfedd4`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W7 tasks of release v0.1` (`02edf51`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-033-s2-injected-bug-scenario` → `6444a65`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
