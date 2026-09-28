---
id: task-024-cost-and-time-caps-during-a-run
type: task
title: "Cost and time caps during a run"
status: in-progress
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

**Classification confirmed**, but for two criteria the observation below reshapes: REQ-RUN-08's step
caps are enforced as described under "The step caps", and REQ-RUN-13 is built on an unverified shape.
Test-first.

### What the pinned agent does at its caps (observed before designing; Execution notes, "Real sessions")

- **At `--max-budget-usd`, a session stops by itself, one turn past the cap at most:** exit 1, a
  `result` event with `subtype: error_max_budget_usd`, `is_error: true`, `terminal_reason:
  budget_exhausted`, `errors: ["Reached maximum budget ($0.04)"]`, and its real cost (0.0419 USD for a
  0.04 cap, 14 turns). What it did before the cut is in the workspace.
- **A resume's cap is compared with the resume's own spending**, not with the session's running total:
  with a cap below what the session had already cost, the resume still worked for two turns. The
  runner already passes each invocation what is left of the run's cap (task-006, task-007), which is
  what this needs.
- **The stream cannot price a session as it runs:** every `assistant` event carries a `usage`, but its
  `output_tokens` is the streaming start value (3 or 4 where the `result` counts 1349), and a price table
  would be needed besides. The runner enforces nothing from the stream.
- **A session killed by `timeout` leaves no `result` event:** exit 124, no cost reported, the work up to
  the kill in the workspace, no process left.

### The run's cost cap during a step — the agent's flag, recognised

The runner keeps passing what is left of `run_cost_eur` as `--max-budget-usd`, and **recognises the
stop**: the adapter reads `terminal_reason: budget_exhausted` as its own outcome, `cap reached`, instead
of a failure. The step then ends `cap reached`: its snapshot is committed and its patch kept, as for any
step (`campaign.feature` @F1.3: "the snapshot at that moment is kept for scoring"), and **the run ends
with the outcome `cap reached`**, no further step started. The same outcome, with no session started,
when nothing is left before a step or a resume (today an error). What the cap allows past itself — one
turn, 5% in C1 — is recorded, as the agent reports it; the method page states it (W11).

### The step caps (REQ-RUN-08)

- **`step_time_s`:** every invocation runs under `timeout -k 10 <seconds left of the step>` inside the
  container. Exit 124 or 137 ends the step `time cap reached`, snapshot kept. The killed invocation
  reported no cost, so the runner counts it at its **upper bound** — the `--max-budget-usd` it was
  given — for the run's cap and the campaign's ceiling, and records `cost_reported: false` on the step
  with that bound: the budget never counts less than was possibly spent.
- **`step_tokens`:** checked **between invocations**: a step whose tokens (input, output, cache creation
  and cache read, summed) exceed `step_tokens` is not resumed and ends `token cap reached`. Within one
  invocation the cost cap bounds it: the exec returns only at the end, and the stream's token counts are
  not final. This is a narrower reading of "killed when its tokens exceed", recorded as this task's
  decision.
- A step ended by a step cap is scored as it stands and **the run goes on**, as with the intervention
  cap (experiment design §3.5–3.6): a later step is a fresh session with its own caps.

### The campaign's ceiling during the campaign

`runPlan` keeps the campaign's running cost (every step, killed ones at their bound). Before each run, if
it has reached `ceiling_eur`, no run starts and the execution ends **`budget exhausted`**; the runs
already done are stored as always. `RunPlan` gains `ceilingEur`, set for a campaign; a dry run has none.
`RunSummary` gains `outcome`: `completed`, `budget exhausted` or `quota exhausted`.

### Subscription quota (REQ-RUN-13) — unverified

