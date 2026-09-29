---
id: task-037-directive-checks-and-tool-neutral-governance-metrics
type: task
title: "Directive checks and tool-neutral governance metrics"
status: pending
release: v0.1
wave: W8
features: [F4.8]
acceptance: [scoring.feature]
requirements: [REQ-SCO-01, REQ-SCO-03, REQ-SCO-05, REQ-SCO-06, REQ-FMT-04, REQ-FMT-07]
---

## Context

Third task of wave **W8 — Continuity and governance** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
The W8 plan-phase decisions are in [task-035](task-035-check-format-and-content-checks.md). It completes
**F4.8 tool-neutral governance metrics**, whose content checks task-035 delivered, with **M-E1 directive
violations** (experiment design §4.4) and the AST and dependency checks of REQ-SCO-05.

Scope:

- **Two more check kinds** in task-035's format:
  - **`dependencies`** — R1: `dependencies` in `package.json` compared with the seed's;
  - **`ast`** — rules on the TypeScript AST of files under a declared seed-relative directory, with the
    TypeScript compiler API (REQ-SCO-05): exported functions without a preceding TSDoc block (R2);
    `Date.now()`, `new Date()` with no argument, `Math.random()` (R3); `throw` statements (R4). A
    check counts **violations** (a number, with their locations), not only pass/fail.
- **Where the AST runs:** in the scoring container (REQ-SCO-01), so the TypeScript version is pinned by
  the scoring image, not by the host; whether the image already carries `typescript` or gains it (an
  image change, recorded in adr-004 as an amendment) is this task's design.
- **M-E1 in `score.json`:** violations per rule and per step snapshot, reported per rule, not only as a
  total (`scoring.feature` @F4.8 "Directive violations are counted per rule and per step"); a `not
  reached` step said. Aggregated in `aggregate.json` per rule, with runs and `n` (REQ-FMT-07).
- **Format-neutrality shown on S3** (W8 decision 3): `scoring.feature` @F4.8 "Governance checks do not
  depend on a harness's format" — two runs of S3 whose step 4 records the D3 revision, one in a WingFoil
  decision-log and one in a plain notes file: D3's content check passes in both. M-F1 itself is W9's.
- **Requirements** amended if REQ-SCO-05's wording needs the check kinds spelled out (the next amendment),
  with a recorded review decision.

Out of scope: S8's content and its four check files (task-038 writes them in this format; this task
tests the kinds on fixtures); M-R2's public-interface AST (F4.5, W10), though the AST helper should not
preclude it; M-E2 and M-E3 (v0.2).

**Done** means: `ast` and `dependencies` checks validated and scored per step, M-E1 per rule and step in
`score.json` and `aggregate.json`; both @F4.8 scenarios green; tests, coverage, lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scoring.feature` @F4.8 — "Directive violations are counted per rule and per step". **red-first**
- `scoring.feature` @F4.8 — "Governance checks do not depend on a harness's format", on S3's D3 content
  check (W8 decision 3). **red-first**
- REQ-SCO-05 — R1: a runtime dependency added after the seed is one violation; a devDependency is none.
  **red-first**
- REQ-SCO-05 — R2/R3/R4 counted by the compiler API, only under the declared directory; `new Date(x)`
  with an argument is no violation; a `throw` in a comment or string is none. **red-first**
- REQ-SCO-03 — the same snapshot gives the same M-E1 bytes. **characterization**
- REQ-FMT-07 — M-E1 in `aggregate.json` per rule, with runs and `n`. **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
