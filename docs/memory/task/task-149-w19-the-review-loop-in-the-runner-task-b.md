---
id: task-149-w19-the-review-loop-in-the-runner-task-b
type: task
title: "W19: the review loop in the runner (task B)"
status: in-progress
release: v0.3
wave: W19
features: [F4.9]
acceptance:
  - "runner.feature#The review loop runs after the last step, never changing what is scored"
  - "runner.feature#A run that did not complete has no loop"
  - "runner.feature#The reviewer sees the code without what the setup installed"
  - "runner.feature#A later round reviews the whole copy, pointed at the fix"
  - "runner.feature#A reviewer whose findings do not parse ends the loop as failed"
  - "runner.feature#A fixer that changes nothing ends the loop"
  - "runner.feature#The fixer works with the arm's harness as in a step"
  - "runner.feature#A quota rejection in a loop stops the campaign"
  - "runner.feature#A fixer that reaches its intervention cap ends the loop"
  - "runner.feature#An interrupted loop is not resumed"
  - "runner.feature#A round with a blocker or a should-fix is fixed and its fix re-reviewed"
  - "runner.feature#A round with nits only closes the loop"
  - "runner.feature#A loop that does not close by the cap is not clean"
  - "runner.feature#A reviewer that changes the copy ends the loop as failed"
  - "runner.feature#A loop session killed at its cap keeps the run's results"
requirements: [REQ-RUN-21, REQ-FMT-06, REQ-FMT-08, REQ-RUN-01, REQ-RUN-02, REQ-RUN-08, REQ-RUN-09, REQ-RUN-13, REQ-RUN-19, REQ-CLI-05]
fixes: []
tags: ["v0.3","review-loop","w19"]
---

## Context

