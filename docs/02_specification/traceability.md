# Traceability (v0.1)

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
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

Only questions that are active in v0.1 are listed. Q-E2, Q-E3 (v0.2), G-A, G-B (v0.3) and G-G
(v1.0) have no v0.1 scenario by design.

| Question | Scenario / step | Metrics | Acceptance | Requirements |
|---|---|---|---|---|
| Q-C1 spec conformance | S1 (all steps), S3, S8 | M-Q1, M-Q2 | scoring.feature @F4.1 @F4.2 | REQ-SCO-01–04 |
| Q-C2 cost of development | S1 | M-K1, M-K2 | scoring.feature @F4.3; runner.feature @F2.3 | REQ-RUN-09, REQ-SCO-* |
| Q-D1 real defects fixed | S2 steps 1–3 | M-D1 | scoring.feature @F4.1 | REQ-SCO-01, REQ-SCO-02 |
| Q-D2 non-defects rejected | S2 step 2 (false), step 3 (duplicate) | M-D2 | scoring.feature @F4.8 (content check) | REQ-SCO-06 |
| Q-D3 regressions | S2, S1 step 4 (S1 1.1) | M-D3 | scoring.feature @F4.1 | REQ-SCO-02 |
| Q-E1 directives respected | S8 steps 1–4 | M-E1 | scoring.feature @F4.8 | REQ-SCO-05 |
| Q-F1 decisions respected or revised | S3 (D1–D5), S2 step 3 | M-F1 | scoring.feature @F4.7 | REQ-SCO-06 |
| Q-F2 next-change cost | S3 steps 2–5, S1 step 4 | M-F2 | scoring.feature @F4.7 | REQ-RUN-09 |
| G-X1 cost of the harness | all | M-K3, M-K4 | runner.feature @F2.5; scoring.feature @F4.4 | REQ-RUN-03, REQ-SCO-08 |
| G-X2 determinism | S1 × 3 repetitions | M-R1–M-R3 | scoring.feature @F4.5 | REQ-SCO-05, REQ-SCO-07 |
| (model sensitivity, T14) | S1 Opus 5 slice | all of the above, as a separate comparison | campaign.feature @F1.1 (`models` slices) | REQ-FMT-01 |

## 2. Feature → journey → acceptance → requirements → wave

| Feature | Journey | Acceptance | Requirements | Wave |
|---|---|---|---|---|
| F1.1 campaign file | J2.1 | campaign.feature | REQ-FMT-01, 02, 03; REQ-CLI-01; REQ-RUN-16 | W1 |
| F1.2 cost estimate | J2.2 | campaign.feature | REQ-CLI-02; REQ-NFR-06 | W5 |
| F1.3 budget guard | J2.2, J2.4 | campaign.feature | REQ-CLI-03; REQ-RUN-08, 13 | W5 |
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
| F4.1 hidden-test oracle | J2.5 | scoring.feature | REQ-SCO-01, 02, 03 | W6 |
| F4.2 static quality | J2.5 | scoring.feature | REQ-SCO-04 | W9 |
| F4.3 cost metrics | J2.5 | scoring.feature | REQ-RUN-09 | W6 |
| F4.4 setup/step split, break-even | J5.3 | scoring.feature | REQ-RUN-03; REQ-SCO-08 | W9 |
| F4.5 determinism | J2.6 | scoring.feature | REQ-SCO-05, 07 | W10 |
| F4.7 continuity metrics | vision | scoring.feature | REQ-SCO-06; REQ-RUN-09 | W9 |
| F4.8 tool-neutral governance | J5.2, J6.1 | scoring.feature | REQ-SCO-05, 06 | W8 |
| F5.1 results store | J2.7 | results.feature | REQ-FMT-06, 07; REQ-RES-01, 06 | W7 |
| F5.3 run detail | J2.7, J4.2 | results.feature | REQ-CLI-08; REQ-RES-06 | W10 |
| F5.4 finding note | J4.3 | results.feature | REQ-CLI-07; REQ-RES-05 | W10 |
| F5.5 landing page | J1, J6.2 | results.feature | REQ-RES-02, 03; REQ-CLI-09 | W11 |
| F5.6 manual publish | J2.8 | results.feature | REQ-RES-04; REQ-CLI-09 | W11 |
| F5.8 method page | J5.4 | results.feature | REQ-RES-02 | W11 |
| F6.1 S1 | — | scenarios.feature (outline) | scenarios/S1.md; REQ-FMT-04 | W7 |
| F6.2 S2 | — | scenarios.feature (outline) | scenarios/S2.md; REQ-FMT-04 | W7 |
| F6.3 S3 | — | scenarios.feature (outline) | scenarios/S3.md; REQ-FMT-04 | W8 |
| F6.8 S8 | — | scenarios.feature (outline) | scenarios/S8.md; REQ-FMT-04 | W8 |

**Coverage:**

- All 33 v0.1 features have at least one acceptance file and at least one requirement.
- Requirements that serve no single feature are cross-cutting: REQ-ARC-01/02/05, REQ-NFR-01–05 and
  REQ-CLI-06.

## 3. Validity threat → mitigation → built by

| Threat | Mitigation | Built by (v0.1) |
|---|---|---|
| T1 maintainer bias | GQM fixed before runs; losses published equally; tool-neutral metrics; contest process | REQ-RES-03, REQ-SCO-06; contest process F7.2 in **v0.2** |
| T2 category bias | no overall score; outcome-based governance | REQ-RES-03; REQ-SCO-05, 06 |
| T3 more context, not harness | baseline-docs generated mechanically; manual size recorded | REQ-RUN-11, 12 |
| T4 prompt leakage or asymmetry | identical prompts; leak scan | REQ-FMT-08; runner.feature @F2.7 |
| T5 training contamination | hold-out additions; purpose-written seeds (S2, S3, S8) | REQ-SCO-09; scenario specs |
| T6 model non-determinism | repetitions; `n` on every value | REQ-FMT-07; REQ-SCO-07 |
| T7 model or agent drift | model id and agent version pinned; baseline rerun per campaign | REQ-FMT-01 (baseline mandatory, 1.1); REQ-RUN-16 |
| T8 small n | preliminary labels | REQ-RES-03 |
| T9 approver policy favours some tools | one versioned policy; interventions per arm | REQ-RUN-06, 07 |
| T10 harness capability gap | expected failures | REQ-FMT-10; REQ-SCO-10 |
| T11 oracle validity | several metrics per goal | scoring.feature (all); blind judge in **v0.3** |
| T12 unequal setup effort | scripted setups; setup cost apart | REQ-RUN-03; REQ-FMT-05 |
| T13 answer lookup | web requests logged; hold-out additions | REQ-RUN-10 (**partial**: shell network use is not detected); REQ-SCO-09 |
| T14 model sensitivity | Opus 5 slice as a separate comparison | REQ-FMT-01 (`models` slices) |

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
