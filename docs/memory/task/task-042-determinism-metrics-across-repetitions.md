---
id: task-042-determinism-metrics-across-repetitions
type: task
title: "Determinism metrics across repetitions"
status: backlog
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

- `scoring.feature` @F4.5 "Determinism is measured across repetitions": three repetitions of S1 in the
  wingfoil arm with the same pins give M-R1, M-R2 and M-R3 as defined, with no threshold applied.
- `scoring.feature` @F4.5 @error "Determinism is not computed from a single repetition": a group of one
  run gives no M-R value and states `n = 1`.
- REQ-SCO-07: a group whose runs do not share all pins gives no M-R value, and says which pins differ.
- M-R1 counts public hidden tests only; hold-out tests do not enter it (REQ-SCO-09).
- M-R2's public interface is extracted in the scoring container with the image's TypeScript
  (REQ-SCO-05), and `score.json` records it per run.
- M-R3 leaves out the setup's paths and generated files.
- A repetition whose final snapshot is not reached is treated as the design states.
- REQ-SCO-03: the same run scored twice gives the same `score.json` bytes, with the new keys.
- REQ-FMT-07: each M-R value in `aggregate.json` carries its runs and `n`. An older `score.json` without
  the new keys still aggregates.

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

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
