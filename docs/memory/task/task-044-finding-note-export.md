---
id: task-044-finding-note-export
type: task
title: "Finding note export"
status: backlog
release: v0.1
wave: W10
features: [F5.4]
acceptance: [results.feature]
requirements: [REQ-CLI-07, REQ-RES-05, REQ-FMT-07]
---

## Context

Third and last task of wave **W10 — Determinism and findings** of release v0.1
([rel-v0-1](../release/rel-v0-1.md)). The W10 plan-phase decisions are in
[task-042](task-042-determinism-metrics-across-repetitions.md). This task delivers **F5.4 finding note**:
it exports a finding (campaign, scenario, runs, evidence) in a form that can be copied into a WingFoil bug
or decision-log (features 1.2, J4.3). With it, the wave's "Ends with" can be checked: "a first finding
note ready for WingFoil".

What exists:

- `aggregate.json` per campaign execution: every value with its runs and `n` (REQ-FMT-07), per group of
  scenario, version, arm and model; the break-even pairs each arm with the baseline; M-R1–M-R3 after
  task-042.
- `run.json` records the WingFoil commit the wingfoil arm ran (`harness.commit`).
- `bench run show` (task-043) opens the runs a note names.

Scope:

- **`bench finding <campaign-id>/<n> --scenario … --metric … --arms …`** (REQ-CLI-07) writes
  `findings/<id>.md` in this repository, and nothing anywhere else: never the WingFoil repository.
- **The note** is Markdown with REQ-RES-05's fixed sections: campaign, WingFoil commit, scenario@version,
  runs, metric values, links. Concretely:
  - the campaign id and execution, and the model;
  - the WingFoil commit of the wingfoil arm's runs;
  - the metric's value in each named arm, with `n`, `preliminary` when n = 1, and the losses;
  - the runs each value comes from;
  - links: each run's path and the `bench run show` command that opens it (W10 decision 3), and
    `bench run compare` for a pair of arms.
  - a section shaped to be copied into a WingFoil `bug` or `decision-log` element (which one, and its
    fields, is the design's, from WingFoil's element templates at the pinned commit).
- **The finding id** and what happens when `findings/<id>.md` already exists are the design's. The same
  inputs give the same note bytes, apart from a creation date recorded as metadata (REQ-SCO-03's spirit).
- **Errors:** an unknown scenario, metric or arm, an execution not aggregated, or a metric with no value
  for an arm (for example M-R with `n = 1`) are refused or stated, naming what is missing.
- **Acceptance:** `results.feature` @F5.4 "A finding note is ready to become a WingFoil bug or
  decision-log", with a test titled `@F5.4 <Scenario name>`.

Out of scope:

- Choosing which difference is a finding: the maintainer does, by the command's arguments.
- Filing the finding in WingFoil: the maintainer copies it, by hand.
- A finding on the site: W11.

**Done** means:

- `bench finding` writes a note from a scored, aggregated execution, with every section of REQ-RES-05.
- The @F5.4 scenario is green.
- Tests, coverage and lint pass; `npm run test:bin` covers the command.
- The wave check (task-042, decision 2) writes the first note from the declared synthetic execution, and
  records it in rel-v0-1's W10 section.

## Acceptance criteria

Classified in the design phase.

- `results.feature` @F5.4 "A finding note is ready to become a WingFoil bug or decision-log": from an
  aggregated execution of T3 in the baseline and wingfoil arms, the wingfoil runs recording a harness
  commit, `bench finding` writes `findings/<id>.md`. The note contains:
  - the campaign identity, the WingFoil commit, the scenario and version;
  - the runs involved and the metric's values;
  - links to the run details.

  Nothing is written outside `findings/` of the benchmark repository. **red-first**
- REQ-CLI-07 as amended: an unknown scenario version, metric or arm is refused, naming it and what
  exists; exit 1. A missing `--scenario`, `--metric`, `--arms` or `--as` is a usage error, exit 2.
  **red-first**
- An execution with no `aggregate.json` is refused, naming it. **red-first**
- A metric with no value for an arm (M-R at `n = 1`, a final not reached) is stated in the note, never
  invented. **red-first**
- The same inputs give the same note, byte for byte. A note that exists already is refused, naming it.
  **red-first**
- The WingFoil section follows the `bug` or `decision-log` template of the pinned WingFoil commit.
  **red-first**

## Design

Three findings shaped this design:

- **Every value a note needs is in `aggregate.json`.** A group per scenario version, arm and model
  holds each metric as a `Value`, with its runs and `n`, and `break_even` pairs each arm with the
  baseline. The one thing the aggregate lacks is the WingFoil commit. Each wingfoil run records it in
  `run.json` (`harness.commit`, REQ-RUN-14).
- **WingFoil's elements have templates, and they differ.** At the pinned `3df305e`
  (`docs/self/.wingfoil/memory/templates/`):
  - a **bug** has front matter with a required `severity`, then Summary, Steps to Reproduce, Expected
    Behavior, Actual Behavior, Notes;
  - a **decision-log** has Context, Decision, Rationale, Actions.

  A note is copied into one of them by hand (out of scope: the maintainer files it), so its WingFoil
  section is shaped as the one chosen.
- **The benchmark knows the facts, not the judgement.** It can state the values, the runs, how to
  reproduce, and what differs. What WingFoil should do about it is the maintainer's to write. The note
  fills the facts and leaves the rest as marked placeholders.

### The command (REQ-CLI-07 as amended in 1.19)

```
bench finding <campaign-id>/<n> --scenario <id>@<version> --metric <metric> --arms <arm>,<arm>… --as bug|decision-log
```

- `<campaign-id>/<n>` is an execution under `results/` holding `aggregate.json`. A dry run has none,
  and is refused.
- `--arms` takes one arm or more, in the order the note shows them; one arm is enough for M-R.
- The model is the campaign's default (`aggregate.json`'s `model`); slices are out of v0.1's notes.
- It writes `findings/<id>.md` in the repository at the working directory, and nothing else anywhere.
  It prints the path.

