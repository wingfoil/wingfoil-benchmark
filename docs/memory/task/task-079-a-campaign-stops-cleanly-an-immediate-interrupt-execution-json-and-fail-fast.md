---
id: task-079-a-campaign-stops-cleanly-an-immediate-interrupt-execution-json-and-fail-fast
type: task
title: "A campaign stops cleanly: an immediate interrupt, execution.json and fail_fast"
status: backlog
release: v0.2
wave: W14
features: [F1.4]
acceptance:
  - "campaign.feature#An interrupted campaign stops cleanly"
  - "campaign.feature#A campaign stops itself after the same failure repeats"
requirements: [REQ-RUN-19, REQ-FMT-06, REQ-NFR-03]
fixes:
  - bug-013-a-running-campaign-cannot-be-stopped-cleanly-and-keeps-spending-after-systematic-failures
---

## Context

First half of F1.4 and of bug-013's fix (approved for fixing at v0.2's triage, "fix with F1.4"). Today a
SIGINT leaves the current step's agent running and a campaign keeps spending after systematic failures.

**Scope** (REQ-RUN-19's first and last bullets, REQ-FMT-06's `execution.json`, REQ-NFR-03 as amended in 1.26):
- an interrupt (SIGINT or SIGTERM) kills the current step's agent at once, counts it at its bound as a killed step
  (REQ-RUN-08), records the run `interrupted`, removes its container;
- `results/<campaign-id>/<n>/execution.json` records the execution `running`, `completed` or `stopped`, with the
  reason (interrupt, quota, ceiling, `fail_fast`);
- `fail_fast`, opt-in in the campaign file: once *k* runs ended `failed` at the same step with the same `error`, no
  further run starts, as after an interrupt.

**Not here:** `--resume`, `attempts/`, `score --final` (task-080). bug-013 is declared in `fixes` by both tasks and
moves to `fixed` after task-080.

**Done** means: the two scenarios have acceptance tests, green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `campaign.feature#An interrupted campaign stops cleanly`: **red-first**. Today nothing handles SIGINT or SIGTERM,
  no run is ever `interrupted` and no `execution.json` exists.
- `campaign.feature#A campaign stops itself after the same failure repeats`: **red-first**. No `fail_fast` field
  exists, and every failed run lets the next one start (REQ-NFR-03 before 1.26).

## Design

**Fixes:** bug-013 (first half: the clean stop and fail-fast; task-080 adds the resume, after which bug-013 is
`fixed`).

**1. The interrupt reaches the runner as an `AbortSignal`** (`RunnerOptions.signal`, optional). The runner never
touches `process`: the command line owns the signals (REQ-ARC-04, the ports stay injectable).
- `bench campaign run` creates an `AbortController` and listens with `process.once` for `SIGINT` and `SIGTERM`; the
  first one aborts it and logs `interrupt: stopping after the current step's agent is killed`. Because the listener
  is `once`, a second signal gets Node's default handling and ends the process at once: an escape hatch if the
  clean stop hangs. Both listeners are removed when the command returns.
- `bench scenario dry-run` gets the same wiring, through the same helper: it runs through the same `runPlan`, and
  calibration's dry runs with the real agent are where a clean stop saves money. Its results get no
  `execution.json` (point 3).

**2. What an abort does in the runner** (REQ-RUN-19 first bullet):
- **The current step's agent is killed at once:** once a run's container exists, an abort listener removes it
  (`docker rm --force`), which kills every process in it, the agent's included; the pending `docker exec` returns.
  The `finally` that removes the container today does not remove it twice.
- **The step is counted at its bound**, as a step killed at `step_time_s` (REQ-RUN-08, task-024): the invocation
  that was running gets the cost bound it was given (`costBoundUsd`, `cost_reported: false`), whatever it reported.
  The step keeps its snapshot, its usage and its transcript, as a killed step does; the workspace is on the host, so
  the commit and the patch are still made after the container is gone. The step's outcome is `interrupted`.
- **An abort between invocations** (before an approver's resume, or during a rate limit's wait, which an abort
  cuts short) ends the step `interrupted` with its cost as reported: no invocation was running to bound.
