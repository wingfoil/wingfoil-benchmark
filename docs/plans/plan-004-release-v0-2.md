---
id: plan-004-release-v0-2
type: plan
title: "Release v0.2"
status: active
workflow: release-cycle
phase: release-cycle
---

## Context

Release v0.1 is `released` (2026-10-05) and plan-003 is `done`. The `release-cycle` phase of `sw-life-cycle` now runs
its second iteration, on the release element [rel-v0-2](../memory/release/rel-v0-2.md).

**Scope:** release **v0.2 — Competitors** ([07_sequencer.md](../01_vision/07_sequencer.md) 1.1). Spec Kit and
OpenSpec arms run under the same rules as WingFoil; a campaign is compared with the previous one; Dana gets filters
and stable links. It serves Avery, Dana and the Maintainer.

| Wave | Features | Ends with |
|---|---|---|
| W12 — Eligibility and Spec Kit | F7.4 eligibility criteria · F7.1 Spec Kit arm | Spec Kit runs S1–S3 and S8 under the same rules |
| W13 — OpenSpec and contests | F7.1 OpenSpec arm · F7.2 setup contest process | OpenSpec runs, and a setup can be contested |
| W14 — Comparison and Dana | F5.2 campaign comparison · F5.7 profile filter and stable URLs · F1.4 resumable campaign | a second public campaign compared with the first |

**What v0.1 left for this release** (rel-v0-1 Retrospective). These elements are `pending`, and their triage is part
of step 1:

| Element | Subject | Bears on |
|---|---|---|
| dl-007 | Claude 5.5 models, a bridge to v0.1, a model ladder from Haiku 4.5 | the campaign's models and budget |
| dl-008 | model configurations and the cost-quality frontier | the site; routing later |
| dl-009 | findings linked to WingFoil both ways | the `findings` phase |
| dl-010 | validation in every arm, on the largest step | step 4, `release-cycle` |
| dl-011 | an independent review for every task | step 2, `kanban-delivery` |
| dl-012 | budget, estimate margin, campaign-wide ceiling, repetitions, partial re-runs | steps 3 and 5; it overlaps F1.4 |
| dl-013 | saturation, levels of delegation, an external neutral control | the scenario conventions |
| dl-014 | process safeguards for several sessions | every step |
| bug-005 | a bug never closes | the bug type's states |
| bug-012 | a step's tokens leave out the auxiliary models | REQ-RUN-09 |
| bug-013 | a running campaign cannot be stopped; no fail-fast | step 5; it overlaps F1.4 |
| bug-014 | no preflight of the harness's environment | steps 4 and 5 |
| bug-015 | the benchmark's images accumulate | housekeeping |

The Retrospective also lists smaller items for triage, among them v0.2's wingfoil arm manual started from WingFoil's
`docs/agents.md` (usage note N43).

**Inputs:**

- [07_sequencer.md](../01_vision/07_sequencer.md) 1.1 (v0.2) and [06_features.md](../01_vision/06_features.md) (F7.1,
  F7.2, F7.4, F5.2, F5.7, F1.4);
- [09_experiment-design.md](../01_vision/09_experiment-design.md) 1.1 (arms, parity rules, T1, T7, T14);
- [X_competitor-landscape-2026-09-22.md](../01_vision/X_competitor-landscape-2026-09-22.md). Spec Kit v1.0.9 and
  OpenSpec v1.13.1 were re-verified there on 2026-09-22; the rest is as received, and is re-verified at step 1;
- the v0.1 specification ([requirements.md](../02_specification/requirements.md) 1.25, acceptance, scenarios,
  traceability), which v0.2 amends;
- [calibration v0.1](../calibration/v0.1.md): measured costs, and hypotheses H1–H10 for v0.2;
- the published v0.1 campaign `c82a5e74885b/2`, which F5.2 compares against.

**Constraints:**

- **The harnesses under test** are the latest released versions at the campaign: WingFoil (today v0.2.2, `12537b62`;
  a release with WingFoil's workflow engine tests H1–H5), Spec Kit and OpenSpec. Each is pinned in the campaign file.
  Development pins a version per tool and re-pins at calibration, as v0.1 did (task-049).
- **Same rules for every arm** (experiment design §2): setup from the tool's official documentation only, scripted
  and published (T12); the same agent, model, prompts and approver policy; each tool's telemetry off (OpenSpec's is
  on by default). A tool that cannot meet them is excluded by F7.4's criteria, with the reason published.
- **Nothing is written into the WingFoil, Spec Kit or OpenSpec repositories.** Findings for WingFoil follow dl-009,
  through WingFoil's note-ingest session and with the approver's consent.
- **No real-agent run without the approver's consent.** The consent comes at a spike's or a task's pending → backlog
  gate, or in a wave's `real-agent-check`, or at calibration and campaign gates (dl-006). Every run is a line of
  `docs/calibration/v0.2-ledger.md`.
- **Hold-out content** is written only in the private `WingFoil2-Benchmark-HoldOut` repository.
- **Credentials** never reach disk, logs, transcripts or results (security-secrets).
- **Several sessions share the repository:** one linked worktree per session, and approval commands run with an
  explicit `cd` to the branch that should receive them (dl-014; the `multi-session` directive, task-057).

**A first sizing** of the reference campaign, for step 1 only. It assumes v0.1's shape with two more arms, Sonnet
only, and no slice. With v0.1's measured mean of about 1.8 € a run, that is 30 runs: S1 × 3 and S2, S3, S8 × 1, in
five arms. It comes to roughly **55–65 €**, before any slice, ladder or bridge (dl-007), and before the competitors'
own overhead, which is unknown until calibration. Calibration replaces this figure (K4, dl-012).

