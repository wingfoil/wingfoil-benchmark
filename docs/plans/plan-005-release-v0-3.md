---
id: plan-005-release-v0-3
type: plan
title: "Release v0.3"
status: active
workflow: release-cycle
phase: release-cycle
tags: ["release","v0.3"]
---

## Context

Release v0.2 is `released` (2026-10-22, tag `v0.2`) and plan-004 is `done` (2026-10-24); its retrospective's
immediate actions are done (dl-020, dl-021, task-098, task-099, task-100). The `release-cycle` phase of `sw-life-cycle`
runs its third iteration, on [rel-v0-3](../memory/release/rel-v0-3.md).

**Scope, the approver's choice in chat (2026-10-24):** v0.3 is **"WingFoil as designed, harnesses as configured"**. It
re-measures S1, S2, S3 and S8 in scenario versions 1.1 with a corrected oracle and corrected metrics, the wingfoil arm
on WingFoil 0.3.1 driving its workflow engine (dl-021 step A), every harness also configured for the project, and the
review loop measured per arm. The sequencer's "Broader categories" (S4, S7, S5 with the blind judge F4.6, S6) move to
**v0.4**, by the sequencer's amendment 1.2 (task-103). It serves Riley, Avery, Dana and the Maintainer.

| Wave | Features | High unc. | Ends with |
|---|---|---|---|
| W15 — Presets and Codex | F1.1 campaign presets and `extends:` (dl-022) | the Codex spike | the Codex baseline campaign run, comparable with campaign-002's baseline |
| W16 — The method corrected | F4.1 content checks v2 and a human rubric · F4.3 cost metrics (M-K3, M-K4), M-R2 v2, the variance rule | — | v0.2's campaigns re-scored offline from their transcripts, at no spending |
| W17 — WingFoil 0.3.1, step A | F2.7 the wingfoil arm driving the workflow cycle · F2.6 WingFoil 0.3.1 under test | the spike on 0.3.1 | an S1 dry run whose agent drives the engine |
| W18 — Configured variants | F7.5 configured variants (task-103) | the configuring agent | every arm, configured ones included, in a dry run |
| W19 — The review loop | F4.9 the review loop per arm (task-103) | F4.9 | the review-loop metrics in the dry runs |

**What is already decided** (not reopened):

