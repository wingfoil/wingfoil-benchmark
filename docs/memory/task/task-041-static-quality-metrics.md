---
id: task-041-static-quality-metrics
type: task
title: "Static quality metrics"
status: backlog
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

Classified in the design phase.

- `scoring.feature` @F4.2 "Static quality is reported per indicator". A run of S8's reference, scored
  through the local scoring double, has `m_q2`'s four indicators on the files it changed:
  - lint findings and lines;
  - functions, the sum and the maximum of their complexity;
  - duplicated lines and lines;
  - covered and total lines.

  No composite value is written. **red-first**
- REQ-SCO-04: the benchmark's ESLint configuration applies even when the snapshot carries its own. A
  snapshot with an `eslint.config.js` that turns every rule off still has its findings counted.
  **red-first**
- REQ-SCO-04: coverage is 0 covered lines for a project with no tests, S3's reference, and the total
  still counts the changed files. **red-first**
- M-Q2 is `not_reached` when the final snapshot is not reached. It is `not_applicable` when the run
  changed no source file. **red-first**
- Files the setup wrote are left out, whatever the harness. So are `node_modules/` and declaration
  files. Tests are measured, but are not coverage targets. **red-first**
- REQ-SCO-01: `m_q2` runs in a scoring container with no mount and no network. `score.json`'s `scorer`
  records eslint, typescript-eslint, jscpd and c8. **red-first**
- REQ-SCO-03: the same run scored twice gives the same `score.json` bytes, `m_q2` included.
  **characterization**
- REQ-FMT-07: M-Q2's indicators are in `aggregate.json`, each a value with its runs and `n`.
  **red-first**
- Docker: the real image scores M-Q2 on S2 or S8 (a seed with tests) and on S1 or S3 (none).
  **red-first**

## Design

