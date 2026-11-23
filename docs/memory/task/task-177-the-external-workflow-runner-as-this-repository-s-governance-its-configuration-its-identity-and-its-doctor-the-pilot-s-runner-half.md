---
id: task-177-the-external-workflow-runner-as-this-repository-s-governance-its-configuration-its-identity-and-its-doctor-the-pilot-s-runner-half
type: task
title: "The external workflow runner as this repository's governance: its configuration, its identity and its doctor, the pilot's runner half"
status: backlog
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02, REQ-NFR-01]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
tags: ["process","runner","governance","v0.4"]
---

## Context

The approver's rulings of 2026-11-22 and 2026-11-23 ([dl-037](../decision-log/dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota.md), plan-006): this repository's governance is
run by the external workflow runner, as WingFoil's other projects run theirs, with one pilot on W20 whose exit and
rollback criteria are written apart for the methodology and for the runner ([task-127](task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046.md)'s Design). task-127
adopts the methodology; the runner's half moved here on 2026-11-23, because at `runner-1.2.0` a test file in the
runner's manifest names private projects, so its common files can be neither copied into this public repository nor
packed in a campaign's harnesses. The fix was asked of the runner's maintainers the same day. **This task starts
only when a runner version whose common files and adapters name no private project is tagged.**

The governance pin stays WingFoil 0.3.2. The runner's use as step B's arm (task-172, task-173) is separate, in
versions and pins.

**Done** means: the runner's doctor and dry run are clean on the trunk line, the timer is installed disabled, and the
approver can enable it to carry the next W20 tasks through `work-item`.

## Acceptance criteria

1. The runner's common files at its tag copied unchanged, their manifest checked (`manifest.mjs --digest`), and none
   of them naming a private project (the anonymity check, counts only, run on the copied tree).
2. `config/runner.yaml`: one `trunk` line, its checkout and worktrees outside the main checkout, in a git-ignored
   `config/runner.local.yaml`; `launch.allow: [work-item]`; `launch.manual` naming `work-item.real-agent-check`;
   `phases.integrate: [work-item.done]`; `integration.task_branch: task/{id}`, `merge: no-ff`; Claude as the
   reviewer too, in another session; `paths.runs: [docs/runs/]`; `weekly_token_budget` set after the pilot's first
   task.
3. Red first: a test fails when `config/runner.yaml` allows `campaign-cycle`, the release slot, `*` or any step that
   spends, or when the runner's identity can approve.
4. **The runner's identity** (the approver, 2026-11-23): a `team.agents` entry "WingFoil Benchmark Runner"
   (`runner@wingfoil-benchmark.invalid`), `approval_authority: false`, named as the trunk line's `agent`; the
   launched model credited by `Co-Authored-By`; gates ruled only by the approver through `gate.mjs`.
5. The adapters in `.wingfoil/agents/custom/`; `docs/notices.md` with its markers; the runner's home and the line's
   clone prepared outside every working checkout; `run.mjs --line trunk --doctor` answers `ok` and `--dry-run`
   proposes a `work-item` step.
6. The systemd timer written disabled; the approver alone enables it. No real-agent session is started by this task.
7. Every `wingfoil` and runner command declared against observed behaviour in the notes; friction as feedback notes.
8. Checks: `scripts/pre-review.sh main`, the docs tests, the full suites on the approver's go; an independent review
   (dl-020).

## Design

<!-- To be written when the task starts. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
