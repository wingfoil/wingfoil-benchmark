---
id: task-042-determinism-metrics-across-repetitions
type: task
title: "Determinism metrics across repetitions"
status: approved
release: v0.1
wave: W10
features: [F4.5]
acceptance: [scoring.feature]
requirements: [REQ-SCO-03, REQ-SCO-05, REQ-SCO-07, REQ-SCO-09, REQ-FMT-07]
---

## Context

First task of wave **W10 — Determinism and findings** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
The wave's "Ends with" is "determinism measured, and a first finding note ready for WingFoil". This
task delivers **F4.5 determinism metric**, the wave's high-uncertainty feature, as experiment design §4.5
defines it operationally:

- **M-R1 outcome agreement:** the share of hidden tests that get the same verdict in every repetition;
- **M-R2 interface similarity:** the mean pairwise Jaccard similarity of the public interface (exported
  symbols and signatures, extracted by a scripted parser);
- **M-R3 structure similarity:** the mean pairwise Jaccard similarity of the set of file paths,
  excluding generated and harness files.

The three are reported separately, and no threshold of "substantially equivalent" is applied in v0.1
(experiment design §4.5): the first campaign produces the reference values. REQ-SCO-07 computes them only
for groups of n ≥ 2 runs sharing all pins; otherwise the result is `n = 1` and no value. In v0.1 only S1
has repetitions (3, sequencer decision 2).

What W8 and W9 left for this task (rel-v0-1, "Due before" of W8 and W9):

- **M-R1** can be read from `score.json` as it is: each public suite's total and its `failed` keys on the
  final snapshot, per repetition. The census is the same for one scenario version.
- **M-R2** can reuse the scoring image's parser (`docker/score-image/ast-checks.mjs`, W8, REQ-SCO-05), with
  the TypeScript it pins.
- **M-R3's "harness files"** can be the setup's paths, the ones M-Q2 already leaves out (task-041,
  `patchPaths` in `src/scoring/quality.ts`).

Scope:

