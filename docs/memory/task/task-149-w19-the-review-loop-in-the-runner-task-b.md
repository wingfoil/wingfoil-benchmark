---
id: task-149-w19-the-review-loop-in-the-runner-task-b
type: task
title: "W19: the review loop in the runner (task B)"
status: pending
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
requirements: [REQ-RUN-21, REQ-FMT-06, REQ-RUN-01, REQ-RUN-02, REQ-RUN-08, REQ-RUN-09, REQ-RUN-13, REQ-RUN-19, REQ-CLI-05]
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

## Review
