---
id: task-153-read-a-fixer-round-s-interventions-as-the-runner-records-them-and-hold-the-loop-s-writer-and-reader-together
type: task
title: "Read a fixer round's interventions as the runner records them, and hold the loop's writer and reader together"
status: approved
release: v0.3
wave: W19
features: [F4.9]
acceptance: []
requirements: [REQ-FMT-06, REQ-SCO-16]
fixes: [bug-051-the-results-reader-refuses-a-fixer-round-s-usage-because-the-runner-records-its-interventions-as-a-list]
tags: ["v0.3","results","review-loop"]
---

## Context

Fixes [bug-051](../bug/bug-051-the-results-reader-refuses-a-fixer-round-s-usage-because-the-runner-records-its-interventions-as-a-list.md):
the runner writes a fixer round's `interventions` as the session's list of replies (task-149), while `readLoop`
requires a number (task-150). `dry-runs/213`, the first stored loop where the fixer ran, cannot be read back. So
`scripts/review-loop-figures.mjs` stops, an estimate skips that dry run, and `aggregate` would fail on any campaign run
with a fixer round. W19 ends with "the review-loop metrics in the dry runs". Task-151's calibration note is written
from the figures script on dry runs 208–215, so this task comes before W19 closes. It needs no new dry run.

## Acceptance criteria

<!-- Each red first unless marked: a failing test before the code. -->

1. **The reader takes the runner's record** (unit, red first): `readLoop` reads a `fixer-usage.json` whose
   `interventions` is a list of `{step, kind, reply}`, as `fixRound` writes it, and counts its length as the fixer's
   interventions (M-V3, REQ-SCO-16), as a step's count is the length of its list (`src/runner/run.ts`). A number
   there is refused, naming the file: no runner ever wrote one.
2. **The writer and reader held together** (unit, red first before criterion 1's change): a test writes a fixer
   round with the runner's own record (the shape `fixRound` writes, built by the same helper or read from a copy of
   `dry-runs/213`'s round), reads it back with `readLoop`, and checks the fixer's figures. The loop-records fixture
   (`test/support/loop-records.ts`) writes the list as the runner does, and its callers' expected counts are
   unchanged.
3. **The stored dry runs read** (characterization): `findLoopDryRuns` counts `dry-runs/213` for S3@1.1 `wingfoil` on
   `campaigns/v0-3-review-loop.dry-run.yaml`. `node scripts/review-loop-figures.mjs --markdown .` reads dry runs
   208–215 and prints their figures. No stored record is rewritten.
4. Checks: prettier, tsc, `scripts/pre-review.sh main`, an independent read-only review (dl-020), and the full suites
   on the approver's go.

## Design

- `src/results/review.ts`: `fixerUsageSchema.interventions` becomes an array of the runner's `Intervention` shape
  (`step` int, `kind`, `reply`), and `figures(..., interventions.length)`. The `Intervention` kinds are read from
  the runner's own type, so the two cannot drift again.
- REQ-FMT-06 as amended in 1.58 already says the round holds "the fixer's usage and interventions". The record is
  the list, so no requirement changes. REQ-SCO-16's M-V3 counts them, unchanged.
- `scripts/review-loop-figures.mjs` reads through `readLoop`, so it needs no change.

## Execution notes

2026-11-17, branch `task/task-153-…`:

- **Red first:** 11 of 22 tests in `test/unit/results/review.test.ts` failed before the change. The writer was not
  exported, the reader refused the list, and a count was accepted.
- **Change:** the runner's record is built by `fixerUsageRecord` (`src/runner/review-loop.ts`), which `fixRound` and
  the tests both use. `readLoop` reads `interventions` as a list of `{step, kind, reply}` and counts its length. The
  kinds are read from a `Record<InterventionKind, true>`, so a kind added to the runner fails to compile there. The
  loop-records fixture writes the list. No requirement text changes.
- **Criterion 3, on the stored dry runs (read only):** with this branch's `dist`, `findLoopDryRuns` counts
  `dry-runs/213` for S3@1.1 `wingfoil` (outcome `no fix`, 0.2002 USD). With main's, it skips it as "has a loop record
  that cannot be read". `node scripts/review-loop-figures.mjs --markdown <main>` reads dry runs 208–215: seven clean at
  round 1, and 213 `no fix` at round 2 with M-V2 2/2 and M-V3 0.1785 EUR.
- **Checks:** prettier, eslint and tsc are clean. `scripts/pre-review.sh main` is green (2 files, 49 tests). The
  files that read or write a loop record are also green: 7 files, 141 tests, `--maxWorkers=2`, plus
  `test/bin/review-loop-figures.test.ts` (3 tests).
- **Independent review (dl-020), 2026-11-17:** a fresh read-only agent worked in its own `mktemp` copy and found no
  blocker and no should-fix. It confirmed criteria 1–3:
  - with main's reader put back, 11 of 22 tests fail, the 3 new ones included;
  - `readLoop` reads dry runs 208–215;
  - 213's M-V3 is 0.1785 EUR, equal to its `loop.json` `cost_eur`.

  It compared every field of `loop.json`, `findings.json`, `reviewer-usage.json` and `fixer-usage.json` with the
  runner's writers and found no other mismatch. Main's reflog was unchanged afterwards. Two nits:
  - `reviewer-usage.json` and `loop.json` are still written inline, and only the fixture mirrors them, so the drift
    behind bug-051 stays possible for those two files. They agree today. Extracting their writers as here is left to
    the approver: no element filed.
  - The fixture's non-zero `fix.interventions` path is unused, since the runner-writer test covers the count.
    Cosmetic, left as is.
- **Full suites green at `700b4b3d`** (LINT, TEST, BUILD, BIN, DOCKER at 0, 2026-11-17). Approved at `700b4b3d` and
  merged into main at `2ab676b9`. From main, the figures script prints the same table on dry runs 208–215.
