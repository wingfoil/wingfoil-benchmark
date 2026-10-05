---
id: rel-v0-1
type: release
title: "v0.1"
status: released
version: v0.1
waves: [W1, W2, W3, W4, W5, W6, W7, W8, W9, W10, W11]
features: [F3.1, F1.1, F2.1, F2.2, F2.3, F2.4, F2.5, F2.6, F2.7, F3.5, F3.2, F3.4, F3.3, F1.2, F1.3, F4.1, F4.3, F3.6, F6.1, F6.2, F5.1, F6.3, F6.8, F4.8, F4.2, F4.7, F4.4, F4.5, F5.3, F5.4, F5.5, F5.8, F5.6]
---

## Goal

**First preliminary result.** A WingFoil-only campaign (arms baseline, baseline-docs and wingfoil) on
the scenarios S1, S2, S3 and S8, published as preliminary. The repository becomes public.

It serves Riley (primary persona) and the Maintainer
([07_sequencer.md](../../01_vision/07_sequencer.md) 1.1, "Releases at a glance").

The reference campaign has 21 runs on Sonnet 5 (3 repetitions on S1, 1 on S2, S3 and S8, in each of
the three arms), plus the Opus 5 comparison slice on S1 (sequencer decision 2;
[09_experiment-design.md](../../01_vision/09_experiment-design.md) 1.1). It runs on the latest
released WingFoil at that time. Development targets the WingFoil v0.2 pre-release pinned to
`3df305e` (sequencer decision 3, amended in 1.1).

Categories covered: C, D, E and F. A, B and G are declared missing on the site.

## Scope

Waves and features from [07_sequencer.md](../../01_vision/07_sequencer.md) 1.1. Specification:
[plan-002](../../plans/plan-002-benchmark-specification.md) (`docs/02_specification/`). Execution plan:
[plan-003](../../plans/plan-003-release-v0-1.md).

| Wave | Features | High unc. | Ends with | Verified |
|---|---|---|---|---|
| W1 — Skeleton | F3.1 scenario format · F1.1 campaign file · F2.1 isolated run | — | a trivial scenario runs in a container from a campaign file | **2026-09-23** |
| W2 — Agent in the loop | F2.2 fresh-session steps · F2.3 Claude Code adapter · F2.4 neutral approver | F2.4 | a multi-step run with usage captured and interventions counted | **2026-09-24** |
| W3 — Arms | F2.5 arm setups · F2.6 WingFoil under test · F2.7 arm activation (operating manuals) | — | the same scenario runs in the baseline, baseline-docs and wingfoil arms || **2026-09-25** |
| W4 — Scenario hygiene | F3.5 hold-out integration · F3.2 validator and leak scan · F3.4 scenario versioning | — | a scenario validated, with its oracle kept outside the container || **2026-09-28** |
| W5 — Cost control | F3.3 dry run · F1.2 cost estimate · F1.3 budget guard | — | a campaign refuses to start above the ceiling | **2026-09-28** |
| W6 — First scores | F4.1 hidden-test oracle · F4.3 cost metrics · F3.6 expected failures | — | pass/fail and cost per run, with expected failures marked | **2026-09-28** |
| W7 — First content | F6.1 S1 conformance · F6.2 S2 injected bugs · F5.1 results store | — | S1 and S2 scored in all three arms | **2026-09-29** |
| W8 — Continuity and governance | F6.3 S3 multi-session evolution · F6.8 S8 directive compliance · F4.8 tool-neutral governance metrics | — | S3 and S8 scored | **2026-09-29** |
| W9 — Quality | F4.2 static quality · F4.7 next-change cost · F4.4 setup/step split and break-even | — | the full quality and cost picture per run | **2026-09-29** |
| W10 — Determinism and findings | F4.5 determinism metric · F5.3 run detail · F5.4 finding note | F4.5 | determinism measured, and a first finding note ready for WingFoil | **2026-09-30** |
| W11 — Publish | F5.5 landing page · F5.8 method page · F5.6 manual publish | — | first preliminary result public; repository public | offline half **2026-10-01**; public half **2026-10-05** |

The "Verified" column records, for each wave, the evidence that its "Ends with" holds (kanban-delivery,
deliver phase).

### W1 — verified 2026-09-23

**"A trivial scenario runs in a container from a campaign file."** `npm run test:docker`
(`test/docker/run.test.ts`) runs the trivial scenario T0 from `test/fixtures/campaigns/smoke.yaml`
against the real Docker, in about 90 seconds including the image build, and checks that:

- the file the step was asked to create is in the workspace, with its expected content;
- the workspace is a git repository with one `seed` commit;
- the execution was recorded under `results/<campaign-id>/1/campaign.yaml`;
- no container is left behind, and the image carries the campaign's identity.

Isolation is checked inside the run itself: the runner asks Docker what the container holds and fails
the run if it is anything but that one workspace mount.

| Task | Feature | Delivered |
|---|---|---|
| [task-001](../task/task-001-scenario-format-and-package-skeleton.md) | F3.1 | package, `core`, `scenario`, the REQ-ARC-02 lint rule |
| [task-002](../task/task-002-campaign-file-and-validation.md) | F1.1 | `campaign`, `results`, `cli`, `bench campaign validate` |
| [task-003](../task/task-003-isolated-run-in-a-container.md) | F2.1 | `core/ports`, `agents`, `runner`, `bench campaign run` |

Decisions taken during W1: [adr-001](../adr/adr-001-w1-toolchain-and-runner-conventions.md) (amended),
[dl-001](../decision-log/dl-001-per-step-oracle-mapping-in-the-scenario-format.md),
[dl-002](../decision-log/dl-002-third-party-oracle-material-without-a-git-commit.md),
[dl-003](../decision-log/dl-003-campaign-pins-harness-coverage-seed-and-the-models-shape.md).
Amendments: requirements 1.2, features 1.3.

