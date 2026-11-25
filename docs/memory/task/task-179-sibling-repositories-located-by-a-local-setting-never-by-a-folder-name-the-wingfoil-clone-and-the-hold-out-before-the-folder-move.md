---
id: task-179-sibling-repositories-located-by-a-local-setting-never-by-a-folder-name-the-wingfoil-clone-and-the-hold-out-before-the-folder-move
type: task
title: "Sibling repositories located by a local setting, never by a folder name: the WingFoil clone and the hold-out before the folder move"
status: done
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

Built by hand in a worktree of the main checkout while the runner's line worked task-164: the runner takes the backlog
in id order (WingFoil reads the elements in path order and has no priority), so task-179 would have come after
task-165 to task-176; the approver chose the hand build (2026-11-25). Its build step is finalized by hand after the
merge (F-050), and nothing is pushed before it is done, so the line never proposes it.

- `834f05d1` red: the resolver's test (`test/unit/support/siblings.test.ts`), the local file's example and ignore and
  the old folder names (`test/unit/docs/siblings-config.test.ts`), full-suites' clone (three cases; the variable's
  pass-through was green already, a characterization). Red for the missing module, the missing example and ignore,
  the six files naming old folders, and the script's guessed default.
- `57260593` green: `test/support/siblings.ts`, the four scenario tests and `test/docker/run.test.ts` on it,
  `scripts/full-suites.sh` reading the file, the example, `.gitignore`, a README paragraph under Full suites.
- `ff2a0855` the requirements (REQ-NFR-04, REQ-CLI-10): the traceability test asks one of every task past draft.

Deviations from the Design, each small: a `~/` path in the local file is read against the home folder (the runner's
example writes its paths so); a skipped test carries its reason in its title (`titled`), since vitest prints nothing
else for a skipped test, and the acceptance traceability reads only `test/acceptance` titles, which this task does
not touch; `holdoutScenario(id)` gives the four scenario tests one line each. A local file with another key, or a key
that is not a string, throws: a typo never reads as "not set".

AC8: the approver's local file is written in the main checkout (git-ignored once this branch is merged; until then it
shows as untracked there). From this worktree the scenario tests now read the hold-out: 62 passed, none skipped,
where the same run skipped 10 before the file.

### Review

| Round | Commit | Reviewer | Findings | Outcome |
| ----- | ------ | -------- | -------- | ------- |
| 1 | `b777d1de` | independent agent, read-only clone | should-fix: `full-suites.sh` read a quoted value or a trailing comment unlike YAML; nits: `wingfoil: ~` read as a path by the script, README claimed nothing is exported, the resolver failed to load outside git and parsed the file even with both variables set, the old-name scan matched only after `/` or a quote, machine paths in skip titles | fixed: the script strips CR, a ` #` comment and one pair of quotes, and treats empty, `~` and `null` as unset (the cases reported, tested; the class closed in round 2); README says only the clone is exported; `mainCheckout` falls back outside git; the file is read only when a variable is unset; the scan matches the name between non-name characters. Kept: machine paths in skip titles (console and git-ignored logs only) |
| 2 | `43dde97c` | the same agent, re-review | nit: rarer quoted values (a quoted `#`, a quoted `~` or `null`, escapes) still read apart; nit: the empty-or-null resolver test came in the fix commit, not the red one (it was red on `b777d1de`), and the old-name regex has no test of its own | fixed: the script reads the key with the same `yaml` package as the resolver, a red test for a quoted `#`. Kept: the commit order (recorded here), the regex checked by hand by the reviewer |
| 3 | `6a835f2e` | the same agent, re-review | nits only: when the file cannot be read (no `node_modules`, no `node`, a value the resolver refuses) the script's line says the key is absent, not unreadable; a block scalar keeps its newline in the resolver and loses it in the script | accepted, the review closes. Kept: both nits (the clone is left unset, or a path reported, never a wrong one exported) |

Full suites at `5f8a76ae`, from this worktree with no `BENCH_*` variable exported (the clone read from the main
checkout's local file, AC8): LINT 0, TEST 0 (2605 passed, none skipped), BUILD 0, BIN 0 (22), DOCKER 0 (24 passed,
none skipped: the hold-out and wingfoil tests ran), RUNNER 0 (103 passed, 1 skipped); log
`.cache/full-suites/2026-11-25/task_task-179-sibling-paths-5f8a76ae-102822.txt`.

`wingfoil` commands: `memory submit` moved the task backlog → in-progress, as declared.
