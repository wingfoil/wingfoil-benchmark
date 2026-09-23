---
id: dl-003-campaign-pins-harness-coverage-seed-and-the-models-shape
type: decision-log
title: "Campaign pins: harness coverage, seed and the models shape"
status: draft
---

## Context

Found in the independent review of task-002 (F1.1). Three gaps between what the campaign file must pin
and what the schema of task-002 expressed:

1. **Harness coverage.** [06_features.md](../../01_vision/06_features.md) F1.1 says one file pins "the
   exact version of **every harness**", and T7 requires each campaign to rerun its own baseline.
   REQ-FMT-01 describes `harnesses` as a map arm → `{tool, version, commit?}` but does not say which
   arms need an entry. The first implementation accepted a campaign with a `wingfoil` arm and
   `harnesses: {}`, which is exactly the unreproducible campaign F1.1 exists to prevent. Arm
   definitions (`arms/<arm>/arm.yaml`, REQ-FMT-05) carry `requires`, but they arrive in W3.
2. **`seed`.** F1.1 lists "seed" among the pinned variables; REQ-FMT-01 has no such field, so the
   schema rejects it as unknown.
3. **`models` shape.** REQ-FMT-01 says "a list with one default, plus slices"; task-002's Design used
   the object `{default, slices?}` without recording the departure.

## Decision

1. **Harness coverage (interim rule, until W3):** every arm except `baseline` and `baseline-docs` must
   have a harness entry, and those two must not have one, because they run the plain agent (experiment
   design §2). When `version` is a commit SHA and `commit` is also given, `commit` must start with
   `version`. In W3 the rule reads `requires` from each arm definition, and this list of harness-free
   arms disappears.
2. **`seed`:** F1.1's "seed" is the scenario seed, already pinned by `scenario@version`, whose
   directory contains it (REQ-FMT-04). No campaign field is added. Claude Code exposes no sampling
   seed, so there is nothing else a campaign could pin under that name.
3. **`models`:** stays the object `{default, slices?}`. "A list with one default" is one reading of
   REQ-FMT-01; an object states which model is the default instead of marking one entry of a list.

## Consequences

- REQ-FMT-01 is amended (requirements 1.2) with the harness-coverage rule, the `models` object and a
  note that the scenario seed is pinned through `scenario@version`. F1.1 in
  [06_features.md](../../01_vision/06_features.md) gets the same note (features 1.3), so that "seed"
  is no longer read as a campaign field.
- Both amendments are review decisions on approved documents, recorded with the approver's reason.
- The interim harness rule is revisited in W3 (F2.5, arm definitions); a `bug` or `decision-log`
  element is not needed, because the rule lives in one function with the W3 note.
