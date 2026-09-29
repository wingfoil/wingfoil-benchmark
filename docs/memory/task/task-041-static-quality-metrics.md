---
id: task-041-static-quality-metrics
type: task
title: "Static quality metrics"
status: pending
release: v0.1
wave: W9
features: [F4.2]
acceptance: [scoring.feature]
requirements: [REQ-SCO-01, REQ-SCO-03, REQ-SCO-04, REQ-FMT-07]
---

## Context

Third and last task of wave **W9 — Quality** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). The
W9 plan-phase decisions are in [task-039](task-039-continuity-metrics-and-regressions-from-the-seed.md).
The task delivers **F4.2 static quality**: M-Q2 (experiment design §4.1, REQ-SCO-04) on the files the
run changed. There are four indicators, each reported on its own, with no composite score:

- lint findings per 1,000 lines;
- mean and maximum cyclomatic complexity;
- duplicated-line percentage;
- test coverage.

The wave's "Ends with", "the full quality and cost picture per run", holds after this task. The wave
check follows it (W9 decision 4).

What exists:

- The scoring image (`docker/score-image/`) pins only tsx 4.23.15 and TypeScript 6.0.3. Its tag is the
  hash of the directory, and `score.json`'s `scorer` records `{image, tsx, typescript}`.
- Hidden tests run as `node --import tsx --test` with the image's reporter.
- The host CLI's runtime dependencies are yaml and zod only, so every tool runs in the image
  (REQ-SCO-01).

Scope:

- **The scoring image gains ESLint, jscpd and c8, pinned** (W9 decision 6). The path is the one
  task-037 took for TypeScript:
  - `package.json` and a lockfile from `npm install --package-lock-only`;
  - the Dockerfile's COPY;
  - a field in `ScoringImage` and in `score.json`'s `scorer`;
  - a mapping in `test/support/local-scoring.ts` for every new `/opt/score` file.

  It is recorded as an adr-004 amendment.
- **The benchmark's fixed ESLint configuration** lives in the image, never the project's (REQ-SCO-04).
  It is a TypeScript parser and a declared rule set, with `complexity` reporting every function's value
  so that mean and maximum can be taken. The design fixes the rule set and records it, since the method
  page (W11) publishes it.
- **The files the run changed:** the text source files that differ between the seed and the final
  snapshot, from the stored patches. The design settles:
  - which extensions count;
  - that tests and declaration files count for lint and duplication but not as coverage targets;
  - that harness files are left out: WingFoil's `.wingfoil/`, `PROJECT_RULES.md`, `CLAUDE.md`. This is
    by the arms' declared environment, never by one harness's format;
  - a run that changed no source file: its indicators are reported as not applicable, not as 0.
- **Coverage (W9 decision 3):** the snapshot's own `node --test` runs under c8, in the scoring container,
  on the final snapshot, with no network and a time limit. The result is line coverage of the changed
  files. It is 0 when the project has no tests, or when its tests do not run: the design decides
  whether failing tests still yield coverage.
- **Duplication:** jscpd over the changed files, as the percentage of duplicated lines, with a pinned
  minimum size.
- **`score.json`:** `m_q2` on the final snapshot, with the four indicators and the number of lines and
  files measured. A final not reached reports M-Q2 as not reached. `SCORE_VERSION` stays 1 (W9
  decision 5).
- **Aggregation:** each indicator is a `Value` per group (REQ-FMT-07). There is no composite.
- **Acceptance:** `scoring.feature` @F4.2 "Static quality is reported per indicator", with a test titled
  `@F4.2 <Scenario name>`. The Docker suite runs M-Q2 through the real scoring image on S2 or S8, whose
  seeds have tests, and on S1 or S3, whose seeds have none.

Out of scope:

- a composite quality score (§4.1: never);
- M-R2's public-interface comparison (W10, F4.5);
- thresholds on any indicator;
- what the site shows (W11).

**Done** means:

- the image pins the three tools, and `score.json` records their versions;
- M-Q2's four indicators are in `score.json` and `aggregate.json` for S1–S3 and S8;
- the @F4.2 scenario is green;
- adr-004 is amended, and REQ-SCO-04 too if the design makes it more precise, with a recorded review
  decision;
- tests, coverage and lint pass;
- then the W9 wave check is recorded in rel-v0-1.

## Acceptance criteria

<!-- Classified in the design phase. -->

- `scoring.feature` @F4.2 "Static quality is reported per indicator", with no composite score
- REQ-SCO-04: the benchmark's ESLint configuration is used even when the snapshot carries its own
- REQ-SCO-04: coverage is 0 for a project with no tests
- REQ-SCO-01: the tools run in the scoring container, with no network, and their versions are in
  `scorer`
- REQ-SCO-03: the same run scored twice gives the same `score.json` bytes, M-Q2 included
- REQ-FMT-07: M-Q2's indicators in `aggregate.json`, each with its runs and `n`

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
