---
id: task-043-run-detail-and-side-by-side-comparison
type: task
title: "Run detail and side-by-side comparison"
status: done
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

### Build

Commits on `task/task-043-run-detail-and-side-by-side-comparison`:

- `1cb9178` `test(results)` (red):
  - `readableTranscript`;
  - `readRunDetail` and `resolveRun`;
  - both commands through `main`: unscored, stopped early, refusals, only reading;
  - `results.feature` @F5.3 ×2 on S3's reference in two arms.
- `6266bd9` `feat(results)`: `src/results/detail.ts`, `src/agents/transcript.ts`, `src/cli/show.ts`, the
  routing and `USAGE`. It also holds `show-render.test.ts`, rendering tests the first coverage run asked
  for.
- `e96c80e` `docs(requirements)`: requirements 1.18 (REQ-CLI-08).

**Deviations from the Design, found while building:**

1. **A run's name comes from its layout, not from the working directory.** It is
   `<campaign>/<n>/runs/…/r<k>` whenever the directory is laid out so. From the built CLI, whose working
   directory is the repository, the first version printed the full path.
2. **The acceptance test caches the commands' output, not the paths.** `tempDir` removes the
   repository when the test that made it ends, and the second @F5.3 scenario found it gone.
3. **`USAGE` gained two lines.** The three tests that match it whole were updated: `main.test.ts` ×2 and
   the bin test.

### Independent reviews and their fixes

Following the lesson of task-042, a fresh read-only agent reviewed the branch before `in-review`. It
confirmed:

- the fields read match what the runner and the scorer write;
- nothing writes;
- the layering holds (REQ-ARC-02).

It found:

1. **Against an acceptance criterion:** an unscored run that stopped early did not show the scenario's
   later steps as "not reached", and the test covering it was weak.
2. **Against the Design:**
   - compare's totals lacked tokens, turns and time;
   - the transcript read a session ending in `is_error` as "success";
   - the transcript dropped the result's text, which is where a question to the approver is.
3. **Misleading figures:** a step killed at its cap showed 0 USD, not its bound; two columns could
   share a label; EUR and USD mixed with nothing said.
4. **Crashes and gaps:**
   - a `null` transcript line, a malformed `commits.json` or an unreadable `score.json` made the whole
     command fail;
   - a stale `score.json` (another scenario hash) was shown as the run's;
   - the agent's version and the expected-failure mark were not shown;
   - the run's name was taken from any `X/N/runs/…` path;
   - an unknown `--flag` was read as a run.

Fixed test-first: `a57f092` (red, 9 tests), `219bd71`, `01ae367` (REQ-CLI-08). The scenario's step
count comes from `scenarios/`, used only when its hash is the run's. Mixed units stay, as the Design has
them, and are said under the table.

A second fresh agent reviewed that fix alone. It found nothing blocking, and all nine claims held. It
found:

- a scored step killed at its cap lost its `≤`;
- a scenario file the hash cannot read made the command throw;
- a resumed step's reported cost was hidden behind "not reported";
- the user's text was never cut;
- the file name appeared twice in a score's issue;
- compare did not say why a run is not scored.

Fixed test-first: `d9ffced` (red, 3 tests), `a3548dc`, `d45d5ea` (REQ-CLI-08). The result's text still
repeats the last assistant text when both exist. The second review advised keeping it, since for a
question the result is the only place the text appears.

**Checks after the fixes:**

- `npm test`: 1079/1079, coverage 98.87%; `detail.ts`, `transcript.ts` 100% of lines, `show.ts` 98.8%;
- `npm run test:bin`: 6/6, `bench run show` and `bench run compare` through the built CLI;
- lint and typecheck clean;
- `npm run test:docker` on `d45d5ea`, on its own: 16/16 in 812 s, no `bench-` container left. It holds no
  test of its own for F5.3: the commands read stored files, which the other suites cover. One earlier run was stopped: `npm test` and `test:bin` had been run
  beside it, against the rule (and `test:bin` rebuilds `dist/`). Its container was removed, and the
  suite was run again on its own.

### Review

- **Traceability.**
  - `features: [F5.3]`: both @F5.3 scenarios have their tests, and `traceability.test.ts` is green.
  - `acceptance: [results.feature]`.
  - `requirements`:
    - REQ-CLI-08 is amended (1.18);
    - REQ-RES-06: a transcript not on disk is stated;
    - REQ-FMT-06: the layout is read, and a run is named from it.
- **W10 decisions held:**
  - decision 3: text on standard output;
  - decision 5: no change to the scoring image.
- The three design choices the approver confirmed: a condensed transcript with `--full`, a run named by
  directory or by aggregate name, and compare on any two runs of one scenario version.
- **For task-044:** a finding note can link a run by its aggregate name. `bench run show <name>` and
  `bench run compare <name> <name>` open it from the repository's root.
- **For W11 (F5.6):** transcripts are git-ignored. A run read from a clone shows "transcript not on
  disk" until the release's transcripts are fetched.
- **For the approver's review decision:** requirements 1.18 (REQ-CLI-08).
- No new bug and no new decision-log. No WingFoil usage note. No spending.

### WingFoil commands (declared vs observed)

- Plan phase: see [task-042](task-042-determinism-metrics-across-repetitions.md) (`f2abfd6` add,
  `83ae055` submit, `2e43db6` approve).
- `node_modules/.bin/wingfoil memory submit task-043-run-detail-and-side-by-side-comparison` (`6c43d11`),
  in the worktree of branch `task/task-043-run-detail-and-side-by-side-comparison`.
  - Declared: `backlog → in-progress`, one commit `wf(task): submit <id>`.
  - Observed: exit 0, 1 file, a diff limited to `status: backlog` → `status: in-progress`. Matches.
- Build and review notes committed by hand (`507aaf6`), then `node_modules/.bin/wingfoil memory submit
  task-043-run-detail-and-side-by-side-comparison` in the worktree → `7aa9cc5`.
  - Declared: `in-progress → in-review`, one commit `wf(task): submit <id>`.
  - Observed: exit 0, 1 file, a diff limited to `status: in-progress` → `status: in-review`. Matches.

### Approval

- `memory approve … [in-review → approved]` → `8d431a0`, run by the approver in the task's worktree.
  - Declared: `in-review → approved`, one commit with an `Approver:` and a `Reason:` line.
  - Observed: exactly that, with 1 file.
- The review decision of requirements 1.18 is the approver's reason: "task-043 accepted after two
  independent reviews; requirements 1.18 (REQ-CLI-08) accepted". It names `8d431a0`.


### Delivery

- `git merge --no-ff task/task-043-run-detail-and-side-by-side-comparison` on main → `70ab168`.
- `npx wingfoil memory submit task-043-run-detail-and-side-by-side-comparison` on main → `a6ce308`.
  - Declared: `approved → done`, one commit.
  - Observed: exit 0, 1 file, a diff limited to `status: approved` → `status: done`. Matches.
- Second task of W10. The wave check follows task-044.
