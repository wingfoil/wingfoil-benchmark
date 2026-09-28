---
id: task-018-scenario-versioning
type: task
title: "Scenario versioning"
status: approved
release: v0.1
wave: W4
features: [F3.4]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-09, REQ-FMT-06]
---

## Context

Third task of wave **W4 — Scenario hygiene** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
It builds on task-017 (the validator).

Scope of F3.4:

- **A scenario version's content hash (REQ-FMT-09).** Computed over everything a run of that version
  depends on — `scenario.yaml`, the seed, the prompts, the public oracle, and its `arms/<arm>/`
  configuration (dl-005) — deterministically, whatever the machine and the order files are read in.
  Whether hold-out additions are part of it is this task's design decision (they are not in the
  public repository, and a public rerun must still be able to check the hash).
- **Results record it**: `run.json` names the hash of the version it ran.
- **Versions are immutable.** `bench scenario validate` rejects a version whose content no longer
  matches a hash recorded in stored results, and `campaign run` refuses to run it, so that the change
  has to become a new version first (`scenarios.feature` @F3.4). Stored results keep pointing to the
  version they ran.

**Done** means: `scenarios.feature` @F3.4 "Changing a scenario creates a new version" passes; tests,
coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase). All behaviour is new: **red-first**.

- `scenarios.feature` @F3.4 "Changing a scenario creates a new version" — a changed prompt of a version
  with stored results must become a new version before it runs, and the stored results keep pointing
  to the old one. **red-first**
- REQ-FMT-09 — the hash is the same for the same content on any machine and in any read order, and
  differs when any file it covers changes. **red-first**
- REQ-FMT-06 — `run.json` records the hash. **red-first**

## Design

Builds on task-017 (`bench scenario validate`) and on the results layout (REQ-FMT-06). **Classification
confirmed:** all red-first.

### The content hash (REQ-FMT-09) — `scenario/hash.ts`

`scenarioHash(dir)`: every entry under `scenarios/<id>/<version>/` — `scenario.yaml`, the seed, the
prompts, the public oracle, the `arms/<arm>/` configuration, and anything else the directory holds —
listed as `<sha256 of its bytes>  <path relative to the directory, with '/'>`, one line each, sorted
by path (code-unit order), and the SHA-256 of those lines is the hash, written `sha256:<hex>`. A
symbolic link is hashed as its target text, so that changing where it points is a change. The
directory is the unit because the directory is what a version names: whatever is in it, a run could
depend on.

**Hold-out additions are not in it** (the Context's open question). They live in the private
repository, so a public rerun could not recompute a hash that covered them, and REQ-FMT-09's check
would be unverifiable by exactly the readers F3.4 exists for. What the hold-out contributed to a run is
recorded where it is used, with the scoring (W6, `score.json`, REQ-SCO-09).

**The same on any machine.** The hash is taken over bytes, and git may rewrite line endings at
checkout (`core.autocrlf` on Windows). A new `.gitattributes` gives `scenarios/**` the `-text`
attribute: git stores and checks out their bytes unchanged, everywhere, so a clone on any system hashes
the same. (This repository's own checkout uses `autocrlf=input`, which would not alter them either; the
attribute makes it hold for every clone.)

`loadScenario` computes it: `Scenario.hash`.

### Results record it (REQ-FMT-06)

`run.json` gains `scenario_hash`, next to `scenario` and `version`.

### Versions are immutable (REQ-FMT-09, `scenarios.feature` @F3.4)

`results/recorded.ts`: `recordedHashes(resultsRoot, id, version)` reads every
`results/*/*/runs/<id>@<version>/**/run.json` and returns the distinct `scenario_hash` values with one
run each, as evidence. A run recorded before this task has no hash and cannot be compared: it is
skipped, and nothing is inferred from it.

A version whose current hash differs from a recorded one is refused, with an issue at the scenario
that names the recorded run and says to register the change as a new version:
`scenarios[0]: S1@1.0 has changed since results/<campaign-id>/1/runs/S1@1.0/… ran it: register the
change as a new version`. Checked in two places:

- **`checkCampaign`** — so `campaign validate` and `campaign run` refuse it: a changed version
  never runs under its old name. Stored results are never touched: they keep pointing to the version
  and hash they ran with.
- **`bench scenario validate`**, reading `results/` under the root, after the scenario's own checks.

### Tests

- **Acceptance** (`scenarios.feature` @F3.4): a campaign runs S1@1.0 (doubles; its `run.json` gets the
  hash); a step prompt of 1.0 changes; `campaign validate` refuses it naming the recorded run; the
  stored `run.json` still says `1.0` and the old hash; the change copied as 1.1 validates and runs.
- **Unit:** the hash (every kind of file changes it; the same content in another directory or read in
  another order gives the same hash; a link's target is hashed; the hold-out is not), `recordedHashes`
  (several executions, runs without a hash skipped, other versions ignored), the check in both
  commands, `run.json`'s field. The `.gitattributes` rule is checked by a test that asks git
  (`git check-attr text`) for a file under `scenarios/`.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `65c7df3`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W4 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-018-scenario-versioning` → `50b892d`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
- The approver's `memory approve` → `06e7d93` (`pending → backlog`). Matches.
- `npx wingfoil memory submit task-018-scenario-versioning` → `a0dfb96`, in the linked worktree with
  its own `npm ci` (`backlog → in-progress`, one commit, only `status`). Matches.

### Build (TDD)

1. **The hash and the recorded hashes** (`f1ca50c`). 14 tests red, then green. The traceability test
   went red as F3.4 started, and back to green with its acceptance test.
2. **`run.json`, the two checks, `.gitattributes`** (`03a97a0`). 3 red — `@F3.4`, and the
   two `git check-attr` cases — then green at the first implementation. The check is one function,
   `versionChange` (module `results`), used by `checkCampaign` and by `bench scenario validate`, so the
   message is written once. The attribute rule is `**/scenarios/** -text`, so that the fixtures'
   scenarios keep their bytes too, not only the repository's `scenarios/`.

### Deviation from the Design

None. One detail the Design left open: `bench scenario validate` names the issue `scenario:`, since it
validates one scenario and has no campaign entry to point at; `checkCampaign` names it `scenarios[<i>]`
as for any other scenario issue.

### Known limits

- A run stored before this task has no `scenario_hash` and is skipped by the check: nothing is inferred
  from it. No such run exists in a results directory of this repository today (`results/` is
  git-ignored and every result so far is in temporary directories or in the scratchpad).
- The check reads every `run.json` of the version at every campaign check: linear in the results kept,
  which for v0.1's campaigns is a few dozen files.

### Review readiness

`npm test` 614/614 (statements 100%, branches 97.45%, functions 100%, lines 100%), `npm run test:bin`
4/4, `npm run test:docker` 4/4, `npm run lint` clean; no `bench*` container left.

### Review and approval

- `npx wingfoil memory submit task-018-…` → `5e67974` (`in-progress → in-review`, one commit, only
  `status` changed). Matches.
- `npx wingfoil memory approve task-018-… --reason "…"` → `5dfbdaf`, run by the approver from the
  worktree (`in-review → approved`, `Approver:`/`Reason:` trailers, only `status` changed). Matches.
