---
id: rel-v0-3
type: release
title: "v0.3"
status: releasing
version: v0.3
waves: [W15, W16, W17, W18, W19]
features: [F1.1, F4.1, F4.3, F2.7, F2.6, F7.5, F4.9]
---

## Goal

**WingFoil as designed, harnesses as configured.** Re-measure S1, S2, S3 and S8, in scenario versions 1.1, with an
oracle and metrics that say no more than the data, with the wingfoil arm driving WingFoil 0.3.1's workflow engine
(dl-021 step A), every harness also configured for the project, and the review loop measured in every arm. It serves
Riley (a WingFoil result that tests the engine), Avery and Dana (harnesses compared as they would use them) and the
Maintainer. The sequencer's "Broader categories" move to v0.4 (sequencer 1.2).

## Scope

Waves and features: [plan-005](../../plans/plan-005-release-v0-3.md), which holds the triage table (the approver's
decisions in chat, 2026-10-24). The specification amends `docs/02_specification/` through task-103 and each wave's
first task.

| Wave | Features | High unc. | Ends with | Verified |
|---|---|---|---|---|
| W15 — Presets and Codex | F1.1 presets and `extends:` | the Codex spike | the Codex baseline campaign run | 2026-10-29: campaign-004 published (2026-10-25); task-101, task-102, task-104 to task-111, task-114 and task-115 done; step A brought ahead by dl-027, campaign-007 published |
| W16 — The method corrected | F4.1 · F4.3 | — | v0.2's campaigns re-scored offline | 2026-11-05: task-134, `docs/calibration/v0.3-rescore.md` (task-126 to task-134 done; task-112 and task-113, its backlog, done the same day) |
| W17 — WingFoil 0.3.1, step A | F2.7 · F2.6 | the spike on 0.3.1 | an S1 dry run driving the engine | 2026-11-06: task-114's dry runs `dry-runs/94` and `95` (2026-10-28); campaign-008 published (2026-11-01); task-116 to task-125 and task-135 to task-137 done; `docs/calibration/v0.3.md` 0.1, step A read |
| W18 — Configured variants | F7.5 | the configuring agent | every arm in a dry run | 2026-11-13: closed. task-138 to task-146 done (bug-034, bug-047, bug-048, bug-049 fixed); the twelve 1.1 configurations (task-143, `docs/calibration/configuring.md` 1.1); task-144's dry runs `dry-runs/155` to `207`, every arm on S1, S2, S3 and S8 at 1.1, all completed (`160` superseded by `204`, bug-048), `docs/calibration/v0.3.md` 0.2, §5; `configure` scans what it writes (task-145); the contest form and the method page state the configured variants (task-146) |
| W19 — The review loop | F4.9 | F4.9 | the review-loop metrics in the dry runs | 2026-11-17: closed. task-147 to task-151 and task-153 done (bug-051 fixed); task-152, the pin refresh before the dry runs, done (bug-050 fixed); task-151's dry runs `dry-runs/208` to `215` (S1, S2, S3 and S8 at 1.1 in `baseline` and `wingfoil`, on `campaigns/v0-3-review-loop.dry-run.yaml`), all completed, 3.54 EUR: seven loops clean at round 1, one `no fix` at round 2; their figures from `scripts/review-loop-figures.mjs` in `docs/calibration/v0.3-review-loop.md` 1.0 |

**Outside the release, by dl-022:** the Codex baseline campaign (arm A), before 2026-11-13.

**Not in v0.3:** S4, S5 with F4.6, S6, S7 (v0.4); dl-022's arm B; dl-021's steps B and C; configuration profiles;
dl-013's levels of delegation and external control (v0.4).

**Triaged** (plan-005, Context): dl-013 amended; dl-023 and dl-024 new; bug-025 to bug-034 new; v0.1's 12 smaller items
and v0.2's follow-ups merged, filed or dropped.

## Release checklist

<!-- delivery done · calibration (dry runs, budget revision) · validation · reference campaign ·
     publishing · retrospective — with links to the elements that prove each one. -->

- **Calibration:** [task-154](../task/task-154-calibration-v0.3-plan-005-step-3-the-1.1-dry-runs-scored-the-reference-campaign-with-its-loop-and-haiku-slice-the-revised-budget-and-the-hypotheses.md): the dry runs `216`-`263`, the estimate, the budget the approver approved on
  2026-11-18 (warn 65 EUR, ceiling 80 EUR) and the hypotheses on 1.1, in
  [docs/calibration/v0.3.md](../../calibration/v0.3.md) §6.
- **Validation:** [task-159](../task/task-159-validation-of-v0.3-the-suites-and-one-real-agent-run-per-arm-on-s1-the-scenario-with-the-largest-step.md): the suites on main and the execution `2ee46ad9e617/1`, S1@1.1 in the
  thirteen arms on Sonnet 5.5, all `completed` with their review loops, 8.59 EUR API-equivalent.
- **Reference campaign:** [campaign-009](../campaign/campaign-009-v0.3-reference-campaign-thirteen-arms-on-sonnet-5.5-with-a-haiku-5.5-slice-and-the-review-loop.md): the execution `1f70fcaf2ec2/1`, 82 runs, all
  `completed`, 46.77 EUR (52.45 USD) API-equivalent within the approved budget; scored, reviewed and published
  (`5bb1e07f`, 2026-11-20). Its findings exported, bug-055 filed and approved (`0402db49`). No `compared_with`:
  campaign-002 differs in manual, scenario version and policy; the chain to v0.2 is in the release notes.
- **Publishing:** prepared on 2026-11-20 (`1e3b2338`): the catalogue entry, the site built (`1f70fcaf2ec2/1` leading,
  137 pages), the release notes [docs/releases/v0.3.md](../../releases/v0.3.md), the transcripts' release
  `1f70fcaf2ec2-1` packed (540 transcripts and the harnesses, both archives scanned clean). Published by the approver
  on 2026-11-21: main pushed at `779ebc19`; the release `1f70fcaf2ec2-1` with `transcripts.tar.gz` and
  `harnesses.tar.gz`; the site published (`gh-pages` `8f11d6db`: the eight executions, `1f70fcaf2ec2/1` leading); the
  annotated tag `v0.3` on the releasing commit `779ebc19`; the GitHub release "WingFoil Benchmark v0.3 — WingFoil as
  designed, harnesses as configured" with the release notes as its body.

## Retrospective

<!-- What went well, what to change, and the WingFoil usage notes handed to WingFoil. -->

**Inputs collected for the retrospective** (input only, not acted on before it):

- 2026-10-24, the WingFoil maintainer on the wingfoil arm and WingFoil's workflow model (dl-203, the steps A, B, C):
  [docs/retrospective-inputs/v0.3/](../../retrospective-inputs/v0.3/2026-10-24-wingfoil-maintainer-the-arm-and-the-workflow-model.md).
