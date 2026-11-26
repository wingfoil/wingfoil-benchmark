---
id: bug-056-the-campaign-gate-refuses-every-campaign-of-test-bin-and-test-docker-whose-fixtures-name-no-campaign-element
type: bug
title: "The campaign gate refuses every campaign of test:bin and test:docker, whose fixtures name no campaign element"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.4","campaign-gates"]
---

## Context

Found by the full suites of 2026-11-26 on task-167's branch at `ac6d130b`, which merged `main` after task-166
(`bench campaign run` refuses to start without its campaign element and the spending consent, REQ-CLI-03 as amended)
was merged and done on the runner's line. task-166's done passed its integrated check, which runs neither `test:bin`
nor `test:docker`. LINT, TEST (2654 passed, 10 skipped), BUILD and the runner's tests are green; the two suites below
are red. task-167's own change touches none of the failing paths.

## Expected

The tests that run `bench campaign run` from a fixture campaign file (`test:bin`, `test:docker`) pass as before
task-166, and still check what they were written for: the budget guard's refusal, a run in a real container, the
Codex, Spec Kit and OpenSpec arms' setup, the time cap, interrupted containers.

## Actual

Every such campaign is refused by the gate before its estimate, with `campaign: not started: no campaign element in
docs/memory/campaign/ names campaigns/<file>.yaml as its campaign_file: file the element and pass its spending gate
(pending → approved) first`:

- `test:bin`, 1 of 22 failed: `test/bin/bench.test.ts`, "W5's Ends with: a campaign refuses to start above the
  ceiling, whatever its options" (it expects the budget guard's refusal and its estimate on stdout).
- `test:docker`, 10 of 24 failed:
  - `codex.test.ts` (task-094), `openspec.test.ts` (task-071) and `speckit.test.ts` (task-066): the arm's setup;
  - `run.test.ts`: the campaign-file run, W6, W2, task-024's time cap, W8 (task-038), W3, bug-003.

Each fixture builds its repository without `docs/memory/campaign/`, so no element names its campaign file.

So every task's full suites stay red from here on, and task-167's rule 5 (`full-suites-gate.sh`) blocks every move to
in-review until this is fixed. The regression is on the runner line's `main`, not yet on `origin/main`.

## Fix (proposed, for the approver's choice)

1. **The fixtures file the element:** each bin and docker fixture writes a campaign element at `approved` naming its
   campaign file, with the helper task-166 added for the unit tests (`writeCampaignElement`,
   `test/support/campaign-fixture.ts`, on the line's `main`). The gate stays as task-166 made it, and W5's test still
   reaches the budget guard. The red tests are the failing suites themselves.
2. **A test-only bypass** (an option or an environment variable that skips the gate): fewer lines, but it is a way
   around a spending gate, and the bin and docker tests would no longer go through the path a real campaign takes.

Option 1 keeps every gate in the tested path. task-166's done check should also name `test:bin` and `test:docker`
for a change to `bench campaign run`; that is a separate point for the workflow, not part of this fix.
