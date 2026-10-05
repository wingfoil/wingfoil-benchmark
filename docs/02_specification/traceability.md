# Traceability (v0.1, v0.2)

**Version:** 1.4
**Date:** 2026-10-05
**Status:** Approved
**Traces to:** [06_features.md](../01_vision/06_features.md) 1.2, [07_sequencer.md](../01_vision/07_sequencer.md) 1.1, [09_experiment-design.md](../01_vision/09_experiment-design.md) 1.1, [scenarios/](scenarios/), [acceptance/](acceptance/), [requirements.md](requirements.md)

---

Three matrices:

- **§1** answers: does every measurement question have a scenario, a metric and something that
  computes it?
- **§2** answers: does every v0.1 feature have a journey, acceptance criteria, requirements and a
  wave?
- **§3** answers: does every validity threat have a mitigation that is actually built?

Findings from building them are in §4.

---

## 1. GQM question → scenario → metric → acceptance → requirements

Only questions that are active in v0.1 are listed. Q-E2, Q-E3 (deferred in experiment design 1.2: no scenario scheduled), G-A, G-B (v0.3) and G-G
(v1.0) have no v0.1 scenario by design.

| Question | Scenario / step | Metrics | Acceptance | Requirements |
|---|---|---|---|---|
| Q-C1 spec conformance | S1 (all steps), S3, S8 | M-Q1, M-Q2 | scoring.feature @F4.1 @F4.2 | REQ-SCO-01–04 |
| Q-C2 cost of development | S1 | M-K1, M-K2 | scoring.feature @F4.3; runner.feature @F2.3 | REQ-RUN-09, REQ-SCO-* |
| Q-D1 real defects fixed | S2 steps 1–3 | M-D1 | scoring.feature @F4.1 | REQ-SCO-01, REQ-SCO-02 |
| Q-D2 non-defects rejected | S2 step 2 (false), step 3 (duplicate) | M-D2 | scoring.feature @F4.8 (content check) | REQ-SCO-06 |
| Q-D3 regressions | S2, S1 steps 4–5 (S1 1.1, 1.3) | M-D3 | scoring.feature @F4.1 | REQ-SCO-02, REQ-SCO-12 |
| Q-E1 directives respected | S8 steps 1–4 | M-E1 | scoring.feature @F4.8 | REQ-SCO-05 |
| Q-F1 decisions respected or revised | S3 (D1–D5), S2 step 3 | M-F1 | scoring.feature @F4.7 | REQ-SCO-06, REQ-SCO-12 |
| Q-F2 next-change cost | S3 steps 2–5, S1 steps 4–5 | M-F2 | scoring.feature @F4.7 | REQ-RUN-09, REQ-SCO-12 |
| G-X1 cost of the harness | all | M-K3, M-K4 | runner.feature @F2.5; scoring.feature @F4.4 | REQ-RUN-03, REQ-SCO-08 |
| G-X2 determinism | S1 × 3 repetitions | M-R1–M-R3 | scoring.feature @F4.5 | REQ-SCO-05, REQ-SCO-07 |
| (model sensitivity, T14) | S1 Opus 5 slice | all of the above, as a separate comparison | campaign.feature @F1.1 (`models` slices) | REQ-FMT-01 |

## 2. Feature → journey → acceptance → requirements → wave

