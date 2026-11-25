---
id: task-179-sibling-repositories-located-by-a-local-setting-never-by-a-folder-name-the-wingfoil-clone-and-the-hold-out-before-the-folder-move
type: task
title: "Sibling repositories located by a local setting, never by a folder name: the WingFoil clone and the hold-out before the folder move"
status: in-progress
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04, REQ-CLI-10]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

The approver moves this repository's folders under a common parent, lower-case (the main checkout, its worktrees, the
hold-out, the runner's home and line). The WingFoil clone moves too, but later, when WingFoil adopts the external
workflow runner, with no date yet: for a while the Benchmark sits in the new parent and the clone in the old place.
Tests and scripts that guess a sibling by its folder name break at the move, and a new fixed name would break again
when the clone moves. The approver chose to fix them in a small task before the move (2026-11-24), merged and pushed
first; the coordinating session proposed the shape adopted here.

Sibling-folder defaults in tracked code today:

- `test/docker/run.test.ts`: the WingFoil clone (`BENCH_WINGFOIL_REPO`, else `../WingFoil2`) and the hold-out
  (`BENCH_HOLDOUT_PATH`, else `../WingFoil2-Benchmark-HoldOut`);
- `test/unit/scenarios/s2.test.ts`, `s3`, `s8`, `s10`: the hold-out, same default;
- `scripts/full-suites.sh`: the WingFoil clone, `$(dirname "$MAIN")/WingFoil2`.

`spikes/task-011/lib.sh` names the clone too; it is a closed spike's record and stays as it is.

Done means: no tracked test or script names a sibling project's folder; the location comes from the existing variables
or from one git-ignored local file; when neither gives it, the test skips with a reason that names the variable, never
a guessed path. When the clone moves, only the local value changes.

## Acceptance criteria

1. red-first: a test support module resolves the WingFoil clone and the hold-out, in this order: the variable
   (`BENCH_WINGFOIL_REPO`, `BENCH_HOLDOUT_PATH`), then the local file `config/siblings.local.yaml` (git-ignored),
   then, for the hold-out only, `../wingfoil-benchmark-holdout` beside the main checkout (it moves with the Benchmark).
   The clone has no default. It reports where the value came from.
2. red-first: the local file is read from the main checkout, so a worktree finds it (the main checkout located as
   `scripts/full-suites.sh` does, by the git common directory).
3. red-first: when no source gives an existing folder, the resolver returns no path and a reason that names the
   variable and the local file; a source that names a missing folder is reported as missing, never replaced by the
   next one silently.
4. red-first: the docker run tests and the S2, S3, S8 and S10 scenario tests take their paths from the resolver, and
   skip with its reason when it gives none.
5. red-first: `scripts/full-suites.sh` reads the clone from `BENCH_WINGFOIL_REPO`, else from the local file; without
   either it runs and prints one line that names the variable (the wingfoil docker tests skip, as today from a
   worktree). Its test covers the file and the line.
6. characterization: the local file never feeds `process.env`: the resolver hands paths to the tests that ask, and the
   CLI's own `BENCH_HOLDOUT_PATH` handling and its tests are unchanged (exporting the hold-out to the suite makes the
   fixture scenario tests read the real hold-out and fail).
7. red-first: a tracked `config/siblings.local.example.yaml` holds placeholders only, and `.gitignore` covers the local
   file; a test checks both, and that no tracked test or script under `test/` and `scripts/` names `WingFoil2` or
   `WingFoil2-Benchmark-HoldOut` as a path.
8. The approver's local file written on this machine (not committed), and the full suites green from the main
   checkout and from the task's worktree with the hold-out tests run, not skipped.

## Design

- `test/support/siblings.ts`: `wingfoilClone()` and `holdout()` return `{ path?: string; source: 'env' | 'local' |
  'default'; reason?: string }`. A `describe.skipIf`-friendly helper gives the reason as the skip's title.
- `config/siblings.local.yaml`: `wingfoil: <absolute path>`, `holdout: <absolute path>`. YAML like
  `config/runner.local.yaml`; read with the `yaml` package the tests already use. The shell script reads the one key
  with `sed`, no YAML parser in bash.
- Machine paths live only in the git-ignored file; the example and the docs name placeholders.
- The CLI (`src/cli/preflight.ts`) keeps reading only the variables: a campaign never depends on a test helper's file.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
