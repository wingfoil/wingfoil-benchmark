---
id: dl-039-a-baseline-log-control-arm-the-verbatim-log-of-earlier-sessions-with-no-process
type: decision-log
title: "A baseline-log control arm: the verbatim log of earlier sessions, with no process"
status: pending
tags: ["arms","experiment-design","v0.4"]
---

## Context

[plan-006](../../plans/plan-006-release-v0.4.md)'s external-benchmarks triage (the approver, 2026-11-25), row 7. The
memory benchmarks in [X_external-benchmarks-2026-11-25.md](../../01_vision/X_external-benchmarks-2026-11-25.md) set a
plain record of earlier sessions against structured memory. Their figures were re-read at the primary sources on
2026-11-26 (arXiv abstract and full HTML text), and they say less than the first reading did:

- **DreamBench-SWE** (arXiv:2608.20664 v1, grade B; Codex CLI with gpt-5.5 only; 60 three-session traps × 3 seeds):
  - In the original v2 fold, typed+raw memory scored 95/180 against B5's 89/180, with no significant difference
    (permutation p = .518, Holm p = 1; §6.1, Table 9). The v2.1 audit gives 83/180 against 82/180 (Table 12).
  - B5, the "verbatim event-memory" baseline, is not a log of the sessions. It writes one deterministic record per
    trajectory holding the benchmark's scripted event text, with no transcript and no tool calls (Table 5, §5.2).
  - The arm that retrieves raw prior trajectories (B1) scored 21/180, as many as no memory at all (Table 7).
  - Every condition gets the same read-token budget for memory in context (§5.3).
- **VibeMemBench** (arXiv:2609.23570 v1, grade B; MiniSWEAgent, no Claude or GPT model):
  - Memory systems were at or below memory-off in 11 of 12 pairs, and glm-5 with Mem0 was a significant loss (§4.2,
    Table 2).
  - The systems that store raw conversation chunks cause every instruction-pollution case, and the harm comes from the
    transcripts' volume rather than their content (§4.4, App. N).
  - It has no raw-transcript arm.
- **MemoryArena** (arXiv:2602.16313 v2, grade B; not coding):
  - The full verbatim history placed before the prompt (long-context, 0.19) beats the best memory agent (0.14); a RAG
    method is best at 0.20 (Table 3).
  - The long-context arm degrades on traces above about 122k tokens (§4.4).

So the rival a structured memory has to beat is a **bounded record of the earlier sessions**, not a raw one: a curated
record holds up, and raw volume harms. No v0.3 arm isolates that rival:

- `baseline` carries nothing between sessions;
- `baseline-docs` carries the wingfoil arm's information, written once, not the sessions' own record.

Every step of every scenario starts a new session, and only the repository carries state between steps
([09_experiment-design.md](../../01_vision/09_experiment-design.md) §3.4). A gain of the wingfoil arm on the
continuity checks therefore cannot yet be told apart from what a record of the earlier sessions would give. That
covers M-F1 on S3, S2's defect recognised across a session boundary, and M-F2.

**The size of such a record**, measured on campaign `1f70fcaf2ec2/1`'s baseline runs (Sonnet 5.5, tokens ≈ characters
÷ 4, before the last step):

| Scenario | Agent's messages and commands | Full transcript files | `baseline-docs`' rendered information |
| --- | --- | --- | --- |
| S1 (5 steps) | 6.1k | 50.4k | 8.6k |
| S2 (3) | 2.0k | 51.0k | 8.6k |
| S3 (5) | 5.0k | 34.7k | 8.6k |
| S8 (4) | 4.3k | 41.3k | 8.7k |

The extract stays below the docs control's size at every step. The full transcript reaches four to six times that
size, which would confound "a record of the sessions" with "more context" (T3).

## Options

1. **Add `baseline-log` in v0.4 with a fixed extract.** It is `baseline` plus, at the start of each step's session,
   the record of the run's earlier steps: each step's prompt, the agent's messages and the commands it ran. Tool
   output is left out, and so are process, roles and Memory. The extract is capped at the size of `baseline-docs`'
   rendered information for the same scenario.
2. **Add `baseline-log` in v0.4 with the full transcripts.** This is closer to MemoryArena's long-context arm, but four
   to six times the docs control's size. B1 and VibeMemBench's transcript systems show that this content does worse
   than no memory, so the arm would test volume rather than continuity.
3. **Add it after v0.4**, once W21's repetitions
   ([dl-023](dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md)) and
   [dl-033](dl-033-cost-differences-between-arms-decomposed-by-component-base-and-scenario-specific.md)'s cost
   reading are in place, so its first campaign reads at n = 3 with its costs decomposed.
4. **Do not add it**, and state the missing control as a limit on the method page.

## Proposal

Option 1, delivered in W22 beside S4, at dl-023's n = 3:

- **Content, generated mechanically in the run.**
  - After each step, the campaign runner writes the step's record from its transcript: the step prompt, the agent's
    text messages, and the input of every tool call, in order.
  - The record is generated per run, not once per campaign as the docs controls are, because it is that run's own
    history.
  - No hand-editing, no summary, no model in the loop.
- **Delivery.** The record reaches the agent through the same channel and position as `baseline-docs`' rendered
  information, so the two controls differ only in what they carry.
- **Parity cap.** The record never exceeds `baseline-docs`' rendered size for the same scenario, as the external
  sources equalise read budgets. If a record would exceed it, the oldest steps' messages are dropped first, and the
  drop is recorded. The record's size per step is published beside the docs controls' sizes (1.7).
- **Where it runs.** Every scenario, since every step is a session. It is read against `baseline` and `baseline-docs`
  on M-F1, M-F2, S2's cross-session check and M-K1, and the wingfoil arm is read against it on the same metrics.
- **Why W22.** W22's S4 takes DreamBench-SWE's injected facts that cannot be inferred from the code (triage row 4).
  That is where a record of the sessions and a structured memory should differ most, and dl-023's repetitions are in
  place by then.
- **Its hypothesis, written before its first run** (as step B's, §2): *the wingfoil arm's M-F1 and S4's continuity
  checks are above `baseline-log`'s beyond the variance.* If they are not, the wingfoil arm's continuity gain is
  published as no larger than a bounded log's.

Option 2 is not taken: the sources show raw transcripts do worse than none, and the size breaks T3. Option 3 delays
the control past the release whose S4 is built to need it. Option 4 leaves the method's central claim, continuity
across fresh sessions, without the control the external work names.

## Consequences

- **The experiment design.** §2 gains a `baseline-log` row and its parity rule, and T3 names the record's size. The
  method page names the arm as a control, not a tool, so it needs no eligibility entry.
- **The campaign runner.** It gains a step hook that writes the record before each session of the arm, with a
  requirement (alongside REQ-FMT-05 and REQ-RUN-11) and an acceptance test for the extract, the cap and the drop
  order. A task is filed under W22 after this decision-log is approved.
- **Cost.** About one more `baseline-docs` per campaign: 1.39 € per pass of S1–S8 on Sonnet 5.5 in v0.3, times three
  repetitions and each campaign model. It goes into the calibration estimate (plan-006 step 3) and the approver's
  spending consent.
- **What the record does not carry.** It leaves out tool output: test failures and file contents an earlier step saw
  reach the next session only through the repository, as in every arm. The method page states this.
- **The external figures** are cited with their grade, version and fold. DreamBench-SWE's B5 is never described as a
  transcript log.
