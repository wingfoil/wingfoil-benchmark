---
id: task-067-docs-control-per-harness-and-harness-against-its-control
type: task
title: "Docs control per harness and harness against its control"
status: approved
release: v0.2
wave: W12
features: [F7.1]
acceptance:
  - "competitors.feature#Each harness has its own docs control"
  - "competitors.feature#Every harness arm's setup is published"
requirements: [REQ-RUN-11, REQ-FMT-05, REQ-RES-09]
---

## Context

F7.1's docs controls ([rel-v0-2](../release/rel-v0-2.md), W12): the approver chose a docs control per harness at the triage (T3).

**Received from task-066 (2026-10-06):** this task also delivers `competitors.feature`'s "Every harness arm's setup is
published" (REQ-RES-09's setup half: each harness arm's page, which shows what its docs control renders, and states
that the shared git identity carries no approval authority in a competitor arm, and the speckit bundle's resolution
of its dependencies at build time), alongside "Each harness has its own docs control". "A scenario's project rules
reach every arm" waits for W13's OpenSpec arm. List the scenarios in `acceptance` as `competitors.feature#<title>`
(traceability per scenario, task-064).

**Scope:**

- one docs generator per harness (REQ-RUN-11): `baseline-docs` unchanged, `speckit-docs` new (`openspec-docs` comes
  with the OpenSpec arm in W13), each declaring what it renders and why, its output's digest in `run.json`;
- `docs_of` in arm definitions (REQ-FMT-05);
- **each harness compared with its own docs control** in the aggregate (REQ-SCO-14) and on the category pages
  (REQ-RES-03 as amended in 1.26); older aggregates read "not measured".

**No real agent, no spending.** **Done** means: `competitors.feature`'s docs-control outline green for wingfoil and
speckit; W12's "Ends with" ("Spec Kit runs S1–S3 and S8 under the same rules") checked with the fake agent; a
real-agent half decided in W12's plan phase.

## Acceptance criteria

- `competitors.feature` @F7.1 "Each harness has its own docs control" for baseline-docs and speckit-docs.
  **Red-first.**
- The aggregate and the category page hold each harness against its control. **Red-first.**

## Design

### Scope, as the approver split it (chat, 2026-10-06: "Dividere")

This task delivers the **speckit-docs control** (its generator, its arm, `docs_of` honoured by the runner for any
docs control) and the **harness setup pages** received from task-066 (REQ-RES-09's setup half). The comparison of each
harness with its control in the aggregate and on the category pages (REQ-SCO-14, REQ-RES-03) is
[task-068](task-068-each-harness-against-its-own-docs-control.md), W13 (`pending`). The Context's scope bullet on it, and
its acceptance criterion, are therefore not this task's; REQ-SCO-14 and REQ-RES-03 leave this task's requirements,
REQ-RES-09 joins them.

Scenarios (traceability per scenario): **Each harness has its own docs control** — its wingfoil and speckit rows;
openspec's comes with W13's arm — and **Every harness arm's setup is published** — for the harness arms that exist.
Both red-first.

### One docs generator per harness (REQ-RUN-11 as amended)

`src/arms/docs-controls.ts`, a registry by the source arm's tool, each entry a pure function of the source arm's
configuration as captured by running its setup, and of the scenario, with its declaration:

| Tool | Kept from the capture | Renders | Leaves out |
|---|---|---|---|
| wingfoil | `.wingfoil/`, `docs/memory/` | baseline-docs' `renderProjectRules`, unchanged | as today (settings, workflows' mechanics …) |
| speckit | `.specify/memory/` | the constitution's principles — the scenario's rules — as `PROJECT_RULES.md` | skills, templates, scripts, the workflow and its registry, integration and option files (mechanics) |

A constitution still holding `init`'s placeholders (no rules in the scenario) renders as a one-line `PROJECT_RULES.md`
saying the project declares no rules beyond its README, so the docs control's manual never points to a missing file.
Each declaration is data (kind, rendered or not, why), which the setup page publishes.

