---
id: task-097-validation-of-v0-2-the-suites-and-one-real-agent-run-per-arm-on-the-scenario-with-the-largest-step
type: task
title: "Validation of v0.2: the suites and one real-agent run per arm on the scenario with the largest step"
status: in-progress
release: v0.2
wave: validation
features: []
acceptance: []
requirements: [REQ-CLI-01, REQ-CLI-02, REQ-CLI-03, REQ-CLI-06, REQ-CLI-08, REQ-CLI-09, REQ-CLI-11, REQ-FMT-13, REQ-RUN-19]
fixes: []
tags: ["validation","real-agent"]
---

## Context

plan-004 step 4 (validation, `release-cycle` 4 › validation, role qa), after calibration (task-096, done
`c57d0f48`, the revised budget approved). `release-cycle`'s validation phase (version 3, dl-010 B): "All acceptance
tests green against the fake agent, coverage above 80%, lint clean, the Docker suite green. Then, with the real agent,
one run per arm of the release's campaign, all on one scenario shared by every arm: the one with the largest step
transcript in calibration's dry runs, across all arms […]. Before any run, every environment variable and path each
arm needs is checked (campaign validate). The approver consents to the runs before they start, with the model and a
ceiling estimated from calibration's dry runs: the phase's approval is that consent. The runs are made from the main
checkout, and each is a line of the release's spending ledger." Like a calibration task, it delivers no feature.

**Done** means: the full suites green on main as it stands; the validation runs completed, scored and shown, the site
built locally (never published), the transcripts' pack checked without a release; each run a ledger line; anything
the chain gets wrong filed as a bug (not fixed here); rel-v0-2's validation checked.

## Acceptance criteria

<!-- A validation: no Gherkin scenario and no product code. A defect becomes a bug, fixed through its own task. -->

1. The full suites (`scripts/full-suites.sh main`) green on main's `HEAD` at the start of the runs. **Characterization.**
2. Every run of both validation campaigns `completed`, scored with the hold-out, shown by `bench run show`, built into
   the site locally, packed by `bench transcripts pack` (no release), with its pins checked against the campaign file
   and its token scan clean. **Characterization.**

## Design

### The scenario: S1@1.0

Calibration's largest step transcript (the rule's "across all arms", every dry run): **S1** (539 KB, Haiku 5.5 S1
wingfoil step 2; on Opus 5.5 S1 wingfoil step 3, 283 KB). On the campaign's default model alone it would be S2 (209 KB,
openspec step 3, against S1's 187 KB). S1 is taken: it holds the largest step of the calibration, it is the longest
scenario (five steps) and the one the campaign repeats three times; it costs about twice S2.

### The runs: two campaign files, from the main checkout

- **`campaigns/v0-2-validation.yaml`:** S1@1.0 in the reference campaign's seven arms, one run each, on Sonnet 5.5;
  every pin the reference campaign's (`v0-2-reference.yaml`: harnesses, agent 2.1.300 at `medium`, `arm_digests`,
  approver policy, caps, rate, `fail_fast`), but no slice, `repetitions: { S1: 1 }` and its own budget.
- **`campaigns/v0-2-validation-bridge.yaml`:** S1@1.0 in the bridge's wingfoil arm (WingFoil v0.2.2, its arm read from
  history by `680b19f27c9f`) and the baseline, which a campaign must include (REQ-FMT-01, T7), one run each: a real
  campaign run of an arm read from history has not run yet (calibration's were dry runs). The bridge's baseline-docs
  arm is left out (its arm is the tree's; only its rules differ).
- **The chain, as the campaigns will run it:** `bench campaign validate` (every variable and path listed), `bench
  campaign estimate`, `bench campaign run --allow-spending`, `bench score <id>/<n> --holdout …`, `bench run show` of
  each run, `bench site build` locally (never `publish`), `bench transcripts pack` checked with no release created.
- **Estimate** (`bench campaign estimate`, from calibration's S1 dry runs, with dl-012's 35 % margin): `da13d57a65b5`
  (the seven arms) high 5.1429 USD, 4.59 €; `27f0119be0ff` (the bridge's two) high 1.2879 USD, 1.15 €: **5.74 € high,
  about 4.25 € expected**. Both validate; the bridge's names its wingfoil arm "read from commit 2441243b8e37".

### Spending — consented by this task's pending → backlog approval

| Campaign | Runs | Model | Cap (`run_cost_eur`) | Budget (warn / ceiling) | Expected |
|---|---|---|---|---|---|
| `v0-2-validation.yaml` | S1 × 7 arms × 1 | Sonnet 5.5 (Claude Code 2.1.300, `medium`) | 5 € | 6 / 7 € | about 3.4 € |
| `v0-2-validation-bridge.yaml` | S1 × baseline, wingfoil (v0.2.2) × 1 | the same | 5 € | 1.5 / 2 € | about 0.85 € |

The runs go one at a time, from the main checkout, with `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token` (never read
here), `BENCH_WINGFOIL_REPO`, `BENCH_SPECKIT_REPO`, `BENCH_HOLDOUT_PATH`. A run that fails is recorded and not re-run
without new consent; the campaign stops at its ceiling, or by `fail_fast`.

### What is committed

The two campaign files, both executions (`results/<id>/1/`, transcripts excepted, REQ-RES-06), the ledger lines and
these notes, on main (the runs' results are main's). Nothing else: no code.

### Checks, review

The full suites before the runs (on demand, at low load). The executions' records and these notes reviewed by an
independent read-only agent, rounds until clean, before in-review.

## Execution notes

- `npx wingfoil memory add --type task --title "Validation of v0.2: the suites and one real-agent run per arm on the
  scenario with the largest step" --tags "validation,real-agent"`, on main. Declared: the element from the template
  in `draft`, one commit. Observed: `a75a8bf4`, `status: draft`, `tags` written, the other fields empty (W-02).
  Matches.
