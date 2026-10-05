---
id: rel-v0-2
type: release
title: "v0.2"
status: draft
version: v0.2
waves: [W12, W13, W14]
features: [F7.4, F7.1, F7.2, F5.2, F5.7, F1.4]
---

## Goal

**Competitors.** Spec Kit and OpenSpec arms run under the same rules as WingFoil, after published eligibility
criteria admit them. A second public campaign is compared with v0.1's, and a setup can be contested. Readers can
filter results and link to them permanently.

It serves Avery, Dana and the Maintainer ([07_sequencer.md](../../01_vision/07_sequencer.md) 1.1, "Releases at a
glance").

The reference campaign runs the v0.1 scenarios (S1, S2, S3, S8) in every arm. Each harness is pinned to its latest
release at the time of the campaign. Its shape, models and budget are set at calibration (dl-007, dl-012, triaged
below). A first sizing, Sonnet only, five arms, v0.1's repetitions: 30 runs, roughly 55–65 €
([plan-004](../../plans/plan-004-release-v0-2.md)).

Categories covered: C, D, E and F, as in v0.1. A, B and G remain not covered (v0.3).

## Scope

Waves and features from [07_sequencer.md](../../01_vision/07_sequencer.md) 1.1. Execution plan:
[plan-004](../../plans/plan-004-release-v0-2.md). The specification of the new features amends `docs/02_specification/`
in this release-planning phase (`release-cycle` › release-planning).

| Wave | Features | High unc. | Ends with | Verified |
|---|---|---|---|---|
| W12 — Eligibility and Spec Kit | F7.4 eligibility criteria · F7.1 Spec Kit arm | F7.1 (headless use of Spec Kit's gates) | Spec Kit runs S1–S3 and S8 under the same rules | — |
| W13 — OpenSpec and contests | F7.1 OpenSpec arm · F7.2 setup contest process | — | OpenSpec runs, and a setup can be contested | — |
| W14 — Comparison and Dana | F5.2 campaign comparison · F5.7 profile filter and stable URLs · F1.4 resumable campaign | — | a second public campaign compared with the first | — |

### Triage of what v0.1 left (proposed, for the approver)

Every element below is `pending`. The proposal says what to decide and where the work lands. The approver approves,
rejects or defers each one; the outcome is recorded here.

**1. Process, before delivery starts** (tasks at the head of W12):

| Element | Proposal | Lands in |
|---|---|---|
| [dl-011](../decision-log/dl-011-an-independent-review-for-every-task-in-kanban-delivery.md) independent review for every task | **approve B**: written into `kanban-delivery` (version 3) | a task, first of W12 |
| [dl-014](../decision-log/dl-014-process-safeguards-for-a-repository-worked-by-several-sessions.md) multi-session safeguards | **approve B**: a benchmark directive | a task, W12 |
| [bug-005](../bug/bug-005-a-bug-cannot-name-the-task-that-fixes-it-and-never-closes.md) a bug never closes | **fix**: a `fixed` state and a `fixes` field for the bug type in `memory.yaml`; then the ten fixed bugs moved to it | a task, W12 |
| [dl-009](../decision-log/dl-009-benchmark-findings-linked-to-wingfoil-both-ways-and-verified-by-the-next-campaign.md) findings linked both ways | **approve B** (already applied to dl-147); C reconsidered with more findings | no task |

**2. Scope and budget** (decided now, measured at calibration):

| Element | Proposal | Lands in |
|---|---|---|
| [dl-007](../decision-log/dl-007-claude-5-5-models-for-the-v0-2-campaign.md) Claude 5.5 models, bridge, ladder | **approve B + E, conditional on calibration**: Sonnet 5.5 default with a v0.1 bridge slice; the Haiku 4.5 rung of the ladder; fall back to C if 5.5 does not fit. A spike first checks the agent pin against the 5.5 models | a spike in W12; calibration |
| [dl-008](../decision-log/dl-008-model-configurations-and-the-cost-quality-frontier.md) model configurations, frontier | **approve C as direction**: the ladder now (through dl-007 E); routing and `baseline-mixed` deferred until WingFoil's routing is designed | the site's frontier view: a task in W14 if the ladder runs |
| [dl-012](../decision-log/dl-012-budget-and-estimate-rebased-on-v0-1-s-measurements.md) budget, estimate, repetitions, partial re-runs | **approve C**: K4 and §6 amended; the estimate with a margin; a campaign-wide ceiling; a minimum *n*; partial re-runs as part of F1.4 | an amendment in this phase; estimate and guard tasks in W14 with F1.4 |
| [dl-010](../decision-log/dl-010-validation-exercises-every-arm-the-largest-step-and-the-harness-environment.md) validation in every arm | **approve B**: `release-cycle` validation amended (version 3) | a task, W12 |
| [dl-013](../decision-log/dl-013-saturation-levels-of-delegation-and-an-external-neutral-control.md) saturation, delegation, external control | **defer to v0.3** (broader categories, new scenarios): v0.2 adds no scenario | rel-v0-3 |

**3. Bugs that become tasks:**

| Element | Proposal | Lands in |
|---|---|---|
| [bug-014](../bug/bug-014-a-campaign-does-not-preflight-the-environment-its-harness-needs.md) no preflight | **fix**: every new arm adds environment needs | W12 |
| [bug-015](../bug/bug-015-dry-run-and-scoring-images-accumulate-on-the-host.md) images accumulate | **fix**: more arms, more images | W12 |
| [bug-012](../bug/bug-012-a-step-s-tokens-leave-out-the-models-claude-code-calls-for-its-own-work.md) auxiliary-model tokens | **fix before calibration**: tokens summed over `modelUsage`; REQ-RUN-09 amended; comparisons across campaigns read tokens | W13 |
| [bug-013](../bug/bug-013-a-running-campaign-cannot-be-stopped-cleanly-and-keeps-spending-after-systematic-failures.md) no stop, no fail-fast | **fix with F1.4** (resumable campaign): a clean stop, a fail-fast rule, a resume without repeating completed runs | W14 |

**4. Open questions for the approver:**

- **A docs control per competitor (T3)?** v0.1's baseline-docs is generated from the wingfoil arm's configuration.
  Either one docs control stays (cheaper), or each competitor gets its own (fairer: "more context" is controlled per
  harness, but the run count grows).
- **Which WingFoil for the campaign?** The latest release at the campaign. If WingFoil's workflow engine is released
  before v0.2's calibration, H1–H5 are tested. Otherwise the campaign runs v0.2.2 again, and H1–H5 wait.

**Smaller items** left by v0.1's Retrospective are triaged with the W12–W14 task plans; v0.2's wingfoil arm manual
is reviewed against WingFoil's `docs/agents.md` at the pinned tag (N43).

## Release checklist

- [ ] release-planning: scope approved, triage recorded, specification amended for the new features, W12 tasks
  created (plan: [plan-004](../../plans/plan-004-release-v0-2.md))
- [ ] delivery: W12–W14 done, every wave's "Ends with" verified
- [ ] calibration: dry runs in every arm, budget revised (`docs/calibration/v0.2.md`)
- [ ] validation: acceptance green on the fake agent, coverage > 80 %, lint clean, the real-agent validation dl-010
  decides
- [ ] campaign: reference campaign published and compared with v0.1 (campaign: —)
- [ ] publishing: tag `v0.2`, site published, release notes, transcripts attached
- [ ] retrospective: section below written; WingFoil usage notes handed to the approver

## Retrospective

<!-- What went well, what to change, and the WingFoil usage notes handed to WingFoil. -->