### The runner, for any docs control

- `prepareProjectRules` snapshots, per scenario, the configuration of every arm a docs control in the campaign names
  (`docs_of`), with that arm's setup, its harness and its scenario overlay; for a tool with a rules generator
  (REQ-FMT-14) it applies the generator to the capture as a run does after its setup. It writes
  `generated/<scenario>/<docs arm>/PROJECT_RULES.md` (the docs arm in the path: two controls would collide).
- A run of a docs control gets its `PROJECT_RULES.md` and records its digest as `generated_sha256` (REQ-RUN-11).
- `checkCampaign`: a docs control's `docs_of` arm must be in the campaign (generalizing today's baseline-docs check,
  its message naming the arm). `scenario dry-run` of a docs control also loads its `docs_of` arm.

### `arms/speckit-docs/` (REQ-FMT-05)

`docs_of: speckit`, no `requires`, a setup that does nothing (as baseline-docs'), and **baseline-docs' manual**,
copied byte for byte (REQ-RUN-11: a docs control gets that manual; a test holds the two equal, and the arm's digest
covers the copy).

### The setup pages (REQ-RES-09's setup half)

`material/setup-<arm>.html` for each harness arm of the execution, from the repository's `arms/<arm>/` as the manual
pages are: its setup script; its `telemetry_off` (or that the tool has none); its manual (linked); its rules generator
(where it writes and what) or that the tool needs none; its docs control and that generator's declaration; and two
statements — the shared git identity ("Benchmark Approver", adr-003 decision 7) carries no approval authority in a
competitor arm, and the speckit bundle resolves its dependencies when it is built (their digests in `SHA256SUMS`).
The method page links them beside the manuals.

### Method page

`{#arms}` and `{#operating-manuals}` name the speckit and speckit-docs arms; `{#baseline-docs-control}` says each
harness has its control, generated the same way; a new `{#setup-pages}` sentence (with its statement in
`method-statements.test.ts`).

### Tests

unit: the two generators and their declarations, `prepareProjectRules` for two controls, the campaign check, the
manual copy, the setup page; acceptance: the two scenarios; the site's file list gains the setup pages; `test:bin`,
`test:docker` (W3's baseline-docs path changes).

## Execution notes

- `npx wingfoil memory add --type task --title "Docs control per harness and harness against its control"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-067-docs-control-per-harness-and-harness-against-its-control`, `status: draft`.
- `npx wingfoil memory submit task-067-… --reason "…"` (backlog → in-progress), in the task's worktree after the
  Design commit. Declared: moves the task to its next state and commits it. Observed: `wf(task): submit
  task-067-docs-control-per-harness-and-harness-against-its-control`, `status: in-progress`; it refuses nothing on
  the worktree's branch.
- Build: red acceptance tests first (7c258fe), then the code (308663f) and the unit tests (d1e35e0).
  - The docs generator registry (`src/arms/docs-controls.ts`) and the rules generators moved to `src/arms/rules.ts`
    so that the runner and the site read the same declarations.
  - `prepareProjectRules` keys its result by docs arm, then scenario; the generated files are under
    `generated/<scenario>/<docs arm>/`, and the W3 docker test and the unit tests follow the new path.
  - A docs control's run records the digest of its `PROJECT_RULES.md` as `generated_sha256`.
  - The test fixture's `baseline-docs` arm now declares `docs_of: wingfoil`, as the repository's does: the
    name-based check it relied on is gone. A campaign check test now keeps the wingfoil arm in the repository and
    out of the campaign, so the loader's own `docs_of` check does not answer first.
  - The setup page shows the setup script HTML-escaped; the acceptance test compares the escaped line.
- `site-content/method.md`: `{#arms}` lists five arms, `{#baseline-docs-control}` says each harness has its
  control, `{#operating-manuals}` links the five manuals, new `{#setup-pages}` (its sources in
  `method-statements.test.ts`).
- task-068 (the comparison, split from this task) was approved into the W13 backlog by the approver meanwhile.
- Review round 1 fixes (727d59e, b1f5fc5):
  - setup pages are compared with the runs' recorded `arm_digest`: a changed arm is refused, as a changed manual is,
    and there is no page for runs that recorded no digest (pre-v0.2);
  - controls come from the execution's arms;
  - the identity sentence is stated per arm;
  - the campaign check now requires the `docs_of` arm to have a harness and a docs generator;
  - Spec Kit placeholders are matched by name;
  - registry lookups use own keys only;
  - stale comments were corrected;
  - tests were added: two controls of one harness, the setup pages, brackets in a rule, and a speckit capture that
    leaves Spec Kit's mechanics.
- Round 2 fix (c1d4d8c): no false "add the arm" next to the `docs_of` arm's own issue. Also the setup sentence
  in method.md, and the placeholder checked as left out.
- `test:docker`'s first run: `images.test.ts` failed once on a race outside this task's code. A container was
  removed between `docker ps` and `docker inspect`. Recorded as bug-017 (pending), and usage note N51 for
  `submit --reason`.
- Suites at c1d4d8c: `npm run lint` clean; `npm test` 1340 passed, coverage 97.95 % statements, 90.67 % branches;
  `test:bin` 8 passed; `test:docker` 21 passed (with `BENCH_SPECKIT_REPO`, Spec Kit v1.1.0).
- `npx wingfoil memory submit task-067-…` (in-progress → in-review). Declared: moves the task to its next state and
  commits it. Observed: see the next commit, `wf(task): submit …`.

## Review notes

Independent read-only agents reviewed `git diff main...HEAD` against the Design, REQ-RUN-11, REQ-FMT-05 and
REQ-RES-09 (setup half), and competitors.feature's two scenarios.

- Round 1 (308663f…b1f5fc5): every Design item implemented, no blocker.
  - Should-fix:
    - the placeholder test caught any bracketed capitals in a rule's text;
    - a `docs_of` arm without a harness or docs generator passed `validate` and failed only in the runner;
    - setup pages were built from the current repository without checking against what ran, with controls taken
      from the whole repository;
    - two unit tests the Design promised were missing (two controls, the setup page);
    - the speckit capture was not faithful in acceptance, so the "left out" checks were vacuous;
    - method.md said the identity carries no authority without qualification, which is false for wingfoil.
  - Nits: stale comments, a double load in dry-run, a false "no docs control" sentence, and the
    `operating-manuals` statement's sources.
  - All fixed in 727d59e.
- Round 2 (727d59e): all round-1 items fixed.
  - New should-fix A: a regression, a false "add the wingfoil arm" issue when wingfoil is in the campaign but
    refused on its own. Fixed in c1d4d8c.
  - New should-fix B: a design point, not changed here.
  - Nits C (the method.md sentence overclaimed) and E (the placeholder was not asserted as left out): fixed in
    c1d4d8c.
  - Nit D (the digest reads every arm file, more than REQ-RES-02's read list names): left as is, since the files
    are only hashed.
- Round 3 (c1d4d8c): A, C and E fixed; clean, nothing at should-fix or above.
  - Remaining nit: no unit test for the "the <tool> harness has no docs generator" wording.
- B, escalated to the approver: a rebuild after an arm's files change is refused, now for any file under a harness
  arm (the digest), where before only the manual was checked. It also refuses when a ran arm's `arm.yaml` no longer
  loads. It applies only to executions whose runs recorded a digest (v0.2 onwards).
  - F7.2 ("A corrected setup runs as a new campaign and the old one stays published", REQ-RES-10) needs the
    contested execution to be rebuilt after its arm is corrected.
  - The task that implements F7.2 must read the arm (setup page and manual) at its recorded state, or leave the
    pages out instead of refusing. The approver chooses.