### The metric catalogue

Each id reads one place of a group (or of `break_even`), and shows each run's figure, `n`, the range,
and the runs:

| id | reads |
|---|---|
| `M-Q1` | the final snapshot's M-Q1 (`metrics.m_q1.final.m_q1`), and its runs not reached |
| `M-Q1-holdout` | the hold-out's final counts, or "not scored" |
| `M-Q2` | lint, complexity, duplication and coverage (`metrics.m_q2`) |
| `M-D3` | `metrics.m_d3` |
| `M-F1` | `metrics.m_f1`'s share and each decision |
| `M-F2` | `metrics.m_f2`, per step |
| `M-K1` | the run's cost in EUR and tokens (`metrics.cost`) |
| `M-K2` | interventions, turns and wall time (`metrics.cost`) |
| `M-K3` | the setup's cost and time, and the manual's tokens |
| `M-K4` | `break_even`'s entry for each arm but the baseline |
| `M-E1` | each check's violations per step (`metrics.checks`) |
| `M-R` | `metrics.m_r`: M-R1, M-R2, M-R3 with their pairs, or `n = 1`, or the pins that differ |

An unknown id is refused, listing the catalogue. A metric the group lacks (for example M-F1 on S1) reads
"not measured for this scenario". M-R at `n = 1` reads "n = 1: no value". Nothing is invented.

### The note: `findings/<id>.md`

**The id** is made from the inputs: `<campaign-id>-<n>-<scenario>-<version>-<metric>-<arms joined by
+>`, lowercased, with every character outside `[a-z0-9.+-]` as `-`. The same inputs name the same file;
a file already there is refused (exit 1), naming it, so a note the maintainer has edited is never
overwritten.

**The sections** are REQ-RES-05's, in this order:

1. `# Finding: <metric> on <scenario>@<version> — <arms>`
2. **Campaign:** the id, the execution, the model, whether it is preliminary (`n = 1` anywhere), and the
   aggregate's path.
3. **WingFoil commit:** each distinct `harness.commit` of the runs of arms whose harness is WingFoil,
   with its runs. "None: no arm named ran WingFoil" otherwise.
4. **Scenario:** `<id>@<version>` and its hash.
5. **Runs:** per arm, the group's runs by aggregate name, `n`, and its losses with their reasons.
6. **Metric values:** per arm, as the catalogue says.
7. **Links:**
   - `bench run show <name>` for each run;
   - `bench run compare <first run of arm 1> <first run of arm 2>` for each pair of arms;
   - the path of `aggregate.json`.
8. **For WingFoil (`bug` | `decision-log`):** a block ready to paste into a new element created with
   `wingfoil memory add`, following the pinned template:
   - **bug:** a front matter with `title` and `severity` left to fill; Summary (to fill); Steps to
     Reproduce (the campaign file, `bench campaign run`, `bench score`, `bench finding`); Expected
     Behavior (to fill); Actual Behavior (the metric values); Notes (campaign, WingFoil commit, links);
   - **decision-log:** Context (the metric values and the campaign); Decision (to fill); Rationale (to
     fill); Actions (to fill).

   "To fill" is a visible `<!-- to fill: … -->` placeholder, as WingFoil's own templates write theirs.

**No date** is written in the note. The same inputs give the same bytes; when it was written is git's.

### Modules

- `src/results/finding.ts` (new):
  - `findingNote({ executionDir, scenario, version, metric, arms, as })` reads `aggregate.json` and the
    runs' `run.json` and returns the note's id and text, or the refusals;
  - `METRICS`, the catalogue.

  Pure reading. The template shapes are constants here, with the pinned commit named in a comment.
- `src/cli/finding.ts` (new): the arguments, the file's existence, the write, the output. `src/cli/run.ts`
  routes it. `USAGE` gains the line.
- Tests:
  - unit tests of the catalogue on a hand-built aggregate: every metric, "not measured", `n = 1`;
  - the id and its characters, the two WingFoil shapes, the refusals, the same bytes twice;
  - `results.feature` @F5.4 through `main`, on T3 stored in two arms (wingfoil with a harness commit),
    scored with the scoring double and aggregated;
  - `npm run test:bin`: `bench finding` through the built CLI.

### Requirements 1.19

- **REQ-CLI-07:** `--as`, the model, the id, the refusal of an existing note, the metric catalogue.
- **REQ-RES-05:** the sections in order, the WingFoil section by template, no date, and that values the
  aggregate lacks are stated.

No ADR.

### Choices to confirm

1. **`--as bug|decision-log` is required,** and the note carries only that shape. The maintainer
   decides what the finding is before exporting it, and the block pastes as it is.
   - *Alternative:* both shapes in every note, and no flag. Nothing to decide at export, but the
     maintainer deletes half of every note.
2. **The id comes from the inputs, and an existing note is refused.** Rerunning the command never
   overwrites a note the maintainer has edited, and the same finding has one name.
   - *Alternative:* a sequential `finding-<n>`, which allows two notes of the same finding.
3. **No date in the note:** the same inputs give the same bytes, and git holds when it was written.
   This narrows the task's scope, which allowed "a creation date recorded as metadata".
   - *Alternative:* a `created:` date line, which breaks byte-for-byte reproduction.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
