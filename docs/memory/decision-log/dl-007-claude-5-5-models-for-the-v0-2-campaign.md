---
id: dl-007-claude-5-5-models-for-the-v0-2-campaign
type: decision-log
title: "Claude 5.5 models for the v0.2 campaign"
status: draft
---

## Context

Raised by the approver on 2026-10-03, while the v0.1 reference campaign
([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md), `c82a5e74885b`) runs.

v0.1 runs on **Claude Sonnet 5** (`claude-sonnet-5`), with an **Opus 5** (`claude-opus-5`) comparison slice
([09_experiment-design.md](../../01_vision/09_experiment-design.md) 1.1 §6; calibration
[v0.1.md](../../calibration/v0.1.md) §1). Since then, the 5.5 generation is available: **Sonnet 5.5**
(`claude-sonnet-5-5`) and **Opus 5.5** (`claude-opus-5-5`). This decision covers which models v0.2 runs on. The v0.1
campaign is not changed: its estimate, budget and consent are all on the 5 models.

**Prices** (USD per million tokens, Anthropic first-party API rates; cache writes at 1.25× input):

| Model | Input | Output | Cache write | Cache read |
|---|---|---|---|---|
| Sonnet 5 | 2.00 | 10.00 | 2.50 | 0.20 |
| **Sonnet 5.5** | 2.00 | 10.00 | 2.50 | 0.20 |
| Opus 5 | 5.00 | 25.00 | 6.25 | 0.50 |
| **Opus 5.5** | 4.00 | 20.00 | 5.00 | **0.20** |

These prices are checked against the reported costs: recomputing the calibration dry runs' recorded tokens with them gives the cost
the agent reported (dry run 19, Opus 5: 24.06 against 24.08 USD; dry run 15, Sonnet 5: 2.158 against 2.158 USD).

**What the price change does to this benchmark.** The cost of a run is dominated by **cache reads**. In dry run 19 (S1
wingfoil, Opus 5) they are 23.9 M of 24.9 M tokens; S1 runs on Sonnet look the same (3.2 M of 3.5 M, dry run 15).
So:

- **Opus 5.5** cuts cache reads from 0.50 to 0.20 USD/M. With the same tokens, dry run 19 would cost **14.47 USD instead of
  24.08 (−40 %)**, and dry run 18 (S1 baseline, stopped at its cap) 9.33 instead of 14.67 (−36 %). Calibration
  measured the full three-arm slice at about 89 €. It would come to about **54 €**, still more than the 21 € slice
  option A kept.
- **Sonnet 5.5** costs the same per token as Sonnet 5. The main campaign gets cheaper only if Sonnet 5.5 uses
  fewer tokens on the same scenarios, and only a dry run can show that.
- The price per token is not the price per run. Opus 5.5 defaults to effort `medium` where Opus 5 defaults to
  `high`, and Sonnet 5.5's effort levels are recalibrated. What Claude Code sends, and how many turns and tokens a
  run takes, change with the model. The figures above are bounds at equal tokens, not an estimate.

**What a model change costs the benchmark:**

- **Comparability with v0.1.** Calibration §11's hypotheses H1–H5 compare v0.2's wingfoil arm with v0.1's
  (WingFoil v0.2.2) on "the same model and agent". A change of model breaks that condition unless v0.2 also
  measures the v0.1 configuration on the new model. The same holds for any comparison across releases on the site
  (T14: cross-model numbers are never mixed with same-model ones).
- **Calibration again.** `campaign estimate` refuses a key with no completed dry run on its model (task-021
  decision 2), so every scenario × arm needs a dry run on each new model. v0.2 calibrates anyway, for its new
  arms (Spec Kit, OpenSpec) and WingFoil's new version.
- **The agent pin.** v0.1 pins Claude Code 2.1.280. Whether it supports the 5.5 models, and how it sets effort
  on them, is to be checked. A newer agent pin is a second change to measure.
- **Reproducibility over time.** The older the model, the sooner it is retired. A benchmark on the current
  generation stays re-runnable longer.

## Options

- **A. Stay on Sonnet 5 / Opus 5 in v0.2.** Comparability with v0.1 is kept as it is, and H1–H5 hold as written.
  The Opus slice stays expensive (option A's shape again or less), and the benchmark ages on a superseded
  generation.
- **B. Move both to 5.5 in v0.2, with a bridge.** Sonnet 5.5 becomes the default and Opus 5.5 the slice. With the
  cache-read price cut, the slice can return to **three arms** within a budget close to v0.1's. A **bridge slice**
  re-runs v0.1's configuration on the new model (S1, baseline and wingfoil on WingFoil v0.2.2), so the v0.1 → v0.2
  comparison and H1–H5 are read within one model. The hypotheses table states which model each row reads.
- **C. Opus 5.5 for the slice only, Sonnet 5 as the default.** The cheapest change: the slice is cheaper and can
  cover three arms, and the main campaign stays comparable with v0.1. The Sonnet and Opus generations no longer
  match, so the slice compares across both model and generation, which T14 counts as a confound.
- **D. Postpone to v0.3.** v0.2 already changes the arms and WingFoil's version. Adding the model would be a third
  variable in the same release.

## Proposal

**B**, to be confirmed at v0.2's release-planning once its calibration has measured cost per run:

1. v0.2's calibration dry-runs every scenario × arm on **Sonnet 5.5**, and S1 in three arms on **Opus 5.5**. It
   first checks the agent pin, and how effort is set on each model.
2. A **bridge slice** in the v0.2 campaign: S1 × {baseline, wingfoil on WingFoil v0.2.2} on Sonnet 5.5, so that
   v0.1 → v0.2 is compared on one model. Its size is set by calibration.
3. If calibration shows that Sonnet 5.5 costs more per run than the budget allows, fall back to **C**.
4. The amendment goes through the experiment design (§6, model and slice) and calibration §11 (H1–H5 restated on
   the model they read), with a raised version and the review decision recorded.

## Consequences

- `09_experiment-design.md` gets an amendment for v0.2 (model, slice, bridge). v0.1's text stays as it ran.
- v0.2's budget (K4) is revised on 5.5 measurements; the 5 → 5.5 price table above is its starting point, not its
  estimate.
- The site shows the model of every number. v0.1's Sonnet 5 results and v0.2's Sonnet 5.5 results are compared only
  through the bridge.
- If v0.2 keeps Sonnet 5 (option A or C), H1–H5 are unaffected and this decision-log records why.
