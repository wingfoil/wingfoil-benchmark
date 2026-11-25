---
id: dl-039-a-baseline-log-control-arm-the-verbatim-log-of-earlier-sessions-with-no-process
type: decision-log
title: "A baseline-log control arm: the verbatim log of earlier sessions, with no process"
status: draft
tags: ["arms","experiment-design","v0.4"]
---

## Context

[plan-006](../../plans/plan-006-release-v0.4.md)'s external-benchmarks triage (the approver, 2026-11-25), row 7. The
memory benchmarks in [X_external-benchmarks-2026-11-25.md](../../01_vision/X_external-benchmarks-2026-11-25.md) name a
verbatim log of earlier sessions as the rival a structured memory has to beat: DreamBench-SWE (grade B) finds typed
memory not significantly better than verbatim event memory (95/180 against 89/180, p = .518); VibeMemBench and
MemoryArena (grade B) find memory systems at or below simpler baselines. No v0.3 arm isolates that rival:
`baseline` carries nothing between sessions, and `baseline-docs` carries the same information as the wingfoil arm,
written once, not the sessions' own record. So a gain of the wingfoil arm on the memory checks (S3's family) cannot
yet be told apart from what a plain log of the earlier sessions would give. These figures are to be re-read at their
primary sources before this decision-log is submitted.

## Options

1. **Add `baseline-log` in v0.4**: as `baseline`, plus, at the start of each session, the verbatim transcript (or a
   fixed extract of it: the agent's messages and the commands it ran) of the scenario's earlier sessions, with no
   process, roles or Memory. It needs an eligibility entry, a parity rule (the same token budget for the log as the
   docs controls get for their docs, or a stated cap), and runs only on the multi-session scenarios.
2. **Add it after v0.4**, once W21's repetitions and dl-033's cost reading are in place, so its first campaign reads
   at n = 3 with its costs decomposed.
3. **Do not add it**, and state the missing control as a limit on the method page.

## Proposal

To be written once the figures above are verified and the approver has weighed the cost of one more arm per
campaign.

## Consequences

To be written with the proposal.