## Steps

| # | Phase | Role | Produces | Gate |
|---|-------|------|----------|------|
| 1 | release-planning | product-owner | `rel-v0-2` filled (version, waves, features, Goal, Scope); the triage of the pending elements above; `benchmark-specification` for the new features (requirements, acceptance, scenarios conventions, traceability amended); the W12 tasks | approver: `rel-v0-2` planning → in-development, and each triaged element's gate |
| 2 | delivery | developer, reviewer | W12 → W14 through `kanban-delivery`, one task at a time, each reviewed by an independent agent; each wave's "Ends with" recorded in `rel-v0-2` | approver: every task pending → backlog and in-review → approved |
| 3 | calibration | scenario-author | `docs/calibration/v0.2.md`: dry runs of S1, S2, S3 and S8 in every arm (the two new ones included) on the campaign's models, measured costs and each step's transcript size (validation's scenario is the largest, `release-cycle` 3), revised budget, hypotheses restated on the model they read | approver: revised budget; approver: every real-agent run |
| 4 | validation | qa | acceptance green against the fake agent, coverage above 80 %, lint clean, Docker suite green; real-agent validation as `release-cycle` version 3's validation phase states (dl-010 B: one run per arm on the scenario with the largest step, preflighted and consented) | approver: the real-agent runs |
| 5 | campaign | scenario-author, qa | the reference campaign through `campaign-cycle` (`campaign-002`); the comparison with v0.1's `c82a5e74885b/2` (F5.2); the findings, and the verification of dl-147 (M-K1 on S1, H1) | approver: spending, scored results, publication |
| 6 | publishing | tech-lead | tag `v0.2`, site published with the comparison and the new filters, release notes `docs/releases/v0.2.md`, transcripts as release assets | approver: `rel-v0-2` releasing → released |
| 7 | retrospective | facilitator | `rel-v0-2` Retrospective section; bugs and decision-logs for the benchmark; WingFoil usage notes handed to the approver | approver review |

**Release-planning details (step 1):**

- **Triage first.** Each pending element is approved, rejected or deferred with a reason. Proposed order:
  1. those that change the process before delivery starts: dl-011, dl-014, bug-005;
  2. those that shape scope and budget: dl-007, dl-008, dl-012, dl-013;
  3. the bugs that become tasks of a wave: bug-012, bug-013, bug-014, bug-015.
- **F7.4 before F7.1.** The eligibility criteria are written and published before an arm is built, so that Spec Kit
  and OpenSpec are admitted by a rule and not by choice (T1). Each competitor's eligibility is checked against the
  criteria, re-verifying its current release, its Claude Code integration, headless use and its pinnable version.
- **Spikes before the arms.** One spike per competitor, a setup from its documentation in the run container, with the
  fake agent first, then one small real-agent run with consent. They answer whether its process can be followed
  headless under the neutral approver: Spec Kit's `specify workflow run` gates store approvals in `state.json`, and
  OpenSpec has no gate.
- **The operating manuals.** One per competitor arm, written to the parity rules, and published. The wingfoil arm's
  manual is reviewed against WingFoil's `docs/agents.md` at the pinned tag (N43), keeping REQ-RUN-17's approver.
- **baseline-docs.** v0.1 generates it from the wingfoil arm's configuration. Whether v0.2 adds a docs control per
  competitor, or keeps one, is decided here (T3).
- **Content and state changes are committed separately:** an element's body by hand first (`docs(...)`), then
  `memory submit` for its status.

**Delivery rules (step 2):**

- Wave order from the sequencer. A wave starts only when the previous wave's "Ends with" is verified.
- **WIP limits:** at most 1 task `in-progress` and 1 `in-review`, checked in each task's plan phase.
- One branch `task/<id>` per task, in its own linked worktree with its own `npm ci`. Test-first. Merged into `main`
  with `--no-ff` after approval, then `approved → done`.
- **Every task is reviewed by an independent, read-only agent** against its Design, the requirements and its
  acceptance scenarios. Each fix is reviewed again until clean, and the rounds are recorded (dl-011). Declared in
  `kanban-delivery` version 3's review phase (task-056).
- Review findings become elements (bug or decision-log). A change to an approved document is an amendment with a
  raised version and a recorded review decision.
- Real-agent runs are made from the main checkout, so that their git-ignored transcripts outlive task branches.
  `git status --ignored` is checked before removing a worktree.

## Handoff

- **Agent:**
  - drafts the release scope, the eligibility criteria, the tasks, the designs, the arms and the code;
  - executes every `wingfoil` command and records its declared versus observed behaviour;
  - records WingFoil friction as numbered notes (N49 on) in the untracked
    `docs/wingfoil-feedback/X_wingfoil-usage-notes.md`.
- **Approver (Roberto):** approves the scope and the triage, every task gate, every real-agent run and its ceiling,
  the revised budget, the campaign gates and the publication.
  - The agent runs `memory approve` / `reject` only when the approver asks for that gate explicitly in chat, always
    with a `--reason` that says so. Otherwise it hands over the command, prefixed with the `cd` to its checkout.
  - Pushes, releases and repository settings stay with the approver unless the approver asks.
- **Checkpoints:**
  - `rel-v0-2` in `in-development`, with the triage done (end of step 1);
  - each wave's "Ends with" recorded (step 2);
  - calibration report approved (step 3);
  - `campaign-002` `published`, with the comparison to v0.1 (step 5);
  - `rel-v0-2` `released` (step 6).
- **Completion:** `rel-v0-2` is `released` and its Retrospective is written. The plan then moves `active → done`, and
  `rel-v0-3` gets its own plan.