- **Per run, in `score.json`:** what the aggregate needs to compare repetitions and cannot recompute
  without a container:
  - the final snapshot's public interface, as a sorted list of exported symbols with their signatures,
    extracted in the scoring container by the image's parser;
  - the final snapshot's file paths, less the setup's paths and less generated files (which paths count as
    generated is this task's design, and it is stated in the requirement).

  M-R1 needs nothing new: the verdicts are already there.
- **Per group, in `aggregate.json`:** M-R1, M-R2 and M-R3, each a `Value` with its runs and `n`
  (REQ-FMT-07), computed only when n ≥ 2 and every run shares all pins (REQ-SCO-07). Otherwise the group
  records `n = 1` (or the pins that differ) and no value.
- **Public tests only.** Hold-out tests stay counts (REQ-SCO-09) and do not enter M-R1, as they do not
  enter M-F1.
- **A final not reached** is this task's design: the repetition is either left out of the pairs, with the
  loss recorded, or it makes M-R not computable for the group. Either way, it is stated in the
  requirement and on the method page (W11).
- **Acceptance:** `scoring.feature` @F4.5 has two scenarios, "Determinism is measured across repetitions"
  and "Determinism is not computed from a single repetition". They get tests titled `@F4.5 <Scenario
  name>` (the traceability gate).
- Requirements are amended where the design makes them precise (REQ-SCO-05's M-R2, REQ-SCO-07), with a
  recorded review decision; adr-004 is amended if the image changes.

Out of scope:

- Determinism across agents: from v0.2, once a second agent exists (experiment design §4.5).
- A threshold of equivalence: after the first campaign.
- M-R on the site and the method page: W11.

**Done** means:

- M-R1, M-R2 and M-R3 are in `aggregate.json` for every group of n ≥ 2 sharing all pins, and every other
  group states `n = 1`.
- The two @F4.5 scenarios are green.
- Tests, coverage and lint pass.

### W10 plan-phase decisions (proposed; accepted by the approver at pending → backlog)

1. **Three tasks, one per feature, in this order** (the approver's choice, 2026-09-29):
   - task-042, F4.5, M-R1–M-R3;
   - [task-043](task-043-run-detail-and-side-by-side-comparison.md), F5.3, `bench run show` and
     `bench run compare`;
   - [task-044](task-044-finding-note-export.md), F5.4, `bench finding`.

   F4.5 goes first: it is the wave's high-uncertainty feature and its highest value. F5.3 precedes F5.4
   because a finding note links to the run details (REQ-RES-05). M-R2 stays in this task, with the
   image's parser; no spike: experiment design §4.5 is precise enough, and what it leaves open is design.
   The wave's "Ends with" holds after task-044, and the wave check is made once, then.
2. **The wave check is offline, with a declared synthetic execution** (the approver's choice,
   2026-09-29), as W9's:
   - execution 1 runs on main's built CLI, in a temporary repository, with the fake agent replaying each
     reference: S1 with 3 repetitions, S2 with 1, in the three arms. The fake is keyed by scenario and
     step, not by repetition, so its repetitions are identical: M-R1, M-R2 and M-R3 are 1, and S2 states
     `n = 1`;
   - execution 2 is a copy of the stored runs, declared synthetic: one S1 repetition is altered before
     `bench score` (a failing hidden test, a changed export, an extra file), so that each M-R shows a
     value below 1 and the pairwise mean can be checked by hand;
   - the first finding note (task-044) is written from execution 2 and marked synthetic in the wave's
     record. It is not handed to WingFoil: the first real one comes from calibration or the reference
     campaign;
   - there is no real-agent half (`real-agent-check` is not taken) and no spending in W10.
3. **The run detail is text on standard output** (the approver's choice, 2026-09-29): REQ-CLI-08 as
   written. A finding note links run paths and the `bench run show` command that opens them; links to
   site pages come with the site (W11). The rejected alternative was a static HTML page per run.
4. **No scoring rule changes, so `SCORE_VERSION` and `aggregate_version` stay 1.** The new values are new
   keys, optional in the aggregate's reader schema, so older score files still aggregate (and give no
   M-R2 or M-R3). A changed rule raises the version and is recorded in adr-004.
5. **The scoring image changes at most once in W10, here**, and only if the public-interface extraction
   needs more than `ast-checks.mjs` has: pinned as in task-037 and task-041 (package, lockfile, COPY,
   `ScoringImage`, `score.json`'s `scorer`, the local scoring double). task-043 and task-044 read stored
   files only.
6. **What W8 and W9 learned applies here:**
   - never run `npm test` and `npm run test:docker` at the same time;
   - oracle `.mts` files are linted;
   - scoring time: 7 min 42 s for 12 runs in W9. The wave check has 12 runs again (S1 × 3 and S2 × 1 in
     three arms), scored twice;
   - after a merge that changes dependencies, main needs `npm ci` and `npm run build` before the wave
     check;
   - if the image changes: no file in `docker/score-image/` is named `eslint.config.*` (ESLint takes the
     nearest config); a new tool is pinned at the same version in the image's `package.json` and in the
     repository's devDependencies, and mapped in `test/support/local-scoring.ts`; the W6 Docker test
     asserts `scorer` exactly;
   - the next scoring requirement id is REQ-SCO-13 (REQ-SCO-11 was retired in 1.1); requirements are at
     1.16, adr-004 at amendment 3;
   - W9's wave-check scripts (merged reference script, synthetic rewrite, summary) are the model for
     W10's (W9 session handover, 2026-09-29).

## Acceptance criteria

Classified in the design phase.

- `scoring.feature` @F4.5 "Determinism is measured across repetitions": three stored repetitions of S1 in
  the wingfoil arm (the reference, and two variants: one with a failing hidden test and a changed export,
  one with an extra file), scored through the local scoring double and aggregated, give M-R1, M-R2 and
  M-R3 as defined, with their pairs, and no threshold. **red-first**
- `scoring.feature` @F4.5 @error "Determinism is not computed from a single repetition": S2's single run
  gives a group whose `m_r` is `{ n: 1 }` with no value, and `bench score`'s aggregate line says
  `n = 1`. **red-first**
- REQ-SCO-07 as amended: a group whose runs differ in a compared pin (scenario hash, harness commit,
  scorer) gives no M-R value and names the pins that differ. **red-first**
- M-R1 counts the public hidden tests of the final snapshot only; hold-out tests do not enter it
  (REQ-SCO-09). **red-first**
- M-R2's interface is extracted in the scoring container by the image's `interface.mjs`, with the
  TypeScript it pins (REQ-SCO-05), and `score.json` records it per run under `determinism`. **red-first**
- M-R3's paths leave out the setup's paths and the generated paths the requirement lists. **red-first**
- A repetition whose final snapshot is not reached is left out of every M-R and listed; fewer than two
  reached repetitions give no value. **red-first**
- REQ-SCO-03: the same run scored twice gives the same `score.json` bytes, with the new key; the same
  execution aggregated twice gives the same `aggregate.json`. **characterization**
- REQ-FMT-07: each M-R value in `aggregate.json` carries its runs and `n`. An older `score.json` without
  `determinism` still aggregates, and its group gets no M-R2 or M-R3. **red-first** (the reader's new
  optional key) / **characterization** (older files)
- The scoring image's new tag is recorded in `score.json`'s `scorer`; the W6 Docker test asserts it.
  **characterization**

## Design

A spike (2026-09-29, in the scratchpad, TypeScript 6.0.3 as the image pins) settled how M-R2 reads a
signature without a type checker: each exported declaration, with its bodies and initializers removed,
printed by the compiler's own printer with comments removed and whitespace collapsed. It gives, for
example, `export function apply<T>(doc: T, ops: Op[] = []): T;` and `export class Patch { constructor(x:
number); run(a: number): void; static of(): Patch; }`. No program, no tsconfig: the snapshot need not
compile. A `const` whose value is a function literal needs one extra step: its parameters and return
type are taken from the literal, or the printer gives only `export const get;`.

Three findings shaped the rest:

- **Every pin but three is the campaign's, so it is the same for every run of one execution.** The
  run image, the harnesses' pins, the agent, the approver policy, the caps and the currency are copied
  once per execution (`RunPins`, `src/runner/run.ts`). What can differ between two runs of one group is
  what each run records for itself: `run.json`'s `scenario_hash` and the harness commit, and
  `score.json`'s `scorer` (a run scored again by a later image). Those are the pins REQ-SCO-07 compares.
- **A snapshot is exactly a git tree** (`rebuildSnapshots`, task-027): git-ignored files are never in
  it. So "generated" files are only those an agent commits: a lockfile, a build or coverage directory.
- **The aggregate never runs a container.** Whatever M-R2 and M-R3 read from a snapshot has to be in
  `score.json`. M-R1's verdicts already are: `final.suites[].{total, failed}`, with the census the same
  for one scenario version.

### Per run: `determinism` in `score.json`

Written after `m_q2`, on the final snapshot:

```json
"determinism": {
  "interface": ["src/patch.ts: export function apply<T>(doc: T, ops: Op[] = []): T;", "…"],
  "paths": ["README.md", "package.json", "src/patch.ts", "…"]
}
```

or `{ "not_reached": true }` when the final snapshot is not reached. Both lists are sorted by code unit
and hold no duplicates.

- **`paths` (M-R3):** every file of the final snapshot, less every path the setup's patch touches (the
  harness's files, task-041's rule, `patchPaths`), less the **generated paths**: anything under
  `node_modules/`, `dist/`, `build/`, `coverage/`; `*.tsbuildinfo`; and the lockfiles
  `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`. Computed on the host, from
  the rebuilt snapshot.
- **`interface` (M-R2):** one entry per exported declaration of the source files of the final snapshot,
  as `<file>: <signature>`. Source files are the ones `ast-checks.mjs` reads (`.ts .tsx .mts .cts`, not
  `.d.ts`, not tests, not under `node_modules/`), and among them only those in `paths`. What is an entry:
  - an exported function, class, interface, type alias, enum or variable statement, and
    `export default`: its signature as above. A class keeps its members that are not `private` or
    `#private`, each without its body. Overloads are one entry each;
  - `export { a as b } from '…'`, `export * from '…'` and `export { a }`: the statement as printed.

  A file that does not parse gives the entry `<file>: (does not parse)`, so two repetitions that both
  fail agree, and one that fails differs.

### The scoring image (REQ-SCO-01, REQ-SCO-05; adr-004 amendment 4)

- **`interface.mjs`** (new), beside `ast-checks.mjs`: `node interface.mjs <snapshot> '<files as JSON>'`
  prints the sorted entries, one JSON string per line. It uses only TypeScript, which the image already
  pins: **no new package**. The Dockerfile's COPY gains the file, so the image's tag changes (the tag is
  the directory's SHA-256).
- **`src/scoring/interface.ts`** (new), like `ast.ts`: `interfaceInContainer`, one scoring container per
  run, no mount, no network, `timeout 300`; an exit other than 0 is an oracle error.
- The local scoring double maps `/opt/score/interface.mjs`.

### Per group: `m_r` in `aggregate.json`

Each group gets `m_r`, computed by a pure function of its scored runs, as `breakEven` is:

- **Fewer than two reached runs:** `{ "n": 1 }`, or `{ "n": 0 }` when none reached, with `runs` and
  `not_reached`. No value. `bench score`'s aggregate line counts such groups as `n = 1`.
- **Pins that differ:** `{ "n": …, "runs": […], "pins_differ": ["scenario_hash" | "harness_commit" |
  "scorer"] }`. No value.
- **Otherwise:**

  ```json
  "m_r": {
    "n": 3, "runs": ["…/r1", "…/r2", "…/r3"], "not_reached": [],
    "m_r1": { "agree": 131, "total": 135 },
    "m_r2": { "mean": 0.8667, "pairs": [{ "runs": ["…/r1", "…/r2"], "intersection": 13, "union": 15 }, …] },
    "m_r3": { "mean": 0.9524, "pairs": [ … ] }
  }
  ```

  - **M-R1:** over the public census of the final snapshot, the tests whose verdict is the same in every
    reached run. `agree` and `total` are integers.
  - **M-R2 and M-R3:** for each pair of reached runs, in run order, the Jaccard similarity of their
    `interface` (or `paths`) sets as integers; `mean` is the mean of the pairs' ratios, rounded to 4
    decimals. Two empty sets are similar (1). A run without `determinism` (an older `score.json`) makes
    M-R2 and M-R3 absent for its group, never 0.
- No threshold, no composite. `aggregate_version` stays 1: `m_r` is a new key (W10 decision 4).

### Modules

- `docker/score-image/`: `interface.mjs` (new), `Dockerfile` (COPY).
- `src/scoring/interface.ts` (new): the runner and the parse of its lines. `src/scoring/determinism.ts`
  (new): `determinismPaths(snapshot, setupPatch)`, pure. `src/scoring/score.ts`: `determinism`.
- `src/results/aggregate.ts`: the reader's optional `determinism`, `m_r` per group.
- `src/cli/score.ts`: the aggregate line counts groups with M-R and groups at `n = 1`.
- `test/support/local-scoring.ts`: `/opt/score/interface.mjs`.
- Tests:
  - unit tests of `interface.mjs` (through the local double), `determinismPaths`, the parse,
    `score.json`, and `m_r` (pairs, means, `n = 1`, pins that differ, not reached, older files);
  - `scoring.feature` @F4.5 ×2 on S1's reference and variants, and on S2;
  - the Docker suite: the W6 test's `scorer`, and one real-image check of `interface.mjs` on S1's
    reference.

### Requirements 1.17 and adr-004 amendment 4

- **REQ-SCO-05:** M-R2's interface: the entries above, syntactic, from the image's TypeScript.
- **REQ-SCO-07:** the pins compared, a final not reached left out, pairs and means, M-R3's generated
  paths and the setup's paths left out.
- **adr-004 amendment 4:** `interface.mjs` in the image, and its container's bounds.

### For the wave check (W10 decision 2)

`rebuildSnapshots` compares every commit's tree with the one `run.json` records. The synthetic
repetition of execution 2 therefore needs its altered step patch **and** that step's recorded tree
rewritten, and every later step's tree, or scoring refuses it. The simplest alteration is on the last
step only.

### Choices to confirm

1. **An interface entry is `<file>: <signature>`, read from syntax.** The module a symbol is imported from
   is part of how it is used, and the signature is what is written, without a type checker, so a
   snapshot that does not compile still has an interface.
   - *Alternative:* entries without the file (a symbol moved to another file is the same interface).
     Moves would then count only in M-R3.
   - *Alternative:* types inferred by a type checker. That needs a program and a tsconfig, is slower, and
     reads nothing when the code does not compile.
2. **M-R2 and M-R3 read the whole final snapshot**, less the setup's paths and the generated paths, not
   only the files the run changed. A file one repetition deleted and another kept is then a difference.
   The seed's files, common to all, raise the similarity; the method page (W11) says so.
   - *Alternative:* only M-Q2's measured files, which are what the run added or changed. That is the
     agent's own contribution, but a deletion is not seen.
3. **A repetition whose final is not reached is left out of every M-R and listed** in `not_reached`; the
   group's `n` counts the runs compared. The loss is already published in the group's `losses`.
   - *Alternative:* count it in M-R1 with every test failing. It makes M-R1 lower, but M-R2 and M-R3 have
     no snapshot to read, so the three would count different runs.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

### Build

Commits on `task/task-042-determinism-metrics-across-repetitions`:

- `94bf7e0` `test(scoring)` (red):
  - `m_r` in the aggregate: the pairs and means, `n = 1`, a final not reached, pins that differ, two
    empty sets, and older score files;
  - `interface.mjs` run on this machine;
  - `determinismPaths`, `interfaceFiles` and `parseInterface`;
  - `determinism` in `score.json`, and the interface's container;
  - `scoring.feature` @F4.5 ×2 on S1's reference and variants, and on S2;
  - the aggregate line's determinism counts;
  - the Docker suite's S8 test through the real image.
- `7169551` `feat(scoring)`: the implementation. It also holds two tests the first coverage run asked
  for (`interface.ts` at 89%): `interfaceInContainer`'s error path, and a line that is not JSON.
- `b4a6d52` `docs(docker)`: the image's header comment.
- `2658d6b` `docs(requirements)`: requirements 1.17 and adr-004 amendment 4.

**Deviations from the Design:**

1. **`bench score`'s aggregate line** reads `(<groups>, <slices>; determinism measured in <k>, n = 1 in
   <m>)`, and adds `, pins differ in <p>` only when some group's pins differ. A group of no reached run
   counts as `n = 1`. The Design said only that the line counts them. Four existing expectations of the
   line were updated: `cli/score.test.ts` ×3, `results.feature` @F5.1, and the W6 Docker test.
2. **`interface.mjs` drops `private` from a constructor's parameters**, since the parameter is public
   and the property it makes is not. It gives `constructor(readonly x: number)`, as the Design's example
   has it. The spike's printer kept `private`.
3. **A default export of an expression that is not a name** is the entry `export default …;`. The
   expression can be a whole object literal, which is a value, not a signature.
4. **`storedRun` copies a scenario the repository lacks, even with `into`**, so that S1's three
   repetitions and S2's run share one execution.
5. **Existing tests that described every scoring container were updated**, as in task-041:
   - @F4.1: M-R2's container mounts no oracle;
   - `score.test.ts`: one more container in the census-and-steps test, `determinism` in the key order,
     and in the summary tests' `ScoreFile` literals.

`quality.ts` now exports `filesUnder` and `patchPaths`, which `determinism.ts` reuses. The helper
`canonicalJson` of `core` compares the `scorer` pins.

**Checks:**

- `npm run typecheck` clean, and `npm run lint` clean: ESLint and Prettier.
- `npm test`: 1031/1031, coverage 99.01% (`determinism.ts` and `interface.ts` 100% of lines).
- `interface.mjs` on the host (`interface-script.test.ts`): 4/4.
  - the signatures of functions, classes, variables, interfaces, types and enums;
  - re-exports, default exports and overloads, sorted and without duplicates;
  - a file that does not parse;
  - the same entries for the same code in another layout.
- `npm run test:bin`: 5/5.
- `scoring.feature` @F4.5 through the local double, in one execution: S1 × 3 in the wingfoil arm and
  S2 × 1. r2's merge patch keeps nulls behind a new parameter, and r3 adds a notes file and a lockfile.
  - M-R1 is the census less r2's failing tests;
  - M-R2 has the pairs `(k−1)/(k+1)`, `k/k` and `(k−1)/(k+1)`, `k` being the reference's entries;
  - M-R3 differs by r3's notes only: the lockfile and `CLAUDE.md` are left out;
  - the keys are `n`, `runs`, `not_reached`, `m_r1`, `m_r2` and `m_r3`, with no threshold;
  - S2's group is `{ n: 1 }` with no value, and the line says `n = 1 in 1`.
- `npm run test:docker`: 16/16 in 843 s, the new image built on its first use. The S8 test in the
  three arms reads a non-empty interface through the real image's `interface.mjs`, with no file that
  does not parse, and paths without `.wingfoil/` or `CLAUDE.md`. The W6 test's `scorer` is unchanged,
  as no package was added. No `bench-` container is left.

### Review

- **Traceability.**
  - `features: [F4.5]`: both @F4.5 scenarios have their tests, and `traceability.test.ts` is green.
  - `acceptance: [scoring.feature]`.
  - `requirements`:
    - REQ-SCO-05 and REQ-SCO-07 are amended (1.17);
    - REQ-SCO-09: hold-out tests stay out of M-R1, which reads only the public suites;
    - REQ-SCO-03: the interface's entries and the paths are sorted, and the same code in another layout
      gives the same entries;
    - REQ-FMT-07: each M-R value has its runs and `n`, and older score files still aggregate.
- **W10 decisions held.**
  - Decision 4: `SCORE_VERSION` and `AGGREGATE_VERSION` stay 1, since `determinism` and `m_r` are new
    keys.
  - Decision 5: the image changed only here, with no new package (twice within the task, the second
    time for the review's fix).
  - The three design choices the approver confirmed: an entry names its file, the whole final snapshot
    is read, and a final not reached is left out and listed.
- **For the wave check (decision 2):** the synthetic repetition needs its altered step patch **and**
  its recorded trees rewritten, or `rebuildSnapshots` refuses it (Design, "For the wave check").
- **A note for calibration.** M-R3's generated paths include any `build/`, `dist/` or `coverage/`
  directory at any depth, so a hand-written `src/build/` is left out too. REQ-SCO-07 lists them; the
  first real runs show whether the list needs a change, which would be a rule change.
- **For the approver's review decision:** requirements 1.17 (REQ-SCO-05, REQ-SCO-07) and adr-004
  amendment 4.
- **For W11 (F5.8), the method page states:**
  - M-R2 read from syntax, an entry naming its file, what an entry is;
  - M-R3's paths, the setup's and the generated ones left out, and that the seed's files raise the
    similarity;
  - the runs compared, and that a final not reached is left out;
  - the pins compared, and that no threshold is applied.
- No new bug and no new decision-log. No WingFoil usage note. No spending.
- **This first review was the building session's own.** The three independent reviews and their
  fixes follow, below.
- Build notes committed by hand (`1719181`), then `node_modules/.bin/wingfoil memory submit
  task-042-determinism-metrics-across-repetitions` in the worktree → `345fb12`.
  - Declared: `in-progress → in-review`, one commit `wf(task): submit <id>`.
  - Observed: exit 0, 1 file, and a diff limited to `status: in-progress` → `status: in-review`.
    Matches.

### Independent review and send-back

The first review above was the building session's own. Before approving, the approver asked whether
an independent agent had reviewed the work; none had. A fresh agent then reviewed the branch
read-only, against the Design, requirements 1.17 and @F4.5. It found no error in the M-R arithmetic,
the pins, a final not reached, or older score files. It found:

1. **An error in `interface.mjs`, from deviation 2 of the build.** Removing only `private` from
   `constructor(private readonly x: number)` left `readonly x`, which declares a *public* property. Two
   different interfaces then gave the same entry.
2. **Namespaces recorded by name only:** their exported members were lost, and `A.B` printed as `A`.
3. **Entries added or thinned:**
   - an overload's implementation was an entry of its own, although TypeScript hides it;
   - `as T`, `satisfies`, a class expression and a default-exported arrow each lost their signature.
4. **Missing tests:**
   - the scenario hash as a differing pin;
   - a group mixing older and newer score files;
   - the line's `pins differ` suffix;
   - @error's S2 in the baseline arm, where the Gherkin says wingfoil.
5. **For the approver:** harness files written *during the steps* count in M-R3. The approver chose on
   2026-09-29 to keep the approved rule (the setup's paths only, tool-neutral). The W11 method page
   states it, and calibration checks it on real runs.
6. **Known and shared with M-Q2 since task-041:**
   - `filesUnder` follows symlinks;
   - `patchPaths` misses an unquoted path with a space;
   - the file list is one argument.

   None is new here. They are listed for calibration, which runs real agents.

The approver sent the task back (`92c449a`, `in-review → in-progress`). Then:

- `179d981` `test(scoring)` (red): 5 `interface.mjs` tests failing. The tests of item 4 passed at once:
  the code was right, the tests were missing.
- `9b4266a` `fix(scoring)`: `interface.mjs`.
  - A private parameter property loses `private`, `readonly` and `override`.
  - A namespace keeps its exported members, recursively.
  - An overload's implementation is left out, among functions and class methods alike.
  - A value is unwrapped from parentheses and `satisfies`, and read if it is a function or a class. A
    value asserted `as T` has the type T.
  - A default export of a function or class literal is read the same way.
- `c5366e4` `docs(requirements)`: REQ-SCO-05 (1.17) names those rules.

**Second independent review, of the fix alone** (`92c449a..c5366e4`), by another fresh agent. It
found errors in the fix:

1. **A regression.** Overloads were keyed by name alone, so a static member and an instance member of
   the same name made one overload set. `static create(a: string)` with its implementation hid the
   instance method `create()`, and a `static m()` beside `abstract m()` was hidden the same way.
2. **An overloaded constructor's implementation** was still an entry.
3. **An ambient namespace** (`declare namespace`) lost every member, since its members are exported
   without the keyword.
4. **A quoted name and a plain one** (`'m'` and `m`) were two names.
5. **`as T` was not read** behind `satisfies` or on a default export.
6. **A non-exported overload set with an exported implementation** gives no entry. TypeScript rejects
   that code (TS2383), so it is left as it is.

Its first run of `test:docker` was stopped part-way: the image had changed under it. Then:

- `8d2fefe` `test(scoring)` (red): 4 `interface.mjs` tests failing.
- `8392513` `fix(scoring)`:
  - overloads are keyed by the name's value and by static-ness;
  - constructors count as overloadable;
  - an `ambient` flag keeps every member of a `declare` namespace, nested ones included;
  - `asserted` looks through `satisfies`, and a default export with an asserted type prints
    `export default … as T;`.
- `ee6f2be` `docs(requirements)`: REQ-SCO-05 (1.17) names constructors, static members and ambient
  namespaces.

**Third independent review, of `8392513` alone**, by a third fresh agent. It checked the static
keys, constructors in class expressions, `export declare class`, nested ambient namespaces, the flag
not leaking into class members or regular namespaces, and six assertion forms. It found:

1. **A regression of `8392513`.** A constructor has no name, so it was keyed `default`, like a method
   named `default`. One then hid the other:
   `constructor(a: string); constructor(a: any) {} default() {…}` lost `default()`.
2. **An ambient namespace holding `export {}`** exports only what it names (TypeScript's binder), but
   its other members were kept.
3. **Key text that can collide:**
   - a method literally named `'static foo'` against a static `foo`;
   - `['foo']` against `foo`;
   - spacing inside computed keys.

   These are contrived and never crash, so they are left as they are.

Then:

- `2ff4fff` `test(scoring)` (red): 2 tests failing;
- `f2a688c` `fix(scoring)`: a constructor's key is `constructor`, which no method can be named, and a
  block that declares its exports turns the ambient flag off;
- `52ee93d` `docs(requirements)`: REQ-SCO-05 (1.17) names that last rule.

The third fix is two small rules, each with its test. A fourth review is not made; that is the
approver's call.

**Checks after the fixes:**

- `npm test`: 1043/1043, coverage 99.01%;
- `interface-script.test.ts`: 13/13;
- lint and typecheck clean;
- `npm run test:docker` on the final image (`52ee93d`): 16/16 in 393 s. S8 in the three arms reads its
  interface through the real `interface.mjs`, and no `bench-` container is left. Two earlier runs were
  stopped part-way, because the image changed under them; their containers were removed.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` for task-042 (`921cb08`), task-043 (`f2abfd6`) and
  task-044 (`3c336ad`).
  - Declared: one commit `wf(task): add <id>`, and one new file from the template with `status:
    draft`. The id is `task-{n}-{slug}`.
  - Observed: exit 0 each time, and exactly that commit with 1 file. Matches.
- Content filled and committed by hand in `docs(task): scope the W10 tasks of release v0.1` (`12970d2`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit <id>` for task-042 (`f5b6f90`), task-043 (`83ae055`) and task-044
  (`dad336b`).
  - Declared: `draft → pending`, required fields checked, one commit `wf(task): submit <id>`.
  - Observed: exit 0 each time, 1 file, and a diff limited to `status: draft` → `status: pending`.
    Matches (the subject names no transition: N9).
- `node_modules/.bin/wingfoil memory submit task-042-determinism-metrics-across-repetitions` (`f71c04c`),
  in the worktree of branch `task/task-042-determinism-metrics-across-repetitions`.
  - Declared: `backlog → in-progress`, one commit `wf(task): submit <id>`.
  - Observed: exit 0, 1 file, a diff limited to `status: backlog` → `status: in-progress`. Matches.
- `memory reject … [in-review → in-progress]` → `92c449a`, run by the approver in the task's worktree.
  - Declared: `in-review → in-progress`, one commit with `Approver:` and `Reason:` lines.
  - Observed: that commit, which also added a `rejection_reason:` field to the front matter.
- After the fixes, the notes were committed by hand (`a3c7171`), then `node_modules/.bin/wingfoil memory
  submit task-042-determinism-metrics-across-repetitions` → `ae03625`.
  - Declared: `in-progress → in-review`, one commit `wf(task): submit <id>`.
  - Observed: exit 0 and 1 file. The diff also **removes the `rejection_reason:` field**, not only the
    status. `memory history` still shows the reject with its approver and reason, so nothing is lost
    from the trail; the field reads as "an open rejection". It matches, with that side effect noted.
