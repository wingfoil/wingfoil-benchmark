---
id: task-033-s2-injected-bug-scenario
type: task
title: "S2 injected-bug scenario"
status: pending
release: v0.1
wave: W7
features: [F6.2]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-SCO-01, REQ-SCO-02, REQ-SCO-06]
---

## Context

Third task of wave **W7 — First content** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), the S2
half of its "Ends with" ("S1 and S2 scored in all three arms"); the wave's "Ends with" holds after it.
The W7 plan-phase decisions are in
[task-031](task-031-third-party-oracle-material-pinned-by-commit-or-sha256.md). It follows
`scenario-authoring` from goal to validate; calibrate and register are calibration's (decision 3).

Scope: **S2@1.0** as [S2.md](../../02_specification/scenarios/S2.md) specifies it, in
`scenarios/S2/1.0/`:

- **Goal:** the card of S2.md §1 (categories D and F, Q-D1–Q-D3 and Q-F1, `capabilities: []` — §7).
- **Seed** (§3): a purpose-written order and inventory module of about 1,000–1,500 lines (products and
  SKUs, stock, orders with lines, discounts, VAT, shipping, cancellation) with its public API, a README
  documenting the business rules (the false report's rule among them), a visible test suite green on
  the seed that catches none of the defects, and **six injected defects** of the six kinds §3 lists.
  Nothing in names, comments or history hints at them; one initial commit.
- **Prompts** (§5): three batches of user reports written as symptoms — 3 real; 2 real and 1 false; 1
  real and 1 duplicate of a step-1 defect in other words — asking only to handle them.
- **Public oracle** (§6): one defect test per reported symptom, failing on the seed and passing once the
  symptom is gone, each in the suite of the steps from its report on; the seed suite and a public
  regression suite (M-D3); a test that the documented behaviour behind the false report is still in
  place at the end; the step-1 fix still in place after step 3. Suites and their `after_steps` are this
  task's design.
- **Content checks** (§6, decision 6): the false report's related code left unchanged, and the
  duplicate identified as already fixed in any git-tracked file or commit of step 3, declared as
  `oracle.checks` in REQ-SCO-06's form — case-insensitive patterns on content, never a harness's path or
  format (F4.8). Written and validated here; **scored in W8** by F4.8.
- **Hold-out only** (§6, in `WingFoil2-Benchmark-HoldOut`): the **answer key** (where each defect is,
  and what it is), variant tests per defect, an extended regression suite — and, by decision 5, the
  reference fixes and the fake sessions that replay them. This repository describes the defect *kinds*
  only.
- **Validate:** `bench scenario validate S2@1.0 --holdout <path>` clean. S2.md §8 asks the leak scan to
  check the reports against the answer key: with the answer key under a hold-out suite, its quoted
  strings are scanned against the prompts; what the scan cannot see (words shorter than 8 characters,
  numbers such as a wrong total or a boundary date) is checked by a documented review of the reports,
  recorded here without the answer key's content.
- **For the wave check (decision 4):** an automated `scenarios.feature` @F6.2 example, with the hold-out
  configured: validation passes, a dry run in each of the three arms with the fake replaying the
  reference fixes, the public oracle scoring each without errors. Without a hold-out the example is
  skipped and says why.

Constraints W4 and W6 left for scenario content (as in task-032): hidden tests import the code under
test inside the test, are registered unconditionally with unique names, and a defect test passes
nothing on the seed (adr-004 decision 10); the seed has no dependency, and its visible suite runs with
no install and no network, in the run container and in the scoring image; the seed's README and
visible tests hold no literal of the hidden tests of 8 characters or more — a real constraint here,
since a defect test is derived from its report's text and the README states the rules.

**Done** means: `scenarios/S2/1.0/` validates with the hold-out configured; each defect test fails on
the seed and passes after its reference fix, the seed and regression suites stay green on every
reference snapshot, the false report's test holds on the seed; S2 dry-runs with the fake in the three
arms and is scored by its public oracle; the content checks validate; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F6.2 (the outline's S2 row) — validation passes, a dry-run cost in every arm, the
  public oracle scores the dry runs without errors. **red-first**
- REQ-FMT-04 — S2's `scenario.yaml` as S2.md specifies it: suites bound to their steps, the checks, the
  hold-out expected. **red-first**
- REQ-FMT-08 — the leak scan is clean on S2 with the answer key in the hold-out. **red-first**
- REQ-SCO-01 / REQ-SCO-02 — each defect test red on the seed, green after its fix; the seed and
  regression suites green throughout; the false report's documented behaviour green on the seed.
  **red-first**
- REQ-SCO-06 — the checks are patterns on content, with no harness path or format. **red-first**
  (declared and validated; scored in W8)

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
