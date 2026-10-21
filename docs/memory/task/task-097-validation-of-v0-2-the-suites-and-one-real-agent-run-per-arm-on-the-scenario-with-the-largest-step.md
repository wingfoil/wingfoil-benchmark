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
- `npx wingfoil memory submit task-097-…` (draft → pending), on main. Declared: one commit, `status: pending`.
  Observed: `d44df6c8`. Matches.
- **pending → backlog** (`4405e082`): run by the approver from the main checkout with the drafted reason. The
  approver then asked in chat for this session to approve; its `memory approve` ran after theirs and was refused,
  "illegal transition backlog -> approved for type 'task'", with no commit: the gate had already passed. The approver's
  own approval is the consent.
- `npx wingfoil memory submit task-097-…` (backlog → in-progress): `6bdd4518`. Matches. WIP: no other task open.
- **The full suites** (`scripts/full-suites.sh main`, the load low): on `6bdd4518`, not dirty, LINT 0, TEST 0 (1660
  passed), BUILD 0, BIN 0 (8), DOCKER 0 (24, none skipped); log
  `.cache/full-suites/2026-10-21/main-6bdd4518-222351.txt`; coverage 97.57 % statements, 90.83 % branches.

### The runs (2026-10-21, 20:34–21:15 UTC)

`bench campaign run campaigns/v0-2-validation.yaml --allow-spending`, then the same for
`v0-2-validation-bridge.yaml`, from the main checkout, with `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token`,
`BENCH_WINGFOIL_REPO`, `BENCH_SPECKIT_REPO` (and `BENCH_HOLDOUT_PATH` for `score`). The estimates as the Design (4.59 € and 1.15 €), under each `warn_eur`:
no question asked. The bridge's run printed "arm wingfoil: read from commit 2441243b8e37, which holds its pinned
digest". Both executions `completed` (`execution.json`).

| Execution | Arm | Cost | Agent time | Turns | Final public | Hold-out |
|---|---|---|---|---|---|---|
| `da13d57a65b5/1` | baseline | 0.4347 USD (0.3876 €) | 211 s | 24 | 165/165 | 48/48 |
| | baseline-docs | 0.4654 USD (0.4150 €) | 214 s | 30 | 158/165 | 43/48 |
| | wingfoil | 0.6874 USD (0.6130 €) | 268 s | 46 | 164/165 | 45/48 |
| | speckit | 0.5347 USD (0.4768 €) | 368 s | 33 | 164/165 | 45/48 |
| | speckit-docs | 0.3854 USD (0.3437 €) | 192 s | 25 | 164/165 | 45/48 |
| | openspec | 0.9527 USD (0.8495 €) | 342 s | 77 | 165/165 | 48/48 |
| | openspec-docs | 0.3320 USD (0.2961 €) | 170 s | 23 | 164/165 | 45/48 |
| `27f0119be0ff/1` | baseline | 0.3919 USD (0.3495 €) | 210 s | 24 | 164/165 | 45/48 |
| | wingfoil (v0.2.2) | 0.7177 USD (0.6400 €) | 426 s | 52 | 165/165 | 48/48 |

- **Spent: 4.9019 USD (4.3712 €)** of the 9 € consented, the sum of the nine rounded ledger lines (exactly 4.90185
  USD, 4.37098 €): 3.7923 and 1.1096 USD; each run 0.908 to 1.28 times its calibration dry run.
- **Every run:** `completed`, one attempt, no intervention; Claude Code 2.1.300, `claude-sonnet-5-5` at `medium`,
  priced `list`, the only model in every step; the arm digest its campaign pins, the bridge's wingfoil
  `680b19f27c9f` with `arm_source` commit `2441243b`, every other `{ tree: true }`. The token scan of both executions'
  results (`grep -rlFf`, the value never printed): clean; no `bench-` container left; a ledger line each.
- **The chain:** `bench score <id>/1 --holdout` wrote both `aggregate.json` (7 and 2 groups, n = 1); `bench run show`
  of all nine, exit 0; `bench site build` of both, locally (never published); `bench transcripts pack` of both
  (35 and 10 transcripts, the harness artifacts 3 and 1), with the token file named so that the pack scans for its
  value, exit 0: the `gh release create` it prints not run. `releases/` is git-ignored.
- **S1's step 5 varies by run:** in calibration wingfoil lost seven public tests (158/165) and the others one; here
  baseline-docs lost seven (158/165, 43/48) and baseline and openspec none. calibration §8's H6 signal on v0.3.0 is
  not repeated at n = 1: the campaign's three runs per arm are needed to read it.
- **`bench campaign validate`** of both files in the runs' environment (recorded after review round 1, which found it
  missing from these notes; the runs' own preflight checks the same before spending): `da13d57a65b5` valid, every
  variable `set` (token file, WingFoil and Spec Kit clones, hold-out), effort `medium`; `27f0119be0ff` valid, "arm
  wingfoil: read from commit 2441243b8e37", every variable `set`. Exit 0.
- **No bug filed:** the chain did nothing wrong. rel-v0-2's validation is checked when this task is done.

## Review notes

- **Round 1** (an independent read-only agent, `f8c8362b` and `8ea268f4`): no blocker; every figure, pin, ledger
  row and the campaign files checked against the stored runs. Should-fix: the total mixed rounded and exact sums;
  "six" for 158/165 (seven); `bench campaign validate` in the run environment not recorded. Nits: coverage not
  stated; 0.908 rounded up; no line on bugs filed. All fixed in these notes.

