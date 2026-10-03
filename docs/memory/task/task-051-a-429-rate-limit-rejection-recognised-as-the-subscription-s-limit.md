---
id: task-051-a-429-rate-limit-rejection-recognised-as-the-subscription-s-limit
type: task
title: "A 429 rate-limit rejection recognised as the subscription's limit"
status: backlog
release: v0.1
wave: validation
features: [F1.3]
acceptance: [campaign.feature]
requirements: [REQ-RUN-13]
---

## Context

Fixes [bug-010](../bug/bug-010-a-429-rate-limit-rejection-fails-the-run-as-an-api-error-instead-of-being-recognised-as-the-subscription-s-limit.md),
found by calibration ([task-050](task-050-calibration-of-v0-1-dry-runs-measured-costs-and-the-revised-budget.md),
dry run 2): a step of Claude Code 2.1.280 that ended on the subscription's rate limit was recorded `failed:
api_error`, not as the subscription's limit (REQ-RUN-13). Its last events:

- `{"type":"assistant","error":"rate_limit", …}`
- `{"type":"result","is_error":true,"api_error_status":429,"result":"API Error: Request rejected (429) · This
  request would exceed your account's rate limit. Please try again later.","terminal_reason":"api_error"}`

`isQuotaExhausted` (`src/agents/claude-code.ts`, task-024) reads only the `result` event's `result` and
`errors` against `/usage limit|rate_limit/i`, written on a documented, never observed shape; this is the first
observed one. `rel-v0-1` (W5) left exactly this due "before the campaign".

It runs before plan-003 step 4 (validation) and step 5 (the reference campaign), where a 429 would otherwise fail a
run (`wave: validation` names the `release-cycle` phase it belongs to, as `calibration` did for task-049/050).

**Scope:** the adapter recognises the observed shape — `api_error_status` 429, "rate limit" in the result text, or
an `assistant` event's `rate_limit` error — beside the documented one; the observed events, with nothing secret in
them, become a fixture of the adapter's tests; what the runner then does with the step is the design's.

**Left to the design phase, for the approver:**

1. **A short-term rate limit or the usage limit.** A 429 "try again later" is not necessarily the subscription's
   usage limit exhausted. (a) Treat it as `quota exhausted` (REQ-RUN-13 as written: the campaign stops starting
   runs, completed runs kept; re-running the rest later); (b) a distinct outcome, `rate limited`, waited out with a
   bounded back-off and the step resumed (`--resume` of its session), `quota exhausted` after the bound; (c) (a)
   now, (b) as a later improvement. (b) changes REQ-RUN-13 and the step's cost accounting across the wait.
2. Whether a run whose step ended so is re-runnable from that step, or only whole.

**No real agent, no spending:** the observed transcript is the fixture; the fake agent replays the shape in the
runner's tests.

**Done** means: the observed shape gives the step the outcome the design chose; the documented shape still does;
`npm test` green with coverage above 80 %, lint clean; bug-010's Resolution names this task's commits.

## Acceptance criteria

<!-- Classified in the design phase. -->

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

- `npx wingfoil memory add --type task --title "A 429 rate-limit rejection recognised as the subscription's limit"`
  — declared: creates the element at `draft` and commits it. Observed: `ab9a41f wf(task): add …`.
