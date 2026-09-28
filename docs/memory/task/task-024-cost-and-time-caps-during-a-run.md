---
id: task-024-cost-and-time-caps-during-a-run
type: task
title: "Cost and time caps during a run"
status: pending
release: v0.1
wave: W5
features: [F1.3]
acceptance: [campaign.feature]
requirements: [REQ-RUN-08, REQ-RUN-13]
---

## Context

Fourth and last task of wave **W5 — Cost control** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)).
task-023 keeps a campaign from starting above its ceiling; this task stops what has started. It
completes F1.3 before calibration's dry runs (plan-003 step 3), which are the first real runs of real
scenarios.

Scope (REQ-RUN-08, REQ-RUN-13):

- **The run's cost cap, during a step.** When a run's API-equivalent cost reaches `run_cost_eur`, the
  step is stopped, the run ends with the outcome `cap reached`, and the snapshot at that moment is kept
  for scoring (`campaign.feature` @F1.3). Today the runner only refuses to *start* a step or a resume
  with nothing left, and passes the rest to the agent as `--max-budget-usd` (adr-002 decision 12).
- **The step caps,** declared since W1 and not enforced: a step is killed at `step_time_s`, or when its
  tokens exceed `step_tokens`.
- **The campaign's ceiling, during the campaign.** When the cost of the runs so far reaches
  `ceiling_eur`, no further run starts; the campaign ends with the outcome `budget exhausted`, and the
  completed runs are kept and can be scored.
- **Subscription quota (REQ-RUN-13).** A session that fails because the subscription's usage limit is
  reached gives the step the outcome `quota exhausted`; the campaign stops starting runs, and completed
  runs are kept.

**What is not known yet, and why this task spends.** W2 documented `--max-budget-usd` but never saw it
cut a session off; W3 could not observe what it compares against on a resume, and decided the budget
guard must not rely on it (rel-v0-1, W3 carry-overs). The design phase decides whether the runner
enforces the cap itself (from the usage the stream reports as the session runs) or with the agent's
flag, and that choice rests on what the pinned agent actually does.

**Spending, proposed and to be confirmed at this task's pending → backlog gate:** a few short real
sessions on Haiku 4.5, **up to 0.30 USD in all**, with a tiny `--max-budget-usd`, to observe how a
session cut off by it ends (on a first invocation and on a resume), and whether the stream reports
usage before its `result` event. Each is a line of the [v0.1 ledger](../../calibration/v0.1-ledger.md).
The quota message is not provoked (it would take the subscription's whole limit): its detection is
built on the documented shape and marked unverified. Without the spending, the cap is enforced by
the runner alone and marked unverified against the real agent.

**Done** means: `campaign.feature` @F1.3 "A run that exceeds its own cost cap is stopped" and "A
campaign stops starting new runs when the budget is spent" pass with the fake agent; the step caps and
`quota exhausted` are tested; the real agent's behaviour at its cap is observed within the limit above;
tests, coverage and lint pass.

## Acceptance criteria

Preliminary classification (confirmed in the design phase).

- `campaign.feature` @F1.3 "A run that exceeds its own cost cap is stopped" — outcome `cap reached`,
  snapshot kept. **red-first**
- `campaign.feature` @F1.3 "A campaign stops starting new runs when the budget is spent" — outcome
  `budget exhausted`, completed runs kept. **red-first**
- REQ-RUN-08 — a step killed at `step_time_s`, and when its tokens exceed `step_tokens`. **red-first**
- REQ-RUN-13 — a session failing on the subscription's usage limit: step `quota exhausted`, no further
  run starts, completed runs kept. **red-first**
- A step or resume is not started with nothing left of the run's cap (task-006, task-007).
  **characterization**
- The pinned agent observed at its `--max-budget-usd` (real sessions, within the limit above).
  **red-first**

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