**Due before the waves that need them:** dl-001 (per-step oracle suites) before W6 and W7 (done:
task-026); dl-002 (third-party material pinned by `commit` or `sha256`, and S1's full SHA) before W7 —
the approver's decision of 2026-09-28: **W7's first task**; the interim
harness rule of dl-003 revisited in W3 with the arm definitions.

Release-planning notes:

- Triage: no open bug or decision-log element at planning time.
- W1 requirements also include REQ-RUN-16 (F1.1) and REQ-CLI-10 (F2.1), as mapped by
  [traceability.md](../../02_specification/traceability.md) §2.

### W2 — verified 2026-09-24

**"A multi-step run with usage captured and interventions counted."** `npm run test:docker`
(`test/docker/run.test.ts`, second test) runs the three-step scenario T1 from
`test/fixtures/campaigns/multi-step.yaml` through `bench campaign run` against the real Docker, with the
fake agent replaying sessions the real agent produced in the W2 spike — a question, an approval
request, a session that simply finished — so it needs no credential and spends nothing (the plan-time
decision). It checks that:

- the run completes, with one session per step (three distinct ids in `run.json`), each continued by
  its own resume where the approver answered;
- the workspace's own history is `seed`, `step 01`, `step 02`, `step 03`, and each step has its patch,
  holding what the step and its resume did in the container;
- each step's `usage.json` is its invocations together — work summed, cost the session's latest total
  (bug-004, adr-002 amendment 1);
- two interventions are recorded, a question and an approval request with the policy's replies, under
  `approver_policy: v1`;
- no container is left behind.

Shown able to fail: with the approver blinded (the fake no longer passing the final message on) the
run completes with no interventions and the test goes red.

| Task | Feature | Delivered |
|---|---|---|
| [task-004](../task/task-004-waiting-for-input-and-credentials-spike.md) | — (spike) | the command line, the event shape, the credential path, the classifier's evidence |
| [task-005](../task/task-005-fresh-session-steps.md) | F2.2 | one fresh session per step, `step <NN>` commits, the session guard |
| [task-006](../task/task-006-claude-code-adapter.md) | F2.3 | the Claude Code adapter, usage and transcripts, `run.json`, the replaying fake, `--allow-spending` |
| [task-007](../task/task-007-neutral-approver.md) | F2.4 | classifier and policy v1, resumes, the intervention cap, interventions in `run.json` |

Decisions taken during W2: [adr-002](../adr/adr-002-w2-runner-and-adapter-conventions.md) (amended:
decision 8), [dl-004](../decision-log/dl-004-waiting-for-input-classifier-v1.md); adr-001 amendment 2.
Bugs: [bug-003](../bug/bug-003-an-interrupted-run-leaves-its-container-behind.md) (open: an
interrupted run leaves its container behind),
[bug-004](../bug/bug-004-session-cost-is-cumulative-so-summing-it-double-counts.md) (fixed in task-007).

**Due before the waves that need them:**

- **REQ-RUN-17, the other half, in W3 (F2.5):** the wingfoil arm declares a "Benchmark Approver" member
  with the `approver` role and the container's git identity is that member. W2 delivered only the
  runner's half — the decision is always the neutral approver's — and the method page's statement is
  W11.
- **W3 adds the wingfoil arm's `--mcp-config` / `--strict-mcp-config` to the resume line too**, or a
  resumed session runs without the arm's tools.
- **Validation (plan-003 step 4), with the real agent:** check that a resumed Sonnet 5 session stays on
  Sonnet (the resume passes no `--model`; the spike saw it only with Haiku), and, cheaply, what
  `--max-budget-usd` compares against on a resume.
- **W5:** the intervention cost against the budget; a per-session cost floor (adr-002).
- **Candidates for classifier v2**, never a quiet edit to v1: listed in task-007's review notes.

### W3 — verified 2026-09-25

**"The same scenario runs in the baseline, baseline-docs and wingfoil arms."** Checked in two halves,
as the W3 plan phase decided (task-011, decision 4).

**With the fake agent** — `npm run test:docker` (`test/docker/run.test.ts`, the W3 test) runs T2
(standing in for S8) from `test/fixtures/campaigns/arms.yaml` in the three arms, against WingFoil
`3df305e` built from the local clone: `3 runs completed, 0 failed`. It checks that:

- the WingFoil in the wingfoil container is built from `3df305ea198d…` (`run.json` `harness.commit`,
  the setup log), found at `/home/node/.local/bin/wingfoil`, independent of the managing WingFoil;
- T2's rules and decision are in the wingfoil arm only, and the Benchmark Approver is declared;
- the agent's `memory approve` is accepted as `Approver: Benchmark Approver … (approver)`; shown able to
  fail with the member under another email (`user not authorized to approve`);
- baseline-docs receives `PROJECT_RULES.md`, rendered from a snapshot the wingfoil arm's own setup
  made, with T2's `no-throw` rule and `dl-001`; each arm's `CLAUDE.md` is its manual;
- no container is left behind.

**With the real agent** — approver's consent 2026-09-25: Sonnet 5, at most 3 €. Campaign
`ccf207c46915` (T2, baseline and wingfoil, Claude Code 2.1.280, `claude-sonnet-5`), run outside the
repository; `2 runs completed, 0 failed`, **0.72 € API-equivalent** in all:

| Arm | Setup | Manual (`bytes-div-4`) | Step 1 | Step 2 | Interventions |
|---|---|---|---|---|---|
| baseline | 0.1 s | 120 tokens | 0.065 € | 0.039 € | 0 |
| wingfoil | 2.2 s | 463 tokens | 0.521 € (50 turns) | 0.094 € | 1 approval request |

In the wingfoil arm the agent did what its manual maps: read `directives list --role developer` and the
approved decisions, followed `dl-001` (a `Result`, no throw), tracked the request as `task-001`,
recorded `dl-002`, submitted both, asked for approval and stopped; after the neutral approver's
"Approved. Proceed." it ran `memory approve` on both, recorded as the Benchmark Approver (author and
`Approver:` line agree). The token appears in no stored file.

| Task | Feature | Delivered |
|---|---|---|
| [task-011](../task/task-011-wingfoil-in-the-run-container-spike.md) | — (spike) | WingFoil `3df305e` in the container, observed; adr-003; 0.04 USD |
| [task-012](../task/task-012-arm-definitions-and-the-setup-phase.md) | (F2.5) | `arms/<arm>/arm.yaml`, harness coverage from `requires`, the setup phase, MCP on both command lines |
| [task-013](../task/task-013-wingfoil-under-test-and-approval-authority.md) | F2.6 | the WingFoil under test built from the clone by SHA, the wingfoil setup, the Benchmark Approver, a scenario's `arms/<arm>/` |
| [task-014](../task/task-014-operating-manuals.md) | F2.7 | the three manuals as `CLAUDE.md`, their size recorded |
| [task-015](../task/task-015-baseline-docs-generator.md) | F2.5 | the snapshot of the wingfoil configuration and the baseline-docs generator |

Decisions taken during W3: [dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md),
[adr-003](../adr/adr-003-w3-arm-conventions.md); requirements 1.5 (REQ-RUN-14) and 1.6 (REQ-FMT-04,
REQ-ARC-03); scenarios README 1.1 (K5: no MCP Tools at `3df305e`). Bugs:
[bug-006](../bug/bug-006-claude-code-s-auto-memory-can-carry-state-between-the-steps-of-a-run.md)
(open: Claude Code's auto-memory lives in the container for a whole run). WingFoil usage notes N30–N34.

**W2's carry-overs, settled here:**

- REQ-RUN-17's other half and the MCP flags on the resume line: delivered (task-013, task-012).
- A resumed Sonnet 5 session **stays on Sonnet**: the resume's `init` event and its `modelUsage` both
  name `claude-sonnet-5`, in the same session, with the WingFoil server connected again.
- What `--max-budget-usd` compares against on a resume: **not observed** — the resume cost about
  0.03 USD, far from its cap. It stays open for W5's budget guard, which must not rely on it.

**Due before the waves that need them:**

- **W4 (F3.2, the leak scan):** a scenario's `arms/<arm>/` must not leak into the seed or the prompts
  (the loader checks overlap, not content); a seed must not carry a `CLAUDE.md` or `PROJECT_RULES.md`
  (the runner refuses to overwrite `CLAUDE.md`, but only at run time).
- **W5 (F1.2, F1.3):** the wingfoil arm's first step cost eight times the baseline's here (0.52 € vs
  0.065 €, 50 turns): the estimate needs a per-arm step cost, not one figure. Setup is time only
  (adr-003 decision 11), and the harness build happens once per campaign, outside every run.
- **bug-006** before the reference campaign: auto-memory could carry state between steps in every arm.
- **Before the campaign (sequencer decision 3):** the reference campaign pins the latest *released*
  WingFoil, not `3df305e`; re-run `spikes/task-011/p6-mcp.sh` against it (adr-003 consequence) and
  refresh `test/fixtures/wingfoil-config/` from a real run.
- **W11 (F5.8):** the method page states that the decision is always the neutral approver's and the
  agent only executes it (REQ-RUN-17), and publishes the three manuals and the baseline-docs table.

### W4 — verified 2026-09-28

**"A scenario validated, with its oracle kept outside the container."** Verified offline, as the W4
plan phase decided (task-016, decision 4); no real-agent half (`real-agent-check` not taken).

- **Validated.** The CLI built from main, in a repository holding T3 (standing in for S1–S3) and
  `scenarios/leak-scan.yaml`, with a hold-out in a temporary directory:
  `bench scenario validate T3@1.0 --holdout <tmp>` → `scenario T3@1.0 is valid (hold-out: 1 file)`,
  exit 0. With a hold-out expected value copied into a step prompt, the same command fails with
  `steps[1].prompt_file: holds a literal of the hold-out file hidden/refund.test.ts`, exit 1, and
  prints nothing of the hold-out. `scenarios.feature` @F3.2 (three scenarios) and @F3.4 are green.
- **Oracle outside the container.** `npm run test:docker` on main, 4/4: every run's container has one
  mount, its workspace (checked against Docker itself since W1), and `runner.feature` @F2.1 "A run
  cannot see the hold-out even if the path is configured" is green — extended in task-016 so that a
  configured `BENCH_HOLDOUT_PATH` is not even read by `campaign run`. The oracle's text never reaches
  a seed or a prompt either: that is the leak scan's job, above.

| Task | Feature | Delivered |
|---|---|---|
| [task-016](../task/task-016-hold-out-access.md) | (F3.5, integration half) | `bench scenario validate`, the hold-out's path and additions, never read by `campaign run` |
| [task-017](../task/task-017-scenario-validator-and-leak-scan.md) | F3.2 | the leak scan: harness names, oracle literals (hold-out included, never printed), arm configuration, reserved seed names |
| [task-018](../task/task-018-scenario-versioning.md) | F3.4 | the content hash in `run.json`, changed versions refused, `.gitattributes` |
| [task-020](../task/task-020-real-agent-runs-declared-in-delivery-and-the-spending-ledger.md) | — (dl-006) | `kanban-delivery` 2 (`real-agent-check`), `release-cycle` 2, the v0.1 spending ledger |
| [task-019](../task/task-019-agent-auto-memory-kept-out-of-the-next-step.md) | — (bug-006) | auto-memory off and cleared before every step, proven with the real agent (0.0416 USD) |

Decisions taken during W4: the plan-phase decisions in task-016 (F3.5 split between W4 and W6);
[dl-006](../decision-log/dl-006-real-agent-runs-during-delivery-are-declared-by-the-workflow.md)
(approved, implemented by task-020). Bugs:
[bug-006](../bug/bug-006-claude-code-s-auto-memory-can-carry-state-between-the-steps-of-a-run.md)
fixed (Resolution section; bug-005 stays with v0.2's triage). Spending so far, all of it in
delivery: **0.9893 USD** ([v0.1 ledger](../../calibration/v0.1-ledger.md)).

**Due before the waves that need them:**

- **W6 (F4.1):** the scoring half of F3.5 — hold-out tests run on a run's snapshots and reported apart
  in `score.json` (REQ-SCO-09); the task that delivers it declares F3.5. It reads the additions through
  task-016's `loadHoldoutAdditions`.
- **W7 and W8 (scenario content):** an expected value that is an ordinary word of eight letters or
  more cannot appear in a prompt (task-017's known limit), and numbers are not scanned; a scenario
  version with stored results is immutable — a change is a new version (task-018).
- **W5 (calibration's inputs):** the ledger says what delivery spent; its dry runs are ledger lines too
  (`release-cycle` 2).

### W5 — verified 2026-09-28

**"A campaign refuses to start above the ceiling."** Verified offline, with the fake agent, as the W5
plan phase decided (task-021, decision 3); no real-agent half (`real-agent-check` not taken).

- **The built command** (`npm run test:bin`, "W5's Ends with"): `bench campaign run` on a campaign whose
  stored dry run prices it at 130 EUR against a 100 EUR ceiling exits 1 with `campaign: not started:
  the estimate, 130.0000 EUR, is above the ceiling, 100 EUR. No option overrides it …`, with and without
  `--allow-spending`, before any Docker call.
- **The whole chain, by hand, on main** (`3bb0b90`), in a temporary repository: `bench scenario dry-run
  T1@1.0 --arm baseline` ran T1 in a real container with the fake replaying the W2 spike's sessions —
  `completed, 0.0879 USD (0.0808 EUR) — step 01 0.0681 USD, step 02 0.0099 USD, step 03 0.0099 USD —
  results/dry-runs/1`; `bench campaign estimate` on a campaign of 1500 repetitions of T1 → `estimate:
  131.7826 USD, 121.2400 EUR at 0.92 EUR/USD, API-equivalent`; `bench campaign run … --allow-spending`
  → the same estimate, then the refusal above the ceiling, exit 1, no execution directory under
  `results/`. With 1000 repetitions (80.83 EUR) the same command stopped at the warning threshold
  instead: no terminal to confirm on.
- **Acceptance:** `campaign.feature` @F1.2 (two scenarios) and @F1.3 (four), `scenarios.feature` @F3.3,
  all green; `npm test` 703/703, `npm run test:docker` 6/6.

| Task | Feature | Delivered |
|---|---|---|
| [task-021](../task/task-021-dry-run.md) | F3.3 | `bench scenario dry-run`, `scenarios/dry-run.yaml`, `results/dry-runs/`, one runner path (`RunPlan`) |
| [task-022](../task/task-022-cost-estimate.md) | F1.2 | `bench campaign estimate`, per scenario version, arm and model, slices included; the estimate and cost in `campaign run` |
| [task-023](../task/task-023-budget-guard-at-campaign-start.md) | (F1.3, start half) | no estimate or above the ceiling never starts; above the warning, a confirmation on a terminal only |
| [task-024](../task/task-024-cost-and-time-caps-during-a-run.md) | F1.3 | the agent's cost cap recognised, `step_time_s` by `timeout`, `step_tokens`, the ceiling across runs, the quota; its spike |
| [task-025](../task/task-025-model-slices-run-in-a-campaign.md) | — (F1.1's slices) | model slices run, from the same keys the estimate prices |

Decisions taken during W5: the plan-phase decisions in task-021 (six: a fifth task, task-025, added at
task-022's review); task-023's (no flag confirms above the warning threshold; `features: []`, F1.3
declared by task-024, as task-016 did for F3.5); task-024's (the agent's own cap, a killed step counted
at its bound, `step_tokens` between invocations). No new bug or decision-log. Spending: task-024's spike,
**0.0522 USD** reported plus about 0.009 USD a killed session could not report; **1.0415 USD** reported
in all so far ([v0.1 ledger](../../calibration/v0.1-ledger.md)).

**What the pinned agent does at its caps** (task-024's spike, Claude Code 2.1.280): it stops at
`--max-budget-usd` one turn past it at most (0.0419 USD for 0.04), `terminal_reason: budget_exhausted`;
a resume's cap is compared with the resume's own spending; a session killed by `timeout` reports no
cost. This settles W3's open question (what `--max-budget-usd` compares against on a resume).

**Due before the phases and waves that need them:**

- **Calibration (plan-003 step 3):** write the benchmark's own `scenarios/dry-run.yaml` (agent 2.1.280 as
  REQ-RUN-16 was amended, the model, the caps); dry-run S1, S2, S3 and S8 in every arm **and** S1 on
  Opus 5 for the slice (task-021 decision 2: no cost is scaled between models); every dry run is a
  ledger line.
- **Before the campaign:** quota exhaustion is recognised on a documented, not observed, shape
  (task-024); a campaign's run killed at `step_time_s` ends at its cap, since its cost counts at its
  bound.
- **W7 (aggregation, F5.1):** dry runs are never read (REQ-RES-01); slice results are reported apart from
  same-model ones (T14).
- **W11 (F5.8):** the method page states that the cost cap lets a session run one turn past it, how a
  killed step is counted, and that `step_tokens` is checked between invocations.

### W6 — verified 2026-09-28

**"Pass/fail and cost per run, with expected failures marked."** Verified offline, with the fake agent, as
the W6 plan phase decided (task-026, decision 4); no real-agent half (`real-agent-check` not taken).

- **By hand, on main** (`e4c82f8`, the built CLI), in a temporary repository holding the benchmark's own
  arms, T3 made to declare `workflow-engine`, and a hold-out with two tests for T3's suite. The fake
  wrote a binary file in step 1 — and, in the wingfoil arm, a WingFoil decision-log of its own, a commit
  of the agent's — and the cancellation in step 2:
  - `bench scenario dry-run T3@1.0 --arm baseline|wingfoil` → both completed at 0 USD; the wingfoil one
    logged `expected failure (missing workflow-engine)`;
  - `bench campaign validate` → `campaign 3fba3a8558fe is valid (1 scenario, 2 arms)` and
    `expected failure: T3@1.0 in wingfoil (missing workflow-engine)`;
  - `bench campaign run` → the estimate, `2 runs completed, 0 failed` — the wingfoil run **executed**,
    and logged as an expected failure;
  - `bench score 3fba3a8558fe/1 --holdout <tmp>` →
    `T3@1.0 baseline fake-model r1: step 01 0/1, step 02 1/1, final 1/1; hold-out final 1/2` and
    `T3@1.0 wingfoil fake-model r1: step 01 0/1, step 02 1/1, final 1/1; hold-out final 1/2; expected failure (missing workflow-engine)`.
    Each `score.json` holds M-Q1 per step and final (**pass/fail**), the hold-out apart in counts, and
    `cost` per step and per run (**cost**: all zero with the fake, at 0.92 EUR/USD) and
    `expected_failure` (`null` for baseline — **marked**). Scored again: the same bytes. No hold-out
    test name in any `score.json`; no `bench-*` container left.
  - The wingfoil snapshots rebuilt through `wingfoil init`'s and the Benchmark Approver's commits in the
    setup and the agent's `wf(decision-log): add …` in step 1, each checked by tree: bug-007's fix, on
    the real WingFoil `3df305e`.
- **Acceptance:** `scoring.feature` @F4.1 (two scenarios) and @F4.3, `scenarios.feature` @F3.5 (two) and
  @F3.6, all green; `npm test` 820/820, `npm run test:docker` 7/7 — W6's own runs T3 through a real
  `campaign run` and a real `bench score`, node:test and tsx executing in the scoring image.

| Task | Feature | Delivered |
|---|---|---|
| [task-026](../task/task-026-oracle-suites-per-step.md) | — (dl-001) | `oracle.suites` bound to steps; hold-out additions under a suite id; requirements 1.7 |
| [task-027](../task/task-027-hidden-test-oracle.md) | F4.1 | `bench score`, snapshots rebuilt from stored patches and checked by tree, the scoring image and container, the census, `score.json` v1; adr-004; bug-007; requirements 1.8 |
| [task-028](../task/task-028-hold-out-tests-in-scoring.md) | F3.5 (scoring half) | hold-out suites beside the public one, in counts only, with their hash; "not scored" said; adr-004 amendment 1 |
| [task-029](../task/task-029-cost-metrics.md) | F4.3 | M-K1 and M-K2 per step and per run; a killed step at its bound |
| [task-030](../task/task-030-expected-failures.md) | F3.6 | `provides`, the mark for harness arms, carried into `score.json`, listed by `campaign validate`; requirements 1.9 |

Decisions taken during W6: the plan-phase decisions in task-026 (six);
[adr-004](../adr/adr-004-w6-scoring-conventions.md) (the scoring conventions, amended once); requirements
1.7, 1.8 and 1.9; the review points of task-027 to task-030, recorded in each task. Bugs:
[bug-007](../bug/bug-007-a-stored-patch-leaves-out-the-commits-made-between-two-snapshots.md) (found and
fixed in task-027: stored patches had left out every commit between two snapshots since W2); bug-001's
missing Resolution written. No spending: **1.0415 USD** reported in all so far
([v0.1 ledger](../../calibration/v0.1-ledger.md)).

**Due before the phases and waves that need them:**

- **W7's first task: dl-002** (third-party oracle material pinned by `commit` or `sha256`; S1's full SHA)
  — the approver's decision of 2026-09-28.
- **W7 and W8 (scenario authoring):** every hidden test, public or hold-out, imports the code under test
  inside the test, is registered unconditionally with a unique name, and passes nothing on the seed by
  accident (adr-004 decision 10; W6's own hold-out test first passed on a snapshot without `cancel`); a
  hold-out test is written as a sibling of its public suite (amendment 1). A seed that needs dependencies
  to run its tests needs a way to get them with no network.
- **W7 (F5.1, aggregation):** how `not_reached` steps and final snapshots count, and an expected failure
  counted as a loss with its capability named (W6 plan-phase decision 6); dry runs are scored by
  `bench score dry-runs/<n>` and never aggregated; `score.json`'s `holdout.scored: false` is shown.
- **W9 (F4.4):** the setup's cost (M-K3) beside the steps', from `run.json`; the setup's time is not in
  `cost.run`.
- **Before the reference campaign:** `arms/wingfoil/arm.yaml`'s `provides` re-assessed with the pinned,
  released WingFoil, beside the MCP probe (W3); runs stored before task-027 cannot be scored.
- **W11 (F5.8):** the method page states adr-004's counting rules, what a hold-out result is, and each
  harness's gaps (`provides: false`) and expected failures.

### W7 — verified 2026-09-29

**"S1 and S2 scored in all three arms."** Verified offline, with the fake agent, as the W7 plan phase
decided (task-031, decision 4); no real-agent half (`real-agent-check` not taken).

- **By hand, on main** (`40f1280`, the built CLI), in a temporary repository holding S1@1.0, S2@1.0 and
  the benchmark's own arms. The fake replays S1's reference (`test/fixtures/reference/S1/`) and S2's (the
  hold-out's `reference/S2/`, W7 decision 5), with WingFoil `3df305e` built from the clone:
  - `bench scenario validate S1@1.0 --holdout …` → `valid (hold-out: 3 files)`; `S2@1.0` → `valid
    (hold-out: 8 files)`;
  - six dry runs, S1 and S2 in baseline, baseline-docs and wingfoil: each `completed, 0.0000 USD`;
  - `bench campaign run` of both in the three arms (campaign `27e28fe609f6`) → `6 runs completed, 0
    failed`; the wingfoil runs record `harness.commit` `3df305ea198d…`;
  - `bench score 27e28fe609f6/1 --holdout ../WingFoil2-Benchmark-HoldOut` → exit 0:
    - S1 in each arm: `step 01 12/12, step 02 105/108, step 03 108/108, step 04 123/123, final 135/135;
      hold-out final 33/33` — Pointer after step 1, and the Patch suite rising from step 2 to step 3 as
      S1.md §6 expects;
    - S2 in each arm: `step 01 19/19, step 02 22/22, step 03 24/24, final 24/24; hold-out final 17/17` —
      each report's tests green from its step on, the rules and the false report's behaviour kept;
    - then `aggregate: results/27e28fe609f6/1/aggregate.json (6 groups, 0 slices)`.
  - **The aggregate:** six groups, one per scenario and arm, each `n` 1 and `preliminary`. No loss, and
    the hold-out scored. Step-to-step regressions are all 0. No dry run is named. Aggregated again: the
    same bytes. No `bench-` container left.
- **Acceptance:** `scenarios.feature`'s @F6.1/@F6.2 outline (S1 and S2 rows: validated, dry-run in the
  three arms, their hidden tests really run by the local scoring double) and @F3.6's "published as a
  loss", `results.feature` @F5.1 (two scenarios), all green. `npm test` 877/877 (coverage 99.17%), lint
  clean, `npm run test:bin` 5/5, `npm run test:docker` 11/11. The W7 Docker tests run S1 and S2 in the
  three arms through the real scoring image, with the hold-out.

| Task | Feature | Delivered |
|---|---|---|
| [task-031](../task/task-031-third-party-oracle-material-pinned-by-commit-or-sha256.md) | — (dl-002) | third-party material pinned by `commit` or `sha256`, its files in a suite, the `sha256` checked on every load; S1's full SHA |
| [task-032](../task/task-032-s1-conformance-scenario.md) | F6.1 | S1@1.0: seed, four prompts, three suites on vendored and pinned material, its licenses; the reference and the local scoring double |
| [task-033](../task/task-033-s2-injected-bug-scenario.md) | F6.2 | S2@1.0: seed with six injected defects, three batches of reports, five suites by report; its answer key in the hold-out |
| [task-034](../task/task-034-results-store-and-aggregation.md) | F5.1 | `aggregate.json` from committed files: groups and slices, every value with its runs and `n`, losses, the hold-out apart |

Decisions taken during W7:

- the plan-phase decisions in task-031 (seven). Decision 6 was changed by the approver on 2026-09-29:
  S2's content checks and their format are F4.8's, in W8;
- [dl-002](../decision-log/dl-002-third-party-oracle-material-without-a-git-commit.md) implemented;
- requirements 1.10 (REQ-FMT-04) and 1.11 (REQ-CLI-06), scenario specs README 1.2, S1.md 1.2;
- the review points of task-032 to task-034, recorded in each task:
  - frozen inputs for `resolvePointer` and `applyPatch` only;
  - the RFC examples under BSD-3-Clause;
  - losses in aggregation: an expected failure keeps what it measured, a final not reached counts as
    nothing passed.

Hold-out content: `WingFoil2-Benchmark-HoldOut` `dc21873` (S1) and `141e0e7` (S2), never in this
repository. No bug. No spending: **1.0415 USD** reported in all so far
([v0.1 ledger](../../calibration/v0.1-ledger.md)).

**Due before the phases and waves that need them:**

- **W8 (F4.8):** F4.8's task writes S2's two content checks — the false report's code left unchanged,
  and the duplicate recognised in step 3's files or commits — into S2@1.0, **with the check format**,
  which no requirement fixes yet (REQ-SCO-06). S2@1.0 is not registered until calibration, so that is not
  a new version. The approver's decision of 2026-09-29.
- **W8 (S3, S8 authoring), what W7 learned:**
  - an oracle file quotes no word the API or the seed also uses — the leak scan takes every quoted
    string of 8 characters or more for an expected value;
  - vendored data uses short keys;
  - `scenarios/*/*/` is outside prettier, since a version is hashed over its bytes;
  - Node 22's `--test` takes a glob, not a directory, and strips types for a seed with no install;
  - the local scoring double (`test/support/local-scoring.ts`, tsx 4.23.15 as the scoring image pins it)
    and `referenceScript` serve S3 and S8 as they did S1 and S2;
  - READY in the outline test gains S3 and S8.
- **W9 (quality):**
  - **M-D3 as the experiment design defines it** (hidden tests that passed on the seed and fail at the
    end) needs each test's result on the seed in `score.json`. W7 aggregates only the step-to-step
    regressions (the approver's decision at task-034).
  - M-K3 and M-K4 join the aggregate's `cost`.
- **Calibration (plan-003 step 3):**
  - the real-agent dry runs of S1 and S2 in every arm, and S1 on Opus 5 for the slice;
  - then S1@1.0 and S2@1.0 are **registered** (W7 decision 3). Until then a difficulty change is not a
    new version.
- **W11 (F5.8, F5.5):**
  - the method page publishes `oracle/licenses/NOTICE.md` (Apache-2.0, BSD-3-Clause IETF) and the
    aggregate's rules: every value with its runs and `n`, losses, a hold-out "not scored";
  - the site reads "beyond variance" and categories from `aggregate.json`;
  - S2's answer key is never published.

### W8 — verified 2026-09-29

**"S3 and S8 scored."** Verified offline, with the fake agent, as the W8 plan phase decided (task-035,
decision 5). There is no real-agent half: `real-agent-check` was not taken.

- **By hand, on main** (`c86f58e`, the built CLI), in a temporary repository holding S3@1.0, S8@1.0 and
  the benchmark's arms. The fake replays S3's and S8's public references (`test/fixtures/reference/S3`,
  `…/S8`), and WingFoil `3df305e` is built from the clone.
  - `bench scenario validate S3@1.0 --holdout …` → `valid (hold-out: 4 files)`; `S8@1.0` → `valid
    (hold-out: 4 files)`.
  - Six dry runs, S3 and S8 in baseline, baseline-docs and wingfoil, each `completed, 0.0000 USD`.
  - `bench campaign validate` → `campaign 557dd5f078f5 is valid (2 scenarios, 3 arms)`. `bench campaign
    run` → `6 runs completed, 0 failed`, cost 0. The wingfoil runs record `harness.commit`
    `3df305ea198d…`.
  - `bench score 557dd5f078f5/1 --holdout ../WingFoil2-Benchmark-HoldOut` → exit 0:
    - S3 in each arm: `step 01 11/11, step 02 16/16, step 03 20/20, step 04 30/30, step 05 37/37, final
      37/37; hold-out final 17/17; checks 1/1`. Each feature's suite is green from its step on, and
      D3's revision is found at step 4 in `DECISIONS.md`.
    - S8 in each arm: `step 01 11/11, step 02 14/14, step 03 19/19, step 04 23/23, final 23/23;
      hold-out final 7/7; checks 16/16`. **M-E1 is zero** for R1–R4 at every step, counted by the
      scoring image's TypeScript 6.0.3.
    - Then `aggregate: results/557dd5f078f5/1/aggregate.json (6 groups, 0 slices)`.
  - **The aggregate:**
    - six groups, each `n` 1 and `preliminary`, with no loss;
    - the hold-out scored, and step-to-step regressions all 0;
    - each check per step, and S8's violations as values;
    - no dry run named;
    - aggregated again: the same bytes. No `bench-` container is left.
  - **K3:** S8's rules reached only baseline-docs (`PROJECT_RULES.md` in its setup patch) and wingfoil
    (the directive files in its setup patch). Baseline received nothing.
- **Acceptance:**
  - `scenarios.feature`'s @F6.1/@F6.2/@F6.3/@F6.8 outline, now with all four rows;
  - `scoring.feature`'s two @F4.8 scenarios, "per rule and per step" (T3) and "do not depend on a
    harness's format" (S3);
  - `runner.feature` @F2.5 on S8's configuration snapshot.

  All are green. `npm test` 948/948 (coverage 99.11%), lint clean, `npm run test:bin` 5/5,
  `npm run test:docker` 16/16. The W8 Docker tests run S3 and S8 in the three arms through the real
  scoring image, and the directive checks through its TypeScript.
- **What the fake cannot show:** it replays the same commands in every arm (W8 decision 5), so every arm
  scores the reference's result, and the arms' difference on S8, which is S8's point, is calibration's
  and the campaign's.

| Task | Feature | Delivered |
|---|---|---|
| [task-035](../task/task-035-check-format-and-content-checks.md) | (F4.8, first half) | the check file; `content` (groups of substrings on the lines a step added and its commit messages) and `unchanged` (seed regions); `commits.json` per step; checks in `score.json` and `aggregate.json`; S2's two checks |
| [task-036](../task/task-036-s3-multi-session-evolution-scenario.md) | F6.3 | S3@1.0: five suites by feature, decisions named D1–D5, D3's revision as a content check, the public reference |
| [task-037](../task/task-037-directive-checks-and-tool-neutral-governance-metrics.md) | F4.8 | M-E1: `dependencies` and `ast` checks, violations per rule and step with their places, the AST in the scoring image with the TypeScript it pins |
| [task-038](../task/task-038-s8-directive-compliance-scenario.md) | F6.8 | S8@1.0: a to-do seed compliant by construction, R1–R4 as WingFoil directives and as four checks, five suites, baseline-docs from a real snapshot |

Decisions taken during W8:

- the plan-phase decisions in task-035 (seven), with the approver's three choices:
  - four tasks, infrastructure just in time;
  - S2's false report as an `unchanged` check;
  - D3's content check in W8 and M-F1 in W9;
- the design choices confirmed by the approver:
  - task-035: groups of substrings on added lines, check files out of the literal scan, the prompt check,
    `commits.json`;
  - task-037: `crypto` randomness counted, tests and `.d.ts` out of `ast` checks, violations with file
    and line;
  - task-038: a functional hold-out only, validation tests neutral between a returned and a thrown
    error, a to-do seed;
- requirements 1.12 (REQ-SCO-06, REQ-RUN-05, REQ-FMT-04, -06, -08, REQ-RES-06) and 1.13 (REQ-SCO-05, -06);
  adr-004 amendment 2; S8.md 1.1.

Hold-out content: `WingFoil2-Benchmark-HoldOut` `0a52804` (S2's reference records the duplicate),
`15f6d29` (S3) and `3792676` (S8), never in this repository. No bug. No spending: **1.0415 USD**
reported in all so far ([v0.1 ledger](../../calibration/v0.1-ledger.md)).

**Due before the phases and waves that need them:**

- **W9 (F4.7, continuity):**
  - M-F1 as the experiment design defines it. It is the share of D1–D5 respected or explicitly
    revised: the `D<n>:` hidden tests at the final snapshot, read by name from `score.json`, and D3's
    content check. W8 delivered its parts (task-035 decision 3).
  - M-F2, the cost and M-Q1 of steps 2 to 5.
  - The full M-D3, from each test's result on the seed (W7's carry-over).
- **W9 (F4.2, static quality):** REQ-SCO-04's ESLint, jscpd and c8 are pinned in the scoring image, as
  TypeScript now is (adr-004 amendment 2). M-K3 and M-K4 join the aggregate's `cost`.
- **W10 (F4.5, M-R2):** the public-interface comparison can reuse the image's parser
  (`ast-checks.mjs`).
- **Calibration (plan-003 step 3):**
  - the real-agent dry runs of S1, S2, S3 and S8 in every arm, and S1 on Opus 5 for the slice;
  - then S1–S3 and S8 are **registered**;
  - S8's arm difference and S2's and S3's checks on a real agent are first seen there.
- **Before the reference campaign:**
  - refresh `test/fixtures/wingfoil-config/S8/` from a real run with the pinned, released WingFoil;
  - re-assess `provides.directive-delivery` beside the MCP probe (W3, W6);
  - old runs without `commits.json` cannot be scored by a scenario with a content check (task-035).
- **W11 (F5.8, the method page):**
  - the check file and its four kinds, and that checks read text, the AST excepted;
  - content checks: added lines only, the prompt check, a code comment counting as a record (S3.md §9);
  - the syntactic rules' limits: an alias is not seen, tests and declaration files are left out, `crypto`
    randomness is counted;
  - S8's four directives, published as rules.

### W9 — verified 2026-09-29

**"The full quality and cost picture per run."** Verified offline, with the fake agent, as the W9 plan
phase decided (task-039, decision 4). There is no real-agent half: `real-agent-check` was not taken.
The fake cannot give each arm a cost of its own: its script is keyed by scenario and step, not by arm,
so decision 4's "synthetic usage per arm" could not be carried by the fake. On 2026-09-29 the approver
chose a declared synthetic execution instead (the second bullet).

- **Execution 1, by hand, on main** (`0b0c126`, the built CLI), in a temporary repository holding S1@1.0,
  S2@1.0, S3@1.0, S8@1.0 and the benchmark's arms. The fake replays each reference, S2's from the
  hold-out, and WingFoil `3df305e` is built from the clone.
  - `bench scenario validate` → valid for all four (hold-out: 3, 8, 4 and 4 files).
  - Twelve dry runs, four scenarios in three arms, each `completed, 0.0000 USD`.
  - `bench campaign validate` → `campaign 400aa6f6ca02 is valid (4 scenarios, 3 arms)`. `bench campaign
    run` → `12 runs completed, 0 failed`, cost 0.
  - `bench score 400aa6f6ca02/1 --holdout ../WingFoil2-Benchmark-HoldOut` → exit 0, in 7 min 42 s. M-Q1,
    the hold-out and the checks are as in W7 and W8. S3's line adds `M-F1 5/5`. Then `aggregate: … (12
    groups, 0 slices)`.
  - **The picture per run**, the same in every arm, since the fake replays the same references:

    | | S1 | S2 | S3 | S8 |
    |---|---|---|---|---|
    | seed (M-Q1) | 0/135 | 17/24 | 0/37 | 6/23 |
    | M-D3 | 0 | 0 | 0 | 0 |
    | M-F1 | — | — | 5/5 (D3 `revised`) | — |
    | M-F2 | steps 2–4 | steps 2–3 | steps 2–5 | steps 2–4 |
    | M-Q2 files | 4 | 6 | 2 | 6 |
    | lint findings / lines | 0/179 | 0/530 | 0/183 | 0/502 |
    | complexity (sum/functions, max) | 76/17, 11 | 117/49, 13 | 51/21, 6 | 105/57, 7 |
    | duplicated lines | 0 | 0 | 0 | 0 |
    | coverage | 0/179 | 501/530 | 0/183 | 388/425 |

    - M-K3: every setup is 0 EUR. It takes 0.1–0.2 s in baseline and baseline-docs, and 1.2–1.4 s in
      wingfoil. The manual is 120, 158 and 463 tokens (baseline, baseline-docs, wingfoil).
    - M-K4 is `never` for every arm: 0 against 0.
    - S1's and S3's seeds have no tests, so they cover nothing (W9 decision 3).
  - Scored again: the same bytes for all 12 `score.json` and the aggregate, M-Q2's coverage from S2's
    and S8's own tests included. No `bench-` container is left.
- **Execution 2, declared synthetic** (the approver's choice, 2026-09-29): the same stored runs, not yet
  scored, copied as `400aa6f6ca02/2`. Each arm's cost is rewritten before `bench score`:
  - baseline 0.10 EUR per step;
  - baseline-docs 0.12 EUR;
  - wingfoil 0.05 EUR, with a setup of 0.30 EUR.

  S1's wingfoil run was cut before its last step. `bench score` → exit 0. The aggregate's
  `break_even`:
  - **6** for wingfoil on S2, S3 and S8: 0.30 ÷ (0.10 − 0.05);
  - **`not applicable`** for wingfoil on S1: its final was not reached, so its final M-Q1 is 0 against
    1. It is a loss, and M-D3 and M-Q2 say "not reached";
  - **`never`** for baseline-docs on all four: 0.12 is not lower than 0.10.

  The per-group `cost` holds M-K3 (`setup_cost_eur` 0.3 for wingfoil), and M-F2 its steps at 0.05.
- **Acceptance:** all are green.
  - `scoring.feature` @F4.2, @F4.4 ×2 and @F4.7 ×3, with the @F4.1 to @F4.8 scenarios still green;
  - `npm test` 1011/1011 (coverage 99.07%), lint clean, `npm run test:bin` 5/5;
  - `npm run test:docker` 16/16, with the W6 and S3 tests rerun after task-041's `da7a3cb`. The real
    image's ESLint, jscpd and c8 score S3 and S8 in the three arms.

| Task | Feature | Delivered |
|---|---|---|
| [task-039](../task/task-039-continuity-metrics-and-regressions-from-the-seed.md) | F4.7 | `oracle.decisions`; M-F1 (respected, revised with its check, failed); M-F2; M-D3 from the seed's own verdicts; `seed` in `score.json` |
| [task-040](../task/task-040-setup-cost-and-break-even.md) | F4.4 | M-K3 in `cost.setup` from `run.json`; M-K4 as the aggregate's `break_even`, each arm against the baseline of its model |
| [task-041](../task/task-041-static-quality-metrics.md) | F4.2 | M-Q2 in the scoring image: `lint-rules.mjs`, complexity per function, jscpd, c8 over `npm test`; the files the run changed less the setup's |

Decisions taken during W9:

- the plan-phase decisions in task-039 (seven), with the approver's four choices:
  - three tasks, one per feature;
  - M-K4 literally, a v0.1 number being 0;
  - coverage from the project's own tests;
  - an offline wave check;
- decision 4 changed at the wave check (above);
- the design choices confirmed by the approver:
  - task-039: a declared revision counts only when recorded; decisions declared in `scenario.yaml`;
    M-D3 on public tests;
  - task-040: every arm but the baseline paired with it; quality on the final M-Q1; an expected
    failure from what it measured;
  - task-041: two published rule sets; `npm test` under c8, passing or not; the setup's files left out;
- requirements 1.14 (REQ-FMT-04, REQ-SCO-12, new), 1.15 (REQ-SCO-08, REQ-FMT-07) and 1.16 (REQ-SCO-04);
  traceability 1.1; adr-004 amendment 3;
- S3@1.0 lists its decisions (not registered, no stored result: not a new version).

No bug, no new decision-log, no hold-out change. No spending: **1.0415 USD** reported in all so far
([v0.1 ledger](../../calibration/v0.1-ledger.md)).

**Due before the phases and waves that need them:**

- **W10 (F4.5, determinism):**
  - M-R1 can be read from `score.json` as it is: each suite's total and its `failed` keys, per
    repetition, the census being the same for one scenario version;
  - M-R2 can reuse the image's parser (`ast-checks.mjs`, W8);
  - M-R3's "harness files" can be the setup's paths, as M-Q2 leaves them out (task-041).
- **Calibration (plan-003 step 3):**
  - the real per-arm costs give M-K4 its first real values, and M-Q2 its first on code an agent
    wrote;
  - scoring time: 7 min 42 s for 12 runs of the references here, most of it hidden suites and M-Q2's
    tests. The campaign's 21 runs plus the slice need it budgeted;
  - an agent's own tests may be nondeterministic, and M-Q2's coverage with them (task-041's review).
    Score one calibration run twice to see it.
- **Before the reference campaign:** the scoring image is rebuilt from `docker/score-image/`, whose tag
  changed in task-041. jscpd's platform package must install for the host that builds it.
- **W11 (F5.8, the method page)** states what each task's review listed:
  - M-F1's rows, and that a revision the scenario asks for counts only when recorded;
  - that M-F2 is a reading;
  - M-D3 from the seed;
  - M-K4's rules, and that a v0.1 number is 0 or a special case, the harness's overhead being in each
    step's cost;
  - M-Q2's rule sets, complexity per function, jscpd's 50 tokens, coverage from `npm test`, and the
    files measured;
  - that a final not reached is a loss.

### W10 — verified 2026-09-30

**"Determinism measured, and a first finding note ready for WingFoil."** Verified offline, with the fake
agent and a declared synthetic execution, as the W10 plan phase decided (task-042, decision 2). There
is no real-agent half: `real-agent-check` was not taken. The first note comes from the synthetic
execution, is marked synthetic here, and is **not** handed to WingFoil. The first real note comes from
calibration or the reference campaign.

- **Execution 1, by hand, on main** (`13d6c23`, the built CLI), in a temporary repository holding
  S1@1.0, S2@1.0 and the benchmark's arms. The fake replays each reference, S2's from the hold-out, and
  WingFoil `3df305e` is built from the clone.
  - `bench scenario validate` → valid for both (hold-out: 3 and 8 files).
  - Six dry runs, two scenarios in three arms, each `completed, 0.0000 USD`.
  - `bench campaign validate` → `campaign cb46676b5881 is valid (2 scenarios, 3 arms)`. `bench campaign
    run` (S1 × 3, S2 × 1) → `12 runs completed, 0 failed`, cost 0.
  - `bench score cb46676b5881/1 --holdout ../WingFoil2-Benchmark-HoldOut` → exit 0. The aggregate line
    reads `(6 groups, 0 slices; determinism measured in 3, n = 1 in 3)`.
    - **S1, in each arm, the fake's three identical repetitions:** M-R1 135/135, M-R2 1 (9 interface
      entries in every pair), M-R3 1 (8 paths in every pair). The wingfoil arm's setup files are not
      among its paths.
    - **S2, in each arm:** `m_r` is `{ n: 1 }`, with no value.
  - Scored again (348 s): the same bytes for all 12 `score.json` and the aggregate.
- **Execution 2, declared synthetic** (the approver's choice, 2026-09-29): the stored runs of execution
  1, unscored, copied as `cb46676b5881/2`. Two of S1's wingfoil repetitions are altered at step 4 by
  a script:
  - r2's `src/merge-patch.ts` keeps nulls behind a new parameter;
  - r3 gains `NOTES.md` and a `package-lock.json`.

  For each, the snapshots are rebuilt from the seed with the stored patches, and every recorded tree is
  checked. Then step 4's `diff.patch` and its `run.json` tree are rewritten, as `rebuildSnapshots`
  checks them. `bench score` → exit 0 in 417 s. S1's wingfoil group, checked by hand:
  - **M-R1** 130/135: r2's five merge-patch tests fail, and only in r2;
  - **M-R2** 0.8667: the pairs are 8/10, 9/9 and 8/10, since r2's `applyMergePatch` signature differs;
  - **M-R3** 0.9259: the pairs are 8/8, 8/9 and 8/9, since r3's `NOTES.md` counts and its lockfile, a
    generated path, does not;
  - no threshold is applied. The baseline and baseline-docs groups stay at 1, and S2 at `n = 1`.
- **Run detail:**
  - `bench run compare cb46676b5881/2/runs/S1@1.0/wingfoil/fake-model/r1 …/r2` shows the steps side by
    side: step 04 123/123 against 118/123, final 135/135 against 130/135, hold-out 33/33 against 29/33;
  - `bench run show …/r2` lists the five failing merge-patch tests at step 04 and on the final snapshot.
- **The first finding note (synthetic):** `bench finding cb46676b5881/2 --scenario S1@1.0 --metric M-R
  --arms wingfoil,baseline --as decision-log` → `findings/cb46676b5881-2-s1-1.0-m-r-baseline+wingfoil.md`,
  in the temporary repository only.
  - It holds the campaign, the WingFoil commit `3df305ea198d…` with its three runs, S1@1.0 and its hash,
    the runs, and M-R per arm as above.
  - It holds the links, and the decision-log block with its facts filled in.
  - Asked again with the arms the other way round, it is refused (`exists already`). Removed and written
    again, it gives the same SHA-256.
  - Its reproduction's first step holds: the execution's `campaign.yaml`, copied into `campaigns/`,
    validates as the same campaign `cb46676b5881`.
- **Acceptance:** all are green.
  - `scoring.feature` @F4.5 ×2 and `results.feature` @F5.3 ×2 and @F5.4;
  - `npm test` 1099/1099 on task-044's branch (coverage 98.82%), lint clean, `npm run test:bin` 7/7;
  - `npm run test:docker` 16/16, run on its own after each task.
- No `bench-` container is left.

| Task | Feature | Delivered |
|---|---|---|
| [task-042](../task/task-042-determinism-metrics-across-repetitions.md) | F4.5 | `determinism` in `score.json` (paths, and the interface by the image's `interface.mjs`); `m_r` per group: M-R1, M-R2 and M-R3 with their pairs, `n = 1`, and pins that differ |
| [task-043](../task/task-043-run-detail-and-side-by-side-comparison.md) | F5.3 | `bench run show` and `bench run compare`: the readable transcript, not reached, cost bounds, read-only |
| [task-044](../task/task-044-finding-note-export.md) | F5.4 | `bench finding`: a metric catalogue over the aggregate, a note named from its inputs and never overwritten, a WingFoil section shaped as the pinned template |

Decisions taken during W10:

- the plan-phase decisions in task-042 (six), with the approver's three choices:
  - three tasks, one per feature;
  - an offline wave check with a declared synthetic execution;
  - run detail as text;
- the design choices confirmed by the approver:
  - task-042: an interface entry names its file and is read from syntax; the whole final snapshot is
    read; a final not reached is left out;
  - task-043: a condensed transcript with `--full`; a run named by directory or by aggregate name;
    compare on any two runs of one scenario version;
  - task-044: `--as` required; an id from the inputs, and an existing note refused; no date;
- requirements 1.17 (REQ-SCO-05, -07), 1.18 (REQ-CLI-08) and 1.19 (REQ-CLI-07, REQ-RES-05); adr-004
  amendment 4.

**How W10 was reviewed.** From task-042 on, each task was reviewed by fresh, read-only agents before
`in-review`. The first review of task-042 was the building session's own; the approver asked for an
independent one and sent the task back.

- **Reviews:** task-042 had three rounds, task-043 two, task-044 two.
- **What they found:**
  - bugs that tests had not caught, among them a private parameter property printed as public, and a
    reproduction that could not run;
  - two regressions in the fixes themselves.
- Each finding was fixed test-first and recorded in its task's notes.

No bug, no new decision-log, no hold-out change. No spending: **1.0415 USD** reported in all so far
([v0.1 ledger](../../calibration/v0.1-ledger.md)).

**Due before the phases and waves that need them:**

- **Calibration (plan-003 step 3):**
  - M-R's first real values: an agent's repetitions differ where the fake's cannot;
  - watch M-R3's generated paths (`build/`, `dist/`, `coverage/` at any depth, lockfiles) against what
    agents commit. A change is a scoring rule change (adr-004);
  - harness files written during the steps (e.g. `.wingfoil/memory/…`) count in M-R3. Only the setup's
    are left out, whatever the harness (the approver's choice of 2026-09-29, task-042's review). See
    whether the arms' step files move M-R3;
  - the first real finding note, handed to WingFoil by the maintainer.
- **W11 (F5.6):** transcripts are git-ignored. A run read from a clone shows "transcript not on disk"
  until the release's transcripts are fetched.
- **W11 (F5.8, the method page)** states:
  - M-R1 on public tests;
  - M-R2 read from syntax, an entry naming its file, what an entry is;
  - M-R3's paths, the setup's and the generated ones left out, and that the seed's files raise the
    similarity;
  - the runs compared (a final not reached left out), the pins compared, and that no threshold is
    applied;
  - that harness files written during the steps count in M-R3;
  - what a finding note is, and that one is filed in WingFoil by hand.

### W11 — offline half verified 2026-10-01

**"First preliminary result public; repository public."** Only the release's steps 3–6 can make this true,
so W11 is checked in two halves (W11 decision 2, task-045). The **offline half** is checked here, with the
fake agent and no spending. The **public half** is checked at plan-003 step 6. There, the approver makes the
repository public and enables Pages, and the reference campaign is built, published and its transcripts
attached.

- **Setup:** a temporary repository on main's built CLI (`c18c87a`), holding W10's executions
  `cb46676b5881/1` (the fake's replay) and `/2` (declared synthetic, W10) with their scenarios, plus
  main's `arms/` and `site-content/`.
- **`bench site build`** on both executions writes 15 pages each:
  - the landing page;
  - seven category pages;
  - the method page;
  - six material pages: three manuals, the S1 notice and two licences.

  /2's headline reads: "wingfoil is better in 0, worse in 1 and the same in 3 of 4 comparisons across
  categories C and D (preliminary: n = 1 in D)". S1's wingfoil cell reads M-Q1 98.8%, n = 3, range
  96.3%–100.0%, −1.2 pp, worse within variance. That matches by hand: (135 + 130 + 135) / 405, and 130/135.
  The manuals match the SHA-256 their runs recorded. A second build of both gives the same bytes.
- **`bench transcripts pack cb46676b5881/2`**:
  - it packs 45 transcripts into `releases/cb46676b5881-2/transcripts.tar.gz`, and packing again gives the
    same SHA-256;
  - each run's `run.json` records the asset;
  - with a transcript removed, `bench run show` says "transcript not on disk; in release cb46676b5881-2,
    asset transcripts.tar.gz";
  - the `gh release` command is printed and not run.
- **Publishing:**
  - `bench site publish` to a local bare repository is refused: "is not a GitHub repository: its
    visibility cannot be read". Nothing is pushed.
  - Then, **declared:** `publishSite`'s own code, with its probe stubbed as public, pushes to the bare
    repository. `gh-pages` holds exactly `site/` (32 files, byte for byte) in one commit, `site: publish
    cb46676b5881/1, cb46676b5881/2`. Publishing again says it is already published.
  - The probe alone, against the real `git@github.com:wingfoil/wingfoil-benchmark.git`: "cannot be read
    anonymously: it is private, or unreachable". An authenticated `git ls-remote` reads it at the same
    moment, so the probe is not lent the maintainer's credentials. Nothing here could push.
- **Acceptance:** `results.feature` @F5.5 ×3, @F5.8 and @F5.6 ×2 are green.
  - `npm test` 1194/1194 on task-047's branch (coverage 98.1%), lint clean, `npm run test:bin` 8/8.
  - `test:docker` was not run in W11: nothing of the runner or the scoring image changed.

| Task | Feature | Delivered |
|---|---|---|
| [task-045](../task/task-045-site-build-and-landing-page.md) | F5.5 | `bench site build`: landing and category pages, the category map, a generated headline, one chart |
| [task-048](../task/task-048-test-timeouts-for-fixture-heavy-tests.md) | — | bug-008: a 60 s test timeout, so the suite passes under load |
| [task-046](../task/task-046-method-page.md) | F5.8 | the method page: `site-content/method.md` with sourced anchors, generated pins and budget, published material |
| [task-047](../task/task-047-manual-publish-and-transcript-assets.md) | F5.6 | `bench site publish` and `bench transcripts pack` |

Decisions taken during W11:

- **The plan-phase decisions in task-045 (six)**, with the approver's four choices: three tasks, a split
  wave check, generated headline and rows, and REQ-RES-06 in task-047.
- **The design choices confirmed by the approver:**
  - task-045: D's row is M-Q1 and M-D3; n = 1 counts, marked preliminary; the chart shows M-Q1;
  - task-046: `method.md` with a converter of its own; material pages; an anchor list with sources;
  - task-047: a fresh-build comparison; `gh-pages` with history; an anonymous probe.
- **During review:** M-E1 is not comparable when a run did not reach a directive check's step.
- **bug-008 and task-048** (the approver's choice): a task of its own, before task-046.
- **Requirements** 1.20, 1.21 and 1.22, and traceability 1.2.

**How W11 was reviewed.** Every task was reviewed by fresh, read-only agents, and each fix again:

- task-045 three rounds, task-048 one, task-046 three, task-047 five;
- task-047's rounds found real security holes, each shown locally without contacting any remote:
  - a private repository read as public;
  - a `site/.git` redirecting the push;
  - a remote `.gitattributes` running the maintainer's filters;
- task-046's first round checked every published statement against its source and the code.

One bug (bug-008, fixed by task-048). No decision-log. No hold-out change. No spending: **1.0415 USD**
reported in all so far ([v0.1 ledger](../../calibration/v0.1-ledger.md)).

**Due before the phases that need them:**

- **The public half (plan-003 step 6), the approver's:**
  - make `wingfoil/wingfoil-benchmark` public, and enable Pages on `gh-pages`;
  - build the reference campaign's execution, then `bench site publish`;
  - `bench transcripts pack <id>/<n>` and the `gh release create` it prints;
  - record it here and fill W11's "Verified" cell.
- **Calibration and the reference campaign:**
  - the method page's "This execution" reads the real pins, among them the released WingFoil's
    `provides`;
  - its text names the v0.1 reference campaign's shape (only S1 repeated): re-read it if the campaign
    changes;
  - `harness-gaps` and T10 describe the development pin `3df305e`.
- **Before publishing**, re-read `site-content/method.md` against the requirements as they stand; the
  statements test pins the anchors, not their wording.

### W11 — public half verified 2026-10-05

**"First preliminary result public; repository public."** Verified at plan-003 step 6, on the reference campaign's
published execution ([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md), `c82a5e74885b/2`).

- **The repository is public:** the approver made `wingfoil/wingfoil-benchmark` public on 2026-10-05, and an
  anonymous `git ls-remote` read it. `main` was pushed by the approver.
- **The site is published:**
  - the approver approved publishing (`7ef4c55`), then ran `bench site publish`, which created `gh-pages`
    (`9df8424`) from `site/` holding `c82a5e74885b/2` alone;
  - Pages serves it at <https://wingfoil.github.io/wingfoil-benchmark/c82a5e74885b/2/>, and the landing page and the
    method page answer 200.
- **The transcripts are attached:**
  - `bench transcripts pack c82a5e74885b/2` (token file set, so the value was checked as well as the shape) packed
    86 transcripts, 6 656 064 bytes, sha256 `21bec72d…148ccb`;
  - the approver created the release `c82a5e74885b-2` with it. The asset downloaded from GitHub has the same
    sha256;
  - the 19 `run.json` the pack rewrote were committed after that, not before.
- The method page was re-read before publishing (task-055), as W11 left due.

## Release checklist

- [x] release-planning: scope approved (planning → in-development, `8c5c7e6`; plan: plan-003)
- [x] delivery: W1–W11 done, every wave's "Ends with" verified (W1 done: task-001, task-002, task-003; W2 done: task-004, task-005, task-006, task-007; W3 done: task-011, task-012, task-013, task-014, task-015; W4 done: task-016, task-017, task-018, task-020, task-019; W5 done: task-021, task-022, task-023, task-024, task-025; W6 done: task-026, task-027, task-028, task-029, task-030; W7 done: task-031, task-032, task-033, task-034; W8 done: task-035, task-036, task-037, task-038; W9 done: task-039, task-040, task-041; W10 done: task-042, task-043, task-044; W11 done: task-045, task-048, task-046, task-047, its public half verified 2026-10-05)
- [x] calibration: dry runs in every arm, budget revised (`docs/calibration/v0.1.md`) — task-049 (WingFoil v0.2.2 as the harness under test), task-050 (19 dry runs, 74.17 USD; S1 made harder, step 5; revised budget option A: Opus slice in the wingfoil arm, warn 65 €, ceiling 85 €, cap 30 €; S1–S3, S8 registered; approved `721321f`, merged `d1f348a`)
- [x] validation: acceptance green on the fake agent, coverage > 80%, lint clean, one real-agent end-to-end run — task-052 (on `92b1bf8`: `npm test` 1212 tests, coverage 98.03 % statements, lint clean, Docker 16/16; S3@1.0 baseline on Sonnet 5, campaign `d032e3e98de3/1`: completed, 1.0064 USD (0.8908 €), final 34/37, hold-out 16/17, scored, shown, site built locally, transcripts pack checked without a release; a line of the [ledger](../../calibration/v0.1-ledger.md); approved `4ead1a1`, merged `65de6f2`)
- [x] campaign: reference campaign published (campaign: [campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md), `c82a5e74885b/2`: 19/19 runs, 61.38 €, the Opus slice 23.26 €; `/1` not published, bug-011 fixed by task-053; task-054 and task-055 before publishing; one finding, M-K1 on S1; published `7ef4c55`)
- [x] publishing: tag `v0.1`, repository public, site published, release notes, transcripts attached (repository public 2026-10-05; site at <https://wingfoil.github.io/wingfoil-benchmark/c82a5e74885b/2/>; transcripts release `c82a5e74885b-2`; tag `v0.1` on `6c57494` and release `v0.1` with [docs/releases/v0.1.md](../../releases/v0.1.md); releasing → released `137269b`, its reason's paste typo corrected before the push at the approver's request)
- [ ] retrospective: section below written; WingFoil usage notes handed to the approver

## Retrospective

Written on 2026-10-05, at plan-003 step 7 (`release-cycle` › `retrospective`). Three read-only agents mined:

- the Execution notes, Reviews and Approvals of the 55 tasks;
- campaign-001, the calibration report and the ledger;
- every bug, decision-log and ADR, and the git history.

**v0.1 in figures:**

| | |
|---|---|
| Span and history | 14 days (2026-09-22 → 2026-10-05); 1 320 commits, 73 merges |
| Work | 55 tasks, all done; 11 waves |
| Process | 497 WingFoil transitions, 9 of them rejects |
| Tests | 1 225, coverage 98 % |
| Real-agent spending | 192.15 USD reported, in the [ledger](../../calibration/v0.1-ledger.md) |
| The published campaign | `c82a5e74885b/2`: 19/19 runs, 61.38 € against an estimate of 60.32 € |

### What went well

1. **Independent reviews found what the tests missed.** Among the defects:
   - the agent's token reaching `run.json` (task-006);
   - a resumed session's cost counted twice (task-007, bug-004);
   - a private repository read as public, a `site/.git` and a remote `.gitattributes` redirecting the publish
     (task-047);
   - a bounded step's cost lost (task-053).

   Mutation testing became the norm after task-005 showed covered but unasserted code.
2. **Spikes were cheap and decisive.** task-004 (0.13 USD) found that approval requests do not end in "?", which
   became dl-004. task-011 (0.04 USD) found the reproducible build and the MCP server without Tools. task-024
   measured the caps.
3. **The cost estimate held.** Execution 2 came within +1.8 % of its estimate, the Opus slice within +9 %, validation
   within +6 %. Every real-agent run is a ledger line, and the ledger reconciles.
4. **Calibration did its job:**
   - it found S1 saturated (135/135 in every arm) and made it harder (step 5);
   - it found bug-009 and bug-010 before the campaign;
   - it wrote falsifiable hypotheses (H1–H10) before v0.2, as a defence against T1.
5. **The process absorbed a failed execution.** The campaign's reject-back went scored → running (`1ab1d67`), then a
   fix by its own task (task-053), a full re-run, and publication. Every step of it is in `memory history`
   (usage note N39).
6. **The benchmark's own checks caught design errors:** the module-boundary lint (task-002), the traceability test
   (task-004), the leak scan on its own fixture (task-017), and WingFoil's schema on a fixture (task-015).
7. **Publishing was reproducible and safe.** The transcripts asset has the same sha256 locally and on GitHub; no
   credential is in any stored file or in the history; the site holds the published execution only.
8. **A measured finding for WingFoil,** with the cost broken down by tool call: the wingfoil arm costs ×1.55 the
   baseline on S1, mostly cache reads from its process. It is H1's baseline for v0.2.

### What to change

1. **Independent review lapsed for four waves.** W3–W6, about 20 tasks, shipped on a self-review. It came back only
   after the approver sent task-042 back. → **dl-011.**
2. **Validation was too small** to show the campaign's failure modes: S3 baseline only, so no harness and short
   outputs. bug-011 and bug-014 surfaced in the campaign instead. → **dl-010.**
3. **Every bug found after delivery was on the real-agent path,** which the fake agent cannot exercise: bug-009,
   bug-010, bug-011 and bug-012. → dl-010.
4. **The budget plan did not hold:**
   - K4's 30 € target assumed 1.2 € a run, against 1.8 € measured;
   - Opus was priced at 2.5× Sonnet by list price, against 6.8× measured;
   - the ceiling was per execution, so the re-run took the campaign to 102.61 € against the 85 € consented for one
     execution.

   → **dl-012.**
5. **A failing campaign could not be stopped.** Execution 1 ran 6 h after its failures were systematic, and
   37.44 USD of completed runs were run again, since no command re-runs only the failed runs. → **bug-013**, dl-012.
6. **The environment was not preflighted.** The first start was refused for a missing variable that nothing
   declares. → **bug-014.**
7. **The multi-session repository cost incidents:**
   - a session reverted another's files;
   - a history rewrite hit a live branch;
   - an approval landed on a task branch;
   - the dry runs' transcripts were deleted by a worktree removal;
   - consents in chat were committed without an approver line.

   → **dl-014.**
8. **Notes were sometimes inaccurate.** W1–W2 Execution notes claimed fixes or results that were not there (task-001,
   002, 003, 007). Reviews caught them. → dl-011's recorded review rounds.
9. **The S1 signal is weak.** n = 3, and executions 1 and 2 disagree on the same runs; the other scenarios ran once.
   → dl-012 (repetitions).
10. **The plan drifted.** The WingFoil pin moved from the `3df305e` pre-release to v0.2.2 (task-049), the slice to
    one arm, and the campaign to 19 runs. plan-003's constraints and this element's Goal ("21 runs on Sonnet 5,
    plus the Opus slice") still read as planned. They are left as written, as the record of the plan; this section
    and the checklist record what happened.
11. **Housekeeping:** 47 benchmark images (12.6 GB) accumulated on the host. → **bug-015.**

### Actions recorded

| Element | What |
|---|---|
| [bug-013](../bug/bug-013-a-running-campaign-cannot-be-stopped-cleanly-and-keeps-spending-after-systematic-failures.md) | a clean stop and a fail-fast rule for a campaign |
| [bug-014](../bug/bug-014-a-campaign-does-not-preflight-the-environment-its-harness-needs.md) | `campaign validate` lists and checks the run's environment |
| [bug-015](../bug/bug-015-dry-run-and-scoring-images-accumulate-on-the-host.md) | the benchmark's images pruned |
| [dl-010](../decision-log/dl-010-validation-exercises-every-arm-the-largest-step-and-the-harness-environment.md) | validation in every arm, on the largest step |
| [dl-011](../decision-log/dl-011-an-independent-review-for-every-task-in-kanban-delivery.md) | independent review written into `kanban-delivery` |
| [dl-012](../decision-log/dl-012-budget-and-estimate-rebased-on-v0-1-s-measurements.md) | budget, estimate margin, campaign-wide ceiling, repetitions, partial re-runs |
| [dl-013](../decision-log/dl-013-saturation-levels-of-delegation-and-an-external-neutral-control.md) | calibration §10's three items for the next specification |
| [dl-014](../decision-log/dl-014-process-safeguards-for-a-repository-worked-by-several-sessions.md) | the multi-session rules as a directive |

They join, for v0.2's planning:

- bug-005 (a bug never closes; ten fixed bugs still read `approved`), bug-012 (auxiliary-model tokens);
- dl-007 (Claude 5.5 models and a model ladder), dl-008 (the cost-quality frontier), dl-009 (findings linked to
  WingFoil).

**Smaller items for triage at v0.2's planning** (left in task notes, not filed):

- classifier v2 candidates (task-007);
- an empty seed failing with git's message (task-005);
- a debug flag for unexpected errors (task-003);
- a `scenario.yaml` symlink outside its scenario (task-001);
- path helpers following symlinks and splitting on spaces (task-042, review item 6);
- the ingest workflows' triage gate (task-009);
- ADR decisions checked against tasks (task-005);
- `features` as a conditional requirement (task-004);
- `run compare` without models (task-054);
- S1 1.1 stating step 5's shift-aware diff (calibration §8);
- a lighter wingfoil manual, measured (calibration §7);
- resuming after a first-request rate limit, unobserved (task-051).

### WingFoil usage notes handed to the approver

`docs/wingfoil-feedback/X_wingfoil-usage-notes.md`, N1–N48, is handed to the approver on 2026-10-05 for WingFoil's own
retrospective. It is untracked and never cleaned. This release added N36–N48:

| Note | Subject |
|---|---|
| N36 | a gate's reason committed verbatim, no echo |
| N37 | no `memory validate` |
| N38 | no field values on `memory add` |
| N39 | positive: the campaign's reject-back |
| N40 | approver decisions without a transition |
| N41 | a gate commits on any branch |
| N42 | role context not delivered at session start |
| N43 | no recommended agent manual |
| N44 | the tarball's bin not executable |
| N45 | copied configuration loses its approval provenance |
| N46 | `init`'s subject carries a plan id |
| N47 | `init` refuses the environment's identity |
| N48 | "illegal transition pending -> (none)" |

The benchmark's finding for WingFoil (M-K1 on S1, a decision-log note) was sent on 2026-10-05 to the WingFoil session
that ingests notes. Its filing and the way back follow dl-009.
