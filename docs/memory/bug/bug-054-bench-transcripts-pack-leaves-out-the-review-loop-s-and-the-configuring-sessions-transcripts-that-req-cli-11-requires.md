---
id: bug-054-bench-transcripts-pack-leaves-out-the-review-loop-s-and-the-configuring-sessions-transcripts-that-req-cli-11-requires
type: bug
title: "bench transcripts pack leaves out the review loop's and the configuring sessions' transcripts that REQ-CLI-11 requires"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3","transcripts","release-assets"]
---

## Context

Found by task-159's independent review (2026-11-18), on the validation execution `2ee46ad9e617/1`: S1@1.1 in the
thirteen arms, each run with its review loop.

## Expected

`bench transcripts pack <campaign-id>/<n>` puts in `transcripts.tar.gz` everything REQ-CLI-11 names:

- each run's step transcripts and its earlier attempts' (as amended in 1.26);
- the configuring sessions' transcripts of every configuration the execution ran, under
  `configuring/<id>@<version>/<harness>/<n>/` (as amended in 1.50);
- each run's review-loop transcripts, `review/<n>/reviewer.jsonl` and `fixer.jsonl` (as amended in 1.58).

Each of them is scanned for secrets as the runs' transcripts are.

## Actual

- `releases/2ee46ad9e617-1/transcripts.tar.gz` holds 65 files, all `steps/NN/transcript.jsonl`. No entry is under
  `review/` or `configuring/`.
- On disk and left out: 14 `reviewer.jsonl`, 1 `fixer.jsonl` and 3 configuring transcripts of S1@1.1
  (`results/configuring/S1@1.1/<harness>/1/transcript.jsonl`). The asset should hold 83 transcripts.
- `packTranscripts` in `src/results/transcripts.ts` collects only `<run>/steps/*/transcript.jsonl` and its attempts'.
- The command exits 0 and reports the 65 as the whole, so nothing tells the maintainer that the asset is incomplete.

These sessions are git-ignored, so the release asset is the only place a reader could get them. Nothing is lost yet:
the files stay in the checkout that ran the execution, and a fixed `pack` can be run again on it.

## Fix (proposed, for the approver's choice)

A task with no spending, before the reference campaign's transcripts are attached to a release (plan-005 step 6):

- A red test first: an execution with a review loop and a configured arm packs its reviewer, fixer and configuring
  transcripts at the paths REQ-CLI-11 names, each covered by the secret scan.
- `packTranscripts` collects them, and its output counts each kind.
- Check how the archive's digest is recorded in the runs, since packing an execution again changes it.
