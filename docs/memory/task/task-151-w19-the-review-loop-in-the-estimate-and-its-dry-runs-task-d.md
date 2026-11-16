---
id: task-151-w19-the-review-loop-in-the-estimate-and-its-dry-runs-task-d
type: task
title: "W19: the review loop in the estimate, and its dry runs (task D)"
status: in-review
release: v0.3
wave: W19
features: [F4.9]
acceptance:
  - "campaign.feature#A dry run measures the loop"
requirements: [REQ-CLI-02, REQ-CLI-03, REQ-CLI-05, REQ-RUN-08, REQ-RUN-21, REQ-SCO-16]
fixes: []
tags: ["v0.3","review-loop","w19"]
---

## Context

W19's task D, the wave's last, after
[task-148](task-148-w19-the-campaign-s-review-loop-entry-the-review-prompts-and-the-findings-format-task-a.md)
(the entry and the prompts), [task-149](task-149-w19-the-review-loop-in-the-runner-task-b.md) (the loop in the runner)
and [task-150](task-150-w19-the-review-loop-s-metrics-and-its-pages-task-c.md) (M-V1–M-V3 and the pages). It prices the
loop in the estimate as REQ-CLI-02 and REQ-CLI-03 state (requirements 1.58), pins a loop in the dry-run profile, and,
on the approver's spending consent, runs the dry runs that end W19: "the review-loop metrics in the dry runs"
([rel-v0-3](../release/rel-v0-3.md)).

