# Acceptance criteria (v0.1, v0.2)

**Version:** 1.1 (draft for review: v0.2)
**Date:** 2026-10-05
**Status:** Approved (1.0); 1.1 in review
**Traces to:** [07_sequencer.md](../../01_vision/07_sequencer.md) v0.1 (W1–W11) and v0.2 (W12–W14), [06_features.md](../../01_vision/06_features.md), [05_journeys.md](../../01_vision/05_journeys.md) J1–J6, [09_experiment-design.md](../../01_vision/09_experiment-design.md)

---

One `.feature` file per feature area, in Gherkin. The files cover the **33 features of release
v0.1** and, from 1.1, the **6 features of release v0.2** (F7.4, F7.1, F7.2, F5.2, F5.7, F1.4).

| File | Features | Journeys |
|---|---|---|
| [campaign.feature](campaign.feature) | F1.1, F1.2, F1.3; F1.4 (v0.2) | J2 |
| [runner.feature](runner.feature) | F2.1–F2.7 | J2 |
| [scenarios.feature](scenarios.feature) | F3.1–F3.6, F6.1–F6.3, F6.8 | J3 |
| [scoring.feature](scoring.feature) | F4.1–F4.5, F4.7, F4.8 | J2 |
| [results.feature](results.feature) | F5.1, F5.3–F5.6, F5.8 | J1, J2, J4 |
| [competitors.feature](competitors.feature) (v0.2) | F7.4, F7.1, F7.2 | J6 |
| [comparison.feature](comparison.feature) (v0.2) | F5.2, F5.7 | J2, J5 |

## Conventions

- **Tags:** every scenario is tagged with the feature it accepts (`@F1.1`). Scenarios that test an
  error path also carry `@error`.
- **Behaviour, not commands:** steps describe what the maintainer or the system does ("the
  maintainer runs the campaign"), not command names. The command surface and the data formats are
  fixed in the requirements phase (`requirements.md`).
- **Test doubles:** acceptance tests of the runner use a **fake agent**: a scripted stand-in that
  emits pre-recorded sessions (including questions and approval requests). They never spend tokens.
  Only dry runs and campaigns use a real agent.
- **Numbers:** thresholds that appear in the approved documents (30 € warning, 100 € ceiling,
  3 interventions per step) are the **defaults**. The campaign file may override them (K4: budget
  gate loose until dry runs).

## Decisions from the acceptance review

1. **Fake agent:** a scripted fake agent is the test double for acceptance tests. Real sessions are
   used only in dry runs and campaigns.
2. **Budget refusal (F1.3):** rigid. Above the ceiling a campaign never starts, and there is no
   command-line override. The only way is to edit the campaign file, which changes the campaign's
   identity.
3. **M-F1 traceability:** F4.7 is extended to cover decision consistency (features 1.2). The
   `@F4.7` tags in `scoring.feature` are therefore correct.
