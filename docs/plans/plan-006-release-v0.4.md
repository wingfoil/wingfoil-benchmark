---
id: plan-006-release-v0.4
type: plan
title: "Release v0.4"
status: active
workflow: release-cycle
phase: release-cycle
tags: ["release","v0.4"]
---

## Context

Release v0.3 is `released` (2026-11-21, tag `v0.3`) and plan-005 is `done` (2026-11-23); its retrospective's
immediate action is done (task-161, published). The `release-cycle` phase of `sw-life-cycle` runs its fourth
iteration, on [rel-v0.4](../memory/release/rel-v0.4.md).

**Scope, the approver's choices in chat (2026-11-23):**

- **The sequencer stays as it is:** v0.4 is "Broader categories" (S4, S7, S5 with the blind judge F4.6, S6), and it
  also takes what v0.3 left (the retrospective's fixes, dl-037's step B, dl-023's repetitions, task-127). The release
  is larger and slower, and may include WingFoil 0.4 before it closes.
- **WingFoil 0.4:** not waited for and not hurried. When the campaign is prepared, the arms move to WingFoil's latest
  release (dl-037 G): 0.4 if it is released and admitted by then, otherwise 0.3.2.
- **task-127 first:** the governance adoption opens the release, and its pilot runs on W20.
- **dl-035** (mirrors on Hugging Face, provider arms) moves to v1.0; **dl-036** (role isolation) enters v0.4.

| Wave | Features | High unc. | Ends with |
|---|---|---|---|
| W20 — Foundations | task-127 (methodology `kanban` 1.0.0, the runner as governance, one pilot); bug-053, bug-052, bug-055; campaign gates; the review practice; dl-037 F (quota wait, notices, machine preflight); v0.4's specification | the runner as governance | the pilot's exit criteria read; the suites green on the new methodology |
| W21 — Step B | F2.8 the wingfoil arm's step B on the external runner (dl-037 B, dl-021 amended); dl-037 G (the arms' pin); dl-023's repetition preset; dl-033; dl-034 (the release watch) | the step-B spike | an S1 dry run driven by the runner in its container, measured like every arm |
| W22 — Knowledge and legacy | F6.4 S4 fictional domain · F6.7 S7 legacy refactoring | — | F and D covered with two more scenarios |
| W23 — Specification | F6.5 S5 spec authoring · F4.6 blind rubric judge | F6.5 | category A covered |
| W24 — Planning | F6.6 S6 plan-then-execute | F6.6 | category B covered |
| W25 — Role isolation | F6.14 S11 (dl-036, provisional number); S10's self-approval temptation (H5) | the Spec Kit and OpenSpec spike | Q-E4 measured in a dry run |

W22–W24 are the sequencer's W20–W22 (1.2), renumbered by amendment 1.3, which also inserts W20, W21 and W25 and
renumbers v1.0's waves W26–W28. F2.8 and F6.14 are new features, added to `docs/01_vision/06_features.md` by W20's
specification task.

**What is already decided** (not reopened):

- **Step B** ([dl-037](../memory/decision-log/dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota.md),
  the approver's rulings of 2026-11-23): the campaign uses the runner as WingFoil's projects do. The Benchmark
  prepares the run's environment and the runner drives the scenario through WingFoil's commands; a wrapper answers its
  gates as the fixed approver, with an approver identity of its own listed only in the campaign clone. The arm is
  reported apart, its hypothesis written first, a spike first. `runner-1.2.0` (`db9467b`, manifest sha256
  `7deb889e…c47749`, 2026-11-23) holds R1 to R6; its files at the tag are published in the campaign's
  `harnesses.tar.gz` (T12). The spike exercises a subagent (the usage fix is covered only by a fixture) and, on
  WingFoil 0.4, a doctor pass, a dry run and a scripted end-to-end story first.
- **The governance adoption** (task-127, the approver's rulings of 2026-11-22 and 2026-11-23): with the runner, at
  this release-planning; one pilot on W20, in which the runner runs the adopted methodology, with exit and rollback
  criteria written apart for the two; the runner also runs `campaign-cycle`'s agent steps, the paid launch and the
  spending consent staying the approver's (a `launch.manual` step or a gate); paid launches never in `launch.allow`.
  The governance pin stays WingFoil 0.3.2; the arm's pin is the campaign's.
- **The retrospective's decisions** ([rel-v0-3](../memory/release/rel-v0-3.md), "Decisions taken with the approver",
  2026-11-22): campaign gates and a ledger line for every run; review agents in temporary directories, the reflog
  after each round; bug-053 and the pre-review selection, the full suites before in-review; figures by script and a
  final review on the last diff; a machine preflight with dl-037's F; dl-023's repetitions decided before the next
  campaign.
- **Repetitions:** the reference campaign reads every group at n = 3, through dl-023's repetition campaigns of the same
  key or a preset that runs them, decided in W21 before the campaign's estimate.

**The triage**, accepted by the approver in chat (2026-11-23):

| # | Element or item | Proposal |
|---|---|---|
| 1 | bug-046 | task-127 (W20, first) |
| 2 | bug-052, bug-053, bug-055 | one task each in W20; bug-053 first, since the pre-review selection gates every later review |
| 3 | dl-033 (costs by component) | W21, to read the campaign's costs (the approver, 2026-11-23) |
| 4 | dl-034 (a release watch) | W21, after G (the approver, 2026-11-23) |
| 5 | dl-035 (mirrors, provider arms) | v1.0 (the approver, 2026-11-23) |
| 6 | dl-036 (role isolation) | W25: its specification, the Spec Kit and OpenSpec spike and the runner's changes, each its own task (the approver, 2026-11-23) |
| 7 | S10's H5 (plan-005, Delivery order 7) | W25: a later S10 version with a step that tempts the agent to approve on its own |
| 8 | The WingFoil maintainer's points of 2026-10-24 | W21: WingFoil dl-203's `coordinator` role weighed in the step-B arm's design; dl-171 (`agent execute --next` stops at gates), bug-413 (`workflow start`'s context element) and bug-392 (built-in adapters) read in G's admission on 0.4; the Determinism Index's *P* from the workflow, a metric candidate with dl-033 |
| 9 | The follow-ups left in v0.3's notes (about fourteen) | W20: one task of test gaps and cleanups (plan-005's, never filed; `.prettierignore` hiding `src/results/`; the review loop's hold-out branch; `docs/evaluate.md` after publication); classifier v2's gaps and the `ambiguous` hook answer on Haiku with W25's oracle; the Resource's size under Codex dropped as a stated limit; `memory amend`/`park` as a WingFoil feedback note |
| 10 | The WingFoil feedback inbox | F-040 to F-047 and the open notes filed in WingFoil by the approver (dl-009), then a `wingfoil-sync` task in W20 |

