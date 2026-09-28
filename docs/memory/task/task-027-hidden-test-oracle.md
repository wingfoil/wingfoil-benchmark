---
id: task-027-hidden-test-oracle
type: task
title: "Hidden-test oracle"
status: in-review
release: v0.1
wave: W6
features: [F4.1]
acceptance: [scoring.feature]
requirements: [REQ-CLI-06, REQ-SCO-01, REQ-SCO-02, REQ-SCO-03, REQ-FMT-06, REQ-ARC-01, REQ-ARC-02, REQ-ARC-04]
---

## Context

Second task of wave **W6 — First scores** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), the
"pass/fail" half of its "Ends with". It builds on task-026's `oracle.suites` (dl-001). The W6
plan-phase decisions are in [task-026](task-026-oracle-suites-per-step.md).

Scope of F4.1:

- **`bench score <campaign-id>/<n> [--holdout <path>]` (REQ-CLI-06)** scores every run of one campaign
  execution and writes each run's `score.json` beside its `run.json` (REQ-FMT-06). `--holdout` is
  accepted and validated here (task-016's `checkHoldoutRoot`); running the hold-out tests is task-028's.
- **The `scoring` module (REQ-ARC-01)**, beside `runner`: `cli` → `scoring` → (`scenario`, `results`) →
  `core`, never importing `runner`, nor the reverse (REQ-ARC-02, enforced by the lint rule of
  task-001).
- **A scoring container (REQ-SCO-01):** its own image, never a run container; each step snapshot
  copied into it, the oracle mounted **read-only**. Docker through the existing port (REQ-ARC-04), so
  acceptance tests use the fake.
- **Hidden tests with `node:test` and `tsx` (REQ-SCO-02)**, both pinned in the scoring image,
  independent of the test tool the agent chose.
- **M-Q1** (experiment design §4.1): passed ÷ total, for every step some suite scores
  (`after_steps`) and for the final snapshot, per suite and in total.
- **Deterministic (REQ-SCO-03):** the same snapshot and oracle version give a byte-identical
  `score.json`; timestamps only as metadata, outside any metric.

Left to the design phase: how a step snapshot is rebuilt from what a run stores (plan-phase
decision 5: seed plus each step's `diff.patch`, with the setup commit, versus the git-ignored
workspace); how a hidden test finds the snapshot's code (a fixed mount point and an import
convention); what a test that hangs or a snapshot that does not compile counts as (a failure, bounded
by a timeout, never a scoring error); the shape of `score.json`, which task-028 to task-030 extend;
and whether dry runs can be scored here too, which F6.x needs in W7 ("the public oracle scores the dry
runs without errors").

**Done** means: `bench score` on a campaign execution made with the fake agent writes, for each run, a
`score.json` with M-Q1 per scored step and for the final snapshot; scoring it twice gives identical
files; no run container is used; tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scoring.feature` @F4.1 "Hidden tests run outside the container on each snapshot". **red-first**
- `scoring.feature` @F4.1 "Scoring the same snapshot twice gives the same result". **red-first**
- REQ-CLI-06 — the command, its argument, and its errors (unknown campaign execution, a run without
  its steps, an invalid `--holdout`). **red-first**
- REQ-SCO-01 — the scoring container holds the snapshot copy and the read-only oracle, and no run
  container is created or reused. **red-first**
- REQ-SCO-02 — hidden tests run under `node:test` with `tsx`, whatever the snapshot's own test setup.
  **red-first**
- REQ-ARC-02 — `scoring` and `runner` never import each other (the lint rule). **red-first**

## Design

**Classification confirmed:** all red-first. Two additions found in design, both red-first: the runner
stores what a snapshot is rebuilt from (below, "What a run must store"), and `bench score` accepts a dry
run (`dry-runs/<n>`). The conventions this task fixes for every later scenario and scorer are recorded
as **adr-004** (W6 scoring conventions), submitted with this task and approved at its review, as
adr-003 was with task-011.

### What a run must store — found in design

Plan-phase decision 5 says scoring reads only what a run stores. Today that is **not enough** to rebuild
a snapshot:

- the `setup` commit (the arm's environment, the manual, the harness's files) leaves no patch, so step
  1's patch cannot be applied to the seed alone once it touches a file the setup created;
- `diff.patch` comes from `git show --patch` **without `--binary`**: a binary file appears as "Binary
  files differ" and cannot be applied.

So the runner changes (REQ-RUN-05, REQ-FMT-06, amended in requirements 1.8):

- `patchOf` uses `git show --binary --full-index`: `diff.patch` applies with `git apply`. It stays a text
  file, readable in a review.
- The setup phase stores `setup/diff.patch`, the `setup` commit's patch, beside `setup/log.txt`.
- `run.json` records, for the setup and for every step, the **tree** of its commit (`git rev-parse
  <commit>^{tree}`). A tree id depends only on content, not on dates or authors, so it is what a rebuilt
  snapshot is checked against.

Runs stored before this change have none of it and cannot be scored: `bench score` says so, per run. No
campaign result exists outside the tests; the fixtures that hold a `run.json` are regenerated.

### Rebuilding a snapshot (`scoring/snapshot.ts`)

On the host, in a temporary directory, through the git port (REQ-ARC-04): the scenario version's seed,
copied and committed exactly as a run's workspace starts (the code moves from `runner/workspace.ts` to
`scenario/`, so both use the same function and `scoring` never imports `runner`, REQ-ARC-02); then
`git apply --binary --index` of `setup/diff.patch` and commit; then each step's `diff.patch` and commit,
in order. After each commit the tree is compared with the one `run.json` recorded; a difference stops
that run's scoring with `step NN: the rebuilt snapshot differs from the one the run recorded`. The
scenario version must still have the hash the run recorded (`scenario_hash`), or the seed is not the
one the run started from.

### The scoring container (REQ-SCO-01)

A second image, `docker/score-image/`: the run image's pinned `node:22-bookworm` digest, **`tsx` pinned
and installed at a fixed path** (`/opt/score`), and the benchmark's **node:test reporter**
(`/opt/score/reporter.mjs`). Tagged `bench-score:<12 hex of the SHA-256 of the build context>`, built
when missing, so a change to the reporter is a new image. No agent, no git, no harness.

Per snapshot and per suite run, one container: created with **`--network none`**, the suite directory
**bind-mounted read-only**, and the snapshot **copied in** (`copyTo`), never mounted — the scorer may
write into its copy, never into the results. The container layout **mirrors the scenario version**: the
snapshot takes the seed's place and each suite sits at its own `dir`, both under `/score/`. A hidden
test's relative import (`../../seed/src/orders.js` from `oracle/public/`) therefore reaches the
snapshot in the container exactly as it reaches the seed on the author's machine. The `DockerPort`
gains what it needs: read-only mounts and no network on `create`. The run container's own isolation
check (one mount, the workspace) is unchanged.

Scoring installs **nothing**: a snapshot's dependencies are what it holds. No v0.1 seed has a runtime
dependency yet; if S2, S3 or S8 needs one, W7 decides how scoring gets it without a network.

### Running hidden tests (REQ-SCO-02)

`timeout --kill-after=10 900 node --import <tsx at its fixed path> --test --test-concurrency=1
--test-timeout=120000 --test-reporter=/opt/score/reporter.mjs <the suite's test files>`, in `/score`.
Each test file runs in its own process (node's default isolation), and `--test-timeout` bounds each
test **and each file's process**; the outer `timeout` bounds the whole suite, with `--kill-after`
because a node blocked in a synchronous loop does not act on `SIGTERM` (seen while designing). The
reporter writes one JSON line per event it keeps — a test enqueued, passed, failed — with the test's
file (relative to the suite), its name path (`describe` names, then the test's) and whether it was
skipped, and **no durations**.

**The census.** Probed on Node 22.21 while designing: a test file whose test blocks synchronously is
killed at its timeout **before its child process reports anything**, the tests it had registered
included; `--test-only`, tried as a way to list tests without running them, filters them before they
are reported. So a snapshot's own run cannot say how many hidden tests there were. The total comes
from a **census**: every suite is run once on the scenario's **seed**, where — by the convention
below — every hidden test fails fast and is reported. The census depends only on the seed and the
oracle, both fixed by the scenario's hash, so it is the same for every run and snapshot of a version.

Counting, the same for every scenario (adr-004):

- a **hidden test** is a leaf test (not a `describe`) the census reports and does not skip; `skip` and
  `todo` tests count nowhere;
- a suite's **total** is its census; **passed** is the census tests a snapshot's run reports as passing;
  every other census test **fails** — failed, timed out, or never reported because its file was killed;
- a hidden test **imports the code under test inside the test** (`await import(…)`), never at the top
  of the file. A snapshot that lacks the code or does not compile then fails each test, not the file,
  and the seed yields a complete census. A census file that fails to load, or a snapshot run reporting
  a test the census does not have, is the **oracle's** fault: a scoring error for that scenario
  version, never a zero for the run. T3's test is rewritten to `node:test` and this convention, and
  adr-004 states it for scenario authoring (W7, W8).

### What is scored, and `score.json`

- For every step `n` a run completed: the suites with `n` in `after_steps` (dl-001).
- **The final snapshot** — the last step's, when the run completed every step — against **every** suite:
  "M-Q1 on the final snapshot" (experiment design §4.1) is the whole oracle on the result, which also
  shows a later step breaking an earlier suite.
- A step the run never reached, or the final snapshot of a run that did not complete, is recorded as
  **`not reached`**, with no value. How aggregation counts it — as a loss, like an expected failure — is
  W7's (F5.1), carried in the release element.

`score.json` (REQ-FMT-06), version 1, written beside `run.json`, keys in a fixed order, no timestamp:

```json
{
  "score_version": 1,
  "scenario": "T3", "version": "1.0", "scenario_hash": "sha256:…",
  "scorer": { "image": "bench-score:…", "node": "22.x.y", "tsx": "x.y.z" },
  "steps": [
    { "n": 1, "suites": [ { "id": "orders", "passed": 1, "total": 1, "failed": [] } ],
      "m_q1": { "passed": 1, "total": 1 } },
    { "n": 2, "not_reached": true }
  ],
  "final": { "not_reached": true }
}
```

`failed` lists the failing tests of the **public** suites by file and name path, sorted: they are public.
M-Q1 is kept as the two integers; the ratio is aggregation's, so no rounding enters a stored value.
`scorer` pins what scored it. task-028 adds the hold-out's results apart, task-029 the cost metrics,
task-030 the expected-failure mark; each is a key of its own, and `score_version` rises only when a rule
changes, not when a key is added.

### The command (REQ-CLI-06)

`bench score <campaign-id>/<n> [--holdout <path>]`, and `bench score dry-runs/<n>` for a dry run (F6.x in
W7 scores dry runs with the public oracle; they are never aggregated, REQ-RES-01). For each run of the
execution, in path order: rebuild, score, write `score.json`, print one line —
`T3@1.0 baseline fake-model r1: step 01 1/1, final 1/1` or the reason it could not be scored. Exit 0 when
every run was scored — whatever its tests did — and 1 otherwise; usage errors exit 2. `--holdout` is
validated here (`checkHoldoutRoot`); task-028 runs it. Scoring a run again overwrites its `score.json`
with the same bytes (REQ-SCO-03), which the acceptance test checks.

### Requirements 1.8

REQ-RUN-05 (the patch binary-safe, the tree recorded), REQ-FMT-06 (`setup/diff.patch`; a dry run's
`score.json`), REQ-CLI-06 (`dry-runs/<n>`), REQ-SCO-01 (no network in the scoring container). The review
decision is the approver's at this task's review.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `c1c12c6`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W6 tasks of release v0.1` (`1551d03`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-027-hidden-test-oracle` → `3054664`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
- `npx wingfoil memory approve task-027-hidden-test-oracle --reason "…"`, run by the approver → `29f6a78`
  (`pending → backlog`, `Approver:`/`Reason:` trailers). Matches.
- Design committed by hand on `task/task-027-hidden-test-oracle` (`0bfa04c`), then `npx wingfoil memory
  submit task-027-hidden-test-oracle` → `0ead612`. Declared: `backlog → in-progress`, one commit. Observed:
  exit 0, empty stderr, 1 file, only `status` changed, subject without transition (N9). Matches. WIP after
  it: one task `in-progress` (this one), none `in-review`.
- `npx wingfoil memory add --type bug --title "A stored patch leaves out the commits made between two
  snapshots"` → `957ae27`, and `--type adr --title "W6 scoring conventions"` → `9ca411d`. Declared: one
  commit `wf(<type>): add <id>`, one file from the type's template, `status: draft`. Observed: exit 0, empty
  stderr, 1 file each. The scaffold's body is a placeholder comment saying that `memory submit` "replaces
  these placeholder comments with real content": it does not, and nothing declares that it does outside
  the comment itself. The bodies were written by hand first (`db6ec25`), as plan-003's rule says.
  Otherwise matches.
- `npx wingfoil memory submit bug-007-…` → `310a7de`, `npx wingfoil memory submit adr-004-…` → `ed649a2`.
  Declared: `draft → pending`. Observed: exit 0, 1 file each, only `status` changed. Matches. Both wait
  for the approver with this task.

### Build

Test-first throughout: each part's tests were written and run red before its code.

- **The runner stores what a snapshot is rebuilt from** (`5e11b54`, then `f8820c7`). The git port gains
  `tree` and `apply`; `run.json` records the tree of the setup and of every step; the setup stores
  `setup/diff.patch`.
- **Deviation from the Design, and a bug found — bug-007.** The Design took each patch as `git show
  --binary` of the runner's commit. Re-reading adr-003 decision 10 during the build: the harness commits
  during the setup (`wingfoil init`), and in the wingfoil arm the agent commits during a step (`memory
  add`, `submit`, `approve`). `git show HEAD` — the patch since task-005 — left all of that out of every
  stored patch, and no snapshot could have been rebuilt from them. Every patch now runs **between two
  snapshots' trees** (`git diff --binary --full-index <previous tree> <tree>`): the setup's from the seed,
  each step's from the previous snapshot. Filed as
  [bug-007](../bug/bug-007-a-stored-patch-leaves-out-the-commits-made-between-two-snapshots.md), with its
  Resolution; a snapshot test rebuilds through harness and agent commits.
- **Results and ports** (`00c3cce`): `executionRuns`, `readStoredRun` in `results/`; `createScoring` in the
  Docker port (`--network none`, read-only bind mounts); `prepareWorkspace` moved to `scenario/`, so scoring
  rebuilds the run's repository with the runner's own code without importing `runner` (REQ-ARC-02).
- **The scoring module** (`bde2eda`): `scoringImage`, `rebuildSnapshots`, `runSuite`, `scoreRun`,
  `writeScore`, `scoreSummary`; `docker/score-image/` (tsx 4.23.15 with its lockfile, the reporter). The
  reporter was written against the events Node 22.21 actually emits (probed: `test:start` in pre-order
  gives the name path; a file that fails to load or is killed reports a failure no `test:start`
  announced).
- **Deviation:** `score.json`'s `scorer` records the image tag and the tsx version, not Node's: Node is
  pinned by the image's base digest, and the tag changes with the directory it is built from.
- **The command** (`0872f78`): `bench score <campaign-id>/<n>|dry-runs/<n> [--holdout <path>]`.
- **The wave's Docker test** (`e8f7fd2`): T3 in the baseline arm, the fake writing a binary file in step 1
  and the cancellation in step 2, a real `campaign run`, then a real `bench score`: `step 01 0/1, step 02
  1/1, final 1/1` — node:test and tsx really ran in the scoring image, and step 1 shows the oracle able to
  fail. Scored again: the same bytes. No `bench-score-` container left.
- **Tests use the real git for scoring** (the stored-run fixture and the rebuild): a double could not
  apply a patch or name a tree. Docker is the double (`scoringDocker`), which judges T3's hidden test from
  the snapshot copied into it, so the acceptance tests exercise the real rebuild.
- **T3's hidden test** moved from Vitest to `node:test`, importing the code under test inside the test
  (adr-004 decision 10); its literals are unchanged, so the leak-scan tests are too.
- **Documents:** adr-004 (the W6 scoring conventions), requirements **1.8** (`81bb91d`: REQ-RUN-05,
  REQ-FMT-06, REQ-CLI-06, REQ-SCO-01), the README's `bench score` (`68005e6`). adr-004, bug-007 and 1.8
  wait for the approver's decision at this task's review.

### Suites (at `68005e6`)

- `npm test`: **783 passed** (41 files); coverage 99.53% statements / 95.95% branches / 99.77% functions /
  99.94% lines; `src/scoring` 97% statements / 86% branches.
- `npm run test:bin`: 5 passed (the usage now lists `bench score`). `npm run test:docker`: **7 passed**
  (W6's new). `npm run lint`, `npx tsc --noEmit`, `npm run build`: clean. No `bench-*` container left.

### Traceability

`scoring.feature` @F4.1 (both scenarios) green in `test/acceptance/scoring.test.ts`. REQ-CLI-06,
REQ-SCO-01, REQ-SCO-02, REQ-SCO-03 (byte-identical `score.json`, no timestamp), REQ-FMT-06 (`score.json`
and `setup/` beside `run.json`), REQ-ARC-01 (the `scoring` module), REQ-ARC-02 (the lint rule, unchanged,
and `prepareWorkspace` moved down to keep it), REQ-ARC-04 (Docker and git through their ports). Nothing
was spent.

### Carried forward

- **task-028:** hold-out suites run through `runSuite` with their own census; `--holdout` is already
  checked by `bench score`.
- **W7 (F5.1):** how `not_reached` counts in aggregation; S-scenario oracles follow adr-004 decision 10.
- **W11 (F5.8):** the method page states adr-004's counting rules.
