---
id: rel-v0-1
type: release
title: "v0.1"
status: in-development
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
| W8 — Continuity and governance | F6.3 S3 multi-session evolution · F6.8 S8 directive compliance · F4.8 tool-neutral governance metrics | — | S3 and S8 scored | — |
| W9 — Quality | F4.2 static quality · F4.7 next-change cost · F4.4 setup/step split and break-even | — | the full quality and cost picture per run | — |
| W10 — Determinism and findings | F4.5 determinism metric · F5.3 run detail · F5.4 finding note | F4.5 | determinism measured, and a first finding note ready for WingFoil | — |
| W11 — Publish | F5.5 landing page · F5.8 method page · F5.6 manual publish | — | first preliminary result public; repository public | — |

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

## Release checklist

- [x] release-planning: scope approved (planning → in-development, `8c5c7e6`; plan: plan-003)
- [ ] delivery: W1–W11 done, every wave's "Ends with" verified (W1 done: task-001, task-002, task-003; W2 done: task-004, task-005, task-006, task-007; W3 done: task-011, task-012, task-013, task-014, task-015; W4 done: task-016, task-017, task-018, task-020, task-019; W5 done: task-021, task-022, task-023, task-024, task-025; W6 done: task-026, task-027, task-028, task-029, task-030; W7 done: task-031, task-032, task-033, task-034)
- [ ] calibration: dry runs in every arm, budget revised (`docs/calibration/v0.1.md`)
- [ ] validation: acceptance green on the fake agent, coverage > 80%, lint clean, one real-agent end-to-end run
- [ ] campaign: reference campaign published (campaign: —)
- [ ] publishing: tag `v0.1`, repository public, site published, release notes, transcripts attached
- [ ] retrospective: section below written; WingFoil usage notes handed to the approver

## Retrospective

<!-- What went well, what to change, and the WingFoil usage notes handed to WingFoil. -->
