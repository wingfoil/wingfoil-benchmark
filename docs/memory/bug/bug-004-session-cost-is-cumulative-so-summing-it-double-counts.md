---
id: bug-004-session-cost-is-cumulative-so-summing-it-double-counts
type: bug
title: "Session cost is cumulative, so summing it double-counts"
status: approved
---

## Context

[adr-002](../adr/adr-002-w2-runner-and-adapter-conventions.md) decision 8 says usage is **summed**
over a step's invocations — the step and every resume of it — because `--resume` "reports its own
usage, not the session's total". That is true of tokens, turns and wall time. **It is not true of
the cost**, and task-006 shipped a parser that sums it.

Found by the session delivering task-007 (F2.4), which hit it building the first step that actually
resumes. Verified here against the spike's own recordings, which are the same evidence adr-002 was
written from:

| | `session_id` | `total_cost_usd` | `num_turns` | `usage.input/output` |
|---|---|---|---|---|
| P4, the question | `691b34d4-…` | 0.00734975 | 1 | 10 / 393 |
| P6, its resume | `691b34d4-…` (same) | **0.0681071** | 12 | 98 / 4967 |

`0.00734975 + 0.06075735 = 0.0681071`: the resume's `total_cost_usd` is the **session's** total, not
the invocation's. P6's `modelUsage` carries both entries side by side — P4's under the model alias
and its own under the dated id — while `usage.input_tokens` / `output_tokens` carry only its own.
`num_turns` is per invocation. `duration_ms` looks per invocation; `duration_api_ms` (55 685 against
a wall time of 51 037) looks cumulative.

## Expected

A step that needed one intervention reports what it cost: 0.0681071 USD.

## Actual

`readSession` (`src/agents/claude-code.ts`) adds `total_cost_usd` across result events, so the same
step reports 0.00734975 + 0.0681071 = 0.07545685 — **10% too high here, and worse the more
interventions a step needs.** M-K1 is the benchmark's cost metric and M-K4's break-even divides by
it, so the error lands directly on a published number, and it lands *hardest on the arms that ask
more questions* — which is exactly the comparison the benchmark exists to make.

## How it got through

Worth recording, because the test looked right.

- **The test pins the wrong scenario.** `test/unit/agents/claude-code.test.ts`, "sums the result
  events of a step", concatenates `completed.jsonl` (P2) and `resumed.jsonl` (P6) — **two unrelated
  sessions**, not a session and its resume. Summing is correct for that pair, and that pair never
  occurs. The fixture that would have caught it, P4 + P6, was sitting beside it unused.
- **The evidence was read and explained away.** Task-006's notes record that `modelUsage` "keyed one
  session under both an alias and a dated id" and conclude that a run's model must come from the
  campaign's pin. That double entry *was* the cumulative record; it was treated as an alias quirk.
- Two independent review rounds did not catch it. Nothing in the suite could: the parser matched the
  test, and the test matched the wrong model of the world.

## Fix

Tokens, turns and wall time stay summed. **Cost is the session's latest cumulative figure** — the
maximum over the step's invocations, not their sum. `duration_api_ms` needs the same treatment or an
explicit decision, since it appears to be cumulative too.

adr-002 decision 8 is wrong as written and needs superseding in part; the session that found this is
proposing `adr-003`. This element is the defect; the ADR is the decision.

Still unmeasured, and worth one cheap session when someone is in a container anyway: whether
`--max-budget-usd` on a resume compares against the cumulative cost or the invocation's. Until it is
known, passing the remaining budget computed after the step so far is the conservative choice.

## Resolution

Fixed in [task-007](../task/task-007-neutral-approver.md), by agreement with the session that filed
it: `readSession` and the step loop sum the work and take the latest cost, tested on the spike's own
session and resume (`question.jsonl` + `resumed.jsonl`) with their literal figures. The decision is
recorded as **adr-002 amendment 1**, not as the `adr-003` foreseen above — the approver chose the
amendment, as for adr-001. `duration_ms` is shown per invocation by the span of P6's own events;
`duration_api_ms` is unmeasured and the runner does not record it, so nothing needed the same
treatment. The `--max-budget-usd` question above stays open.
