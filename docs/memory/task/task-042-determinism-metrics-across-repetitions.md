---
id: task-042-determinism-metrics-across-repetitions
type: task
title: "Determinism metrics across repetitions"
status: in-progress
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
