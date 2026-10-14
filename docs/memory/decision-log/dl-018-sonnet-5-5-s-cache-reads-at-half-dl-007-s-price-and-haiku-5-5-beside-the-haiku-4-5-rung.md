---
id: dl-018-sonnet-5-5-s-cache-reads-at-half-dl-007-s-price-and-haiku-5-5-beside-the-haiku-4-5-rung
type: decision-log
title: "Sonnet 5.5's cache reads at half dl-007's price, and Haiku 5.5 beside the Haiku 4.5 rung"
status: pending
---

## Context

Found by [task-093](../task/task-093-the-agent-pin-for-v0-2-checked-on-the-three-models-spike.md)'s free reads, on
2026-10-14, before calibration. Two facts have changed since
[dl-007](dl-007-claude-5-5-models-for-the-v0-2-campaign.md) was approved (`e09918a`, 2026-10-05):

1. **Sonnet 5.5's cache reads cost 0.10 USD per million tokens, not 0.20.** Anthropic's pricing page
   (`platform.claude.com/docs/en/about-claude/pricing.md`, read 2026-10-14) prices a cache hit on Sonnet 5.5 at 5 % of
   its input price, 0.10 USD per million tokens (Opus 5.5: 0.20). Claude Code's
   CHANGELOG, 2.1.296: `/cost`, `--max-budget-usd` and the SDK's cost figures price Sonnet 5.5 cache reads at $0.10
   (was $0.20). task-093's P2 (Claude Code 2.1.300) reported 0.0969887 USD, which the tokens give at 0.10 and not at
   0.20. dl-007's price table, the starting point of v0.2's budget, says 0.20.
   - A run's cost is mostly cache reads (dl-007), so the v0.2 campaign on Sonnet 5.5 costs less than the first
     sizing assumed. Calibration measures it in any case; the table is what the estimate's reasoning cites.
   - An agent older than 2.1.296 prices Sonnet 5.5's cache reads at twice the list price while reporting
     `costBasis: "list"`: bug-016's check cannot see a stale price table. Observed on 2.1.291: task-062's P6 reported
     0.0134072 USD with `costBasis: "list"`, exactly its tokens at 0.20 cache reads (0.0123606 at 0.10); for 2.1.292
     to 2.1.295 it is inferred from the CHANGELOG. The agent pin is the only guard (task-093 recommends 2.1.300).
2. **Claude Haiku 5.5** (`claude-haiku-5-5`) is released (Claude Code 2.1.293): 1 M context, 0.10 / 0.50 USD per
   million input / output tokens (0.50 / 2.50 over 100 K tokens of prompt), cache reads 0.01. In Claude Code 2.1.300
   the `haiku` alias names it, and it is the default Haiku on the Anthropic API. dl-007 E added **Haiku 4.5** as the
   ladder's weak model (200 K context, 1.00 / 5.00 USD), which is still served and priced at list (task-093's P1).
   - Claude Code calls a Haiku for its own work: in v0.1, Haiku 4.5 beside Sonnet (dl-007). From 2.1.300 those calls
     may go to Haiku 5.5; task-093's short sessions made none, so calibration's dry runs are the first to show it.
     The runner already records every model the agent uses (task-054, bug-012).

## Options

- **A. Amend dl-007's price table only.** Sonnet 5.5's cache reads at 0.10; the Haiku 4.5 rung as approved. A hand
  edit of dl-007 with `Approver:` and `Reason:` (W-07).
- **B. A, and the weak-model rung moves to Haiku 5.5.** It is the current Haiku and far cheaper, but with 1 M context
  it is a different kind of weak model from the one dl-007 chose, and nothing of it has been measured here.
- **C. A, and both Haiku rungs.** Four more runs and their dry runs, a few euro at Haiku's prices; the ladder gains a
  step.

## Proposal

**B**, the approver's choice in chat on 2026-10-14 (A, first proposed here, was not approved): dl-007's price table is
corrected, and the weak-model rung moves from Haiku 4.5 to **Haiku 5.5**. It is the current Haiku, the one Claude
Code 2.1.300 names `haiku`, and the campaign then runs the current generation on every rung of the ladder.

What B takes on, for calibration to check:

- **Price not yet observed.** task-093 ran no Haiku 5.5 session, so whether Claude Code 2.1.300 prices it at list
  (`costBasis`) is unverified. Calibration's dry runs are the first to show it; bug-016's check refuses an unpriced
  dry run from the estimate.
- **Two price tiers.** Haiku 5.5 costs five times more on a request whose prompt passes 100 K tokens (0.50 / 2.50
  against 0.10 / 0.50). Long steps, S1's in the wingfoil arm above all, may cross it; whether the agent's
  `costUSD` applies the higher tier is for the dry runs' recomputation.
- **A different weak model.** 1 M context against Haiku 4.5's 200 K, and it takes effort (default `medium`, all five
  levels). Its floor on S1 (dl-007: the rung is dropped if it finishes S1 in no arm) is measured by the dry runs.
- **Effort pin.** `claude-haiku-5-5` needs a level in `agent.effort` (REQ-RUN-16); `none` was Haiku 4.5's.

## Consequences

- dl-007's price table and its Sonnet 5.5 paragraph are amended; its option E's rung, its hypothesis on the weak
  model and its Haiku cost line read Haiku 5.5. A hand edit of dl-007 with `Approver:` and
  `Reason:` (W-07), by the calibration task.
- `campaigns/v0-2-reference.yaml`'s Haiku slice names `claude-haiku-5-5`, with its effort pin; the bridge runs no Haiku
  slice, so its effort entry for Haiku is inert (task-069) and is aligned only to keep the two pin lists alike. Calibration's dry runs of that slice (S1 and S3 in baseline and wingfoil) are on Haiku
  5.5, under calibration's own consent.
- Experiment design §6 ("a Haiku 4.5 rung of the model ladder") and plan-004's dl-007 row name Haiku 5.5, by the
  calibration task.
- Calibration watches which Haiku Claude Code calls for its own work, in every dry run's `modelUsage`.
