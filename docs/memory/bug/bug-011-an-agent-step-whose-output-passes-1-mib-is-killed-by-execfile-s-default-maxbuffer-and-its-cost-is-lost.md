---
id: bug-011-an-agent-step-whose-output-passes-1-mib-is-killed-by-execfile-s-default-maxbuffer-and-its-cost-is-lost
type: bug
title: "An agent step whose output passes 1 MiB is killed by execFile's default maxBuffer and its cost is lost"
status: draft
---

## Context

Found in the v0.1 reference campaign ([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md),
execution `c82a5e74885b/1`, 2026-10-03/04). Every process the benchmark starts goes through the process port,
`systemProcess` in `src/core/ports/process.ts`, which calls Node's `execFile` without a `maxBuffer`. Node's default
`maxBuffer` is **1 MiB** (1 048 576 bytes) for stdout and for stderr. The agent's step runs as one `docker exec` of
Claude Code with `--output-format stream-json` (`src/runner/run.ts`, `runStep`'s `run`), and its whole stream comes back
as `stdout`.

No calibration dry run and no validation run came near the limit (the transcripts were not kept, but none of them
failed this way), so it was not seen before the campaign.

## Expected

A step's stream is read whole, however long it is. Its usage and cost are those the agent's `result` event reports,
and the step's outcome is the agent's (REQ-RUN-04, REQ-RUN-12). A step is only stopped by its own caps
(`step_time_s`, `step_tokens`, `run_cost_eur`).

## Actual

When a step's stream passes 1 MiB, `execFile` stops the `docker exec` client (with the port's `killSignal`,
`SIGKILL`) and hands back the first 1 MiB of stdout:

- the last line is cut in the middle, so `readSession` (`src/agents/claude-code.ts`) fails the step: "a line of the
  session is not valid JSON";
- the stream has no `result` event, so the step's usage and cost are **0**. The money the agent spent on the step is
  neither counted in `run.json`, nor in the campaign's total, nor checked against `run_cost_eur`;
- the run stops at that step, so the rest of the scenario is lost too;
- whether the agent process inside the container is also stopped, or keeps working until the container is removed,
  has not been checked.

## Evidence

Execution `c82a5e74885b/1`: 3 of 19 runs failed this way, all at S1's step 03, the longest step. Each stored
`transcript.jsonl` is 1 048 577 to 1 048 581 bytes: 1 MiB, plus the newline the runner adds back.

| Run | Failed at | Cost recorded (steps before) | Last line |
|---|---|---|---|
| S1@1.0 baseline Sonnet 5 r1 | step 03, after about 15 min | 0.8886 USD | cut at 3 660 characters |
| S1@1.0 baseline Sonnet 5 r3 | step 03 | 0.7217 USD | "Unexpected end of JSON input" |
| S1@1.0 wingfoil **Opus 5** r1 | step 03 | 7.5295 USD | cut at 998 characters |

The completed runs' largest step transcripts are 0.17 to 0.65 MB (S1 baseline r2's step 03: 652 695 bytes). A
step's output depends on what the agent does, for example how much file content it reads back, not on the arm alone.
The unrecorded cost of the three step 03s is not known. In calibration, S1's step 03 cost 0.81 USD (baseline,
Sonnet) and 5.67 USD (wingfoil, Opus).

## Suggested handling

- Give the agent's step no output bound in the process port: stream stdout to a file, or use `spawn`, instead of
  buffering it in `execFile`, or at least set an explicit `maxBuffer` far above any step (for example 256 MiB). Do the
  same for stderr and for the other long outputs (`setup`'s log, the scoring image's output).
- If any bound stays, reaching it must say so ("output bound reached"), not look like invalid JSON.
- A test with a fake process whose output passes 1 MiB, through the real `systemProcess`.
- Check whether a `docker exec` client killed this way leaves the agent running inside the container.
- The three failed runs are re-run after the fix, with the approver's consent, as campaign-cycle's `review-results`
  decides. Their spend is a line of the ledger as reported, with the unreported step 03s noted.

## Resolution

<!-- Filled when fixed: the task, the commit, and how it was verified. -->
