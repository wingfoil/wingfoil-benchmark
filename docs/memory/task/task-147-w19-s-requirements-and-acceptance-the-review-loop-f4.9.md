---
id: task-147-w19-s-requirements-and-acceptance-the-review-loop-f4.9
type: task
title: "W19's requirements and acceptance: the review loop (F4.9)"
status: backlog
release: v0.3
wave: W19
features: []
acceptance: []
requirements: [REQ-FMT-01, REQ-FMT-06, REQ-FMT-08, REQ-RUN-03, REQ-RUN-08, REQ-RUN-09, REQ-SCO-14, REQ-RES-02, REQ-CLI-02, REQ-CLI-03, REQ-CLI-05]
fixes: []
tags: ["v0.3","specification","w19"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W19, the review loop per arm (F4.9, experiment design 1.7 §4.7,
from the v0.2 retrospective's decision C of 2026-10-23: round 1 rarely clean, 40–89 % of later findings induced by
fixes, dl-020). Its "Ends with" in [rel-v0-3](../release/rel-v0-3.md): the review-loop metrics in the dry runs. As
[task-138](task-138-w18-s-requirements-and-acceptance-configured-variants-f7.5.md) did for W18, this task writes the
requirements and drafts the acceptance scenarios; the implementing tasks and the dry runs come after it.

**The approver's choices** (in chat, 2026-11-13, each the recommended option):

1. **Where the loop runs:** after the run's last step, on a copy of the final workspace; the reviewer and the fixer
   work on the copy and its fixes are discarded, so no existing metric changes and a run's steps stay comparable with
   v0.1–v0.2. One loop per run.
2. **The reviewer:** Claude Code on `claude-sonnet-5-5` at `medium`, the same in every arm, pinned by the campaign
   with its prompt. (It may review code its own model wrote: stated as a threat, not avoided.)
3. **The closing rule:** a re-review of the fix's diff after a round with a blocker or a should-fix; a round with
   nits only, or none, closes the loop; nits are not fixed (no quick check inside the loop: §4.7's open question
   settled); at most **5 rounds**, after which the loop is "not clean at 5".
4. **M-V2's attribution, by lines:** a finding of round n ≥ 2 is fix-induced when it falls on a line the previous
   round's fix added or changed, read from the fix's diff; mechanical and reproducible.

State read on 2026-11-13 (main `775667d9`): no review loop exists; the runner ends a run after its last step (and its
scoring); F4.6's blind judge, whose "harness files stripped" §4.7 borrows, is not built, so this task defines the
stripping. No spending in this task.

## Acceptance criteria

<!-- Documents only: the requirements and the drafted scenarios; each implementing task writes its tests red first. -->

1. **The campaign pins the loop (REQ-FMT-01):** an optional `review_loop` entry: the reviewer's agent, version, model
   and effort, the prompt `review/prompt.md` by its SHA-256, the round cap (5), and the loop's caps (time, tokens,
   cost per round, as a step's); absent, no run has a loop, so every earlier campaign stays valid and unchanged. A
   dry-run profile may carry the same entry (REQ-CLI-05).
2. **The loop (a new REQ-RUN):** after the last step and before the scoring's snapshot is taken (or from it, so that
   scoring never sees a fix), the runner copies the final workspace; the **reviewer** session sees the copy with the
   harness's own files stripped (the arm's declared configuration and state places, the manual, `PROJECT_RULES.md`,
   the MCP configuration, and the reserved names REQ-FMT-08 lists) and the run's diff from the seed, and writes its
   findings in a fixed format (severity `blocker`/`should-fix`/`nit`, file, line, title, why); the **fixer** is the
   arm's own agent, in the copy with its harness and manual as in a step, given the blockers and should-fixes, under
   the approver policy; then the reviewer re-reviews the fix's diff; the loop closes by choice 3. A reviewer session
   that fails, or a fixer that changes nothing, ends the loop with that outcome, recorded.
3. **The records (REQ-FMT-06):** each run's `review/` holds, per round, the findings, the fix's patch, both sessions'
   usage and transcripts (git-ignored as a step's), and the loop's outcome (`clean`, `not clean at 5`, `failed`,
   `no fix`), with the reviewer's pins and the prompt's SHA-256.
4. **The metrics (a new REQ-SCO):** M-V1 rounds to clean (a loop not clean at 5 is reported as such, not as 5); M-V2
   the fix-induced share by choice 4, undefined when no finding follows round 1; M-V3 the loop's cost, the reviewer's
   and the fixer's M-K1 and M-K2 apart. Each per arm against the baseline and the docs control (REQ-SCO-14), on
   every scenario version; the loop's cost is not part of the run's M-K1, which stays the steps'.
5. **Costs and caps (REQ-RUN-08, REQ-RUN-09, REQ-CLI-02, REQ-CLI-03):** the loop's sessions count against the
   campaign's budget and its estimate, by their own key (the reviewer's model and the arm's), never against a step's
   cap; a run whose loop hits a cap keeps its steps' results.
6. **Published (REQ-RES-02):** the method page states the reviewer, its model, effort and prompt with its SHA-256, the
   closing rule and the stripping; the result pages show M-V1 to M-V3 per arm, and a run's page its rounds and
   findings (the findings' text from the records; never a hold-out file's content).
7. **Validity:** a threat for the reviewer's model reviewing its own model's code, and one for the stripping's limits
   (a harness's traces in the code itself, such as a task id in a comment).
8. `requirements.md` 1.58 records the amendments and their source; `traceability.md` the rows;
   `09_experiment-design.md` §4.7 the four choices (1.13); the scenarios drafted below, for the implementing tasks.
   Checks: `scripts/pre-review.sh main` green; an independent review (dl-020).

## Design

- Documents only: `docs/02_specification/requirements.md`, `traceability.md`, `docs/01_vision/09_experiment-design.md`;
  the scenarios drafted in this task's Execution notes (`runner.feature`, `scoring.feature`, `results.feature`,
  `campaign.feature`), added by the implementing tasks.
- **Proposed split of the implementing work** (each its own task, after this one's gate): (A) the campaign entry,
  the prompt `review/prompt.md` and the findings' format; (B) the loop in the runner, its records and caps, with the
  runner doubles; (C) M-V1 to M-V3 in the aggregate, the comparisons and the site; (D) the dry runs with the loop on
  S1, S2, S3 and S8 at 1.1 (spending, on the approver's consent), W19's "Ends with".
- **Decided here, beyond the criteria's wording** (for the approver's review):
  - the loop reads the final workspace after the scoring's snapshot is taken, so the scoring and every existing
    metric read exactly what they read today;
  - the fixer runs under the same approver policy as the steps, and its interventions count in the loop's record,
    not in the run's interventions;
  - the reviewer's findings name lines of the copy as the fixer left it, so that M-V2 reads the previous fix's diff
    against the reviewed lines; a finding without a line (a missing file, a design remark) is never fix-induced;
  - the reviewer works read-only (a session that changes the copy is refused, as a configuring session that touches
    a project file is);
  - the review loop runs for every arm of the campaign, the controls included, so that each harness arm is read
    against its docs control as every metric is.

## Execution notes

## Review
