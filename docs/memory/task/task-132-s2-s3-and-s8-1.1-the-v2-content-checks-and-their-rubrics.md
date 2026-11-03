---
id: task-132-s2-s3-and-s8-1.1-the-v2-content-checks-and-their-rubrics
type: task
title: "S2, S3 and S8 1.1, the v2 content checks and their rubrics"
status: in-progress
release: v0.3
wave: W16
features: [F3.4, F4.7]
acceptance:
  - "scenarios.feature#S2, S3 and S8 1.1 carry the oracle's corrections"
requirements: [REQ-SCO-06, REQ-FMT-09]
fixes: []
tags: ["v0.3","scenarios","w16"]
---

## Context

The fourth W16 task of [plan-005](../../plans/plan-005-release-v0-3.md), its second half (the approver's choices A and B
in chat, 2026-11-03), after [task-131](task-131-s1-1.1-step-5-s-diff-stated-bug-025.md) (S1 1.1). The scenario
conventions' K7 (amendment 1.5) put S1, S2, S3 and S8 at 1.1 with the oracle's corrections: content checks v2 and the
human rubric ([task-128](task-128-content-checks-v2-and-the-maintainer-s-rubric-bug-026.md), REQ-SCO-06 as amended in
1.49); K6 asks each 1.1 to record whether its 1.0 was saturated. The content checks that change are S2's `duplicate`
and S3's `d3-revision`; S2's `false-report` is an `unchanged` check and S8's are directive checks, both unaffected by
bug-026. S8 1.1 is made now, identical but for its version (choice B: the configured variants of W18 are written per
scenario version). No real-agent session, no spending.

## Acceptance criteria

1. **Red-first, a new scenario** "S2, S3 and S8 1.1 carry the oracle's corrections" (`scenarios.feature` @F3.4): each
   loads and passes the validator and the leak scan; each is its 1.0 but for its version line and, in S2 and S3, the
   content check and the rubric (a test compares the trees, no symbolic link); S2's `duplicate` and S3's
   `d3-revision` declare `match: words`, each with its `## <id>` section in the version's `oracle/rubric.md`; the 1.0
   versions stay registered, unchanged.
2. **The v2 patterns** are the 1.0 ones made whole words, each stem written out in the inflections the check accepts
   (the Design lists them); no pattern is added beyond what 1.0's meant, the paraphrases left to the maintainer's
   judgement against the rubric (REQ-SCO-06 1.49). The validator's refusal of a check its own prompt satisfies passes.
3. **The references** score as on 1.0: S3's reference records the D3 revision at step 4 under v2 (`d3-revision`
   passes) and S2's reference its duplicate at step 3, if they do on 1.0; their hidden suites pass as on 1.0.
4. **K6's record:** `S2.md`, `S3.md` and `S8.md` each gain an amendment for 1.1 with whether its 1.0 was saturated, by
   `node scripts/saturation.mjs <id> 1.0`, its output quoted.
5. **The hold-out** (the approver's choice C and path, 2026-11-03): each 1.0's hold-out additions copied, unchanged, to
   its 1.1 in the private hold-out repository, nothing of it opened or printed, not committed there; the validator
   with the hold-out passes on each 1.1.
6. Checks: prettier on every changed file, `tsc`, eslint, `scripts/pre-review.sh main`; an independent review
   (dl-020); the full suites on the approver's go.

## Design

- `scenarios/S2/1.1/`, `scenarios/S3/1.1/`, `scenarios/S8/1.1/`: copies of their 1.0 (no symbolic link, bug-034),
  `version: '1.1'`.
- **S3's `d3-revision`**, `match: words`, two groups as in 1.0:
  - D3's rule: whole day, whole days, whole-day, full day, full days, full-day, entire day, entire days, daily only,
    days only;
  - its revision: revise, revised, revises, revision, revising, supersede, supersedes, superseded, replace, replaced,
    replaces, replacing, replacement, no longer, instead of, now also, amend, amended, amends, amendment, changed,
    update, updated, updates.
- **S2's `duplicate`**, `match: words`: 1.0's phrases with the inflections they implied — already fixed, already been
  fixed, already resolved, already been resolved, already handled, already been handled, already addressed, already
  been addressed, duplicate, duplicates, duplicated, same defect, same issue, same problem, same bug, fixed earlier,
  fixed previously, previously fixed, previously reported, already reported, already been reported.
- **Rubrics** (`oracle/rubric.md` of S2 1.1 and S3 1.1): per check, what counts as the fact recorded — for
  `d3-revision`, a statement in the agent's own text that "whole days only" (D3) no longer holds or was replaced by
  hourly rentals; for `duplicate`, a statement that step 3's report restates a defect fixed in step 1 (named,
  linked or described); what does not count (the request's words copied, template text, a code change alone).
- `test/unit/scenarios/s2.test.ts` and `s3.test.ts`: each 1.1 loads; its reference passes as 1.0's.
- `S2.md`, `S3.md`, `S8.md`: amendments with K6's record; `scripts/saturation.mjs` as task-131 left it.
- Campaign files and presets keep the 1.0 versions.

## Execution notes

- **Red first:** the @F3.4 scenario failed before the three versions existed, then passed. The reference tests of
  S2 1.1 and S3 1.1 were written with the checks.
- **The versions:** plain copies of 1.0 (no symbolic link), `version: '1.1'`; S2's `duplicate.yaml` and S3's
  `d3-revision.yaml` rewritten with `match: words` and the Design's patterns; `oracle/rubric.md` added to S2 1.1 and
  S3 1.1; S8 1.1 changes its version alone. `bench scenario validate` is valid on all six versions, with the hold-out
  and without, the leak scan and the prompt-satisfaction refusal included.
- **The references:** S3's reference passes `d3-revision` v2 at step 4 (matched in `DECISIONS.md`), a silent step 4
  fails it, and so does v1's false positive "unchanged"; S2's reference (in the hold-out) passes `duplicate` v2 at step
  3 and a step 3 with no `NOTES.md` fails it (run locally with `BENCH_HOLDOUT_PATH`; skipped without it, as S2's other
  reference tests). `test/support/reference.ts`'s `referenceRun` now writes an empty `setup/diff.patch`, which a v2
  check reads (the reference has no setup).
- **K6** (`node scripts/saturation.mjs <id> 1.0`): S2 "29 of 49 runs … saturated: false" (20 below, 3 arms, 5
  executions); S3 "20 of 51 … false" (31 below, 6 arms, 7 executions); S8 "46 of 49 … false" (3 below, 3 arms, 1
  execution). Quoted in `S2.md` 1.1, `S3.md` 1.1 and `S8.md` 1.2.
- **The hold-out** (choice C): each 1.0 copied to its 1.1 with `cp -r`, `diff -rq` identical (S2 8 files, S3 4, S8 4),
  nothing opened or printed, **not committed** there (with S1 1.1's copy, the approver's to commit).
- `wingfoil memory add`, `submit` (draft → pending, backlog → in-progress): as declared.
