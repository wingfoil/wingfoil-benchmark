---
id: task-035-check-format-and-content-checks
type: task
title: "Check format and content checks"
status: in-progress
release: v0.1
wave: W8
features: []
acceptance: [scoring.feature, scenarios.feature]
requirements: [REQ-FMT-04, REQ-FMT-06, REQ-FMT-07, REQ-FMT-08, REQ-RUN-05, REQ-RES-06, REQ-SCO-01, REQ-SCO-03, REQ-SCO-06]
---

## Context

First task of wave **W8 — Continuity and governance** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
whose "Ends with" is "S3 and S8 scored". It delivers the first half of F4.8 (tool-neutral governance
metrics): **the format of a check and the content checks** of REQ-SCO-06. The feature is declared by
[task-037](task-037-directive-checks-and-tool-neutral-governance-metrics.md), which completes it (as
task-016/task-024 left a feature to the task that finishes it).

Today `oracle.checks` is a list of paths (`src/core/scenario.ts`) that nothing reads, and no requirement
says what a check file holds. S2@1.0 declares `checks: []`: the approver decided on 2026-09-29 (task-033,
a change to W7 decision 6) that **F4.8's task writes S2's two checks and their format into S2@1.0**. S2
is registered only after calibration (W7 decision 3), so that is not a new version.

Scope:

- **The check format**, one file per check under `oracle/`, outside every suite (the loader rule), with
  at least a kind, the steps it applies to, and its body. Two kinds here:
  - **`content`** — REQ-SCO-06 as written: case-insensitive patterns matched against the git-tracked
    text files changed in the step and the step's commit messages; never a harness's path or format;
  - **`unchanged`** — named files (or ranges) **of the seed** that must be byte-identical after a step.
    Seed paths are the scenario's, not a harness's, so it stays tool-neutral. It exists for S2's false
    report (S2.md §6: "the related code was not changed"), the approver's choice at W8 planning.
  - Room for task-037's AST and dependency kinds (REQ-SCO-05) without a format change; their bodies are
    task-037's.
- **The loader and the validator:** each check file parsed and validated (unknown kind, empty patterns,
  a step the scenario lacks, an `unchanged` path absent from the seed); the check files are oracle
  material for the leak scan (REQ-FMT-08) — every quoted string of 8+ characters in a check is an
  oracle literal, so patterns must not appear in prompts or seed.
- **Scoring:** `bench score` runs each check on its steps' snapshots, in the scoring container
  (REQ-SCO-01: read-only oracle, no network), deterministically (REQ-SCO-03); results in `score.json`
  per check and step, pass or fail with what matched (file or commit), never a hold-out name. A `not
  reached` step is reported as such. `score.json`'s version and task-034's reader schema follow.
- **Aggregation:** check results join `aggregate.json` in task-034's `Value {n, runs, …}` shape
  (REQ-FMT-07), per check.
- **S2's two checks** in `scenarios/S2/1.0/oracle/`: the duplicate (content, step 3) and the false
  report (unchanged, the related seed code). `bench scenario validate S2@1.0 --holdout …` stays green.
- **Requirements 1.12:** REQ-SCO-06 gains the file format and the `unchanged` kind; REQ-FMT-04 names the
  check file. A review decision recorded with the approver's reason.

Out of scope: AST and dependency checks, M-E1 (task-037); S3's D3 check (task-036 writes it in this
format); M-F1 (F4.7, W9 — W8 decision 3).

**Done** means: a check file is validated and scored per step into `score.json` and aggregated; S2@1.0
carries both checks and still validates and scores; requirements amended; tests, coverage, lint pass.

### W8 plan-phase decisions (proposed; accepted by the approver at pending → backlog)