State read on 2026-11-16 (main after task-150's merge): `estimateCampaign` (`src/runner/estimate.ts`) prices each
scenario × arm × model key at its completed dry runs (`findDryRuns`), steps only; a campaign with `review_loop` is
estimated as if it had none, so its budget guard counts no loop. A dry-run profile may carry `review_loop` and the dry
run then records its loop (task-149); `scenarios/dry-run.yaml` carries none. No dry run has a loop yet. The approver's
choice 2 of 2026-11-13 (task-147): the reviewer is Claude Code on `claude-sonnet-5-5` at `medium`, every arm; at most 5
rounds.

## Acceptance criteria

<!-- Each red first unless marked: a failing test before the code; `acceptance` lists the scenarios as written. -->

1. **"A dry run measures the loop"** (task-147's draft, added to `campaign.feature` with its test red first): a dry run
   of S2 1.1 in `baseline` under a profile that pins a loop records it, and the estimate reads it under
   `review/S2@1.1/baseline/<model>`, the run's model; a dry run whose loop pins differ from the campaign's is not read.
2. **The loop's keys** (unit, red first, REQ-CLI-02 as amended in 1.58): a campaign with `review_loop` adds, for every
   key with runs left, a line `review/<scenario>@<version>/<arm>/<model>` priced at the completed dry runs of that key
   whose `review/loop.json` records the campaign's loop pins (the reviewer's agent and version, model, effort, both
   prompts' SHA-256, `max_rounds`), by the same rule as a step key's (low, mean, high; one dry run plus 35 %); its cost
   in USD from the rounds' usage files, a session at its bound counted at it. A key no such dry run measured is an
   issue, as a step key's is, naming the dry runs skipped for other loop pins. A campaign without `review_loop` is
   estimated byte for byte as today.
3. **Which loops price a key:** a loop that ran its course (`clean`, `not clean at <n>`, `failed`, `no fix`) counts;
   one stopped from outside (`interrupted`, `quota exhausted`) does not, its cost not the loop's own.
4. **The guard** (unit, red first, REQ-CLI-03 as amended in 1.58): the estimate's totals, the confirmation above
   `warn_eur` and the refusal above `ceiling_eur` count the loops' lines with the steps'; `--resume` prices the loops of
   the runs left; `bench campaign estimate` prints the loop lines apart from the step lines.
5. **The dry-run profile:** `scenarios/dry-run.yaml` gains the `review_loop` entry of choice 2: `claude-code` at the
   profile's agent version, `claude-sonnet-5-5`, `medium`, `review/prompt.md` and `review/fixer-prompt.md` with their
   SHA-256, `max_rounds: 5`, and the caps proposed in Design; `bench scenario check` and the leak scan pass.
6. **The figures script** (unit, red first): `scripts/review-loop-figures.mjs` prints, for every dry run under
   `results/dry-runs/` with a loop, its key, outcome, rounds, M-V1, M-V2 and M-V3 (reviewer and fixer apart), read with
   task-150's `readLoop` and `runReviewMetrics`; no figure in a note is typed by hand.
7. **The dry runs, on the approver's spending consent only:** before any session, the upper bound of each dry run is
   given in chat (its steps from the latest dry run of the key without a loop, plus the loop's worst case at its caps);
   then S1, S2, S3 and S8 at 1.1 in `baseline` and `wingfoil` on `claude-sonnet-5-5` (eight dry runs, one each), the
   approver's to widen or narrow. Their figures, from the script, go to `docs/calibration/v0.3-review-loop.md`, and
   W19's "Ends with" is recorded in `rel-v0-3`.
8. Checks: prettier, tsc, eslint, `scripts/pre-review.sh main`, the estimate's and the dry run's tests, and
   `test/unit/runner` whole; an independent review (dl-020); the full suites on the approver's go.

## Design

- **The estimate:** `estimateCampaign` gains a second pass over the same keys when `campaign.spec.review_loop` is set:
  `findLoopDryRuns(resultsRoot, key, loopPins)` (new, `src/results/dry-runs.ts`) reads each completed dry run's
  `review/loop.json` through `readLoop`, keeps those whose pins match and whose outcome counts (criterion 3), and
  returns their loop costs in USD and the skipped ones with why. `EstimateLine` gains `kind: 'steps' | 'review'`;
  the totals sum both kinds, so `guardFigure` and `campaign run`'s confirmation read them unchanged.
- **The loop's pins** in `loop.json` (task-149) are the reviewer's agent, model, effort, both prompts' SHA-256 and
  `max_rounds`; the agent's version is in `reviewer.agent.version`. The caps are not part of the match: they bound a
  loop, they do not change what a loop that stayed under them cost.
- **The profile's caps, proposed:** `session_time_s: 1800` and `session_tokens: 10000000` (the profile's step caps),
  `session_cost_eur: 2`, `fixer_interventions: 5`. A dry run's worst case is then 5 reviewers and 4 fixers (none after
  the last round) × 2 EUR = 18 EUR above its steps, a bound and not an expectation (corrected in review round 2).
- **Not in this task:** a campaign file gaining `review_loop` (the reference campaign's, step 5 of plan-005); the
  calibration's dry runs in every arm (step 3); the transcripts' packing of loops (REQ-CLI-11).
- **For the approver's gate:** criterion 3 (stopped loops do not price), the caps above, and criterion 7's eight dry
  runs.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

- 2026-11-16: backlog → in-progress on main; worktree `../WingFoil2-Benchmark-wt/t151`, branched from task-150's
  approved branch (this task reads its `readLoop`), main merged in for this task's own record.
- **Red first** (`41e546c1`): `campaign.feature`'s "A dry run measures the loop" with its test (a real
  `scenario dry-run` with the fake agent and a reviewer double, T3 standing in for S2 1.1, then `campaign estimate`);
  `test/unit/runner/estimate-loop.test.ts` (the loop keys, the margin and resume, a bound, stopped loops, each pin,
  no loop, a campaign without one); `test/bin/review-loop-figures.test.ts`. The loop records' fixture gains the
  reviewer's pins.
- **The work** (`87a27826`):
  - `src/results/review.ts`: `readLoop` returns both prompts' SHA-256.
  - `src/results/dry-runs.ts`: `findLoopDryRuns` (the step key's dry runs, then each one's loop: its pins compared,
    a stopped loop left out, its cost in USD from the sessions, bounds included) and `LoopPins`.
  - `src/runner/estimate.ts`: a `review/<scenario>@<version>/<arm>/<model>` line after each key's line when the
    campaign pins a loop, priced by the same rule (`priced`); its issue names the dry runs skipped; the totals, so the
    guard, count it.
  - `scenarios/dry-run.yaml`: choice 2's loop with the proposed caps; its test (`test/unit/scenario/dry-run.test.ts`)
    written after the profile, as characterization: the pins, and the prompts against their SHA-256 and the scan on
    S1, S2, S3 and S8 at 1.1.
  - `scripts/review-loop-figures.mjs` (on `dist/`, as `step-a-reading.mjs`).
  - `test/support/dry-run-fixture.ts`: `priceCampaign` prices a loop too; two task-149 tests of `campaign run` with a
    loop needed it once the estimate priced loops.
- Checks so far: `test/unit/runner`, `test/unit/cli`, `test/unit/results`, `test/unit/scenario` and
  `test/acceptance/campaign.test.ts` whole green (1107 tests); the figures script's bin test green.
- **Criterion 7's dry runs come after the merge:** real-agent runs start from the main checkout, which needs this
  branch's code; so the gate approves criteria 1–6, and after the merge, on the approver's spending consent, the eight
  dry runs run, their figures go to `docs/calibration/v0.3-review-loop.md` from the script and W19's "Ends with" to
  `rel-v0-3`, before approved → done. Upper bounds, read by a scratchpad script from each key's latest completed dry
  run (steps, Sonnet at medium) plus the loop's 18 EUR: 18.19 to 18.66 EUR each, 147.07 EUR for the eight; at the
  run's cap instead of the latest steps, 23 EUR each, 184 EUR.

## Review

- **Round 1** (a fresh read-only agent in a clone under `mktemp`, on `e7ce54b1`, 2026-11-16): no blocker, three
  should-fix, seven nits.
  - **Should-fix, fixed:** criterion 3 is now an allow-list (`clean`, `not clean at <n>`, `failed`, `no fix`), and a
    loop whose reviewer never ran (a `failed` before round 1: an infrastructure error, no reviewer given) prices
    nothing, its reason named; both tested. Before, a `no loop` or such a `failed` priced a key at 0 USD.
  - **Should-fix, fixed:** with a profile that pins a loop, `scenario dry-run`'s refusal and its expected-spending line
    add the loop's worst case (`max_rounds` × 2 sessions × `session_cost_eur`, 20 EUR on the profile) beside the run's
    cap, and say the latest dry run's cost is its steps only; tested.
  - **Should-fix, fixed:** a command-line test of the guard: `campaign estimate`'s guard line and `campaign run`'s
    refusal with steps under the ceiling and the loop over it.
  - **Nits, fixed:** the loop lines are printed after the step lines; the figures script shows `—` for a loop that never
    ran (tested); criterion 6 names `.mjs`; the profile's header says it pins a loop the v0.2 reference does not.
    **Kept:** an unreadable loop record is named only when no dry run prices the key, as `findDryRuns` treats an
    unreadable `run.json`; the agent's name is matched with its version (stricter); the profile's test is
    characterization, as said above.
  - **For the gate:** every dry run on the default profile now runs and pays for a loop; a step-only dry run needs
    another profile (`--profile`), there is no flag to skip the loop.
- **Round 2** (a second fresh agent, on round 1's fixes, `e7ce54b1..736f76b1`): no blocker, two should-fix, four nits.
  - **Should-fix, fixed:** the loop's worst case counted a fixer after the last round, which never runs: it is
    (2 × `max_rounds` − 1) × `session_cost_eur`, 18 EUR on the profile, not 20 (Design's "20 EUR" read the same
    way and is corrected here); and it is rounded to the cent, so a cap like 0.1 EUR prints no float noise.
  - **Nits, fixed:** a test of the lines' order (two keys, the step lines first); a test of the second dry run's
    "its steps only" line; a `no loop` with a reviewer session, alone, pins the allow-list; a stray blank line and an
    over-long line in `dry-runs.ts`. Noted, not changed here: `.prettierignore`'s `results/` (no leading slash) also
    ignores `src/results/`, older than this task; anchoring it would reformat the folder, a change of its own.
- **Round 3** (a third fresh agent, on round 2's fixes, `736f76b1..13ddb1d2`): no blocker, no should-fix; the bound
  checked against the runner (no fixer after the last round, a reviewer's resumes within its session cap), each new
  test failing with its fix removed. One nit, fixed: Design's figure now reads 18 EUR.

Pre-review green at `13ddb1d2`.
