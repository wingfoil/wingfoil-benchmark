---
id: bug-051-the-results-reader-refuses-a-fixer-round-s-usage-because-the-runner-records-its-interventions-as-a-list
type: bug
title: "The results reader refuses a fixer round's usage because the runner records its interventions as a list"
status: fixed
fixed_by: task-153-read-a-fixer-round-s-interventions-as-the-runner-records-them-and-hold-the-loop-s-writer-and-reader-together
tags: ["v0.3","results","review-loop"]
---

## Context

Found on 2026-11-17 by W19's loop dry runs (task-151, profile `campaigns/v0-3-review-loop.dry-run.yaml`). Seven of
the eight loops closed clean at round 1 and wrote no fixer usage. `dry-runs/213` (S3@1.1, `wingfoil`) is the first
stored loop where the fixer ran: two rounds with findings, both fixed, ending `no fix` at round 2. Its records
cannot be read back.

## Expected

A fixer round's `review/<n>/fixer-usage.json`, as the runner writes it, is read by `readLoop`
(`src/results/review.ts`). Its interventions are counted for M-V3 (REQ-SCO-16), so the loop's figures reach the
estimate, the aggregate, the pages and `scripts/review-loop-figures.mjs`.

## Actual

- The runner (`src/runner/review-loop.ts`, `fixRound`, task-149) writes `interventions: result.interventions`, the
  session's list of the approver's replies: `"interventions": []` in `dry-runs/213`'s rounds 1 and 2. Its acceptance
  test (`test/acceptance/runner.test.ts`, "fixer-usage.json") asserts `interventions: []`.
- The reader (`fixerUsageSchema`, task-150) requires `interventions: z.number().int()`. Its fixture
  (`test/support/loop-records.ts`) writes a number, so no test ever fed the runner's record to the reader.
- `node scripts/review-loop-figures.mjs --markdown .` stops on `dry-runs/213`'s run with
  `review/1/fixer-usage.json: interventions Invalid input: expected number, received array` (and the same for
  round 2).
- `findLoopDryRuns` skips such a dry run as "has a loop record that cannot be read". An estimate then prices that
  key's loop at its bound, not at the measured cost.
- `aggregate` fails on any campaign run whose loop had a fixer round, so its results and pages cannot be built.
  No campaign has run a loop yet, so no published result is affected.

## Fix (proposed, for the approver's choice)

A task before W19 closes, so that task-151's calibration note can be written from the figures script:

- The reader takes the runner's record as stored: `interventions` is a list, and the count is its length. Stored
  records such as `dry-runs/213` stay valid; nothing is rewritten.
- The fixture writes the list, as the runner does.
- One test writes a fixer round with the runner's own writer, or a copy of `dry-runs/213`'s record, and reads it back
  with `readLoop`, so the two sides are held together.
- The figures script is then run on dry runs 208–215.
