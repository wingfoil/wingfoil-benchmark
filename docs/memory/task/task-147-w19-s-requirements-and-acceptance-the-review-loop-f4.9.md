---
id: task-147-w19-s-requirements-and-acceptance-the-review-loop-f4.9
type: task
title: "W19's requirements and acceptance: the review loop (F4.9)"
status: in-progress
release: v0.3
wave: W19
features: []
acceptance: []
requirements: [REQ-FMT-01, REQ-FMT-06, REQ-FMT-08, REQ-RUN-01, REQ-RUN-02, REQ-RUN-08, REQ-RUN-09, REQ-RUN-13, REQ-RUN-19, REQ-RUN-21, REQ-SCO-14, REQ-SCO-16, REQ-RES-02, REQ-RES-06, REQ-CLI-02, REQ-CLI-03, REQ-CLI-05, REQ-CLI-11]
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

After the independent review's round 1 (in chat, 2026-11-13, each the recommended option):

5. **The reviewer's copy keeps the agent's records:** only what the run's setup installed or changed is stripped
   (with the reserved names and the run's history); what the agent wrote, its records in the tool's state places
   included, stays, symmetric with the docs controls' records.
6. **A later round sees the whole copy,** with the previous fix applied, pointed at the fix's diff, so that M-V2 can
   find defects outside the fix (a review of the fix's diff alone, as dl-020's, would make it near 1 by construction).

After review round 4 (in chat, 2026-11-13, the recommended option):

7. **The fixer works in the run's own container** (superseding choice 1's copy for the fixer), before it is removed,
   in the run's workspace once its patches are stored, so it has the harness the setup installed there; no image is
   made, so no credential is copied into one. A loop is never resumed: an interrupted one stays recorded as such, the
   run kept.

State read on 2026-11-13 (main `775667d9`): no review loop exists; the runner ends a run after its last step's commit
and patch (REQ-RUN-05), and scoring runs later, in its own container, from the stored patches (REQ-SCO-01); F4.6's blind
judge, whose "harness files stripped" §4.7 borrows, is not built, so this task defines the stripping. No spending in
this task.

## Acceptance criteria

<!-- Documents only: the requirements and the drafted scenarios; each implementing task writes its tests red first. -->

1. **The campaign pins the loop (REQ-FMT-01):** an optional `review_loop` entry: the reviewer's agent, version, model
   and effort, the prompts `review/prompt.md` and `review/fixer-prompt.md` by their SHA-256, the round cap (5), and the
   loop's caps (time, tokens and cost per session, as a step's, and the fixer's interventions); absent, no run has a
   loop, so every earlier campaign stays valid and unchanged. A dry-run profile may carry the same entry (REQ-CLI-05).
2. **The loop (a new REQ-RUN):** on every completed run, once the last step's commit and patch are stored and before the
   run's container is removed, the runner builds the reviewer's copy, a fresh repository of the seed and the final tree
   both stripped of every path the setup added and of the reserved names (choice 5); scoring reads the stored patches,
   never the loop. The **reviewer**, in its own container, reads round 1's diff between the two commits and, in later
   rounds, the whole copy with every fix so far, pointed at the last fix's diff (choice 6), reads only, and returns its
   findings as JSON (severity `blocker`/`should-fix`/`nit`, file, line, title, why); the **fixer** is the run's agent
   and model in the run's own container and workspace (choice 7), with its harness, manual and MCP server as in a step,
   given the blockers and should-fixes and `review/fixer-prompt.md`, under the approver policy; the loop closes by
   choice 3. A failed or unparseable reviewer, a fixer that changes nothing, an interrupt and a quota rejection each end
   the loop with that outcome and its reason, recorded; a run that did not complete records `no loop`; a loop is never
   resumed.
3. **The records (REQ-FMT-06):** each run's `review/` holds, per round, the findings, the fix's patch, both sessions'
   usage and transcripts (git-ignored as a step's), and the loop's outcome (`clean`, `not clean at 5`, `failed`, `no
   fix`, `interrupted`, `quota exhausted`, `no loop`), with the reviewer's pins and the prompt's SHA-256.
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
  - the loop starts from the last step's stored commit, and scoring reads the stored step patches (REQ-SCO-01), so
    the scoring and every existing metric read exactly what they read today; the loop runs on completed runs only;
  - the fixer runs under the same approver policy as the steps, and its interventions count in the loop's record,
    not in the run's interventions;
  - the reviewer's findings name lines of the copy as that round's reviewer saw it, the previous fix applied, so
    that M-V2 reads the previous fix's diff against the reviewed lines; a finding without a line (a missing file, a
    design remark) is never fix-induced;
  - the reviewer works read-only (a session that changes the copy is refused, as a configuring session that touches
    a project file is);
  - the review loop runs for every arm of the campaign, the controls included, so that each harness arm is read
    against its docs control as every metric is.

