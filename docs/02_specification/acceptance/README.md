# Acceptance criteria (v0.1)

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
**Traces to:** [07_sequencer.md](../../01_vision/07_sequencer.md) v0.1 (W1–W11), [06_features.md](../../01_vision/06_features.md), [05_journeys.md](../../01_vision/05_journeys.md) J1–J4, [09_experiment-design.md](../../01_vision/09_experiment-design.md)

---

One `.feature` file per feature area, in Gherkin. The files cover all **33 features of release
v0.1**.

| File | Features | Journeys |
|---|---|---|
| [campaign.feature](campaign.feature) | F1.1, F1.2, F1.3 | J2 |
| [runner.feature](runner.feature) | F2.1–F2.7 | J2 |
| [scenarios.feature](scenarios.feature) | F3.1–F3.6, F6.1–F6.3, F6.8 | J3 |
| [scoring.feature](scoring.feature) | F4.1–F4.5, F4.7, F4.8 | J2 |
| [results.feature](results.feature) | F5.1, F5.3–F5.6, F5.8 | J1, J2, J4 |

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

## Open questions

1. **Fake agent (Conventions):** is a scripted fake agent acceptable as the test double for
   acceptance tests? The alternative is recording real Claude Code sessions once and replaying
   them. That is more realistic, but the recordings go stale when the agent changes.
2. **Budget refusal (campaign.feature, F1.3):** above the ceiling, the proposal is a **hard refusal**
   that cannot be overridden from the command line, only by editing the campaign file. Is that
   right, or should an explicit override flag exist?
