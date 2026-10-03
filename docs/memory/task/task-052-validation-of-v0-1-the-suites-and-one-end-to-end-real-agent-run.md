---
id: task-052-validation-of-v0-1-the-suites-and-one-end-to-end-real-agent-run
type: task
title: "Validation of v0.1: the suites and one end-to-end real-agent run"
status: pending
release: v0.1
wave: validation
features: []
acceptance: []
requirements: [REQ-NFR-04]
---

## Context

Plan-003 step 4, **validation**, in release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), after calibration
(task-049, task-050, approved with the revised budget's option A) and bug-010's fix (task-051). `release-cycle` 2:
"All acceptance tests green against the fake agent, coverage above 80 %, lint clean, one end-to-end run with the real
agent on the cheapest scenario. That run validates the release as a whole; a delivery wave check verified one wave's
'Ends with'. Its cost is a line of the release's spending ledger." Like a calibration task, it delivers no feature.

**What it does:**

- `npm test` (unit and acceptance, the fake agent) with coverage above 80 %, `npm run lint`, and
  `npm run test:docker` (the runner, the arms and the scenarios' oracles in real containers, WingFoil v0.2.2),
  on `main` as it stands after task-051.
- **One end-to-end run with the real agent**, through the whole chain the reference campaign will use:
  `bench campaign validate`, `bench campaign estimate`, `bench campaign run --allow-spending`, `bench score` with the
  hold-out, `bench run show`, `bench site build` locally (never published), and `bench transcripts pack` checked
  without a release being created. A real campaign execution, not a dry run: its campaign file carries the pins of
  calibration's profile (Claude Code 2.1.280, `claude-sonnet-5`, the ECB rate 0.8851, `step_time_s` 3600,
  `step_tokens` 20 000 000) and option A's run cap.
- **The cheapest scenario:** **S3@1.0 in the baseline arm** (its counted dry run: 0.84 €, the lowest of calibration;
  S2's baseline 0.94 €). One run, no harness to build.

**Spending — consented by this task's pending → backlog approval:**

| Run | Model | Cap (`run_cost_eur`) | Ceiling (`ceiling_eur`) | Expected |
|---|---|---|---|---|
| S3@1.0 × baseline × 1 | Sonnet 5 (Claude Code 2.1.280) | 3 € | 3 € | about 0.85 € |

The agent runs on the maintainer's subscription, from the main checkout (so that its git-ignored transcript outlives
the task branch), with `BENCH_AGENT_TOKEN_FILE` naming the token file calibration used; its content is never read.
A run that fails is a ledger line and is not re-run without a new consent; a rate limit is now waited out
(task-051).

**Left to the design phase:** where the validation's campaign file and its execution live (committed under
`campaigns/` and `results/<id>/<n>/`, or kept out of the repository as W3's wave check was), and what of the chain
is checked by hand against what.

**Out of scope:** the reference campaign (plan-003 step 5) and its file; publishing.

**Done** means: the suites green on `main` with the figures recorded; the run completed, scored and shown, the site
built from it, its transcript packable, and its cost a ledger line; anything the chain gets wrong filed as a bug.

## Acceptance criteria

<!-- A validation task: no Gherkin scenario. What is checked at review: the suites' figures, the run's record,
     score and ledger line, the site build and the pack check, each with its output. -->

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Validation of v0.1: the suites and one end-to-end real-agent run"`
  — declared: creates the element at `draft` and commits it. Observed: `98a9f7c wf(task): add …`.
