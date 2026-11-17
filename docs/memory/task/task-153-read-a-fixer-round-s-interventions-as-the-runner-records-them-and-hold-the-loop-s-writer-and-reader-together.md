---
id: task-153-read-a-fixer-round-s-interventions-as-the-runner-records-them-and-hold-the-loop-s-writer-and-reader-together
type: task
title: "Read a fixer round's interventions as the runner records them, and hold the loop's writer and reader together"
status: pending
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
