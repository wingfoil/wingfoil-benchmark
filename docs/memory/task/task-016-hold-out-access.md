---
id: task-016-hold-out-access
type: task
title: "Hold-out access"
status: backlog
release: v0.1
wave: W4
features: []
acceptance: [runner.feature]
requirements: [REQ-CLI-10, REQ-ARC-03, REQ-FMT-04]
---

## Context

First task of wave **W4 — Scenario hygiene** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
whose "Ends with" is "a scenario validated, with its oracle kept outside the container".

Scope, the integration half of F3.5:

- **Where the hold-out is (REQ-CLI-10).** The path comes from a command's `--holdout <path>` or from
  `BENCH_HOLDOUT_PATH`. It names a checkout of the private `WingFoil2-Benchmark-HoldOut` repository.
- **Its layout (REQ-ARC-03).** It mirrors `scenarios/<id>/<version>/` for its additions. A loader reads
  a scenario version's additions — which files exist, where, and whether the scenario expects any
  (`holdout: true`, REQ-FMT-04) — without printing their content anywhere: not in an issue, not in a
  log, not in a result.
- **Never read by `campaign run` (REQ-CLI-10).** The runner neither takes the path nor reads the
  variable; a test proves that a configured hold-out changes nothing in a run and never reaches the
  container (`runner.feature` @F2.1 "A run cannot see the hold-out even if the path is configured",
  task-003's test, kept as a characterization).
- Its first user is the validator (task-017); scoring (W6) is its second.

**Why `features` is empty.** F3.5's two acceptance scenarios are about scoring: hold-out tests executed
on a run's snapshots and reported apart in `score.json` (REQ-SCO-09). Scoring is W6 (F4.1). The task
that delivers them declares F3.5 then, as task-015 declared F2.5 for W3 (W4 plan-phase decision 1).

Hold-out content is never written in this repository (plan-003 constraint): the tests build their
hold-outs in temporary directories, from T-scenario data that is not benchmark content.

### W4 plan-phase decisions (accepted by the approver, 2026-09-25)

1. **F3.5 is split between W4 and W6.** W4 delivers the hold-out's integration (this task) and its
   scanning by the validator (task-017); the two scoring scenarios go with F4.1 in W6, where a task
   declares F3.5. No amendment: the sequencer's W4 row keeps F3.5, whose scoring half cannot be tested
   before a scorer exists.
2. **Five tasks:** task-016 hold-out access, task-017 validator and leak scan (F3.2), task-018 scenario
   versioning (F3.4), task-020 real-agent runs declared in delivery and the spending ledger
   ([dl-006](../decision-log/dl-006-real-agent-runs-during-delivery-are-declared-by-the-workflow.md)),
   task-019 bug-006 — task-020 before task-019, so that task-019's real sessions are the first entries
   the ledger records as they happen. bug-005 stays with the triage of release v0.2, as it says.
3. **bug-006 is fixed in W4**, before the dry runs of W5, which are real runs.
4. **W4's "Ends with" is verified offline**: `bench scenario validate` on a T-scenario with a hold-out
   in a temporary directory, and the docker suite's existing proof that a run's container holds no
   oracle. No spending, except what task-019 is authorised.

**Done** means: the hold-out path is resolved from the option or the variable, a scenario version's
additions are read and reported without their content, `campaign run` ignores the hold-out; tests,
coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `runner.feature` @F2.1 "A run cannot see the hold-out even if the path is configured" —
  **characterization** (task-003's test), extended so that `BENCH_HOLDOUT_PATH` set changes nothing in
  a run.
- REQ-CLI-10 — the path from `--holdout` wins over `BENCH_HOLDOUT_PATH`; a path that does not exist or
  is not a directory is an error naming the path. **red-first**
- REQ-ARC-03 — a scenario version's additions are found at `<holdout>/scenarios/<id>/<version>/`; a
  scenario with `holdout: true` and no additions is reported, one with `holdout: false` and additions
  is reported too. **red-first**
- No hold-out content in any issue, log or stored file. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `607d8a1`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W4 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-016-hold-out-access` → `1329d48`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
