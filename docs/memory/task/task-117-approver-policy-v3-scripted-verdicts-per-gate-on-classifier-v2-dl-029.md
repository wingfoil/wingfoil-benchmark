---
id: task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029
type: task
title: "Approver policy v3: scripted verdicts per gate on classifier v2 (dl-029)"
status: approved
release: v0.3
wave: W17
features: [F2.4]
acceptance: [runner.feature]
requirements: [REQ-RUN-06, REQ-RUN-07, REQ-FMT-04]
fixes: []
tags: ["v0.3","runner","approver"]
---

## Context

[dl-029](../decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md) point 7, the
first of the method's two changes that S10
([task-116](task-116-s10-gates-and-roles-scenario-dl-029.md)) needs before its calibration: **scripted verdicts**,
approve or reject with a fixed reason per gate, declared in the scenario and the same in every arm, as a new approver
policy on classifier v2 (dl-026). v1 and v2 stay frozen; a scenario that declares no verdicts reads v3 as v2. Placed in
v0.3, W17, as task-116. Implemented after task-116's spec fixes the verdicts' shape and timing; one task at a time in
review.

## Acceptance criteria

- A scenario may declare verdicts per step (shape and timing as S10.md fixes them); `validate` refuses a malformed
  declaration, naming it — red-first.
- Policy v3: classifier v2 unchanged; replies to an approval request at a step with verdicts are the scenario's fixed
  texts, each one an intervention, the cap unchanged; without verdicts, v2's replies — red-first.
- A campaign pins v1, v2 or v3; requirements (REQ-RUN-06/07) and the experiment design §3 amended — characterization.

## Design

What S10.md §6 and task-116's Design fix, and how:

1. **The verdict lives on its step** in `scenario.yaml`: `verdict: {kind, text, later?}`, `kind` one of `approve`,
   `reject`, `none`; `text` the reply to the step's first approval request and the reason a verdict carried out
   records (task-118); `later` the reply to the step's later approval requests, by default `text`. Strict schema,
   every text non-empty (`src/core/scenario.ts`); the loader copies it onto `Scenario.steps[n].verdict`. A step is
   where a verdict is timed, so a separate `verdicts:` list keyed by step would only repeat the step numbers.
2. **Policy v3 = v2 plus `scriptedVerdicts: true`** (`src/core/approver.ts`): the same classifier function, replies
   and cap; v1 and v2 get `scriptedVerdicts: false` and are otherwise unchanged. `replyFor(policy, kind, verdict,
   approvalsBefore)` is the one place a reply is chosen: the verdict's text at the step's first approval request,
   `later` after; the policy's reply for a question, a step without a verdict, or a policy that reads none.
3. **The runner** (`src/runner/run.ts`) counts the step's earlier approval interventions and asks `replyFor`; each
   reply is still one intervention, recorded with its text in `run.json` (REQ-RUN-07), so the verdicts given are
   reconstructible from the run.
4. **A verdict is never silently ignored:** `checkCampaign` refuses a scenario with verdicts under a policy that does
   not read them (v1, v2), naming the scenario and asking for v3 — otherwise S10 would be answered "Approved.
   Proceed." at its rejection.
5. **S10's verdicts** are declared in its `scenario.yaml` with S10.md §6's texts (task-116, review round 1); its test
   pins their kinds, the approver's identity in steps 1–3, the rejection's subject and a step-3 text that does not
   restate it.
6. **Documents:** requirements 1.43 (REQ-FMT-04, REQ-RUN-06); experiment design 1.9 (§3); the method page's
   `approver-verdicts` statement, pinned to its sources; S10.md §12's status.

**Red-first:** `test/unit/core/approver-v3.test.ts`, the verdict cases of `test/unit/scenario/load.test.ts`, the v3
case of `test/unit/runner/run.test.ts` and `test/unit/runner/campaign.test.ts`'s refusal: 15 new tests, 14 failing
before the code (the 15th, an unknown field in a verdict, was already refused by the strict step), green after. Three
existing tests used `v3` as the example of an unimplemented version (now `v4`), and v2's test
listed the versions.

## Execution notes

- 2026-10-29: backlog → in-progress on main; worktree `../WingFoil2-Benchmark-wt/v3` on
  `task/task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029`, `npm ci`.
- `bench scenario validate S10@1.0 --holdout …` valid with the verdicts; S10's hash changes, which is allowed: S10 has
  no stored result.

### Review

**Round 1** (2026-10-29, a fresh read-only agent in a `mktemp -d` directory; the checkouts' HEAD unchanged after it),
on `1d0ae5c5`: no blocker.

- **Should-fix — a dry run skipped the refusal:** `checkDryRun` takes the profile's policy (`scenarios/dry-run.yaml`
  pins v1), so `bench dry-run S10@1.0` would have answered the rejection "Approved. Proceed.". Fixed: one helper,
  `verdictPolicyIssue` (`src/core/approver.ts`), called by `checkCampaign` and `checkDryRun`; a test refuses a dry run
  under v2 and accepts it under v3. S10's calibration will need a dry-run profile that pins v3 (the default pins v1).
- **Strengthened:** the runner's test now has a question before the verdict step's approvals, so questions are shown
  not to be counted.
- **Nits:** S10.md's "`verdicts`" wording; a comment over 120 columns; an import out of order; a useless assertion;
  the red-first count (15 new, 14 red).

**Round 2** (re-review of `e94e3e5e`'s diff, a fresh read-only agent, checkouts unchanged): round 1's findings
resolved; nits only, so the review closes. Applied: the helper computed once in `checkCampaign`; a task line
rewrapped; the dry-run profile for S10 stated as a need of its calibration, not as done.

**Full suites, first run** (on `988d718c`, log `…-988d718c-140432.txt`): red, TEST 1 —
`test/unit/campaign/load.test.ts` used `v3` as its example of an unimplemented policy, the fourth such test, missed by
the targeted runs (core, runner, scenario, site). Fixed to `v4`, its message listing v1, v2, v3; `test/unit/campaign`
green (143). The task goes back to in-progress for it.

### Approval

- **Full suites** (`scripts/full-suites.sh`, started by a watcher once the machine's load fell below 4), on
  `dd676147`, the worktree clean: green — lint, 1888 unit and acceptance tests passed (9 skipped; coverage 97.53 % of
  lines), build, test:bin 8/8, test:docker 22 passed (2 skipped: the real hold-out is absent beside the worktree), log
  `.cache/full-suites/2026-10-29/…-dd676147-175751.txt`. The first run (`…-988d718c-140432.txt`) was red, sent back
  by the approver and fixed (the campaign load test).
- **Approved** by the approver, in-review → approved. Next: task-118.
