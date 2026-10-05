---
id: bug-010-a-429-rate-limit-rejection-fails-the-run-as-an-api-error-instead-of-being-recognised-as-the-subscription-s-limit
type: bug
title: "A 429 rate-limit rejection fails the run as an api_error instead of being recognised as the subscription's limit"
status: approved
fixed_by: task-051-a-429-rate-limit-rejection-recognised-as-the-subscription-s-limit
---

## Context

REQ-RUN-13: a run stopped by the subscription's limit is recognised as such, not as a failure. task-024
implemented the recognition (`isQuotaExhausted`, `src/agents/claude-code.ts`) on the shape the agent is
*documented* to write — "usage limit" in the `result` text, or a `rate_limit` error — since provoking it was
not affordable; `rel-v0-1` (W5) left "quota exhaustion is recognised on a documented, not observed, shape" due
before the reference campaign. Found on 2026-10-02 in
[task-050](../task/task-050-calibration-of-v0-1-dry-runs-measured-costs-and-the-revised-budget.md)'s dry run 2
(S1@1.0 baseline-docs, Claude Code 2.1.280, Sonnet 5), whose step 03 ended on the first observed shape.

## Expected

A rejection for the account's rate limit is told apart from a failure: the step's outcome says the
subscription's limit stopped it (`quota exhausted`, or a distinct outcome if a short-term rate limit is to be
waited out rather than ended), and a campaign does not count it as an agent's failure.

## Actual

The step's last events in the transcript:

- `{"type":"assistant","error":"rate_limit", …}`
- `{"type":"result","subtype":"success","is_error":true,"api_error_status":429,"result":"API Error: Request
  rejected (429) · This request would exceed your account's rate limit. Please try again later.",
  "terminal_reason":"api_error"}`

`isQuotaExhausted` reads only the `result` event's `result` and `errors`, and matches `/usage
limit|rate_limit/i`: the text says "rate limit" with a space, `rate_limit` is on the preceding `assistant`
event, and `api_error_status: 429` is not read. The step was recorded `failed: api_error`, the run
`failed` (`results/dry-runs/2`), costing 1.2206 USD; the re-run of the same dry run completed.

## Evidence

- `results/dry-runs/2/runs/S1@1.0/baseline-docs/claude-sonnet-5/r1/run.json` (step 03 `failed`), its
  transcript (git-ignored, on the maintainer's disk), task-050's Execution notes.

## Suggested handling

A task of its own before the reference campaign (plan-003 step 5), the approver's choice of 2026-10-02:
recognise the observed shape (`api_error_status` 429, or "rate limit" in the text, or an `assistant` event's
`rate_limit` error), decide whether a short-term 429 is waited out and the step resumed or the run ended as
`quota exhausted`, and fix the transcript as a fixture of the adapter's tests.

## Resolution

Fixed in [task-051](../task/task-051-a-429-rate-limit-rejection-recognised-as-the-subscription-s-limit.md): the
adapter reads the observed shape — `api_error_status` 429, "rate limit" in the text, or a `rate_limit` error in the
result or the `assistant` event before it — as a **rate limit** (`subscriptionLimitOf`, `958fc82`), and the runner
waits it out: 2, 5, 15 and 30 minutes, the step's session resumed with "Continue." after each, the step ending
`quota exhausted` only after the last wait (requirements 1.24, REQ-RUN-13). The documented usage-limit shape is read
as before. Tests: red `6da8171`; the fixture reconstructed from the fields quoted above, the transcript having been
lost with task-050's worktree.
