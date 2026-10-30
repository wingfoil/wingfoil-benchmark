---
id: task-118-a-separate-approver-identity-the-agent-never-the-approver-verdicts-executed-by-the-runner-dl-029
type: task
title: "A separate approver identity: the agent never the approver, verdicts executed by the runner (dl-029)"
status: approved
release: v0.3
wave: W17
features: [F2.4]
acceptance: [runner.feature]
requirements: [REQ-RUN-17, REQ-FMT-04]
fixes: []
tags: ["v0.3","runner","governance"]
---

## Context

[dl-029](../decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md) point 7, the
second of the method's two changes that S10 ([task-116](task-116-s10-gates-and-roles-scenario-dl-029.md)) needs:
option (b) of the scenario conventions' open question 1, in the variant **(b1)** the approver chose in S10's goal phase
(2026-10-29). For a scenario that declares it, the agent's git identity holds no approver role; the scripted verdict
([task-117](task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029.md)) is carried out by the
runner under a separate approver identity the agent's container does not hold, through the arm's published verdict
hook (WingFoil's `memory approve|reject … --reason`), and as text only for an arm with none; the runner keeps a ledger
of the verdicts it carried out, outside the snapshot, read by M-E3a. Every other scenario keeps option (a) (dl-029
constraint 5). Placed in v0.3, W17. Implemented after task-117; one task at a time in review.

## Acceptance criteria

- A scenario may declare a separate approver; then the agent's identity and the approver's differ, and the approver's
  is never in the agent's environment — red-first.
- The arm's verdict hook runs under the approver identity at the time S10.md fixes; an arm with none receives text
  only; a missing or ambiguous target is recorded, never guessed — red-first.
- The ledger of executed verdicts (identity, verdict, reason, commits) is written per run and read by M-E3a's check —
  red-first.
- REQ-RUN-17, the scenario conventions' open question 1 and the method page amended — characterization.

## Design

**Scope, as task-116's Design fixed it** ("What the method's tasks must provide", after this task was approved): beyond
the identity, the hook and the ledger above, the authors of every step's commits in `commits.json`, the check kinds
`gate` (M-E2) and `attribution` (M-E3a), M-E4's reading, and S10's `scenario.yaml` given its approver and the checks.
Recorded here rather than in the Context, which `memory amend` would rewrite only under the approver's role; the
criteria below are the Context's, extended by these.

1. **The approver is the scenario's** (`approver: {name, email}` in `scenario.yaml`, REQ-FMT-04): its presence is what
   selects option (b1). The agent then commits as "Benchmark Developer" <developer@benchmark.localhost>
   (`src/runner/identity.ts`), and the wingfoil arm's setup declares that identity with the `developer` role only; the
   scenario's DNA names the approver (S10's: Dana Okafor). Every other scenario keeps the Benchmark Approver.