- **The run is recorded `interrupted`** (a new `RunOutcomeKind`; `run.json` `outcome: interrupted`), whether the
  abort came during a step, between two steps, during the setup or before the container started. A run that had
  already ended keeps its own outcome.
- **No further run starts:** `runPlan` checks the signal before each run, as it checks the ceiling.

**3. `execution.json`** (REQ-FMT-06 as amended), beside `campaign.yaml`, for a campaign's execution only (a dry run
is not an execution of a campaign, REQ-RES-01):
- written when the execution starts: `{"state": "running", "started": <ISO date>}`;
- rewritten when it ends: `state` `completed` when every planned run started and ended, otherwise `stopped`, with
  `reason` one of `interrupt`, `quota`, `ceiling`, `fail_fast`, a `detail` sentence (for `fail_fast`, the step and
  the error; for `ceiling`, what was spent), and `ended`;
- an exception that stops the execution itself (no Docker, a failed image build) records `stopped` with reason
  `error` and its message, then is rethrown as today: an execution is never left `running` by the runner. This
  reason is not in REQ-RUN-19's list; it is the honest record of "why it stopped" that REQ-FMT-06 asks for.
- `RunSummary.outcome` gains `interrupted` and `fail_fast`; the existing `budget exhausted` and `quota exhausted`
  map to the `ceiling` and `quota` reasons. The command line prints `campaign ended: <outcome>` as today, then the
  cost, and exits 1 (`EXIT.failure`), as an execution that did not complete does today.
- The dates are taken from an injectable clock (`RunnerOptions.date`, defaulting to `new Date()`), so tests compare
  exact values.

**4. `fail_fast`** (REQ-FMT-01 as amended: `fail_fast: {same_error: <k>}`, optional, `k` a positive integer; the
campaign schema in `src/core/campaign.ts`). Being in the file, it is part of the campaign's identity.
- `runPlan` counts the runs that ended `failed` by the pair (step number, `error` text). The step number is the one
  the run was in when it failed, `0` for a failure before step 1 (setup, container); it is kept on the in-memory
  `RunResult` (`failedStep`), not in `run.json`, which REQ-FMT-06 does not extend for it.
- When a pair reaches `k`, no further run starts: the execution is `stopped` with reason `fail_fast` and a detail
  naming the step, the count and the error. The comparison is exact, as REQ-RUN-19 says ("the same `error` text"):
  an error that carries a run's own path or name (a setup failure names its output directory) never matches
  another run's. That is a property of the rule as specified, recorded here, not widened by judgement.
- Without `fail_fast`, a failed run still does not stop the campaign (REQ-NFR-03).

**5. Not here:** `--resume`, `attempts/`, `score` reading `execution.json` and `--final` (task-080); the site reading
the execution's dates from `execution.json` (REQ-RES-02 as amended, with the site's tasks); committing
`execution.json` at publication (REQ-RES-04/06 as amended).

**Tests** (red first, each committed apart from the code):
- acceptance, `test/acceptance/campaign.test.ts`: `@F1.4 An interrupted campaign stops cleanly` (a campaign of
  three runs; the fake agent's second run aborts the signal during its step 1 and fails as a killed process does;
  checked: run 2 `interrupted`, its step 1 `interrupted` at its cost bound, its container removed, run 3 never
  created, `execution.json` `stopped` / `interrupt` with both dates) and `@F1.4 A campaign stops itself after the
  same failure repeats` (`fail_fast: {same_error: 2}`, four runs, the first two fail at step 1 with the same error;
  checked: no third container, `execution.json` `stopped` / `fail_fast` naming step 1 and the error);
- unit: the campaign schema accepts `fail_fast` and refuses `0`, a fraction and unknown keys; an abort during a
  rate limit's wait and between invocations; a completed execution's `execution.json`; `ceiling` and `quota`
  reasons; an exception records `error`; different errors or different steps do not trip `fail_fast`; dry runs write
  no `execution.json`; the command line turns an emitted `SIGINT` into a stopped execution, prints
  `campaign ended: interrupted` and exits 1, and leaves no listener behind.

## Execution notes

## Review notes