## Execution notes

- 2026-11-13: backlog → in-progress on main; worktree `../WingFoil2-Benchmark-wt/t147`.
- **The documents:** `requirements.md` 1.58 (REQ-RUN-21 and REQ-SCO-16 new; REQ-FMT-01, REQ-FMT-06, REQ-FMT-08,
  REQ-RUN-01, REQ-RUN-02, REQ-RUN-08, REQ-RUN-09, REQ-RUN-13, REQ-RUN-19, REQ-SCO-14, REQ-RES-02, REQ-RES-06,
  REQ-CLI-02, REQ-CLI-03, REQ-CLI-05 and REQ-CLI-11 amended); `traceability.md`
  1.8 (F4.9 in §2; T16 and T17 in §3); `09_experiment-design.md` 1.13 (§4.7 with the four choices, the quick check
  settled; T16, T17).
- **The scenarios drafted** for W19's implementing tasks, each to be added with its test red first:

  ```gherkin
  # campaign.feature (task A)
  @F4.9
  Scenario: A campaign without a review loop is unchanged
    Given a campaign file with no "review_loop" entry
    When it is validated and run
    Then it is valid as before, and no run holds "review/"

  @F4.9
  Scenario: A campaign pins its review loop
    Given a campaign whose "review_loop" pins the reviewer, the prompt's SHA-256 and 5 rounds
    When it is validated
    Then it is valid, and a prompt whose SHA-256 differs from "review/prompt.md" is refused, naming the file

  # runner.feature (task B)
  @F4.9
  Scenario: The review loop runs on a copy after the last step
    Given a completed run of a campaign that pins a review loop
    When its last step's commit and patch are stored
    Then the reviewer reads a stripped copy and the fixer works in the run's workspace
    And the run's patches, and its scores, are those it would have without the loop

  @F4.9
  Scenario: A run that did not complete has no loop
    Given a run of a campaign that pins a review loop, killed at its step cap
    When the run ends
    Then its "review/loop.json" records "no loop" with the run's outcome, and no review session runs

  @F4.9
  Scenario: The reviewer sees the code without what the setup installed
    Given a run of "speckit" whose setup added ".specify/scripts/bash/common.sh", "CLAUDE.md" and ".mcp.json"
    And whose agent wrote "src/cart.ts" and "specs/001-cart/spec.md"
    When the reviewer session starts
    Then its copy holds "src/cart.ts" and "specs/001-cart/spec.md" and none of the setup's paths
    And a setup-added file a step changed, such as the constitution, is not in it either
    And its git history is two commits, the stripped seed and the stripped final tree, with no step commit message
    And it holds no step prompt, oracle file or hold-out file

  @F4.9
  Scenario: A later round reviews the whole copy, pointed at the fix
    Given round 1's fix changed "src/cart.ts"
    When round 2's reviewer starts
    Then its copy is the whole stripped tree with the fix applied, and it is pointed at the fix's diff

  @F4.9
  Scenario: A reviewer whose findings do not parse ends the loop as failed
    Given a reviewer whose final result is not the findings' JSON
    When the round ends
    Then the loop ends as "failed", and the run's results are kept

  @F4.9
  Scenario: A fixer that changes nothing ends the loop
    Given round 1 reports a blocker, and the fixer's patch changes only paths the reviewer's copy strips
    When the round ends
    Then the loop ends as "no fix"

  @F4.9
  Scenario: The fixer works with the arm's harness as in a step
    Given a completed run of "wingfoil" whose loop's round 1 reports a blocker
    When the fixer session starts
    Then it runs in the run's own container, with the wingfoil MCP server and the verdict hook of the last step
    And the run's stored patches and "commits.json" are unchanged, and no image is made

  @F4.9
  Scenario: A quota rejection in a loop stops the campaign
    Given a fixer session rejected for the subscription's quota
    When the round ends
    Then the loop ends as "quota exhausted", the run stays "completed", and the campaign stops

  @F4.9
  Scenario: A fixer that reaches its intervention cap ends the loop
    Given a fixer whose interventions reach "review_loop.caps.fixer_interventions"
    When the cap is reached
    Then its session ends and the loop is "failed"

  @F4.9
  Scenario: An interrupted loop is not resumed
    Given a campaign interrupted during a run's review loop
    When it is resumed
    Then that run's loop stays recorded as "interrupted" with its rounds so far, the run "completed"
    And no loop session and none of the run's steps run again

  @F4.9
  Scenario: A round with a blocker or a should-fix is fixed and its fix re-reviewed
    Given the reviewer's round 1 reports a should-fix
    When the loop goes on
    Then the arm's own agent fixes it in the run's workspace, its diff recorded as round 1's "fix.patch"
    And round 2 reviews that diff

  @F4.9
  Scenario: A round with nits only closes the loop
    Given the reviewer's round 2 reports two nits and nothing else
    When the loop goes on
    Then it closes as "clean" at round 2, and no fixer session runs for the nits

  @F4.9
  Scenario: A loop that does not close by the cap is not clean
    Given a reviewer that reports a blocker in every round
    When five rounds have run
    Then the loop ends as "not clean at 5", and no sixth round runs

  @F4.9
  Scenario: A reviewer that changes the copy ends the loop as failed
    Given a reviewer session that edits a file of its copy
    When the round ends
    Then the loop ends as "failed", naming the file, and the run's results are kept

  @F4.9
  Scenario: A loop session killed at its cap keeps the run's results
    Given a fixer session that exceeds "review_loop.caps.session_time_s"
    When it is killed
    Then the loop ends as "failed", and the run's steps, scores and M-K1 are unchanged

  # scoring.feature (task C)
  @F4.9
  Scenario: Rounds to clean are read from the loop
    Given runs whose loops closed as "clean" at rounds 1, 2 and 3, and one "not clean at 5"
    When the execution is aggregated
    Then M-V1 summarizes 1, 2 and 3, and names the loop not clean at 5 apart

  @F4.9
  Scenario: A finding on a line the previous fix changed is fix-induced
    Given round 1's fix changed lines 10 to 14 of "src/cart.ts"
    And round 2 reports findings on "src/cart.ts" line 12, "src/cart.ts" line 40 and one with no line
    When M-V2 is read
    Then one of the three findings is fix-induced, a share of 1/3

  @F4.9
  Scenario: No finding after round 1 leaves M-V2 undefined
    Given a loop whose round 1 reports a should-fix and round 2 none
    When M-V2 is read
    Then it is undefined for that run, and the run is left out of M-V2's summary

  @F4.9
  Scenario: The loop's cost is apart from the run's
    Given a run whose steps cost 0.50 EUR and whose loop cost 0.20 EUR
    When the execution is aggregated
    Then M-K1 is 0.50 EUR, and M-V3 is 0.20 EUR, the reviewer's and the fixer's apart

  # campaign.feature, the estimate and the dry runs (task D)
  @F4.9
  Scenario: A dry run measures the loop
    Given a dry-run profile that pins a review loop
    When a dry run of S2 1.1 in "baseline" completes
    Then it records its loop, and the estimate reads it under "review/S2@1.1/baseline/<model>", the run's model
    And a dry run whose loop pins differ from the campaign's is not read

  # results.feature (task C)
  @F4.9
  Scenario: The method page states the review loop
    When the site is built for an execution whose campaign pins a review loop
    Then the method page names the reviewer, its model and effort, quotes its prompt with its SHA-256
    And states the closing rule, the round cap and what the reviewer's copy lacks

  @F4.9
  Scenario: A run's page shows its rounds
    When the site is built for a run whose loop closed at round 2
    Then the run's page lists both rounds, each finding's severity, file, line and title, and the outcome "clean"
  ```