**Inputs:** [rel-v0-3](../memory/release/rel-v0-3.md)'s Retrospective; plan-005's Completion; dl-021, dl-023, dl-033 to
dl-037; [07_sequencer.md](../01_vision/07_sequencer.md) 1.2; the retrospective input of 2026-10-24.

**Constraints:** as plan-005's (the harnesses pinned per campaign; the same rules for every arm; nothing written into
WingFoil, Spec Kit, OpenSpec or the external runner; no real-agent run without the approver's consent, each a line of
`docs/calibration/v0.4-ledger.md`; hold-out content only in the private hold-out repository; credentials never on
disk, logs, transcripts or results; one worktree per task, approval commands with their `cd`; the review rule of
dl-020 and `scripts/pre-review.sh main` before every round), plus the retrospective's review practice; the external
runner's project is never named in this repository ("an external workflow runner").

## Steps

| # | Phase | Role | Produces | Gate |
|---|-------|------|----------|------|
| 1 | release-planning | product-owner | this plan; `rel-v0.4` filled and submitted; the triage above; W20's and W21's first tasks pending | approver: `rel-v0.4` planning → in-development, and each element's gate |
| 2 | delivery | developer, reviewer | W20 → W25 through `kanban-delivery` (version 6 until task-127 adopts the methodology, then the adopted one), each wave's "Ends with" recorded in `rel-v0.4` | approver: every task pending → backlog and in-review → approved |
| 3 | calibration | scenario-author | `docs/calibration/v0.4.md`: dry runs of every v0.4 scenario in every arm, step B included, measured costs, the revised budget, the hypotheses restated | approver: revised budget; every real-agent run |
| 4 | validation | qa | as `release-cycle` states (dl-010) | approver: the real-agent runs |
| 5 | campaign | scenario-author, qa | the reference campaign at n = 3, on the arms' latest WingFoil (G), step B apart; its bridge to campaign-009 | approver: spending, results, publication |
| 6 | publishing | tech-lead | tag `v0.4`, site, release notes `docs/releases/v0.4.md`, transcripts and harnesses as release assets | approver: `rel-v0.4` releasing → released |
| 7 | retrospective | facilitator | `rel-v0.4` Retrospective; elements for the benchmark; WingFoil feedback notes | approver review |

**Delivery order** (WIP 1 in-progress, 1 in-review):

1. W20: task-127 (the adoption and the pilot's criteria) → v0.4's specification (the sequencer's amendment 1.3, F2.8
   and F6.14 in the features, the experiment design's Q-E4 and step B, the requirements each wave needs first) →
   bug-053 → bug-052 → bug-055 → the campaign gates → the review practice → dl-037 F → the test gaps and cleanups →
   the `wingfoil-sync`. The pilot's exit criteria are read when W20's last task is done.
2. W21: dl-037 G (the arms' pin, re-run when the campaign is prepared) → the step-B spike on `runner-1.2.0` (one dry
   run at most, with the approver's spending consent) → the `wingfoil-runner` arm, its hypothesis first → dl-023's
   repetition preset → dl-033 → dl-034.
3. W22 → W24: each wave's specification first (its scenario, its requirements and acceptance), then the scenario; S5
   and S6 start with a spike (high uncertainty).
4. W25: dl-036's specification, the Spec Kit and OpenSpec spike, the runner's changes (a role and a snapshot per
   step, the neutral verdict file), S11; S10's temptation.
5. The order may move within the release when a decision says so (sequencer decision 8); each wave keeps its
   features and its "Ends with".

## Handoff

- **Agent:** drafts the elements, Designs and code; runs every `wingfoil` command and records declared against
  observed behaviour; writes WingFoil friction as notes in `docs/wingfoil-feedback/` (next free number after F-047)
  through a task.
- **Approver (Roberto):** the scope and the triage, every task gate, every real-agent run and its ceiling, the revised
  budget, the campaign gates and the publication. The agent runs `memory approve` or `reject` only when asked
  explicitly in chat; otherwise it hands over the command with its `cd`. Push, releases and repository settings stay
  with the approver.
- **Checkpoints:**
  - `rel-v0.4` in `in-development` (end of step 1);
  - the pilot's exit criteria read at W20's end, and the methodology kept or rolled back;
  - each wave's "Ends with" recorded;
  - calibration approved; the reference campaign `published`;
  - `rel-v0.4` `released`.
- **Completion:** `rel-v0.4` `released` with its Retrospective written; the plan then moves `active → done`.
