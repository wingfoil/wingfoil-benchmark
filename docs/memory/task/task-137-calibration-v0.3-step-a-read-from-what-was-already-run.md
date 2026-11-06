---
id: task-137-calibration-v0.3-step-a-read-from-what-was-already-run
type: task
title: "Calibration v0.3, step A read from what was already run"
status: in-progress
release: v0.3
wave: W17
features: [F2.7, F4.3]
acceptance: []
requirements: [REQ-SCO-14, REQ-SCO-15, REQ-RES-03]
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
     ▲ or ▼ only beyond the variance (REQ-RES-03 as amended in 1.49), from the published `score.json` and aggregates;
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

- **`scripts/step-a-reading.mjs`** and `test/bin/step-a-reading.test.ts` (seven cases, fixtures built in a temporary
  directory; a bin test, since the script imports `dist/results/compare.js`). **Not red-first:** the script was
  written before its test, then the test was run against it (one wrong expectation of the fixture corrected: a
  docs-control range that touched the arm's is within the variance, as the rule says).
- **The approvals split by the reply before their session** (beyond criterion 1's wording): after "Approved.
  Proceed.", after another reply, or with no reply in the step; a first reading counted every approval after a reply
  as one, which hid `dry-runs/93`'s approvals on a question's reply (task-114's finding). **H8's mean** over S1, S2,
  S3 and S8 is the script's too.
- **Departure from criterion 1:** the dry runs give the cycle only; no ratio is computed for them, since a dry run
  holds one arm and no baseline group. The ratios come from the three executions.
- **`docs/calibration/v0.3.md`** (version 0.1): §1 what was read, §2 the cycle, §3 what it shows, §4 H1, H2 and H8 with
  the pair across executions and its pins, §5 what plan-005 step 3 adds. Its tables are the script's output, pasted by a
  generator from the output file (`node scripts/step-a-reading.mjs --markdown <main checkout>/results dry-runs/88 …
  81ebb2691f9c/1 13fda3099afa/1`); two runs printed the same bytes; `git status -- results` clean after. H8's M-F1 and
  S2's checks are not read: on 1.0 they are content checks v1 (bug-026's erratum); step 3 reads them at 1.1.
- **A second pair, after review round 1:** campaign-006 (`13fda3099afa/1`, Codex, Terra, the v0.2 manual) against
  campaign-007, on the same approver policy (v2) and agent, with campaign-006's bug-036 erratum stated; the Context
  named campaign-002 only. **The pins** give the WingFoil commit too, from each execution's first wingfoil `run.json`
  (`harness.commit`), as criterion 1 asks.
- No change to `results/`, `site/`, campaign files, arms or scenario versions; nothing spent.

## Review

**Round 1** (a fresh read-only agent on a clone, `5dc5e850` against main `fbec4387`, reading the main checkout's
`results/` by absolute path only; main's HEAD and reflog unchanged after): no blocker, three should-fix, five nits.
It found the tables byte-identical to the script's output, the session split matching every step's replies, and hand
counts of `dry-runs/93` and a campaign-008 run equal to the script's.

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | should-fix | H1's "above 1.5×, beyond the variance" mixes the threshold with the comparison against the baseline | Fixed: above 1.5×, each worse than the baseline beyond the variance, the threshold's own variance not tested |
| 2 | should-fix | "H2 does not hold" rests on one confounded pair, and Codex was said to have no v0.2 reading | Fixed: "not met", per pair; campaign-006 added as Codex's pair on Terra (the reviewer's "no v0.2 reading" was wrong too) |
| 3 | should-fix | no test of Codex's transcript format | Fixed: a Codex step with two threads, chained commands and an approval after the reply |
| 4 | nit | Luna's "fewer instances than requests" is true of every row; approvals above gates unmentioned | Fixed: "fewer than one per request after the first", and more `memory approve` commands than gates asked |
| 5 | nit | H8's "every execution and model" counted the Opus slice's one scenario | Fixed: "every execution and model that ran the four" |
| 6 | nit | a loop over several approvals counts once | Fixed: the columns and the text say `memory approve` commands, a loop counted once |
| 7 | nit | criterion 1's WingFoil commit missing from the pins | Fixed: the commit column, from `run.json`'s `harness` |
| 8 | nit | not red-first is the approver's call | Stated in the Execution notes; for the approver |

**Round 2** (a fresh agent on a new clone, `6a93868e`; main's HEAD and reflog unchanged after): round 1's outcomes 1–7
verified; the tables byte-identical to a re-run; every claim of §4 checked against the tables and the runs. One
should-fix, four nits.

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | should-fix | bug-036's erratum understated, and the Terra pair's "falls" (H1) and "about the same" (H8) lean on campaign-006's costs | Fixed: the erratum's own figures (12 of 27 steps resumed on gpt-6.1-sol, priced as Terra, leaning towards the arm) in §1, and both Terra readings qualified by it |
| 2 | nit | Luna's extra `memory approve` commands named S1 and S8 only | Fixed: S1, S2 and S8 |
| 3 | nit | "on Haiku, S3 starts one more" read as every run | Fixed: "one run of Haiku's S3" |
| 4 | nit | the Execution notes said six cases and quoted the old command | Fixed |
| 5 | nit | a comment line of the script over 120 columns | Fixed: rewrapped |

**Round 3** (a fresh agent on a new clone, `e1d73336`; main's HEAD and reflog unchanged after): round 2's nits
verified (Luna's S1, S2, S8; Haiku's S3 runs at 4, 5 and 4 starts); the tables byte-identical to a re-run; the
word-diff only the fixes. One should-fix, one nit.

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | should-fix | H1's qualification pointed the wrong way: a v0.2 side that leans towards the arm reads too low, so the fall to step A would be larger, not smaller | Fixed: "so the size of the fall is uncertain", with no direction |
| 2 | nit | "priced as Terra, so … lean towards the arm" made the pricing the cause; Terra's row is the dearer one, and the lean comes from the stronger model doing the work | Fixed: "ran on gpt-6.1-sol, a stronger model (priced as Terra), so its comparisons lean towards the arm" |

**Round 4** (a fresh agent on a new clone, `12a85948`, the change since round 3 only; main's HEAD and reflog
unchanged after): no findings. Both fixes as recorded, no other wording changed.