- Checks: prettier on the three documents; `scripts/pre-review.sh main`.

## Review

- **Round 1** (an independent read-only agent, in a clone under `mktemp`, 2026-11-13): one blocking finding,
  fourteen should-fix and six nits.
  - **Blocking, the stripping:** the declared places left Spec Kit's installed scripts, templates and manifests in
    the reviewer's copy, and its git history and the setup's diff showed the stripped files. Now every path the
    setup added or changed is stripped, with the reserved names (named explicitly), and the reviewer gets a fresh
    repository of the stripped seed and final tree.
  - **Two choices asked of the approver** (choices 5 and 6 in Context): keep the agent's records in the copy, and
    let a later round see the whole copy pointed at the fix's diff.
  - **Should-fix, all addressed in requirements 1.58:** the anchor is the last step's commit and patch, not a
    scoring snapshot (scoring runs later from stored patches); the loop on completed runs only, `no loop` otherwise;
    interrupt and quota inside a loop (REQ-RUN-13, REQ-RUN-19), `--resume` of the loop only; the reviewer's own
    image and container, the fixer's fresh container (REQ-RUN-01, REQ-RUN-02); the read-only check and the findings
    as the final result, unparseable `failed`; rounds 2 and later; the fixer's pinned and scanned prompt, its
    intervention cap, "no fix" on the stripped patch, `fix.patch` as REQ-RUN-05's; the estimate key with the
    scenario version and the run's model, and the loop pins matched; the loops' cost under `ceiling_eur`; the records
    committed and the transcripts packed (REQ-RES-06, REQ-CLI-11), scrubbed; REQ-SCO-16 cites REQ-FMT-07 and states
    M-V1's and M-V2's summaries; T16's mitigation within one model, marked across models; T17 rewritten; this file's
    `requirements` list.
  - **Nits:** the reserved names listed; caps per session in criterion 1; the drafted scenarios gain no loop, the
    whole-copy round, unparseable findings, no fix, the resumed loop, M-V2 undefined and the dry run's loop; a
    hold-out sentence in REQ-RES-02; the reviewer's network (the run's) stated.