- **The wingfoil arm, step A** ([dl-021](../memory/decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)):
  WingFoil 0.3.1 (on 2026-10-24 only v0.3.0 is tagged; 0.3.1 is in development on `release/0.3`). The session agent
  drives the cycle (status → next → the step's role → stop at gates → finalize); no benchmark-written driver. The
  setup opens one instance per scenario, verified first by a spike on 0.3.1 (one instance carrying several requests;
  what `next` prints in a later session; Claude Code in `-p` reading the MCP session Resource). Context from the
  session Resource, pending records included; recording follows the step's evidence. baseline-docs gets every role's
  directives, labelled. **The step's work is completed before stopping at the workflow's gate.** The arm's
  agent-specific files are explicit (dl-022's arm B depends on it).
- **Configured variants** for wingfoil, speckit and openspec, each with its configured docs control, the configuration
  written by an agent that sees only the seed and the README, in scenario versions 1.1. Extra cost accepted; after
  calibration, presets make partial campaigns ordinary (dl-022). Prototype, enterprise and critical profiles are later.
- **Oracle and metrics:** word-boundary content checks over the agent's own text, plus a published human judgement
  with a rubric (1.1; errata for 1.0); classifier v2; M-R2 v2; M-K3 as one-off costs, M-K4 "not applicable" only
  beyond the variance; ▲/▼ and headline counts only beyond the variance, site-wide (REQ-RES-03); manual and
  docs-control sizes published.
- **The review loop per arm**, with the cross-project review analysis (anonymised) as its evidence.
- **The first `wingfoil-sync`** of the feedback inbox (WingFoil's `retro-v0.3.md` `## Consumer feedback`, 39 rows,
  read at `2ff5116f`; dl-163 R4/R5 until WingFoil's bug-408 documents the procedure), **together with bumping the
  managing WingFoil pin** (`0.2-pre-3df305e`), in one task after the Codex campaign has started.
- **Campaigns run on their own** ([dl-022](../memory/decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)),
  from files that extend a preset. The Codex baseline campaign (arm A: Sol, Terra, Luna) runs before the ChatGPT Plus
  subscription ends on **2026-11-13**, within v0.3's WIP and before W16: task-101 (presets), dl-024 (credential),
  task-102 (spike, prices, campaign files), then its dry runs and runs. If not everything fits by 2026-11-12: S3's dry
  runs on every model, then Sol's whole campaign, then Luna, then Terra. If task-101 is not approved by 2026-11-05,
  arm A runs from a whole hand-written campaign file and the presets follow in W15 without the deadline. Arm B (a
  WingFoil arm for Codex) waits for step A and a new subscription: not in v0.3. **Amended:** arm B ran on v0.2's
  manual under dl-025 (campaign-005, deprecated by bug-035; campaign-006 on approver policy v2), and
  [dl-027](../memory/decision-log/dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md)
  (approved 2026-10-26) brings step A under Codex into v0.3, before 2026-11-13, with a cut order.

**The triage**, the approver's decisions in chat (2026-10-24, "proceed as you recommend"):

| # | Element or item | Decision |
|---|---|---|
| 1 | The sequencer's v0.3 scope | Split: v0.3 as above, "Broader categories" to v0.4 (sequencer 1.2, task-103) |
| 2 | S1 1.0's bimodal step 5 | [bug-025](../memory/bug/bug-025-s1-1-0-s-step-5-leaves-createpatch-s-diff-ambiguous-and-its-result-is-bimodal-in-every-arm.md); the requirement stated in S1 1.1; a limit on the method page (W16) |
| 3 | Repetitions | [dl-023](../memory/decision-log/dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md): the reference campaign keeps v0.1's shape (dl-017 point 4); groups reach n = 3 through repetition campaigns of the same key |
| 4 | The S1 M-K1 finding (`81ebb2691f9c/1`, 1.70×) | A W16 documentation task: the one-line annotation (the manual imposed the process; the engine never started), then filed in WingFoil under dl-009 with the approver's consent |
| 5 | The retrospective's bugs | bug-026 (content checks), bug-027 (classifier v1), bug-028 (M-R2), bug-029 (M-K3/M-K4), bug-030 (▲/▼), bug-031 (`TEMPLATE_COMMIT`), bug-032 (an interrupted step's cost); four W16 tasks |
| 6 | [dl-013](../memory/decision-log/dl-013-saturation-levels-of-delegation-and-an-external-neutral-control.md) | Amended: saturation adopted in v0.3; levels of delegation and the external control deferred to v0.4 |
| 7 | v0.1's 12 smaller items | Merged: classifier v2 (bug-027), the shift-aware diff (bug-025), a lighter manual (step A). Filed: bug-033 (empty seed, `run compare` without models), bug-034 (`scenario.yaml` symlink, path helpers). Dropped: a debug flag, the ingest workflows' triage gate (superseded by dl-163), ADRs checked against tasks (dl-020's review), `features` as a conditional requirement, resuming after a first-request rate limit (never observed) |
| 8 | v0.2's follow-ups (about 45 in task notes) | bug-033 (runner and tooling, eight items) and bug-034 (scenario and arm files, four items); one task of test gaps and one of cleanups, queued last; doc fixes inside the specification tasks; the Codex ones (task-093, task-094) in task-102 and dl-024; the rest merged into the items above or dropped as limits already stated |
| 9 | Process | The `setup-contest` label is probably missing on GitHub (the approver, 2026-10-24): repository settings are the approver's, to create it before W18's configured variants can be contested; F-011 gains the evidence of `memory approve`'s spurious `illegal transition` (task-100, and the refused re-runs of 2026-10-24), written by the `wingfoil-sync` task; the Codex sqlite stores are cleared under dl-024 |

**Inputs:** [rel-v0-2](../memory/release/rel-v0-2.md)'s Retrospective; [calibration v0.2](../calibration/v0.2.md) §7
and §9; dl-020, dl-021, dl-022; [07_sequencer.md](../01_vision/07_sequencer.md) 1.1; plan-004's Completion.

**Constraints:** as plan-004's (the harnesses pinned per campaign; the same rules for every arm; nothing written into
WingFoil, Spec Kit or OpenSpec; no real-agent run without the approver's consent, each a line of
`docs/calibration/v0.3-ledger.md`; hold-out content only in the private hold-out repository; credentials never on disk,
logs, transcripts or results, beyond dl-024's bounded exception; one worktree per task, approval commands with their
`cd`), plus the review rule of dl-020 and `scripts/pre-review.sh main` before every review round.

## Steps

| # | Phase | Role | Produces | Gate |
|---|-------|------|----------|------|
| 1 | release-planning | product-owner | this plan; `rel-v0-3` filled and submitted; the triage above; dl-013 amended, dl-023, dl-024, bug-025 to bug-034 pending; task-101 to task-103 pending; `benchmark-specification` for v0.3 (task-103, then each wave's requirements and acceptance in its first task) | approver: `rel-v0-3` planning → in-development, and each element's gate |
| 1-bis | campaign, outside the release (dl-022) | scenario-author, qa | the Codex baseline campaign through `campaign-cycle`, after task-101 and task-102 | approver: task-102's consent; the campaign's spending, results and publication |
| 2 | delivery | developer, reviewer | W15 → W19 through `kanban-delivery` version 6, each wave's "Ends with" recorded in `rel-v0-3` | approver: every task pending → backlog and in-review → approved |
| 3 | calibration | scenario-author | `docs/calibration/v0.3.md`: dry runs of S1, S2, S3, S8 at 1.1 in every arm, measured costs, the revised budget, the hypotheses restated (H1, H2, H8 on the engine) | approver: revised budget; every real-agent run |
| 4 | validation | qa | as `release-cycle` states (dl-010) | approver: the real-agent runs |
| 5 | campaign | scenario-author, qa | the reference campaign (a file extending `reference`), its comparison with campaign-002 through a bridge or a recalibration (dl-021), the findings; repetition campaigns under dl-023 if the approver wants them | approver: spending, results, publication |
| 6 | publishing | tech-lead | tag `v0.3`, site, release notes `docs/releases/v0.3.md`, transcripts as release assets | approver: `rel-v0-3` releasing → released |
| 7 | retrospective | facilitator | `rel-v0-3` Retrospective; elements for the benchmark; WingFoil feedback notes | approver review |

**Delivery order** (WIP 1 in-progress, 1 in-review):

1. W15: task-101 (presets) → task-102 (Codex spike, after dl-024) → the Codex campaign (step 1-bis, campaign-004) →
   task-104 (the site's catalogue and the across-agents page, the approver's addition of 2026-10-25) → dl-025 and
   task-105 (dl-022's arm B on Terra, before 2026-11-13, the approver's addition of 2026-10-25) → campaign-005 →
   task-106 (classifier v2, bug-027 and bug-035, brought ahead from W16 by the approver on 2026-10-26: campaign-005's
   wingfoil arm stopped at approval requests v1 did not recognise) → the arm-B rerun on policy v2 (campaign-006),
   before 2026-11-13 → **step A, brought ahead by
   [dl-027](../memory/decision-log/dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md)** as soon as WingFoil 0.3.1 is tagged: its
   admission, the step-A spike under both agents (Claude Code in `-p`, Codex in `exec`), the step-A arm (the wingfoil
   arm's new version, baseline-docs with every role's directives, the agent-specific files explicit, the Codex scope
   widened; task-114, done 2026-10-28), then campaign-007 on Codex and Terra before 2026-11-13, its model slice
   `gpt-6-luna` on every scenario × 3 ([dl-031](../memory/decision-log/dl-031-gpt-6-luna-replaces-gpt-6.1-terra-as-campaign-007-s-model-slice-the-weak-model-on-codex-before-2026-11-13.md),
   replacing dl-028's `gpt-6.1-terra`; its scope task first), campaign-006's wingfoil rerun dropped for a note (the
   approver, 2026-10-28: the campaigns are preliminary, speed and correctness first) → task-103 (vision and experiment
   design) → the
   managing pin and the first `wingfoil-sync`. **dl-027's cuts:** 0.3.1 not tagged and admitted by 2026-11-02, a
   spike showing Codex cannot read the session Resource or drive the cycle, or the step-A arm not approved by
   2026-11-08 → no Codex step-A campaign, and step A goes on under Claude Code in this position; campaign-007 short
   of time → S3, then S1 × 3, then S2, then S8.
2. W16: its requirements and acceptance first; then bug-026, bug-028 with bug-029 and bug-030 (bug-027 in W15's
   task-106), bug-031 with bug-032, bug-025 with S1 1.1, the M-K1 annotation; v0.2's campaigns re-scored.
3. W17: the spike on 0.3.1 as soon as it is tagged and admitted; then the arm's rewrite — **both done in W15's
   order by dl-027**; W17 then holds what step A leaves (its reading in calibration, the method page) and, after
   2026-11-13, a Claude Code campaign of the step-A arms on Haiku 5.5 and Sonnet 5.5, every scenario, three repetitions
   at least (dl-031: the weak models' question on Claude). If 0.3.1 is
   late, W18's configuration work for speckit and openspec may start first.
4. W18: bug-034 first, then the configuring agent and the configured arms.
5. W19: the review loop.
6. Last, if time allows: bug-033, the test-gap and cleanup tasks.
7. **For v0.4's planning** (dl-031, the approver's aim of 2026-10-28: WingFoil's benefit to weak models, and to a
   project's governance with strong ones): the gates-and-roles scenario (dl-029) and S4–S7 first, the decision on
   repetitions before any campaign is read as more than preliminary; local models later (an adapter and an
   eligibility assessment).

## Handoff

- **Agent:** drafts the elements, Designs and code; runs every `wingfoil` command and records declared against
  observed behaviour; writes WingFoil friction as notes in `docs/wingfoil-feedback/` (next free number after F-042)
  through a task.
- **Approver (Roberto):** the scope and the triage, every task gate, every real-agent run and its ceiling, the revised
  budget, the campaign gates and the publication. The agent runs `memory approve` or `reject` only when asked
  explicitly in chat, with a `--reason` that says so; otherwise it hands over the command with its `cd`. Push,
  releases and repository settings stay with the approver.
- **Checkpoints:**
  - `rel-v0-3` in `in-development` (end of step 1);
  - the Codex campaign run, or its cut recorded, by 2026-11-13;
  - each wave's "Ends with" recorded;
  - calibration approved; the reference campaign `published`;
  - `rel-v0-3` `released`.
- **Completion:** `rel-v0-3` `released` with its Retrospective written; the plan then moves `active → done`.
