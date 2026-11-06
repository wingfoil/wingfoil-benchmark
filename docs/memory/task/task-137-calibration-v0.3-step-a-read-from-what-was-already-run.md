---
id: task-137-calibration-v0.3-step-a-read-from-what-was-already-run
type: task
title: "Calibration v0.3, step A read from what was already run"
status: pending
release: v0.3
wave: W17
features: [F2.7, F4.3]
acceptance: []
requirements: [REQ-SCO-14, REQ-SCO-15]
fixes: []
tags: ["v0.3","calibration","w17"]
---

## Context

What step A leaves to W17 in [plan-005](../../plans/plan-005-release-v0-3.md) (Delivery order, item 3: "its reading in
calibration"), the approver's choice in chat (2026-11-05, option b): a W17 task of its own, after task-135. Plan-005's
step 3 writes `docs/calibration/v0.3.md` from dry runs of S1, S2, S3 and S8 at 1.1 in every arm, the configured ones
included (after W18), with the revised budget. Step A's reading needs none of them: what the step-A arm did is already
paid for and stored, on the 1.0 versions. This task opens `v0.3.md` with that reading, at no spending; step 3 fills the
rest. With it done, `rel-v0-3`'s W17 row is Verified.

The evidence: task-114's dry runs `dry-runs/88` to `95` (S1@1.0, Claude Code and Codex, the manual's corrections);
campaign-007 (`697e79b75e41/1`, Codex, Terra and Luna); campaign-008 (`33b54dd89e8b/1`, Claude Code, Sonnet 5.5 and
Haiku 5.5); and, for the pair "the same model, the v0.2 manual against step A", campaign-002 (`81ebb2691f9c/1`,
Sonnet 5.5). The approver's choice (chat, 2026-11-05): that pair is kept as a reading, with its differences stated
beside it (the approver policy v1 against v5, the WingFoil release, the Claude Code version if it differs), never as a
measured effect of step A.

## Acceptance criteria

1. **`scripts/step-a-reading.mjs`** (red-first) reads the stored results and writes nothing under `results/`; it runs
   no agent, no Docker, no hidden test, and reads no hold-out. It takes the results directory and the executions as
   arguments, as `scripts/token-breakdown.mjs` does, and prints, for each wingfoil run:
   - **the cycle, from its transcripts:** instances started per request, gates reached and approvals asked
     ("Please approve <id>." or an earlier form), approvals recorded and on which reply, finalizes, an approval with no
     verdict, `workflow` commands per step;
   - **H1, H2 and H8 restated on the engine:** wingfoil ÷ baseline (cost, H1; turns, H2) and wingfoil ÷ baseline-docs
     (cost, H8), per scenario and model, the mean over the repetitions (n = 3 in the campaigns, 1 in the dry runs), a
     ▲ or ▼ only beyond the variance (REQ-SCO-08 as amended in 1.49), from the published `score.json` and aggregates;
   - **the campaign-002 pair** on Sonnet 5.5: the same ratios on both sides, and the differences between the two
     executions read from their campaign files (approver policy, WingFoil commit, agent version).
2. **`docs/calibration/v0.3.md`** opened with a header (version, date, status, traces), a section "Step A" (what was
   read, the cycle, what it shows) and a section "The hypotheses on the engine" (H1, H2, H8 as `v0.2.md` §9 states
   them, with the step-A values). Every figure is quoted from the script's output with its command line, never typed
   by hand; the sections step 3 owns (the 1.1 dry runs, the configured arms, the measured costs and the revised budget)
   are listed as to come, with a pointer to plan-005 step 3.
3. **Tests** of the script on fixtures: a run whose requests each open an instance and pass their gate; a run whose
   gates are answered late in one batch (as `dry-runs/88`); a ratio within the variance with no ▲/▼; and that it
   writes nothing under `results/`.
4. No change to `results/`, `site/`, campaign files, arms or scenario versions; the site neither rebuilt nor published.
5. Checks: prettier on every changed file, `tsc`, eslint, `scripts/pre-review.sh main`; an independent review
   (dl-020); the full suites on the approver's go.

## Design

- `scripts/step-a-reading.mjs`, Node: the transcripts read as `scripts/token-breakdown.mjs` reads them (Claude Code's
  stream-json and Codex's events), the commands classified by their first `wingfoil` sub-command; the ratios from each
  execution's `aggregate.json` and the runs' `score.json`, with task-129's variance rule from the built modules
  (`dist/`). Executions and runs in path order, so its output is stable; `--markdown` prints the tables.
- The transcripts are git-ignored: the script runs on a checkout that holds them (the main checkout, by its absolute
  path as an argument, read only); the tests use fixtures under `test/fixtures/`.
- `docs/calibration/v0.3.md`, in `v0.2.md`'s form.

## Execution notes

## Review