1. **Four tasks, in this order, infrastructure just before its first use** (the approver's choice,
   2026-09-29): task-035 check format and content checks (with S2's two); task-036 S3 multi-session
   evolution scenario (F6.3), whose D3 revision is a content check; task-037 directive checks and M-E1
   (REQ-SCO-05, declares F4.8); task-038 S8 directive compliance scenario (F6.8). The wave's "Ends
   with" holds after task-038, and the wave check is made once, then.
2. **S2's false-report check is a second kind, `unchanged`**, on the seed's own paths (the approver's
   choice, 2026-09-29), rather than dropping it for the outcome half alone. REQ-SCO-06 is amended.
3. **W8 delivers the D3 content check, W9 computes M-F1** (the approver's choice, 2026-09-29). The
   `scoring.feature` @F4.8 scenario "Governance checks do not depend on a harness's format" is
   implemented on D3's content-check result in `score.json` — recorded in a WingFoil decision-log in
   one run, in a plain notes file in the other, consistent in both. M-F1 (outcome plus content, the
   share of D1–D5) is F4.7's, W9; the @F4.7 scenarios stay W9's.
4. **The content tasks follow `scenario-authoring`** from goal to validate, as W7's did. **`calibrate`
   and `register` are calibration's** (plan-003 step 3): S3@1.0 and S8@1.0 stay changeable until then.
5. **The wave check and the `scenarios.feature` outline run on the fake agent**, which replays each
   scenario's reference solution, in a temporary repository, as W7's did: S3 and S8 validated,
   dry-run and scored in the three arms, with M-E1 and the checks in `score.json` and the aggregate.
   **No real-agent half** (`real-agent-check` not taken) and **no spending in W8.** The fake replays
   the same commands in every arm, so S8's compliance difference between arms is not shown here: that is
   calibration's and the campaign's.
6. **Hold-out content** (S3's boundary tests and mixed overlap matrix; S8's functional edge cases and
   check variants) is written only in `WingFoil2-Benchmark-HoldOut`, under suite ids, as siblings of the
   public suites; this repository records counts and the hold-out commit. Reference solutions are
   public (S3's and S8's oracles are, unlike S2's answer key), in `test/fixtures/reference/`.
7. **What W7 learned applies to S3 and S8** (rel-v0-1, W7 "Due before"): no quoted oracle string that
   the API or the seed also uses; `scenarios/*/*/` outside prettier; Node 22's `--test` with a glob and
   native type stripping for a seed with no install; the local scoring double and `referenceScript`
   serve both; `READY` in the outline test gains S3 and S8.

## Acceptance criteria

Classification confirmed in the design phase, with the changes noted in the Design.

- REQ-SCO-06 as amended — a content check passes when every one of its groups has a pattern that
  occurs, case-insensitively, in the lines the step added to one text file, or in one commit message of
  the step; otherwise it fails. **red-first**
- REQ-SCO-06 as amended — an `unchanged` check fails when a declared seed region no longer occurs,
  line for line, in its file at the step. **red-first**
- REQ-SCO-06 / F4.8 — the same record in a WingFoil decision-log and in a plain notes file passes both;
  no path or harness format enters a check. **red-first**
- REQ-RUN-05 / REQ-FMT-06 as amended — each step stores the messages of the commits the agent and its
  harness made during it, scrubbed, in `steps/<NN>/commits.json`. **red-first** (added in the design)
- REQ-FMT-04 / REQ-FMT-08 — an invalid check file is refused by `bench scenario validate`, naming the
  file and the field; a content check that its own step's prompt satisfies is refused. **red-first**
  (changed in the design: patterns are not oracle literals, see "The leak scan")
- REQ-SCO-03 — scoring the same run twice gives the same `score.json` bytes with checks. **characterization**
- REQ-FMT-07 — each check's result in `aggregate.json`, per step, with its runs and `n`. **red-first**
- S2@1.0 validates with its two checks; the reference passes both, a step 3 that records nothing fails
  the duplicate, a step 2 that "fixes" shipping VAT fails the false report; `scenarios.feature` @F6.2
  stays green. **red-first** for the two failing variants, **characterization** for the rest

## Design

Four findings shaped this design, each against something the plan assumed:

- **No commit message of a step is stored.** A step keeps `diff.patch`, a diff between two trees
  (bug-007), and the runner's own `step <NN>` commit. The commits the agent or its harness made during
  the step are rebuilt as one commit by scoring, and their messages are gone. REQ-SCO-06 matches
  "the step's commit messages", so the runner has to record them first.
- **A file is too coarse for S2's false report.** The code behind it is `shippingVat` in
  `seed/src/tax.ts` lines 29–32, and its use in `seed/src/pricing.ts` lines 82 and 93–94. But step 1's
  real rounding defect is `lineVat`, in the same `tax.ts`, and step 2's stacking defect is in
  `pricing.ts` line 59. The reference changes both files and must pass, so `unchanged` works on
  regions of a seed file.
- **Check patterns cannot be oracle literals.** The words that name a revision or a duplicate are the
  prompt's own. S3's step 1 states "whole days", and S2's reports say "delivery". Under the
  literal rule every useful pattern would be a leak. The real risk is the reverse: an agent that pastes
  its prompt into a notes file passes the check. The validator checks for that instead.
- **Neither kind needs the scoring container.** REQ-SCO-01 isolates the execution of a snapshot's
  code. A check executes nothing. It reads the stored patch, the stored commit messages and the
  rebuilt snapshot's files as text. Checks therefore run in the scorer's own process, on the host, with
  no Docker call and no TypeScript. Task-037's `ast` kind is different: it does need the container.

### The check file (REQ-FMT-04, REQ-SCO-06 as amended)

`oracle.checks` stays a list of paths, so `scenario.yaml`'s schema does not change. Each path is a YAML
file under the version directory, outside every suite (the loader's existing overlap rule). Its **id is
its file name without `.yaml`**, in kebab case, and ids are unique within a scenario. `oracle/checks/` is
the convention, not a rule.

```yaml
# oracle/checks/duplicate.yaml
kind: content
steps: [3]
patterns:              # every group must match, in one file or one commit message
  - [already fixed, already been fixed, duplicate, same defect, fixed in step 1, previously fixed]
```

```yaml
# oracle/checks/false-report.yaml
kind: unchanged
steps: [2, 3]
regions:               # seed-relative file, 1-based inclusive line range, in the seed as it is
  - { file: src/tax.ts, lines: [29, 32] }
  - { file: src/pricing.ts, lines: [82, 82] }
  - { file: src/pricing.ts, lines: [93, 94] }
```

The actual pattern lists are settled in the build, against the reference and the leak checks below.
The ones above only show the shape.

A strict zod schema, discriminated on `kind`:

- **`content`:**
  - `patterns` is a non-empty list of non-empty groups of non-empty strings.
  - A **pattern is a plain substring, not a regular expression**. It is matched case-insensitively,
    after runs of whitespace are folded to one space on both sides. Anyone can check a substring by
    reading the file, and the validator's prompt check below compares like with like.
  - Groups exist because one list cannot tell a revision from a mention. After S3's step 4, "whole day"
    appears in any hourly-rental code, so D3 needs "whole day" *and* a word of revision in the same
    place. With a single group, the check is REQ-SCO-06 as written.
- **`unchanged`:** `regions` is a non-empty list of `{file, lines: [from, to]}`. `file` is a
  `relativePath` into the seed, and `1 ≤ from ≤ to`.
- **Both kinds:**
  - `steps` is a non-empty ascending list with no duplicates.
  - `kind` is an enum. Task-037 adds `ast` and `dependencies` as further members of the union. Adding
    a kind needs no format change.

The loader returns `Scenario.oracle.checks` as `readonly Check[]`, not as paths:
`{ id, file, kind: 'content', steps, patterns } | { id, file, kind: 'unchanged', steps, regions }`.
`file` is absolute, and each region's `file` is absolute into the seed. The only reader of the paths
today is `oracleFiles` in the leak scan, which reads `check.file`.

The loader's issues are reported on the check file, e.g. `oracle.checks[1] (false-report.yaml).regions[0].lines`.
They come after the existing path issues (the file must exist first):

- the YAML does not parse, or does not match the schema;
- a step the scenario lacks;
- two checks with the same id;
- a region whose file is not in the seed, or whose lines lie past the file's end;
- a content check whose **every group is matched by its own step's prompt**: `is satisfied by the text
  of prompts/03.md: an agent that copies its prompt would pass`. The check is on each step in
  `steps`. It is the check that matters here, where the leak scan does not apply.

### The leak scan

Check files leave `oracleFiles`' literal scan. They are YAML, not code, and the "quoted string"
heuristic says nothing about them: an unquoted pattern escapes it today, and a quoted one would flag
prompt vocabulary. The prompt check above replaces the literal scan for check files. The harness-name
scan of prompts is unchanged. A pattern *may* name a harness, e.g. `decision-log`, since the check reads
agent output and never a prompt. That does not make the check favour a harness: the decision-log run
and the notes-file run must both pass (@F4.8). This is recorded as a decision because it changes what
W7 was told about check files (task-033's note).

### Recording a step's commit messages (REQ-RUN-05, REQ-FMT-06 as amended)

`GitPort` gains `messagesSince(directory, from)`. It returns the full messages, oldest first, of the
commits reachable from `HEAD` and not from `from`, by `git log --reverse --format=%B%x00 <from>..HEAD`,
split on NUL, each with its trailing newline trimmed.

- In `runStep`, **before** the runner's own `step <NN>` commit, it runs from the previous snapshot's
  commit. That is the `setup` commit for step 1, and the previous `step <NN>` commit after that. These
  are commits, not trees; the runner keeps the id next to `previousTree`.
- The result is scrubbed like the patch and written to `steps/<NN>/commits.json` as
  `{ "messages": [ … ] }`, which is empty when the agent made no commit.
- It is committed with the other step files (REQ-RES-06 as amended). Runs of every arm record it, and a
  commit in the baseline arm counts as much as a harness's.
- The dry-run path goes through the same `runStep` (task-021), so dry runs record it too.

`StoredRun` reads `commits.json` per step. When it is missing, the run was stored before task-035, and
scoring does not guess: a scenario with a content check refuses such a run with
`run.json: was stored before steps recorded their commit messages (task-035)`, as task-027 refused
runs without trees. No stored run in this repository is affected. W7's wave-check runs lived in a
temporary repository.

### Scoring (`src/scoring/checks.ts`)

`scoreChecks(scenario, run, runDir, snapshots)` is pure over files, and deterministic (REQ-SCO-03).
For each check, in declaration order, and each of its steps:

- **Not reached** when the run has no snapshot of that step: `{ n, not_reached: true }`.
- **`content`:**
  - The candidates are the step's `diff.patch` and its commit messages:
    - For each text file the patch touches, the candidate is the lines it adds (`+`, not the `+++`
      header), joined. A binary patch (`GIT binary patch`) is skipped. A deleted file adds nothing.
    - Each commit message of `commits.json` is a candidate of its own.
  - **Added lines, not the whole file:** a seed README that already says "whole days" must not count
    as a record made at the step. A file the agent writes in full is all added lines anyway.
  - The check passes when some candidate matches every group. The result is
    `{ n, passed: true, where: { file: 'docs/notes.md' } | { commit: 2 } }`, where `commit` is the
    1-based position in `commits.json`. Otherwise it is `{ n, passed: false }`.
  - The path is the agent's own and is public in `diff.patch` already. It is recorded as evidence and
    never matched.
- **`unchanged`:** in the rebuilt snapshot of the step, each region's seed lines must occur as a
  contiguous run of lines of the same file, anywhere in it, so that line shifts from other fixes do not
  matter. The check passes when every region does. When it fails, the result names the first region
  that did not hold: `{ n, passed: false, region: 0 }`. Whitespace is exact: a reformatted line has
  changed.

`score.json` gains a top-level `checks` after `holdout`:
`[{ id, kind, steps: [{ n, passed, where? , region? } | { n, not_reached: true }] }]`.

- `SCORE_VERSION` stays 1: a key is added and no rule changes (adr-004).
- A scenario with no check writes `checks: []`.
- Checks are public only. The hold-out holds suites, never checks.
- The summary line adds `checks 2/2` (passed over scored, across checks and steps) when there are any.

### Aggregation (`src/results/aggregate.ts`)

- The reader's `scoreSchema` gains `checks`, **optional**, so that `score.json` files written before
  task-035 still aggregate, with no checks.
- `Group.metrics` gains `checks: [{ id, kind, steps: [{ step, passed: Value<Tally>, not_reached: string[] }] }]`.
  Each run's figure is `{passed: 1|0, total: 1}` for that check and step, the same `Tally` shape as
  M-Q1, so there is no ratio and no float.
- A check is listed when any run of the group has it.
- Losses (an expected failure, a final not reached) keep their check results, as they keep M-Q1
  (task-034 review).

### Requirements 1.12 (a review decision, recorded with the approver's reason)

- **REQ-SCO-06:**
  - a check is a YAML file of the oracle, named by its id, with a `kind` and its `steps`;
  - `content`: groups of case-insensitive substrings, every group matched in the lines added to one
    git-tracked text file in the step or in one of the step's commit messages;
  - `unchanged`: seed regions that must still occur, line for line, in their file at the step;
  - checks read text and run no code, so they run outside the scoring container;
  - a content check is refused when its step's prompt satisfies it.
- **REQ-FMT-04:** `oracle.checks` lists check files (REQ-SCO-06).
- **REQ-FMT-06, REQ-RES-06:** `steps/<NN>/commits.json`, committed.
- **REQ-FMT-08:** check files are exempt from the oracle-literal scan (REQ-SCO-06's prompt check
  instead).
- **Traceability:** unchanged. REQ-SCO-06 already traces to F4.7 and F4.8.

### S2's checks

- The two files above go into `scenarios/S2/1.0/oracle/checks/`, and `checks:` lists them. The comment
  in `scenario.yaml` goes.
- The reference (hold-out `reference/S2/03/`) must pass the duplicate check. If its step 3 records no
  recognition of the duplicate, the build adds a note to it in the hold-out repository, and its commit
  is recorded here. Its content is never recorded.
- Two variants are built in the tests, not stored:
  - a step 3 with no record, which fails the duplicate check;
  - a step 2 that zeroes shipping VAT, which fails the false-report check at step 2.
- S2 is not registered (W7 decision 3), so its hash changes with no new version.

### Tests

- **Unit, red first:**
  - `test/unit/scenario/checks.test.ts`: the schema, each loader issue, and the prompt check;
  - `test/unit/scoring/checks.test.ts`, content:
    - added lines against a pre-existing line;
    - groups in one candidate against groups split over two;
    - case and whitespace;
    - binary and deleted files;
    - commit messages;
  - `test/unit/scoring/checks.test.ts`, unchanged: a shifted region, an edited line, a missing file,
    not reached;
  - `messagesSince` against a real git repository;
  - `runStep` writing `commits.json`, scrubbed;
  - the scorer's `checks` key, and its determinism;
  - aggregation with and without `checks`.
- **@F4.8 format-neutrality**, at the unit level on a fixture scenario: the same revision recorded as a
  WingFoil decision-log under `.wingfoil/memory/…` in one run and as `NOTES.md` in another, both pass.
  The `scoring.feature` scenario itself, on S3, is task-037's (W8 decision 3).
- **Acceptance:** `scenarios.feature` @F6.2 green with S2's checks. `test/fixtures` scenarios with
  `checks: []` are unaffected.
- **Docker:** the W7 S2 test also asserts `checks` in `score.json`, since the checks run on the host
  during `bench score`.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `1afc426`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W8 tasks of release v0.1` (`b8df60c`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-035-check-format-and-content-checks` → `439777f`. Declared: `draft → pending`, required fields checked, one
  commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff limited to `status: draft` →
  `status: pending`. Matches (subject without transition: N9).