Not provoked (it would take the subscription's whole limit). A session whose `result` is an error and
whose `result` text or `errors` say the usage limit was reached is `quota exhausted`: the step ends so,
the run ends so, and no further run of the campaign starts (execution outcome `quota exhausted`).
The recognition is one function over the event, `isQuotaExhausted`, matching `usage limit` or
`rate_limit` case-insensitively; its tests use a constructed event, and the notes say so.

### Records and output

- `run.json`: a run's `outcome` may be `cap reached` or `quota exhausted`; a step's may be `cap reached`,
  `time cap reached`, `token cap reached` or `quota exhausted`, with `cost_reported: false` and
  `cost_bound_usd` on a killed one.
- `campaign run` prints `<k> runs completed, <m> failed` as today, then the other outcomes that
  occurred (`1 cap reached`), and `campaign ended: budget exhausted` or `… quota exhausted` when it did.
  Exit 0 only when every run completed and the campaign was not stopped.
- `latestDryRun` counts completed dry runs only (task-021): a dry run cut by its cap does not price a
  scenario.

### Modules

`agents/claude-code.ts` (the `cap reached` and `quota exhausted` readings), `agents/port.ts` (the
invocation's outcome kind), `agents/fake.ts` (a script can end a session either way, or run long),
`runner/run.ts` (timeouts, the outcomes, the running cost, the ceiling), `cli/run.ts` (the summary).

### Tests

- **Acceptance** (`campaign.feature` @F1.3, doubles): "A run that exceeds its own cost cap is stopped" —
  the agent reports `budget_exhausted` in step 1 of 2: step `cap reached`, its patch kept, run `cap
  reached`, step 2 never started; "A campaign stops starting new runs when the budget is spent" — two
  runs whose first spends the ceiling: the second never starts, the execution is `budget exhausted`, the
  first run's record is complete.
- **Unit:** the adapter's readings (C1's and C2's real `result` events, trimmed, as fixtures); `timeout`
  on every invocation with the seconds left, 124 and 137 read as `time cap reached`, the bound counted;
  the token cap between invocations; no step or resume started with nothing left → `cap reached`; the
  ceiling across runs; quota on the step, the run and the campaign; the summary lines and exit codes.
- **Docker:** a step of the fake that runs past a 2-second `step_time_s` is killed in a real container:
  `time cap reached`, the next step runs.

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `df72ace`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W5 tasks of release v0.1` (`40c7c46`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-024-cost-and-time-caps-during-a-run` → `3f876e6`. Declared: `draft → pending`, required fields
  checked, one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty
  stderr, 1 file, diff limited to `status: draft` → `status: pending`. Matches (subject without
  transition: N9).
- The approver's `memory approve` → `bfc386e` (`pending → backlog`), with the spending consent (up to
  0.30 USD on Haiku 4.5). Matches.

### Real sessions (`spikes/task-024/probe.sh`, `probe-kill.sh`; Haiku 4.5, Claude Code 2.1.280)

| Probe | Cap | Exit | `result` | Turns | Cost | Workspace |
|---|---|---|---|---|---|---|
| C1, a first invocation | 0.04 | 1 | `error_max_budget_usd`, `budget_exhausted` | 14 | 0.0419 USD | f01–f14 |
| C2, the session | 0.20 | 0 | `success`, `completed` | 1 | 0.0054 USD | — |
| C2, its resume | 0.0033 (below the session's 0.0054) | 1 | `error_max_budget_usd`, `budget_exhausted` | 2 | 0.0103 USD running total, 0.0049 its own | `resumed.txt` |
| C3, killed by `timeout -k 5 8` | 0.05 | 124 | **none** | 3 tool calls | not reported (about 0.009 USD at C1's rate) | f01–f03 |

Spent **0.0522 USD reported**, plus about 0.009 USD C3 could not report, of the 0.30 USD consented; its
line is in `docs/calibration/v0.1-ledger.md`. No file under the spike or its output holds the token.
- Design committed by hand on `task/task-024-cost-and-time-caps-during-a-run` (`bf5e3c7`, with the spike
  and the ledger line), then `npx wingfoil memory submit task-024-cost-and-time-caps-during-a-run` →
  `628ef6e` (`backlog → in-progress`, one commit, only `status`). Matches. WIP: this task
  `in-progress`, none `in-review`.

### Build (TDD) — `a15b855`

1. **Tests first:** the two @F1.3 acceptance tests; the adapter's readings (C1's real `result` event,
   two constructed quota events, the stop through the port); ten runner tests (cost cap, time cap,
   token cap, ceiling, quota); the CLI's summary; and the two existing runner tests that expected a
   failure where the cap is now reached. **17 red**, then green. The traceability test was green
   throughout: F1.3's four scenarios all had tests once these two were written.
2. **Existing expectations that changed with the behaviour:** the exact `exec` list of "lets the agent
   run commands in the run's own container" (the agent's commands now run under `timeout`), and the W2
   docker fixture's `step_tokens: 1000` — its recorded sessions hold some 20 000 tokens, which the cap
   now counts — raised to 2 000 000.
3. **Added after the code, for coverage:** an agent that throws after the killed command (as the fake
   does) read as the time cap, and a step with no time left before its first command. The first
   version of the second test was wrong — `Math.ceil` turns a 1 ms step into a 1 s `timeout` — and was
   rewritten so that the time is really spent.
4. **Docker:** T3's first step sleeps 30 s against a 2 s cap in a real container: killed at the cap,
   `before.txt` kept, `never.txt` absent, step `time cap reached` with `cost_bound_usd`, run `cap
   reached`, no container left.
5. A test of mine gave the adapter the token `t`, which the scrubber then removed from every `"type"`
   of the stream; a realistic token fixed the test, not the code.

### Deviation from the Design

- **A time-capped step ends the run in practice.** The Design said the run goes on after a step cap.
  For the token cap it does. For the time cap, the killed invocation is counted at its bound, which is
  all that was left of the run's cap, so the next step finds nothing left and the run ends `cap
  reached`. The bound is kept: counting less than can have been spent would let a run exceed its cap
  unseen. A cheaper bound needs a price table and the stream's per-message tokens, whose output counts
  are not final (C1) — not built.
- `timeout` gets whole seconds (`Math.ceil` of what is left): a step can run up to a second past a
  fractional `step_time_s`.

### Known limits

- **Quota exhaustion is recognised on a documented, not an observed, shape** (`usage limit` or
  `rate_limit` in a failed `result`). If the agent words it otherwise, the step fails instead, and the
  campaign goes on starting runs that will fail the same way.
- `step_tokens` is not enforced within an invocation; the cost cap bounds it there.
- The cost cap lets a session run one turn past it (C1: 0.0419 USD for 0.04); the method page (W11)
  should say so.

### Review readiness

`npm test` 700/700 (statements 99.81%, branches 96.9%, functions 100%, lines 100%), `npm run test:bin`
5/5, `npm run test:docker` 6/6, `npm run lint` clean, `npm run build` clean; no `bench-*` container
left. `campaign.feature` @F1.3 has its four acceptance tests. Spent in this task: 0.0522 USD reported,
plus about 0.009 USD unreported, within the 0.30 USD consented.
