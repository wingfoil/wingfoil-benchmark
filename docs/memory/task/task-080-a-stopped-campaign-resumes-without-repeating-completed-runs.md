---
id: task-080-a-stopped-campaign-resumes-without-repeating-completed-runs
type: task
title: "A stopped campaign resumes without repeating completed runs"
status: in-progress
release: v0.2
wave: W14
features: [F1.4]
acceptance:
  - "campaign.feature#A resume re-runs only what infrastructure stopped"
  - "campaign.feature#A resume is refused when it could mix results"
  - "campaign.feature#Scoring a stopped execution keeps it resumable"
requirements: [REQ-RUN-19, REQ-CLI-03, REQ-CLI-06, REQ-FMT-06]
fixes:
  - bug-013-a-running-campaign-cannot-be-stopped-cleanly-and-keeps-spending-after-systematic-failures
---

## Context

Second half of F1.4 and of bug-013's fix, after task-079's `execution.json`.

**Scope** (REQ-RUN-19's resume bullets, REQ-CLI-03 and REQ-CLI-06 as amended in 1.26):
- `bench campaign run <file> --resume <campaign-id>/<n>` runs, in execution *n*, only the runs never started and
  those `failed` (infrastructure), `interrupted` or `quota exhausted`; never a run that reached a cap or completed
  with a poor result;
- a re-run keeps the earlier attempt under `attempts/<k>/`, counts it in `attempts`; aggregation reads the last
  attempt only, and the site shows `attempts` beside the run;
- refusals: another campaign identity, an execution already aggregated;
- `bench score <campaign-id>/<n>` aggregates only a `completed` execution, or with `--final`; an execution without
  `execution.json` (v0.1's) aggregates as before.

**Done** means: the three scenarios have acceptance tests, green with the fake agent; bug-013 can move to `fixed`.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `campaign.feature#A resume re-runs only what infrastructure stopped`: **red-first**. No `--resume` exists, and an
  execution is never run twice.
- `campaign.feature#A resume is refused when it could mix results`: **red-first**: nothing to refuse yet.
- `campaign.feature#Scoring a stopped execution keeps it resumable`: **red-first**. Today `score` aggregates any
  execution whose runs are all scored, and `--final` does not exist.

## Design

**Fixes:** bug-013 (second half: the resume). After this task is done, bug-013 gets `fixed_by` and its Resolution by
hand and moves approved → fixed (kanban-delivery version 4).

**1. The command** (REQ-CLI-03 as amended): `bench campaign run <file> --resume <campaign-id>/<n>`, with
`--allow-spending` in any order. `<campaign-id>/<n>` has `score`'s form. The usage text names it.

**2. Refusals, before the preflight, the guard and anything built** (REQ-RUN-19's third bullet). Each names its reason
and exits 1:
- the file's identity differs from `<campaign-id>`: "the campaign file is campaign X, not Y: resuming would mix
  results";
- no such execution, or one without `execution.json`. An execution from before v0.2 records no state, so the runs
  that never started cannot be told from a plan that never had them;
- the execution is aggregated: `aggregate.json` exists, or `execution.json` says `final: true`.

Once Docker is reached, one more refusal: a **running** container of this execution means another invocation may hold
it. It is refused before `execution.json` is touched, so that the other invocation's record is left alone. A stopped
leftover is reported by its run, as today (bug-003).

**3. What a resume runs** (REQ-RUN-19's second bullet), in the campaign's plan order, in execution *n*:
- **runs:** a planned run with no `run.json`, i.e. never started, and one whose outcome is `failed`, `interrupted` or
  `quota exhausted`;
- **kept:** `completed` and `cap reached` runs; a step that reached its time, token or intervention cap belongs to a
  `completed` run.
- A planned run's directory that holds output but no `run.json` was killed without a record, for example by a second
  signal. It is archived as an attempt, since it did run.
- The log says what the resume runs and what it keeps, by outcome.

**4. Attempts** (REQ-FMT-06 as amended):
- before a run re-runs, everything in its directory except `attempts/` moves to `attempts/<k>/`, where *k* is the
  next number;
- every `run.json` now records `attempts`: 1 for a first run, *k* + 1 after *k* earlier attempts;
- `executionRuns` already reads only `runs/<scenario>@<ver>/<arm>/<model>/r<k>/run.json`, so scoring and aggregation
  read the last attempt only, unchanged;
- the earlier workspace under `/runs/`, git-ignored debris, is replaced by the new one (`prepareWorkspace`). Its record
  stays under `attempts/<k>/`.

**5. The budget during a resume:**
- **During the resume:** the ceiling check that stops starting runs (REQ-RUN-08) starts from what execution *n*
  already spent. That counts every kept run and every earlier attempt, read from their `run.json` the way the runner
  counts spending (a killed step at its bound). A resume therefore never gets a fresh ceiling.
- **At start:** the guard is unchanged here and still reads the whole campaign's estimate. task-081 rebases it on every
  execution's spending plus the highest estimate (dl-012).
- **`fail_fast`:** it counts the failures of this invocation only.

**6. `execution.json` on a resume:**
- written back to `running`, keeping `started` and appending the date to `resumed` (a list);
- at the end, `completed` when every run to run ran, otherwise `stopped` with its reason, as in task-079.

**7. `bench score <campaign-id>/<n> [--final] [--holdout <path>]`** (REQ-CLI-06 as amended):
- every run is scored as today;
- an execution whose `execution.json` is not `completed`, and is neither `final` nor scored with `--final`, is **not
  aggregated**. `score` says why and how to go on: `not aggregated: execution <n> is stopped (<reason>): resume it
  with bench campaign run <file> --resume <id>/<n>, or declare it final with bench score <id>/<n> --final`. It exits
  0 when every run was scored, so that scoring never forecloses a resume;
- with `--final`, the execution is aggregated, and once `aggregate.json` is written, `execution.json` records
  `final: true`;
- an execution without `execution.json` (v0.1's) aggregates as before, and `--final` changes nothing there;
- `--final` on a dry run is a usage error.

**8. Not run** (REQ-CLI-06: "a run never started is then listed as not run"):
- `aggregate.json` gets `not_run`: the planned runs with no `run.json`, by name, present only when not empty;
- the plan is read from the execution's `campaign.yaml` copy: the default model over scenarios × arms with each
  scenario's repetitions, then each slice, as the runner plans them;
- a `campaign.yaml` that does not name scenarios, arms and repetitions gives no list (older test fixtures);
- `aggregate_version` is unchanged: the field is optional and readers ignore it.

**9. Shown:**
- the site's run list puts `— <k> attempts` beside a run that ran more than once (REQ-RUN-19: "which the site
  publishes beside the run"), and the landing page lists the runs not run;
- `bench run show` prints `attempts: <k>` when *k* > 1;
- `results/**` is committed except transcripts (`.gitignore`), so `execution.json` and `attempts/` are committed with
  no change (REQ-RES-06 as amended).

**10. Not here:** the start guard over every execution and the estimate range (task-081).

**Tests** (red first, committed apart from the code):
- **Acceptance, `test/acceptance/campaign.test.ts`:**
  - "A resume re-runs only what infrastructure stopped": seven runs of T3. The first execution gives r1 `completed`,
    r2 `cap reached`, r3 and r4 `failed`, and r5 `quota exhausted`, which stops it; r6 and r7 never start. The
    fixture then rewrites r4's recorded outcome to `interrupted`, since one execution cannot stop both at the quota
    and by an interrupt. The resume creates the containers of r3–r7 only, archives r3–r5 under `attempts/1/` with
    `attempts: 2`, and leaves r1 and r2 as they were.
  - "A resume is refused when it could mix results": through the command line, a changed file and an aggregated
    execution. Each is refused with its reason, and no image is built.
  - "Scoring a stopped execution keeps it resumable": a stored execution of T3 with two of three planned runs and
    `execution.json` `stopped`. `score` scores both and writes no `aggregate.json`; the resume's refusals do not
    apply to it; `score --final` aggregates it with `not_run: [r3]` and records `final: true`.
- **Unit:**
  - the `--resume` argument;
  - no execution, no `execution.json`, a running container;
  - a directory without `run.json` archived as an attempt;
  - two resumes give `attempts/1`, `attempts/2` and `attempts: 3`;
  - the ceiling seeded by earlier spending;
  - `execution.json` keeps `started` and lists `resumed`;
  - the planned runs with slices;
  - `--final` on a dry run, and on an execution without `execution.json`;
  - attempts on the site and in `run show`, and `not_run` on the landing page.

## Execution notes

**WingFoil commands, declared vs observed:**
- `npx wingfoil memory submit task-080-…` on main (`f1518ab`), after the Design's own commit (`77fe4f6`, W-01):
  declared backlog → in-progress; observed `{"from": "backlog", "to": "in-progress"}`, exit 0, one
  `wf(task): submit …` commit (W-14).

**Build** on `task/task-080` (worktree `../WingFoil2-Benchmark-wt/task-080`, its own `npm ci`):
- red first: `4583ab7` (the three acceptance scenarios), `193667d` (unit tests for the runner, `score`, the command
  line, `run show`, the site and `not_run`). They failed for the expected reasons: no `--resume`, a new execution
  instead of the resumed one, an unconditional aggregate, no `plannedRuns`. Five of the new unit tests already passed:
  they pin behaviour that must not change (a completed execution aggregates, `--resume` is refused on `validate`).
- `e3ade14` the implementation:
  - `src/results/execution.ts` holds `execution.json`'s record and `executionResumable`, and `plannedRuns` for
    `not_run`;
  - the runner takes `{ resume }` and `checkResume`;
  - `score` takes `--final`;
  - `run show` and the site show attempts.
  The usage text changed on purpose, so the two tests that pin it (`test/unit/cli/main.test.ts`,
  `test/bin/bench.test.ts`) were updated in the same commit.
- The bug link check (`test/support/traceability.ts`) required bug-013 to be `fixed` as soon as task-079 was `done`,
  which the two-task plan cannot meet. The approver chose option A in chat on 2026-10-12 ("A, come proposto"): a bug is
  due `fixed` only once every task that lists it is done. Red test `4adc477`, fix `cc04b20`; both commits carry
  `Approver:` and `Reason:`.
- `b77c80e`: the README on resuming and `--final`.
- Checks, niced, with 2 workers: `tsc` and `npm run lint` clean. `test/unit` and `test/acceptance` green (1461 tests),
  run whole once, niced, after the usage text changed.

**Decisions taken in the build, inside the Design:**
- `not_run` names runs as the campaign plans them (`<scenario>@<version>/<arm>/<model>/r<k>`), without the
  `<campaign>/<n>/runs/` prefix the groups' run names carry: a run never started has no directory to open.
- `SiteModel.notRun` is optional, as an aggregate written before it has none.
- A resume with nothing left to run still builds the image and the harnesses. Kept as it is: one code path, and such a
  resume is rare.

## Review notes