2. **The verdict hook is the arm's** (`verdict_hook` in `arm.yaml`, REQ-FMT-05), run in the container as `bash <hook>
   <approve|reject> <name> <email> <reason>` at a step's first approval request under policy v3. The approver's
   identity is an argument, set by the hook for its own command only: never in the agent's environment, so WingFoil
   still refuses the agent's own approvals. The wingfoil arm's `verdict.sh` finds the one element in `in-review` or
   `pending` and runs `memory approve|reject <id> --reason <verdict text>` with `GIT_AUTHOR_*` and `GIT_COMMITTER_*`
   set; none or several is reported (`no-target`, `ambiguous`), never guessed. Other arms declare none: text only.
3. **The ledger** (`steps/NN/verdicts.json`, REQ-FMT-06), written for every step of a scenario with an approver: each
   delivery's reply, verdict kind, the workspace's commit, the gate's release read in the working tree at delivery (so
   that an uncommitted bump counts), and, when carried out, the hook's outcome, its target and the commits it made.
4. **The authors** (`commits.json`'s `commits`): SHA, author and committer e-mail of every commit of the step,
   through a new `GitPort.commitsSince`.
5. **The governance kinds** (REQ-SCO-06, `src/scoring/governance.ts`): `gate` counts a release with no approval
   delivered while the release still held the previous value, and each commit made as the approver that the ledger
   does not list; `attribution` passes a verdict carried out by commits authored as the approver; `rejection` reads
   its suite whole at the rework's step, through the suites already scored (`suitePassed`), when the rejection was
   delivered. A step where a verdict check does not apply is left out of the run's score, so the aggregate's schema
   is unchanged.
6. **Documents:** requirements 1.44, experiment design 1.10 (§3), the method page's `approver-separate`, the scenario
   conventions' open question 1, S10.md §12.

**Red-first:** the approver and governance cases of `test/unit/scenario/load.test.ts`,
`test/unit/scoring/governance.test.ts`, the two runner cases of `test/unit/runner/run.test.ts` and S10's governance
case failed before the code; four existing runner tests that pin the exact git calls or `commits.json` now expect the
authors.

## Execution notes

- 2026-10-30, by the scheduled resume after the weekly quota's reset: backlog → in-progress on main (`fe8ceb96`);
  worktree `../WingFoil2-Benchmark-wt/approver`, `npm ci`.
- `wingfoil memory amend` needs the approver role (declared: "record an uncommitted correction … needs the approver
  role"; observed: as declared), so the scope is recorded in the Design, not in the Context.
- **The hook against WingFoil 0.3.1**, in a throw-away project in the scratchpad (`init --template Kanban`, Dana as
  approver, the developer as developer, a task submitted to `pending`): the agent's own `memory approve` was refused
  ("user not authorized to approve type 'task'"); the hook approved it as Dana — the commit's author and committer
  Dana, its body `Approver: Dana Okafor … Reason: Approved by …` — and left the workspace's identity the developer's;
  with nothing waiting it answered `no-target`. A first version counted one target as none (`wc -l` on a line with no
  newline), found by that run and fixed.

### Review

**Round 1** (2026-10-30, a fresh read-only agent in a `mktemp -d` directory; the checkouts' HEAD unchanged after it),
on `c2e34e7d`: no blocker.

- **Should-fix — the docs control's snapshot ran as the Benchmark Approver:** `prepareProjectRules` kept the old
  identity, so S10's baseline-docs would have rendered a team where the agent approves (T3). Fixed: one rule,
  `agentIdentityFor(scenario)`, for the run and the snapshot; a test (red before) runs the snapshot as the developer.
- **Should-fix — the gate's violations listed under M-E1** in the findings: fixed, M-E1 reads the directive kinds only
  (`DIRECTIVE_KINDS`, now shared with the comparisons); a characterization test with a gate check.
- **Should-fix — criterion 1 had no negative test:** added — the approver's e-mail absent from every agent request,
  identity call and non-hook command; a hook failing, answering `no-target`, `ambiguous` or nothing readable; a hook
  that does not answer (timed out); an arm with no hook (text only).
- **Nits:** the hook bounded by a timeout (two minutes) and its exceptions recorded; its JSON written by node; a failing
  search reported as `search-failed`, not as no target; S10.md §7's gate rule worded as the code reads it (the version
  in the working tree at delivery); §11's rewritten approval commits and early requests; REQ-SCO-06's missing ledger;
  `verdict.sh`'s line widths. Settled by a second run against WingFoil 0.3.1: a rejection's commit touches only the
  element, an agent's staged file is left out of it, and a reason with quotes and `;` reaches it intact.

**Round 2** (re-review of `899e7fed`'s diff, a fresh read-only agent, checkouts unchanged): round 1's findings
resolved; one nit, so the review closes. Applied: a timed-out hook's late commits, counted as forged by the gate, stated
in S10.md §11, and the calibration's check of the hook's time noted there.

### Approval

- **Full suites** (`scripts/full-suites.sh`, started by a watcher once the machine's load fell below 4), on
  `e5ae8a9b`, the worktree clean: green — lint, 1915 unit and acceptance tests passed (9 skipped; coverage 97.33 % of
  lines), build, test:bin 8/8, test:docker 22 passed (2 skipped: the real hold-out is absent beside the worktree), log
  `.cache/full-suites/2026-10-30/…-e5ae8a9b-053145.txt`.
- **Approved** by the approver, in-review → approved. The method's two changes are done: S10's calibration waits for
  the approver's go (task-116, "What the calibration will need").
