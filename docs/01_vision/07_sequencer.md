# Sequencer — WingFoil Benchmark

**Version:** 1.2
**Date:** 2026-10-27
**Status:** Approved
**Traces to:** [06_features.md](06_features.md) (decisions 1–3), [05_journeys.md](05_journeys.md), [04_personas.md](04_personas.md); 1.2: [plan-005](../plans/plan-005-release-v0-3.md), [rel-v0-3](../memory/release/rel-v0-3.md)

---

## Rules

The sequencer follows the Lean Inception rules:

- a **wave** holds at most **3 features**;
- a wave holds at most **one high-uncertainty** feature;
- each wave builds on the previous ones, and ends in something that can be run or checked.

A **release** is a group of waves that ends in a result someone can use.

---

## Releases at a glance

| Release | Goal | Serves | Features |
|---|---|---|---|
| **v0.1 — First preliminary result** | A WingFoil-only campaign (baseline, baseline-docs, wingfoil) on S1–S3 and S8, published as preliminary. The repository becomes public. | Riley (primary), Maintainer | 33 |
| **v0.2 — Competitors** | Spec Kit and OpenSpec arms under the same rules; campaign comparison; filters for Dana. | Avery, Dana, Maintainer | 7 |
| **v0.3 — WingFoil as designed, harnesses as configured** | Re-measure S1, S2, S3 and S8 at 1.1 with a corrected oracle and metrics; the wingfoil arm driving WingFoil 0.3.1's workflow engine; every harness also configured for the project; the review loop measured per arm; campaigns composed from presets, Codex among the agents (1.2). | Riley, Avery, Dana, Maintainer | 2 new (F7.5, F4.9); F1.1, F2.6, F2.7, F4.1, F4.3 revisited |
| **v0.4 — Broader categories** | Cover A and B: S4, S5 (with the blind judge), S6, S7 (from v0.3 in 1.2). | Dana, Maintainer | 5 |
| **v1.0 — Macro projects** | M1–M3 and S9, run for WingFoil's major releases; contributions from external authors. | all | 5 |

Every feature of `06_features.md` is assigned to exactly one release; a later release may revisit it (1.2), and says so.

---

## v0.1 — First preliminary result

Categories covered: **C, D, E, F** (features decision 3). A, B and G are declared missing on the site.

| Wave | Features | High unc. | Ends with |
|---|---|---|---|
| W1 — Skeleton | F3.1 scenario format · F1.1 campaign file · F2.1 isolated run | — | a trivial scenario runs in a container from a campaign file |
| W2 — Agent in the loop | F2.2 fresh-session steps · F2.3 Claude Code adapter · F2.4 neutral approver | F2.4 | a multi-step run with usage captured and interventions counted |
| W3 — Arms | F2.5 arm setups · F2.6 WingFoil under test · F2.7 arm activation (operating manuals) | — | the same scenario runs in the baseline, baseline-docs and wingfoil arms |
| W4 — Scenario hygiene | F3.5 hold-out integration · F3.2 validator and leak scan · F3.4 scenario versioning | — | a scenario validated, with its oracle kept outside the container |
| W5 — Cost control | F3.3 dry run · F1.2 cost estimate · F1.3 budget guard | — | a campaign refuses to start above the ceiling |
| W6 — First scores | F4.1 hidden-test oracle · F4.3 cost metrics · F3.6 expected failures | — | pass/fail and cost per run, with expected failures marked |
| W7 — First content | F6.1 S1 conformance · F6.2 S2 injected bugs · F5.1 results store | — | S1 and S2 scored in all three arms |
| W8 — Continuity and governance | F6.3 S3 multi-session evolution · F6.8 S8 directive compliance · F4.8 tool-neutral governance metrics | — | S3 and S8 scored |
| W9 — Quality | F4.2 static quality · F4.7 next-change cost · F4.4 setup/step split and break-even | — | the full quality and cost picture per run |
| W10 — Determinism and findings | F4.5 determinism metric · F5.3 run detail · F5.4 finding note | F4.5 | determinism measured, and a first finding note ready for WingFoil |
| W11 — Publish | F5.5 landing page · F5.8 method page · F5.6 manual publish | — | **first preliminary result public; repository public** |

## v0.2 — Competitors

Competitors come after the first WingFoil-only result (features decision 2).

| Wave | Features | High unc. | Ends with |
|---|---|---|---|
| W12 — Eligibility and Spec Kit | F7.4 eligibility criteria · F7.1 Spec Kit arm | — | Spec Kit runs S1–S3 and S8 under the same rules |
| W13 — OpenSpec and contests | F7.1 OpenSpec arm · F7.2 setup contest process | — | OpenSpec runs, and a setup can be contested |
| W14 — Comparison and Dana | F5.2 campaign comparison · F5.7 profile filter and stable URLs · F1.4 resumable campaign | — | a second public campaign compared with the first |

## v0.3 — WingFoil as designed, harnesses as configured

Planned in [plan-005](../plans/plan-005-release-v0-3.md) (1.2). Campaigns run outside the release cycle, from files
that extend a preset ([dl-022](../memory/decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md)).

