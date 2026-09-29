---
id: task-043-run-detail-and-side-by-side-comparison
type: task
title: "Run detail and side-by-side comparison"
status: draft
release: v0.1
wave: W10
features: [F5.3]
acceptance: [results.feature]
requirements: [REQ-CLI-08, REQ-RES-06, REQ-FMT-06]
---

## Context

Second task of wave **W10 — Determinism and findings** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
The W10 plan-phase decisions are in [task-042](task-042-determinism-metrics-across-repetitions.md). This
task delivers **F5.3 run detail**: the transcript, diff, test results and token usage of one run, with
the WingFoil and baseline runs side by side (features 1.2, J2.7, J4.2).

What exists: every run is stored under `results/<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>/`
(REQ-FMT-06):

- `run.json`, with the setup, the manual, each step's session and the interventions;
- `setup/{log.txt, diff.patch}`;
- `steps/<NN>/{usage.json, transcript.jsonl, diff.patch, commits.json}`;
- `score.json` once scored: M-Q1 per step, the hold-out's counts, the checks, cost, M-Q2, M-F1/M-F2/M-D3.

Transcripts are git-ignored and, at publication, attached to a GitHub release (REQ-RES-06); the attaching
is W11's (F5.6). Nothing reads a stored run for a person yet: today the maintainer opens the files.

Scope:

- **`bench run show <run-path>`** (REQ-CLI-08) prints, as text on standard output (W10 decision 3):
  - the run's identity: campaign, execution, scenario@version, arm, model, repetition, the pins
    (`harness.commit` for the wingfoil arm);
  - per step: the session, the transcript (its messages and tool calls in a readable form; how much of it
    by default is the design's), the diff, the commits, the token usage and cost, the interventions with
    the approver's replies;
  - the test results: M-Q1 per step, the final snapshot and the hold-out's counts, the checks; "not
    scored" when `score.json` is absent;
  - a transcript that is not on disk (a run read from a clone, REQ-RES-06) is stated as missing, never an
    error.
- **`bench run compare <run-path> <run-path>`** (REQ-CLI-08): two runs of the same scenario version, side
  by side, step by step, with cost and M-Q1 pass rate per step, and the final and totals. Two runs of
  different scenario versions are refused, naming both.
- **Acceptance:** `results.feature`'s two @F5.3 scenarios, "Run detail shows everything about one run" and
  "Two arms of the same scenario can be compared side by side", with tests titled `@F5.3 <Scenario name>`.
  They run on stored runs of S3 (baseline and wingfoil) from the fake agent's reference, with a synthetic
  cost per arm where the comparison needs two different columns.
- A `run-path` form (a directory, or `<campaign-id>/<n>/<scenario>@<ver>/<arm>/<model>/r<k>`) and whether
  output is plain text or Markdown are the design's; REQ-CLI-08 is amended if the design makes it precise.

Out of scope:

- An HTML page per run, and links from the site: W11 (the rejected alternative of W10 decision 3).
- Comparing across campaigns (F5.2, v0.2).
- Attaching transcripts to a GitHub release: W11 (F5.6).

**Done** means:

- `bench run show` and `bench run compare` work on stored runs, scored or not, from a campaign execution
  or a dry run.
- The two @F5.3 scenarios are green.
- Tests, coverage and lint pass; `npm run test:bin` covers the two commands.

## Acceptance criteria

Classified in the design phase.

- `results.feature` @F5.3 "Run detail shows everything about one run": the transcript of every step, the
  diff of every step, the test results, the token usage and the interventions.
- `results.feature` @F5.3 "Two arms of the same scenario can be compared side by side": the wingfoil and
  baseline runs of S3, steps side by side, with cost and pass rate per step.
- A run not yet scored is shown with its test results "not scored".
- A missing transcript is stated, not an error.
- `bench run compare` refuses two runs of different scenario versions.
- A step the run never reached is shown as not reached, in both commands.
- The commands only read: nothing under `results/` changes.

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