| Feature | Journey | Acceptance | Requirements | Wave |
|---|---|---|---|---|
| F1.1 campaign file | J2.1 | campaign.feature | REQ-FMT-01, 02, 03; REQ-CLI-01; REQ-RUN-16 | W1 |
| F1.2 cost estimate | J2.2 | campaign.feature | REQ-CLI-02; REQ-NFR-06 | W5 |
| F1.3 budget guard | J2.2, J2.4 | campaign.feature | REQ-CLI-03; REQ-RUN-08, 13 | W5 |
| F1.4 resumable campaign (v0.2) | J2.4 | campaign.feature | REQ-FMT-01, 06; REQ-CLI-02, 03, 06; REQ-RUN-19; REQ-RES-06; REQ-NFR-03 | W14 |
| F2.1 isolated run | J2.3 | runner.feature | REQ-RUN-01, 02; REQ-CLI-10 | W1 |
| F2.2 fresh-session steps | vision | runner.feature | REQ-RUN-04, 05 | W2 |
| F2.3 Claude Code adapter | J2.3, J2.7 | runner.feature | REQ-RUN-04, 09, 15; REQ-ARC-04 | W2 |
| F2.4 neutral approver | J2.4 | runner.feature | REQ-RUN-06, 07, 17 | W2 |
| F2.5 arm setups | J6.1 | runner.feature | REQ-FMT-05; REQ-RUN-03, 11 | W3 |
| F2.6 WingFoil under test | J2.1, J4.4 | runner.feature | REQ-RUN-14 | W3 |
| F2.7 arm activation | J3.3, J6.1 | runner.feature | REQ-RUN-12; REQ-FMT-05 | W3 |
| F3.1 scenario format | J3.2–J3.5 | scenarios.feature | REQ-FMT-04; REQ-ARC-03 | W1 |
| F3.2 validator and leak scan | J3.6 | scenarios.feature | REQ-FMT-08; REQ-CLI-04 | W4 |
| F3.3 dry run | J3.7 | scenarios.feature | REQ-CLI-05; REQ-RES-01 | W5 |
| F3.4 scenario versioning | J3.8 | scenarios.feature | REQ-FMT-09 | W4 |
| F3.5 hold-out integration | J2.5, J3.4 | scenarios.feature; runner.feature | REQ-ARC-03; REQ-CLI-10; REQ-SCO-09 | W4 |
| F3.6 expected failures | vision | scenarios.feature | REQ-FMT-10; REQ-SCO-10 | W6 |
| F4.1 hidden-test oracle | J2.5 | scoring.feature | REQ-SCO-01, 02, 03, 12 | W6 |
| F4.2 static quality | J2.5 | scoring.feature | REQ-SCO-04 | W9 |
| F4.3 cost metrics | J2.5 | scoring.feature | REQ-RUN-09 | W6 |
| F4.4 setup/step split, break-even | J5.3 | scoring.feature | REQ-RUN-03; REQ-SCO-08 | W9 |
| F4.5 determinism | J2.6 | scoring.feature | REQ-SCO-05, 07 | W10 |
| F4.7 continuity metrics | vision | scoring.feature | REQ-SCO-06, 12; REQ-RUN-09 | W9 |
| F4.8 tool-neutral governance | J5.2, J6.1 | scoring.feature | REQ-SCO-05, 06 | W8 |
| F5.1 results store | J2.7 | results.feature | REQ-FMT-06, 07; REQ-RES-01, 06 | W7 |
| F5.3 run detail | J2.7, J4.2 | results.feature | REQ-CLI-08; REQ-RES-06 | W10 |
| F5.4 finding note | J4.3 | results.feature | REQ-CLI-07; REQ-RES-05 | W10 |
| F5.5 landing page | J1, J6.2 | results.feature | REQ-RES-02, 03; REQ-CLI-09 | W11 |
| F5.6 manual publish | J2.8 | results.feature | REQ-RES-04, 06; REQ-CLI-09, 11 | W11 |
| F5.8 method page | J5.4 | results.feature | REQ-RES-02 | W11 |
| F6.1 S1 | — | scenarios.feature (outline) | scenarios/S1.md; REQ-FMT-04 | W7 |
| F6.2 S2 | — | scenarios.feature (outline) | scenarios/S2.md; REQ-FMT-04 | W7 |
| F6.3 S3 | — | scenarios.feature (outline) | scenarios/S3.md; REQ-FMT-04 | W8 |
| F6.8 S8 | — | scenarios.feature (outline) | scenarios/S8.md; REQ-FMT-04 | W8 |
| F5.2 campaign comparison (v0.2) | J2.6 | comparison.feature | REQ-CLI-12; REQ-SCO-13; REQ-RES-02, 07 | W14 |
| F5.7 profile filter, stable URLs (v0.2) | J5.1, J5.5 | comparison.feature | REQ-RES-02 (as amended in 1.26), 04, 08 | W14 |
| F7.4 eligibility criteria (v0.2) | J6.1 | competitors.feature | REQ-FMT-01, 11; REQ-RES-09 | W12 |
| F7.1 competitor arms (v0.2) | J6.1 | competitors.feature | REQ-FMT-01, 05, 06, 12, 13, 14; REQ-RUN-01, 11, 12, 14, 18; REQ-SCO-14; REQ-RES-09; REQ-CLI-11 | W12 (Spec Kit), W13 (OpenSpec) |
| F7.2 setup contest process (v0.2) | J6.3 | competitors.feature | REQ-FMT-01, 06, 13; REQ-RES-10 | W13 |