| Wave | Features | High unc. | Ends with |
|---|---|---|---|
| W15 — Presets and Codex | F1.1 campaign presets and `extends:` | the Codex spike | the Codex baseline campaign run, comparable with campaign-002's baseline |
| W16 — The method corrected | F4.1 content checks v2 and a human rubric · F4.3 cost metrics (M-K3, M-K4), M-R2 v2, the variance rule | — | v0.2's campaigns re-scored offline from their transcripts, at no spending |
| W17 — WingFoil 0.3.1, step A | F2.7 the wingfoil arm driving the workflow cycle · F2.6 WingFoil 0.3.1 under test | the spike on 0.3.1 | an S1 dry run whose agent drives the engine |
| W18 — Configured variants | F7.5 configured variants | the configuring agent | every arm, configured ones included, in a dry run |
| W19 — The review loop | F4.9 the review loop per arm | F4.9 | the review-loop metrics in the dry runs |

W15 also ran, before the ChatGPT Plus subscription's end on 2026-11-13: dl-022's arm B on Codex (campaign-005 and,
on approver policy v2, campaign-006; dl-025), the classifier v2 brought ahead from W16 (task-106, dl-026), and step A
brought ahead from W17 with a Codex campaign of the step-A arm
([dl-027](../memory/decision-log/dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md),
with its cut order). The waves keep their features; only their order of delivery moves.

## v0.4 — Broader categories

v0.3's waves of 1.1, renumbered (1.2).

| Wave | Features | High unc. | Ends with |
|---|---|---|---|
| W20 — Knowledge and legacy | F6.4 S4 fictional domain · F6.7 S7 legacy refactoring | — | F and D covered with two more scenarios |
| W21 — Specification | F6.5 S5 spec authoring · F4.6 blind rubric judge | F6.5 | category A covered |
| W22 — Planning | F6.6 S6 plan-then-execute | F6.6 | category B covered |

## v1.0 — Macro projects

Run for WingFoil's major releases, with a reduced smoke run at each minor (brief §5).

| Wave | Features | High unc. | Ends with |
|---|---|---|---|
| W23 — First macros | F6.10 M1 calculator · F6.11 M2 bookmarks dashboard | — | two macro projects run end to end |
| W24 — Hard ones | F6.12 M3 situation awareness · F6.9 S9 parallel agents | F6.12 | categories F and G covered at scale |
| W25 — Openness | F7.3 external contribution guide | — | external scenario authors supported |

W24 (W19 until 1.2) holds two high-uncertainty features (F6.12 and F6.9). This breaks the one-per-wave rule. It is
accepted for v1.0, because it is far away and will be re-planned (sequencer decision 4).

---

## Decisions from the sequencer review

1. **Budget measure:** the API-equivalent cost is always reported. The budget guard (F1.2, F1.3)
   applies to whichever limit actually applies: money for API usage, or quotas and time for a
   subscription.
2. **Determinism in v0.1:** 3 repetitions on S1 only, and 1 repetition on S2, S3 and S8. F4.5 stays
   in W10.
3. **WingFoil version:** the benchmark is developed against the pinned WingFoil v0.2 pre-release
   (commit `3df305e`; amended in 1.1). The first public campaign runs on the latest released
   WingFoil at that time.
4. **W19:** accepted with two high-uncertainty features.

### Amendment 1.1 (specification phase, 2026-09-22)

5. **Decision 3 amended:** development targets the WingFoil v0.2 pre-release pinned to a commit, not
   "0.1.0". Earlier text described the pinned build as "WingFoil 0.1.0" lacking the Memory transition
   verbs and MCP writes. That was wrong: the build (`7a65580`) already had them, because WingFoil's
   `package.json` version had not been bumped. The WingFoil under development is now the **v0.2
   pre-release, pinned to commit `3df305e`**. Its only relevant gap is the missing **workflow engine**.
   Source: scenario-specs review (2026-09-22), [../02_specification/scenarios/README.md](../02_specification/scenarios/README.md) K5.

### Amendment 1.2 (v0.3, release-planning, 2026-10-27)

6. **v0.3 is "WingFoil as designed, harnesses as configured"**, the approver's choice of 2026-10-24: S1, S2, S3 and S8
   re-measured at 1.1, the wingfoil arm on WingFoil 0.3.1 driving its workflow engine
   ([dl-021](../memory/decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)
   step A), every harness also configured for the project (F7.5), the review loop measured per arm (F4.9); waves
   W15–W19. It revisits F1.1, F2.6, F2.7, F4.1 and F4.3, assigned to v0.1, and adds F7.5 and F4.9.
7. **"Broader categories" moves to v0.4**, its waves renumbered W20–W22; v1.0's waves renumbered W23–W25. Decision
   4 reads W24.
8. **The order of delivery may move within a release** when a decision says so (dl-022, dl-027): W15 ran W16's
   classifier v2 and W17's step A ahead of their waves; each wave keeps its features and its "Ends with".

Source: [task-103](../memory/task/task-103-the-v0-3-vision-and-experiment-design-amendments.md);
[plan-005](../plans/plan-005-release-v0-3.md); the approver's review decision at the task's review.
