---
id: task-138-w18-s-requirements-and-acceptance-configured-variants-f7.5
type: task
title: "W18's requirements and acceptance: configured variants (F7.5)"
status: backlog
release: v0.3
wave: W18
features: []
acceptance: []
requirements: [REQ-ARC-03, REQ-FMT-04, REQ-FMT-05, REQ-FMT-08, REQ-RUN-03, REQ-RUN-11, REQ-SCO-08, REQ-RES-10]
fixes: []
tags: ["v0.3","specification","w18"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W18, "Configured variants" (F7.5): its requirements and acceptance
first, as each wave's first task (plan-005 step 1), then
[bug-034](../bug/bug-034-symlinks-spaces-and-line-endings-in-scenario-and-arm-files-are-handled-inconsistently.md)
(delivery order item 4, before any arm file written by an agent), then the configuring agent, then the configured arms
and their docs controls, and W18's "Ends with": every arm, the configured ones included, in a dry run.

The vision and the experiment design already state F7.5
([task-103](task-103-the-v0-3-vision-and-experiment-design-amendments.md): `06_features.md` 1.4,
`09_experiment-design.md` 1.7 §2 and T12, the scenario conventions' K7). This task carries them
into `requirements.md` and drafts the acceptance scenarios, so that each later task starts from a stated, red-first
criterion. A specification change: no code, no real-agent session, nothing spent.

The approver's choices in chat (2026-11-06):

1. **What the configuring agent sees:** the scenario version's seed, its `README.md` included, and the harness as its
   arm's setup installs it (the tool's own files and documentation), with the same network access as a run; never the
   prompts, the oracle or the hold-out.
2. **Its agent and model:** Claude Code on `claude-sonnet-5-5`, the `reference` preset's default model; the same for
   every harness.
3. **The scope:** S1, S2, S3 and S8 at 1.1; not S10, and no 1.0. For S8, whose 1.1 already holds a wingfoil
   configuration for the project (dl-005), the configuring agent starts from it and extends it.
4. **The spending:** the configuring agent's sessions (four scenarios × three harnesses) are a later task's, with the
   approver's consent on an estimate; nothing is spent before it.

## Acceptance criteria

<!-- A specification change, as task-126: this task amends the requirements and drafts each acceptance scenario's
     text; the task that implements an item adds the scenario to its `.feature` with its test, red first. -->

1. **The configured arms (REQ-FMT-05, REQ-ARC-03):** `wingfoil-configured`, `speckit-configured` and
   `openspec-configured`, each its harness arm plus the scenario version's configuration for it, in
   `scenarios/<id>/<version>/arms/<arm>-configured/`; a configured arm on a scenario version with no configuration
   for it is refused by `validate`, naming the scenario and the arm. Scenario drafted for its task
   (`competitors.feature` or `campaign.feature`, as the implementing task finds fitting).
2. **The configured docs controls (REQ-RUN-11):** `baseline-docs-configured`, `speckit-docs-configured` and
   `openspec-docs-configured`, each generated mechanically by its harness's generator from the configured arm's
   configuration as captured after setup; the generator's declaration of what it renders holds for them too, and the
   method page states it. Scenario drafted (`runner.feature`).
3. **The configuring agent (a new requirement):** a command (named by its task) runs it once per scenario version and
   harness, in a container holding the seed and the harness installed by its arm's setup, and nothing else of the
   scenario; one prompt, one agent and one model for every harness, the prompt a file of the repository; it writes
   only the configuration's directory, which then holds the configuration and a record of the session (agent, model,
   prompt digest, harness pin, usage, cost, wall time; never a credential). A configuration that already exists is
   not overwritten unless asked. Scenarios drafted (`scenarios.feature`).
4. **The configuration is scenario content (REQ-FMT-04, REQ-FMT-08):** pinned by the scenario's hash, as REQ-FMT-13
   as amended in 1.33 states for a scenario's arm configuration; the leak scan covers it (no oracle literal, no step
   prompt's text); a symbolic link in it is refused (bug-034's rule). Only versions 1.1 hold one; S8's extends the
   wingfoil configuration its 1.1 already holds. Scenario drafted (`scenarios.feature`).
5. **Its cost in M-K3 (REQ-SCO-08, REQ-RUN-03):** the configuration's record gives M-K3's one-off part (REQ-SCO-08 as
   amended in 1.49), once per scenario version and harness, not per run, and the configured arm's setup its per-run
   part as for any arm. Scenario drafted (`scoring.feature`).
6. **Published (T12, REQ-RES-10):** the method page states the configuring agent, its model and prompt, and each
   configuration's difference from the tool's defaults; the setup contest form covers a configured arm's
   configuration. Scenario drafted (`results.feature`).
7. `requirements.md` 1.50 records the amendments and their source; `traceability.md` gains the rows; the scenario
   conventions need no change (K7 already states the per-version configuration). Characterization of the documents'
   consistency: `scripts/pre-review.sh main` green.

## Design

- Documents only: `docs/02_specification/requirements.md` (1.50), `docs/02_specification/traceability.md`, and this
  task's drafted scenarios recorded in its Execution notes for the implementing tasks.
- Names: the `-configured` suffix for every configured arm and docs control (experiment design 1.7 §2), so that a
  configured arm and its base arm never share a path or a group.
- Open for the implementing tasks, not decided here: the command's name and flags, the prompt's text (reviewed by the
  approver before any session), whether the configured arms are directories of their own under `arms/` or a mode of
  their base arm (decided by the first implementing task, with the digest's meaning stated either way).

## Execution notes

## Review
