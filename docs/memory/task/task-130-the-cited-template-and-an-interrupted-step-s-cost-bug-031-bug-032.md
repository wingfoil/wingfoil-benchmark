---
id: task-130-the-cited-template-and-an-interrupted-step-s-cost-bug-031-bug-032
type: task
title: "The cited template and an interrupted step's cost (bug-031, bug-032)"
status: in-progress
release: v0.3
wave: W16
features: [F5.4, F2.3]
acceptance:
  - "results.feature#A finding cites the template of the WingFoil the campaign pinned"
  - "runner.feature#A step that ends with no result event is counted at its bound"
requirements: [REQ-RES-05, REQ-RUN-09]
fixes:
  - bug-031-findings-cite-the-v0-2-2-template-through-template-commit
  - bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent
tags: ["v0.3","results","runner","w16"]
---

## Context

The third W16 task of [plan-005](../../plans/plan-005-release-v0-3.md), after
[task-129](task-129-m-r2-v2-m-k3-and-m-k4-the-variance-rule-on-every-page-bug-028-bug-029-bug-030.md):
[bug-031](../bug/bug-031-findings-cite-the-v0-2-2-template-through-template-commit.md) (a finding note cites a
constant template, today `TEMPLATE_COMMIT = 'v0.3.0 (cc31d7a8)'` in `src/results/finding.ts`) and
[bug-032](../bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md) (an interrupted or killed step
loses the cost it spent). Requirements 1.49 (task-126) state both fixes: REQ-RES-05 (the template read from the
campaign's pin) and REQ-RUN-09 (an invocation with no result event at its bound, an interruption `interrupted`, an
interrupted dry run keeping its record); task-126's Design drafted the two scenarios. The approver asked for the W16
tasks in plan-005's order (chat, 2026-11-02). No real-agent session, no spending.

## Acceptance criteria

1. **Red-first, the cited template** (the drafted scenario "A finding cites the template of the WingFoil the campaign
   pinned", `results.feature` @F5.4): a finding note names the template of the WingFoil the execution's campaign pinned
   (`harnesses.wingfoil.version` and the harness commit its runs recorded), never a constant: 0.3.1's for an execution
   pinning 0.3.1; each arm's when the note's arms ran different WingFoil versions (a bridge); none when no arm ran
   WingFoil. The section's structure is unchanged.
2. **Red-first, an invocation with no result event** (the drafted scenario "A step that ends with no result event is
   counted at its bound", `runner.feature` @F2.3): a Claude Code invocation whose session ends with no result event
   (failed, killed, interrupted) is counted at its bound with `cost_reported: false`, never as zero; the step's earlier
   invocations keep the cost they reported.
3. **Red-first, an interruption:** SIGINT or SIGTERM of the runner during a step records the step `interrupted` at its
   bound, REQ-RUN-19's killed step, not `failed` at its reported cost: the `docker exec` client is kept out of the
   terminal's interrupt, so that the runner ends it.
4. **Red-first, an interrupted dry run** keeps its record and the cost its steps spent; running it again starts a new
   dry run, as before.
5. The method page's `#killed-step` states the no-result-event and interruption cases.
6. Checks: prettier on every changed file, `tsc`, eslint, `scripts/pre-review.sh main`; an independent review
   (dl-020); the full suites on the approver's go.

## Design

- **The template** (`src/results/finding.ts`): `TEMPLATE_COMMIT` removed; the note reads the execution's pins
  (`campaign.yaml` or `dry-run.yaml`, through the existing readers) and each arm's runs' recorded WingFoil (the
  harness commit `run.json` records, as task-082's harness label reads it), and names `WingFoil <version> (<short
  commit>)` per arm that ran it; none when no arm did.
- **No result event** (`src/agents/claude-code.ts`): a session with no result event returns `costUnknown: true` beside
  its error, which the runner already counts at the invocation's bound (REQ-RUN-09 as amended in 1.35, Codex's case,
  `src/runner/run.ts`'s `settle`); a test of the runner's step record with `cost_reported: false`.
- **The interruption** (`src/core/ports/process.ts` or the Docker port): the `docker exec` child started in its own
  process group (`detached`), so the terminal's SIGINT reaches the runner alone, which kills the step's container as
  REQ-RUN-19 says; the step is then settled `interrupted` at its bound (`interruption === 'during'`).
- **The dry run** (`src/runner/dry-run.ts`, `src/cli/dry-run.ts`): its record written with the steps it ran when
  interrupted, the spent cost kept; a test interrupting a fake-agent dry run.
- **Scenarios:** the two drafted in task-126's Design, written into `results.feature` and `runner.feature` with their
  tests, red first.

## Execution notes

- **Red first:** the template scenario failed on the constant; the no-result-event scenario failed on the old code
  (checked by stashing `src/`: no bound, no own process group); the dry run's summary test failed without its change
  (checked the same way). The process port's tests were written with its code.
- **Deviations from the Design**, each within requirements 1.49:
  - The template's version is the one the run recorded (`run.json`'s `harness.version`, the pin copied with the run),
    else the campaign's pin when it pins one WingFoil; a run recording neither names its commit alone
    (`WingFoil 3df305ea`, the test fixture's case).
  - Node's `execFile` ignores `detached` (checked: the child kept the parent's group), so `ownProcessGroup` runs the
    process with `spawn`, with the same output bound, time limit and result; only the agent's `docker exec` asks for
    it, so a scoring or git process interrupted with the CLI still stops with it.
  - The dry run's record already kept a step's bound when the interrupt was settled during it: what lost the cost was
    the race the process group removes, and the printed summary, which counted reported costs only; it now counts a
    step's bound, marked "(at its bound)".
- `wingfoil memory add`, `submit` (draft → pending, backlog → in-progress): as declared.
