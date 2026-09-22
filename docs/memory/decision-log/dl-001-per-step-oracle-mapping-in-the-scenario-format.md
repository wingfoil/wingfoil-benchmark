---
id: dl-001-per-step-oracle-mapping-in-the-scenario-format
type: decision-log
title: "Per-step oracle mapping in the scenario format"
status: approved
---

## Context

Found in the independent review of task-001 (F3.1). REQ-FMT-04 (requirements 1.1) declares the oracle
as "public test directory, checks, third-party pins with licenses", and task-001 implements it as one
`oracle.public_tests` directory with no link to steps.

The approved scenario specs score different material after different steps:

- S1 ([S1.md](../../02_specification/scenarios/S1.md) §6): RFC 6901 examples after step 1; the
  `json-patch-tests` suite after steps 2, 3 and 4; RFC 7386 examples after step 4; a regression check
  after step 4.
- S3 and S8: hidden functional tests per step.

The experiment design scores every step snapshot (§3, item 7), and M-Q1 is the pass rate "on every
step snapshot where the scenario defines tests for that step" (§4.1). The scorer (F4.1, W6) must
therefore know which tests apply to which step. Today the format cannot say it.

## Options

1. **Directory convention, no schema change:** `oracle/public/step-<NN>/`, plus `oracle/public/all/`
   for tests that apply to every step. Implicit; a suite used after steps 2–4 must be duplicated or
   linked three times.
2. **Per-step field:** `steps[].oracle: [dir…]`. Explicit, but a suite shared by several steps is
   repeated in each step.
3. **Declared suites:** `oracle.suites: [{ id, dir, after_steps: [n…] }]`, replacing
   `oracle.public_tests`. Explicit; each suite is declared once; the validator checks that every
   `after_steps` value is a declared step.

## Proposed decision

Option 3. It states the mapping once, fits S1 without duplication, and lets the validator catch a
suite bound to a step that does not exist.

## Consequences

- Amendment of requirements.md to 1.2 (REQ-FMT-04), with a recorded review decision.
- Schema change in `src/core/scenario.ts` before any real scenario version exists (none does yet), so
  no stored result is affected (F3.4).
- Due before F4.1 (W6) and F6.1 (W7). It does not block W1: T0 keeps a single suite.
- Hold-out additions mirror the same suite ids in the private repository (REQ-ARC-03).
