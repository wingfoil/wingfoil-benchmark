---
id: task-028-hold-out-tests-in-scoring
type: task
title: "Hold-out tests in scoring"
status: approved
release: v0.1
wave: W6
features: [F3.5]
acceptance: [scenarios.feature]
requirements: [REQ-SCO-09, REQ-CLI-06, REQ-CLI-10, REQ-ARC-03]
---

## Context

Third task of wave **W6 — First scores** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It is
the **scoring half of F3.5**, which W4 left to W6: task-016 delivered the integration half (the
hold-out's path, its additions, never read by `campaign run`) and declared `features: []` so that the
task delivering this half declares F3.5 (rel-v0-1, W4's "Due before"). The W6 plan-phase decisions are
in [task-026](task-026-oracle-suites-per-step.md).

Scope:

- **`bench score … --holdout <path>`** (or `BENCH_HOLDOUT_PATH`, REQ-CLI-10) runs each scenario
  version's hold-out additions, read through task-016's `loadHoldoutAdditions`, on the run's snapshots,
  in the scoring container of task-027, mounted read-only like the public oracle.
- **Each addition belongs to a declared suite** (task-026: `<suite-id>/` in the hold-out) and scores
  the steps that suite scores.
- **Reported apart (REQ-SCO-09):** `score.json` keeps the hold-out's M-Q1 separate from the public one;
  neither is folded into the other.
- **Without a hold-out, scoring still works** and `score.json` states that hold-out additions were not
  scored, so a published score cannot be mistaken for one that includes them.
- **Never printed:** hold-out content, test names and failure messages stay out of stdout, stderr and
  any committed file; only counts and file paths are reported (REQ-FMT-08's rule, carried to scoring).

Left to the design phase: what `score.json` records of a hold-out failure given that its messages are
not published (counts only, or messages kept outside the repository); and how a scenario version with
`holdout: true` scored without a hold-out is flagged.

**Done** means: a run of a T-scenario with hold-out additions, scored with and without the hold-out,
gives the two results the acceptance names; no hold-out text reaches any output; tests, coverage and
lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F3.5 "Hold-out additions are used for scoring only". **red-first**
- `scenarios.feature` @F3.5 @error "A missing hold-out does not break scoring of public oracles".
  **red-first**
- REQ-SCO-09 — hold-out results stored apart from the public ones in `score.json`. **red-first**
- REQ-CLI-10 — `campaign run` still never reads the hold-out, from the option or the variable
  (task-016). **characterization**

## Design

**Classification confirmed:** as above. Everything below follows adr-004; what is new is where a
hold-out suite sits in the container, what may be said about it, and how its absence is recorded.

### A hold-out suite, and where it runs

The additions of a scenario version (`loadHoldoutAdditions`, task-016) are grouped by their first path
segment, the suite id (dl-001, validated since task-026). A suite with additions has a **hold-out
suite**: those files, run like a public suite — same image, same command, same bounds, same census on
the seed, same counting — in **a container of its own**, never together with the public suite, so that
neither result can be folded into the other (REQ-SCO-09).

In that container the hold-out suite's directory is mounted **read-only beside the public suite**, at
`/score/<suite dir>.holdout/` — the public `oracle/public/` gives `/score/oracle/public.holdout/` — and
the public suite is mounted at its own path too. A hold-out test is written as a sibling of the public
suite's files: the same depth, so its relative import of the code under test is the public tests' own
(`../../seed/src/orders.js`), and it may import the public suite's helpers (`../public/helpers.ts`).
Only the hold-out's test files run. Nothing of the hold-out is copied: it stays a read-only mount, and
leaves the container with it.

### What may be said about the hold-out

The rule of REQ-FMT-08, carried to scoring: **file paths and counts, never content, test names or
messages.** So:

- `score.json` records, per step and for the final snapshot, each hold-out suite's `passed` and `total`
  and their M-Q1 — **no `failed` list**. Messages are not kept anywhere: they are in the scoring
  container's output, which is parsed in memory and dropped (the first question the Context left).
- An oracle error in a hold-out suite (a file that fails to load on the seed, a repeated name, an unknown
  test on a snapshot) names the suite and, at most, the file — **never the test's name**; a container that
  exits unreadably is reported by its exit code alone, **without its stderr**, which a test could have
  written to.
- The command line prints counts only.

### Recording whether the hold-out was scored

`score.json` gains `holdout`, apart from `steps` and `final`:

```json
"holdout": { "scored": true, "hash": "sha256:…", "steps": [ … ], "final": { … } }
"holdout": { "scored": false, "reason": "not configured" }
```

- `hash` identifies the hold-out's version as `scenario_hash` identifies the public oracle's: the SHA-256
  of the additions' paths and bytes, by the scenario hash's rule (task-018). It says nothing of their
  content, and makes "scored twice with the same oracle version" checkable for the hold-out too
  (REQ-SCO-03).
- `steps` and `final` have the public ones' shape, without `failed`; a step not reached is
  `not_reached` there too.
- **Not scored**, with its reason (the second question the Context left): `not configured` — no
  `--holdout` and no `BENCH_HOLDOUT_PATH`; `none declared` — the scenario version declares `holdout:
  false`. A version that declares `holdout: true` scored without a hold-out gets `not configured`, and the
  command line adds **`hold-out not scored`** to its line, so it is seen, not only stored.
- A version that declares `holdout: true` while the configured hold-out has **no additions** for it, or
  one that declares `false` while it has some, is **refused**, as `bench scenario validate` refuses it
  (task-016): the run is not scored, and the command says why.

The command line's line gains the hold-out's final M-Q1: `…, final 1/1; hold-out final 1/2`, or `; hold-out
not scored`, or nothing for a version that declares none.

### Where the code goes

`scoring/holdout.ts`: the hold-out suites of a scenario version from its additions, and their hash.
`scoreRun` takes the hold-out as an optional input and scores its suites after the public ones, with the
same per-step and final rules; `runSuite` takes the hold-out directory as a second mount and a `private`
flag that drops stderr and test names from what it reports. `cli/score.ts` loads the additions per
scenario version, once. `campaign run` is not touched: it never reads the hold-out (REQ-CLI-10,
task-016's test stays green).

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `7f6178b`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W6 tasks of release v0.1` (`1551d03`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-028-hold-out-tests-in-scoring` → `3a11b5e`. Declared: `draft → pending`, required
  fields checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0,
  empty stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
- `npx wingfoil memory approve task-028-hold-out-tests-in-scoring --reason "…"`, run by the approver →
  `0e2c14a` (`pending → backlog`). Matches.
- Design committed by hand on `task/task-028-hold-out-tests-in-scoring`, then `npx wingfoil memory submit
  task-028-hold-out-tests-in-scoring` → `1dda77b`. Declared: `backlog → in-progress`, one commit. Observed:
  exit 0, empty stderr, 1 file, only `status` changed (N9). Matches. WIP after it: one `in-progress` (this
  one), none `in-review`.

### Build

Test-first: the unit tests of the hold-out's grouping and hash, of `runSuite`'s second mount and
confidential failure, of `scoreRun`'s hold-out results, and of the command were written and run red
(11, then 2) before the code (`74b992d`).

- `scoring/holdout.ts`: `holdoutSuites` groups the additions by suite id; `holdoutHash` by task-018's rule.
- `runSuite` takes `holdoutDir` — the public suite mounted as before, the additions at
  `<suite dir>.holdout/`, only their test files run — and `confidential`, which drops the container's
  stderr from a failure.
- `scoreRun` scores a **group** of suites: the public ones, then the hold-out's with `confidential` set,
  each group through the same per-step and final rules; the hold-out's tallies carry no `failed`, its
  census is keyed by the additions' hash, and its oracle errors name the suite and at most the file.
  `score.json` gains `holdout` (`scored`, `hash`, `steps`, `final`, or `scored: false` with its `reason`).
- `bench score`: the additions per scenario version from `--holdout` or `BENCH_HOLDOUT_PATH`; a version
  whose `holdout:` disagrees with them is not scored, with `bench scenario validate`'s words; the line
  ends `; hold-out final <p>/<t>`, `; hold-out not scored`, or nothing for a version that declares none.
- **The wave's Docker test** now scores T3 with a real hold-out: two `node:test` tests beside the public
  suite, importing the code under test by the public tests' own relative path. `hold-out final 1/2`
  (0/2 after step 1), and no hold-out test name in `score.json`. It first gave 1/2 after step 1: the
  test "refuses a second cancellation" passed on a snapshot without `cancel`, since calling `undefined`
  throws too — a flaw of the test written for it, fixed by asserting `cancel` is a function first, and
  the kind of oracle mistake the census cannot see.
- **adr-004 amendment 1** (`88b77c3`) records decisions 13–16: the hold-out suite, its place beside the
  public suite, counts only, and "not scored" said. It is a rule for the hold-out's authors in W7 and W8,
  so it waits for the approver's decision at this task's review.
- No requirement changes: REQ-SCO-09 is met as written, REQ-CLI-06 already names `--holdout`.

### Suites (at `88b77c3`)

- `npm test`: **798 passed** (43 files); coverage 99.49% statements / 95.9% branches / 100% functions /
  100% lines.
- `npm run test:bin` 5, `npm run test:docker` **7** (W6's with the hold-out), `npm run lint`, `npx tsc
  --noEmit`, `npm run build`: clean. No `bench-*` container left.

### Traceability

`scenarios.feature` @F3.5 "Hold-out additions are used for scoring only" and @F3.5 @error "A missing
hold-out does not break scoring of public oracles", green in `test/acceptance/scenarios.test.ts`. F3.5 is
declared here, as task-016 left it. REQ-SCO-09 (apart, in `score.json`), REQ-CLI-06 and REQ-CLI-10 (the
option and the variable), REQ-ARC-03 (additions under the suite ids). `campaign run` untouched: task-016's
test that it never reads the hold-out stays green. Nothing was spent.


### Review and approval

- `npx wingfoil memory submit task-028-hold-out-tests-in-scoring` → `e8a4632` (`in-progress → in-review`,
  one commit, only `status` changed). Matches.
- The approver accepted the five review points as proposed (2026-09-28): hold-out suites in containers of
  their own beside the public suite; counts only, no messages kept anywhere; the additions' hash; a
  version expecting a hold-out scored without one recorded `not configured`, not refused; mismatches not
  scored.
- `npx wingfoil memory approve task-028-hold-out-tests-in-scoring --reason "…"` → `e1d2802`, run by the
  approver (`in-review → approved`, `Approver:`/`Reason:` trailers, only `status` changed). Matches. It is
  adr-004 amendment 1's recorded review decision.
