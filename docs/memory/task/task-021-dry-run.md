---
id: task-021-dry-run
type: task
title: "Dry run"
status: pending
release: v0.1
wave: W5
features: [F3.3]
acceptance: [scenarios.feature]
requirements: [REQ-CLI-05, REQ-RES-01, REQ-NFR-06]
---

## Context

First task of wave **W5 — Cost control** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), whose
"Ends with" is "a campaign refuses to start above the ceiling". The estimate (F1.2, task-022) is built
from dry-run costs, and the guard (F1.3, task-023) from the estimate, so the dry run comes first.

Scope of F3.3:

- **`bench scenario dry-run <id>@<version> --arm <arm> [--model <id>]` (REQ-CLI-05).** One run of the
  scenario version in one arm, through the same runner as a campaign's runs: same container, same
  setup, same fresh-session steps, same neutral approver, same caps. A dry run is not a cheaper run; it
  is a real one, marked.
- **Stored under `results/dry-runs/` (REQ-RES-01)**, never under a campaign, and never read by
  aggregation. Each dry run records its cost per step and in total, with the scenario version's content
  hash (task-018), the arm, the model, the agent version and the harness commit it ran: this record is
  the **dry-run cost** of that scenario version in that arm, on that model, which task-022 reads.
- **Marked as a dry run** in its `run.json`, so that nothing downstream can mistake it for a campaign
  run (`scenarios.feature` @F3.3: it "never appears in published results").
- **Cost transparency (REQ-NFR-06), the dry-run half:** the command prints what it expects to spend
  before starting (the previous dry-run cost for the same key, or that there is none and the run's cost
  cap is the limit) and the actual cost when it finishes.
- **Spending stays deliberate.** A dry run with a real agent needs `--allow-spending`, as `campaign run`
  does (W5 plan-phase decision 5).

What a dry run of a real scenario costs is **calibration's** (plan-003 step 3), not this task's: S1,
S2, S3 and S8 arrive in W7 and W8. Here dry runs run T-scenarios against the fake agent, whose
replayed sessions report real costs; nothing is spent.

Left to the design phase: where a dry run takes the pins a campaign file would give it (agent
version, harness commit, caps, currency rate) — a fixed dry-run profile in the repository, or a
campaign file named on the command line; and which dry run counts when a key has several.

### W5 plan-phase decisions (proposed to the approver, 2026-09-28)

1. **Four tasks, in this order:** task-021 dry run (F3.3), task-022 cost estimate (F1.2), task-023
   budget guard at campaign start (F1.3, the refusals), task-024 cost and time caps during a run
   (F1.3, the stops, and REQ-RUN-13). The wave's "Ends with" holds after task-023; task-024 completes
   F1.3.
2. **A dry-run cost is keyed by scenario version, arm and model.** The estimate never scales one
   model's cost into another's: a key without a dry run is an error (`campaign.feature` @F1.2 @error).
   Consequence for calibration: the reference campaign's Opus 5 slice on S1 needs its own dry runs.
   This carries W3's finding (the wingfoil arm's first step cost eight times the baseline's) and
   adr-002's per-session cost floor into the estimate: both are in a measured cost, and neither needs
   a model of its own. The intervention cost W2 left to W5 is in it too, as resumes count in a run's
   cost (task-007).
3. **No real-agent half for W5's wave check.** The "Ends with" is a refusal before any session starts,
   which the fake agent shows in full: recorded fake dry-run costs, an estimate above `ceiling_eur`,
   `campaign run` refused with no session and no container. `real-agent-check` is not taken.
4. **The only spending in W5 is task-024's** (at most 0.30 USD on Haiku 4.5, consented at its
   pending → backlog gate), to observe how the pinned agent stops at `--max-budget-usd`, which W2 and
   W3 left unobserved.
5. **`--allow-spending` stays.** The guard adds a warning, a confirmation and a refusal on top of it;
   it does not replace the deliberate consent to spend (plan-003 constraint).

**Done** means: a dry run of a T-scenario in one arm is stored under `results/dry-runs/`, marked, with
its cost per step and in total under its key; the command prints the expected and the actual cost;
tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `scenarios.feature` @F3.3 "A dry run measures the real cost of a scenario in one arm" — with the fake
  agent standing in for the real one. **red-first**
- REQ-CLI-05 — the command, its arguments, and its errors (unknown scenario version, unknown arm, a
  version that fails validation). **red-first**
- REQ-RES-01 — dry runs are stored under `results/dry-runs/` and no campaign's results directory holds
  one. **red-first**
- REQ-NFR-06 — the expected cost is printed before the run starts and the actual cost after it ends.
  **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `71131d3`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W5 tasks of release v0.1` (`40c7c46`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-021-dry-run` → `92c8235`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
