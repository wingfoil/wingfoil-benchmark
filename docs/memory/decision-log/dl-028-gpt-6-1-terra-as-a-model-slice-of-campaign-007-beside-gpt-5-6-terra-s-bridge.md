---
id: dl-028-gpt-6-1-terra-as-a-model-slice-of-campaign-007-beside-gpt-5-6-terra-s-bridge
type: decision-log
title: "gpt-6.1-terra as a model slice of campaign-007, beside gpt-5.6-terra's bridge"
status: draft
tags: ["v0.3","codex"]
---

## Context

OpenAI released **GPT-6.1 Terra** (`gpt-6.1-terra`), the Terra of generation 6 that Codex's catalogue lacked when
task-102 chose `gpt-5.6-terra` (the approver's option A, 2026-10-24). OpenAI's pages, read with the browser on
2026-10-27 (the approver's references):

- `openai.com/it-IT/index/introducing-gpt-6-1-terra/`: available to Plus, Pro, Enterprise and Edu in ChatGPT Work and
  **Codex**; much stronger than GPT-5.6 Terra at software engineering (Terminal-Bench 4.0 at max effort 50.3 % against
  21.5 %), GPT-6.1 Sol and GPT-6 Astra still the choice for the hardest coding; more tasks per plan than 5.6 Terra.
- `developers.openai.com/api/docs/models`: reasoning `none`, `low`, `medium`, `high`, `xhigh`, `max`; knowledge cutoff
  2026-06-01. `gpt-5.6-terra` is no longer among the flagship models.
- `developers.openai.com/api/docs/pricing`, Standard, short context, per million tokens: input 1.00 $, cached input
  0.05 $, 30-minute cache write 1.25 $, output 5.00 $ — half `gpt-5.6-terra`'s.

**Codex CLI 0.162.1** (the agent's pin) and 0.164.0 (npm's latest on 2026-10-27) do not list it in their bundled
catalogue (`models.json`); whether `codex exec -m gpt-6.1-terra` runs on 0.162.1 is unverified.

[dl-027](dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md) plans campaign-007, the step-A arm on Codex, on `gpt-5.6-terra`, so that it bridges campaign-006 (v0.2's
manual on the same model): only the arm's version and WingFoil's release change.

## Options

- **A. A model slice:** campaign-007 keeps `gpt-5.6-terra` as its default model (the bridge with campaign-006) and adds
  `gpt-6.1-terra` at `medium` as a model slice of the three arms, read apart as a cross-model comparison (T14).
- **B. campaign-007 on `gpt-6.1-terra` only:** the newer model, but the bridge with campaign-006 is lost — the arm
  and the model would change together, and step A's effect could not be told from the model's; no history on the
  model (T7); dry runs for all three arms.
- **C. No `gpt-6.1-terra` in v0.3.**

## Proposal

**A**, as the first cut of campaign-007 if time or quota run short.

1. **dl-024's scope (bound 1), as dl-025 and dl-027 widen it, gains `gpt-6.1-terra`** at `medium` for: its dry runs
   (S1, S2, S3, S8 in baseline, baseline-docs and the step-A wingfoil arm: 12), and campaign-007's slice (the three
   arms, S1 × 3, S2, S3 and S8 × 1: 18 runs). The same end, 2026-11-13; dl-024's other bounds unchanged.
2. **The first of those dry runs is the check** that Codex 0.162.1 runs `gpt-6.1-terra` (S3@1.0 baseline). If it
   refuses the model, the slice waits for a Codex release that lists it: the agent's pin then moves in its own task
   (its CHANGELOG read, task-093's practice), or, if none comes in time, the slice is cut and recorded.
3. **The price table** gains `gpt-6.1-terra` (and `gpt-6-astra`, for completeness) from the pricing page, read
   2026-10-27, in a task of its own, before any of these sessions: without its row a session's cost is `unpriced`.
4. **The cut order of campaign-007** becomes: the `gpt-6.1-terra` slice first, then dl-027's (S3, S1 × 3, S2, S8 of the
   default model).

**The quota:** 30 more sessions on a model OpenAI says completes more tasks per plan than 5.6 Terra; about 15–25 %
of a week at campaign-005's rate, inside the week from about 2026-11-02 with dl-027's. **Spending: 0 € billed**
(ChatGPT Plus), API-equivalent recorded in the v0.3 ledger.

## Consequences

- campaign-007 answers two questions: step A against v0.2's manual on one model (the bridge with campaign-006), and
  whether a stronger Terra changes WingFoil's own effect (the slice), never mixed (T14).
- The slice is not a bridge with any earlier execution; its baseline starts the model's history.
- If Codex 0.162.1 refuses the model, a Codex pin move is a new agent version for every arm of campaign-007, its
  default model included: the bridge with campaign-006 would then also change the agent's version, which campaign-007
  states.