W19's task B, after
[task-148](task-148-w19-the-campaign-s-review-loop-entry-the-review-prompts-and-the-findings-format-task-a.md)
(task A: the `review_loop` entry, the two prompts, `parseFindings`). It runs the loop REQ-RUN-21 states (requirements
1.58, the approver's choices of 2026-11-13) after every completed run of a campaign or a dry run that pins one, and
records it as REQ-FMT-06 states. Task C reads M-V1 to M-V3 and publishes the loop; task D adds the estimate's loop
keys (REQ-CLI-02, REQ-CLI-03) and runs the dry runs on the approver's consent.

State read on 2026-11-14 (main `97b451f7`): `executeRun` (`src/runner/run.ts`) records a completed run and removes its
container in its `finally`; a failure after the interrupt is read as the interrupt by its `catch`, so a loop placed
inside that `try` would turn a completed run into an interrupted one. `executeStep` writes under
`steps/<n>/` and reads its caps from `pins.caps`. `RunnerOptions.agent` is the campaign's agent only; nothing builds
a second image. `RunPins` does not carry `review_loop`. Code and tests only, with the fake agent and the docker and
git doubles; no real session, nothing spent.

## Acceptance criteria

<!-- Each red first unless marked: a failing test before the code; `acceptance` lists the scenarios as written. -->

The fifteen `runner.feature` scenarios drafted in
[task-147](task-147-w19-s-requirements-and-acceptance-the-review-loop-f4.9.md)'s Execution notes, each added to
`runner.feature` with its test red first in `test/acceptance/runner.test.ts`, grouped by what they prove:

1. **Where the loop runs** ("The review loop runs after the last step, never changing what is scored", "A run that
   did not complete has no loop"): a completed run of a campaign or a dry run whose pins hold `review_loop` runs the
   loop after its last step's commit and patch are stored and before its container is removed; any other outcome
   writes `review/loop.json` with `no loop` and the run's outcome, and starts no session. The run's `run.json`,
   stored patches, `commits.json`, verdict ledgers and scores are byte-identical with and without the loop
   (a test runs the same fake run both ways). Without `review_loop`, no run holds `review/` (task A's
   characterization stays green).
2. **The reviewer's copy** ("The reviewer sees the code without what the setup installed", "A later round reviews
   the whole copy, pointed at the fix"): a fresh git repository outside the workspace, two commits (the stripped seed,
   the stripped final tree; neutral fixed messages, no author of the run), without every path the setup added (read
   from the seed tree against the setup's tree, kept stripped when a step changed it) and the reserved names of
   REQ-FMT-08 anywhere; a seed path the setup changed keeps its final content. Round k > 1 commits the stripped tree
   after fix k−1 over the stripped tree before it. The runner's preamble names the two commits; the reviewer is
   pointed at their diff. No step prompt, oracle file or hold-out file reaches it.
3. **The reviewer's session** ("A reviewer whose findings do not parse ends the loop as failed", "A reviewer that
   changes the copy ends the loop as failed"): the pinned agent, version, model and effort with `review/prompt.md`
   after the preamble, in a container of its own named under the campaign's prefix from the reviewer's image
   (REQ-RUN-01: the reviewer agent on the same base, nothing of any arm), whose only mount is the copy, with the run's
   network, no MCP server; removed when the round ends, an interrupt included. Its final message goes through
   `parseFindings`; an issue ends the loop `failed` with the issue as its reason. After the session, the copy's tracked
   files and the untracked files git does not ignore are compared with its commit; a change ends the loop `failed`,
   naming the file.
4. **The fixer** ("The fixer works with the arm's harness as in a step", "A round with a blocker or a should-fix is
   fixed and its fix re-reviewed", "A fixer that changes nothing ends the loop", "A fixer that reaches its
   intervention cap ends the loop"): the run's own agent and model with `review/fixer-prompt.md` and the round's
   blockers and should-fixes (as JSON, nits left out), in the run's container and workspace, with the arm's MCP
   configuration and the verdict hook as a step, answered by the campaign's approver policy; no image is made.
   `fix.patch` is the workspace's tree before against after (whatever the fixer committed), scrubbed as a step's;
   its ledger is the round's `verdicts.json`. A patch that, stripped as the copy is, changes nothing ends the loop
   `no fix`; reaching `fixer_interventions` ends it `failed`.
5. **The closing rule** ("A round with nits only closes the loop", "A loop that does not close by the cap is not
   clean"): a round with nits only, or none, closes `clean` and no fixer runs; after `max_rounds` rounds without
   closing, `not clean at <max_rounds>`, and no further round.
6. **Caps and stops** ("A loop session killed at its cap keeps the run's results", "A quota rejection in a loop
   stops the campaign", "An interrupted loop is not resumed"): each session is capped by `review_loop.caps`
   (`session_time_s`, `session_tokens`, `session_cost_eur`), never by the steps' caps; a session killed at a cap ends
   the loop `failed`. A quota rejection ends it `quota exhausted` and stops the campaign (stop reason `quota`); an
   interrupt ends it `interrupted` and stops the campaign (`interrupt`); `ceiling_eur`, checked before round 1 and
   between rounds with the loops' cost counted in the campaign's spending, ends it `interrupted` with the ceiling as
   its reason and no new run starts. The run stays `completed` with its scores in every case. `--resume` never re-runs
   a completed run's loop: it stays recorded with its rounds so far.
7. **The records** (unit, red first, REQ-FMT-06): `review/loop.json` (the reviewer's pins, both prompts' SHA-256, the
   outcome, its reason for every outcome but `clean`, the rounds), `review/<n>/findings.json`, the reviewer's usage,
   and after a fix `fix.patch`, the fixer's usage and interventions, `verdicts.json`; `reviewer.jsonl` and
   `fixer.jsonl` git-ignored as a step's transcripts; every file scrubbed of the credentials. A loop's usage is never
   summed into a step's or the run's (REQ-RUN-09).
8. **The command line** (unit, red first): `bench campaign run` and `bench scenario dry-run` give the runner the
   reviewer's agent adapter and its credential as REQ-RUN-15 states for that agent (the Claude Code token, read as
   today, never written), whatever the campaign's own agent; the leftover check reports a leftover reviewer container
   as a run's. A dry-run profile with `review_loop` runs and records its loop (REQ-CLI-05); task D runs one.
9. Checks: prettier, tsc, eslint, `scripts/pre-review.sh main`, the runner tests; an independent review (dl-020); the
   full suites on the approver's go.

## Design

- **The placement:** `executeRun` keeps its body; once it has the completed run's record, it calls
  `executeReviewLoop` (new, `src/runner/review-loop.ts`) inside the same `finally` scope, before the container's
  removal, in a `try` of its own whose interrupt and failures end the loop, never the run. `executeRun` returns the
  run with a `loop` field read by `executeRuns` only (stop on `quota exhausted` or `interrupted`, the loop's cost added
  to `spent`); `record` leaves it out of `run.json`.
- **The session core:** `executeStep`'s invocation loop (rate-limit waits, interventions, verdict hook, caps, the
  patch and the scrub) moves into `executeSession(request, caps, dir)`, `executeStep` its first caller with
  `pins.caps` and `steps/<n>/`, the fixer its second with `review_loop.caps` and `review/<n>/`; a step's outputs stay
  byte-identical (the existing runner tests are the characterization).
- **The copy:** `src/runner/review-copy.ts` (new): `strippedPaths(seedTree, setupTree, git)` and
  `commitCopy(copyDir, tree, message, git)`, through `GitPort` (gains what it lacks to write a tree into a fresh
  repository and to list untracked, non-ignored files); the reserved names are read from `src/scenario/leak-scan.ts`'s
  `RESERVED_ANYWHERE` and `RESERVED_AT_ROOT` (exported), one list for the scan and the stripping.
- **The reviewer:** `RunnerOptions.reviewer?: { agent: AgentPort; containerEnv; secrets }`; its image `<id>-review`
  built by `buildRunImage`'s path with the reviewer agent's profile and no arm; its container mounts the copy only
  (`assertOnlyWorkspaceMounted` reused).
- **The pins:** `RunPins` picks `review_loop`; `campaignPlan` and `runDryRun` pass it unchanged.
- **Not in this task:** the estimate's loop keys, the metrics, the site, the asset packing (REQ-CLI-11), any campaign
  or profile file gaining the entry (task D's).

## Execution notes

- 2026-11-14: backlog → in-progress on main; worktree `../WingFoil2-Benchmark-wt/t149`.
- **Red first** (`eb8fec7a`): the fifteen scenarios in `runner.feature` (1.2) with their tests in
  `test/acceptance/runner.test.ts`, and `test/unit/runner/review-loop.test.ts` (the records' ignore rules, the loop's
  cost in the campaign's spending, a leftover reviewer container, the reviewer container's removal, the command line,
  a dry run's loop); `test/support/review-fixture.ts` (a campaign pinning a loop with the fake agent as reviewer, a
  reviewer double); the git double gains `treeOf`, `exportOf`, `dirtyOf`. All red for the absent loop, but the wingfoil
  scenario's first draft, refused for a campaign without `baseline` (now baseline and wingfoil, the wingfoil run read).
- **The work:**
  - `src/core/ports/git.ts`: `exportTree` (a throwaway index and `checkout-index`, rather than `archive`, whose
    `export-ignore` would drop files), `dirtyPaths` (`status --porcelain -z --untracked-files=all`), and
    `commitAll`'s `identity`; their unit tests in `test/unit/ports/git.test.ts` written after the code, as verification.
  - `src/runner/review-copy.ts` (new): `setupAddedPaths`, `isStripped` (the setup's added paths, REQ-FMT-08's reserved
    names from `leak-scan.ts`, now exported), `buildReviewCopy` (a fresh two-commit repository per round, the empty
    directories pruned, committed by a neutral `Project <project@localhost>`).
  - `src/runner/review-loop.ts` (new): `executeReviewLoop`, which never throws; `reviewRound` (the reviewer's container
    from `<id>-review`, the copy its only mount, the loop's caps, the read-only check, `parseFindings`); `fixRound`
    (`executeStep` with the loop's caps as its pins, `fixer_interventions` as the policy's cap, `session` for its
    records); `writeLoop`, `writeNoLoop`.
  - `src/runner/run.ts`: `executeStep`'s `session` (prompt, directory, commit message; no `commits.json` or
    `usage.json`, `fix.patch` and `fixer.jsonl`); `openContainer`'s `arm` optional; `executeRun`'s `finish` around
    every record, awaited inside the `try` before the `finally` removes the container; `executeRuns` builds the
    reviewer's image, adds a loop's cost to `spent`, and stops on a loop's quota, interrupt or ceiling;
    `RunPins` picks `review_loop`; `RunnerOptions.reviewer`.
  - `src/results/execution.ts`: a run's `review/loop.json` `cost_eur` counts in the execution's spending.
  - `src/cli/shared.ts` `reviewerFor`, called by `campaign run` and `scenario dry-run`; `Ports.reviewerAgent` for the
    tests; `campaign run` says the loops' cost apart from the steps'.
  - `.gitignore`: `results/**/review/*/reviewer.jsonl` and `fixer.jsonl`.
- **Decisions taken while building, for the gate:**
  1. **The copy's identity:** the runner's fixed identity is `WingFoil Benchmark`, a harness name the reviewer would
     read in the copy's history; the copy is committed by `Project <project@localhost>` instead, and the copy test
     refuses `WingFoil` and `Benchmark` in its log.
  2. **No fix after the last round:** a round `max_rounds` with blockers ends the loop `not clean at <max_rounds>`
     without a fixer session, since no round would review that fix (REQ-RUN-21 is silent on it).
  3. **The read-only check** reads the working tree against the copy's commit and any commit made over it; a reviewer
     that checks out an earlier commit to read it is not refused (it changed nothing).
  4. **The reviewer's caps:** a rate limit is waited out and the session resumed as a step's (task-051's waits), the
     quota after the last wait ending the loop `quota exhausted`; its time cap kills it, its cost cap is its
     `--max-budget-usd`, and its tokens over `session_tokens` end the loop `failed` once it reported (review round 1,
     finding 1: the first draft ended the loop at the first rate limit).
  5. **A Codex reviewer** is refused by the command line in v0.3 (the approver's reviewer is Claude Code's, and a second
     credential file is not in the requirements); a reviewer that spends needs `--allow-spending` as the agent does.
  6. **The loop's cost** is recorded in `loop.json` (`cost_eur`), which the execution's spending reads, rather than
     summed again from the round files.
  7. **The fixer's verdicts:** the fixer is a step without a scripted verdict, so the runner delivers none and its
     `verdicts.json` is an empty ledger for a scenario with an approver; the verdict hook stays installed in the
     container, as the last step left it.
  8. **The copies** under `runs/…/review/<n>/` stay after the loop, git-ignored debris as the run's workspace is.
  9. **The fixer's number** is the step after the last plus the round (`step 03 …` in the log for round 1 of a two-step
     scenario); its interventions carry that number in `fixer-usage.json`.
- Pre-review green at `57da63ee`.

## Review

- **Round 1** (an independent read-only agent, in a clone under `mktemp`, 2026-11-14): no blocker; 3 should-fix, 8
  nits. Fixed:
  - should-fix 1, a reviewer's rate limit ended the loop and stopped the campaign: now waited out and resumed as a
    step's;
  - should-fix 2, the ceiling and the reviewer's token, cost and time caps had no test: tests added
    (`test/unit/runner/review-loop.test.ts`);
  - should-fix 3, a hard kill during a loop left no `loop.json` and lost its cost: `loop.json` is written as
    `interrupted` ("the runner stopped during the loop") before round 1 and after every session, with its cost so far;
  - nit 4, `no fix` is now said before the interrupt and ceiling checks;
  - nit 5, a round whose session ran and ended the loop is in `rounds`, with `findings: null`;
  - nit 7, the prompts' SHA-256 is checked again on the bytes sent;
  - nit 8, the copy test puts an untracked prompt and oracle file in the workspace and finds neither in the copy (the
    `no fix` scenario keeps its tree double: the stripping itself is the copy test's);
  - nit 11, REQ-FMT-08 added to `requirements`.

  Declared rather than changed: nit 6 (decision 7), nit 9 (decision 9), nit 10 (decision 8).
- **Round 2** (a fresh read-only agent on `b702eb86`'s diff, 2026-11-15): no blocker; 1 should-fix, 5 nits. Each fix
  of round 1 checked by removing it and seeing its test fail, but two (the record after a session, the deadline moved
  by a wait). Fixed:
  - should-fix 1, a rate-limited reviewer was resumed over its token cap or with nothing left of its cost cap: now ended
    `failed` at that cap, never resumed, as a step's;
  - nit 2, a session killed by a hard kill was not counted: `loop.json` counts the coming session at its bound
    (`session_cost_eur`) before it starts;
  - nit 3, an injected sleep was not cut short by the interrupt: wrapped in `untilAborted`, as a step's;
  - nit 4, tests added for the record during a session, the deadline moved by a wait, the interrupt during a wait;
  - nit 5, `combine` exported from `run.ts` rather than copied;
  - nit 6, a reviewer resume answered from another session ends the loop `failed`.
  - The acceptance comparison with and without the loop now normalizes the setup's measured `duration_ms`, which made it
    flaky under load.
- **Round 3** (a fresh read-only agent on `3689471b`'s diff, 2026-11-15): no blocker; 1 should-fix, 2 nits; every new
  test of round 2 fails without its fix. Fixed: should-fix 1, a resume answered from another session lost what it
  spent: its usage and transcript are now counted before the session check (test: the stray resume's 0.30 EUR in
  `cost_eur`); nit 3, the interrupt-during-a-wait test failed only on vitest's 60 s timeout without its fix: it has a
  5 s timeout. Nit 2 (a cost of 0 reported with `costUnknown` passes the cost check before a resume) is as a step's,
  kept.
