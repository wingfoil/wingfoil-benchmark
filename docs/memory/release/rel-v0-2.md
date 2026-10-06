---
id: rel-v0-2
type: release
title: "v0.2"
status: in-development
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
below). A first sizing, Sonnet only, seven arms (a docs control per harness, decided at triage), v0.1's repetitions: about 42
runs, roughly 75–85 €
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

### Triage of what v0.1 left

**Decided by the approver in chat on 2026-10-05: "triage come proposto".** Each approval was run by the agent at the
approver's request, with a reason saying so:

- **approved:** dl-011 `8488c61`, dl-014 `63c41d4`, dl-009 `9c405e3`, dl-007 `e09918a`, dl-008 `76a45aa`, dl-012
  `4b53a08`, dl-010 `42b05a0`;
- **bugs accepted for fixing:** bug-014 `c2682ac`, bug-015 `6743518`, bug-012 `abc441c`, bug-013 `62645b4`;
- **already approved since v0.1:** bug-005; its fix is planned in W12;
- **deferred to v0.3:** dl-013, left `pending` and carried to rel-v0-3. A reject would have sent it back to `draft`,
  which says something else.

The tables below are the proposal as approved.

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

**4. The approver's answers (2026-10-05):**

- **A docs control per competitor (T3): yes.** Each harness arm gets its own docs control, generated from that arm's
  configuration as baseline-docs is from wingfoil's. "More context, not the harness" is then controlled per harness.
  The arms become seven: baseline, then wingfoil, Spec Kit and OpenSpec, each with its docs control. The first sizing
  grows to about 42 runs, roughly 75–85 € before slices, to be replaced by calibration. The generator, the arms'
  names and parity rules are part of this phase's specification.
- **The Spec Kit arm follows its process through its skills (option 1),** started by the runner like every arm.
  When WingFoil has its workflow engine, the engine-led option (2) is taken up for both tools, so that two
  engine-led harnesses are compared under the same new runner rules.
- **WingFoil for the campaign:** not changed, so the default stands, the latest WingFoil release at the campaign.

The questions as they were put:

- **A docs control per competitor (T3)?** v0.1's baseline-docs is generated from the wingfoil arm's configuration.
  Either one docs control stays (cheaper), or each competitor gets its own (fairer: "more context" is controlled per
  harness, but the run count grows).
- **How the Spec Kit arm follows its process?** The competitor re-verification of 2026-10-05
  ([X_competitor-landscape-2026-10-05.md](../../01_vision/X_competitor-landscape-2026-10-05.md)) found that Spec Kit's
  workflow engine (`specify workflow run`) spawns `claude -p --model …` itself. Two options:
  - (1) the agent follows Spec Kit's skills, started by the runner as in every arm. This keeps the metering, the caps
    and the neutral approver as they are, and is proposed for v0.2;
  - (2) Spec Kit's engine orchestrates the agent: the "harness launches the agent" arm of calibration §7 and dl-008,
    which needs new runner rules.
- **Which WingFoil for the campaign?** The latest release at the campaign. If WingFoil's workflow engine is released
  before v0.2's calibration, H1–H5 are tested. Otherwise the campaign runs v0.2.2 again, and H1–H5 wait.

**5. Found during W12** (approved by the approver on 2026-10-06, after task-062's spike):

| Element | Decision | Lands in |
|---|---|---|
| [dl-015](../decision-log/dl-015-the-effort-the-agent-sends-is-pinned-per-model-by-the-campaign.md) effort pinned per model | **approved, option C** (`662418a`) | **W13**, before calibration (the approver in chat, 2026-10-06: "dl-015 in W13") |
| [bug-016](../bug/bug-016-a-run-s-cost-is-trusted-when-the-agent-does-not-know-the-model-s-price.md) a cost the agent cannot price is trusted | **approved as a defect** (`231524f`) | to place at W13's plan phase, beside dl-015 (both read `modelUsage` and the agent pin) |

task-062 also recommends pinning Claude Code **2.1.291 or later** for v0.2 (2.1.280 misprices Sonnet 5.5): an input
for calibration's re-pin.

**Smaller items** left by v0.1's Retrospective are triaged with the W12–W14 task plans; v0.2's wingfoil arm manual
is reviewed against WingFoil's `docs/agents.md` at the pinned tag (N43).

## Release checklist

- [x] release-planning: scope approved (planning → in-development, `5f68d97`, 2026-10-05); triage recorded
  (`c304315`); specification approved and merged (`149745f`: experiment design 1.2, requirements 1.26, acceptance 1.1,
  traceability 1.4, after three independent reviews); W12 tasks task-056 to task-067 in the backlog (plan:
  [plan-004](../../plans/plan-004-release-v0-2.md))
- [ ] delivery: W12–W14 done, every wave's "Ends with" verified
- [ ] calibration: dry runs in every arm, budget revised (`docs/calibration/v0.2.md`)
- [ ] validation: acceptance green on the fake agent, coverage > 80 %, lint clean, the real-agent validation dl-010
  decides
- [ ] campaign: reference campaign published and compared with v0.1 (campaign: —)
- [ ] publishing: tag `v0.2`, site published, release notes, transcripts attached
- [ ] retrospective: section below written; WingFoil usage notes handed to the approver

## Retrospective

<!-- What went well, what to change, and the WingFoil usage notes handed to WingFoil. -->
