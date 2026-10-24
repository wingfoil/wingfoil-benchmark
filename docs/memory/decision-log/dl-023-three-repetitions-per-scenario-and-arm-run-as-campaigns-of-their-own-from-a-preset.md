---
id: dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset
type: decision-log
title: "Three repetitions per scenario and arm, run as campaigns of their own from a preset"
status: pending
tags: ["campaign","repetitions","v0.3"]
---

## Context

[dl-012](dl-012-budget-and-estimate-rebased-on-v0-1-s-measurements.md) set n ≥ 3 for a result to leave "preliminary"
(REQ-RES-03). [dl-017](dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md)
point 4 kept v0.1's shape in the campaigns (S1 × 3; S2, S3 and S8 × 1) until WingFoil 1.0 or the benchmark's 1.0
(the approver, 2026-10-14), so S2, S3, S8 and every model slice are still preliminary, and the v0.2 retrospective found
no rule for raising them.

What has changed since dl-017:

- **Cost:** a Sonnet 5.5 run costs about 0.4 USD (campaign `81ebb2691f9c/1`: 49 runs, 24.31 €), a quarter of v0.1's.
- **Campaigns run on their own** ([dl-022](dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)):
  a repetition campaign need not enlarge a release's reference campaign; it is a short file extending a preset.
- **v0.3 multiplies the arms** (configured variants, about 13 arms): n = 3 on every group of the reference campaign
  would roughly triple its 4 scenarios × 13 arms.
- **S1's step 5 is bimodal** ([bug-025](../bug/bug-025-s1-1-0-s-step-5-leaves-createpatch-s-diff-ambiguous-and-its-result-is-bimodal-in-every-arm.md)):
  one run per group cannot tell an arm's effect from the scenario's noise.

## Options

- **A. Keep dl-017 point 4.** Everything but S1 stays preliminary until 1.0.
- **B. n = 3 for every group of the reference campaign** from v0.3, amending dl-017 point 4. Rough size: 13 arms × 4
  scenarios × 3 ≈ 156 runs, about 80 € on Sonnet 5.5 before slices.
- **C. The reference campaign keeps v0.1's shape; repetitions run as campaigns of their own.** A preset `repetitions`
  (`repetitions: 3`, the release's default model) is extended by a short file naming the groups to raise; each such
  campaign is consented and ledgered on its own, and its runs join the reference campaign's groups of the same key
  (scenario version, arm digest, harness pin, model, effort) to reach n = 3.

## Proposal

**C**, amending dl-017 point 4 only in this: a group may reach n = 3 through a repetition campaign of the same key,
and then leaves "preliminary" (dl-012's n ≥ 3, REQ-RES-03).

- **First use:** after v0.3's reference campaign, S2, S3 and S8 at 1.1 in the arms the calibration shows the approver
  wants compared (at least baseline, baseline-docs and every harness arm), on Sonnet 5.5.
- **Model slices** stay preliminary unless a repetition campaign raises them; none is planned.
- **S1** keeps × 3 in the reference campaign.
- **v0.2's published results on 1.0** stay preliminary; they are not re-run.

## Consequences

- The requirements gain the joining rule (runs of repetition campaigns counted with the reference campaign's group of
  the same key) and the site's "preliminary" label reads n over the joined runs (REQ-RES-03 amended).
- The experiment design states the rule (v0.3's specification task).
- Each repetition campaign is a line of the release's ledger, with its own consent (dl-006, dl-022).
