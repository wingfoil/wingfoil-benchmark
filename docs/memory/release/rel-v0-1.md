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
| W4 — Scenario hygiene | F3.5 hold-out integration · F3.2 validator and leak scan · F3.4 scenario versioning | — | a scenario validated, with its oracle kept outside the container | — |
| W5 — Cost control | F3.3 dry run · F1.2 cost estimate · F1.3 budget guard | — | a campaign refuses to start above the ceiling | — |
| W6 — First scores | F4.1 hidden-test oracle · F4.3 cost metrics · F3.6 expected failures | — | pass/fail and cost per run, with expected failures marked | — |
| W7 — First content | F6.1 S1 conformance · F6.2 S2 injected bugs · F5.1 results store | — | S1 and S2 scored in all three arms | — |
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

**Due before the waves that need them:** dl-001 (per-step oracle suites) before W6 and W7; dl-002
(third-party material pinned by `commit` or `sha256`, and S1's full SHA) before W7; the interim
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

## Release checklist

- [x] release-planning: scope approved (planning → in-development, `8c5c7e6`; plan: plan-003)
- [ ] delivery: W1–W11 done, every wave's "Ends with" verified (W1 done: task-001, task-002, task-003; W2 done: task-004, task-005, task-006, task-007; W3 done: task-011, task-012, task-013, task-014, task-015)
- [ ] calibration: dry runs in every arm, budget revised (`docs/calibration/v0.1.md`)
- [ ] validation: acceptance green on the fake agent, coverage > 80%, lint clean, one real-agent end-to-end run
- [ ] campaign: reference campaign published (campaign: —)
- [ ] publishing: tag `v0.1`, repository public, site published, release notes, transcripts attached
- [ ] retrospective: section below written; WingFoil usage notes handed to the approver

## Retrospective

<!-- What went well, what to change, and the WingFoil usage notes handed to WingFoil. -->
