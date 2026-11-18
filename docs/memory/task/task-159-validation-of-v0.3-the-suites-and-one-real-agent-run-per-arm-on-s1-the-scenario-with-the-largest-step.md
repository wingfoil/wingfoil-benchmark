---
id: task-159-validation-of-v0.3-the-suites-and-one-real-agent-run-per-arm-on-s1-the-scenario-with-the-largest-step
type: task
title: "Validation of v0.3: the suites and one real-agent run per arm on S1, the scenario with the largest step"
status: in-progress
release: v0.3
wave: validation
features: []
acceptance: []
requirements: [REQ-CLI-01, REQ-CLI-02, REQ-CLI-03, REQ-CLI-06, REQ-CLI-08, REQ-CLI-09, REQ-CLI-11, REQ-FMT-13, REQ-RUN-19]
fixes: []
tags: ["validation","real-agent"]
---

## Context

This is plan-005 step 4 (validation, `release-cycle` 7, role qa), after calibration (task-154, the budget approved on
2026-11-18). The phase asks for the suites green, then one real-agent run per arm of the release's campaign, all on the
scenario with the largest step transcript in calibration's dry runs (dl-010 B). Every arm's environment is checked
first, the approver consents with the model and a ceiling, the runs start from the main checkout, and each is a ledger
line.

**Done** means:

- the full suites are green on main;
- the thirteen runs completed, scored, shown, built into a local site and packed, with nothing published;
- each run has its ledger line;
- anything the chain gets wrong is filed as a bug and not fixed here;
- rel-v0-3's Release checklist records the validation.

## Acceptance criteria

<!-- A validation: no Gherkin scenario and no product code. A defect becomes a bug, fixed through its own task. -->

1. **The suites** (characterization): `scripts/full-suites.sh main` is green on main's `HEAD` before the first run.
2. **The campaign file** (characterization, a test of the file): `campaigns/v0-3-validation.yaml` holds every pin of
   `campaigns/v0-3-reference.yaml`, with S1@1.1 alone, one repetition, no Haiku slice and the budget below.
3. **The environment:** `bench campaign validate` lists every variable and path the thirteen arms need, and each is set.
4. **The runs, on the approver's spending consent only:** all thirteen `completed`, each with its review loop recorded.
5. **The chain** (characterization): every run is scored with the hold-out, shown by `bench run show`, built with
   `bench site build` locally (never published) and packed by `bench transcripts pack` (no release created). Its pins
   match the campaign file, and its secret scan is clean.
6. **The ledger:** `docs/calibration/v0.3-ledger.md` gains one line per run, with the steps' and the loop's cost.
7. **rel-v0-3:** the Release checklist names this task and the execution.
8. **Checks:** `scripts/pre-review.sh main` and an independent read-only review (dl-020).

## Design

### The scenario: S1@1.1

Calibration's largest step transcript across every 1.1 dry run is S1's: 399 836 bytes (`dry-runs/261`, wingfoil on Haiku
5.5, step 2). On Sonnet 5.5 alone the largest is S3's (297 991 bytes, `dry-runs/191`, openspec-configured, step 4). The
rule reads every dry run across all arms, as task-097 read it, so S1 is taken. It is also the longest scenario (five
steps) and the one the reference campaign repeats.

### The runs

| Field | Value |
|---|---|
| Scenario | S1@1.1, five steps |
| Arms | the reference campaign's thirteen: baseline, baseline-docs, wingfoil, speckit, speckit-docs, openspec, openspec-docs, wingfoil-configured, baseline-docs-configured, speckit-configured, speckit-docs-configured, openspec-configured, openspec-docs-configured |
| Repetitions | one per arm, thirteen runs |
| Model | Sonnet 5.5, Claude Code 2.1.300 at effort medium; no Haiku slice |
| Review loop | the reference campaign's, after each run: Sonnet 5.5, at most 5 rounds |
| Pins | WingFoil v0.3.1, Spec Kit v1.1.0, OpenSpec 1.14.0, approver policy v5, the arm digests of `v0-3-reference.yaml` |

The harness's chain, as the campaign will run it: `campaign validate`, `campaign estimate`, `campaign run
--allow-spending`, `score --holdout`, `run show`, `site build` and `transcripts pack`.

### Spending, consented by this task's pending → backlog approval

`bench campaign estimate` on the file, from calibration's S1 dry runs: **low 8.18 EUR, mean 8.76 EUR, high 9.73 EUR**,
API-equivalent at 0.8917 EUR/USD, nothing billed per token.

| Budget | Value | Why |
|---|---|---|
| `budget.warn_eur` | 12 | 1.23 times the estimate's high |
| `budget.ceiling_eur` | 15 | 1.54 times the estimate's high, v0.2's ratio |
| `caps.run_cost_eur` | 3 | the reference campaign's; the dearest S1 dry run's steps cost 1.32 EUR |
| Review loop | 2 EUR a session, at most 5 rounds | the reference campaign's; a loop's own bound is 18 EUR |

The ceiling is checked between runs, so one pathological run could pass it by at most its own bounds. `fail_fast` stops
the campaign after three runs failing with the same error. A run that fails is recorded and is not re-run without new
consent. The runs go one at a time, from the main checkout, behind the load gate.

## Execution notes

**The suites (criterion 1).** `scripts/full-suites.sh main` at `9e35fcc3`: lint, tests (2521 passed), build, binary and
Docker stages green, statement coverage 97.05 %.

**The runs (criterion 4).** Execution `2ee46ad9e617/1`, 2026-11-18, 16:45 to 17:53 UTC: thirteen runs, all `completed`,
none failed, each with its review loop recorded and clean. Twelve loops were clean at round 1. The wingfoil arm's was
clean at round 2: round 1 found one blocker in the run's own code (a `./index.ts` import that its type check rejects),
which the fixer corrected.

**Spending.** 8.5909 EUR API-equivalent, nothing billed per token: the steps 7.5161 EUR (8.4289 USD), the review loops
1.0749 EUR. The estimate's high was 9.7266 EUR, the warning 12 EUR and the ceiling 15 EUR.

**The chain (criterion 5).** `bench score` with the hold-out: every arm 165/165 at the final step and 48/48 on the
hold-out, the hold-out checkout unchanged. S1@1.1 saturates at this size, so these runs validate the chain and say
nothing about the arms' relative quality. `bench run show` read all thirteen. `bench transcripts pack` wrote 65
transcripts and 3 harness artifacts under the git-ignored `releases/2ee46ad9e617-1/`; no release was created.
`bench site build` built 55 pages in a throwaway worktree, since removed, with a catalogue entry that existed only
there: `site/` in the main checkout is what `bench site publish` sends, so the validation never entered it. Nothing was
published. Every run's agent, effort, model, approver policy, arm digest and harness version match the campaign file.
The secret scan is clean on the results, on both archives and on the built site.

**The ledger and the release (criteria 6 and 7).** Thirteen lines in `docs/calibration/v0.3-ledger.md`, and rel-v0-3's
Release checklist names this task and the execution.
