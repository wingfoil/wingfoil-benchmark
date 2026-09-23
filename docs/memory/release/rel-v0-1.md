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
| W2 — Agent in the loop | F2.2 fresh-session steps · F2.3 Claude Code adapter · F2.4 neutral approver | F2.4 | a multi-step run with usage captured and interventions counted | — |
| W3 — Arms | F2.5 arm setups · F2.6 WingFoil under test · F2.7 arm activation (operating manuals) | — | the same scenario runs in the baseline, baseline-docs and wingfoil arms | — |
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

## Release checklist

- [x] release-planning: scope approved (planning → in-development, `8c5c7e6`; plan: plan-003)
- [ ] delivery: W1–W11 done, every wave's "Ends with" verified (W1 done: task-001, task-002, task-003)
- [ ] calibration: dry runs in every arm, budget revised (`docs/calibration/v0.1.md`)
- [ ] validation: acceptance green on the fake agent, coverage > 80%, lint clean, one real-agent end-to-end run
- [ ] campaign: reference campaign published (campaign: —)
- [ ] publishing: tag `v0.1`, repository public, site published, release notes, transcripts attached
- [ ] retrospective: section below written; WingFoil usage notes handed to the approver

## Retrospective

<!-- What went well, what to change, and the WingFoil usage notes handed to WingFoil. -->