**Coverage:**

- All 39 features, 33 of v0.1 and 6 of v0.2, have at least one acceptance file and at least one requirement.
- Requirements that serve no single feature are cross-cutting: REQ-ARC-01/02/05, REQ-NFR-01–05 and
  REQ-CLI-06.

## 3. Validity threat → mitigation → built by

| Threat | Mitigation | Built by |
|---|---|---|
| T1 maintainer bias | GQM fixed before runs; losses published equally; tool-neutral metrics; eligibility by published criteria, WingFoil assessed too; contest process | REQ-RES-03, REQ-SCO-06; v0.2: REQ-FMT-11, REQ-RES-09, REQ-RES-10 |
| T2 category bias | no overall score; outcome-based governance | REQ-RES-03; REQ-SCO-05, 06 |
| T3 more context, not harness | a docs control per harness, generated mechanically; each harness compared with its own; manual size recorded | REQ-RUN-11, 12; v0.2: REQ-FMT-14, REQ-SCO-14 |
| T4 prompt leakage or asymmetry | identical prompts; leak scan | REQ-FMT-08; runner.feature @F2.7 |
| T5 training contamination | hold-out additions; purpose-written seeds (S2, S3, S8) | REQ-SCO-09; scenario specs |
| T6 model non-determinism | repetitions; `n` on every value | REQ-FMT-07; REQ-SCO-07 |
| T7 model or agent drift | model id and agent version pinned; baseline rerun per campaign | REQ-FMT-01 (baseline mandatory, 1.1); REQ-RUN-16 |
| T8 small n | preliminary labels | REQ-RES-03 |
| T9 approver policy favours some tools | one versioned policy; interventions per arm | REQ-RUN-06, 07 |
| T10 harness capability gap | expected failures | REQ-FMT-10; REQ-SCO-10 |
| T11 oracle validity | several metrics per goal | scoring.feature (all); blind judge in **v0.3** |
| T12 unequal setup effort | scripted setups from official documentation; telemetry off; setups published and contestable; setup cost apart | REQ-RUN-03; REQ-FMT-05; v0.2: REQ-RUN-18, REQ-RES-09, REQ-RES-10 |
| T13 answer lookup | web requests logged; hold-out additions | REQ-RUN-10 (**partial**: shell network use is not detected); REQ-SCO-09 |
| T14 model sensitivity | model slices as a separate comparison; v0.2: a model ladder (dl-007, dl-008), cross-model comparisons marked | REQ-FMT-01 (`models` slices); v0.2: REQ-SCO-13 |
| T15 tool drift (v0.2) | every harness pinned, assessed at that version and its artifact published; the version beside every value; across campaigns only deltas | REQ-FMT-03, 11, 12; REQ-RES-03 (as amended in 1.26); REQ-SCO-13 |

## 4. Findings