The spike (2026-09-29, in the scratchpad, on the image's Node 22.23.2) settled three things.

- **c8 12.0.0 measures `node --test` on type-stripped TypeScript.** On S8's seed,
  `c8 --all --include 'src/**' --reporter=json-summary npm test` gave 272/286 lines. The seed's
  `.ts` files need no loader or source map, because type stripping keeps every position.
- **ESLint 10.11.0 with `typescript-eslint` 8.70.1 (not type-checked) and `complexity: ['error', 0]`
  reports every function's complexity.** On S8's seed there are 24 functions, with a sum of 36 and a
  maximum of 3. The message form is "has a complexity of N". No tsconfig and no type information are
  needed.
- **jscpd 5.3.3 is a Rust binary, not a JavaScript API.** It ships as per-platform optional packages,
  and the image's is `jscpd-linux-x64-gnu`. With `--min-tokens 50 --reporters json --output <dir>` and
  `--network none` it writes `statistics.total.{duplicatedLines, lines}`: 84 of 184 for a copied file.

### The scoring image (REQ-SCO-01, REQ-SCO-04; adr-004 amendment 3)

- `package.json` pins, beside tsx and TypeScript:
  - `eslint` 10.11.0, `@eslint/js` 10.0.1 and `typescript-eslint` 8.70.1, the versions this repository
    lints with;
  - `jscpd` 5.3.3 and `c8` 12.0.0.

  The lockfile comes from `npm install --package-lock-only`. It lists every platform package, and
  `npm ci` installs the image's own.
- **`eslint.config.mjs`**, the benchmark's configuration, is `js.configs.recommended` plus
  `tseslint.configs.recommended`, over `**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}`. It is published by the
  method page (W11). `complexity` is not in it: `quality.mjs` adds it at `max: 0`, to read each
  function's value, and never counts it as a finding.
- **`quality.mjs`** takes the snapshot and a JSON of `{ measured, coverageTargets }`, both relative
  paths. It prints one JSON line:
  - `lint: { findings, lines }`: every ESLint message but `complexity`, a file that does not parse
    counting as one finding; `lines` is the physical lines of the measured files;
  - `complexity: { functions, sum, max }`;
  - `duplication: { duplicated_lines, lines }`, from jscpd over the measured files;
  - `coverage: { covered, total, tests }`. c8 wraps `npm test` when the snapshot's `package.json` has a
    `test` script. Otherwise it wraps `node -e 0`, so that `--all` still counts every target's lines.
    `tests` is `passed`, `failed`, `timed out` or `none`. Coverage is counted whether the tests pass or
    not, since it measures what they ran. A run that was killed leaves no report: 0 covered.
- ESLint runs with `overrideConfigFile: '/opt/score/eslint.config.mjs'`, so a project's own
  configuration is never read.
- The container is `createScoring` with no mount and no network, like the AST checks'. It runs with
  `timeout 600`, and the tests with 300 s of their own. c8's and jscpd's output go to `/tmp`.
- `ScoringImage` and `score.json`'s `scorer` gain `eslint`, `typescript_eslint`, `jscpd` and `c8`, read
  from the image's `package.json`.

### What M-Q2 measures (experiment design §4.1: "on the files changed by the run")

On the final snapshot, compared with the seed:

- **Measured:** the files that are new or whose bytes differ, and that are source files:
  `.ts .tsx .mts .cts .js .jsx .mjs .cjs`, not `.d.ts`, and not under `node_modules/`.
- **Left out: every path the setup's stored patch (`setup/diff.patch`) touches.** That covers the
  harness's files, whatever the harness, with no list of one tool's paths. A file the setup wrote and
  the agent then changed is still the harness's.
- **Coverage targets:** the measured files that are not tests. A test is `*.test.*` or `*.spec.*`, or a
  file under `test/`, `tests/` or `__tests__/`.
- No measured file gives `m_q2: { not_applicable: true }`. A final not reached gives
  `{ not_reached: true }`.

### `score.json` and aggregation

- `m_q2` holds the integers above and the lists of measured files and coverage targets, sorted. It is
  written after `m_d3`, with no ratio and no composite. `SCORE_VERSION` stays 1 (W9 decision 5).
- The aggregate reads `m_q2` as optional. Per group it gets four `Value`s of the integer pairs: `lint`,
  `complexity_mean` (sum over functions), `duplication` and `coverage`. It also gets
  `complexity_max`, a `Value<number>`. The ranges order by ratio, as M-Q1's do.

### Modules

- `docker/score-image/`: `package.json`, `package-lock.json`, `Dockerfile` (the COPY), `quality.mjs`,
  `eslint.config.mjs`.
- `src/scoring/image.ts`: the four versions. `src/scoring/quality.ts` (new) has three parts:
  - `measuredFiles(seedDir, snapshot, setupPatch)`, pure;
  - `qualityInContainer`, like `astInContainer`;
  - the parse of its line.
- `src/scoring/score.ts`: `m_q2` and `scorer`. `src/results/aggregate.ts`: the reader and the values.
- **This repository gains `jscpd` 5.3.3 and `c8` 12.0.0 as devDependencies,** pinned like tsx. The local
  scoring double runs `quality.mjs` with the same tools, and maps `/opt/score/quality.mjs`,
  `eslint.config.mjs` and `node_modules/.bin`.
- Tests:
  - unit tests of `measuredFiles`, the parse, `score.json` and the aggregate;
  - `scoring.feature` @F4.2 on S8's reference and S3's, through the local double;
  - the Docker suite's W8 test asserting `m_q2` through the real image.

### Requirements 1.16 and adr-004 amendment 3

- **REQ-SCO-04:**
  - the files measured, and the setup's paths left out;
  - the configuration, and complexity read from `complexity` at 0;
  - coverage from `npm test` under c8, counted whether the tests pass or fail;
  - integer pairs, no composite.
- **adr-004 amendment 3:** the image's new pins, jscpd's platform binary, and the container's bounds.

### Choices to confirm

1. **Lint = `@eslint/js` recommended plus `typescript-eslint` recommended (not type-checked).** These
   are two published, versioned rule sets that anyone can rerun. No tsconfig is needed.
   - *Alternative:* a short rule list chosen by hand. That is more controllable, but it is the
     benchmark's own taste and harder to defend.
2. **Coverage runs the project's own `npm test` under c8, and counts coverage even when tests fail.**
   REQ-SCO-04's "the project's own tests" is taken literally. A test script that needs a missing
   dependency yields 0.
   - *Alternative:* always `node --test`, whatever `package.json` says. It is uniform, but it ignores
     the agent's own test setup.
3. **Harness files are left out as "whatever the setup's patch touched",** not by a list of paths.
   This is tool-neutral by construction.
   - *Alternative:* list each arm's environment files (`CLAUDE.md`, `.wingfoil/`, …) in its
     `arm.yaml`.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
