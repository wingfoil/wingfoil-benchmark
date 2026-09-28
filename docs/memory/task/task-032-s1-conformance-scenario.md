---
id: task-032-s1-conformance-scenario
type: task
title: "S1 conformance scenario"
status: backlog
release: v0.1
wave: W7
features: [F6.1]
acceptance: [scenarios.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-SCO-01, REQ-SCO-02]
---

## Context

Second task of wave **W7 — First content** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), the S1
half of its "Ends with" ("S1 and S2 scored in all three arms"). The W7 plan-phase decisions are in
[task-031](task-031-third-party-oracle-material-pinned-by-commit-or-sha256.md). It follows
`scenario-authoring` from goal to validate; calibrate and register are calibration's (decision 3).

Scope: **S1@1.0** as [S1.md](../../02_specification/scenarios/S1.md) (1.2, after task-031) specifies it,
in `scenarios/S1/1.0/`:

- **Goal:** the card of S1.md §1 in `scenario.yaml` (categories C and D, the GQM questions, the
  profiles, `capabilities: []` — §7, no expected failure in any arm).
- **Seed** (§3): an empty strict TypeScript library, no runtime dependency, a test script with no
  tests, the one-paragraph README; nothing of Pointer, Patch, Merge Patch or their specifications.
- **Prompts** (§5, README §3): four, in a product owner's voice, naming the RFC and the entry point of
  the step (`resolvePointer`, `applyPatch`, `applyMergePatch`), no harness, no list of the step-3 cases.
- **Oracle** (§6): three suites — Pointer after step 1 (RFC 6901 §5), Patch after steps 2, 3 and 4
  (`json-patch-tests` `tests.json` and `spec_tests.json`, `disabled` cases skipped), Merge Patch after
  step 4 (RFC 7386 Appendix A) — each call on a frozen copy of its input (the non-mutation check). The
  third-party material vendored and pinned as task-031 left it: the suite by its full `commit`, the RFC
  examples by `sha256`, each with its license, the IETF one **confirmed here** (dl-002).
- **The regression check** (§6, Q-D3): the Patch suite after step 4 against its result after step 3 is
  read from the per-step results `score.json` already holds; where it is reported (task-034's aggregate
  or a field of `score.json`) is settled in the design, with no new metric.
- **Hold-out additions** (§6) — Pointer escaping, deep and large Patch cases, Merge Patch beyond the
  appendix — written only in `WingFoil2-Benchmark-HoldOut`, under the suite ids, as siblings of the
  public suites (adr-004 amendment 1). This repository records their count and the hold-out commit,
  never their content.
- **Validate:** `bench scenario validate S1@1.0 --holdout <path>` clean, the leak scan included.
- **For the wave check (decision 4):** fake sessions for S1's four steps writing a reference
  solution, in `test/fixtures/`, and an automated `scenarios.feature` @F6.1 example: validation passes,
  a dry run in each of the three arms, the public oracle scoring each without errors.

Constraints W4 and W6 left for scenario content:

- every hidden test imports the code under test inside the test, is registered unconditionally with a
  unique name, and passes nothing on the seed (adr-004 decision 10) — checked by scoring the seed;
- tests run with no network, in the scoring image as it is (node:test and tsx); the seed's own test
  script runs in the run container with no install (the seed has no dependency);
- the leak scan's literals are every quoted string of 8 characters or more in an oracle file, and the
  vendored JSON is full of them (`"comment"` texts, pointers, values): the seed's README and the prompts
  must hold none; an ordinary word of eight letters or more in an expected value is a known limit
  (task-017), and numbers are not scanned.

**Done** means: `scenarios/S1/1.0/` validates with the hold-out configured; S1 dry-runs with the fake in
the three arms and each dry run is scored by its public oracle, the reference solution passing every
suite and the seed passing none; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F6.1 (the outline's S1 row) — validation passes, a dry-run cost in every arm,
  the public oracle scores the dry runs without errors. **red-first**
- REQ-FMT-04 — S1's `scenario.yaml` as S1.md specifies it: three suites bound to their steps, the
  third-party pins and licenses. **red-first**
- REQ-FMT-08 — the leak scan is clean on S1, the hold-out's additions included. **red-first**
- REQ-SCO-01 / REQ-SCO-02 — the reference solution passes every suite after its steps, the seed none
  (adr-004 decision 10); a mutating `applyPatch` fails the non-mutation check. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `c34986e`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W7 tasks of release v0.1` (`02edf51`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-032-s1-conformance-scenario` → `e75c304`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