1. **REQ-SCO-11 is in the wrong section.** The approval-authority requirement is about the wingfoil
   arm's setup and identity, not about scoring. The proposal is to move it to §4 (Runner) as
   REQ-RUN-17 in requirements 1.1, with no change in content.
2. **T13 is only partly mitigated.** Shell-level network use (`curl`, `npm view`, …) is not
   detected (REQ-RUN-10). This is accepted and declared on the method page. A stronger option,
   logging DNS or HTTP at the container's network level, could be added later without changing the
   scenarios.
3. **The "baseline rerun per campaign" part of T7 is implicit.** It holds because every v0.1
   campaign runs all three arms, but no requirement enforces it. The proposal is to add to REQ-FMT-01
   in requirements 1.1: "a campaign must include the baseline arm".
4. **S1 carries Q-D3 through step 4, but S1's card does not list Q-D3.** S1 lists D as a secondary
   category, and its oracle checks regressions, but its GQM field omits Q-D3. The proposal is to add
   Q-D3 to S1's card in S1 1.1.

## Decisions from the traceability review

All four findings accepted (2026-09-22):

1. REQ-SCO-11 moved to REQ-RUN-17 (requirements 1.1).
2. T13 stays partly mitigated. Shell-level network use is not detected, and the method page declares
   this limit. Container-level network logging is a possible later addition.
3. REQ-FMT-01 makes the baseline arm mandatory (requirements 1.1).
4. Q-D3 added to S1's card (S1 1.1).

## Amendment 1.1 (delivery, W9 task-039, 2026-09-29)

REQ-SCO-12 (requirements 1.14) joins:

- Q-D3, for M-D3 from the seed's own verdicts;
- Q-F1 and Q-F2, for M-F1 and M-F2;
- F4.7;
- F4.1. M-D3 has no feature of its own in v0.1, and this matrix already traces Q-D3 to
  `scoring.feature` @F4.1.

Q-F1's "S2 step 3" is unchanged: S2's duplicate is a content check (task-035), and S2 lists no
decision.

Source: [task-039](../memory/task/task-039-continuity-metrics-and-regressions-from-the-seed.md), design
confirmed by the approver on 2026-09-29; review decision of the approver at that task's review, 2026-09-29 (`f11113a`).

## Amendment 1.2 (delivery, W11 task-047, 2026-10-01)

F5.6 gains REQ-CLI-11 (`bench transcripts pack`, requirements 1.22) and REQ-RES-06, whose transcripts
become release assets there (W11 plan-phase decision 4).

Source: [task-047](../memory/task/task-047-manual-publish-and-transcript-assets.md), design confirmed by the
approver on 2026-10-01; review decision of the approver at that task's review, 2026-10-01 (`39cb104`).

## Amendment 1.3 (calibration, task-050, 2026-10-02)

Q-D3 and Q-F2 read S1's step 5 as well as its step 4 (S1 1.3: `createPatch`, and Patch and Merge Patch run
again after it). No feature, acceptance or requirement changes.

Source: [task-050](../memory/task/task-050-calibration-of-v0-1-dry-runs-measured-costs-and-the-revised-budget.md);
review decision of the approver at that task's review, 2026-10-03 (`721321f`).

## Amendment 1.4 (v0.2 release-planning, 2026-10-05)

**§1:** Q-E2 and Q-E3 are deferred with no scenario scheduled (experiment design 1.2).

**§2** gains the six v0.2 features:

- their acceptance: `competitors.feature`, `comparison.feature`, and `campaign.feature` 1.1;
- their requirements: requirements 1.26;
- their waves: W12–W14.

**§3:**

- the header no longer reads "(v0.1)";
- T1, T3, T12 and T14 read their v0.2 mitigations;
- T15 (tool drift) is added.

Source: [rel-v0-2](../memory/release/rel-v0-2.md) and the approver's decisions on the specification review
(2026-10-05); review decision: the approver's review decision in chat, 2026-10-05 ("ok prosegui"), after three independent reviews.