- **Round 2** (a second independent agent, on `cfff7c23`): round 1's blocker closed for every arm as set up today
  (every setup only adds paths, read from the dry runs' setup patches). One new blocking finding, from the fix:
  - **Blocking, the fixer's container:** a fresh container of the run's image has no harness, MCP server or verdict
    hook, which the setup installs inside the run's container, and the setup cannot be re-run without
    re-initializing the workspace. **Decided here, for the approver's gate:** the run's container is committed to a
    temporary per-run image before its removal, and each fixer session runs from it with its copy at the
    workspace's path, so the fixer is a step after the last (the agent's home shared as between steps); the image
    is kept until the loop ends, so a resumed loop starts from it. The alternative, an install-only part of each arm
    (a REQ-FMT-05 change), was not chosen.
  - **Should-fix, addressed:** a setup-added file a step changed stays stripped (its template shows the tool), in
    REQ-RUN-21 and T17; only added paths are stripped, a seed path the setup changed kept as project code;
    `--resume` reruns unfinished loops besides the runs it re-runs, reading `review/loop.json`, the earlier loop
    under `review/attempts/<k>/`, the copies from the temporary image, leftovers and REQ-CLI-03's price counting
    loops; a later round's copy with every earlier fix; the reviewer reads only (no install, build or run); the
    fixer's intervention cap ends the loop `failed`; an infrastructure failure of a loop is resumable; `ceiling_eur`
    checked between rounds.
  - **Nits:** the estimate key in its own `review/` namespace, `<model>` the run's; T16's marking in REQ-RES-02;
    this file's criteria, documents list and scenarios (the fixer's harness, quota, the intervention cap); the stops'
    wording.
- **Round 3** (a third independent agent, on `8d31b194`): round 2's blocker closed and feasible (the setup's files
  live in the container's own layer, the workspace is a bind mount the commit does not capture). One blocking
  finding, from the fix:
  - **Blocking, the credential in the image:** `docker commit` copies the container's environment, so the token
    passed as `ANTHROPIC_AUTH_TOKEN` would sit in every temporary image, and the agent's raw session files with it.
    Now REQ-RUN-02 empties every credential variable at the commit, clears the agent's session files first, checks
    the image for every secret value passed (a match refuses the loop), keeps the image local, and gives the fixer
    the credential at its container's creation; REQ-NFR-01 amended; a scenario added.
  - **Should-fix, addressed:** a resumed loop's copies come from the run's kept workspace, not the image (which holds
    none); the image is kept for a loop `failed` for an infrastructure reason too; the leftover check of every
    campaign run keeps the images unfinished loops need and reports the others, and `--final` scoring removes them;
    scenarios for the kept image and a resume whose image is gone.
  - **Nit:** a failed commit ends the loop `failed` for an infrastructure reason.
- **Round 4** (a fourth independent agent, on `6c0c61f5`; it also ran a local Docker experiment with a fake secret,
  nothing pulled, cleaned up): one blocking finding. `docker commit --change 'ENV X='` empties the visible variable,
  but the source container's environment stays in the image's stored configuration (`docker save` shows the value),
  and files in the container layer keep whatever the agent wrote; the specified check could not see either. **The
  approver's choice 7** replaces the temporary image: the fixer works in the run's own container before its removal,
  and loops are never resumed. REQ-RUN-02, REQ-RUN-08, REQ-RUN-19 and REQ-RUN-21 rewritten; REQ-NFR-01's amendment,
  the image retention, the leftover rule for images and the resume of loops withdrawn; every outcome but `clean`
  records its reason (finding 4); the scenarios follow.
- **Round 5** (a fifth independent agent, on `c1af7d61`, reading only): nothing blocking; the leak closed, the design
  feasible (nothing after a run reads its workspace or its git; resume never re-runs a completed run). Addressed: the
  fixer's `fix.patch` taken from the workspace as a step's, its verdict ledger the round's `verdicts.json`; "on a
  copy" for the fixer replaced in §4.7, amendment 1.13, the 1.58 intro, choice 7 and two scenarios; the reviewer's
  container named under the campaign's prefix, removed whatever happens and reported by the leftover check; REQ-RUN-19
  no longer refers to itself; choice 7's credential claim narrowed; `ceiling_eur` checked before round 1 too. Its hint
  for task B: the loop sits outside the run's interrupt path, so the run keeps `completed`.

