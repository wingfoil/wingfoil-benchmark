---
id: task-043-run-detail-and-side-by-side-comparison
type: task
title: "Run detail and side-by-side comparison"
status: in-progress
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

- `results.feature` @F5.3 "Run detail shows everything about one run": on a stored run of S3 (the
  reference, with a recorded session as step 1's transcript and one intervention), `bench run show`
  prints, per step, the transcript, the diff, the token usage and the interventions, and the test
  results. **red-first**
- `results.feature` @F5.3 "Two arms of the same scenario can be compared side by side": S3's wingfoil
  and baseline runs, scored, with a synthetic cost per arm. `bench run compare` prints one row per step
  with each run's cost and M-Q1, then the final snapshot and the totals. **red-first**
- A run not yet scored is shown with its test results "not scored". **red-first**
- A missing transcript is stated ("transcript not on disk"), not an error. **red-first**
- `bench run compare` refuses two runs of different scenario versions, naming both; exit 1.
  **red-first**
- A step the run never reached is shown as not reached, in both commands. **red-first**
- The commands only read: the bytes under `results/` are the same before and after. **red-first**
- A run path that is not a stored run is refused, naming it; a wrong argument count is a usage error
  (exit 2). **red-first**

## Design

Three findings shaped this design:

- **Everything the run detail shows is already stored, except the transcript's readable form.**
  `run.json` holds the pins, each step's session, outcome and usage, and every intervention with its
  step, kind and reply (REQ-RUN-07). Each step's directory holds `usage.json`, `diff.patch`,
  `commits.json` and `transcript.jsonl`. `score.json`, when scored, holds M-Q1 per step, the hold-out's
  counts, the checks, the cost per step, and the rest.
- **A transcript is the agent's own format**, Claude Code's stream-json here, one event per line. Only
  the adapter knows it. `results` may not import `agents`, since both are middle modules (REQ-ARC-02),
  so the readable form is made by the agent module and put together by `cli`.
- **A run's name in `aggregate.json` is `<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>`**,
  its path under `results/`. A finding note (task-044) links runs by that name. The command takes that
  name as well as a directory, so a name copied from an aggregate or a note opens the run.

### The commands (REQ-CLI-08 as amended in 1.18)

- `bench run show <run> [--full]`
- `bench run compare <run> <run>`

A `<run>` is a directory holding a `run.json`, or a run's name under `results/` of the working
directory. Dry runs (`dry-runs/<n>/runs/…`) are runs too. Anything else is refused, naming it (exit 1).
A wrong number of arguments is a usage error (exit 2). Both commands only read.

### `bench run show`

Plain text on standard output, in Markdown form (headings, lists, fenced diffs), so that it reads in a
terminal and pastes into a finding note:

- **The run:** campaign or dry run, execution, scenario@version, arm, model, repetition, outcome; the
  pins it records (scenario hash, harness tool and commit, the approver policy, the manual's tokens);
  the setup's time and cost.
- **Each step, in order:**
  - its session, outcome, token usage by kind, cost in USD (and EUR when scored), turns and time;
  - its interventions: kind and the approver's reply;
  - its commit messages (`commits.json`);
  - its transcript, readable:
    - the assistant's text in full;
    - each tool call as its name and its input, on one line, cut to 200 characters;
    - each tool result as its first 5 lines and how many more;
    - the final result line: stop reason, turns, cost.

    `--full` prints every tool result whole. A line that is not an event the adapter knows is printed
    as it is, cut to 200 characters. A transcript that is not on disk (a run read from a clone:
    transcripts are git-ignored, REQ-RES-06) is stated as "transcript not on disk", never an error;
  - its diff, `diff.patch` as a fenced `diff` block;
  - a step never reached: "not reached", with nothing else.
- **The test results**, from `score.json`: M-Q1 per step and on the final snapshot, per suite, with the
  failing tests; the hold-out's counts; each check per step; M-F1, M-D3 and M-Q2 when present.
  "not scored" when there is no `score.json`.

### `bench run compare`

Two runs of the **same scenario version** (the same scenario, version and scenario hash). Otherwise it
is refused, naming both, exit 1. Any two runs qualify: two arms, two models, or two repetitions.

- A header: each run's name, arm, model, repetition and outcome.
- A table, one row per step of the scenario: for each run, its cost in EUR (from `score.json`, or USD
  from `run.json` when not scored), its M-Q1 on that step when a suite scores it, and its
  interventions. A step never reached reads "not reached".
- Then the final snapshot's M-Q1, the hold-out's final counts, the checks passed, and the totals: cost,
  tokens, turns and time. A figure the run does not have reads "—", and a run not scored says so.

### Modules

- `src/results/detail.ts` (new): `readRunDetail(runDir)` reads `run.json` in full, each step's files
  and `score.json` if present, into a `RunDetail`; `resolveRun(root, argument)` turns a `<run>` into a
  directory, or refuses it. Pure reading: no module above `results` is needed.
- `src/agents/transcript.ts` (new): `readableTranscript(lines, { full })`, Claude Code's stream-json
  events as the lines above. It is exported by `agents`, next to the adapter that writes them.
- `src/cli/show.ts` (new): the two commands, rendering; `src/cli/run.ts` routes `run show` and
  `run compare`; `USAGE` gains both lines.
- Tests:
  - unit tests of `readRunDetail`, `resolveRun`, `readableTranscript` (on the recorded sessions of
    `test/fixtures/sessions/`), and of both renderings;
  - `results.feature` @F5.3 ×2 through `main`, on S3's reference stored in two arms and scored with the
    local scoring double;
  - `npm run test:bin`: `bench run show` and `bench run compare` through the built CLI.

### Requirements 1.18

- **REQ-CLI-08:** the `<run>` forms, `--full`, the refusals, and that both commands only read.

No ADR: nothing about scoring, the image or the runner changes.

### Choices to confirm

1. **The transcript is condensed by default:** the assistant's text whole, each tool call on one line,
   each tool result cut to 5 lines. `--full` prints everything. The diff is always whole. A run of S3 can
   hold hundreds of tool results, and the text and the calls are what a reader follows.
   - *Alternative:* everything by default, and `--brief` to condense. That is the literal reading of
     "shows the transcript", but it gives thousands of lines per run.
2. **`<run>` is a directory or a run's name as `aggregate.json` writes it.** The same name then works
   from an aggregate, a finding note, or a shell.
   - *Alternative:* directories only. Simpler, but a note's links would need the `results/` prefix and
     would not match the aggregate's names.
3. **`compare` takes any two runs of one scenario version**, not only two arms. Two repetitions of one
   arm is what a reader of M-R wants to see side by side.
   - *Alternative:* require two different arms, as the Gherkin's example has it.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
